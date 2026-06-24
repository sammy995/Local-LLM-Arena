"""LLM-as-judge: a chosen model scores anonymized answers and picks a winner."""
import json

from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.schemas import JudgeRequest, JudgeResult
from app.security import require_auth
from app.services import cloud, ollama

router = APIRouter()

# Inlined JSON schema (no $ref/$defs — small models follow it far better than
# Pydantic's nested schema) used as Ollama's structured-output constraint.
_JUDGE_SCHEMA = {
    "type": "object",
    "properties": {
        "verdicts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "label": {"type": "string"},
                    "score": {"type": "number"},
                    "reason": {"type": "string"},
                },
                "required": ["label", "score", "reason"],
                "additionalProperties": False,
            },
        },
        "winner": {"type": "string"},
    },
    "required": ["verdicts", "winner"],
    "additionalProperties": False,
}

_SYSTEM = (
    "You are an impartial expert evaluator of AI assistant answers. "
    "Judge only on accuracy, helpfulness, and clarity. Ignore length, tone, and which "
    "system produced each answer. Be objective and concise."
)


def _build_user_prompt(req: JudgeRequest) -> str:
    block = "\n\n".join(f"[{c.label}]\n{c.text}" for c in req.candidates)
    labels = ", ".join(c.label for c in req.candidates)
    return (
        f"A user asked:\n\n{req.prompt}\n\n"
        f"Here are {len(req.candidates)} candidate answers, labeled {labels}.\n\n"
        f"{block}\n\n"
        "Score each answer from 1 (poor) to 10 (excellent) and choose the single best. "
        'Reply with JSON ONLY in exactly this shape:\n'
        '{"verdicts":[{"label":"A","score":8,"reason":"one short sentence"}],"winner":"A"}'
    )


def _coerce(data: dict) -> dict:
    """Best-effort repair of malformed verdicts from weak judge models."""
    verdicts = data.get("verdicts")
    if isinstance(verdicts, list):
        fixed = []
        for v in verdicts:
            if isinstance(v, list):  # e.g. ["A", 9, "reason"]
                d: dict = {}
                for item in v:
                    if isinstance(item, bool):
                        continue
                    if isinstance(item, int | float) and "score" not in d:
                        d["score"] = item
                    elif isinstance(item, str) and "label" not in d and len(item) <= 4:
                        d["label"] = item
                    elif isinstance(item, str):
                        d["reason"] = (d.get("reason", "") + " " + item).strip()
                v = d
            if isinstance(v, dict):
                try:
                    v["score"] = max(0.0, min(10.0, float(v.get("score", 0))))
                except (TypeError, ValueError):
                    v["score"] = 0.0
                v.setdefault("reason", "")
                fixed.append(v)
        data["verdicts"] = fixed
    return data


async def _run_judge(req: JudgeRequest) -> str:
    """Dispatch to the chosen provider; returns a raw JSON string.

    Resolves the API key per request (UI value first, then matching env var). Raises
    ValueError (-> 400) when a cloud provider has no key.
    """
    user = _build_user_prompt(req)

    if req.provider == "anthropic":
        key = req.api_key or settings.anthropic_api_key
        if not key:
            raise ValueError("Anthropic API key required — set it in the UI or ARENA_ANTHROPIC_API_KEY.")
        return await cloud.anthropic_json(req.judge_model, _SYSTEM, user, key)

    if req.provider in ("openai", "openrouter"):
        if req.provider == "openrouter":
            key = req.api_key or settings.openrouter_api_key
            base = req.base_url or settings.openrouter_base_url
            env = "ARENA_OPENROUTER_API_KEY"
        else:
            key = req.api_key or settings.openai_api_key
            base = req.base_url or settings.openai_base_url
            env = "ARENA_OPENAI_API_KEY"
        if not key:
            raise ValueError(f"API key required — set it in the UI or {env}.")
        return await cloud.openai_compatible_json(req.judge_model, _SYSTEM, user, _JUDGE_SCHEMA, key, base)

    messages = [
        {"role": "system", "content": _SYSTEM},
        {"role": "user", "content": user},
    ]
    return await ollama.chat_json(req.judge_model, messages, schema=_JUDGE_SCHEMA)


@router.post("/judge", dependencies=[Depends(require_auth)])
async def judge(req: JudgeRequest) -> JudgeResult:
    try:
        raw = await _run_judge(req)
        result = JudgeResult.model_validate(_coerce(json.loads(raw)))
    except ValueError as e:  # missing API key etc. — client error
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"judge failed: {e}") from e

    if not result.verdicts:
        raise HTTPException(
            status_code=502,
            detail="judge produced no usable verdicts — try a more capable judge model.",
        )

    valid = {c.label for c in req.candidates}
    if result.winner not in valid:
        # fall back to the highest-scored valid verdict
        ranked = sorted(
            (v for v in result.verdicts if v.label in valid),
            key=lambda v: v.score,
            reverse=True,
        )
        if not ranked:
            raise HTTPException(status_code=502, detail="judge returned no valid verdicts")
        result.winner = ranked[0].label
    return result

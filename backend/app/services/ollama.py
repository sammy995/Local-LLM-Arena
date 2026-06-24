"""Single source of truth for Ollama I/O. ALL 6 hyperparameters flow through here.

Uses the async ollama client — no subprocess, no thread-per-model, no double generation.
"""
from collections.abc import AsyncIterator
from typing import Any

from ollama import AsyncClient

from app.config import settings
from app.schemas import Message, ModelInstance

_client = AsyncClient(host=settings.ollama_host)


def build_options(inst: ModelInstance) -> dict[str, Any]:
    """Map an instance's hyperparameters to Ollama `options`. (audit A: all 6, one path.)"""
    opts: dict[str, Any] = {}
    if inst.temperature is not None:
        opts["temperature"] = inst.temperature
    if inst.top_p is not None:
        opts["top_p"] = inst.top_p
    if inst.top_k is not None:
        opts["top_k"] = inst.top_k
    if inst.repeat_penalty is not None:
        opts["repeat_penalty"] = inst.repeat_penalty
    if inst.num_predict is not None:
        opts["num_predict"] = inst.num_predict
    if inst.seed is not None and inst.seed != 0:  # 0 = random
        opts["seed"] = inst.seed
    return opts


def _as_messages(system: str, history: list[Message], message: str) -> list[dict[str, str]]:
    msgs = [m.model_dump() for m in history]
    if not msgs or msgs[0].get("role") != "system":
        msgs = [{"role": "system", "content": system}, *msgs]
    if message:
        if not (msgs and msgs[-1]["role"] == "user" and msgs[-1]["content"] == message):
            msgs.append({"role": "user", "content": message})
    if len(msgs) > settings.history_limit:
        msgs = [msgs[0], *msgs[-(settings.history_limit - 1):]]
    return msgs


async def list_models() -> list[dict[str, Any]]:
    resp = await _client.list()
    out: list[dict[str, Any]] = []
    for m in resp.models:
        details = getattr(m, "details", None)
        out.append(
            {
                "name": m.model,
                "size": getattr(m, "size", None),
                "family": getattr(details, "family", None) if details else None,
                "params": getattr(details, "parameter_size", None) if details else None,
            }
        )
    return out


async def chat_stream(
    inst: ModelInstance, messages: list[dict[str, str]]
) -> AsyncIterator[dict[str, Any]]:
    """Yield {token, done, eval_count, eval_duration}. ONE generation per model."""
    opts = build_options(inst)
    stream = await _client.chat(
        model=inst.model, messages=messages, stream=True, options=opts or None
    )
    async for chunk in stream:
        content = chunk.message.content if chunk.message else ""
        yield {
            "token": content or "",
            "done": bool(chunk.done),
            "eval_count": getattr(chunk, "eval_count", None),
            "eval_duration": getattr(chunk, "eval_duration", None),
        }


async def pull(name: str) -> None:
    await _client.pull(name)


async def delete(name: str) -> None:
    await _client.delete(name)


async def reachable() -> bool:
    try:
        await _client.list()
        return True
    except Exception:
        return False

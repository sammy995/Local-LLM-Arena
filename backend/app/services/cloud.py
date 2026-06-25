"""Cloud LLM-as-judge providers.

API keys are resolved by the router (per-request UI value, else env fallback) and passed
in here already resolved. They are never stored on disk or written to logs. Each function
returns a raw JSON string that the judge router parses + validates.
"""
from typing import Any

import httpx


async def anthropic_json(model: str, system: str, user: str, api_key: str) -> str:
    """Judge via Anthropic (Claude), official SDK. JSON is prompt-driven so it works
    across SDK versions — Claude reliably returns valid JSON for this task."""
    from anthropic import AsyncAnthropic  # core dep, imported lazily

    client = AsyncAnthropic(api_key=api_key)
    resp = await client.messages.create(
        model=model,
        max_tokens=2048,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return "".join(b.text for b in resp.content if getattr(b, "type", None) == "text") or "{}"


async def openai_compatible_json(
    model: str, system: str, user: str, schema: dict[str, Any], api_key: str, base_url: str
) -> str:
    """Judge via any OpenAI-compatible endpoint (OpenAI, OpenRouter, Groq, Together, …)
    using native structured outputs (response_format json_schema)."""
    url = base_url.rstrip("/") + "/chat/completions"
    body = {
        "model": model,
        "max_tokens": 2048,  # hard cap — a judge verdict is small; bounds cost/runaway output
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": "verdict", "schema": schema, "strict": True},
        },
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        # OpenRouter uses these for optional attribution; harmless elsewhere.
        "HTTP-Referer": "http://localhost:7860",
        "X-Title": "Local LLM Arena",
    }
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(url, headers=headers, json=body)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]

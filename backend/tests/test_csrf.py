"""CSRF guard: foreign browser origins must not reach chat/judge (audit G2)."""
import httpx
import pytest

from app.main import app

EVIL = {"Origin": "https://evil.example"}
CHAT_BODY = {"message": "hi", "model_instances": [{"id": "x", "model": "m"}]}
JUDGE_BODY = {
    "prompt": "hi",
    "judge_model": "m",
    "candidates": [{"label": "A", "text": "x"}, {"label": "B", "text": "y"}],
}


async def _post(path: str, body: dict, headers: dict) -> httpx.Response:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        return await c.post(path, json=body, headers=headers)


@pytest.mark.asyncio
async def test_chat_blocks_foreign_origin():
    assert (await _post("/api/chat", CHAT_BODY, EVIL)).status_code == 403


@pytest.mark.asyncio
async def test_chat_stream_blocks_foreign_origin():
    assert (await _post("/api/chat/stream", CHAT_BODY, EVIL)).status_code == 403


@pytest.mark.asyncio
async def test_judge_blocks_foreign_origin():
    assert (await _post("/api/judge", JUDGE_BODY, EVIL)).status_code == 403


@pytest.mark.asyncio
async def test_chat_still_allows_dev_origin():
    # Vite dev origin passes the guard; without Ollama the endpoint still returns
    # 200 with a per-model error payload, never a 4xx/5xx.
    r = await _post("/api/chat", CHAT_BODY, {"Origin": "http://localhost:5173"})
    assert r.status_code == 200

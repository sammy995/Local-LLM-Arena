"""Smoke + contract tests. Run: pytest  (from backend/)."""
import httpx
import pytest

from app.main import app


@pytest.mark.asyncio
async def test_health():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_chat_rejects_out_of_range_temperature():
    transport = httpx.ASGITransport(app=app)
    body = {
        "message": "hi",
        "model_instances": [{"id": "x", "model": "gemma3:1b", "temperature": 5.0}],
    }
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.post("/api/chat", json=body)
    assert r.status_code == 422  # bounds reject -> 422, not a 500 (audit B)


@pytest.mark.asyncio
async def test_chat_requires_at_least_one_model():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.post("/api/chat", json={"message": "hi", "model_instances": []})
    assert r.status_code == 422

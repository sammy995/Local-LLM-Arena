"""Model router: pull-task bookkeeping + delete error mapping (audit G5)."""
import asyncio

import httpx
import pytest

from app.main import app
from app.routers import models as models_router
from app.services import ollama


@pytest.mark.asyncio
async def test_failed_pull_is_tracked_and_cleaned_up(monkeypatch):
    async def boom(name):
        raise RuntimeError("no such model")

    monkeypatch.setattr(ollama, "pull", boom)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.post("/api/models/pull", json={"model": "nope"})
    assert r.status_code == 200
    for _ in range(3):
        await asyncio.sleep(0)  # let the task run and its done-callback fire
    assert models_router._pull_tasks == set()


@pytest.mark.asyncio
async def test_delete_missing_model_is_404(monkeypatch):
    async def missing(name):
        raise RuntimeError(f"model '{name}' not found")

    monkeypatch.setattr(ollama, "delete", missing)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.delete("/api/models/ghost")
    assert r.status_code == 404

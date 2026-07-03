"""Client disconnect must cancel in-flight generations, not let GPUs burn (audit G3)."""
import asyncio

import pytest

from app.routers.chat import chat_stream as stream_endpoint
from app.schemas import ChatRequest, ModelInstance
from app.services import ollama


@pytest.mark.asyncio
async def test_disconnect_cancels_generation(monkeypatch):
    cancelled = asyncio.Event()

    async def fake_stream(inst, messages):
        try:
            while True:
                await asyncio.sleep(0.01)
                yield {"token": "x", "done": False, "eval_count": None, "eval_duration": None}
        except asyncio.CancelledError:
            cancelled.set()
            raise

    monkeypatch.setattr(ollama, "chat_stream", fake_stream)
    req = ChatRequest(message="hi", model_instances=[ModelInstance(id="x", model="m")])
    resp = await stream_endpoint(req)
    gen = resp.body_iterator
    first = await gen.__anext__()  # one NDJSON line arrives, so streaming works
    assert '"token"' in first
    await gen.aclose()  # simulates the browser aborting the fetch
    await asyncio.wait_for(cancelled.wait(), timeout=2)

"""Chat: parallel non-stream + NDJSON stream. asyncio fan-out, one generation each."""
import asyncio
import json
import time

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.schemas import ChatRequest
from app.security import require_auth
from app.services import ollama
from app.services.ollama import _as_messages

router = APIRouter()


def _metrics(eval_count: int | None, eval_duration_ns: int | None, first_s: float | None,
             wall_s: float) -> dict:
    cnt = eval_count or 0
    dur = (eval_duration_ns or 0) / 1e9
    tps = (cnt / dur) if dur > 0 else (cnt / wall_s if wall_s > 0 else 0)
    return {
        "eval_tokens": cnt,
        "duration_s": round(dur or wall_s, 3),
        "first_token_s": round(first_s, 3) if first_s is not None else None,
        "tokens_per_sec": round(tps, 2),
    }


@router.post("/chat", dependencies=[Depends(require_auth)])
async def chat(req: ChatRequest) -> dict:
    messages = _as_messages(req.system, req.history, req.message)

    async def run(inst):
        start = time.perf_counter()
        first = None
        parts: list[str] = []
        ec = ed = None
        try:
            async for ch in ollama.chat_stream(inst, messages):
                if ch["token"]:
                    if first is None:
                        first = time.perf_counter() - start
                    parts.append(ch["token"])
                if ch["done"]:
                    ec, ed = ch["eval_count"], ch["eval_duration"]
            return inst.id, {
                "instance_id": inst.id, "model": inst.model, "error": None,
                "assistant": "".join(parts),
                "metrics": _metrics(ec, ed, first, time.perf_counter() - start),
            }
        except Exception as e:  # noqa: BLE001
            return inst.id, {"instance_id": inst.id, "model": inst.model,
                             "assistant": "", "metrics": {}, "error": str(e)}

    pairs = await asyncio.gather(*(run(i) for i in req.model_instances))
    results = {iid: r for iid, r in pairs}
    errors = {iid: r["error"] for iid, r in pairs if r["error"]}
    return {"results": results, "errors": errors}


@router.post("/chat/stream", dependencies=[Depends(require_auth)])
async def chat_stream(req: ChatRequest) -> StreamingResponse:
    messages = _as_messages(req.system, req.history, req.message)
    q: asyncio.Queue = asyncio.Queue()
    sentinel = object()

    async def run(inst):
        start = time.perf_counter()
        first = None
        parts: list[str] = []
        ec = ed = None
        try:
            async for ch in ollama.chat_stream(inst, messages):
                if ch["token"]:
                    if first is None:
                        first = time.perf_counter() - start
                    parts.append(ch["token"])
                    await q.put({"type": "token", "instance_id": inst.id, "token": ch["token"]})
                if ch["done"]:
                    ec, ed = ch["eval_count"], ch["eval_duration"]
            await q.put({"type": "metrics", "instance_id": inst.id,
                         "metrics": _metrics(ec, ed, first, time.perf_counter() - start)})
            await q.put({"type": "done", "instance_id": inst.id, "text": "".join(parts)})
        except Exception as e:  # noqa: BLE001
            await q.put({"type": "error", "instance_id": inst.id, "error": str(e)})
        finally:
            await q.put(sentinel)

    async def event_stream():
        task = asyncio.gather(*(run(i) for i in req.model_instances))
        remaining = len(req.model_instances)
        try:
            while remaining:
                item = await q.get()
                if item is sentinel:
                    remaining -= 1
                    continue
                yield json.dumps(item) + "\n"
        finally:
            await task

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")

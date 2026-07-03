"""Model management: list / pull / delete + health."""
import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException

from app.schemas import PullRequest
from app.security import require_auth, same_origin
from app.services import ollama

logger = logging.getLogger("arena.models")

router = APIRouter()

# Strong references so fire-and-forget pull tasks can't be garbage-collected mid-run.
_pull_tasks: set[asyncio.Task] = set()


def _pull_done(task: asyncio.Task) -> None:
    _pull_tasks.discard(task)
    if not task.cancelled() and task.exception() is not None:
        logger.warning("model pull failed: %s", task.exception())


@router.get("/health")
async def health() -> dict:
    ok = await ollama.reachable()
    return {"status": "healthy", "ollama_reachable": ok}


@router.get("/models", dependencies=[Depends(require_auth)])
async def list_models() -> dict:
    try:
        return {"models": await ollama.list_models()}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ollama unreachable: {e}") from e


@router.post(
    "/models/pull", dependencies=[Depends(require_auth), Depends(same_origin)]
)
async def pull_model(req: PullRequest) -> dict:
    # Fire-and-forget; the UI can poll /models to see when it lands.
    task = asyncio.create_task(ollama.pull(req.model))
    _pull_tasks.add(task)
    task.add_done_callback(_pull_done)
    return {"status": "downloading", "model": req.model}


@router.delete(
    "/models/{name:path}", dependencies=[Depends(require_auth), Depends(same_origin)]
)
async def delete_model(name: str) -> dict:
    try:
        await ollama.delete(name)
        return {"status": "deleted", "model": name}
    except Exception as e:  # noqa: BLE001
        status = 404 if "not found" in str(e).lower() else 502
        raise HTTPException(status_code=status, detail=str(e)) from e

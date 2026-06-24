"""Model management: list / pull / delete + health."""
import asyncio

from fastapi import APIRouter, Depends, HTTPException

from app.schemas import PullRequest
from app.security import require_auth, same_origin
from app.services import ollama

router = APIRouter()


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
    asyncio.create_task(ollama.pull(req.model))
    return {"status": "downloading", "model": req.model}


@router.delete(
    "/models/{name:path}", dependencies=[Depends(require_auth), Depends(same_origin)]
)
async def delete_model(name: str) -> dict:
    try:
        await ollama.delete(name)
        return {"status": "deleted", "model": name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

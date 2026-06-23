"""Lightweight security for a local single-user app: optional bearer + origin guard."""
from fastapi import Header, HTTPException, Request

from app.config import settings


async def require_auth(authorization: str | None = Header(default=None)) -> None:
    """No-op unless ARENA_AUTH_TOKEN is set."""
    if not settings.auth_token:
        return
    if authorization != f"Bearer {settings.auth_token}":
        raise HTTPException(status_code=401, detail="missing or invalid bearer token")


async def same_origin(request: Request) -> None:
    """Block cross-site POST/DELETE (CSRF) on state-changing routes.

    A local web page in the user's browser must not be able to trigger model
    pulls/deletes. Allow only same-origin or the configured Vite dev origin.
    """
    origin = request.headers.get("origin")
    if origin is None:
        return  # non-browser client (curl, tests)
    allowed = set(settings.allowed_origins)
    allowed.add(f"http://{settings.host}:{settings.port}")
    if origin not in allowed:
        raise HTTPException(status_code=403, detail=f"origin not allowed: {origin}")

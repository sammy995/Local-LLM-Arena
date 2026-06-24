"""Judge endpoint validation + result parsing (no live model needed)."""
import httpx
import pytest

from app.main import app
from app.schemas import JudgeResult


@pytest.mark.asyncio
async def test_judge_requires_two_candidates():
    transport = httpx.ASGITransport(app=app)
    body = {"prompt": "hi", "judge_model": "m", "candidates": [{"label": "A", "text": "x"}]}
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.post("/api/judge", json=body)
    assert r.status_code == 422  # need >= 2 to compare


def test_judge_result_parses_and_bounds_score():
    res = JudgeResult.model_validate(
        {"verdicts": [{"label": "A", "score": 9, "reason": "clear"}], "winner": "A"}
    )
    assert res.winner == "A"
    assert res.verdicts[0].score == 9


@pytest.mark.asyncio
async def test_cloud_judge_without_key_returns_400():
    transport = httpx.ASGITransport(app=app)
    body = {
        "prompt": "hi",
        "judge_model": "claude-opus-4-8",
        "provider": "anthropic",
        "candidates": [{"label": "A", "text": "x"}, {"label": "B", "text": "y"}],
    }
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.post("/api/judge", json=body)
    assert r.status_code == 400  # missing API key -> clean client error, not 500/502

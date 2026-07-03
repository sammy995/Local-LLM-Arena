"""Judge reproducibility: sampling pinned on every provider path (audit G4)."""
import pytest

from app.services import cloud, ollama


@pytest.mark.asyncio
async def test_local_judge_pins_temperature_and_seed(monkeypatch):
    captured = {}

    async def fake_chat(**kw):
        captured.update(kw)

        class R:
            message = None

        return R()

    monkeypatch.setattr(ollama._client, "chat", fake_chat)
    out = await ollama.chat_json("m", [{"role": "user", "content": "hi"}])
    assert captured["options"] == {"temperature": 0.0, "seed": 42}
    assert out == "{}"


def test_openai_judge_body_pins_temperature():
    body = cloud.build_openai_body("m", "sys", "usr", {"type": "object"})
    assert body["temperature"] == 0
    assert body["max_tokens"] == 2048
    assert body["response_format"]["json_schema"]["schema"] == {"type": "object"}

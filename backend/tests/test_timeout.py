"""A hung Ollama must not hang a request forever (audit G1)."""
from app.config import settings
from app.services import ollama


def test_ollama_client_carries_request_timeout():
    # ollama.AsyncClient wraps an httpx.AsyncClient at ._client; httpx exposes .timeout
    assert ollama._client._client.timeout.read == settings.request_timeout_s

"""Pydantic request/response models. Bounds here turn bad input into 422, not 500."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ModelInstance(BaseModel):
    # `model`/`model_instances` collide with pydantic's protected namespace — disable it.
    model_config = ConfigDict(protected_namespaces=())

    id: str
    model: str
    temperature: float | None = Field(default=None, ge=0.01, le=2.0)
    top_p: float | None = Field(default=None, ge=0.0, le=1.0)
    top_k: int | None = Field(default=None, ge=0, le=100)
    repeat_penalty: float | None = Field(default=None, ge=1.0, le=2.0)
    num_predict: int | None = Field(default=None, ge=-1, le=4096)
    seed: int | None = Field(default=None, ge=0)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    message: str = ""
    history: list[Message] = []
    system: str = "You are a helpful assistant."
    model_instances: list[ModelInstance] = Field(min_length=1, max_length=6)


class PullRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model: str = Field(min_length=1, max_length=200)


# ---- LLM-as-judge (automated evaluation) ----
class Candidate(BaseModel):
    label: str  # anonymized: "A", "B", ... (the judge never sees model names)
    text: str


class JudgeRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    prompt: str
    judge_model: str
    candidates: list[Candidate] = Field(min_length=2, max_length=6)
    # "local" (Ollama) by default; the others use a per-request API key.
    provider: Literal["local", "anthropic", "openai", "openrouter"] = "local"
    api_key: str | None = None  # cloud only; never stored or logged
    base_url: str | None = None  # override for OpenAI-compatible endpoints


class Verdict(BaseModel):
    label: str
    score: float = Field(ge=0, le=10)
    reason: str = ""


class JudgeResult(BaseModel):
    verdicts: list[Verdict]
    winner: str = ""  # derived from the top score if the judge omits it

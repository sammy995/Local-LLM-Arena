"""All 6 hyperparameters must reach Ollama (the old web_chat.py dropped 3)."""
from app.schemas import ModelInstance
from app.services.ollama import build_options


def test_build_options_maps_all_six():
    inst = ModelInstance(
        id="x", model="m",
        temperature=0.5, top_p=0.8, top_k=30,
        repeat_penalty=1.5, num_predict=500, seed=42,
    )
    assert build_options(inst) == {
        "temperature": 0.5,
        "top_p": 0.8,
        "top_k": 30,
        "repeat_penalty": 1.5,
        "num_predict": 500,
        "seed": 42,
    }


def test_build_options_skips_seed_zero_as_random():
    assert "seed" not in build_options(ModelInstance(id="x", model="m", seed=0))


def test_build_options_empty_when_no_params():
    assert build_options(ModelInstance(id="x", model="m")) == {}

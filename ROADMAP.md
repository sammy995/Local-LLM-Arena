# Local LLM Arena — Roadmap

A **100% local** evaluation harness for LLMs — a private Chatbot Arena on your own
machine. Everything here keeps the local-first, no-telemetry, MIT-open principle.

## Today

- **Side-by-side comparison** — one prompt → up to 6 local models in parallel, with
  per-model hyperparameters.
- **Blind evaluation** — anonymized models, randomized order, 👍/👎 vote, then reveal.
- **LLM-as-judge** — scores anonymized answers and picks a winner (local model, or a
  cloud model with your own key).
- **Private Elo leaderboard** — pairwise Elo across runs from judge scores + votes.
- **Batch benchmark** — run a prompt set across models and export a reproducible
  Markdown/JSON Elo report.

## Next

- **Statistical rigor in benchmark reports** — confidence intervals on Elo, comparison
  counts per pair, and a win/loss/tie matrix, so results are defensible.
- **Judge robustness** — optional multi-judge / self-consistency voting, and a documented
  bias check (position bias, length bias) surfaced in the report.
- **More inference backends** — bring llama.cpp / any OpenAI-compatible endpoint under the
  same comparison UI, alongside Ollama.

## How to contribute

See [CONTRIBUTING.md](CONTRIBUTING.md). Highest-value areas: statistical rigor in
benchmark reports, judge-bias evaluation, and additional inference backends.

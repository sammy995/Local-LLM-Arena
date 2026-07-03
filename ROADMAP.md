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
- **Confidence intervals** — 95% bootstrap CIs on Elo plus a win matrix, in the
  leaderboard and in benchmark reports.
- **Judge bias controls** — randomized candidate order per judge call and pinned
  judge sampling (temperature 0, fixed local seed).

## Next

- **Judge robustness** — optional multi-judge / self-consistency voting, and a documented
  length-bias check surfaced in the report.
- **More inference backends** — bring llama.cpp / any OpenAI-compatible endpoint under the
  same comparison UI, alongside Ollama.

## How to contribute

See [CONTRIBUTING.md](CONTRIBUTING.md). Highest-value areas: judge-bias
evaluation (multi-judge, length bias) and additional inference backends.

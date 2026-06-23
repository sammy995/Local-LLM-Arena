# Credits & Acknowledgements

Local LLM Arena stands on excellent open-source work. Thank you to:

## Core stack
- **[Ollama](https://ollama.com)** (© Ollama, Inc., MIT) — the local inference engine. A
  separate product with its own license; not bundled here.
- **[FastAPI](https://fastapi.tiangolo.com)** (MIT) — async Python backend.
- **[React](https://react.dev)** + **[Vite](https://vite.dev)** (MIT) — frontend runtime and build.
- **[Tailwind CSS](https://tailwindcss.com)** (MIT) — styling.

## UI components
- **[shadcn/ui](https://ui.shadcn.com)** (MIT) — accessible component primitives and the
  token system used as the structural base of the interface.
- **[Uiverse](https://uiverse.io)** (MIT) — community gallery of open-source UI elements.
  The accent components in [`frontend/src/components/uiverse/`](frontend/src/components/uiverse/)
  are authored in the Uiverse spirit and licensed MIT. If you drop a specific element
  from uiverse.io into this project, keep its original author credit alongside it here.
- **[Lucide](https://lucide.dev)** (ISC) — icon set.

## Typography (bundled offline via [Fontsource](https://fontsource.org), all OFL)
- **Bricolage Grotesque** — display / headings.
- **Hanken Grotesk** — body text.
- **JetBrains Mono** — model labels, metrics, and code.

Fonts are bundled with the app (no external font CDN) so the application makes **zero
network calls to third parties** — consistent with its local-first, privacy-first goal.

## License
This project is MIT licensed (see [LICENSE](LICENSE)). Third-party components retain
their own licenses as listed above.

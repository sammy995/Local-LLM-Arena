import { useEffect, useState } from "react";

import { health, listModels } from "@/lib/api";
import type { ModelInfo } from "@/lib/types";

// Minimal shell to prove the wiring (Vite proxy -> FastAPI -> Ollama).
// Replace with the real arena UI in Phase 2/3 (shadcn components).
export default function App() {
  const [ok, setOk] = useState<boolean | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    health()
      .then((h) => setOk(h.ollama_reachable))
      .catch(() => setOk(false));
    listModels()
      .then(setModels)
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">⚔️ Local LLM Arena</h1>
        <p className="text-sm text-muted-foreground">
          FastAPI + React/Vite/shadcn scaffold — wiring smoke test
        </p>
      </header>

      <section className="rounded-lg border p-4">
        <p className="text-sm">
          Ollama reachable:{" "}
          <span className={ok ? "text-green-600" : "text-destructive"}>
            {ok === null ? "checking…" : ok ? "yes" : "no"}
          </span>
        </p>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-2 text-sm font-medium">Installed models</h2>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <ul className="space-y-1 text-sm">
          {models.map((m) => (
            <li key={m.name} className="text-muted-foreground">
              {m.name} {m.params ? `· ${m.params}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

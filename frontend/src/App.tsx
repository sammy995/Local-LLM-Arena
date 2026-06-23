import { Moon, Package, Paperclip, Plus, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { AnvilMark, HeroBackdrop } from "@/components/brand/AnvilMark";
import { Button } from "@/components/ui/button";
import { BlindToggle } from "@/components/uiverse/BlindToggle";
import { EmberButton } from "@/components/uiverse/EmberButton";
import { ForgeLoader } from "@/components/uiverse/ForgeLoader";
import { health, listModels } from "@/lib/api";
import type { ModelInfo } from "@/lib/types";
import { useTheme } from "@/lib/useTheme";

export default function App() {
  const { theme, toggle } = useTheme();
  const [online, setOnline] = useState<boolean | null>(null);
  const [available, setAvailable] = useState<ModelInfo[]>([]);
  const [arena, setArena] = useState<string[]>([]);
  const [blind, setBlind] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    health().then((h) => setOnline(h.ollama_reachable)).catch(() => setOnline(false));
    listModels().then(setAvailable).catch(() => setAvailable([]));
  }, []);

  function addModel(name: string) {
    if (name && !arena.includes(name)) setArena((a) => [...a, name].slice(0, 6));
  }

  function send() {
    if (!input.trim() || arena.length === 0) return;
    // TODO(Phase 3): wire streamChat() + readNdjson() into a live arena grid.
    setBusy(true);
    setTimeout(() => setBusy(false), 1200);
  }

  const empty = arena.length === 0;

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/70 bg-background/80 px-5 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-ember">
            <AnvilMark size={30} />
          </span>
          <div className="leading-tight">
            <h1 className="font-display text-[1.15rem] font-extrabold tracking-tight">
              LOCAL&nbsp;LLM&nbsp;ARENA
            </h1>
            <p className="text-[0.72rem] text-muted-foreground">
              Forge the best answer · 100% local · no cloud
            </p>
          </div>
          <span
            className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[0.68rem]"
            title="Ollama connection"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                online == null
                  ? "bg-muted-foreground"
                  : online
                    ? "bg-[var(--success)]"
                    : "bg-destructive"
              }`}
            />
            {online == null ? "checking" : online ? "ollama up" : "ollama down"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Package size={15} /> Models
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="relative flex flex-1 flex-col">
        {empty && <HeroBackdrop />}
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5">
          {empty ? (
            <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-ember">
                multi-model evaluation
              </p>
              <h2 className="max-w-2xl font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl">
                Put your local models in the&nbsp;
                <span className="text-ember">arena</span>.
              </h2>
              <p className="mt-4 max-w-md text-balance text-sm text-muted-foreground">
                Send one prompt to up to six models at once. Compare side-by-side, score
                them blind, tune each one&apos;s hyperparameters — all on your machine.
              </p>
              {available.length > 0 && (
                <p className="mt-6 font-mono text-xs text-muted-foreground">
                  {available.length} model{available.length === 1 ? "" : "s"} installed —
                  add one below to begin
                </p>
              )}
            </section>
          ) : (
            <section className="flex-1 py-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {arena.map((m) => (
                  <article
                    key={m}
                    className="rounded-xl border border-border bg-card p-4 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.6)]"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-xs text-ember">
                        {blind ? "Model ?" : m}
                      </span>
                      {busy && <ForgeLoader />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {busy ? "forging response…" : "Ready. Send a prompt below."}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Control + input dock */}
        <div className="sticky bottom-0 border-t border-border/70 bg-background/85 backdrop-blur-md">
          <div className="mx-auto w-full max-w-5xl px-5 py-3">
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <select
                className="h-8 rounded-md border border-input bg-card px-2 font-mono text-xs"
                defaultValue=""
                onChange={(e) => {
                  addModel(e.target.value);
                  e.currentTarget.value = "";
                }}
              >
                <option value="" disabled>
                  + add model…
                </option>
                {available.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                    {m.params ? ` · ${m.params}` : ""}
                  </option>
                ))}
              </select>
              {arena.map((m) => (
                <button
                  key={m}
                  onClick={() => setArena((a) => a.filter((x) => x !== m))}
                  className="inline-flex items-center gap-1 rounded-md border border-ember/40 bg-ember/10 px-2 py-1 font-mono text-xs text-ember transition-colors hover:bg-ember/20"
                  title="Remove"
                >
                  {m} <Plus size={12} className="rotate-45" />
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <span className="font-mono text-[0.7rem] text-muted-foreground">blind</span>
                <BlindToggle checked={blind} onChange={setBlind} />
              </div>
            </div>

            <div className="flex items-end gap-2 rounded-xl border border-input bg-card p-2">
              <Button variant="ghost" size="icon" aria-label="Attach file">
                <Paperclip size={16} />
              </Button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder={
                  arena.length ? "Ask all models… (Enter to send)" : "Add a model to start…"
                }
                className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
              />
              <EmberButton
                onClick={send}
                disabled={busy || !input.trim() || arena.length === 0}
                icon={<span aria-hidden>➤</span>}
              >
                {busy ? "Forging" : "Send"}
              </EmberButton>
            </div>
            <p className="mt-1.5 text-center text-[0.66rem] text-muted-foreground">
              Conversations never leave your machine.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

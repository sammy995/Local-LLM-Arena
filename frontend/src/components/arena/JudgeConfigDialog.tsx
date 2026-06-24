import { Settings2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { listModels } from "@/lib/api";
import type { JudgeProvider, ModelInfo } from "@/lib/types";
import { useArena } from "@/store/arena";

export const JUDGE_PROVIDERS: { value: JudgeProvider; label: string; placeholder: string }[] = [
  { value: "local", label: "Local (Ollama)", placeholder: "e.g. qwen2.5:3b" },
  { value: "anthropic", label: "Anthropic (Claude)", placeholder: "e.g. claude-opus-4-8" },
  { value: "openrouter", label: "OpenRouter", placeholder: "e.g. anthropic/claude-sonnet-4.5" },
  { value: "openai", label: "OpenAI-compatible", placeholder: "e.g. gpt-4o-mini" },
];

/** Shared judge settings (provider / model / API key) — used by Auto-judge and Benchmark. */
export function JudgeConfigDialog() {
  const cfg = useArena((s) => s.judgeConfig);
  const setCfg = useArena((s) => s.setJudgeConfig);
  const [models, setModels] = useState<ModelInfo[]>([]);
  useEffect(() => {
    listModels().then(setModels).catch(() => setModels([]));
  }, []);
  const ph = JUDGE_PROVIDERS.find((p) => p.value === cfg.provider)?.placeholder ?? "model";
  const cloud = cfg.provider !== "local";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Judge settings (provider, model, API key)">
          <Settings2 size={15} />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(94vw,460px)]">
        <DialogTitle>Judge settings</DialogTitle>
        <DialogDescription>
          Use a local model, or a cloud model with your own API key.
        </DialogDescription>

        <label className="mt-4 block text-xs font-medium">Provider</label>
        <select
          value={cfg.provider}
          onChange={(e) => setCfg({ provider: e.target.value as JudgeProvider })}
          className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          {JUDGE_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <label className="mt-3 block text-xs font-medium">Judge model</label>
        <input
          list={cfg.provider === "local" ? "judge-local-models" : undefined}
          value={cfg.model}
          onChange={(e) => setCfg({ model: e.target.value })}
          placeholder={ph}
          className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 font-mono text-sm"
        />
        {cfg.provider === "local" && (
          <datalist id="judge-local-models">
            {models.map((m) => (
              <option key={m.name} value={m.name} />
            ))}
          </datalist>
        )}

        {cloud && (
          <>
            <label className="mt-3 block text-xs font-medium">API key</label>
            <input
              type="password"
              value={cfg.apiKey}
              onChange={(e) => setCfg({ apiKey: e.target.value })}
              placeholder="sk-…"
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 font-mono text-sm"
            />
            <p className="mt-1 text-[0.66rem] text-muted-foreground">
              Stored only in this browser, sent per request, never logged.
            </p>
          </>
        )}

        {cfg.provider === "openai" && (
          <>
            <label className="mt-3 block text-xs font-medium">Base URL</label>
            <input
              value={cfg.baseUrl}
              onChange={(e) => setCfg({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 font-mono text-sm"
            />
          </>
        )}

        {cloud && (
          <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-[0.7rem] text-destructive">
            ⚠ Cloud judging sends prompts and answers to that provider — not local-only.
          </p>
        )}

        <DialogClose asChild>
          <Button className="mt-5 w-full">Done</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

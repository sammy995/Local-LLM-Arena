import { Gavel, Settings2, Trophy } from "lucide-react";
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
import { Tip } from "@/components/ui/tooltip";
import { listModels } from "@/lib/api";
import type { JudgeProvider, ModelInfo } from "@/lib/types";
import { useArena } from "@/store/arena";

const modelFromId = (id: string) => id.split("__")[0];

const PROVIDERS: { value: JudgeProvider; label: string; placeholder: string }[] = [
  { value: "local", label: "Local (Ollama)", placeholder: "e.g. qwen2.5:3b" },
  { value: "anthropic", label: "Anthropic (Claude)", placeholder: "e.g. claude-opus-4-8" },
  { value: "openrouter", label: "OpenRouter", placeholder: "e.g. anthropic/claude-sonnet-4.5" },
  { value: "openai", label: "OpenAI-compatible", placeholder: "e.g. gpt-4o-mini" },
];

function JudgeConfigDialog() {
  const cfg = useArena((s) => s.judgeConfig);
  const setCfg = useArena((s) => s.setJudgeConfig);
  const [models, setModels] = useState<ModelInfo[]>([]);
  useEffect(() => {
    listModels().then(setModels).catch(() => setModels([]));
  }, []);
  const ph = PROVIDERS.find((p) => p.value === cfg.provider)?.placeholder ?? "model";
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
          {PROVIDERS.map((p) => (
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
            ⚠ Cloud judging sends this comparison&apos;s prompt and answers to that provider —
            not local-only.
          </p>
        )}

        <DialogClose asChild>
          <Button className="mt-5 w-full">Done</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export function JudgeBar({ turnId }: { turnId: string }) {
  const sess = useArena((s) => s.current());
  const cfg = useArena((s) => s.judgeConfig);
  const judgeTurn = useArena((s) => s.judgeTurn);
  const turn = sess.turns.find((t) => t.id === turnId);
  if (!turn) return null;
  const jv = turn.judge;
  const blindActive = sess.blind.enabled && !sess.blind.revealed;

  const nameFor = (label: string): string => {
    const id = jv?.mapping[label];
    if (!id) return label;
    if (blindActive) return sess.blind.labels[id] ?? label;
    const inst = sess.instances.find((i) => i.id === id);
    return inst?.model ?? modelFromId(id);
  };

  const verdicts = jv?.verdicts ? [...jv.verdicts].sort((a, b) => b.score - a.score) : [];

  return (
    <div className="mt-3 rounded-xl border border-border/60 bg-card/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Tip content="Score the answers automatically with an AI judge (anonymized, no name bias)">
          <Button size="sm" className="gap-1.5" disabled={jv?.loading} onClick={() => judgeTurn(turnId)}>
            <Gavel size={14} /> {jv?.loading ? "Judging…" : "Auto-judge"}
          </Button>
        </Tip>
        <span className="font-mono text-[0.66rem] text-muted-foreground">
          {cfg.provider} · {cfg.model || "no model set"}
        </span>
        <div className="ml-auto">
          <JudgeConfigDialog />
        </div>
      </div>

      {jv?.error && <p className="mt-2 text-xs text-destructive">⚠ {jv.error}</p>}

      {verdicts.length > 0 && (
        <ol className="mt-3 space-y-2">
          {verdicts.map((v) => {
            const winner = v.label === jv?.winner;
            return (
              <li
                key={v.label}
                className={`rounded-lg border px-3 py-2 ${
                  winner ? "border-ember/50 bg-ember/10" : "border-border/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-mono text-sm">
                    {winner && <Trophy size={13} className="text-ember" />}
                    {nameFor(v.label)}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {v.score.toFixed(1)}/10
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-ember"
                    style={{ width: `${Math.max(0, Math.min(100, v.score * 10))}%` }}
                  />
                </div>
                {v.reason && <p className="mt-1.5 text-xs text-muted-foreground">{v.reason}</p>}
              </li>
            );
          })}
        </ol>
      )}

      {jv && !jv.loading && verdicts.length > 0 && (
        <p className="mt-1.5 text-right font-mono text-[0.6rem] text-muted-foreground">
          judged by {jv.by}
        </p>
      )}
    </div>
  );
}

import { Gavel, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tooltip";
import { useArena } from "@/store/arena";

import { JudgeConfigDialog } from "./JudgeConfigDialog";

const modelFromId = (id: string) => id.split("__")[0];

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

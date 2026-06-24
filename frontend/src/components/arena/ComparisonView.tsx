import { Swords } from "lucide-react";

import { HeroBackdrop } from "@/components/brand/AnvilMark";
import { paramSummary } from "@/lib/instance";
import { useArena } from "@/store/arena";

import { ArenaCard } from "./ArenaCard";

const modelFromId = (id: string) => id.split("__")[0];

function EmptyState({ count }: { count: number }) {
  return (
    <section className="relative flex flex-1 flex-col items-center justify-center py-16 text-center">
      <HeroBackdrop />
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-ember">
        compare · score · choose
      </p>
      <h2 className="max-w-2xl font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl">
        Compare your local LLMs,
        <br />
        <span className="text-ember">side by side</span>.
      </h2>
      <p className="mt-4 max-w-md text-balance text-sm text-muted-foreground">
        One prompt, up to six models at once. Watch them answer in parallel, compare
        speed and quality, and vote for the best — blind, on your own machine.
      </p>
      <ol className="mt-8 flex flex-wrap items-center justify-center gap-3 font-mono text-xs text-muted-foreground">
        <li className="rounded-full border border-border bg-card px-3 py-1.5">1 · add 2+ models</li>
        <li className="rounded-full border border-border bg-card px-3 py-1.5">2 · ask one question</li>
        <li className="rounded-full border border-border bg-card px-3 py-1.5">3 · compare &amp; vote</li>
      </ol>
      {count > 0 && (
        <p className="mt-6 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <Swords size={13} /> {count} model{count === 1 ? "" : "s"} in the arena — ask away below
        </p>
      )}
    </section>
  );
}

export function ComparisonView() {
  const sess = useArena((s) => s.current());
  const vote = useArena((s) => s.vote);
  const regenerate = useArena((s) => s.regenerate);

  if (sess.turns.length === 0) return <EmptyState count={sess.instances.length} />;

  const blindActive = sess.blind.enabled && !sess.blind.revealed;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6">
      {sess.turns.map((turn) => {
        const base = blindActive ? sess.blind.order : sess.instances.map((i) => i.id);
        const present = Object.keys(turn.responses);
        const ordered = [
          ...base.filter((id) => present.includes(id)),
          ...present.filter((id) => !base.includes(id)),
        ];
        let fastestId = "";
        let best = -1;
        for (const id of ordered) {
          const tps = turn.responses[id]?.metrics?.tokens_per_sec ?? -1;
          if (tps > best) [best, fastestId] = [tps, id];
        }

        return (
          <div key={turn.id}>
            <div className="mb-3 flex justify-end">
              <p className="max-w-[80%] rounded-2xl rounded-tr-sm bg-ember/12 px-4 py-2 text-sm">
                {turn.fileNote && (
                  <span className="mr-1 font-mono text-xs text-ember">📎 {turn.fileNote}</span>
                )}
                {turn.user}
              </p>
            </div>
            <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {ordered.map((id) => {
                const inst = sess.instances.find((i) => i.id === id);
                const name = blindActive
                  ? sess.blind.labels[id] ?? "Model ?"
                  : inst?.model ?? modelFromId(id);
                return (
                  <ArenaCard
                    key={id}
                    name={name}
                    sub={inst ? paramSummary(inst) : undefined}
                    response={turn.responses[id]}
                    blind={sess.blind.enabled}
                    revealed={sess.blind.revealed}
                    fastest={id === fastestId && best > 0}
                    onVote={(v) => vote(turn.id, id, v)}
                    onRegenerate={() => regenerate(id)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

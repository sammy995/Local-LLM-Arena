import { Eye } from "lucide-react";
import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { paramSummary } from "@/lib/instance";
import { useArena } from "@/store/arena";

export function RevealDialog({ trigger }: { trigger: ReactNode }) {
  const sess = useArena((s) => s.current());
  const reveal = useArena((s) => s.reveal);
  const order = sess.blind.order.length ? sess.blind.order : sess.instances.map((i) => i.id);

  const tally = (instId: string) =>
    sess.turns.reduce(
      (a, t) => {
        const v = t.responses[instId]?.vote;
        if (v === 1) a.up++;
        else if (v === -1) a.down++;
        return a;
      },
      { up: 0, down: 0 },
    );

  const instById = (id: string) => sess.instances.find((i) => i.id === id);
  const revealed = sess.blind.revealed;

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogTitle>Blind evaluation results</DialogTitle>
        <DialogDescription>
          {revealed
            ? "Identities revealed. Voting is locked to preserve integrity."
            : "Tally so far. Reveal to unmask which model is which — this locks voting."}
        </DialogDescription>

        <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 font-mono text-[0.66rem] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Label</th>
                <th className="px-3 py-2 text-left">Model</th>
                <th className="px-3 py-2 text-center">👍</th>
                <th className="px-3 py-2 text-center">👎</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {order.map((id) => {
                const t = tally(id);
                const inst = instById(id);
                return (
                  <tr key={id}>
                    <td className="px-3 py-2 font-mono font-semibold text-ember">
                      {sess.blind.labels[id] ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {revealed && inst ? (
                        <>
                          {inst.model}{" "}
                          <span className="text-muted-foreground">{paramSummary(inst)}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">•••••</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-[var(--success)]">{t.up}</td>
                    <td className="px-3 py-2 text-center font-mono text-destructive">{t.down}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!revealed && (
          <Button onClick={reveal} className="mt-4 w-full gap-1.5">
            <Eye size={15} /> Reveal &amp; lock voting
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

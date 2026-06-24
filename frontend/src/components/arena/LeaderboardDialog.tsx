import { Crown } from "lucide-react";
import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { computeLeaderboard } from "@/lib/elo";
import { useArena } from "@/store/arena";

export function LeaderboardDialog({ trigger }: { trigger: ReactNode }) {
  const sessions = useArena((s) => s.sessions);
  const board = computeLeaderboard(sessions);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogTitle>🏆 Model leaderboard</DialogTitle>
        <DialogDescription>
          Elo across all your comparisons — derived from Auto-judge scores and 👍/👎 votes.
          Same model at different settings is aggregated by name.
        </DialogDescription>

        {board.length === 0 ? (
          <p className="mt-6 rounded-lg border border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
            No ranked matches yet — run <span className="font-medium">Auto-judge</span> or vote
            👍/👎 in blind mode to start building the leaderboard.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 font-mono text-[0.66rem] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Model</th>
                  <th className="px-3 py-2 text-right">Elo</th>
                  <th className="px-3 py-2 text-right">W–L–T</th>
                  <th className="px-3 py-2 text-right">Matches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {board.map((row, i) => (
                  <tr key={row.model} className={i === 0 ? "bg-ember/10" : ""}>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-mono">
                      <span className="inline-flex items-center gap-1.5">
                        {i === 0 && <Crown size={13} className="text-ember" />}
                        {row.model}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-ember">
                      {row.elo}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                      {row.wins}–{row.losses}–{row.ties}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                      {row.matches}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[0.66rem] text-muted-foreground">
          Elo starts at 1000 (K=24), updated per pairwise match in chronological order.
        </p>
      </DialogContent>
    </Dialog>
  );
}

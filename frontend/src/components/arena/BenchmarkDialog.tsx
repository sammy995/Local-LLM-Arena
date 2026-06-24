import { Crown, Download, FlaskConical, Play } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  benchToJSON,
  benchToMarkdown,
  runBenchmark,
  type BenchResult,
} from "@/lib/benchmark";
import { useArena } from "@/store/arena";

import { JudgeConfigDialog } from "./JudgeConfigDialog";

function download(filename: string, data: string, mime: string) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parsePrompts(text: string, filename?: string): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (filename?.endsWith(".jsonl")) {
    return lines
      .map((l) => {
        try {
          const o = JSON.parse(l);
          return typeof o === "string" ? o : (o.prompt ?? o.question ?? o.input ?? "");
        } catch {
          return "";
        }
      })
      .filter(Boolean);
  }
  if (filename?.endsWith(".csv")) {
    return lines.map((l) => l.split(",")[0].replace(/^"|"$/g, "").trim()).filter(Boolean);
  }
  return lines;
}

export function BenchmarkDialog({ trigger }: { trigger: ReactNode }) {
  const sess = useArena((s) => s.current());
  const cfg = useArena((s) => s.judgeConfig);
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string }>();
  const [result, setResult] = useState<BenchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const prompts = parsePrompts(text);
  const judgeLabel = `${cfg.provider} · ${cfg.model || "no model"}`;

  const run = async () => {
    setError(null);
    setResult(null);
    if (sess.instances.length < 2) {
      setError("Add at least 2 models to the arena first.");
      return;
    }
    if (prompts.length === 0) {
      setError("Add at least one prompt.");
      return;
    }
    setRunning(true);
    try {
      const r = await runBenchmark(prompts, sess.instances, sess.system, cfg, (done, total, label) =>
        setProgress({ done, total, label }),
      );
      setResult(r);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setRunning(false);
      setProgress(undefined);
    }
  };

  const winnerModel = (id: string | undefined) =>
    id ? (sess.instances.find((i) => i.id === id)?.model ?? id.split("__")[0]) : "—";

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[min(94vw,720px)]">
        <DialogTitle>🧪 Benchmark</DialogTitle>
        <DialogDescription>
          Run a set of prompts across your {sess.instances.length} arena model
          {sess.instances.length === 1 ? "" : "s"}, auto-judge each, and aggregate an Elo
          ranking you can export. (Needs ≥2 models and a judge model.)
        </DialogDescription>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {prompts.length} prompt{prompts.length === 1 ? "" : "s"} · judge: {judgeLabel}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".txt,.jsonl,.csv,.md"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setText(parsePrompts(await f.text(), f.name).join("\n"));
              }}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              Load file
            </Button>
            <JudgeConfigDialog />
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={"One prompt per line, e.g.\nExplain a black hole simply.\nWrite a haiku about the sea.\nWhat is 17 × 23?"}
          className="mt-2 w-full rounded-md border border-input bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <Button className="mt-3 w-full gap-1.5" disabled={running} onClick={run}>
          <Play size={15} /> {running ? "Running…" : `Run benchmark (${prompts.length})`}
        </Button>

        {progress && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between font-mono text-[0.66rem] text-muted-foreground">
              <span>{progress.label}</span>
              <span>
                {progress.done}/{progress.total}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-ember transition-[width]"
                style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-xs text-destructive">⚠ {error}</p>}

        {result && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="font-display text-sm font-bold">
                Leaderboard ({result.judgedCount}/{result.perPrompt.length} judged)
              </h3>
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    download(
                      "benchmark.md",
                      benchToMarkdown(result, judgeLabel),
                      "text/markdown",
                    )
                  }
                >
                  <Download size={13} /> .md
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    download(
                      "benchmark.json",
                      benchToJSON(result, {
                        judge: judgeLabel,
                        models: sess.instances.map((i) => i.model),
                      }),
                      "application/json",
                    )
                  }
                >
                  <Download size={13} /> .json
                </Button>
              </div>
            </div>

            {result.leaderboard.length === 0 ? (
              <p className="rounded-lg border border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
                No ranked matches — set a capable judge model (cloud models judge most
                reliably) and run again.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 font-mono text-[0.66rem] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Model</th>
                      <th className="px-3 py-2 text-right">Elo</th>
                      <th className="px-3 py-2 text-right">W–L–T</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {result.leaderboard.map((r, i) => (
                      <tr key={r.model} className={i === 0 ? "bg-ember/10" : ""}>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-mono">
                          <span className="inline-flex items-center gap-1.5">
                            {i === 0 && <Crown size={13} className="text-ember" />}
                            {r.model}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-ember">
                          {r.elo}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                          {r.wins}–{r.losses}–{r.ties}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <ol className="mt-3 space-y-1 text-xs">
              {result.perPrompt.map((p, i) => (
                <li key={i} className="flex gap-2 text-muted-foreground">
                  <span className="font-mono text-ember">
                    {p.winner ? winnerModel(p.mapping?.[p.winner]) : "—"}
                  </span>
                  <span className="truncate">{p.prompt}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <p className="mt-3 inline-flex items-center gap-1 text-[0.66rem] text-muted-foreground">
          <FlaskConical size={11} /> Reproducible: same prompts + judge → a comparable Elo
          report. Export and share.
        </p>
      </DialogContent>
    </Dialog>
  );
}

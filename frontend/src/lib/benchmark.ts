import type { JudgeConfig, Session } from "@/store/arena";

import { chatOnce, judge } from "./api";
import {
  bootstrapCI,
  eloFromMatches,
  extractMatches,
  winMatrix,
  type LeaderRow,
  type Match,
} from "./elo";
import { shuffle } from "./shuffle";
import type { ModelInstance } from "./types";

const LETTERS = "ABCDEFGH".split("");

/** Randomize candidate order per judge call so no model always sits at label "A"
 *  (position bias). Returns the labeled order + label -> instanceId mapping. */
export function assignLabels(
  ids: string[],
  rng: () => number = Math.random,
): { order: { label: string; id: string }[]; mapping: Record<string, string> } {
  const shuffled = shuffle(ids, rng);
  const mapping: Record<string, string> = {};
  const order = shuffled.map((id, i) => {
    const label = LETTERS[i] ?? `M${i}`;
    mapping[label] = id;
    return { label, id };
  });
  return { order, mapping };
}

export interface PromptResult {
  prompt: string;
  answers: Record<string, { model: string; text: string; error?: string }>; // instanceId -> answer
  verdicts?: { label: string; score: number; reason: string }[];
  winner?: string;
  mapping?: Record<string, string>; // judge label -> instanceId
  judgeError?: string;
}

export interface BenchResult {
  perPrompt: PromptResult[];
  leaderboard: LeaderRow[];
  matches: Match[];
  judgedCount: number;
}

/** Build a synthetic Session from batch results so the existing Elo engine can rank it. */
export function buildSession(perPrompt: PromptResult[], instances: ModelInstance[]): Session {
  return {
    id: "bench",
    title: "benchmark",
    createdAt: Date.now(),
    system: "",
    instances,
    blind: { enabled: false, revealed: false, order: [], labels: {} },
    turns: perPrompt.map((p, i) => ({
      id: `b${i}`,
      user: p.prompt,
      prompt: p.prompt,
      responses: Object.fromEntries(
        instances.map((inst) => [
          inst.id,
          { text: p.answers[inst.id]?.text ?? "", streaming: false, vote: 0 as const },
        ]),
      ),
      judge: p.verdicts
        ? { loading: false, by: "benchmark", mapping: p.mapping ?? {}, verdicts: p.verdicts, winner: p.winner }
        : undefined,
    })),
  };
}

/** Run every prompt across every model, optionally auto-judge each, then aggregate Elo. */
export async function runBenchmark(
  prompts: string[],
  instances: ModelInstance[],
  system: string,
  cfg: JudgeConfig,
  onProgress: (done: number, total: number, label: string) => void,
): Promise<BenchResult> {
  const perPrompt: PromptResult[] = [];

  for (let p = 0; p < prompts.length; p++) {
    const prompt = prompts[p];
    onProgress(p, prompts.length, `Answering prompt ${p + 1}/${prompts.length}`);

    const res = await chatOnce({ message: prompt, history: [], system, model_instances: instances });
    const answers: PromptResult["answers"] = {};
    for (const inst of instances) {
      const r = res.results[inst.id];
      answers[inst.id] = {
        model: inst.model,
        text: r?.assistant ?? "",
        error: r?.error ?? res.errors[inst.id],
      };
    }
    const pr: PromptResult = { prompt, answers };

    if (cfg.model) {
      onProgress(p, prompts.length, `Judging prompt ${p + 1}/${prompts.length}`);
      const ids = instances
        .map((i) => i.id)
        .filter((id) => answers[id].text && !answers[id].error);
      if (ids.length >= 2) {
        const { order, mapping } = assignLabels(ids);
        const candidates = order.map(({ label, id }) => ({ label, text: answers[id].text }));
        try {
          const jr = await judge({
            prompt,
            judge_model: cfg.model,
            provider: cfg.provider,
            api_key: cfg.apiKey || undefined,
            base_url: cfg.provider === "openai" ? cfg.baseUrl || undefined : undefined,
            candidates,
          });
          pr.verdicts = jr.verdicts;
          pr.winner = jr.winner;
          pr.mapping = mapping;
        } catch (e) {
          pr.judgeError = String((e as Error).message ?? e);
        }
      }
    }
    perPrompt.push(pr);
  }

  onProgress(prompts.length, prompts.length, "Aggregating");
  const matches = extractMatches([buildSession(perPrompt, instances)]);
  const leaderboard = eloFromMatches(matches);
  const judgedCount = perPrompt.filter((p) => p.verdicts?.length).length;
  return { perPrompt, leaderboard, matches, judgedCount };
}

export function benchToMarkdown(result: BenchResult, judgeLabel: string): string {
  const ci = bootstrapCI(result.matches);
  const lines: string[] = [];
  lines.push(`# Local LLM Arena — Benchmark`);
  lines.push("");
  lines.push(`- Prompts: ${result.perPrompt.length}`);
  lines.push(`- Judged: ${result.judgedCount}`);
  lines.push(`- Judge: ${judgeLabel}`);
  lines.push(`- Pairwise matches: ${result.matches.length}`);
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`## Leaderboard (Elo)`);
  lines.push("");
  lines.push(`| # | Model | Elo | 95% CI | W–L–T | Matches |`);
  lines.push(`|---|-------|-----|--------|-------|---------|`);
  result.leaderboard.forEach((r, i) => {
    const iv = ci.get(r.model);
    const cell = iv ? `${iv.lo}–${iv.hi}` : "—";
    lines.push(
      `| ${i + 1} | ${r.model} | ${r.elo} | ${cell} | ${r.wins}–${r.losses}–${r.ties} | ${r.matches} |`,
    );
  });
  lines.push("");
  lines.push(
    `> CI = 95% bootstrap interval (200 resamples of the match list). ` +
      `Overlapping intervals mean the data can't separate those models yet.`,
  );
  lines.push("");
  const { models, wins } = winMatrix(result.matches);
  if (models.length) {
    lines.push(`## Win matrix (row beats column)`);
    lines.push("");
    lines.push(`| | ${models.join(" | ")} |`);
    lines.push(`|---|${models.map(() => "---").join("|")}|`);
    for (const m of models) {
      lines.push(`| **${m}** | ${models.map((n) => (n === m ? "—" : wins[m][n])).join(" | ")} |`);
    }
    lines.push("");
  }
  lines.push(`## Per-prompt winners`);
  lines.push("");
  const winnerModel = (p: PromptResult) =>
    p.winner && p.mapping?.[p.winner]
      ? (p.answers[p.mapping[p.winner]]?.model ?? p.winner)
      : "—";
  result.perPrompt.forEach((p, i) => {
    lines.push(`${i + 1}. **${winnerModel(p)}** — ${p.prompt.slice(0, 120)}`);
  });
  return lines.join("\n");
}

export function benchToJSON(result: BenchResult, meta: Record<string, unknown>): string {
  const ci = bootstrapCI(result.matches);
  return JSON.stringify(
    {
      app: "Local LLM Arena",
      kind: "benchmark",
      generatedAt: new Date().toISOString(),
      ...meta,
      totalMatches: result.matches.length,
      leaderboard: result.leaderboard.map((r) => ({ ...r, ci95: ci.get(r.model) ?? null })),
      winMatrix: winMatrix(result.matches),
      results: result.perPrompt,
    },
    null,
    2,
  );
}

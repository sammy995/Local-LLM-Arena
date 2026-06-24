import { Tip } from "@/components/ui/tooltip";
import type { Hyperparams } from "@/lib/instance";

interface FieldDef {
  key: keyof Hyperparams;
  label: string;
  emoji: string;
  tip: string;
  min: number;
  max: number;
  step: number;
}

const FIELDS: FieldDef[] = [
  { key: "temperature", label: "Temp", emoji: "🌡️", min: 0.01, max: 2, step: 0.1,
    tip: "Temperature — randomness. Low = focused/deterministic, high = creative." },
  { key: "top_p", label: "Top-P", emoji: "📊", min: 0, max: 1, step: 0.05,
    tip: "Top-P (nucleus) — sample from the smallest set of tokens whose probability sums to P." },
  { key: "top_k", label: "Top-K", emoji: "🎯", min: 0, max: 100, step: 1,
    tip: "Top-K — only consider the K most likely next tokens. Lower = more focused." },
  { key: "repeat_penalty", label: "Repeat", emoji: "🔄", min: 1, max: 2, step: 0.1,
    tip: "Repeat penalty — discourages repeating text. Higher = more varied." },
  { key: "num_predict", label: "Max", emoji: "📏", min: -1, max: 4096, step: 128,
    tip: "Max tokens to generate. -1 = unlimited." },
  { key: "seed", label: "Seed", emoji: "🎲", min: 0, max: 999999, step: 1,
    tip: "Seed — set > 0 for reproducible output. 0 = random each run." },
];

// Reusable per-model hyperparameter editor. Every field has a tooltip.
export function HyperparamFields({
  value,
  onChange,
  compact = false,
}: {
  value: Hyperparams;
  onChange: (hp: Hyperparams) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex flex-wrap gap-2" : "grid grid-cols-2 gap-3 sm:grid-cols-3"}>
      {FIELDS.map((f) => (
        <label key={f.key} className="flex flex-col gap-1">
          <Tip content={f.tip}>
            <span className="cursor-help font-mono text-[0.68rem] text-muted-foreground">
              {f.emoji} {f.label}
            </span>
          </Tip>
          <input
            type="number"
            min={f.min}
            max={f.max}
            step={f.step}
            value={value[f.key]}
            onChange={(e) =>
              onChange({ ...value, [f.key]: e.target.value === "" ? f.min : Number(e.target.value) })
            }
            className="h-8 w-full rounded-md border border-input bg-background px-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      ))}
    </div>
  );
}

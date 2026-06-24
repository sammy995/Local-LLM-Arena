import type { ModelInstance } from "./types";

// Ollama defaults. All 6 hyperparameters are always carried on an instance.
export const DEFAULT_HP = {
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  repeat_penalty: 1.1,
  num_predict: -1,
  seed: 0,
} as const;

export type Hyperparams = {
  temperature: number;
  top_p: number;
  top_k: number;
  repeat_penalty: number;
  num_predict: number;
  seed: number;
};

// Deterministic id so "same model, different params" = distinct arena entry,
// and identical configs can't be added twice.
export function makeInstanceId(model: string, hp: Hyperparams): string {
  return `${model}__${hp.temperature}_${hp.top_p}_${hp.top_k}_${hp.repeat_penalty}_${hp.num_predict}_${hp.seed}`;
}

export function makeInstance(model: string, hp: Hyperparams = { ...DEFAULT_HP }): ModelInstance {
  return { id: makeInstanceId(model, hp), model, ...hp };
}

export function hpOf(inst: ModelInstance): Hyperparams {
  return {
    temperature: inst.temperature ?? DEFAULT_HP.temperature,
    top_p: inst.top_p ?? DEFAULT_HP.top_p,
    top_k: inst.top_k ?? DEFAULT_HP.top_k,
    repeat_penalty: inst.repeat_penalty ?? DEFAULT_HP.repeat_penalty,
    num_predict: inst.num_predict ?? DEFAULT_HP.num_predict,
    seed: inst.seed ?? DEFAULT_HP.seed,
  };
}

// Compact chip summary: core params always; advanced only when non-default.
export function paramSummary(inst: ModelInstance): string {
  const hp = hpOf(inst);
  let s = `T${hp.temperature} P${hp.top_p} K${hp.top_k}`;
  if (hp.repeat_penalty !== DEFAULT_HP.repeat_penalty) s += ` R${hp.repeat_penalty}`;
  if (hp.num_predict !== DEFAULT_HP.num_predict) s += ` M${hp.num_predict}`;
  if (hp.seed !== DEFAULT_HP.seed) s += ` S${hp.seed}`;
  return s;
}

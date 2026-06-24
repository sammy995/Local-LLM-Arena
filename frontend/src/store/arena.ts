import { create } from "zustand";
import { persist } from "zustand/middleware";

import { judge as judgeApi, streamChat } from "@/lib/api";
import { DEFAULT_HP, hpOf, makeInstance, makeInstanceId, type Hyperparams } from "@/lib/instance";
import { readNdjson } from "@/lib/sse";
import type { JudgeProvider, ModelInstance } from "@/lib/types";

export interface Metrics {
  eval_tokens: number;
  duration_s: number;
  first_token_s: number | null;
  tokens_per_sec: number;
}
export interface Response {
  text: string;
  streaming: boolean;
  error?: string;
  metrics?: Metrics;
  vote: 0 | 1 | -1;
}
export interface JudgeView {
  loading: boolean;
  error?: string;
  verdicts?: { label: string; score: number; reason: string }[];
  winner?: string;
  mapping: Record<string, string>; // judge label -> instanceId
  by: string; // provider · model, for display
}
export interface Turn {
  id: string;
  user: string; // display text
  prompt: string; // text actually sent (may include file content)
  fileNote?: string;
  responses: Record<string, Response>; // instanceId -> response
  judge?: JudgeView;
}

export interface JudgeConfig {
  provider: JudgeProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
}
const DEFAULT_JUDGE: JudgeConfig = {
  provider: "local",
  model: "",
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
};
export interface BlindState {
  enabled: boolean;
  revealed: boolean;
  order: string[]; // instanceIds, shuffled (display order while blind)
  labels: Record<string, string>; // instanceId -> "Model A"
}
export interface Session {
  id: string;
  title: string;
  createdAt: number;
  system: string;
  instances: ModelInstance[];
  turns: Turn[];
  blind: BlindState;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const LABELS = "ABCDEFGHIJ".split("");

function shuffle<T>(arr: T[]): T[] {
  const r = [...arr];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function computeBlind(instances: ModelInstance[]): Pick<BlindState, "order" | "labels"> {
  const order = shuffle(instances.map((i) => i.id));
  const labels: Record<string, string> = {};
  order.forEach((id, i) => (labels[id] = `Model ${LABELS[i] ?? i + 1}`));
  return { order, labels };
}

function newSession(carryInstances: ModelInstance[] = []): Session {
  return {
    id: uid(),
    title: "New comparison",
    createdAt: Date.now(),
    system: "You are a helpful assistant.",
    instances: carryInstances,
    turns: [],
    blind: { enabled: false, revealed: false, order: [], labels: {} },
  };
}

// AbortControllers live outside persisted state.
const controllers = new Map<string, AbortController>();
const ckey = (turnId: string, instId: string) => `${turnId}:${instId}`;

interface ArenaState {
  sessions: Session[];
  currentId: string;

  current: () => Session;
  // model selection
  addInstance: (model: string, hp?: Hyperparams) => void;
  removeInstance: (id: string) => void;
  updateInstance: (oldId: string, hp: Hyperparams) => void;
  // session
  setSystem: (s: string) => void;
  createSession: () => void;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  clearTurns: () => void;
  // blind
  setBlind: (enabled: boolean) => void;
  reveal: () => void;
  vote: (turnId: string, instId: string, v: 1 | -1) => void;
  // chat / compare
  send: (message: string, fileText?: string, fileName?: string) => void;
  regenerate: (instId: string) => void;
  stopAll: () => void;
  exportJSON: () => { filename: string; data: string };
  // LLM-as-judge
  judgeConfig: JudgeConfig;
  setJudgeConfig: (patch: Partial<JudgeConfig>) => void;
  judgeTurn: (turnId: string) => void;
}

export const useArena = create<ArenaState>()(
  persist(
    (set, get) => {
      // patch the current session immutably
      const patch = (fn: (s: Session) => Session) =>
        set((st) => ({ sessions: st.sessions.map((s) => (s.id === st.currentId ? fn(s) : s)) }));

      const patchResponse = (
        turnId: string,
        instId: string,
        fn: (r: Response) => Response,
      ) =>
        patch((s) => ({
          ...s,
          turns: s.turns.map((t) =>
            t.id !== turnId
              ? t
              : {
                  ...t,
                  responses: {
                    ...t.responses,
                    [instId]: fn(t.responses[instId] ?? { text: "", streaming: false, vote: 0 }),
                  },
                },
          ),
        }));

      const ensureBlind = (s: Session): Session => {
        if (!s.blind.enabled || s.blind.revealed) return s;
        const ids = new Set(s.instances.map((i) => i.id));
        const covered = s.blind.order.length === ids.size && s.blind.order.every((id) => ids.has(id));
        if (covered) return s;
        return { ...s, blind: { ...s.blind, ...computeBlind(s.instances) } };
      };

      const historyFor = (s: Session, instId: string, upto: number) => {
        const msgs: { role: "user" | "assistant"; content: string }[] = [];
        for (let i = 0; i < upto; i++) {
          const t = s.turns[i];
          msgs.push({ role: "user", content: t.prompt });
          const r = t.responses[instId];
          if (r && r.text) msgs.push({ role: "assistant", content: r.text });
        }
        return msgs;
      };

      const runStream = (
        s: Session,
        turnId: string,
        inst: ModelInstance,
        upto: number,
        prompt: string,
      ) => {
        const ctrl = new AbortController();
        controllers.set(ckey(turnId, inst.id), ctrl);
        const history = historyFor(s, inst.id, upto);
        streamChat({ message: prompt, history, system: s.system, model_instances: [inst] }, ctrl.signal)
          .then((res) =>
            readNdjson(res, (e) => {
              if (e.type === "token")
                patchResponse(turnId, inst.id, (r) => ({ ...r, text: r.text + e.token }));
              else if (e.type === "metrics")
                patchResponse(turnId, inst.id, (r) => ({ ...r, metrics: e.metrics }));
              else if (e.type === "done")
                patchResponse(turnId, inst.id, (r) => ({ ...r, streaming: false }));
              else if (e.type === "error")
                patchResponse(turnId, inst.id, (r) => ({ ...r, streaming: false, error: e.error }));
            }),
          )
          .catch((err: unknown) =>
            patchResponse(turnId, inst.id, (r) => ({
              ...r,
              streaming: false,
              error: r.text ? undefined : String((err as Error)?.message ?? err),
            })),
          )
          .finally(() => controllers.delete(ckey(turnId, inst.id)));
      };

      return {
        sessions: [newSession()],
        currentId: "",

        current: () => {
          const st = get();
          return st.sessions.find((s) => s.id === st.currentId) ?? st.sessions[0];
        },

        addInstance: (model, hp = { ...DEFAULT_HP }) =>
          patch((s) => {
            const id = makeInstanceId(model, hp);
            if (s.instances.some((i) => i.id === id) || s.instances.length >= 6) return s;
            return ensureBlind({ ...s, instances: [...s.instances, makeInstance(model, hp)] });
          }),

        removeInstance: (id) =>
          patch((s) => ensureBlind({ ...s, instances: s.instances.filter((i) => i.id !== id) })),

        updateInstance: (oldId, hp) =>
          patch((s) => {
            const idx = s.instances.findIndex((i) => i.id === oldId);
            if (idx < 0) return s;
            const model = s.instances[idx].model;
            const next = makeInstance(model, hp);
            if (s.instances.some((i) => i.id === next.id && i.id !== oldId)) return s; // dup
            const instances = [...s.instances];
            instances[idx] = next;
            return ensureBlind({ ...s, instances });
          }),

        setSystem: (system) => patch((s) => ({ ...s, system })),

        createSession: () =>
          set((st) => {
            const cur = st.sessions.find((s) => s.id === st.currentId);
            const ns = newSession(cur ? cur.instances.map((i) => ({ ...i })) : []);
            return { sessions: [ns, ...st.sessions], currentId: ns.id };
          }),

        switchSession: (id) => set({ currentId: id }),

        deleteSession: (id) =>
          set((st) => {
            const rest = st.sessions.filter((s) => s.id !== id);
            const sessions = rest.length ? rest : [newSession()];
            const currentId = st.currentId === id ? sessions[0].id : st.currentId;
            return { sessions, currentId };
          }),

        clearTurns: () => patch((s) => ({ ...s, turns: [] })),

        setBlind: (enabled) =>
          patch((s) => {
            const blind: BlindState = enabled
              ? { enabled: true, revealed: false, ...computeBlind(s.instances) }
              : { enabled: false, revealed: false, order: [], labels: {} };
            return { ...s, blind };
          }),

        reveal: () => patch((s) => ({ ...s, blind: { ...s.blind, revealed: true } })),

        vote: (turnId, instId, v) =>
          patch((s) => {
            if (s.blind.enabled && s.blind.revealed) return s; // locked after reveal
            return {
              ...s,
              turns: s.turns.map((t) =>
                t.id !== turnId
                  ? t
                  : {
                      ...t,
                      responses: {
                        ...t.responses,
                        [instId]: {
                          ...t.responses[instId],
                          vote: t.responses[instId]?.vote === v ? 0 : v,
                        },
                      },
                    },
              ),
            };
          }),

        send: (message, fileText, fileName) => {
          const s0 = ensureBlind(get().current());
          if (!s0.instances.length || !message.trim()) return;
          const prompt = fileText ? `[Attached file: ${fileName}]\n\n${fileText}\n\n${message}` : message;
          const turn: Turn = {
            id: uid(),
            user: message,
            prompt,
            fileNote: fileName,
            responses: Object.fromEntries(
              s0.instances.map((i) => [i.id, { text: "", streaming: true, vote: 0 } as Response]),
            ),
          };
          const upto = s0.turns.length;
          patch((s) => ({
            ...ensureBlind(s),
            title: s.turns.length === 0 ? message.slice(0, 40) : s.title,
            turns: [...s.turns, turn],
          }));
          for (const inst of s0.instances) runStream(s0, turn.id, inst, upto, prompt);
        },

        regenerate: (instId) => {
          const s = get().current();
          const upto = s.turns.length - 1;
          const turn = s.turns[upto];
          if (!turn) return;
          const inst = s.instances.find((i) => i.id === instId);
          if (!inst) return;
          patchResponse(turn.id, instId, () => ({ text: "", streaming: true, vote: 0 }));
          runStream(s, turn.id, inst, upto, turn.prompt);
        },

        stopAll: () => {
          controllers.forEach((c) => c.abort());
          controllers.clear();
          patch((s) => ({
            ...s,
            turns: s.turns.map((t) => ({
              ...t,
              responses: Object.fromEntries(
                Object.entries(t.responses).map(([k, r]) => [k, { ...r, streaming: false }]),
              ),
            })),
          }));
        },

        exportJSON: () => {
          const s = get().current();
          const masked = s.blind.enabled && !s.blind.revealed;
          const nameFor = (id: string) =>
            masked ? s.blind.labels[id] ?? id : id;
          const data = {
            app: "Local LLM Arena",
            exportedAt: new Date().toISOString(),
            blind: { enabled: s.blind.enabled, revealed: s.blind.revealed },
            system: s.system,
            models: s.instances.map((i) =>
              masked
                ? { label: s.blind.labels[i.id] }
                : { id: i.id, model: i.model, hyperparameters: hpOf(i) },
            ),
            turns: s.turns.map((t) => ({
              prompt: t.user,
              responses: Object.entries(t.responses).map(([id, r]) => ({
                model: nameFor(id),
                text: r.text,
                metrics: r.metrics,
                vote: r.vote,
                error: r.error,
              })),
            })),
          };
          const stamp = new Date().toISOString().slice(0, 10);
          return {
            filename: `arena-${stamp}${masked ? "_blind" : ""}.json`,
            data: JSON.stringify(data, null, 2),
          };
        },

        judgeConfig: { ...DEFAULT_JUDGE },

        setJudgeConfig: (patchCfg) =>
          set((st) => ({ judgeConfig: { ...st.judgeConfig, ...patchCfg } })),

        judgeTurn: (turnId) => {
          const s = get().current();
          const cfg = get().judgeConfig;
          const turn = s.turns.find((t) => t.id === turnId);
          if (!turn) return;
          const setJudge = (jv: JudgeView) =>
            patch((sess) => ({
              ...sess,
              turns: sess.turns.map((t) => (t.id !== turnId ? t : { ...t, judge: jv })),
            }));
          const by = `${cfg.provider} · ${cfg.model || "model"}`;

          // anonymize candidates as A/B/C (or blind labels) so the judge isn't biased
          const blindActive = s.blind.enabled && !s.blind.revealed;
          const base = blindActive ? s.blind.order : s.instances.map((i) => i.id);
          const present = Object.keys(turn.responses);
          const ordered = [
            ...base.filter((id) => present.includes(id)),
            ...present.filter((id) => !base.includes(id)),
          ];
          const LETTERS = "ABCDEFGH".split("");
          const candidates: { label: string; text: string }[] = [];
          const mapping: Record<string, string> = {};
          ordered.forEach((id, i) => {
            const r = turn.responses[id];
            if (!r || !r.text || r.error) return;
            const label = blindActive ? s.blind.labels[id] ?? `Model ${LETTERS[i]}` : LETTERS[i];
            candidates.push({ label, text: r.text });
            mapping[label] = id;
          });

          if (!cfg.model) {
            setJudge({ loading: false, mapping, by, error: "Pick a judge model first." });
            return;
          }
          if (candidates.length < 2) {
            setJudge({ loading: false, mapping, by, error: "Need ≥2 completed answers to judge." });
            return;
          }

          setJudge({ loading: true, mapping, by });
          judgeApi({
            prompt: turn.user,
            judge_model: cfg.model,
            provider: cfg.provider,
            api_key: cfg.apiKey || undefined,
            // only the plain OpenAI provider uses a user-set base URL; OpenRouter
            // (and the rest) use the backend's correct default.
            base_url: cfg.provider === "openai" ? cfg.baseUrl || undefined : undefined,
            candidates,
          })
            .then((res) =>
              setJudge({ loading: false, mapping, by, verdicts: res.verdicts, winner: res.winner }),
            )
            .catch((e: unknown) =>
              setJudge({ loading: false, mapping, by, error: String((e as Error).message ?? e) }),
            );
        },
      };
    },
    {
      name: "arena_state_v1",
      partialize: (st) => ({
        sessions: st.sessions,
        currentId: st.currentId,
        judgeConfig: st.judgeConfig,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // clear any stuck streaming flags from a previous run
        state.sessions.forEach((s) =>
          s.turns.forEach((t) =>
            Object.values(t.responses).forEach((r) => (r.streaming = false)),
          ),
        );
        if (!state.currentId || !state.sessions.some((s) => s.id === state.currentId)) {
          state.currentId = state.sessions[0]?.id ?? "";
        }
      },
    },
  ),
);

// Ensure a valid currentId on first load (store starts with one session, empty id).
const s0 = useArena.getState();
if (!s0.currentId && s0.sessions[0]) useArena.setState({ currentId: s0.sessions[0].id });

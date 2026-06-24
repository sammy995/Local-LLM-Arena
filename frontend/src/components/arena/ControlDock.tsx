import { Eraser, Eye, FileDown, Paperclip, Settings2, SlidersHorizontal, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
import { BlindToggle } from "@/components/uiverse/BlindToggle";
import { EmberButton } from "@/components/uiverse/EmberButton";
import { listModels } from "@/lib/api";
import { DEFAULT_HP, hpOf, paramSummary, type Hyperparams } from "@/lib/instance";
import type { ModelInfo, ModelInstance } from "@/lib/types";
import { useArena } from "@/store/arena";

import { HyperparamFields } from "./HyperparamFields";
import { RevealDialog } from "./RevealDialog";

function download(filename: string, data: string) {
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Dialog to add a model with custom hyperparameters (enables multi-config testing).
function AddAdvancedDialog({ models }: { models: ModelInfo[] }) {
  const addInstance = useArena((s) => s.addInstance);
  const [model, setModel] = useState("");
  const [hp, setHp] = useState<Hyperparams>({ ...DEFAULT_HP });
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Tip content="Add a model with custom hyperparameters (or the same model twice with different settings)">
          <Button variant="outline" size="sm" className="gap-1.5">
            <SlidersHorizontal size={14} /> Advanced
          </Button>
        </Tip>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Add model with custom settings</DialogTitle>
        <DialogDescription>
          Same model + different parameters = a separate entry, so you can A/B test
          temperature, top-k, and more.
        </DialogDescription>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="mt-4 h-9 w-full rounded-md border border-input bg-background px-2 font-mono text-sm"
        >
          <option value="">choose a model…</option>
          {models.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
        <div className="mt-4">
          <HyperparamFields value={hp} onChange={setHp} />
        </div>
        <DialogClose asChild>
          <Button
            className="mt-5 w-full"
            disabled={!model}
            onClick={() => model && addInstance(model, hp)}
          >
            Add to arena
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

// Chip with click-to-edit hyperparameters.
function ModelChip({ inst }: { inst: ModelInstance }) {
  const updateInstance = useArena((s) => s.updateInstance);
  const removeInstance = useArena((s) => s.removeInstance);
  const [hp, setHp] = useState<Hyperparams>(hpOf(inst));
  return (
    <span className="inline-flex items-center overflow-hidden rounded-md border border-ember/40 bg-ember/10 font-mono text-xs text-ember">
      <Dialog>
        <DialogTrigger asChild>
          <Tip content="Edit hyperparameters">
            <button className="flex items-center gap-1.5 px-2 py-1 transition-colors hover:bg-ember/20">
              <Settings2 size={11} />
              <span className="font-semibold">{inst.model}</span>
              <span className="text-ember/70">{paramSummary(inst)}</span>
            </button>
          </Tip>
        </DialogTrigger>
        <DialogContent className="w-[min(94vw,460px)]">
          <DialogTitle>{inst.model}</DialogTitle>
          <DialogDescription>Tune this model instance.</DialogDescription>
          <div className="mt-4">
            <HyperparamFields value={hp} onChange={setHp} />
          </div>
          <DialogClose asChild>
            <Button className="mt-5 w-full" onClick={() => updateInstance(inst.id, hp)}>
              Save
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
      <Tip content="Remove from arena">
        <button
          onClick={() => removeInstance(inst.id)}
          className="border-l border-ember/30 px-1.5 py-1.5 transition-colors hover:bg-ember/20"
        >
          <X size={12} />
        </button>
      </Tip>
    </span>
  );
}

export function ControlDock() {
  const sess = useArena((s) => s.current());
  const addInstance = useArena((s) => s.addInstance);
  const setBlind = useArena((s) => s.setBlind);
  const setSystem = useArena((s) => s.setSystem);
  const clearTurns = useArena((s) => s.clearTurns);
  const exportJSON = useArena((s) => s.exportJSON);
  const send = useArena((s) => s.send);
  const stopAll = useArena((s) => s.stopAll);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listModels().then(setModels).catch(() => setModels([]));
  }, []);

  const streaming = sess.turns.some((t) =>
    Object.values(t.responses).some((r) => r.streaming),
  );
  const hasTurns = sess.turns.length > 0;

  const submit = () => {
    if (!input.trim() || sess.instances.length === 0) return;
    send(input, file?.text, file?.name);
    setInput("");
    setFile(null);
  };

  const pickFile = async (f?: File) => {
    if (!f) return;
    setFile({ name: f.name, text: await f.text() });
  };

  return (
    <div className="sticky bottom-0 z-10 border-t border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto w-full max-w-6xl px-4 py-3">
        {models.length === 0 && (
          <p className="mb-2 rounded-md border border-border bg-card px-3 py-1.5 text-center text-xs text-muted-foreground">
            No models installed yet — open <span className="font-semibold">📦 Models</span> (top
            right) to download one, e.g. <span className="font-mono">gemma3:1b</span>.
          </p>
        )}
        {/* model selection row */}
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <Tip content="Add a model with default settings">
            <select
              className="h-8 rounded-md border border-input bg-card px-2 font-mono text-xs"
              value=""
              onChange={(e) => {
                if (e.target.value) addInstance(e.target.value);
                e.currentTarget.value = "";
              }}
            >
              <option value="">+ add model…</option>
              {models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                  {m.params ? ` · ${m.params}` : ""}
                </option>
              ))}
            </select>
          </Tip>
          <AddAdvancedDialog models={models} />

          {sess.instances.map((inst) => (
            <ModelChip key={inst.id} inst={inst} />
          ))}

          <div className="ml-auto flex items-center gap-2">
            <Tip content="Blind mode: hide model names and vote on answers without bias">
              <span className="font-mono text-[0.7rem] text-muted-foreground">blind</span>
            </Tip>
            <BlindToggle checked={sess.blind.enabled} onChange={setBlind} />
            {sess.blind.enabled && hasTurns && (
              <RevealDialog
                trigger={
                  <Tip content="Reveal which model is which + vote tally">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Eye size={14} /> {sess.blind.revealed ? "Results" : "Reveal"}
                    </Button>
                  </Tip>
                }
              />
            )}
          </div>
        </div>

        {/* secondary actions */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <details className="group">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-border bg-card px-2 py-1 font-mono text-[0.7rem] text-muted-foreground transition-colors hover:bg-accent">
              📝 system prompt
            </summary>
            <textarea
              value={sess.system}
              onChange={(e) => setSystem(e.target.value)}
              rows={2}
              className="mt-2 w-full rounded-md border border-input bg-card p-2 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </details>
          <Tip content="Export this comparison as JSON (masked while blind, full after reveal)">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              disabled={!hasTurns}
              onClick={() => {
                const { filename, data } = exportJSON();
                download(filename, data);
              }}
            >
              <FileDown size={14} /> Export
            </Button>
          </Tip>
          <Tip content="Clear all turns in this comparison">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              disabled={!hasTurns}
              onClick={() => window.confirm("Clear this comparison?") && clearTurns()}
            >
              <Eraser size={14} /> Clear
            </Button>
          </Tip>
        </div>

        {/* input row */}
        <div className="flex items-end gap-2 rounded-xl border border-input bg-card p-2">
          <input
            ref={fileRef}
            type="file"
            hidden
            accept=".txt,.md,.csv,.json,.xml,.py,.js,.ts,.tsx,.java,.cpp,.c,.h,.html,.css,.sql,.sh,.yaml,.yml"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <Tip content="Attach a text/code file — its contents are read locally and added to your prompt">
            <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()}>
              <Paperclip size={16} />
            </Button>
          </Tip>
          <div className="flex flex-1 flex-col gap-1">
            {file && (
              <span className="inline-flex w-fit items-center gap-1 rounded bg-ember/10 px-1.5 py-0.5 font-mono text-[0.66rem] text-ember">
                📎 {file.name}
                <button onClick={() => setFile(null)} aria-label="remove file">
                  <X size={11} />
                </button>
              </span>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder={
                sess.instances.length
                  ? "Ask all models one question… (Enter to send, Shift+Enter for newline)"
                  : "Add a model above to start comparing…"
              }
              className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {streaming ? (
            <Tip content="Stop all generations">
              <Button variant="outline" className="gap-1.5" onClick={stopAll}>
                <Square size={14} /> Stop
              </Button>
            </Tip>
          ) : (
            <EmberButton
              onClick={submit}
              disabled={!input.trim() || sess.instances.length === 0}
              icon={<span aria-hidden>➤</span>}
            >
              Compare
            </EmberButton>
          )}
        </div>
        <p className="mt-1.5 text-center text-[0.66rem] text-muted-foreground">
          {sess.instances.length} / 6 models · conversations never leave your machine
        </p>
      </div>
    </div>
  );
}

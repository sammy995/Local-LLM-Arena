import { Download, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tip } from "@/components/ui/tooltip";
import { deleteModel, listModels, pullModel } from "@/lib/api";
import type { ModelInfo } from "@/lib/types";

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  const gb = bytes / 1e9;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`;
}

export function ModelManagerDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = () => listModels().then(setModels).catch(() => setModels([]));
  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const pull = async () => {
    if (!name.trim()) return;
    try {
      await pullModel(name.trim());
      setMsg(`Downloading "${name.trim()}" in the background — hit refresh shortly.`);
      setName("");
    } catch (e) {
      setMsg(String((e as Error).message));
    }
  };

  const remove = async (m: string) => {
    if (!window.confirm(`Delete model "${m}" from disk? This cannot be undone.`)) return;
    try {
      await deleteModel(m);
      setMsg(`Deleted ${m}.`);
      refresh();
    } catch (e) {
      setMsg(String((e as Error).message));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogTitle>Manage Ollama models</DialogTitle>
        <DialogDescription>
          Download or remove local models. Everything stays on your machine.
        </DialogDescription>

        <div className="mt-4 flex gap-2">
          <Tip content="e.g. llama3.2, qwen2.5:3b, gemma3:1b — any tag from ollama.com/library">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && pull()}
              placeholder="model tag to pull…"
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Tip>
          <Button onClick={pull} className="gap-1.5">
            <Download size={15} /> Pull
          </Button>
          <Tip content="Refresh installed list">
            <Button variant="outline" size="icon" onClick={refresh}>
              <RefreshCw size={15} />
            </Button>
          </Tip>
        </div>

        {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}

        <ul className="mt-4 divide-y divide-border/60 rounded-lg border border-border/60">
          {models.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No models found. Pull one above, or check that Ollama is running.
            </li>
          )}
          {models.map((m) => (
            <li key={m.name} className="flex items-center justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm">{m.name}</p>
                <p className="font-mono text-[0.66rem] text-muted-foreground">
                  {[m.params, m.family, fmtSize(m.size)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Tip content="Delete from disk">
                <button
                  onClick={() => remove(m.name)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                >
                  <Trash2 size={15} />
                </button>
              </Tip>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

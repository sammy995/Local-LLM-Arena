import { MessagesSquare, Plus, Trash2 } from "lucide-react";

import { Tip } from "@/components/ui/tooltip";
import { useArena } from "@/store/arena";

export function Sidebar({ open }: { open: boolean }) {
  const sessions = useArena((s) => s.sessions);
  const currentId = useArena((s) => s.currentId);
  const createSession = useArena((s) => s.createSession);
  const switchSession = useArena((s) => s.switchSession);
  const deleteSession = useArena((s) => s.deleteSession);

  return (
    <aside
      className={`${
        open ? "w-60" : "w-0"
      } shrink-0 overflow-hidden border-r border-border/70 bg-card/40 transition-[width] duration-200`}
    >
      <div className="flex h-full w-60 flex-col">
        <div className="flex items-center justify-between px-3 py-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <MessagesSquare size={14} /> Comparisons
          </span>
          <Tip content="Start a new comparison (keeps your selected models)">
            <button
              onClick={createSession}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs transition-colors hover:bg-accent"
            >
              <Plus size={13} /> New
            </button>
          </Tip>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center gap-1 rounded-md px-2 py-2 text-sm transition-colors ${
                s.id === currentId ? "bg-ember/10 text-ember" : "hover:bg-accent"
              }`}
            >
              <button
                onClick={() => switchSession(s.id)}
                className="min-w-0 flex-1 truncate text-left"
                title={s.title}
              >
                {s.title || "Untitled"}
                <span className="ml-1 font-mono text-[0.6rem] text-muted-foreground">
                  {s.instances.length}🤖
                </span>
              </button>
              <Tip content="Delete comparison">
                <button
                  onClick={() => deleteSession(s.id)}
                  className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </Tip>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

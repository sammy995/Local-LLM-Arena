import { Moon, Package, PanelLeft, Sun, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

import { AnvilMark } from "@/components/brand/AnvilMark";
import { ComparisonView } from "@/components/arena/ComparisonView";
import { ControlDock } from "@/components/arena/ControlDock";
import { LeaderboardDialog } from "@/components/arena/LeaderboardDialog";
import { ModelManagerDialog } from "@/components/arena/ModelManagerDialog";
import { Sidebar } from "@/components/arena/Sidebar";
import { Button } from "@/components/ui/button";
import { Tip, TooltipProvider } from "@/components/ui/tooltip";
import { health } from "@/lib/api";
import { useTheme } from "@/lib/useTheme";

export default function App() {
  const { theme, toggle } = useTheme();
  const [online, setOnline] = useState<boolean | null>(null);
  const [sidebar, setSidebar] = useState(true);

  useEffect(() => {
    const ping = () => health().then((h) => setOnline(h.ollama_reachable)).catch(() => setOnline(false));
    ping();
    const t = setInterval(ping, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar open={sidebar} />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="z-20 flex items-center justify-between border-b border-border/70 bg-background/80 px-4 py-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <Tip content={sidebar ? "Hide comparisons" : "Show comparisons"}>
                <Button variant="ghost" size="icon" onClick={() => setSidebar((v) => !v)}>
                  <PanelLeft size={17} />
                </Button>
              </Tip>
              <span className="text-ember">
                <AnvilMark size={28} />
              </span>
              <div className="leading-tight">
                <h1 className="font-display text-base font-extrabold tracking-tight">
                  LOCAL&nbsp;LLM&nbsp;ARENA
                </h1>
                <p className="hidden text-[0.68rem] text-muted-foreground sm:block">
                  Side-by-side local model comparison
                </p>
              </div>
              <Tip content={online ? "Ollama is running" : "Ollama not reachable on :11434"}>
                <span className="ml-1 inline-flex cursor-help items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[0.66rem]">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      online == null
                        ? "bg-muted-foreground"
                        : online
                          ? "bg-[var(--success)]"
                          : "bg-destructive"
                    }`}
                  />
                  {online == null ? "checking" : online ? "ollama up" : "ollama down"}
                </span>
              </Tip>
            </div>
            <div className="flex items-center gap-2">
              <LeaderboardDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Leaderboard"
                    title="Elo leaderboard across all your comparisons (judge + votes)"
                  >
                    <Trophy size={16} />
                  </Button>
                }
              />
              <ModelManagerDialog
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    title="Download or delete Ollama models"
                  >
                    <Package size={15} /> Models
                  </Button>
                }
              />
              <Tip content="Toggle dark / light">
                <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </Button>
              </Tip>
            </div>
          </header>

          {online === false && (
            <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
              Ollama isn&apos;t reachable on <span className="font-mono">localhost:11434</span>.
              Start it (<span className="font-mono">ollama serve</span>) and pull a model — this
              reconnects automatically.
            </div>
          )}

          {/* Comparison area */}
          <main className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <ComparisonView />
            </div>
            <ControlDock />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

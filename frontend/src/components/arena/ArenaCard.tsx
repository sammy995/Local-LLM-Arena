import { Clock, Copy, Crown, Hash, RefreshCw, ThumbsDown, ThumbsUp, Zap } from "lucide-react";
import { useState } from "react";

import { Tip } from "@/components/ui/tooltip";
import { ForgeLoader } from "@/components/uiverse/ForgeLoader";
import type { Response } from "@/store/arena";

import { Markdown } from "./Markdown";

interface ArenaCardProps {
  name: string; // model name (or "Model A" in blind mode)
  sub?: string; // params summary (hidden in blind mode)
  response: Response;
  blind: boolean;
  revealed: boolean;
  fastest: boolean;
  onVote: (v: 1 | -1) => void;
  onRegenerate: () => void;
}

export function ArenaCard({
  name,
  sub,
  response,
  blind,
  revealed,
  fastest,
  onVote,
  onRegenerate,
}: ArenaCardProps) {
  const [copied, setCopied] = useState(false);
  const m = response.metrics;

  const copy = async () => {
    await navigator.clipboard.writeText(response.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <article className="flex flex-col rounded-xl border border-border bg-card shadow-[0_8px_30px_-20px_rgba(0,0,0,0.7)]">
      {/* header: identity + compare metrics */}
      <header className="flex items-center justify-between gap-2 border-b border-border/60 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-sm font-semibold text-ember">{name}</span>
          {fastest && m && (
            <Tip content="Fastest in this round (highest tokens/sec)">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-ember/15 px-1.5 py-0.5 text-[0.6rem] font-bold text-ember">
                <Crown size={10} /> FAST
              </span>
            </Tip>
          )}
        </div>
        {sub && !blind && (
          <Tip content="Hyperparameters for this model instance">
            <span className="cursor-help truncate font-mono text-[0.66rem] text-muted-foreground">
              {sub}
            </span>
          </Tip>
        )}
      </header>

      {/* body */}
      <div className="min-h-[3rem] flex-1 px-3.5 py-3 text-sm">
        {response.error ? (
          <p className="font-mono text-xs text-destructive">⚠ {response.error}</p>
        ) : response.text ? (
          <Markdown>{response.text}</Markdown>
        ) : response.streaming ? (
          <ForgeLoader label="forging…" />
        ) : (
          <p className="text-muted-foreground">—</p>
        )}
        {response.streaming && response.text && (
          <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-ember align-middle" />
        )}
      </div>

      {/* footer: metrics + actions */}
      <footer className="flex items-center justify-between gap-2 border-t border-border/60 px-3.5 py-2">
        <div className="flex items-center gap-3 font-mono text-[0.66rem] text-muted-foreground">
          <Tip content="Generation speed — tokens per second (higher is faster)">
            <span className="inline-flex cursor-help items-center gap-1">
              <Zap size={11} /> {m ? `${m.tokens_per_sec}` : "—"}
            </span>
          </Tip>
          <Tip content="Time to first token (latency)">
            <span className="inline-flex cursor-help items-center gap-1">
              <Clock size={11} /> {m?.first_token_s != null ? `${m.first_token_s}s` : "—"}
            </span>
          </Tip>
          <Tip content="Total tokens generated">
            <span className="inline-flex cursor-help items-center gap-1">
              <Hash size={11} /> {m ? m.eval_tokens : "—"}
            </span>
          </Tip>
        </div>
        <div className="flex items-center gap-1">
          {blind && (
            <>
              <Tip content={revealed ? "Voting locked after reveal" : "Best answer"}>
                <button
                  onClick={() => onVote(1)}
                  disabled={revealed}
                  className={`rounded p-1 transition-colors hover:bg-accent disabled:opacity-40 ${
                    response.vote === 1 ? "text-[var(--success)]" : "text-muted-foreground"
                  }`}
                >
                  <ThumbsUp size={13} />
                </button>
              </Tip>
              <Tip content={revealed ? "Voting locked after reveal" : "Weak answer"}>
                <button
                  onClick={() => onVote(-1)}
                  disabled={revealed}
                  className={`rounded p-1 transition-colors hover:bg-accent disabled:opacity-40 ${
                    response.vote === -1 ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  <ThumbsDown size={13} />
                </button>
              </Tip>
            </>
          )}
          <Tip content={copied ? "Copied!" : "Copy response"}>
            <button
              onClick={copy}
              disabled={!response.text}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
            >
              <Copy size={13} />
            </button>
          </Tip>
          <Tip content="Regenerate this model's answer">
            <button
              onClick={onRegenerate}
              disabled={response.streaming}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
            >
              <RefreshCw size={13} />
            </button>
          </Tip>
        </div>
      </footer>
    </article>
  );
}

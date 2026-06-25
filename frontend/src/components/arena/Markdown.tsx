import { lazy, Suspense } from "react";

// Heavy renderer (react-markdown + highlight.js) is split into its own async chunk.
// Until it loads, show the raw text wrapped — streaming stays readable with zero blank
// flash, and the first model response is what triggers the (one-time) chunk fetch.
const MarkdownInner = lazy(() => import("./MarkdownInner"));

export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <Suspense fallback={<div className="whitespace-pre-wrap break-words">{children}</div>}>
        <MarkdownInner>{children}</MarkdownInner>
      </Suspense>
    </div>
  );
}

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

// react-markdown sanitizes by default (no raw HTML) — replaces the old app's 69
// unsanitized innerHTML writes. remark-gfm = tables/lists; rehype-highlight = code.
// This module pulls in highlight.js (~hundreds of KB), so it is loaded lazily by
// ./Markdown.tsx and kept out of the initial bundle.
export default function MarkdownInner({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
      {children}
    </ReactMarkdown>
  );
}

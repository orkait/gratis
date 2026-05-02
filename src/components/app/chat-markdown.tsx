"use client";
import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        h1: ({ children }) => <h1 className="text-[15px] font-semibold mt-3 mb-1.5 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-[14px] font-semibold mt-3 mb-1.5 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-[13px] font-semibold mt-2 mb-1 first:mt-0">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-(--color-accent) underline underline-offset-2 hover:opacity-85">{children}</a>
        ),
        strong: ({ children }) => <strong className="font-semibold text-(--color-fg)">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        hr: () => <hr className="my-3 border-t border-(--color-border)" />,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-(--color-accent) pl-3 my-2 text-(--color-fg-muted)">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="border-collapse text-[12px]">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-(--color-border) px-2 py-1 text-left font-semibold bg-(--color-surface-2)">{children}</th>,
        td: ({ children }) => <td className="border border-(--color-border) px-2 py-1">{children}</td>,
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || "");
          const text = String(children).replace(/\n$/, "");
          if (!match) {
            return <code className="bg-(--color-surface-2) px-1 py-0.5 rounded text-[12px] font-mono">{children}</code>;
          }
          return <CodeBlock language={match[1]} code={text} {...(props as object)} />;
        },
        pre: ({ children }) => <>{children}</>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }): ReactNode {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  return (
    <div className="my-2 rounded-md border border-(--color-border) bg-(--color-surface-2) overflow-hidden">
      <div className="h-7 px-3 flex items-center justify-between border-b border-(--color-border)">
        <span className="text-[10px] uppercase tracking-wider text-(--color-fg-subtle) font-mono">{language}</span>
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            "h-5 px-1.5 rounded inline-flex items-center gap-1 text-[10px] font-mono cursor-pointer transition-colors duration-[120ms]",
            copied ? "text-(--color-success)" : "text-(--color-fg-muted) hover:text-(--color-fg) hover:bg-(--color-surface-3)",
          )}
        >
          {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="px-3 py-2.5 overflow-x-auto text-[12px] font-mono leading-relaxed text-(--color-fg)">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
}

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";

import "highlight.js/styles/github-dark.css";

export default function MarkdownRenderer({
  content,
  inline = false,
}: {
  content: string;
  inline?: boolean;
}) {
  return (
    <ReactMarkdown
      className={`space-y-4 ${inline ? "inline" : "block"}`}
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        pre: ({ children }) => (
          <pre className="mx-auto overflow-x-auto p-4 bg-gray-800 rounded w-[80vw] max-w-full sm:max-w-[36rem] lg:max-w-[45rem">
            {children}
          </pre>
        ),
        code: ({ children }) => <code className="text-xs">{children}</code>,
        ul({ children }) {
          return <ul className="list-disc pl-5">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal pl-5">{children}</ol>;
        },
        li({ children }) {
          return <li className="mb-1">{children}</li>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

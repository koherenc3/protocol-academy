import type { MDXComponents } from "mdx/types";

// Required by @next/mdx for the App Router. Lets us style MDX prose and
// inject custom components into educational content if needed later.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Fenced code blocks get terminal-window chrome (dots) to match the
    // payload viewers, instead of the default Tailwind Typography <pre>.
    pre: ({ children, ...props }) => (
      <div className="not-prose overflow-hidden rounded-md border border-term-border bg-term-bg">
        <div className="flex gap-1.5 border-b border-term-border bg-term-panel/80 px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-term-red/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-term-amber/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-term-green/60" />
        </div>
        <pre
          {...props}
          className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-term-fg"
        >
          {children}
        </pre>
      </div>
    ),
    ...components,
  };
}

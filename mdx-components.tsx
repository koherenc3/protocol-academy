import type { MDXComponents } from "mdx/types";

// Required by @next/mdx for the App Router. Lets us style MDX prose and
// inject custom components into educational content if needed later.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Fenced code blocks get terminal-window chrome (dots) to match the
    // payload viewers, instead of the default Tailwind Typography <pre>.
    pre: ({ children, ...props }) => (
      <div className="not-prose overflow-hidden rounded-md border border-slate-700/60 bg-slate-950">
        <div className="flex gap-1.5 border-b border-slate-800 bg-slate-900/80 px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
        </div>
        <pre
          {...props}
          className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-slate-200"
        >
          {children}
        </pre>
      </div>
    ),
    ...components,
  };
}

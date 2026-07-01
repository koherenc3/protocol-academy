import type { ReactNode } from "react";

/**
 * Terminal-window chrome (dots + titlebar) wrapped around payload/code panels
 * so protocol wire data reads like an actual shell session, not a plain card.
 */
export function TerminalFrame({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-700/60 bg-slate-950">
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/80 px-3 py-1.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
        </span>
        {title && (
          <span className="truncate font-mono text-[11px] text-slate-500">
            {title}
          </span>
        )}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

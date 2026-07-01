interface AnnotationItem {
  target: string;
  note: string;
}

/** Shared "callout" list rendered beneath a payload to explain key fields. */
export function Annotations({ items }: { items?: AnnotationItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <dl className="mt-3 space-y-2 text-sm">
      {items.map((a, i) => (
        <div
          key={i}
          className="rounded-md border border-slate-700/60 border-l-2 border-l-emerald-500/60 bg-slate-900/40 p-2"
        >
          <dt className="font-mono text-xs font-semibold text-amber-300">
            <span className="text-slate-600">{"// "}</span>
            {a.target}
          </dt>
          <dd className="mt-0.5 text-slate-300">{a.note}</dd>
        </div>
      ))}
    </dl>
  );
}

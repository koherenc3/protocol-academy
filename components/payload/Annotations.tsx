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
          className="rounded-md border border-term-border border-l-2 border-l-term-green/60 bg-term-panel/40 p-2"
        >
          <dt className="font-mono text-xs font-semibold text-term-amber">
            <span className="text-term-dim">{"// "}</span>
            {a.target}
          </dt>
          <dd className="mt-0.5 text-term-fg/80">{a.note}</dd>
        </div>
      ))}
    </dl>
  );
}

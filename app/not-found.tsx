import Link from "next/link";

export default function NotFound() {
  return (
    <div className="term-panel mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center">
      <p className="font-display text-6xl tracking-wide text-term-red text-glow">
        404
      </p>
      <p className="mt-2 text-xs text-term-dim">
        <span className="text-term-red">error:</span> segmentation fault
        (route not found)
      </p>
      <h1 className="mt-4 text-lg font-semibold text-term-fg">
        That flow doesn&apos;t exist (yet)
      </h1>
      <p className="mt-2 max-w-md text-sm text-term-fg/70">
        The protocol or flow you&apos;re looking for couldn&apos;t be found. It may
        have moved, or be one we haven&apos;t added.
      </p>
      <Link
        href="/"
        className="term-bracket mt-6 border border-term-green px-4 py-2 text-sm font-semibold text-term-green hover:bg-term-green hover:text-term-bg"
      >
        ← cd / back to all protocols
      </Link>
    </div>
  );
}

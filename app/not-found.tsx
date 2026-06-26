import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-5xl font-bold text-amber-400">404</p>
      <h1 className="mt-3 text-xl font-semibold text-slate-100">
        That flow doesn&apos;t exist (yet)
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        The protocol or flow you&apos;re looking for couldn&apos;t be found. It may
        have moved, or be one we haven&apos;t added.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300"
      >
        ← Back to all protocols
      </Link>
    </div>
  );
}

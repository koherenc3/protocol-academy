import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.name,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    title: SITE.name,
    description: SITE.description,
    siteName: SITE.name,
    type: "website",
    url: SITE.url,
  },
  twitter: {
    card: "summary",
    title: SITE.name,
    description: SITE.description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <span className="text-amber-400">⚿</span>
                <span className="text-slate-100">{SITE.name}</span>
              </Link>
              <a
                href={SITE.newFlowUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Contribute a flow →
              </a>
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
            {children}
          </main>

          <footer className="border-t border-slate-800/80 px-4 py-6 text-center text-xs text-slate-500">
            Educational reference. Payloads are illustrative, not live credentials.
            {" · "}
            <a
              href={SITE.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300"
            >
              Source on GitHub
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { JetBrains_Mono, VT323 } from "next/font/google";
import Link from "next/link";
import { SITE } from "@/lib/site";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const vt323 = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

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
    <html lang="en" className={`${jetbrainsMono.variable} ${vt323.variable}`}>
      <body className="font-mono">
        <div className="crt-overlay" aria-hidden="true" />
        <div className="crt-vignette" aria-hidden="true" />
        <div className="flex min-h-screen flex-col bg-term-grid bg-[length:32px_32px]">
          <header className="sticky top-0 z-40 border-b border-term-border bg-term-bg/90 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
              <Link
                href="/"
                className="group flex items-center gap-2 text-sm"
              >
                <span className="text-term-green">$</span>
                <span className="text-term-fg">
                  whoami{" "}
                  <span className="text-term-dim">&gt;</span>{" "}
                  <span className="font-semibold text-term-green group-hover:text-glow">
                    {SITE.name}
                  </span>
                </span>
                <span className="ml-0.5 inline-block h-3.5 w-2 bg-term-green animate-caret" />
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/about"
                  className="term-bracket border border-term-border px-2 py-1 text-xs text-term-dim hover:border-term-cyan hover:text-term-cyan"
                >
                  [?] why this exists
                </Link>
                <a
                  href={SITE.newFlowUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="term-bracket border border-term-border px-2 py-1 text-xs text-term-dim hover:border-term-green hover:text-term-green"
                >
                  [+] contribute a flow
                </a>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
            {children}
          </main>

          <footer className="border-t border-term-border px-4 py-6 text-center text-xs text-term-dim">
            <span className="text-term-green-dim">#</span> educational
            reference &mdash; payloads are illustrative, not live credentials
            {" "}
            <span className="mx-2 text-term-border-bright">|</span>
            <a
              href={SITE.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-term-dim hover:text-term-amber"
            >
              source on github
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}

import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,md,mdx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{ts,tsx,md,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Actor lane / payload accent palette, referenced by role in components.
        actor: {
          user: "#34d399",
          browser: "#60a5fa",
          client: "#a78bfa",
          authServer: "#f59e0b",
          resourceServer: "#f472b6",
          system: "#94a3b8",
        },
        // Site-wide terminal palette. Available to every page via bg-term-*,
        // text-term-*, border-term-* etc. Kept separate from `actor` so the
        // flow/payload diagrams' color contract is untouched.
        term: {
          bg: "#05070a",
          panel: "#0a0f14",
          "panel-raised": "#0e1620",
          border: "#1c2b2f",
          "border-bright": "#2f4f4a",
          fg: "#c9d6d0",
          dim: "#5c7570",
          green: "#39ff88",
          "green-dim": "#1f9e58",
          amber: "#ffb32c",
          cyan: "#4ce8ff",
          magenta: "#ff5fd1",
          red: "#ff5c5c",
        },
      },
      fontFamily: {
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
        display: ["var(--font-display)", "var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        scanlines:
          "repeating-linear-gradient(to bottom, rgba(57,255,136,0.05) 0px, rgba(57,255,136,0.05) 1px, transparent 1px, transparent 3px)",
        "term-grid":
          "linear-gradient(rgba(57,255,136,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,136,0.06) 1px, transparent 1px)",
      },
      backgroundSize: {
        "term-grid": "32px 32px",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(57,255,136,0.4), 0 0 18px rgba(57,255,136,0.25)",
        "glow-amber": "0 0 0 1px rgba(255,179,44,0.4), 0 0 18px rgba(255,179,44,0.25)",
      },
      keyframes: {
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "92%": { opacity: "1" },
          "93%": { opacity: "0.85" },
          "94%": { opacity: "1" },
        },
      },
      animation: {
        caret: "blink 1s step-end infinite",
        flicker: "flicker 6s linear infinite",
      },
    },
  },
  plugins: [typography],
};

export default config;

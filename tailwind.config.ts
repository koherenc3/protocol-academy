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
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [typography],
};

export default config;

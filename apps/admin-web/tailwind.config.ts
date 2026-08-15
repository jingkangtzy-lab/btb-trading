import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#080B14",
        panel: "#111827",
        "panel-raised": "#161F32",
        hairline: "#232C3E",
        gold: "#C9A227",
        "gold-dim": "#8A7220",
        ink: "#F4F5F7",
        muted: "#8892A0",
        gain: "#16A34A",
        loss: "#DC2626",
        rust: "#B5533C",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontFeatureSettings: {
        tabular: '"tnum" 1',
      },
    },
  },
  plugins: [],
};
export default config;

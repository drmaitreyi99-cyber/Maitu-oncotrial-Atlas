import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        muted: "var(--muted)",
        surface: "var(--surface)",
        canvas: "var(--canvas)",
        lavender: "var(--lavender)",
        line: "var(--line)",
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 18px 50px -28px rgba(76, 29, 149, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;

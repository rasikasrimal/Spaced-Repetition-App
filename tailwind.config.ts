import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "var(--font-inter)", "system-ui", "sans-serif"]
      },
      colors: {
        surface: {
          DEFAULT: "#0f172a",
          foreground: "#f8fafc"
        },
        accent: {
          DEFAULT: "#38bdf8",
          foreground: "#0f172a"
        },
        border: "#1f2937",
        muted: "#1e293b",
        card: {
          DEFAULT: "#111827",
          foreground: "#f8fafc"
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;

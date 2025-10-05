import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/styles/**/*.{js,ts,jsx,tsx,mdx,css}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "var(--font-inter)", "system-ui", "sans-serif"]
      },
      colors: {
        bg: "hsl(var(--bg))",
        fg: "hsl(var(--fg))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        grid: "hsl(var(--grid))",
        axis: "hsl(var(--axis))",
        success: "hsl(var(--success))",
        warn: "hsl(var(--warn))",
        error: "hsl(var(--error))",
        overlay: "hsl(var(--overlay))",
        "overlay-foreground": "hsl(var(--overlay-foreground))",
        inverse: "hsl(var(--inverse))",
        "inverse-foreground": "hsl(var(--inverse-foreground))"
      },
      borderColor: {
        DEFAULT: "hsl(var(--border))"
      },
      textColor: {
        DEFAULT: "hsl(var(--fg))"
      },
      backgroundColor: {
        DEFAULT: "hsl(var(--bg))"
      },
      ringColor: {
        DEFAULT: "hsl(var(--ring))"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;

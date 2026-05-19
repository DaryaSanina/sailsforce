/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1E293B",
          soft: "#64748B",
          faint: "#94A3B8",
          hair: "#CBD5E1",
        },
        line: {
          DEFAULT: "#E2E8F0",
          soft: "#F1F5F9",
        },
        surface: "#F8FAFC",
        accent: {
          DEFAULT: "#0F766E",
          light: "#CCFBF1",
        },
        mint: "#7CB3B5",
        info: "#3B82F6",
        indigo: "#1E3A8A",
        good: "#22C55E",
        warn: "#F59E0B",
        warnSoft: "#EAB308",
        bad: "#EF4444",
        sun: "#FBBF24",
        sky: "#0EA5E9",
      },
      borderRadius: {
        card: "16px",
      },
      fontFamily: {
        sans: ["Manrope", "Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

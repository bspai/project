import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand
        brand: {
          50:  "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d6fe",
          300: "#a4b8fc",
          400: "#7d8ef8",
          500: "#5c62f1",
          600: "#4543e5",
          700: "#3a35cb",
          800: "#302da4",
          900: "#2c2c82",
          950: "#1a1a4e",
        },
        // Accent
        accent: {
          50:  "#fff8ed",
          100: "#ffefd3",
          200: "#ffdba5",
          300: "#ffc06d",
          400: "#ff9932",
          500: "#ff7c0a",
          600: "#f05f00",
          700: "#c74502",
          800: "#9e360b",
          900: "#7f2e0c",
        },
        // Neutral
        surface: {
          0:   "#ffffff",
          50:  "#f8f8fc",
          100: "#f0f0f8",
          200: "#e4e4f0",
          300: "#d0d0e4",
          400: "#a8a8c8",
          500: "#7878a0",
          600: "#555578",
          700: "#3c3c58",
          800: "#28283c",
          900: "#181828",
          950: "#0e0e1a",
        },
        // Semantic
        success: { light: "#d1fae5", DEFAULT: "#10b981", dark: "#065f46" },
        warning: { light: "#fef3c7", DEFAULT: "#f59e0b", dark: "#92400e" },
        danger:  { light: "#fee2e2", DEFAULT: "#ef4444", dark: "#991b1b" },
        info:    { light: "#dbeafe", DEFAULT: "#3b82f6", dark: "#1e3a8a" },
        // Diff colours
        diff: {
          addBg:    "#d1fae5",
          addText:  "#065f46",
          delBg:    "#fee2e2",
          delText:  "#991b1b",
        },
      },
      fontFamily: {
        sans:    ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card:  "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        panel: "0 4px 24px -4px rgb(0 0 0 / 0.10), 0 2px 8px -2px rgb(0 0 0 / 0.06)",
        lift:  "0 12px 40px -8px rgb(92 98 241 / 0.24)",
      },
      animation: {
        "fade-in":    "fadeIn 0.3s ease forwards",
        "slide-up":   "slideUp 0.3s ease forwards",
        "slide-down": "slideDown 0.2s ease forwards",
        "spin-slow":  "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: "0" },                      to: { opacity: "1" } },
        slideUp:   { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideDown: { from: { opacity: "0", transform: "translateY(-8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};

export default config;

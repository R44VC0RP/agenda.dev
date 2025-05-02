import type { Config } from "tailwindcss"
import animatePlugin from "tailwindcss-animate"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        "shine": "shine var(--duration) cubic-bezier(0.4, 0, 0.2, 1) infinite",
        "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
        "pulse-subtle": "pulse-subtle 3s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "slide-up": "slide-up 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
        "slide-down": "slide-down 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
        "slide-in-right": "slide-in-right 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
        "slide-in-left": "slide-in-left 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both",
      },
      keyframes: {
        shine: {
          "0%": { backgroundPosition: "150% 150%" },
          "100%": { backgroundPosition: "-50% -50%" },
        },
        "border-beam": {
          "0%": { backgroundPosition: "0% 0%" },
          "50%": { backgroundPosition: "100% 0%" },
          "100%": { backgroundPosition: "0% 0%" },
        },
        "pulse-subtle": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)" },
        },
        "float": {
          "0%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
          "100%": { transform: "translateY(0px)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        "red-450": "#f05c5c",
        "red-550": "#dc3c3c",
        "red-650": "#c52d2d",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  darkMode: ["class"],
  plugins: [
    animatePlugin,
    function({ addUtilities }) {
      const newUtilities = {
        '.mb-safe-keyboard': {
          'padding-bottom': 'env(safe-area-inset-bottom)',
        },
        '.pt-safe': {
          'padding-top': 'env(safe-area-inset-top)',
        },
      }
      addUtilities(newUtilities)
    },
  ],
}

export default config

/**
 * tailwind-styled-v4 — Default Preset
 *
 * Tailwind config built-in yang dipakai ketika developer tidak punya
 * tailwind.config.ts / tailwind.config.js di project mereka.
 *
 * Developer tidak perlu setup apapun:
 *   npm install tailwind-styled-v4
 *   → langsung bisa tw.div`p-4 bg-blue-500`
 *
 * Preset ini juga menyediakan design tokens yang consistent
 * untuk semua project yang pakai tailwind-styled-v4.
 *
 * Override per-project:
 *   // tailwind.config.ts
 *   import { defaultPreset } from "tailwind-styled-v4/preset"
 *   export default { presets: [defaultPreset], theme: { extend: {...} } }
 */

// ─────────────────────────────────────────────────────────────────────────────
// Content paths — auto-detect berdasarkan project structure
// ─────────────────────────────────────────────────────────────────────────────

const STANDARD_CONTENT_PATHS = [
  // Next.js App Router
  "./src/**/*.{tsx,ts,jsx,js,mdx}",
  "./app/**/*.{tsx,ts,jsx,js,mdx}",
  "./pages/**/*.{tsx,ts,jsx,js,mdx}",
  "./components/**/*.{tsx,ts,jsx,js,mdx}",
  // Vite / React
  "./src/**/*.{tsx,ts,jsx,js}",
  "./index.html",
  // Monorepo
  "../../packages/**/src/**/*.{tsx,ts,jsx,js}",
]

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — consistent across all tailwind-styled-v4 projects
// ─────────────────────────────────────────────────────────────────────────────

export const designTokens = {
  colors: {
    primary: { DEFAULT: "#3b82f6", hover: "#2563eb", active: "#1d4ed8", foreground: "#ffffff" },
    secondary: { DEFAULT: "#6366f1", hover: "#4f46e5", active: "#4338ca", foreground: "#ffffff" },
    accent: { DEFAULT: "#f59e0b", hover: "#d97706", active: "#b45309", foreground: "#000000" },
    success: { DEFAULT: "#10b981", foreground: "#ffffff" },
    warning: { DEFAULT: "#f59e0b", foreground: "#000000" },
    danger: { DEFAULT: "#ef4444", foreground: "#ffffff" },
    info: { DEFAULT: "#3b82f6", foreground: "#ffffff" },
    surface: "#18181b",
    border: "#27272a",
    muted: "#71717a",
    subtle: "#3f3f46",
  },

  spacing: {
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    8: "2rem",
    10: "2.5rem",
    12: "3rem",
    16: "4rem",
  },

  breakpoints: {
    sm: "40rem",
    md: "48rem",
    lg: "64rem",
    xl: "80rem",
    "2xl": "96rem",
  },

  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },

  fontFamily: {
    sans: ["InterVariable", "Inter", "system-ui", "sans-serif"],
    mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
  },

  borderRadius: {
    sm: "0.25rem",
    DEFAULT: "0.5rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    "2xl": "1.5rem",
    full: "9999px",
  },

  animation: {
    "fade-in": "fadeIn 0.2s ease-out",
    "fade-out": "fadeOut 0.2s ease-in",
    "slide-up": "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    "slide-down": "slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    "scale-in": "scaleIn 0.2s ease-out",
  },

  keyframes: {
    fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
    fadeOut: { from: { opacity: "1" }, to: { opacity: "0" } },
    slideUp: {
      from: { transform: "translateY(8px)", opacity: "0" },
      to: { transform: "translateY(0)", opacity: "1" },
    },
    slideDown: {
      from: { transform: "translateY(-8px)", opacity: "0" },
      to: { transform: "translateY(0)", opacity: "1" },
    },
    scaleIn: {
      from: { transform: "scale(0.95)", opacity: "0" },
      to: { transform: "scale(1)", opacity: "1" },
    },
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Default Tailwind Config — dipakai sebagai fallback + preset
// ─────────────────────────────────────────────────────────────────────────────

export const defaultPreset = {
  content: STANDARD_CONTENT_PATHS,

  darkMode: "class" as const,

  theme: {
    extend: {
      colors: designTokens.colors,
      fontFamily: designTokens.fontFamily,
      borderRadius: designTokens.borderRadius,
      animation: designTokens.animation,
      keyframes: designTokens.keyframes,
    },
  },

  plugins: [],
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Theme CSS — Tailwind v4 @theme block
// ─────────────────────────────────────────────────────────────────────────────

export const defaultThemeCss = `@import "tailwindcss";

@theme {
  /* colors */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-active: #1d4ed8;
  --color-primary-foreground: #ffffff;
  --color-secondary: #6366f1;
  --color-secondary-hover: #4f46e5;
  --color-secondary-active: #4338ca;
  --color-secondary-foreground: #ffffff;
  --color-accent: #f59e0b;
  --color-accent-hover: #d97706;
  --color-accent-active: #b45309;
  --color-accent-foreground: #000000;
  --color-success: #10b981;
  --color-success-foreground: #ffffff;
  --color-warning: #f59e0b;
  --color-warning-foreground: #000000;
  --color-danger: #ef4444;
  --color-danger-foreground: #ffffff;
  --color-info: #3b82f6;
  --color-info-foreground: #ffffff;
  --color-surface: #18181b;
  --color-border: #27272a;
  --color-muted: #71717a;
  --color-subtle: #3f3f46;

  /* fonts */
  --font-sans: InterVariable, Inter, system-ui, sans-serif;
  --font-mono: JetBrains Mono, Fira Code, Consolas, monospace;

  /* spacing */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-5: 1.25rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-10: 2.5rem;
  --spacing-12: 3rem;
  --spacing-16: 4rem;

  /* breakpoints */
  --breakpoint-sm: 40rem;
  --breakpoint-md: 48rem;
  --breakpoint-lg: 64rem;
  --breakpoint-xl: 80rem;
  --breakpoint-2xl: 96rem;

  /* border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  --radius-full: 9999px;

  /* animations */
  --animate-fade-in: fadeIn 0.2s ease-out;
  --animate-fade-out: fadeOut 0.2s ease-in;
  --animate-slide-up: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  --animate-slide-down: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  --animate-scale-in: scaleIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
@keyframes slideUp {
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes slideDown {
  from { transform: translateY(-8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}`

// ─────────────────────────────────────────────────────────────────────────────
// Zero-config globals.css — tidak perlu @tailwind base dll
// ─────────────────────────────────────────────────────────────────────────────

export const defaultGlobalCss = `@import "tailwindcss";

@theme {
  /* colors */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-active: #1d4ed8;
  --color-primary-foreground: #ffffff;
  --color-secondary: #6366f1;
  --color-secondary-hover: #4f46e5;
  --color-secondary-active: #4338ca;
  --color-secondary-foreground: #ffffff;
  --color-accent: #f59e0b;
  --color-accent-hover: #d97706;
  --color-accent-active: #b45309;
  --color-accent-foreground: #000000;
  --color-success: #10b981;
  --color-success-foreground: #ffffff;
  --color-warning: #f59e0b;
  --color-warning-foreground: #000000;
  --color-danger: #ef4444;
  --color-danger-foreground: #ffffff;
  --color-info: #3b82f6;
  --color-info-foreground: #ffffff;
  --color-surface: #18181b;
  --color-border: #27272a;
  --color-muted: #71717a;
  --color-subtle: #3f3f46;

  /* fonts */
  --font-sans: InterVariable, Inter, system-ui, sans-serif;
  --font-mono: JetBrains Mono, Fira Code, Consolas, monospace;

  /* spacing */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-5: 1.25rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-10: 2.5rem;
  --spacing-12: 3rem;
  --spacing-16: 4rem;

  /* breakpoints */
  --breakpoint-sm: 40rem;
  --breakpoint-md: 48rem;
  --breakpoint-lg: 64rem;
  --breakpoint-xl: 80rem;
  --breakpoint-2xl: 96rem;

  /* border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  --radius-full: 9999px;

  /* animations */
  --animate-fade-in: fadeIn 0.2s ease-out;
  --animate-fade-out: fadeOut 0.2s ease-in;
  --animate-slide-up: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  --animate-slide-down: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  --animate-scale-in: scaleIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
@keyframes slideUp {
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes slideDown {
  from { transform: translateY(-8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* tailwind-styled-v4 — zero-config base styles */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

body {
  margin: 0;
  font-family: var(--font-sans, system-ui, sans-serif);
  background: var(--color-surface, #18181b);
  color: var(--color-foreground, #fafafa);
}
`

// ─────────────────────────────────────────────────────────────────────────────
// Zero-config Tailwind v4 CSS generator
// Dipakai oleh CLI dan withTailwindStyled saat tidak ada user config
// ─────────────────────────────────────────────────────────────────────────────

export function generateTailwindCss(contentPaths = STANDARD_CONTENT_PATHS): string {
  return `@import "tailwindcss";

@theme {
  /* colors */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-active: #1d4ed8;
  --color-primary-foreground: #ffffff;
  --color-secondary: #6366f1;
  --color-secondary-hover: #4f46e5;
  --color-secondary-active: #4338ca;
  --color-secondary-foreground: #ffffff;
  --color-accent: #f59e0b;
  --color-accent-hover: #d97706;
  --color-accent-active: #b45309;
  --color-accent-foreground: #000000;
  --color-success: #10b981;
  --color-success-foreground: #ffffff;
  --color-warning: #f59e0b;
  --color-warning-foreground: #000000;
  --color-danger: #ef4444;
  --color-danger-foreground: #ffffff;
  --color-info: #3b82f6;
  --color-info-foreground: #ffffff;
  --color-surface: #18181b;
  --color-border: #27272a;
  --color-muted: #71717a;
  --color-subtle: #3f3f46;

  /* fonts */
  --font-sans: InterVariable, Inter, system-ui, sans-serif;
  --font-mono: JetBrains Mono, Fira Code, Consolas, monospace;

  /* spacing */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-5: 1.25rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-10: 2.5rem;
  --spacing-12: 3rem;
  --spacing-16: 4rem;

  /* breakpoints */
  --breakpoint-sm: 40rem;
  --breakpoint-md: 48rem;
  --breakpoint-lg: 64rem;
  --breakpoint-xl: 80rem;
  --breakpoint-2xl: 96rem;

  /* border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  --radius-full: 9999px;

  /* animations */
  --animate-fade-in: fadeIn 0.2s ease-out;
  --animate-fade-out: fadeOut 0.2s ease-in;
  --animate-slide-up: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  --animate-slide-down: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  --animate-scale-in: scaleIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
@keyframes slideUp {
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes slideDown {
  from { transform: translateY(-8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@source ${contentPaths.join("\n@source ")}
`
}

// ─────────────────────────────────────────────────────────────────────────────
// Zero-config tailwind.config.ts generator
// DEPRECATED: Use generateTailwindCss for Tailwind v4 instead
// Dipakai oleh CLI dan withTailwindStyled saat tidak ada user config
// ─────────────────────────────────────────────────────────────────────────────

export function generateTailwindConfig(
  safelistPath = ".tailwind-styled-safelist.json",
  contentPaths = STANDARD_CONTENT_PATHS
): string {
  return `import type { Config } from "tailwindcss"
import { defaultPreset } from "tailwind-styled-v4/preset"

// Auto-generated safelist dari tailwind-styled-v4 compiler
const safelist = (() => {
  try { return require(${JSON.stringify(safelistPath)}) as string[] }
  catch { return [] }
})()

export default {
  presets: [defaultPreset],
  content: ${JSON.stringify(contentPaths, null, 2)},
  safelist,
} satisfies Config
`
}

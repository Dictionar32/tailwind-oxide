"use client";

import { useMemo, useState } from "react";

const tokenPresets = {
  light: {
    label: "Light",
    vars: {
      "--background": "#f5f7fb",
      "--foreground": "#111827",
      "--surface": "#ffffff",
      "--surface-muted": "#eef2ff",
      "--accent": "#2563eb",
      "--accent-contrast": "#eff6ff",
    },
  },
  dark: {
    label: "Dark",
    vars: {
      "--background": "#070b16",
      "--foreground": "#e5e7eb",
      "--surface": "#0f172a",
      "--surface-muted": "#111b34",
      "--accent": "#60a5fa",
      "--accent-contrast": "#0b1220",
    },
  },
} as const;

type ThemeMode = keyof typeof tokenPresets;

function applyTokens(theme: ThemeMode) {
  const vars = tokenPresets[theme].vars;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function ThemeAndCartControls() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [cart, setCart] = useState(0);
  const nextTheme = useMemo<ThemeMode>(() => (theme === "light" ? "dark" : "light"), [theme]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => {
          const next = nextTheme;
          setTheme(next);
          applyTokens(next);
        }}
        className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
      >
        Switch to {tokenPresets[nextTheme].label}
      </button>

      <button
        type="button"
        onClick={() => setCart((count) => count + 1)}
        className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Add to cart ({cart})
      </button>
    </div>
  );
}

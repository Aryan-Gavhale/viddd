import { default as flattenColorPalette } from "tailwindcss/lib/util/flattenColorPalette";

/**
 * Accent-aware palette.
 *
 * The codebase uses `bg-violet-*`, `text-violet-*`, `border-violet-*`
 * and `ring-violet-*` everywhere as the brand accent. Rather than
 * editing every component, we redirect the entire `violet` ramp to a
 * set of CSS custom properties (`--accent-50` … `--accent-950`) defined
 * in `src/styles/accents.css`. The `<html data-accent="...">`
 * attribute (set by `AppearanceProvider`) swaps the values, which
 * recolours every `bg-violet-*` utility instantly.
 *
 * `accent-*` utilities are an alias of the same vars so new code can
 * opt in to a more semantic class name.
 */
const accentPalette = {
  50: "rgb(var(--accent-50) / <alpha-value>)",
  100: "rgb(var(--accent-100) / <alpha-value>)",
  200: "rgb(var(--accent-200) / <alpha-value>)",
  300: "rgb(var(--accent-300) / <alpha-value>)",
  400: "rgb(var(--accent-400) / <alpha-value>)",
  500: "rgb(var(--accent-500) / <alpha-value>)",
  600: "rgb(var(--accent-600) / <alpha-value>)",
  700: "rgb(var(--accent-700) / <alpha-value>)",
  800: "rgb(var(--accent-800) / <alpha-value>)",
  900: "rgb(var(--accent-900) / <alpha-value>)",
  950: "rgb(var(--accent-950) / <alpha-value>)",
  DEFAULT: "rgb(var(--accent-600) / <alpha-value>)",
};

/** @type {import('tailwindcss').Config} */
export const content = ["./src/**/*.{ts,tsx,js,jsx}"];
export const darkMode = "class";
export const theme = {
  extend: {
    colors: {
      violet: accentPalette,
      accent: accentPalette,
    },
  },
};
export const plugins = [addVariablesForColors];

function addVariablesForColors({ addBase, theme }) {
  let allColors = flattenColorPalette(theme("colors"));
  let newVars = Object.fromEntries(
    Object.entries(allColors)
      .filter(([key]) => !key.startsWith("accent") && !key.startsWith("violet"))
      .map(([key, val]) => [`--${key}`, val])
  );

  addBase({
    ":root": newVars,
  });
}

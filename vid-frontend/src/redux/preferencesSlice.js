import { createSlice } from "@reduxjs/toolkit";

/**
 * Single source of truth for the appearance preferences that the app
 * applies live (theme, accent color, font size, language). Mirrors the
 * backend defaults from the `User` table:
 *   theme       'system'
 *   accentColor 'violet'
 *   fontSize    'medium'
 *   language    'en'
 *
 * Hydration order at boot:
 *   1. Inline script in `index.html` reads `localStorage.appearance` and
 *      paints the <html> element pre-React (no FOUC).
 *   2. This slice initialises from the same localStorage entry so the
 *      Redux state matches what's already on screen.
 *   3. After auth resolves, AppearanceProvider fetches `/users/me/preferences`
 *      and overwrites with the server value via `setFromServer`.
 */
export const APPEARANCE_DEFAULTS = Object.freeze({
  theme: "system",
  accentColor: "violet",
  fontSize: "medium",
  language: "en",
});

export const STORAGE_KEY = "appearance";

function readFromStorage() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeToStorage(appearance) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    /* localStorage full / blocked — non-critical */
  }
}

const cached = readFromStorage();

const initialState = {
  appearance: { ...APPEARANCE_DEFAULTS, ...(cached || {}) },
  hydrated: !!cached,
  saving: false,
};

const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    hydrateFromStorage: (state) => {
      const fresh = readFromStorage();
      if (fresh) {
        state.appearance = { ...APPEARANCE_DEFAULTS, ...fresh };
        state.hydrated = true;
      }
    },
    setAppearance: (state, action) => {
      const patch = action.payload || {};
      state.appearance = { ...state.appearance, ...patch };
      writeToStorage(state.appearance);
    },
    setFromServer: (state, action) => {
      const fromServer = action.payload || {};
      state.appearance = { ...APPEARANCE_DEFAULTS, ...fromServer };
      state.hydrated = true;
      writeToStorage(state.appearance);
    },
    resetAppearance: (state) => {
      state.appearance = { ...APPEARANCE_DEFAULTS };
      writeToStorage(state.appearance);
    },
    setSaving: (state, action) => {
      state.saving = !!action.payload;
    },
  },
});

export const {
  hydrateFromStorage,
  setAppearance,
  setFromServer,
  resetAppearance,
  setSaving,
} = preferencesSlice.actions;

export const selectAppearance = (state) => state.preferences.appearance;
export const selectTheme = (state) => state.preferences.appearance.theme;
export const selectAccent = (state) => state.preferences.appearance.accentColor;
export const selectFontSize = (state) => state.preferences.appearance.fontSize;
export const selectLanguage = (state) => state.preferences.appearance.language;
export const selectPreferencesSaving = (state) => state.preferences.saving;

/**
 * Resolves the *effective* theme — collapses "system" into "light" or
 * "dark" using the current `prefers-color-scheme` media query. Used by
 * any consumer that needs to know whether dark styles are active right
 * now (e.g. ToastContainer's theme prop).
 */
export const selectResolvedTheme = (state) => {
  const t = state.preferences.appearance.theme;
  if (t === "light" || t === "dark") return t;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
};

export default preferencesSlice.reducer;

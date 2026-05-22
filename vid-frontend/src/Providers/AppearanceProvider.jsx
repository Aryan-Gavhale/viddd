import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectAppearance, setFromServer, hydrateFromStorage } from "../redux/preferencesSlice";
import { selectIsAuthenticated, selectAuthLoading } from "../redux/userSlice";
import { fetchPreferences } from "../services/settingsApi";
import i18n from "../i18n/index.js";

/**
 * Applies the current preferences slice to the live DOM. This is the
 * only place that mutates `<html>` for theming concerns; everything
 * else dispatches into the slice.
 *
 * Effects, in order:
 *   - theme:    toggles `class="dark"` on <html>; for `system` we
 *               subscribe to `prefers-color-scheme` and re-toggle.
 *   - accent:   sets `data-accent="..."` on <html>. The CSS variables
 *               in `accents.css` use that attribute selector to redefine
 *               the `--accent-*` ramp, which in turn flows into the
 *               remapped Tailwind `violet` palette.
 *   - fontSize: sets `<html>.style.fontSize` to a px value so all
 *               Tailwind `rem` utilities scale.
 *   - language: calls i18n.changeLanguage and updates `<html lang>`.
 *
 * On first mount this re-runs `hydrateFromStorage` (an inline script in
 * `index.html` already paints the page pre-React; this just keeps Redux
 * state in sync). When `state.user.id` becomes available we fetch the
 * server-side preferences and overwrite, so the user's persisted choices
 * follow them across devices.
 */

const FONT_SIZE_PX = {
  small: "14px",
  medium: "16px",
  large: "18px",
};

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    return undefined;
  }
  if (theme === "light") {
    root.classList.remove("dark");
    return undefined;
  }
  // system
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => root.classList.toggle("dark", mql.matches);
  sync();
  if (mql.addEventListener) {
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }
  // Safari < 14 fallback
  mql.addListener(sync);
  return () => mql.removeListener(sync);
}

function applyAccent(accent) {
  document.documentElement.setAttribute("data-accent", accent || "violet");
}

function applyFontSize(size) {
  const px = FONT_SIZE_PX[size] || FONT_SIZE_PX.medium;
  document.documentElement.style.fontSize = px;
}

function applyLanguage(language) {
  const lang = language || "en";
  if (i18n.language !== lang) {
    i18n.changeLanguage(lang).catch(() => {
      /* missing locale resource — i18next falls back to `en` automatically */
    });
  }
  document.documentElement.setAttribute("lang", lang);
  // Keep the legacy LanguageSelector key in sync so anything still
  // reading `localStorage.language` directly stays consistent.
  try {
    window.localStorage.setItem("language", lang);
  } catch {
    /* non-critical */
  }
}

export default function AppearanceProvider({ children }) {
  const dispatch = useDispatch();
  const appearance = useSelector(selectAppearance);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);
  const fetchedForUser = useRef(false);

  useEffect(() => {
    dispatch(hydrateFromStorage());
  }, [dispatch]);

  useEffect(() => {
    const cleanup = applyTheme(appearance.theme);
    return typeof cleanup === "function" ? cleanup : undefined;
  }, [appearance.theme]);

  useEffect(() => {
    applyAccent(appearance.accentColor);
  }, [appearance.accentColor]);

  useEffect(() => {
    applyFontSize(appearance.fontSize);
  }, [appearance.fontSize]);

  useEffect(() => {
    applyLanguage(appearance.language);
  }, [appearance.language]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      fetchedForUser.current = false;
      return;
    }
    if (fetchedForUser.current) return;
    fetchedForUser.current = true;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPreferences();
        if (!cancelled && data?.appearance) {
          dispatch(setFromServer(data.appearance));
        }
      } catch {
        /* offline / first-load failure — keep cached client state */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, dispatch]);

  return children;
}

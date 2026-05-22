import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import ja from "./locales/ja.json";
import hi from "./locales/hi.json";
import { normalizeLanguageCode } from "./languages";

/**
 * Initial language: prefer the AppearanceProvider's source-of-truth
 * (`localStorage.appearance.language`); fall back to the legacy
 * `localStorage.language` key the LanguageSelector used before, then
 * to English. AppearanceProvider re-applies on mount, so this is just
 * a sensible bootstrap value.
 */
function readInitialLanguage() {
  if (typeof window === "undefined") return "en";
  try {
    const raw = window.localStorage.getItem("appearance");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.language === "string") return normalizeLanguageCode(parsed.language);
    }
  } catch {
    /* ignore */
  }
  return normalizeLanguageCode(window.localStorage.getItem("language") || "en");
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    ja: { translation: ja },
    hi: { translation: hi },
  },
  lng: readInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;

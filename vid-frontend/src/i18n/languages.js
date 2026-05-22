export const SUPPORTED_LANGUAGES = [
  { code: "en", flag: "🇺🇸", nativeName: "English", labelKey: "language.en" },
  { code: "es", flag: "🇪🇸", nativeName: "Español", labelKey: "language.es" },
  { code: "fr", flag: "🇫🇷", nativeName: "Français", labelKey: "language.fr" },
  { code: "de", flag: "🇩🇪", nativeName: "Deutsch", labelKey: "language.de" },
  { code: "ja", flag: "🇯🇵", nativeName: "日本語", labelKey: "language.ja" },
  { code: "hi", flag: "🇮🇳", nativeName: "हिन्दी", labelKey: "language.hi" },
];

export const SUPPORTED_LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((language) => language.code);

export function normalizeLanguageCode(language) {
  const code = String(language || "en").split("-")[0].toLowerCase();
  return SUPPORTED_LANGUAGE_CODES.includes(code) ? code : "en";
}

import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectLanguage, setAppearance } from "../redux/preferencesSlice";
import { SUPPORTED_LANGUAGES } from "../i18n/languages";

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const dispatch = useDispatch();
  const language = useSelector(selectLanguage);
  const [open, setOpen] = useState(false);

  // Source of truth for the current language is the preferences slice;
  // dispatching `setAppearance` causes AppearanceProvider to call
  // `i18n.changeLanguage` and set `<html lang>` for us.
  const change = (code) => {
    dispatch(setAppearance({ language: code }));
    setOpen(false);
  };

  const activeLang =
    (language || (i18n.language || "en").split("-")[0]).toLowerCase();
  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === activeLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition px-2 py-1 rounded-lg hover:bg-gray-800 dark:hover:bg-slate-800"
      >
        <Globe className="w-4 h-4" />
        <span>{current.flag}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-gray-900 dark:bg-slate-900 border border-gray-700 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 min-w-[160px]">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => change(lang.code)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-800 dark:hover:bg-slate-800 transition ${
                  activeLang === lang.code
                    ? "text-violet-400 font-medium"
                    : "text-gray-300"
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.nativeName}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

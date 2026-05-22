import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Monitor, Palette, Loader2, Save, Type, Languages } from "lucide-react";
import { toast } from "react-toastify";
import { fetchPreferences, updatePreferences } from "../../services/settingsApi";
import {
  selectAppearance,
  setAppearance,
  setFromServer,
} from "../../redux/preferencesSlice";
import { SUPPORTED_LANGUAGES } from "../../i18n/languages";

const THEMES = [
  { value: "light", labelKey: "settings.appearance.themeLight", fallback: "Light", icon: Sun },
  { value: "dark", labelKey: "settings.appearance.themeDark", fallback: "Dark", icon: Moon },
  { value: "system", labelKey: "settings.appearance.themeSystem", fallback: "System", icon: Monitor },
];

const ACCENTS = ["violet", "indigo", "blue", "emerald", "rose", "amber"];

const FONT_SIZES = [
  { value: "small", labelKey: "settings.appearance.sizeSmall", fallback: "Small" },
  { value: "medium", labelKey: "settings.appearance.sizeMedium", fallback: "Medium" },
  { value: "large", labelKey: "settings.appearance.sizeLarge", fallback: "Large" },
];

export function AppearanceSettings() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const appearance = useSelector(selectAppearance);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const lastSavedRef = useRef(appearance);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchPreferences();
        if (active && data?.appearance) {
          dispatch(setFromServer(data.appearance));
          lastSavedRef.current = data.appearance;
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load appearance");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [dispatch]);

  // Optimistic update — every picker dispatches into the slice so the
  // AppearanceProvider's effects fire immediately. Save then persists
  // the new state to the backend; on failure we revert to whatever
  // the server last confirmed.
  const set = (k, v) => dispatch(setAppearance({ [k]: v }));

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await updatePreferences({ appearance });
      if (res?.appearance) {
        dispatch(setFromServer(res.appearance));
        lastSavedRef.current = res.appearance;
      } else {
        lastSavedRef.current = appearance;
      }
      toast.success(t("settings.appearance.saved", "Appearance saved"));
    } catch (err) {
      toast.error(err?.response?.data?.message || t("settings.appearance.saveFailed", "Failed to save"));
      dispatch(setFromServer(lastSavedRef.current));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 dark:text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> {t("common.loading", "Loading…")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900">
      <div className="border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-violet-900 dark:text-violet-100">
            {t("settings.appearance.title", "Appearance")}
          </h2>
          <p className="text-violet-600 dark:text-violet-400 text-sm">
            {t("settings.appearance.subtitle", "Personalise how Vidlancing looks for you")}
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-white text-sm hover:bg-violet-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("common.save", "Save")}
        </button>
      </div>

      <div className="p-6 space-y-6">
        <Section
          icon={<Palette className="h-4 w-4 text-violet-500" />}
          title={t("settings.appearance.theme", "Theme")}
        >
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((th) => {
              const Icon = th.icon;
              const active = appearance.theme === th.value;
              return (
                <button
                  key={th.value}
                  onClick={() => set("theme", th.value)}
                  className={`rounded-lg border px-4 py-3 flex flex-col items-center gap-2 text-sm transition-colors ${
                    active
                      ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                      : "border-violet-100 dark:border-violet-800/50 text-gray-700 dark:text-slate-300 hover:bg-violet-50/50 dark:hover:bg-violet-900/10"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {t(th.labelKey, th.fallback)}
                </button>
              );
            })}
          </div>
        </Section>

        <Section
          icon={<Palette className="h-4 w-4 text-violet-500" />}
          title={t("settings.appearance.accent", "Accent color")}
        >
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((c) => (
              <button
                key={c}
                onClick={() => set("accentColor", c)}
                className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-105 ${
                  appearance.accentColor === c
                    ? "border-gray-900 dark:border-white"
                    : "border-transparent"
                }`}
                style={{ background: cssAccent(c) }}
                aria-label={c}
                title={c}
              />
            ))}
          </div>
        </Section>

        <Section
          icon={<Type className="h-4 w-4 text-violet-500" />}
          title={t("settings.appearance.fontSize", "Font size")}
        >
          <select
            value={appearance.fontSize || "medium"}
            onChange={(e) => set("fontSize", e.target.value)}
            className="w-full md:w-64 rounded-md border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm"
          >
            {FONT_SIZES.map((f) => (
              <option key={f.value} value={f.value}>
                {t(f.labelKey, f.fallback)}
              </option>
            ))}
          </select>
        </Section>

        <Section
          icon={<Languages className="h-4 w-4 text-violet-500" />}
          title={t("settings.appearance.language", "Language")}
        >
          <select
            value={appearance.language || "en"}
            onChange={(e) => set("language", e.target.value)}
            className="w-full md:w-64 rounded-md border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName}
              </option>
            ))}
          </select>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center text-sm font-medium text-gray-700 dark:text-slate-300">
        {icon}
        <span className="ml-2">{title}</span>
      </h3>
      {children}
    </div>
  );
}

function cssAccent(name) {
  return (
    {
      violet: "#7c3aed",
      indigo: "#4f46e5",
      blue: "#2563eb",
      emerald: "#10b981",
      rose: "#e11d48",
      amber: "#d97706",
    }[name] || "#7c3aed"
  );
}

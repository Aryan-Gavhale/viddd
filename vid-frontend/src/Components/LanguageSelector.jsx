import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useState } from 'react';

const LANGUAGES = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'hi', flag: '🇮🇳', name: 'हिंदी' },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const change = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
    setOpen(false);
  };

  const baseLang = (i18n.language || 'en').split('-')[0];
  const current = LANGUAGES.find(l => l.code === baseLang) || LANGUAGES[0];

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition px-2 py-1 rounded-lg hover:bg-gray-800">
        <Globe className="w-4 h-4" />
        <span>{current.flag}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-1 min-w-[140px]">
            {LANGUAGES.map(lang => (
              <button key={lang.code} onClick={() => change(lang.code)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-800 transition
                  ${baseLang === lang.code ? 'text-purple-400 font-medium' : 'text-gray-300'}`}>
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

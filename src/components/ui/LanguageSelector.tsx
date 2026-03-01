import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from '@/src/i18n';
import type { SupportedLanguage } from '@/src/i18n';

interface LanguageSelectorProps {
  collapsed?: boolean;
}

export default function LanguageSelector({ collapsed = false }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language?.slice(0, 2) || 'fr') as SupportedLanguage;

  const handleChange = (lang: SupportedLanguage) => {
    i18n.changeLanguage(lang);
    try { localStorage.setItem('budgetlanding_lang', lang); } catch { /* noop */ }
  };

  return (
    <div className={`flex ${collapsed ? 'flex-col items-center gap-1' : 'items-center gap-1 px-2'} mb-2`}>
      {SUPPORTED_LANGUAGES.map(lang => {
        const { flag, code } = LANGUAGE_LABELS[lang];
        const isActive = currentLang === lang;
        return (
          <button
            key={lang}
            onClick={() => handleChange(lang)}
            title={code}
            className={`flex items-center gap-1 px-1.5 py-1 rounded text-xs transition-colors ${
              isActive
                ? 'bg-slate-700 text-white'
                : 'text-slate-500 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>{flag}</span>
            {!collapsed && <span className="font-medium">{code}</span>}
          </button>
        );
      })}
    </div>
  );
}

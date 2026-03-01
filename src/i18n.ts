import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from '@/src/locales/fr/translation.json';
import en from '@/src/locales/en/translation.json';
import es from '@/src/locales/es/translation.json';
import pt from '@/src/locales/pt/translation.json';

export const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'pt'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, { flag: string; code: string }> = {
  fr: { flag: '🇫🇷', code: 'FR' },
  en: { flag: '🇬🇧', code: 'EN' },
  es: { flag: '🇪🇸', code: 'ES' },
  pt: { flag: '🇧🇷', code: 'PT' },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      es: { translation: es },
      pt: { translation: pt },
    },
    fallbackLng: 'fr',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'budgetlanding_lang',
      caches: ['localStorage'],
    },
  });

export default i18n;

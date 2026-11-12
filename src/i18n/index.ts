import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import en from './locales/en.json';
import es from './locales/es.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
} as const;

function detectLanguage(): 'en' | 'es' {
  try {
    const locales = RNLocalize.getLocales();
    const primary = locales[0]?.languageCode;
    return primary === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: detectLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;

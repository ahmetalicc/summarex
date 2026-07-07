import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import tr from '../locales/tr.json';

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, tr: { translation: tr } },
  fallbackLng: 'en',
  supportedLngs: ['en', 'tr'],
  interpolation: { escapeValue: false },
  lng: 'en', // overridden from AsyncStorage / device locale by ThemeProvider on init
});

export default i18n;

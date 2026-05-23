import { create } from 'zustand';
import i18n from '../lib/i18n';

export type Language = 'en' | 'tr';

const STORAGE_KEY = 'i18nextLng';
const SUPPORTED: Language[] = ['en', 'tr'];

function readInitial(): Language {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED.includes(stored as Language)) {
    return stored as Language;
  }
  return 'en';
}

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: readInitial(),
  setLanguage: (language) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
    void i18n.changeLanguage(language);
    set({ language });
  },
}));

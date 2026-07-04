import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { Colors, type ColorScheme } from '@/constants/colors';
import i18n from '@/lib/i18n';

type Theme = 'dark' | 'light';
type Language = 'en' | 'tr';

interface ThemeContextValue {
  theme: Theme;
  colors: ColorScheme;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  colors: Colors.dark,
  toggleTheme: () => {},
  language: 'en',
  setLanguage: () => {},
});

const STORAGE_KEY = '@summarex/theme';
const LANGUAGE_KEY = '@summarex/language';

function detectDeviceLanguage(): Language {
  const deviceLang = getLocales()[0]?.languageCode ?? 'en';
  return deviceLang === 'tr' ? 'tr' : 'en';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [theme, setTheme] = useState<Theme>(system === 'light' ? 'light' : 'dark');
  const [language, setLanguageState] = useState<Language>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(LANGUAGE_KEY),
    ]).then(([savedTheme, savedLang]) => {
      if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);
      const initialLang: Language =
        savedLang === 'en' || savedLang === 'tr' ? savedLang : detectDeviceLanguage();
      setLanguageState(initialLang);
      i18n.changeLanguage(initialLang);
      setReady(true);
    });
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    AsyncStorage.setItem(LANGUAGE_KEY, lang);
  }

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ theme, colors: Colors[theme], toggleTheme, language, setLanguage }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

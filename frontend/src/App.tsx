import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AuthGuard } from './components/auth/AuthGuard';
import { Layout } from './components/layout/Layout';
import { useThemeStore } from './store/themeStore';
import { useLanguageStore } from './store/languageStore';
import i18n from './lib/i18n';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RecordPage from './pages/RecordPage';
import MeetingDetail from './pages/MeetingDetail';
import SharedMeeting from './pages/SharedMeeting';
import NotFound from './pages/NotFound';

function App() {
  const theme = useThemeStore((s) => s.theme);
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [language]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          }
        />
        <Route
          path="/record"
          element={
            <AuthGuard>
              <RecordPage />
            </AuthGuard>
          }
        />
        <Route
          path="/meetings/:id"
          element={
            <AuthGuard>
              <MeetingDetail />
            </AuthGuard>
          }
        />
        <Route path="/shared/:token" element={<SharedMeeting />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;

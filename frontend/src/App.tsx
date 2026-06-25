import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthGuard } from './components/auth/AuthGuard';
import { Layout } from './components/layout/Layout';
import { RouteFallback } from './components/RouteFallback';
import { useThemeStore } from './store/themeStore';
import { useLanguageStore } from './store/languageStore';
import i18n from './lib/i18n';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SummarizePage = lazy(() => import('./pages/SummarizePage'));
const TranscribePage = lazy(() => import('./pages/TranscribePage'));
const MeetingDetail = lazy(() => import('./pages/MeetingDetail'));
const SharedMeeting = lazy(() => import('./pages/SharedMeeting'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));

const PAGE_TRANSITION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: 'easeOut' as const },
};

function PageWrapper({ children }: { children: React.ReactNode }) {
  return <motion.div {...PAGE_TRANSITION}>{children}</motion.div>;
}

function App() {
  const theme = useThemeStore((s) => s.theme);
  const language = useLanguageStore((s) => s.language);
  const location = useLocation();

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
    <Suspense fallback={<RouteFallback />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route element={<Layout />}>
            <Route path="/" element={<PageWrapper><Landing /></PageWrapper>} />
            <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <PageWrapper><Dashboard /></PageWrapper>
                </AuthGuard>
              }
            />
            <Route
              path="/summarize"
              element={
                <AuthGuard>
                  <PageWrapper><SummarizePage /></PageWrapper>
                </AuthGuard>
              }
            />
            <Route
              path="/transcribe"
              element={
                <AuthGuard>
                  <PageWrapper><TranscribePage /></PageWrapper>
                </AuthGuard>
              }
            />
            <Route path="/record" element={<Navigate to="/summarize" replace />} />
            <Route
              path="/meetings/:id"
              element={
                <AuthGuard>
                  <PageWrapper><MeetingDetail /></PageWrapper>
                </AuthGuard>
              }
            />
            <Route path="/shared/:token" element={<PageWrapper><SharedMeeting /></PageWrapper>} />
            <Route path="/privacy" element={<PageWrapper><Privacy /></PageWrapper>} />
            <Route path="/terms" element={<PageWrapper><Terms /></PageWrapper>} />
            <Route path="/contact" element={<PageWrapper><Contact /></PageWrapper>} />
            <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
          </Route>
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default App;

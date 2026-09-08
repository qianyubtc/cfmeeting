import { useEffect, useState } from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { detectSameOriginApi } from './lib/backend';
import { I18nProvider, useI18n } from './lib/i18n';
import { initNativeBridges } from './lib/native';
import { useHashRouter } from './lib/platform';
import { ToastProvider } from './components/ui';
import { Home } from './pages/Home';
import { MeetingPage } from './pages/MeetingPage';
import { Preview } from './pages/Preview';

/** Deep links (desktop / Android) and the Android back button need the router. */
function NativeBridge() {
  const navigate = useNavigate();
  const { t } = useI18n();
  useEffect(() => initNativeBridges(navigate, () => window.confirm(t('meeting.leaveConfirm'))), [navigate, t]);
  return null;
}

export default function App() {
  const Router = useHashRouter ? HashRouter : BrowserRouter;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    detectSameOriginApi().finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  if (!ready) return null;
  return (
    <I18nProvider>
      <ToastProvider>
        <Router basename={useHashRouter ? undefined : import.meta.env.BASE_URL}>
          <NativeBridge />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/m/:ref" element={<MeetingPage />} />
            {import.meta.env.DEV ? <Route path="/preview" element={<Preview />} /> : null}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </I18nProvider>
  );
}

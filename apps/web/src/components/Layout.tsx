import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { appVersion, isElectron } from '../lib/platform';
import { applyTheme, getTheme, type Theme } from '../lib/theme';
import { IconButton, Logo } from './ui';
import { AboutDialog } from './AboutDialog';
import { SettingsDialog } from './SettingsDialog';

export function Ambient() {
  return (
    <div className="orbs" aria-hidden="true">
      <span className="orb orb-1" />
      <span className="orb orb-2" />
      <span className="orb orb-3" />
      <span className="orb orb-4" />
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const [search] = useSearchParams();
  const [about, setAbout] = useState(() => search.get('open') === 'about');
  const [settings, setSettings] = useState(() => search.get('open') === 'settings');
  const [theme, setTheme] = useState<Theme>(getTheme);
  const isMac = isElectron && window.desktop?.platform === 'darwin';

  useEffect(() => {
    document.documentElement.classList.toggle('vibrancy', Boolean(isMac));
  }, [isMac]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  return (
    <div className={`app ${isMac ? 'app-mac' : ''}`}>
      <Ambient />
      <header className="topbar">
        <Link to="/" className="brand">
          <Logo size={28} />
          <span className="brand-name">{t('app.name')}</span>
          <span className="brand-pill">{t('home.edition')}</span>
        </Link>
        <nav className="topbar-actions">
          <button className="lang-btn" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} title={t('settings.language')}>
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
          <IconButton className="theme-btn" icon={theme === 'dark' ? 'sun' : 'moon'} label={t('settings.theme')} onClick={toggleTheme} size={32} />
          <IconButton icon="settings" label={t('nav.settings')} onClick={() => setSettings(true)} size={32} />
          <IconButton icon="info" label={t('nav.about')} onClick={() => setAbout(true)} size={32} />
        </nav>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <span>{t('footer.disclaimer')}</span>
        <span className="footer-meta">
          <button className="link-btn" onClick={() => setAbout(true)}>
            {t('nav.about')}
          </button>
          <span>v{appVersion}</span>
        </span>
      </footer>
      {import.meta.env.DEV ? (
        <Link to="/preview" className="dev-fab" title="UI 预览面板">
          UI
        </Link>
      ) : null}
      <AboutDialog open={about} onClose={() => setAbout(false)} />
      <SettingsDialog open={settings} onClose={() => setSettings(false)} />
    </div>
  );
}

import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { applyTheme, getTheme } from './lib/theme';
import { detectLang } from './lib/i18n';
import './styles.css';

const themeParam = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '').get('theme');
applyTheme(themeParam === 'dark' || themeParam === 'light' ? themeParam : getTheme());
document.documentElement.lang = detectLang() === 'zh' ? 'zh-CN' : 'en';

if (!__PACKAGED__) {
  registerSW({ immediate: true });
}

// No StrictMode: the RealtimeKit examples avoid it so effects (meeting init) do not run twice.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />);

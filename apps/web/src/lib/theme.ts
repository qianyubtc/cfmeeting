import { syncStatusBar } from './native';
import { getItem, setItem } from './storage';

export type Theme = 'dark' | 'light';

export const THEME_BG: Record<Theme, string> = { light: '#eef1f6', dark: '#0b0b0f' };

export function getTheme(): Theme {
  return getItem<Theme>('theme', 'light') === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_BG[theme]);
  setItem('theme', theme);
  void syncStatusBar(theme);
}

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'instaflow.theme';

function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#08080b' : '#f7f7fa');
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* storage unavailable: theme still applies for this visit */
    }
  }, [theme]);

  const toggle = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return { theme, setTheme: setThemeState, toggle };
}

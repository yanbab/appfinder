import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'system',
  isDark: false,
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('appfinder-theme') || 'system';
  });

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = () => {
      const systemDark = mediaQuery.matches;
      const effectiveDark = theme === 'dark' || (theme === 'system' && systemDark);
      setIsDark(effectiveDark);
      
      const root = document.documentElement;
      if (effectiveDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('appfinder-theme', theme);
  }, [theme]);

  // Accent color sync with macOS
  useEffect(() => {
    if (window.ipc?.getAccentColor) {
      window.ipc.getAccentColor().then((color) => {
        if (color) {
          const clean = typeof color === 'string' ? color.replace(/^#/, '') : '';
          const hex = color.startsWith?.('rgb') ? color : `#${clean.length === 8 ? clean.slice(0, 6) : clean}`;
          document.documentElement.style.setProperty('--accent-color-raw', hex);
        }
      });
    }

    if (window.ipc?.onAccentColorChanged) {
      const unsub = window.ipc.onAccentColorChanged((color) => {
        if (color) {
          const clean = typeof color === 'string' ? color.replace(/^#/, '') : '';
          const hex = color.startsWith?.('rgb') ? color : `#${clean.length === 8 ? clean.slice(0, 6) : clean}`;
          document.documentElement.style.setProperty('--accent-color-raw', hex);
        }
      });
      return () => unsub?.();
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

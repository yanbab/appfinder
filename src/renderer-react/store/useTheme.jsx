import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext({
  theme: 'system',
  isDark: false,
  setTheme: () => { },
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches || false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e) => {
      setIsDark(e.matches);
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    if (mediaQuery.matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  // Apply macOS native accent color directly to primary & ring variables
  const applyAccentColor = useCallback((color) => {
    if (!color) return;
    const clean = typeof color === 'string' ? color.trim().replace(/^#/, '') : '';
    const hex = color.startsWith?.('rgb') ? color : `#${clean.length === 8 ? clean.slice(0, 6) : clean}`;
    if (!hex || hex === '#') return;

    const root = document.documentElement;
    root.style.setProperty('--primary', hex);
    root.style.setProperty('--ring', hex);
    root.style.setProperty('--sidebar-primary', hex);
    root.style.setProperty('--sidebar-ring', hex);
  }, []);

  useEffect(() => {
    if (window.ipc?.getAccentColor) {
      window.ipc.getAccentColor().then((color) => {
        if (color) applyAccentColor(color);
      }).catch(console.error);
    }

    if (window.ipc?.onAccentColorChanged) {
      const unsub = window.ipc.onAccentColorChanged((color) => {
        if (color) applyAccentColor(color);
      });
      return () => unsub?.();
    }
  }, [applyAccentColor]);

  return (
    <ThemeContext.Provider value={{ isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeProvider;

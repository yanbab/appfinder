import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export interface ThemeContextValue {
  theme?: string;
  isDark: boolean;
  accentColor: string | null;
  isLightAccent: boolean;
  isWindowBlurred: boolean;
  isResizing: boolean;
  setTheme?: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  isDark: false,
  accentColor: null,
  isLightAccent: false,
  isWindowBlurred: false,
  isResizing: false,
  setTheme: () => { },
});

// Relative luminance following WCAG 2.1 specifications:
// https://www.w3.org/WAI/GL/wiki/Relative_luminance
function getLuminance(hex: string): number {
  const clean = hex.replace(/^#/, '');
  if (clean.length < 6) return 0.5;
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function ThemeProvider({ children }: { children?: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const match = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches || false;
    if (match) {
      document.documentElement.classList.add('dark');
    }
    return match;
  });
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [isWindowBlurred, setIsWindowBlurred] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // System Dark / Light Theme listener
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
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

  // Window focus & blur class on body (macOS vibrancy & active state styling)
  useEffect(() => {
    const handleFocus = () => {
      document.body.classList.remove('window-blurred');
      setIsWindowBlurred(false);
    };
    const handleBlur = () => {
      document.body.classList.add('window-blurred');
      setIsWindowBlurred(true);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    if (!document.hasFocus()) {
      document.body.classList.add('window-blurred');
      setIsWindowBlurred(true);
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Window resize debounce to suppress layout transitions during resize
  useEffect(() => {
    let resizeTimer: any = null;
    const handleResize = () => {
      document.body.classList.add('is-resizing');
      setIsResizing(true);
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        document.body.classList.remove('is-resizing');
        setIsResizing(false);
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Apply macOS native accent color directly to primary & ring variables
  const applyAccentColor = useCallback((color: string) => {
    if (!color) return;
    const clean = typeof color === 'string' ? color.trim().replace(/^#/, '') : '';
    const hex = color.startsWith?.('rgb') ? color : `#${clean.length === 8 ? clean.slice(0, 6) : clean}`;
    if (!hex || hex === '#') return;

    const lum = getLuminance(hex);
    const mutePercent = lum > 0.60 ? 65 : (lum > 0.40 ? 75 : 85);

    const root = document.documentElement;
    root.style.setProperty('--accent-color-raw', hex);
    root.style.setProperty('--accent-color', hex);
    root.style.setProperty('--primary', hex);
    root.style.setProperty('--ring', hex);
    root.style.setProperty('--sidebar-ring', hex);
    root.style.setProperty('--accent-color-muted', `color-mix(in srgb, ${hex} ${mutePercent}%, black)`);
    root.style.setProperty('--sidebar-primary', 'var(--accent-color-muted)');
    root.style.setProperty('--primary-foreground', '#ffffff');
    root.style.setProperty('--sidebar-primary-foreground', '#ffffff');

    setAccentColor(hex);
  }, []);

  useEffect(() => {
    if (window.ipc?.getAccentColor) {
      window.ipc.getAccentColor().then((color) => {
        if (color) applyAccentColor(color);
      }).catch(console.error);
    }

    if (window.ipc?.on) {
      const unsub = window.ipc.on('system:accent-color-changed', (color) => {
        if (color) applyAccentColor(color);
      });
      return () => unsub?.();
    }
  }, [applyAccentColor]);

  const isLightAccent = accentColor ? getLuminance(accentColor) > 0.40 : false;

  return (
    <ThemeContext.Provider value={{ isDark, accentColor, isLightAccent, isWindowBlurred, isResizing }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeProvider;

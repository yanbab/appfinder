import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { ThemeProvider } from '@/hooks';
import type { AppConfig, LocaleInfo } from '@/types';

export function SettingsApp() {
  const [config, setConfig] = useState<AppConfig>({
    zap: false,
    alwaysShowStatusBar: false,
    debug: false,
    language: 'system',
  });
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [locales, setLocales] = useState<LocaleInfo[]>([]);
  const [systemLocaleName, setSystemLocaleName] = useState<string>('English');

  const __ = (key: string, ...args: (string | number)[]) => {
    let text = messages && messages[key] !== undefined ? messages[key] : key;
    if (args.length > 0) {
      args.forEach((arg) => {
        text = text.replace(/%s|%d/, String(arg));
      });
    }
    return text;
  };

  useEffect(() => {
    if (!window.ipc) return;

    const loadData = async () => {
      try {
        const [cfg, msgs, locs, sysCode] = await Promise.all([
          window.ipc.getConfig?.() || {},
          window.ipc.getMessages?.() || {},
          window.ipc.getAvailableLocales?.() || [],
          window.ipc.getSystemLocale?.() || 'en',
        ]);
        setConfig(cfg);
        setMessages(msgs);
        setLocales(locs);

        const foundSys = locs.find((l: LocaleInfo) => l.code === sysCode);
        if (foundSys?.name) {
          setSystemLocaleName(foundSys.name);
        }
      } catch (err) {
        console.error('Failed to load settings data:', err);
      }
    };

    loadData();

    const unsubI18n = window.ipc.on?.('i18n:changed', async () => {
      const msgs = (await window.ipc?.getMessages?.()) || {};
      setMessages(msgs);
    });

    const unsubConfig = window.ipc.on?.('config:updated', (cfg: AppConfig) => {
      if (cfg) setConfig(cfg);
    });

    return () => {
      unsubI18n?.();
      unsubConfig?.();
    };
  }, []);

  const handleLanguageChange = async (newLang: string) => {
    setConfig((prev) => ({ ...prev, language: newLang }));
    await window.ipc?.updateConfig?.({ language: newLang });
    const newMsgs = (await window.ipc?.getMessages?.()) || {};
    setMessages(newMsgs);
  };

  const handleStatusBarToggle = async (alwaysShow: boolean) => {
    setConfig((prev) => ({ ...prev, alwaysShowStatusBar: alwaysShow }));
    await window.ipc?.updateConfig?.({ alwaysShowStatusBar: alwaysShow });
  };

  return (
    <div className="w-full h-full min-h-screen bg-background text-foreground flex flex-col gap-4 select-none p-4 text-xs font-normal">
      {/* Language setting */}
      <div className="flex items-center justify-between gap-4">
        <label htmlFor="setting-lang" className="font-medium text-foreground">
          {__('Language')}
        </label>
        <select
          id="setting-lang"
          value={config.language || 'system'}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="bg-card text-foreground border border-border rounded-md px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-ring cursor-default shadow-2xs"
        >
          <option value="system">
            {__('System Default (%s)', systemLocaleName)}
          </option>
          {locales
            .filter((l) => l.code !== 'system')
            .map((loc) => (
              <option key={loc.code} value={loc.code}>
                {loc.name}
              </option>
            ))}
        </select>
      </div>

      {/* Always Show Status Bar setting */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-medium text-foreground">
            {__('Always Show Status Bar')}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {__('Keep the footer bar visible even when idle')}
          </div>
        </div>

        {/* Segmented Control */}
        <div className="inline-flex bg-muted/70 p-0.5 rounded-md border border-border/50 shrink-0">
          <button
            type="button"
            onClick={() => handleStatusBarToggle(false)}
            className={`px-3 py-1 text-[11px] font-medium rounded-[4px] transition-all cursor-default ${
              !config.alwaysShowStatusBar
                ? 'bg-card text-foreground shadow-2xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {__('Off')}
          </button>
          <button
            type="button"
            onClick={() => handleStatusBarToggle(true)}
            className={`px-3 py-1 text-[11px] font-medium rounded-[4px] transition-all cursor-default ${
              config.alwaysShowStatusBar
                ? 'bg-card text-foreground shadow-2xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {__('On')}
          </button>
        </div>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <SettingsApp />
      </ThemeProvider>
    </StrictMode>,
  );
}

import React, { useState, useEffect, useCallback, useRef } from 'react';

export function Settings() {
  const [alwaysShowStatusBar, setAlwaysShowStatusBar] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [language, setLanguage] = useState('system');
  const [locales, setLocales] = useState([]);
  const [messages, setMessages] = useState({});
  const [systemLanguageName, setSystemLanguageName] = useState('English');
  const containerRef = useRef(null);

  // Translation helper supporting interpolation (%s)
  const __ = useCallback(
    (key, ...args) => {
      let text = (messages && messages[key] !== undefined) ? messages[key] : key;
      if (args.length > 0) {
        args.forEach((arg) => {
          text = text.replace(/%s|%d/, String(arg));
        });
      }
      return text;
    },
    [messages]
  );

  const resizeToContent = useCallback(() => {
    requestAnimationFrame(() => {
      if (containerRef.current && window.ipc?.setContentSize) {
        const height = Math.ceil(containerRef.current.offsetHeight || containerRef.current.getBoundingClientRect().height);
        if (height > 30) {
          window.ipc.setContentSize(380, height);
        }
      }
    });
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await window.ipc?.getConfig?.();
      if (cfg) {
        setAlwaysShowStatusBar(Boolean(cfg.alwaysShowStatusBar));
        setLanguage(cfg.language || 'system');
      }
      setIsReady(true);
    } catch (e) {
      console.error('Failed to load config:', e);
      setIsReady(true);
    }
  }, []);

  const loadI18n = useCallback(async () => {
    try {
      const msgs = await (window.ipc?.getMessages?.() || window.ipc?.getTranslations?.() || window.ipc?.getI18nCatalog?.());
      if (msgs) setMessages(msgs);

      const locs = await (window.ipc?.getAvailableLocales?.() || window.ipc?.getI18nLocales?.());
      if (Array.isArray(locs)) {
        setLocales(locs);
        let sysCode = 'en';
        try {
          sysCode = (await window.ipc?.getSystemLocale?.()) || (navigator.language || 'en').split('-')[0].toLowerCase();
        } catch {
          sysCode = (navigator.language || 'en').split('-')[0].toLowerCase();
        }
        const sysLoc = locs.find((l) => l.code === sysCode);
        if (sysLoc && sysLoc.name) {
          setSystemLanguageName(sysLoc.name);
        }
      }
    } catch (e) {
      console.error('Failed to load i18n:', e);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadI18n();
  }, [loadConfig, loadI18n]);

  useEffect(() => {
    const unsub = window.ipc?.onI18nChanged?.(async () => {
      const msgs = await (window.ipc?.getMessages?.() || window.ipc?.getTranslations?.() || window.ipc?.getI18nCatalog?.());
      if (msgs) setMessages(msgs);
      resizeToContent();
    });
    return () => unsub?.();
  }, [resizeToContent]);

  useEffect(() => {
    if (isReady) {
      resizeToContent();
    }
  }, [isReady, language, locales, resizeToContent]);

  const handleToggleStatusBar = async (checked) => {
    setAlwaysShowStatusBar(checked);
    try {
      await window.ipc?.updateConfig?.({ alwaysShowStatusBar: checked });
    } catch (e) {
      console.error('Failed to update config:', e);
    }
  };

  const handleLanguageChange = async (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    try {
      await window.ipc?.updateConfig?.({ language: newLang });
      const msgs = await (window.ipc?.getMessages?.() || window.ipc?.getTranslations?.() || window.ipc?.getI18nCatalog?.());
      if (msgs) setMessages(msgs);
      resizeToContent();
    } catch (err) {
      console.error('Failed to update language:', err);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-[380px] bg-background text-foreground select-none p-4 space-y-4 font-sans text-xs antialiased overflow-hidden"
    >
      <div className="space-y-3">
        {/* Language select */}
        <div className="flex items-center justify-between">
          <label htmlFor="settings-language" className="font-medium text-foreground cursor-default">
            {__('Language')}
          </label>
          <select
            id="settings-language"
            value={language}
            onChange={handleLanguageChange}
            className="h-7 text-xs bg-muted/50 border border-input rounded-[var(--radius-btn)] px-2 text-foreground outline-none cursor-default focus:ring-1 focus:ring-ring"
          >
            <option value="system">
              {__('System Default (%s)', systemLanguageName)}
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

        {/* Always Show Status Bar */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="font-medium text-foreground">{__('Always Show Status Bar')}</div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              {__('Keep the footer bar visible even when idle')}
            </div>
          </div>
          <div className="inline-flex rounded-md p-0.5 bg-muted border border-border shrink-0">
            <button
              type="button"
              onClick={() => handleToggleStatusBar(false)}
              className={`px-2.5 py-0.5 text-xs rounded-sm transition-all cursor-default select-none ${
                !alwaysShowStatusBar
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {__('Off')}
            </button>
            <button
              type="button"
              onClick={() => handleToggleStatusBar(true)}
              className={`px-2.5 py-0.5 text-xs rounded-sm transition-all cursor-default select-none ${
                alwaysShowStatusBar
                  ? 'bg-background text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {__('On')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Backward-compatible alias
export const SettingsView = Settings;
export default Settings;

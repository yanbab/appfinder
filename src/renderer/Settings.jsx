import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export function Settings() {
  const [alwaysShowStatusBar, setAlwaysShowStatusBar] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [language, setLanguage] = useState('system');
  const [locales, setLocales] = useState([]);
  const [catalog, setCatalog] = useState({});
  const [systemLanguageName, setSystemLanguageName] = useState('English');
  const [isCleaning, setIsCleaning] = useState(false);
  const containerRef = useRef(null);

  // Translation helper
  const __ = useCallback(
    (key, fallback) => {
      return (catalog && catalog[key]) || fallback || key;
    },
    [catalog]
  );

  const resizeToContent = useCallback(() => {
    requestAnimationFrame(() => {
      if (containerRef.current && window.ipc?.setContentSize) {
        const height = Math.ceil(containerRef.current.offsetHeight || containerRef.current.getBoundingClientRect().height);
        if (height > 50) {
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
      const cat = await window.ipc?.getI18nCatalog?.();
      if (cat) setCatalog(cat);

      const locs = await window.ipc?.getI18nLocales?.();
      if (Array.isArray(locs)) {
        setLocales(locs);
        const sysLoc = locs.find((l) => l.code === 'system');
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
      const cat = await window.ipc?.getI18nCatalog?.();
      if (cat) setCatalog(cat);
      resizeToContent();
    } catch (err) {
      console.error('Failed to update language:', err);
    }
  };

  const handleCleanCache = async () => {
    setIsCleaning(true);
    try {
      await window.ipc?.cleanCache?.();
    } catch (e) {
      console.error('Failed to clean cache:', e);
    } finally {
      setIsCleaning(false);
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
              {__('System Default')} ({systemLanguageName})
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
            <div className="font-medium text-foreground">{__('Always show status bar')}</div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              {__('Keep the footer bar visible even when idle')}
            </div>
          </div>
          <Switch
            checked={alwaysShowStatusBar}
            onCheckedChange={handleToggleStatusBar}
          />
        </div>

        {/* Cleanup Package Manager Cache */}
        <div className="flex items-center justify-between pt-1">
          <div className="space-y-0.5">
            <div className="font-medium text-foreground">{__('Cache Cleanup')}</div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              {__('Clean outdated downloads and temporary caches')}
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={isCleaning}
            onClick={handleCleanCache}
            className="h-7 px-2.5 text-xs rounded-[var(--radius-btn)] cursor-default"
          >
            {isCleaning ? __('Cleaning...') : __('Clean Cache')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Backward-compatible alias
export const SettingsView = Settings;
export default Settings;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { LocaleInfo } from '@/types';
import { List } from './List';
import { ListRow } from './ListRow';
import { Select } from './Select';
import { Switch } from './Switch';

export function SettingsWindow() {
  const [alwaysShowStatusBar, setAlwaysShowStatusBar] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [language, setLanguage] = useState('system');
  const [locales, setLocales] = useState<LocaleInfo[]>([]);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [systemLanguageName, setSystemLanguageName] = useState('English');
  const containerRef = useRef<HTMLDivElement>(null);

  // Translation helper supporting interpolation (%s)
  const __ = useCallback(
    (key: string, ...args: any[]) => {
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

  useEffect(() => {
    document.title = __('Settings');
  }, [__]);

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
      const msgs = await window.ipc?.getMessages?.();
      if (msgs) setMessages(msgs);

      const locs = await window.ipc?.getAvailableLocales?.();
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
    if (window.ipc?.on) {
      const unsub = window.ipc.on('i18n:changed', async () => {
        const msgs = await window.ipc?.getMessages?.();
        if (msgs) setMessages(msgs);
        resizeToContent();
      });
      return () => unsub?.();
    }
  }, [resizeToContent]);

  useEffect(() => {
    if (isReady) {
      resizeToContent();
    }
  }, [isReady, language, locales, resizeToContent]);

  const handleToggleStatusBar = async (checked: boolean) => {
    setAlwaysShowStatusBar(checked);
    try {
      await window.ipc?.updateConfig?.({ alwaysShowStatusBar: checked });
    } catch (e) {
      console.error('Failed to update config:', e);
    }
  };

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    try {
      await window.ipc?.updateConfig?.({ language: newLang });
      const msgs = await window.ipc?.getMessages?.();
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
      <List>
        {/* Language select row */}
        <ListRow>
          <label htmlFor="settings-language" className="font-medium text-foreground cursor-default">
            {__('Language')}
          </label>
          <Select
            id="settings-language"
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="system" className="bg-popover text-popover-foreground">
              {`${__('System')} (${__(systemLanguageName)})`}
            </option>
            <hr />
            {locales
              .filter((l) => l.code !== 'system')
              .map((loc) => (
                <option key={loc.code} value={loc.code} className="bg-popover text-popover-foreground">
                  {loc.name}
                </option>
              ))}
          </Select>
        </ListRow>

        {/* Always Show Status Bar row */}
        <ListRow>
          <div className="space-y-0.5">
            <div className="font-medium text-foreground">{__('Always Show Status Bar')}</div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              {__('Keep the footer bar visible even when idle')}
            </div>
          </div>
          <Switch
            checked={alwaysShowStatusBar}
            onChange={handleToggleStatusBar}
            title={alwaysShowStatusBar ? __('On') : __('Off')}
          />
        </ListRow>
      </List>
    </div>
  );
}

export default SettingsWindow;

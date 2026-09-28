import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export function SettingsView() {
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

  const loadTranslations = useCallback(async () => {
    try {
      if (window.ipc?.getTranslations) {
        const cat = await window.ipc.getTranslations();
        if (cat) {
          setCatalog(cat);
          const isRtl = cat._languageDirection === 'rtl';
          document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
          document.title = (cat['Settings'] || 'Settings');
        }
      }
    } catch (e) {
      console.error('Failed to load translations:', e);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      if (window.ipc?.getConfig) {
        const cfg = await window.ipc.getConfig();
        if (cfg) {
          setAlwaysShowStatusBar(!!cfg.alwaysShowStatusBar);
          setLanguage(cfg.language || 'system');
        }
      }
    } catch (e) {
      console.error('Failed to load config:', e);
    }
  }, []);

  const loadLocales = useCallback(async () => {
    try {
      if (window.ipc?.getAvailableLocales) {
        const locs = await window.ipc.getAvailableLocales();
        if (Array.isArray(locs)) {
          setLocales(locs);
          const sysCode = (navigator.language || 'en').split('-')[0].toLowerCase();
          const sysLocale = locs.find((l) => l.code === sysCode);
          setSystemLanguageName(sysLocale ? sysLocale.name : 'English');
        }
      }
    } catch (e) {
      console.error('Failed to load locales:', e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([loadTranslations(), loadConfig(), loadLocales()]).then(() => {
      resizeToContent();
      setTimeout(() => setIsReady(true), 50);
    });

    let unsubCleanup = null;
    let unsubI18n = null;

    if (window.ipc?.onCleanupStatus) {
      unsubCleanup = window.ipc.onCleanupStatus((status) => {
        setIsCleaning(status === 'start');
      });
    }

    if (window.ipc?.onI18nChanged) {
      unsubI18n = window.ipc.onI18nChanged(() => {
        loadTranslations();
        resizeToContent();
      });
    }

    return () => {
      unsubCleanup?.();
      unsubI18n?.();
    };
  }, [loadTranslations, loadConfig, loadLocales, resizeToContent]);

  // Trigger resize on content changes
  useEffect(() => {
    resizeToContent();
  }, [catalog, locales, resizeToContent]);

  // Handle Switch Change
  const handleToggleStatusBar = async (checked) => {
    setAlwaysShowStatusBar(checked);
    if (window.ipc?.updateConfig) {
      await window.ipc.updateConfig({ alwaysShowStatusBar: checked });
    }
  };

  // Handle Language Change
  const handleChangeLanguage = async (e) => {
    const val = e.target.value;
    setLanguage(val);
    if (window.ipc?.updateConfig) {
      await window.ipc.updateConfig({ language: val });
    }
  };

  // Clear Caches
  const handleClearCaches = async () => {
    if (isCleaning) return;
    if (window.ipc?.clearCaches) {
      try {
        await window.ipc.clearCaches();
      } catch (err) {
        console.error('Failed to clear caches:', err);
      }
    }
  };

  const systemDefaultLabel = () => {
    const raw = __('System Default (%s)', 'System Default (%s)');
    return raw.includes('%s') ? raw.replace('%s', systemLanguageName) : `${raw} (${systemLanguageName})`;
  };

  return (
    <div
      ref={containerRef}
      className="p-3.5 space-y-2.5 select-none bg-background text-foreground text-sm w-full h-auto"
    >
      <div className="border border-[var(--card-border)] rounded-[var(--radius-card)] overflow-hidden bg-card divide-y divide-[var(--card-border)] shadow-2xs">
        {/* Always Show Status Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <span className="font-medium text-xs text-foreground">
            {__('Always Show Status Bar')}
          </span>
          <Switch
            checked={alwaysShowStatusBar}
            onCheckedChange={handleToggleStatusBar}
            animate={isReady}
          />
        </div>

        {/* Language Selection */}
        <div className="flex items-center justify-between px-3.5 py-2.5 gap-2">
          <span className="font-medium text-xs text-foreground shrink-0">
            {__('Language')}
          </span>
          <div className="flex items-center">
            <select
              value={language}
              onChange={handleChangeLanguage}
              className="bg-transparent border-0 text-right text-xs font-medium text-foreground cursor-pointer focus:outline-none max-w-[200px] [text-align-last:right] pr-1.5"
              style={{ textAlign: 'right', textAlignLast: 'right' }}
            >
              <option value="system" className="bg-popover text-popover-foreground">
                {systemDefaultLabel()}
              </option>
              {locales.map((loc) => (
                <option key={loc.code} value={loc.code} className="bg-popover text-popover-foreground">
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Caches */}
        <div className="flex items-center justify-between px-3.5 py-2.5 gap-3">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="font-medium text-sm text-foreground">
              {__('Clear Caches')}
            </div>
            <div className="text-xs text-muted-foreground leading-snug line-clamp-2">
              {__('Run brew cleanup to remove cached downloads and lock files.')}
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={isCleaning}
            onClick={handleClearCaches}
            className="shrink-0 text-xs font-medium"
          >
            {isCleaning ? __('In Progress...') : __('Clear')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;

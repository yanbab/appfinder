// Settings Window Alpine Component

window.settings = {
  alwaysShowStatusBar: false,
  showDockBadge: true,
  showTrayIcon: false,
  autoCheckUpdates: true,
  language: 'system',
  locales: [],
  catalog: {},
  systemLanguageName: 'English',
  isCleaning: false,

  async init() {
    this.initAccentColor();
    await this.loadTranslations();
    await this.loadConfig();
    await this.loadLocales();

    // Watch settings and save automatically on user changes
    this.$watch('alwaysShowStatusBar', () => this.save());
    this.$watch('showDockBadge', () => this.save());
    this.$watch('showTrayIcon', () => this.save());
    this.$watch('autoCheckUpdates', () => this.save());
    this.$watch('language', () => this.save());

    if (window.ipc?.onCleanupStatus) {
      window.ipc.onCleanupStatus((status) => {
        this.isCleaning = status === 'start';
      });
    }

    if (window.ipc?.onI18nChanged) {
      window.ipc.onI18nChanged(async () => {
        await this.loadTranslations();
        document.querySelectorAll('[data-i18n]').forEach((el) => {
          const key = el.getAttribute('data-i18n');
          if (key) el.textContent = this.__(key);
        });
        this.resizeToContent();
      });
    }

    window.addEventListener('blur', () => document.body.classList.add('blur'));
    window.addEventListener('focus', () => document.body.classList.remove('blur'));

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.remove('no-transition');
        this.resizeToContent();
      });
    });
  },

  resizeToContent() {
    requestAnimationFrame(() => {
      const container = document.querySelector('.settings-container');
      const h = container ? Math.ceil(container.getBoundingClientRect().height + 32) : Math.ceil(document.body.scrollHeight);
      if (h > 50 && window.ipc?.setContentSize) {
        window.ipc.setContentSize(380, h);
      }
    });
  },

  async loadTranslations() {
    try {
      this.catalog = (await window.ipc.getTranslations()) || {};
      const isRtl = this.catalog._languageDirection === 'rtl';
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      document.title = this.__('Settings', 'Settings');
    } catch (e) {
      console.error('Failed to load translations:', e);
    }
  },

  async loadConfig() {
    try {
      const config = (await window.ipc.getConfig()) || {};
      this.alwaysShowStatusBar = !!config.alwaysShowStatusBar;
      this.showDockBadge = config.showDockBadge !== false;
      this.showTrayIcon = !!config.showTrayIcon;
      this.autoCheckUpdates = config.autoCheckUpdates !== false;
      this.language = config.language || 'system';
    } catch (e) {
      console.error('Failed to load config:', e);
    }
  },

  async loadLocales() {
    try {
      const locales = (await window.ipc.getAvailableLocales()) || [];
      this.locales = locales;
      const sysCode = (navigator.language || 'en').split('-')[0].toLowerCase();
      const sysLocale = locales.find(l => l.code === sysCode);
      this.systemLanguageName = sysLocale ? sysLocale.name : 'English';
    } catch (e) {
      console.error('Failed to load locales:', e);
    }
  },

  getSystemDefaultLabel() {
    const raw = this.__('System Default (%s)', 'System Default (%s)');
    return raw.includes('%s') ? raw.replace('%s', this.systemLanguageName) : `${raw} (${this.systemLanguageName})`;
  },

  async save() {
    try {
      await window.ipc.updateConfig({
        alwaysShowStatusBar: this.alwaysShowStatusBar,
        showDockBadge: this.showDockBadge,
        showTrayIcon: this.showTrayIcon,
        autoCheckUpdates: this.autoCheckUpdates,
        language: this.language
      });
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  },

  async clearCaches() {
    if (this.isCleaning) return;
    this.isCleaning = true;
    try {
      const result = await window.ipc.clearCaches();
      this.isCleaning = false;

      if (result && !result.success) {
        await window.ipc.showErrorDialog(
          this.__('Cleanup failed', 'Cleanup failed'),
          result.error || this.__('An error occurred during cache cleanup.', 'An error occurred during cache cleanup.')
        );
        return;
      }

      const stdout = result?.stdout || '';
      const lines = stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const freedLine = lines.slice().reverse().find(l => /freed|disk space/i.test(l));
      const defaultNoFiles = this.__('No files cleaned up.');
      const lastLine = (freedLine || (lines.length > 0 ? lines[lines.length - 1] : ''))
        .replace(/^==>\s*/, '')
        .trim() || defaultNoFiles;

      const title = this.__('Cleanup Finished');
      await window.ipc.showMessage({
        type: 'info',
        title,
        message: title,
        detail: lastLine,
        buttons: ['OK']
      });
    } catch (e) {
      this.isCleaning = false;
      console.error('Failed to clear caches:', e);
    }
  },

  initAccentColor() {
    const formatAccentColor = (color) => {
      if (!color) return '';
      let clean = color.trim();
      if (clean.startsWith('#')) clean = clean.slice(1);
      if (clean.length === 8) clean = clean.substring(0, 6);
      return `#${clean}`;
    };
    const setAccent = (color) => {
      if (color) {
        document.documentElement.style.setProperty('--accent-color-raw', formatAccentColor(color));
      }
    };
    if (window.ipc?.getAccentColor) window.ipc.getAccentColor().then(setAccent);
    if (window.ipc?.onAccentColorChanged) window.ipc.onAccentColorChanged(setAccent);
  },

  __(key, defaultValue) {
    if (!this.catalog) return defaultValue || key;
    return this.catalog[key] !== undefined ? this.catalog[key] : (defaultValue || key);
  }
};

document.addEventListener('alpine:init', () => {
  Alpine.data('settings', () => window.settings);
});

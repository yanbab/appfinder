// Info Panel Component Extension
Object.assign(window.shell, {
  selectedApp: null,
  showInfoPanel: false,
  appDetails: null,
  loadingAppDetails: false,
  isProvidesOpen: (() => {
    try {
      return localStorage.getItem('info_provides_open') === 'true';
    } catch {
      return false;
    }
  })(),

  toggleProvides(isOpen) {
    this.isProvidesOpen = !!isOpen;
    try {
      localStorage.setItem('info_provides_open', String(this.isProvidesOpen));
    } catch (_) {}
  },

  getInfoVersion() {
    if (!this.selectedApp) return '';
    const token = this.selectedApp.token;
    if (this.outdatedMap && this.outdatedMap[token]) {
      return this.outdatedMap[token].installedVersion || this.installedVersions?.[token] || this.appDetails?.installed || (this.loadingAppDetails ? '...' : '');
    }
    if (this.installedVersions && this.installedVersions[token]) {
      return this.installedVersions[token];
    }
    if (this.appDetails) {
      if (this.appDetails.installed) {
        return typeof this.appDetails.installed === 'string' ? this.appDetails.installed : (this.appDetails.installed[0]?.version || this.appDetails.version || '');
      }
      if (this.appDetails.version) {
        return this.appDetails.version;
      }
      return '';
    }
    if (this.loadingAppDetails || !this.appDetails) {
      return '...';
    }
    return '';
  },

  openAppInfo(item) {
    if (!item) return;
    this.selectedApp = item;
    this.showInfoPanel = true;
    this.appDetails = null;
    this.loadingAppDetails = true;

    window.ipc.getCaskInfo(item.token)
      .then((details) => {
        if (this.showInfoPanel && this.selectedApp?.token === item.token) {
          this.appDetails = details;
        }
      })
      .finally(() => {
        if (this.selectedApp?.token === item.token) {
          this.loadingAppDetails = false;
        }
      });
  },

  closeAppInfo() {
    this.showInfoPanel = false;
    setTimeout(() => {
      if (!this.showInfoPanel) {
        this.selectedApp = null;
        this.appDetails = null;
        this.loadingAppDetails = false;
      }
    }, 300);
  },

  getCategoryInfo(catName) {
    if (!catName) return { displayName: 'Other', icon: '', name: 'other' };
    let found = this.categoriesMap?.get(catName);
    if (!found && this.categories) {
      const lower = String(catName).toLowerCase().trim();
      found = this.categories.find((c) =>
        c.name?.toLowerCase() === lower ||
        c.displayName?.toLowerCase() === lower
      );
    }
    return found
      ? { displayName: this.__(found.displayName), icon: found.icon, name: found.name }
      : { displayName: this.__(catName), icon: '', name: catName };
  },

  getAppCategories(app) {
    if (!app) return [];
    const rawList = [app.category, app.secondCategory, app.thirdCategory].filter(Boolean);
    const result = [];
    const seen = new Set();
    for (const cat of rawList) {
      const info = this.getCategoryInfo(cat);
      if (info && !seen.has(info.displayName)) {
        seen.add(info.displayName);
        result.push(info);
      }
    }
    return result;
  },

  formatDate(dateVal) {
    if (!dateVal) return '';
    try {
      let d;
      let hasTime = true;
      if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
        const [y, m, day] = dateVal.trim().split('-').map(Number);
        d = new Date(y, m - 1, day);
        hasTime = false;
      } else {
        d = new Date(typeof dateVal === 'number' ? (dateVal > 1e11 ? dateVal : dateVal * 1000) : dateVal);
      }
      if (isNaN(d.getTime())) return String(dateVal);

      const now = new Date();
      const isSameDay = (d1, d2) => d1.toDateString() === d2.toDateString();
      const translate = typeof this.__ === 'function' ? this.__.bind(this) : (s => s);

      if (isSameDay(d, now)) {
        return hasTime
          ? translate('Today at %s').replace('%s', d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }))
          : translate('Today');
      }

      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      if (isSameDay(d, yesterday)) {
        return hasTime
          ? translate('Yesterday at %s').replace('%s', d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }))
          : translate('Yesterday');
      }

      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return String(dateVal);
    }
  },

  getCaskArtifacts() {
    const apps = [];
    const binaries = [];
    const fonts = [];

    if (this.appDetails?.artifacts) {
      for (const art of this.appDetails.artifacts) {
        if (art.app) apps.push(...art.app);
        if (art.font) {
          const fontList = Array.isArray(art.font) ? art.font : [art.font];
          for (const f of fontList) {
            const name = typeof f === 'string' ? f.split('/').pop() : (f?.target || '');
            if (name) fonts.push(name);
          }
        }
        if (art.binary) {
          for (const b of art.binary) {
            const name = typeof b === 'string' ? b.split('/').pop() : (b.target || '');
            if (name) binaries.push(name);
          }
        }
      }
    } else if (this.selectedApp?.app) {
      apps.push(this.selectedApp.app);
    }

    return { apps, binaries, fonts };
  },

  getProvidesList() {
    const { apps, binaries, fonts } = this.getCaskArtifacts();
    const list = [];
    for (const name of apps) list.push({ type: 'app', name, typeLabel: this.__('App') });
    for (const name of binaries) list.push({ type: 'binary', name, typeLabel: this.__('Command') });
    for (const name of fonts) list.push({ type: 'font', name, typeLabel: this.__('Font') });
    return list;
  },

  getCaskRequirements() {
    const macos = this.appDetails?.depends_on?.macos;
    if (!macos) return null;
    if (typeof macos === 'string') return `macOS ${macos}`;
    if (Array.isArray(macos)) return `macOS ${macos.join(', ')}`;
    if (typeof macos === 'object') {
      const entries = Object.entries(macos);
      if (entries.length === 0) return 'macOS';
      return `macOS ${entries.map(([op, val]) => `${op} ${Array.isArray(val) ? val.join(', ') : val}`).join(', ')}`;
    }
    return 'macOS';
  },

  formatCountK(count) {
    if (!count || isNaN(count)) return '0';
    const num = Number(count);
    if (num < 1000) return num.toLocaleString();
    if (num < 10000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    if (num < 1000000) return `${Math.round(num / 1000).toLocaleString()}k`;
    return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  },

  isRequirementMet() {
    const macos = this.appDetails?.depends_on?.macos;
    if (macos === undefined || macos === null) {
      return (window.ipc?.platform || 'darwin') === 'darwin';
    }
    if ((window.ipc?.platform || 'darwin') !== 'darwin') return false;

    const sysVer = window.ipc?.systemVersion;
    if (!sysVer) return true;

    const codeNames = {
      high_sierra: '10.13', mojave: '10.14', catalina: '10.15',
      big_sur: '11', monterey: '12', ventura: '13', sonoma: '14', sequoia: '15', tahoe: '16'
    };

    const parseVer = (v) => {
      if (!v) return [0];
      const clean = String(v).replace(/^[:]/, '').toLowerCase().trim();
      return (codeNames[clean] || clean).split('.').map((n) => parseInt(n, 10) || 0);
    };

    const compareVer = (v1, v2) => {
      const p1 = parseVer(v1), p2 = parseVer(v2);
      const len = Math.max(p1.length, p2.length);
      for (let i = 0; i < len; i++) {
        const a = p1[i] || 0, b = p2[i] || 0;
        if (a !== b) return a > b ? 1 : -1;
      }
      return 0;
    };

    const sysMajor = parseVer(sysVer)[0];
    const rules = [];

    if (typeof macos === 'object' && !Array.isArray(macos)) {
      for (const [op, targets] of Object.entries(macos)) {
        for (const t of (Array.isArray(targets) ? targets : [targets])) {
          rules.push([op, t]);
        }
      }
    } else {
      for (const req of (Array.isArray(macos) ? macos : [macos])) {
        if (typeof req !== 'string') continue;
        const match = req.match(/^(>=|<=|>|<|==|=)?\s*(.*)$/);
        if (match && match[2]) rules.push([match[1] || '>=', match[2]]);
      }
    }

    for (const [op, target] of rules) {
      if (op === '>=' && compareVer(sysVer, target) < 0) return false;
      if (op === '>' && compareVer(sysVer, target) <= 0) return false;
      if (op === '<=' && compareVer(sysVer, target) > 0) return false;
      if (op === '<' && compareVer(sysVer, target) >= 0) return false;
      if (op === '==' || op === '=') {
        const tParts = parseVer(target);
        if (tParts.length === 1 ? sysMajor !== tParts[0] : compareVer(sysVer, target) !== 0) return false;
      }
    }
    return true;
  },

  getCaskSourceUrl() {
    const path = this.appDetails?.ruby_source_path;
    if (path) return `https://github.com/Homebrew/homebrew-cask/blob/HEAD/${path}`;
    if (this.selectedApp?.token) {
      return `https://github.com/Homebrew/homebrew-cask/blob/HEAD/Casks/${this.selectedApp.token.charAt(0)}/${this.selectedApp.token}.rb`;
    }
    return null;
  }
});

// Close info panel or sidebar drawer on Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !window.shell?.showPasswordModal) {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (window.shell?.showInfoPanel) {
      e.preventDefault();
      window.shell.closeAppInfo();
    } else if (window.shell?.showSidebar && window.innerWidth <= 560) {
      e.preventDefault();
      window.shell.showSidebar = false;
    }
  }
});

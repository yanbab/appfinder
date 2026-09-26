// Info Panel Component Extension
Object.assign(window.shell, {
  selectedApp: null,
  showInfoPanel: false,
  appDetails: null,
  loadingAppDetails: false,
  loadingSizes: false,
  infoCache: new Map(),

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

    const token = item.token;
    const cached = this.infoCache.get(token);

    if (cached) {
      this.appDetails = cached;
      this.loadingAppDetails = false;
      if (cached.downloadSize !== undefined) {
        this.loadingSizes = false;
        return;
      }
      this.loadingSizes = true;
    } else {
      this.appDetails = null;
      this.loadingAppDetails = true;
      this.loadingSizes = true;

      window.ipc.getCaskInfo(token)
        .then((details) => {
          const res = details || {};
          const current = this.infoCache.get(token) || {};
          const merged = { ...current, ...res };
          this.infoCache.set(token, merged);
          if (this.showInfoPanel && this.selectedApp?.token === token) {
            this.appDetails = merged;
          }
        })
        .finally(() => {
          if (this.selectedApp?.token === token) {
            this.loadingAppDetails = false;
          }
        });
    }

    window.ipc.getCaskSizes(token)
      .then((sizes) => {
        if (sizes) {
          const current = this.infoCache.get(token) || this.appDetails || {};
          const merged = {
            ...current,
            downloadSize: sizes.downloadSize,
            installedSize: sizes.installedSize,
            dataSize: sizes.dataSize
          };
          this.infoCache.set(token, merged);
          if (this.showInfoPanel && this.selectedApp?.token === token) {
            this.appDetails = merged;
          }
        }
      })
      .finally(() => {
        if (this.selectedApp?.token === token) {
          this.loadingSizes = false;
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
        this.loadingSizes = false;
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
  }
});

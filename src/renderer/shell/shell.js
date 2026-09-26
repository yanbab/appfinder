// Renderer Shell

window.shell = {
    search: "",
    categories: [],
    order: "popularity",
    currentTab: "discover",
    showLoading: true,
    showSidebar: window.innerWidth > 560,
    showAllCategories: false,
    catalog: {},

    // Catalog & collection state
    items: [],
    displayedItems: [],
    _filteredList: [],
    installed: [],
    installedVersions: {},
    installedLoaded: false,
    outdatedMap: {},
    runningTasks: {},
    filteredCount: 0,
    updates: 0,
    allAppsCount: 0,
    isRefreshing: false,

    // Infinite scroll pagination
    displayedCount: 50,
    chunkSize: 50,
    _pendingTabChange: false,

    // Password modal state
    showPasswordModal: false,
    passwordValue: "",
    caskName: "",
    caskIcon: "",
    caskToken: "",
    caskAction: "",

    // Icon loading maps
    showInitialsMap: {},

    // Formatters delegated to ShellUtils for template compatibility
    getAppName(item) { return window.ShellUtils.getAppName(item); },
    name2initials(name) { return window.ShellUtils.name2initials(name); },
    name2color(name) { return window.ShellUtils.name2color(name); },
    formatAccentColor(color) { return window.ShellUtils.formatAccentColor(color); },
    formatVersion(v) { return window.ShellUtils.formatVersion(v); },

    async init() {
        this.initI18n();
        this.initStyles();
        this.initUI();
        this.initIPC();
        if (this.initTasks) this.initTasks();

        window.shell = this;

        // Categories (alphabetized, fonts and other placed appropriately)
        window.ipc.getCategories().then((cats) => {
            this.categoriesMap = new Map(cats.map(c => [c.name, c]));
            this.categories = this.sortCategories(cats);
            this.updateDocumentTitle();
        });

        // Applications
        window.ipc.getCasks().then((casks) => {
            this.items = Object.freeze(casks);
            this.allAppsCount = casks.filter(c => c.category !== 'font').length;
            this.showLoading = false;
            if (this.updateDiscoverItems) this.updateDiscoverItems();
            this.applyFilterAndSort();
        });

        // Status check & context menu
        setTimeout(() => this.refreshStatus(), 50);
        if (window.ContextMenu) window.ContextMenu.init(this);
    },

    initUI() {
        this.$watch('search', (val) => {
            this.resetScroll();
            if (val && val.trim() && this.currentTab === 'discover') {
                this.currentTab = 'all-apps';
            }
            this.applyFilterAndSort();
        });

        this.$watch('order', () => {
            this.resetScroll();
            this.applyFilterAndSort();
        });

        this.$watch('currentTab', () => {
            this.updateDocumentTitle();
        });
    },
    initIPC() {
        this.$watch('showSidebar', (val) => {
            if (window.ipc?.sidebarChanged) {
                window.ipc.sidebarChanged(val);
            }
        });
        if (window.ipc?.sidebarChanged) {
            window.ipc.sidebarChanged(this.showSidebar);
        }

        if (window.ipc?.onSelectTab) {
            window.ipc.onSelectTab((tab) => {
                if (this.showPasswordModal) return;
                if (this.showInfoPanel) this.closeAppInfo();
                this.selectTab(tab);
            });
        }

        if (window.ipc?.onFocusSearch) {
            window.ipc.onFocusSearch(() => {
                if (this.showPasswordModal) return;
                if (this.showInfoPanel) this.closeAppInfo();
                this.focusSearch(true);
            });
        }

        if (window.ipc?.onCheckUpdates) {
            window.ipc.onCheckUpdates(() => {
                if (this.showPasswordModal) return;
                if (this.showInfoPanel) this.closeAppInfo();
                this.selectTab('updates');
                if (!this.runningTasks['refresh']) {
                    this.startAction('refresh', 'refresh');
                }
            });
        }

        if (window.ipc?.onSetOrder) {
            window.ipc.onSetOrder((order) => {
                if (this.showPasswordModal) return;
                if (this.currentTab === 'discover' || this.currentTab === 'updates') {
                    if (this.showInfoPanel) this.closeAppInfo();
                    this.selectTab('all-apps');
                }
                this.order = order;
            });
        }

        if (window.ipc?.onToggleSidebar) {
            window.ipc.onToggleSidebar((show) => {
                if (this.showPasswordModal) return;
                this.showSidebar = (typeof show === 'boolean') ? show : !this.showSidebar;
            });
        }

        if (window.ipc?.onUpdatesRefreshed) {
            window.ipc.onUpdatesRefreshed((data) => {
                this.setUpdates(data);
            });
        }
    },

    sortCategories(cats) {
        return Object.freeze([...cats].sort((a, b) => {
            if (a.name === 'other') return 1;
            if (b.name === 'other') return -1;
            if (a.name === 'font') return 1;
            if (b.name === 'font') return -1;
            return this.__(a.displayName).localeCompare(this.__(b.displayName));
        }));
    },

    setStatusMessage(msg) {
        if (!this.activeTaskId) {
            this.drawerTitle = msg;
        }
    },

    clearStatusMessage() {
        if (!this.activeTaskId) {
            this.drawerTitle = "";
        }
    },

    setInstalled(data = {}) {
        this.installed = Array.isArray(data) ? data : (data.tokens || data.list || []);
        this.installedVersions = data.versions || {};
        this.installedLoaded = true;
        if (this.currentTab === 'installed' || this.currentTab === 'updates') {
            this.applyFilterAndSort();
        }
    },

    setUpdates(data = {}) {
        const casks = data?.casks || (Array.isArray(data) ? data : []);
        const outdatedMap = {};
        for (const item of casks) {
            const token = item.token || item.name;
            outdatedMap[token] = {
                installedVersion: item.installed_versions?.[0] || item.installed_version || null,
                currentVersion: item.current_version || item.latest_version
            };
        }
        this.outdatedMap = outdatedMap;
        this.updates = Object.keys(outdatedMap).length;
        this.lastCheckedTime = new Date();
        if (this.currentTab === 'updates') {
            this.applyFilterAndSort();
        }
    },

    getStatusDefaultText() {
        const count = this.updates || 0;
        const updateText = count > 0
            ? (count === 1 ? this.__('1 update available') : this.__('%d updates available').replace('%d', count))
            : this.__('Up to date');

        if (!this.lastCheckedTime) {
            return updateText;
        }
        const timeStr = this.lastCheckedTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const lastCheckedStr = this.__('Last checked %s').replace('%s', timeStr);
        return `${updateText} • ${lastCheckedStr}`;
    },

    async refreshInstalled() {
        this.isRefreshing = true;
        this.setStatusMessage(this.__('Checking installed applications...'));
        try {
            this.setInstalled(await window.ipc.getInstalled());
        } catch (e) {
            console.error('Failed to get installed casks:', e);
        } finally {
            this.clearStatusMessage();
            this.isRefreshing = false;
        }
    },

    async refreshUpdates() {
        this.isRefreshing = true;
        this.setStatusMessage(this.__('Checking for updates...'));
        try {
            this.setUpdates(await window.ipc.getUpdates(true));
        } catch (e) {
            console.error('Failed to check updates:', e);
        } finally {
            this.clearStatusMessage();
            this.isRefreshing = false;
        }
    },

    async refreshStatus(forceUpdates = false) {
        if (forceUpdates) return this.refreshUpdates();
        this.isRefreshing = true;
        this.setStatusMessage(this.__('Checking installed applications...'));
        try {
            const [installed, updates] = await Promise.all([
                window.ipc.getInstalled(),
                window.ipc.getUpdates(false)
            ]);
            this.setInstalled(installed);
            this.setUpdates(updates);
        } catch (e) {
            console.error('Failed to get brew status:', e);
        } finally {
            this.clearStatusMessage();
            this.isRefreshing = false;
        }
    },

    applyFilterAndSort() {
        let list = [];
        const tab = this.currentTab;

        if (tab === 'discover') {
            list = this.items.filter(c => c.count > 0);
        } else if (tab === 'all-apps') {
            list = this.items.filter(c => c.category !== 'font');
        } else if (tab === 'installed') {
            list = this.items.filter(c => this.installed.includes(c.token));
        } else if (tab === 'updates') {
            list = this.items.filter(c => this.outdatedMap[c.token] !== undefined);
        } else {
            const catObj = this.categoriesMap?.get(tab);
            const targetName = tab.toLowerCase();
            const targetDisplay = (catObj?.displayName || '').toLowerCase();

            list = this.items.filter(item => {
                const itemCats = [item.category, item.secondCategory, item.thirdCategory, item.secondaryCategory, ...(item.categories || [])];
                return itemCats.some(c => {
                    if (!c) return false;
                    const s = String(c).toLowerCase().trim();
                    if (s === targetName || (targetDisplay && s === targetDisplay)) return true;
                    const m = this.categoriesMap?.get(s);
                    return m && (m.name?.toLowerCase() === targetName || (targetDisplay && m.displayName?.toLowerCase() === targetDisplay));
                });
            });
        }

        // Substring search & sort
        if (this.search && this.search.trim()) {
            const q = this.search.trim().toLowerCase();
            list = list.filter(c =>
                (c.name && c.name.toLowerCase().includes(q)) ||
                (c.token && c.token.toLowerCase().includes(q)) ||
                (c.app && c.app.toLowerCase().includes(q)) ||
                (c.desc && c.desc.toLowerCase().includes(q))
            );
            list.sort((a, b) => {
                const aName = (a.name || a.token).toLowerCase();
                const bName = (b.name || b.token).toLowerCase();
                const aStarts = aName.startsWith(q) || a.token.toLowerCase().startsWith(q);
                const bStarts = bName.startsWith(q) || b.token.toLowerCase().startsWith(q);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                if (this.order === 'popularity') return (b.count || 0) - (a.count || 0);
                if (this.order === 'date') return (b.added || '').localeCompare(a.added || '');
                return aName.localeCompare(bName);
            });
        } else {
            if (this.order === 'popularity') {
                list.sort((a, b) => (b.count || 0) - (a.count || 0));
            } else if (this.order === 'date') {
                list.sort((a, b) => (b.added || '').localeCompare(a.added || ''));
            } else if (this.order === 'name') {
                list.sort((a, b) => (a.name || a.token).localeCompare(b.name || b.token));
            }
        }

        this._filteredList = list;
        this.filteredCount = list.length;
        this.displayedItems = list.slice(0, this.displayedCount);
    },

    resetScroll() {
        this.displayedCount = this.chunkSize || 50;
        const el = document.getElementById('apps-container');
        if (el) el.scrollTop = 0;
    },

    handleScroll(e) {
        const el = e.target;
        if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 250) {
            if (this.displayedItems.length < this.filteredCount) {
                this.displayedCount += this.chunkSize || 50;
                this.displayedItems = this._filteredList.slice(0, this.displayedCount);
            }
        }
    },

    selectTab(tab) {
        if (this.currentTab === tab) return;
        this.currentTab = tab;
        this.resetScroll();
        if (window.innerWidth <= 560) this.showSidebar = false;
        this.applyFilterAndSort();
    },

    initStyles() {
        window.addEventListener('blur', () => document.body.classList.add('blur'));
        window.addEventListener('focus', () => document.body.classList.remove('blur'));
        let resizeTimer = null;
        window.addEventListener('resize', () => {
            document.body.classList.add('is-resizing');
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                document.body.classList.remove('is-resizing');
            }, 100);
        });
        const setAccent = (c) => c && document.documentElement.style.setProperty('--accent-color-raw', this.formatAccentColor(c));
        window.ipc.getAccentColor().then(setAccent);
        window.ipc.onAccentColorChanged(setAccent);
    },

    initI18n() {
        const updateTranslations = (catalog) => {
            this.catalog = catalog || {};
            document.documentElement.dir = this.catalog._languageDirection === 'rtl' ? 'rtl' : 'ltr';

            document.querySelectorAll('[data-i18n]').forEach((el) => {
                const key = el.getAttribute('data-i18n');
                if (key) el.textContent = this.__(key);
            });

            if (this.categories?.length) {
                this.categories = this.sortCategories(this.categories);
            }
            this.updateDocumentTitle();
        };

        window.ipc.getTranslations().then(updateTranslations);
        if (window.ipc?.onI18nChanged) {
            window.ipc.onI18nChanged(() => window.ipc.getTranslations().then(updateTranslations));
        }
    },

    __(key, defaultValue) {
        if (!this.catalog) return defaultValue || key;
        return this.catalog[key] !== undefined ? this.catalog[key] : (defaultValue || key);
    },

    getPageTitle() {
        if (this.currentTab === 'discover') return this.__('Explore');
        if (this.currentTab === 'all-apps') return this.__('All Apps');
        if (this.currentTab === 'installed') return this.__('Installed');
        if (this.currentTab === 'updates') return this.__('Updates');
        const cat = this.categories?.find(c => c.name === this.currentTab);
        return cat ? this.__(cat.displayName) : this.__('Explore');
    },

    updateDocumentTitle() {
        const categoryName = this.getPageTitle();
        document.title = categoryName ? `AppFinder - ${categoryName}` : 'AppFinder';
    }
};

document.addEventListener('alpine:init', () => {
    Alpine.data('shell', () => window.shell);
});
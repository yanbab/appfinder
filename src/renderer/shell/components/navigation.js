// Keyboard Navigation and Focus Management Extension
Object.assign(window.shell, {
    focusSearch(select = false) {
        if (this.showPasswordModal) return;
        if (this.showInfoPanel) this.closeAppInfo();
        if (!this.showSidebar) this.showSidebar = true;
        const el = this.$refs?.search || document.getElementById('search-input');
        if (el) {
            if (this.search !== undefined && el.value !== this.search) {
                el.value = this.search;
            }
            el.focus();
            if (select) {
                el.select();
            } else if (typeof el.setSelectionRange === 'function') {
                const len = el.value.length;
                el.setSelectionRange(len, len);
            }
        }
    },

    focusLastCard() {
        if (this.displayedItems.length < this.filteredCount) {
            this.displayedCount = this.filteredCount;
            this.displayedItems = this._filteredList.slice(0, this.displayedCount);
            this.$nextTick(() => {
                const updatedCards = Array.from(document.querySelectorAll('.apps-viewport .app-card'));
                if (updatedCards.length > 0) {
                    const last = updatedCards[updatedCards.length - 1];
                    last.focus();
                    last.scrollIntoView({ block: 'nearest', behavior: 'auto' });
                }
            });
        } else {
            const cards = Array.from(document.querySelectorAll('.apps-viewport .app-card'));
            if (cards.length > 0) {
                const last = cards[cards.length - 1];
                last.focus();
                last.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            }
        }
    },

    handleAppListNavigation(e) {
        if (this.showPasswordModal || this.showInfoPanel) return false;
        if (this.currentTab === 'discover' || this.filteredCount === 0) return false;

        const activeEl = document.activeElement;
        const searchEl = this.$refs?.search || document.getElementById('search-input');
        const isSearch = activeEl && (activeEl === searchEl || activeEl.id === 'search-input');
        const activeCard = activeEl ? activeEl.closest('.app-card') : null;

        // From search input: ArrowDown moves into first app card
        if (isSearch) {
            if (e.key === 'ArrowDown' && !e.metaKey && !e.altKey && !e.ctrlKey) {
                const firstCard = document.querySelector('.apps-viewport .app-card');
                if (firstCard) {
                    e.preventDefault();
                    firstCard.focus();
                    firstCard.scrollIntoView({ block: 'nearest', behavior: 'auto' });
                    return true;
                }
            }
            return false;
        }

        // If focus is on an app card
        if (activeCard) {
            const cards = Array.from(document.querySelectorAll('.apps-viewport .app-card'));
            const currentIndex = cards.indexOf(activeCard);
            if (currentIndex === -1) return false;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (e.metaKey) {
                    this.focusLastCard();
                } else if (currentIndex < cards.length - 1) {
                    cards[currentIndex + 1].focus();
                    cards[currentIndex + 1].scrollIntoView({ block: 'nearest', behavior: 'auto' });
                } else if (this.displayedItems.length < this.filteredCount) {
                    this.displayedCount += this.chunkSize || 50;
                    this.displayedItems = this._filteredList.slice(0, this.displayedCount);
                    this.$nextTick(() => {
                        const updatedCards = Array.from(document.querySelectorAll('.apps-viewport .app-card'));
                        if (updatedCards[currentIndex + 1]) {
                            updatedCards[currentIndex + 1].focus();
                            updatedCards[currentIndex + 1].scrollIntoView({ block: 'nearest', behavior: 'auto' });
                        }
                    });
                }
                return true;
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (e.metaKey) {
                    if (cards[0]) {
                        cards[0].focus();
                        cards[0].scrollIntoView({ block: 'nearest', behavior: 'auto' });
                    }
                } else if (currentIndex > 0) {
                    cards[currentIndex - 1].focus();
                    cards[currentIndex - 1].scrollIntoView({ block: 'nearest', behavior: 'auto' });
                } else {
                    this.focusSearch(false);
                }
                return true;
            }

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                const token = activeCard.dataset.token;
                const item = this.displayedItems.find(c => c.token === token);
                if (item) this.openAppInfo(item);
                return true;
            }

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const sidebarActive = document.getElementById('menu-' + this.currentTab);
                if (sidebarActive) {
                    sidebarActive.focus();
                }
                return true;
            }

            if (e.key === 'PageDown') {
                e.preventDefault();
                const targetIndex = currentIndex + 5;
                if (targetIndex < cards.length) {
                    cards[targetIndex].focus();
                    cards[targetIndex].scrollIntoView({ block: 'nearest', behavior: 'auto' });
                } else if (this.displayedItems.length < this.filteredCount) {
                    this.displayedCount = Math.min(this.filteredCount, this.displayedCount + (this.chunkSize || 50));
                    this.displayedItems = this._filteredList.slice(0, this.displayedCount);
                    this.$nextTick(() => {
                        const updatedCards = Array.from(document.querySelectorAll('.apps-viewport .app-card'));
                        const nextTarget = Math.min(updatedCards.length - 1, targetIndex);
                        if (updatedCards[nextTarget]) {
                            updatedCards[nextTarget].focus();
                            updatedCards[nextTarget].scrollIntoView({ block: 'nearest', behavior: 'auto' });
                        }
                    });
                } else if (cards.length > 0) {
                    cards[cards.length - 1].focus();
                    cards[cards.length - 1].scrollIntoView({ block: 'nearest', behavior: 'auto' });
                }
                return true;
            }

            if (e.key === 'PageUp') {
                e.preventDefault();
                const targetIndex = Math.max(0, currentIndex - 5);
                if (cards[targetIndex]) {
                    cards[targetIndex].focus();
                    cards[targetIndex].scrollIntoView({ block: 'nearest', behavior: 'auto' });
                }
                return true;
            }

            if (e.key === 'Home') {
                e.preventDefault();
                if (cards[0]) {
                    cards[0].focus();
                    cards[0].scrollIntoView({ block: 'nearest', behavior: 'auto' });
                }
                return true;
            }

            if (e.key === 'End') {
                e.preventDefault();
                this.focusLastCard();
                return true;
            }
        }

        return false;
    }
});

// Global keyboard shortcuts and navigation
window.addEventListener('keydown', (e) => {
    const store = window.shell;
    if (!store || store.showPasswordModal) return;

    const searchEl = store.$refs?.search || document.getElementById('search-input');
    const isOtherInput = document.activeElement && document.activeElement !== searchEl &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable);
    const isInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
    const isKey = !e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1 && e.key !== ' ';

    // App list keyboard navigation
    if (store.handleAppListNavigation(e)) {
        return;
    }

    // Sidebar navigation when focus is inside sidebar
    const activeEl = document.activeElement;
    const isSidebar = activeEl && (activeEl.closest('.app-sidebar') || activeEl.classList.contains('menu-item'));
    if (isSidebar) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (store.showInfoPanel) store.closeAppInfo();
            const tabs = ['discover', 'all-apps', 'installed', 'updates', ...(store.categories || []).map(c => c.name)];
            const currentIndex = tabs.indexOf(store.currentTab);
            const nextIndex = e.key === 'ArrowDown'
                ? (currentIndex >= 0 ? Math.min(tabs.length - 1, currentIndex + 1) : 0)
                : (currentIndex >= 0 ? Math.max(0, currentIndex - 1) : 0);

            if (nextIndex !== currentIndex && tabs[nextIndex]) {
                store.selectTab(tabs[nextIndex]);
                const itemEl = document.getElementById('menu-' + tabs[nextIndex]);
                if (itemEl) {
                    itemEl.focus();
                    if (typeof itemEl.scrollIntoView === 'function') {
                        itemEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
                    }
                }
            }
            return;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const firstCard = document.querySelector('.apps-viewport .app-card');
            if (firstCard) {
                firstCard.focus();
                firstCard.scrollIntoView({ block: 'nearest', behavior: 'auto' });
            } else {
                store.focusSearch(false);
            }
            return;
        }
    }

    // ArrowDown when not in input and on an app list tab
    if (!isInput && !activeEl?.closest('.app-card') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        if (store.currentTab !== 'discover' && store.displayedItems.length > 0) {
            const firstCard = document.querySelector('.apps-viewport .app-card');
            if (firstCard) {
                e.preventDefault();
                firstCard.focus();
                firstCard.scrollIntoView({ block: 'nearest', behavior: 'auto' });
                return;
            }
        }
    }

    if (e.key === 'Escape') {
        if (isInput) {
            store.search = '';
        }
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
        }
        return;
    }

    if (!isInput && isKey) {
        e.preventDefault();
        if (store.showInfoPanel) store.closeAppInfo();
        store.search = (store.search || '') + e.key;
        if (store.currentTab === 'discover') {
            store.currentTab = 'all-apps';
        }
        store.focusSearch(false);
    }
});

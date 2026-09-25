// Context menu handler for search input and app cards

window.ContextMenu = {
    init(store) {
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();

            const selection = window.getSelection();
            const selectedText = selection ? selection.toString().trim() : '';

            const searchInput = e.target.closest('#search-input') || (e.target.tagName === 'INPUT' ? e.target : null);
            const link = e.target.closest('a[href]:not([href="#"]):not([href^="javascript:"])');
            const selectableEl = e.target.closest('.info-app-title, .info-app-desc, .info-app-version, .info-caveats-text');
            const card = e.target.closest('.app-card') || e.target.closest('.top-installed-card') || e.target.closest('.featured-slide-card') || e.target.closest('.featured-slide');
            const inInfoPanel = e.target.closest('.info-panel');

            let type = 'other';
            let appInfo = null;
            let linkUrl = null;
            let targetText = selectedText;

            if (searchInput) {
                type = 'search';
                searchInput.focus();
            } else if (link) {
                type = 'link';
                linkUrl = link.href;
            } else if (targetText.length > 0) {
                type = 'text';
            } else if (selectableEl) {
                type = 'text';
                targetText = selectableEl.textContent.trim();
            } else if (inInfoPanel) {
                // No context menu on info panel for non-selectable elements
                type = 'other';
            } else if (card) {
                const token = card.dataset.token || (card.getAttribute && card.getAttribute('data-token'));
                if (token) {
                    type = 'app';
                    const isInstalled = store.installed.includes(token);
                    const isOutdated = store.outdatedMap && store.outdatedMap[token] !== undefined;
                    const isRunning = !!(store.runningTasks && store.runningTasks[token]);
                    const item = store.items.find(i => i.token === token);
                    const name = item ? store.getAppName(item) : token;

                    appInfo = {
                        token,
                        name,
                        app: item ? item.app : null,
                        homepage: item ? item.homepage : null,
                        isInstalled,
                        isOutdated,
                        isRunning
                    };
                }
            }

            window.ipc.showContextMenu({
                type,
                appInfo,
                linkUrl,
                selectedText: targetText,
                x: e.clientX,
                y: e.clientY
            });
        });

        window.ipc.onContextMenuAction(async ({ action, token }) => {
            if (action && token && store.startAction) {
                await store.startAction(action, token);
            }
        });
    }
};

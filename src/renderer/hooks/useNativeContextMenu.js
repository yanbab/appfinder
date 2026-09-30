import { useEffect } from 'react';
import { useShell } from '@/hooks/useShell';
import { getAppName } from '@/hooks/utils';

export function useNativeContextMenu() {
  const { items, installed, outdatedMap, runningTasks, startAction } = useShell();

  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();

      const selection = window.getSelection();
      const selectedText = selection ? selection.toString().trim() : '';

      const searchInput = e.target.closest('#search-input') || (e.target.tagName === 'INPUT' ? e.target : null);
      const link = e.target.closest('a[href]:not([href="#"]):not([href^="javascript:"])');
      const selectableEl = e.target.closest('.selectable-text, .info-app-title, .info-app-desc, .info-app-version, .info-caveats-text');
      const card = e.target.closest('[data-token]');
      const inInfoDrawer = e.target.closest('[data-drawer-content]');

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
      } else if (inInfoDrawer && !card) {
        type = 'other';
      } else if (card) {
        const token = card.dataset.token || (card.getAttribute && card.getAttribute('data-token'));
        if (token) {
          type = 'app';
          const isInstalled = installed.includes(token);
          const isOutdated = Boolean(outdatedMap[token]);
          const isRunning = Boolean(runningTasks[token]);
          const item = items.find((i) => i.token === token);
          const name = item ? getAppName(item) : token;

          appInfo = {
            token,
            name,
            app: item ? item.app : null,
            homepage: item ? item.homepage : null,
            isInstalled,
            isOutdated,
            isRunning,
          };
        }
      }

      if (window.ipc?.showContextMenu) {
        window.ipc.showContextMenu({
          type,
          appInfo,
          linkUrl,
          selectedText: targetText,
          x: e.clientX,
          y: e.clientY,
        });
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, [items, installed, outdatedMap, runningTasks]);

  // Listen for context menu action triggers from Electron main process
  useEffect(() => {
    if (window.ipc?.onContextMenuAction) {
      const unsub = window.ipc.onContextMenuAction(async ({ action, token }) => {
        if (action && token && startAction) {
          await startAction(action, token);
        }
      });
      return () => unsub?.();
    }
  }, [startAction]);
}

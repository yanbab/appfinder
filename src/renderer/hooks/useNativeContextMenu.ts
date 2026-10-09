import { useEffect } from 'react';
import { useAppStore, useTermStore } from '@/stores';
import { getAppName } from '@/hooks/utils';
import type { CaskItem } from '@/types';

export function useNativeContextMenu() {
  const items = useAppStore((s) => s.items);
  const installed = useAppStore((s) => s.installed);
  const outdatedMap = useAppStore((s) => s.outdatedMap);
  const runningTasks = useTermStore((s) => s.runningTasks);
  const startAction = useTermStore((s) => s.startAction);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const selection = window.getSelection();
      const selectedText = selection ? selection.toString().trim() : '';

      const searchInput = (target.closest('#search-input') || (target.tagName === 'INPUT' ? target : null)) as HTMLElement | null;
      const link = (target.closest('a[href]:not([href="#"]):not([href^="javascript:"])') || target.closest('[data-external-url]')) as HTMLElement | null;
      const selectableEl = target.closest('.selectable-text, .info-app-title, .info-app-desc, .info-app-version, .info-caveats-text, .info-hero-block');
      const card = target.closest('[data-token]') as HTMLElement | null;
      const inInfoDrawer = target.closest('[data-drawer-content]');

      let type = 'other';
      let appInfo: any = null;
      let linkUrl: string | null = null;
      let targetText = selectedText;

      if (searchInput) {
        type = 'search';
        searchInput.focus();
      } else if (link) {
        type = 'link';
        linkUrl = (link as HTMLAnchorElement).href || link.getAttribute('data-external-url') || (link as any).dataset?.externalUrl || null;
      } else if (targetText.length > 0) {
        type = 'text';
      } else if (selectableEl) {
        type = 'text';
        targetText = selectableEl.textContent?.trim() || '';
      } else if (inInfoDrawer && !card) {
        type = 'other';
      } else if (card) {
        const token = card.dataset.token || card.getAttribute('data-token');
        if (token) {
          type = 'app';
          const isInstalled = installed.includes(token);
          const isOutdated = Boolean(outdatedMap[token]);
          const runningTaskAction = runningTasks[token];
          const isRunning = Boolean(runningTaskAction);
          const runningAction = runningTaskAction || undefined;
          const item = items.find((i: CaskItem) => i.token === token);
          const name = item ? getAppName(item) : token;

          appInfo = {
            token,
            name,
            app: item ? item.app : null,
            homepage: item ? item.homepage : null,
            isInstalled,
            isOutdated,
            isRunning,
            runningAction,
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

  useEffect(() => {
    if (window.ipc?.on) {
      const unsub = window.ipc.on('context-menu:action', async (data: any) => {
        const { action, token } = typeof data === 'object' && data ? data : { action: data, token: undefined };
        if (action && token && startAction) {
          await startAction(action, token);
        }
      });
      return () => unsub?.();
    }
  }, [startAction]);
}

export default useNativeContextMenu;

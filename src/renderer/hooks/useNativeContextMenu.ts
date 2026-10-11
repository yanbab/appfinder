import { useEffect } from 'react';
import { useAppStore, useShellStore, useTermStore } from '@/stores';
import { getAppName } from '@/hooks/utils';
import type { CaskItem } from '@/types';

export function useNativeContextMenu() {
  const items = useAppStore((s) => s.items);
  const installed = useAppStore((s) => s.installed);
  const outdatedMap = useAppStore((s) => s.outdatedMap);
  const serviceStatusMap = useAppStore((s) => s.serviceStatusMap);
  const selectedApp = useShellStore((s) => s.selectedApp);
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
      } else if (selectedText.length > 0) {
        type = 'text';
      } else if (card || (inInfoDrawer && selectedApp)) {
        const token = card?.dataset?.token || card?.getAttribute('data-token') || selectedApp?.token;
        if (token) {
          type = 'app';
          const item = items.find((i: CaskItem) => i.token === token) || (selectedApp?.token === token ? selectedApp : null);
          const isInstalled = installed.includes(token);
          const isOutdated = Boolean(outdatedMap[token]);
          const runningTaskAction = runningTasks[token];
          const isRunning = Boolean(runningTaskAction);
          const runningAction = runningTaskAction || undefined;
          const name = item ? getAppName(item) : token;
          const category = item?.category;
          const isFont = Boolean(category === 'font' || token.startsWith('font-'));
          const isService = Boolean(category === 'services');
          const isServiceRunning = serviceStatusMap[token]?.status === 'started';
          const canOpen = Boolean(item?.app);

          appInfo = {
            token,
            name,
            app: item ? item.app : null,
            homepage: item ? item.homepage : null,
            category,
            isInstalled,
            isOutdated,
            isRunning,
            runningAction,
            isFont,
            isService,
            isServiceRunning,
            canOpen,
          };
        }
      } else if (selectableEl) {
        type = 'text';
        targetText = selectableEl.textContent?.trim() || '';
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
  }, [items, installed, outdatedMap, runningTasks, serviceStatusMap, selectedApp]);

  useEffect(() => {
    if (window.ipc?.on) {
      const unsub = window.ipc.on('context-menu:action', async (data: any) => {
        const { action, token } = typeof data === 'object' && data ? data : { action: data, token: undefined };
        if (!action || !token) return;

        if (action === 'info') {
          useShellStore.getState().openAppInfo(token);
          return;
        }

        if (action === 'reveal') {
          const item = useAppStore.getState().items.find((i: CaskItem) => i.token === token);
          window.ipc?.revealApp?.(token, item?.app || undefined);
          return;
        }

        if (action === 'cancel') {
          useTermStore.getState().cancelAction();
          return;
        }

        if (action.startsWith('service-')) {
          const subAction = action.replace('service-', '');
          await window.ipc?.openApp?.(token, `service:${subAction}:${token}`);
          setTimeout(() => {
            useAppStore.getState().refreshServiceStatuses();
          }, 500);
          return;
        }

        if (startAction) {
          await startAction(action, token);
        }
      });
      return () => unsub?.();
    }
  }, [startAction]);
}

export default useNativeContextMenu;


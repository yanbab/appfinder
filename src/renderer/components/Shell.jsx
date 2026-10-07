import React from 'react';
import { useShellStore, useAppStore } from '@/stores';
import {
  Sidebar,
  TitleBar,
  StatusBar,
  InfoPanel,
  PasswordModal,
  Console,
} from '@/components/shell/views';
import { Discover, AppList, AppListUpdates } from '@/components/shell/pages';

import { useNativeContextMenu } from '@/hooks/useNativeContextMenu';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';

export function Shell() {
  const currentTab = useShellStore((s) => s.currentTab);
  const showTerminal = useShellStore((s) => s.showTerminal);
  const search = useAppStore((s) => s.search);

  // Keyboard navigation & Native context menus
  useKeyboardNav();
  useNativeContextMenu();

  const isDiscover = currentTab === 'discover' && (!search || !search.trim());

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-transparent text-foreground font-sans select-none antialiased">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative bg-transparent">
        <TitleBar />
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
          {isDiscover ? (
            <Discover />
          ) : currentTab === 'updates' ? (
            <AppListUpdates />
          ) : (
            <AppList />
          )}
        </div>
        <StatusBar />
        {showTerminal && <Console />}
      </main>
      <InfoPanel />
      <PasswordModal />
    </div>
  );
}

// Backward-compatible alias
export const App = Shell;
export default Shell;

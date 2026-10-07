import React from 'react';
import { useShellStore, useAppStore } from '@/stores';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { StatusBar } from './StatusBar';
import { InfoPanel } from './InfoPanel';
import { PasswordModal } from './PasswordModal';
import { Console } from './Console';
import { Discover } from './Discover';
import { AppList } from './AppList';
import { AppListUpdates } from './AppListUpdates';

import { useNativeContextMenu } from '@/hooks/useNativeContextMenu';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';

export function ShellWindow(): React.JSX.Element {
  const currentTab = useShellStore((s) => s.currentTab);
  const showTerminal = useShellStore((s) => s.showTerminal);
  const search = useAppStore((s) => s.search);

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

export default ShellWindow;

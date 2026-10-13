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
import { Button } from './Button';
import { ShellIcon } from './ShellIcon';

import { useNativeContextMenu } from '@/hooks/useNativeContextMenu';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';

export function ShellWindow(): React.JSX.Element {
  const currentTab = useShellStore((s) => s.currentTab);
  const showSidebar = useShellStore((s) => s.showSidebar);
  const toggleSidebar = useShellStore((s) => s.toggleSidebar);
  const showTerminal = useShellStore((s) => s.showTerminal);
  const __ = useShellStore((s) => s.__);
  const search = useAppStore((s) => s.search);

  useKeyboardNav();
  useNativeContextMenu();

  const isDiscover = currentTab === 'discover' && (!search || !search.trim());

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-transparent text-foreground font-sans select-none antialiased relative">
      {/* Stationary Sidebar Toggle Button positioned with ample clearance from traffic lights */}
      <div
        className="fixed top-0 left-[88px] h-[52px] flex items-center z-50 sidebar-toggle-fixed [-webkit-app-region:no-drag]"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Button
          icon={<ShellIcon name="sidebar.left" className="size-5" />}
          onClick={toggleSidebar}
          className="size-7 p-0 shrink-0 cursor-default [-webkit-app-region:no-drag]"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          title={showSidebar ? __("Hide categories") : __("Show categories")}
        />
      </div>

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

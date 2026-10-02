import React, { lazy, Suspense } from 'react';
import { useShell } from '@/hooks/useShell';
import {
  Sidebar,
  TitleBar,
  StatusBar,
  InfoPanel,
  PasswordModal,
} from '@/components/shell/views';
import { Discover, AppList, AppListUpdates } from '@/components/shell/pages';

import { useNativeContextMenu } from '@/hooks/useNativeContextMenu';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';

// Lazy-load terminal drawer with heavy xterm modules
const Console = lazy(() =>
  import('@/components/shell/views/Console').then((m) => ({ default: m.Console }))
);

export function Shell() {
  const { currentTab, search, showTerminal } = useShell();

  // Keyboard navigation & Native context menus
  useKeyboardNav();
  useNativeContextMenu();

  const isDiscover = currentTab === 'discover' && (!search || !search.trim());

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-transparent text-foreground font-sans select-none antialiased">
      {/* Full-height Sidebar with macOS Vibrancy */}
      <Sidebar />

      {/* Main Content Column */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative bg-background">
        <TitleBar />

        {/* View Switcher: Discover vs Updates vs List/Grid */}
        {isDiscover ? (
          <Discover />
        ) : currentTab === 'updates' ? (
          <AppListUpdates />
        ) : (
          <AppList />
        )}

        {/* Status Bar acting as Terminal Titlebar & Collapsible Terminal Drawer underneath */}
        <StatusBar />
        {showTerminal && (
          <Suspense fallback={null}>
            <Console />
          </Suspense>
        )}
      </main>

      {/* Slide-over Info Drawer */}
      <InfoPanel />

      {/* Password elevation modal */}
      <PasswordModal />
    </div>
  );
}

// Backward-compatible alias
export const App = Shell;
export default Shell;

import React from 'react';
import { useShell } from '@/hooks/useShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { TitleBar } from '@/components/layout/TitleBar';
import { StatusBar } from '@/components/layout/StatusBar';
import { TerminalDrawer } from '@/components/layout/TerminalDrawer';
import { DiscoverView } from '@/components/views/DiscoverView';
import { AppsListView } from '@/components/views/AppsListView';
import { InfoDrawer } from '@/components/views/InfoDrawer';
import { PasswordModal } from '@/components/modals/PasswordModal';
import { SettingsView } from '@/components/views/SettingsView';

import { useNativeContextMenu } from '@/hooks/useNativeContextMenu';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { useWindowBlur } from '@/hooks/useWindowBlur';
import { useWindowResize } from '@/hooks/useWindowResize';

export function App() {
  const { currentTab, search } = useShell();

  // Check if we are in Settings view
  const params = new URLSearchParams(window.location.search);
  const isSettings = params.get('view') === 'settings' || window.location.hash === '#settings';

  // Keyboard navigation, Native context menus, Focus & Resize handlers
  useKeyboardNav();
  useNativeContextMenu();
  useWindowBlur();
  useWindowResize();

  if (isSettings) {
    return <SettingsView />;
  }

  const isDiscover = currentTab === 'discover' && (!search || !search.trim());

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-transparent text-foreground font-sans select-none antialiased">
      {/* Full-height Sidebar with macOS Vibrancy */}
      <Sidebar />

      {/* Main Content Column */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative bg-background">
        <TitleBar />

        {/* View Switcher: Discover vs List/Grid */}
        {isDiscover ? <DiscoverView /> : <AppsListView />}

        {/* Status Bar acting as Terminal Titlebar & Collapsible Terminal Drawer underneath */}
        <StatusBar />
        <TerminalDrawer />
      </main>

      {/* Slide-over Info Drawer */}
      <InfoDrawer />

      {/* Password elevation modal */}
      <PasswordModal />
    </div>
  );
}

export default App;

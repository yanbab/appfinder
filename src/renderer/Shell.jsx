import React from 'react';
import { useShell } from '@/hooks/useShell';
import { CategoryList } from '@/components/shell/views/CategoryList';
import { TitleBar } from '@/components/shell/views/TitleBar';
import { StatusBar } from '@/components/shell/views/StatusBar';
import { Console } from '@/components/shell/views/Console';
import { Discover } from '@/components/shell/pages/Discover';
import { AppList } from '@/components/shell/pages/AppList';
import { InfoPanel } from '@/components/shell/views/InfoPanel';
import { PasswordModal } from '@/components/shell/views/PasswordModal';

import { useNativeContextMenu } from '@/hooks/useNativeContextMenu';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { useWindowBlur } from '@/hooks/useWindowBlur';
import { useWindowResize } from '@/hooks/useWindowResize';

export function Shell() {
  const { currentTab, search } = useShell();

  // Keyboard navigation, Native context menus, Focus & Resize handlers
  useKeyboardNav();
  useNativeContextMenu();
  useWindowBlur();
  useWindowResize();

  const isDiscover = currentTab === 'discover' && (!search || !search.trim());

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-transparent text-foreground font-sans select-none antialiased">
      {/* Full-height Sidebar with macOS Vibrancy */}
      <CategoryList />

      {/* Main Content Column */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative bg-background">
        <TitleBar />

        {/* View Switcher: Discover vs List/Grid */}
        {isDiscover ? <Discover /> : <AppList />}

        {/* Status Bar acting as Terminal Titlebar & Collapsible Terminal Drawer underneath */}
        <StatusBar />
        <Console />
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

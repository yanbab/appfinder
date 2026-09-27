import React, { useEffect } from 'react';
import { useShell } from '@/store/useShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { TitleBar } from '@/components/layout/TitleBar';
import { StatusBar } from '@/components/layout/StatusBar';
import { TerminalDrawer } from '@/components/layout/TerminalDrawer';
import { DiscoverView } from '@/components/views/DiscoverView';
import { AppsListView } from '@/components/views/AppsListView';
import { InfoDrawer } from '@/components/views/InfoDrawer';
import { PasswordModal } from '@/components/modals/PasswordModal';

export function App() {
  const { currentTab, search, closeAppInfo, selectedApp } = useShell();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+F or Ctrl+F -> Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isDiscover = currentTab === 'discover' && (!search || !search.trim());

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background text-foreground font-sans select-none antialiased">
      {/* Full-height Sidebar */}
      <Sidebar />

      {/* Main Content Column */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <TitleBar />

        {/* View Switcher: Discover vs List/Grid */}
        {isDiscover ? <DiscoverView /> : <AppsListView />}

        {/* Collapsible Terminal & Status Bar */}
        <TerminalDrawer />
        <StatusBar />
      </main>

      {/* Slide-over Info Drawer */}
      <InfoDrawer />

      {/* Password elevation modal */}
      <PasswordModal />
    </div>
  );
}

export default App;

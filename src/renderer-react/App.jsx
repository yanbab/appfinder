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
import { SettingsView } from '@/components/views/SettingsView';

export function App() {
  const { currentTab, search, setShowSidebar } = useShell();

  // Check if we are in Settings view
  const params = new URLSearchParams(window.location.search);
  const isSettings = params.get('view') === 'settings' || window.location.hash === '#settings';

  // Global keyboard shortcuts (for shell)
  useEffect(() => {
    if (isSettings) return;

    const handleKeyDown = (e) => {
      // Cmd+F or Ctrl+F -> Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSidebar?.(true);
        setTimeout(() => {
          const searchInput = document.getElementById('search-input');
          if (searchInput) {
            searchInput.focus();
            searchInput.select?.();
          }
        }, 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettings, setShowSidebar]);

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

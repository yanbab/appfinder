import React, { useEffect } from 'react';
import { useShell } from '@/hooks/useShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { TitleBar } from '@/components/layout/TitleBar';
import { StatusBar } from '@/components/layout/StatusBar';
import { TerminalDrawer } from '@/components/layout/TerminalDrawer';
import { DiscoverView } from '@/components/views/DiscoverView';
import { AppsListView } from '@/components/views/AppsListView';
import { InfoDrawer } from '@/components/views/InfoDrawer';
import { PasswordModal } from '@/components/layout/PasswordModal';

import { useNativeContextMenu } from '@/hooks/useNativeContextMenu';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';

export function ShellWindow() {
  const { currentTab, search } = useShell();

  // Keyboard navigation & Native context menus
  useKeyboardNav();
  useNativeContextMenu();

  // Window focus & blur class on body
  useEffect(() => {
    const handleFocus = () => document.body.classList.remove('window-blurred');
    const handleBlur = () => document.body.classList.add('window-blurred');
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    if (!document.hasFocus()) document.body.classList.add('window-blurred');
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Window resize debounce to suppress layout transitions
  useEffect(() => {
    let resizeTimer = null;
    const handleResize = () => {
      document.body.classList.add('is-resizing');
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        document.body.classList.remove('is-resizing');
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const isDiscover = currentTab === 'discover' && (!search || !search.trim());

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-transparent text-foreground font-sans select-none antialiased">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative bg-background">
        <TitleBar />
        {isDiscover ? <DiscoverView /> : <AppsListView />}
        <StatusBar />
        <TerminalDrawer />
      </main>
      <InfoDrawer />
      <PasswordModal />
    </div>
  );

}

export default ShellWindow;

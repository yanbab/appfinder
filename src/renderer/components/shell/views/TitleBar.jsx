import React from 'react';
import { useShell } from '@/hooks/useShell';
import { ShellButton, ShellIcon } from '@/components/shell/components';
import { LayoutGrid, List } from 'lucide-react';

export function TitleBar() {
  const {
    currentTab,
    categories,
    order,
    setOrder,
    viewMode,
    setViewMode,
    toggleSidebar,
    showSidebar,
    __,
  } = useShell();

  const getPageTitle = () => {
    if (currentTab === 'discover') return __('Explore');
    if (currentTab === 'all-apps') return __('All Apps');
    if (currentTab === 'installed') return __('Installed');
    if (currentTab === 'updates') return __('Updates');
    const cat = categories.find(c => c.name === currentTab);
    return cat ? __(cat.displayName) : __('Explore');
  };

  return (
    <header className="app-header h-[52px] shrink-0 flex items-center justify-between border-b border-border bg-background select-none [-webkit-app-region:drag] z-10 gap-3 px-3.5">
      {/* Left section: Sidebar toggle & Title with smooth traffic-light spacer */}
      <div className="flex items-center min-w-0 flex-1 h-full [-webkit-app-region:drag]">
        <div className={`shrink-0 transition-[width] duration-250 ease-out overflow-hidden ${showSidebar ? 'w-0' : 'w-[76px]'}`} />
        <div className="flex items-center gap-2 min-w-0 flex-1 h-full">
          <ShellButton
            icon={<ShellIcon name="sidebar.left" className="size-5" />}
            onClick={toggleSidebar}
            className="size-7 p-0 shrink-0 [-webkit-app-region:no-drag]"
            title={showSidebar ? __("Hide categories") : __("Show categories")}
          />

          <h1 className="window-title text-sm font-semibold tracking-tight text-foreground truncate transition-opacity duration-150 [-webkit-app-region:drag] cursor-default select-none">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right actions: Sort select, View switch */}
      <div className="flex items-center gap-2.5 [-webkit-app-region:no-drag]">
        {currentTab !== 'discover' && currentTab !== 'updates' && (
          <div className="window-select flex items-center transition-opacity duration-150">
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="h-7 text-xs font-medium bg-transparent border-0 rounded-[var(--radius-btn)] pl-1 pr-1.5 text-right text-foreground outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none ring-0 cursor-default [text-align-last:right]"
              style={{ textAlign: 'right', textAlignLast: 'right', outline: 'none', boxShadow: 'none' }}
            >
              <option value="popularity" className="bg-popover text-popover-foreground">{__('Popular')}</option>
              <option value="date" className="bg-popover text-popover-foreground">{__('Recent')}</option>
              <option value="name" className="bg-popover text-popover-foreground">{__('A-Z')}</option>
            </select>
          </div>
        )}

        {currentTab !== 'discover' && (
          <div className="inline-flex items-center h-7 rounded-[6px] p-0 bg-transparent border-0 select-none">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title={__("Grid View")}
              className={`size-7 flex items-center justify-center rounded-[6px] transition-colors cursor-default select-none ${
                viewMode === 'grid'
                  ? 'bg-black/[0.08] dark:bg-white/[0.14] text-foreground dark:text-white font-medium'
                  : 'bg-transparent text-muted-foreground/80 hover:text-foreground dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
              }`}
            >
              <LayoutGrid className="size-5" />
            </button>
            <div className={`w-[1px] h-3.5 my-auto transition-opacity ${viewMode === 'grid' || viewMode === 'list' ? 'opacity-0' : 'bg-black/10 dark:bg-white/10'}`} />
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title={__("List View")}
              className={`size-7 flex items-center justify-center rounded-[6px] transition-colors cursor-default select-none ${
                viewMode === 'list'
                  ? 'bg-black/[0.08] dark:bg-white/[0.14] text-foreground dark:text-white font-medium'
                  : 'bg-transparent text-muted-foreground/80 hover:text-foreground dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
              }`}
            >
              <List className="size-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

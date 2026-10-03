import React from 'react';
import { useShell } from '@/hooks/useShell';
import { ShellButton } from '@/components/shell/components';
import { PanelLeft, LayoutGrid, List } from 'lucide-react';

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
    <header className="app-header h-11 shrink-0 flex items-center justify-between border-b border-border bg-background select-none [-webkit-app-region:drag] z-10 gap-3 px-3">
      {/* Left section: Sidebar toggle & Title with smooth traffic-light spacer */}
      <div className="flex items-center min-w-0 flex-1 h-full [-webkit-app-region:drag]">
        <div className={`shrink-0 transition-[width] duration-250 ease-out overflow-hidden ${showSidebar ? 'w-0' : 'w-[68px]'}`} />
        <div className="flex items-center gap-2 min-w-0 flex-1 h-full">
          <ShellButton
            icon={<PanelLeft className="size-[18px]" />}
            onClick={toggleSidebar}
            className="shrink-0 [-webkit-app-region:no-drag]"
            title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
          />

          <h1 className="window-title text-sm font-semibold tracking-tight text-foreground truncate transition-opacity duration-150 [-webkit-app-region:drag] cursor-default select-none">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right actions: Sort select, View switch */}
      <div className="flex items-center gap-3 [-webkit-app-region:no-drag]">

        {currentTab !== 'discover' && currentTab !== 'updates' && (
          <div className="window-select flex items-center transition-opacity duration-150">
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="h-7 text-xs font-medium bg-transparent border-0 rounded-[var(--radius-btn)] pl-1 pr-1.5 text-right text-foreground outline-none cursor-default focus:outline-none [text-align-last:right]"
              style={{ textAlign: 'right', textAlignLast: 'right' }}
            >
              <option value="popularity" className="bg-popover text-popover-foreground">{__('Popular')}</option>
              <option value="date" className="bg-popover text-popover-foreground">{__('Recent')}</option>
              <option value="name" className="bg-popover text-popover-foreground">{__('A-Z')}</option>
            </select>
          </div>
        )}

        {currentTab !== 'discover' && (
          <div className="flex items-center gap-0.5">
            <ShellButton
              icon={<List className="size-[18px]" />}
              active={viewMode === 'list'}
              onClick={() => setViewMode('list')}
              title="List View"
            />
            <ShellButton
              icon={<LayoutGrid className="size-[18px]" />}
              active={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            />
          </div>
        )}
      </div>
    </header>
  );
}

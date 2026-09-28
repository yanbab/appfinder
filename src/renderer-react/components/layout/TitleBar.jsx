import React from 'react';
import { useShell } from '@/store/useShell';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { PanelLeft, LayoutGrid, List, RefreshCw } from 'lucide-react';
import { UpgradeIcon } from '@/components/ui/icons';

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
    filteredCount,
    startAction,
    runningTasks,
    isRefreshing,
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

  const isRefreshRunning = Boolean(runningTasks['refresh']) || isRefreshing;

  return (
    <header className="app-header h-11 shrink-0 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md select-none [-webkit-app-region:drag] z-10 gap-3 px-3">
      {/* Left section: Sidebar toggle & Title with smooth traffic-light spacer */}
      <div className="flex items-center min-w-0 flex-1 h-full [-webkit-app-region:drag]">
        <div className={`shrink-0 transition-[width] duration-250 ease-out overflow-hidden ${showSidebar ? 'w-0' : 'w-[68px]'}`} />
        <div className="flex items-center gap-2.5 min-w-0 flex-1 h-full">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            className="text-muted-foreground hover:text-foreground cursor-default rounded-[var(--radius-btn)] shrink-0 [-webkit-app-region:no-drag]"
            title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
          >
            <PanelLeft className="size-[18px]" />
          </Button>

          <h1 className="window-title text-sm font-semibold tracking-tight text-foreground truncate transition-opacity duration-150 [-webkit-app-region:drag] cursor-default select-none">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right actions: Refresh, Update all, Sort select, View switch */}
      <div className="flex items-center gap-1 [-webkit-app-region:no-drag]">
        {currentTab === 'updates' && (
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={isRefreshRunning}
            onClick={() => startAction('refresh', 'refresh')}
            className="text-primary hover:text-primary active:bg-primary/10 cursor-default rounded-[var(--radius-btn)]"
            title={__('Refresh')}
          >
            <RefreshCw className={`size-[18px] ${isRefreshRunning ? 'animate-spin' : ''}`} />
          </Button>
        )}

        {currentTab === 'updates' && filteredCount >= 2 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => startAction('upgrade-all')}
            className="gap-1 px-2.5 text-xs rounded-[var(--radius-btn)] cursor-default mr-1"
          >
            <UpgradeIcon className="size-[18px]" />
            <span>{__('Update All')}</span>
          </Button>
        )}

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
          <ButtonGroup className="bg-transparent border-0 shadow-none p-0 gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              className={`rounded-[var(--radius-btn)] border-0 shadow-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${viewMode === 'list'
                ? 'text-foreground dark:text-white bg-transparent active:bg-muted/40 font-medium'
                : 'text-muted-foreground active:text-foreground dark:active:text-white bg-transparent active:bg-muted/40'
                }`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List className="size-[18px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className={`rounded-[var(--radius-btn)] border-0 shadow-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 ${viewMode === 'grid'
                ? 'text-foreground dark:text-white bg-transparent active:bg-muted/40 font-medium'
                : 'text-muted-foreground active:text-foreground dark:active:text-white bg-transparent active:bg-muted/40'
                }`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid className="size-[18px]" />
            </Button>
          </ButtonGroup>
        )}
      </div>
    </header>
  );
}

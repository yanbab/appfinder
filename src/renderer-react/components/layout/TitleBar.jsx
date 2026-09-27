import React from 'react';
import { useShell } from '@/store/useShell';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { PanelLeft, LayoutGrid, List, RefreshCw, ChevronDown } from 'lucide-react';
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
    <header
      className={`h-11 shrink-0 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md select-none [-webkit-app-region:drag] z-10 gap-3 transition-[padding] duration-250 ease-out ${
        showSidebar ? 'pl-3 pr-3' : 'pl-20 pr-3'
      }`}
    >
      {/* Left section: Sidebar toggle & Title */}
      <div className="flex items-center gap-2.5 [-webkit-app-region:no-drag] min-w-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          className="text-muted-foreground hover:text-foreground cursor-default rounded-sm shrink-0"
          title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
        >
          <PanelLeft className="size-4" />
        </Button>

        <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right actions: Refresh, Update all, Sort select, View switch */}
      <div className="flex items-center gap-1.5 [-webkit-app-region:no-drag]">
        {currentTab === 'updates' && (
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={isRefreshRunning}
            onClick={() => startAction('refresh', 'refresh')}
            className="h-6.5 w-[28px] text-primary hover:text-primary hover:bg-primary/10 cursor-default rounded-sm"
            title={__('Refresh')}
          >
            <RefreshCw className={`size-4 ${isRefreshRunning ? 'animate-spin' : ''}`} />
          </Button>
        )}

        {currentTab === 'updates' && filteredCount >= 2 && (
          <Button
            size="xs"
            variant="secondary"
            onClick={() => startAction('upgrade-all')}
            className="gap-1 h-6.5 px-2 text-[11px] rounded-sm cursor-default"
          >
            <UpgradeIcon className="size-3" />
            <span>{__('Update All')}</span>
          </Button>
        )}

        {currentTab !== 'discover' && currentTab !== 'updates' && (
          <div className="relative flex items-center mr-2">
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="h-6.5 text-xs font-medium bg-transparent border-0 rounded-sm pl-1 pr-4 text-right text-muted-foreground outline-none cursor-default appearance-none focus:outline-none"
            >
              <option value="popularity" className="bg-popover text-popover-foreground">{__('Popular')}</option>
              <option value="date" className="bg-popover text-popover-foreground">{__('Recent')}</option>
              <option value="name" className="bg-popover text-popover-foreground">{__('A-Z')}</option>
            </select>
            <ChevronDown className="size-3 absolute right-0.5 text-muted-foreground pointer-events-none" />
          </div>
        )}

        {currentTab !== 'discover' && (
          <ButtonGroup className="rounded-sm">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'outline'}
              size="icon-sm"
              className={`h-6.5 w-7 text-xs rounded-sm hover:bg-transparent ${
                viewMode === 'list'
                  ? 'bg-secondary text-secondary-foreground font-medium z-1 shadow-2xs hover:bg-secondary'
                  : 'text-muted-foreground hover:text-muted-foreground hover:bg-transparent'
              }`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List className="size-3.5" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'outline'}
              size="icon-sm"
              className={`h-6.5 w-7 text-xs rounded-sm hover:bg-transparent ${
                viewMode === 'grid'
                  ? 'bg-secondary text-secondary-foreground font-medium z-1 shadow-2xs hover:bg-secondary'
                  : 'text-muted-foreground hover:text-muted-foreground hover:bg-transparent'
              }`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid className="size-3.5" />
            </Button>
          </ButtonGroup>
        )}
      </div>
    </header>
  );
}

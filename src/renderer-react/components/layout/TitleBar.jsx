import React from 'react';
import { useShell } from '@/store/useShell';
import { Button } from '@/components/ui/button';
import { PanelLeft, LayoutGrid, List } from 'lucide-react';
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
    <header className="h-11 shrink-0 flex items-center justify-between px-3 border-b border-border bg-background/80 backdrop-blur-md select-none [-webkit-app-region:drag] z-10 gap-3">
      {/* Left section: Sidebar toggle & Title */}
      <div className="flex items-center gap-2.5 [-webkit-app-region:no-drag] min-w-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          className="text-muted-foreground hover:text-foreground cursor-default"
          title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
        >
          <PanelLeft className="size-4" />
        </Button>

        <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right actions: Update all, Sort select, View switch */}
      <div className="flex items-center gap-1.5 [-webkit-app-region:no-drag]">
        {currentTab === 'updates' && filteredCount >= 2 && (
          <Button
            size="sm"
            variant="default"
            onClick={() => startAction('upgrade-all')}
            className="gap-1.5 h-6.5 text-xs cursor-default"
          >
            <UpgradeIcon className="size-3.5" />
            <span>{__('Update All')}</span>
          </Button>
        )}

        {currentTab !== 'discover' && currentTab !== 'updates' && (
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className="h-6.5 text-xs font-medium bg-transparent border border-border rounded-md px-2 py-0 text-muted-foreground hover:text-foreground outline-none cursor-default"
          >
            <option value="popularity">{__('Popular')}</option>
            <option value="date">{__('Recent')}</option>
            <option value="name">{__('A-Z')}</option>
          </select>
        )}

        {currentTab !== 'discover' && (
          <div className="flex items-center border border-border rounded-md p-0.5 bg-muted/20">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded-xs transition-colors cursor-default ${
                viewMode === 'list'
                  ? 'bg-background shadow-2xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="List View"
            >
              <List className="size-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded-xs transition-colors cursor-default ${
                viewMode === 'grid'
                  ? 'bg-background shadow-2xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

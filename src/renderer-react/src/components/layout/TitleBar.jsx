import React from 'react';
import { useShell } from '@/store/useShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PanelLeft, LayoutGrid, List, Search, X } from 'lucide-react';
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
    updatesCount,
    search,
    setSearch,
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
          className="text-muted-foreground hover:text-foreground"
          title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
        >
          <PanelLeft className="size-4" />
        </Button>

        <h1 className="text-xs font-semibold tracking-tight text-foreground truncate">
          {getPageTitle()}
        </h1>
      </div>

      {/* Center/Search Bar (especially useful on compact or quick search) */}
      <div className="flex-1 max-w-sm [-webkit-app-region:no-drag]">
        <div className="relative flex items-center">
          <Search className="absolute left-2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            id="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={__('Search')}
            className="pl-7 pr-7 h-7 bg-muted/40 border-border/60 focus-visible:bg-background text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Right actions: Update all, Sort select, View switch */}
      <div className="flex items-center gap-1.5 [-webkit-app-region:no-drag]">
        {currentTab === 'updates' && filteredCount >= 2 && (
          <Button
            size="xs"
            variant="default"
            onClick={() => startAction('upgrade-all')}
            className="gap-1 h-6"
          >
            <UpgradeIcon className="size-3" />
            <span>{__('Update All')}</span>
          </Button>
        )}

        {currentTab !== 'discover' && currentTab !== 'updates' && (
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className="h-6 text-[11px] font-medium bg-transparent border border-border rounded-md px-1.5 py-0 text-muted-foreground hover:text-foreground outline-none cursor-pointer"
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
              className={`p-1 rounded-xs transition-colors ${
                viewMode === 'list'
                  ? 'bg-background shadow-2xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="List View"
            >
              <List className="size-3" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-background shadow-2xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="size-3" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

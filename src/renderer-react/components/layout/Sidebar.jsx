import React, { useState } from 'react';
import { useShell } from '@/store/useShell';
import { Compass, LayoutGrid, CheckCircle2, RefreshCw, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { CategoryIcon } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export function Sidebar() {
  const {
    currentTab,
    selectTab,
    showSidebar,
    allAppsCount,
    installed,
    updatesCount,
    categories,
    search,
    setSearch,
    filteredCount,
    __,
  } = useShell();

  const [showAllCategories, setShowAllCategories] = useState(false);

  const displayedCategories = showAllCategories ? categories : categories.slice(0, 10);

  const navItems = [
    {
      id: 'discover',
      label: __('Explore'),
      icon: Compass,
      badge: null,
    },
    {
      id: 'all-apps',
      label: __('All Apps'),
      icon: LayoutGrid,
      badge: currentTab === 'all-apps' && search ? filteredCount : allAppsCount,
    },
    {
      id: 'installed',
      label: __('Installed'),
      icon: CheckCircle2,
      badge: currentTab === 'installed' && search ? filteredCount : installed.length,
    },
    {
      id: 'updates',
      label: __('Updates'),
      icon: RefreshCw,
      badge: currentTab === 'updates' && search ? filteredCount : updatesCount,
      badgeVariant: 'default',
    },
  ];

  return (
    <aside
      className={`h-full shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border select-none transition-all duration-200 z-20 ${
        showSidebar ? 'w-56' : 'w-0 -translate-x-full overflow-hidden'
      }`}
    >
      {/* macOS Traffic Lights Window Drag Region */}
      <div className="h-10 shrink-0 [-webkit-app-region:drag]" />

      {/* Search Input Container */}
      <div className="px-2.5 pb-2.5">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            id="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={__('Search')}
            className="pl-8.5 pr-7 h-7.5 bg-background/60 border-sidebar-border focus-visible:bg-background text-sm rounded-md shadow-2xs cursor-text"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 text-muted-foreground hover:text-foreground cursor-default"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => selectTab(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors text-left group cursor-default ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`size-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== null && item.badge !== undefined && (item.id !== 'updates' || item.badge > 0) && (
                  <Badge
                    variant={item.badgeVariant || (isActive ? 'default' : 'subtle')}
                    className="ml-auto px-1.5 py-0 h-4.5 text-xs"
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* Categories Section */}
        {categories.length > 0 && (
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {__('Categories')}
            </div>

            <div className="space-y-0.5">
              {displayedCategories.map((cat) => {
                const isActive = currentTab === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => selectTab(cat.name)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors text-left group cursor-default ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-2xs'
                        : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }`}
                  >
                    <CategoryIcon
                      html={cat.icon}
                      className={`size-[18px] shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}
                    />
                    <span className="truncate">{__(cat.displayName)}</span>
                  </button>
                );
              })}
            </div>

            {categories.length > 10 && (
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md transition-colors cursor-default"
              >
                <span>{showAllCategories ? __('Show Less') : __('Show All')}</span>
                {showAllCategories ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

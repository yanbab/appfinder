import React from 'react';
import { useShell } from '@/hooks/useShell';
import { Star, LayoutGrid, CheckCircle2, ArrowDownToLine, Search, X } from 'lucide-react';
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

  const navItems = [
    {
      id: 'discover',
      label: __('Explore'),
      icon: Star,
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
      icon: ArrowDownToLine,
      badge: currentTab === 'updates' && search ? filteredCount : updatesCount,
    },
  ];

  return (
    <aside
      className={`h-full shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border select-none transition-[margin-left] duration-250 ease-out overflow-hidden z-20 w-56 min-w-56 ${showSidebar ? 'ml-0' : '-ml-56'
        }`}
    >
      <div className="w-56 flex flex-col h-full shrink-0 overflow-hidden">
        {/* macOS Traffic Lights Window Drag Region */}
        <div className="h-10 shrink-0 [-webkit-app-region:drag]" />

        {/* Search Input Container */}
        <div className="px-2.5 pb-2.5">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 size-[18px] text-muted-foreground pointer-events-none" />
            <Input
              id="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={__('Search')}
              className="pl-9 pr-7 h-7 bg-card border-sidebar-border/60 focus:border-primary/50 focus:bg-card focus:outline-none focus-visible:ring-0 text-xs text-foreground placeholder:text-muted-foreground rounded-[var(--radius-btn)] shadow-2xs cursor-text"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 size-4 rounded-full bg-muted-foreground/20 active:bg-muted-foreground/35 flex items-center justify-center text-foreground/70 active:text-foreground cursor-default focus:outline-none"
                aria-label="Clear search"
              >
                <X className="size-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3.5">
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <React.Fragment key={item.id}>
                  <button
                    data-nav-id={item.id}
                    onClick={() => selectTab(item.id)}
                    className={`sidebar-btn w-full h-7 flex items-center justify-between px-2.5 rounded-[var(--radius-btn)] text-xs font-medium text-left group cursor-default outline-none focus:outline-none focus-visible:outline-none ${isActive
                        ? 'active bg-sidebar-primary text-sidebar-primary-foreground shadow-2xs'
                        : 'text-sidebar-foreground'
                      }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`sidebar-btn-icon size-[18px] shrink-0 ${isActive ? 'text-sidebar-primary-foreground' : 'text-primary'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== null && item.badge !== undefined && (item.id !== 'updates' || item.badge > 0) && (
                      <Badge
                        variant={isActive ? 'default' : item.badgeVariant || 'subtle'}
                        className={`ml-auto ${isActive ? 'bg-white/20 text-white border-0' : ''}`}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                  {/* Space between Explore and All Apps */}
                  {item.id === 'discover' && <div className="h-1.5" />}
                </React.Fragment>
              );
            })}
          </nav>

          {/* Categories Section */}
          {categories.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {__('Categories')}
              </div>

              <div className="space-y-0.5">
                {categories.map((cat) => {
                  const isActive = currentTab === cat.name;
                  return (
                    <button
                      key={cat.name}
                      data-nav-id={cat.name}
                      onClick={() => selectTab(cat.name)}
                      className={`sidebar-btn w-full h-7 flex items-center justify-between px-2.5 rounded-[var(--radius-btn)] text-xs text-left group cursor-default outline-none focus:outline-none focus-visible:outline-none ${isActive
                          ? 'active bg-sidebar-primary text-sidebar-primary-foreground shadow-2xs font-medium'
                          : 'text-sidebar-foreground'
                        }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CategoryIcon
                          html={cat.icon}
                          className={`sidebar-btn-icon size-[18px] shrink-0 ${isActive ? 'text-sidebar-primary-foreground' : 'text-primary'}`}
                        />
                        <span className="truncate">{__(cat.displayName)}</span>
                      </div>
                      {isActive && (
                        <Badge
                          variant="default"
                          className="ml-auto bg-white/20 text-white border-0"
                        >
                          {filteredCount}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

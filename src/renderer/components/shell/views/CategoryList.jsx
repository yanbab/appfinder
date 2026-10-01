import React from 'react';
import { useShell } from '@/hooks/useShell';
import { Star, LayoutGrid, CheckCircle2, ArrowDownToLine } from 'lucide-react';
import { ShellIcon } from '@/components/shell/components';
import { Badge } from '@/components/ui/badge';


import { SearchInput } from './SearchInput';

export function CategoryList() {
  const {
    currentTab,
    selectTab,
    showSidebar,
    allAppsCount,
    installed,
    updatesCount,
    categories,
    search,
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
      className={`h-full shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border select-none transition-[margin-left] duration-250 ease-out overflow-hidden z-20 w-56 min-w-56 ${
        showSidebar ? 'ml-0' : '-ml-56'
      }`}
    >
      <div className="w-56 flex flex-col h-full shrink-0 overflow-hidden">
        {/* macOS Traffic Lights Window Drag Region */}
        <div className="h-10 shrink-0 [-webkit-app-region:drag]" />

        {/* Search Input Container */}
        <div className="px-2.5 pb-2.5">
          <SearchInput />
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4">
          {/* Main Navigation Section */}
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => selectTab(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[var(--radius-btn)] text-xs font-medium transition-colors cursor-default select-none ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`size-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== null && item.badge > 0 && (
                    <Badge
                      variant={item.id === 'updates' ? 'destructive' : 'secondary'}
                      className={`text-[10px] px-1.5 py-0 h-4 font-normal ${
                        item.id === 'updates' ? 'animate-pulse' : ''
                      }`}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Categories Section */}
          {categories && categories.length > 0 && (
            <div className="space-y-1">
              <div className="px-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {__('Categories')}
              </div>
              <div className="space-y-0.5">
                {categories.map((cat) => {
                  const isActive = currentTab === cat.name;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => selectTab(cat.name)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[var(--radius-btn)] text-xs font-medium transition-colors cursor-default select-none ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ShellIcon
                          name={cat.symbolName}
                          className={`size-4 shrink-0 [&>svg]:size-4 ${
                            isActive ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        />
                        <span className="truncate">{__(cat.displayName)}</span>
                      </div>
                      {currentTab === cat.name && search && filteredCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
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

// Backward-compatible alias
export const Sidebar = CategoryList;

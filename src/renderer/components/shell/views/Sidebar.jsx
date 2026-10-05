import React from 'react';
import { useShell } from '@/hooks/useShell';
import { ShellButton, ShellIcon, NavGroup } from '@/components/shell/components';
import { SearchInput } from './SearchInput';

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
    filteredCount,
    __,
  } = useShell();

  const navItems = [
    {
      id: 'discover',
      label: __('Explore'),
      icon: <ShellIcon name="star" className="size-[18px] shrink-0" />,
      badge: null,
    },
    {
      id: 'all-apps',
      label: __('All Apps'),
      icon: <ShellIcon name="books.vertical" className="size-[18px] shrink-0" />,
      badge: currentTab === 'all-apps' && search ? filteredCount : allAppsCount,
    },
    {
      id: 'installed',
      label: __('Installed'),
      icon: <ShellIcon name="arrow.down.to.line" className="size-[18px] shrink-0" />,
      badge: currentTab === 'installed' && search ? filteredCount : installed.length,
    },
    {
      id: 'updates',
      label: __('Updates'),
      icon: <ShellIcon name="arrow.uturn.down" className="size-[18px] shrink-0" />,
      badge: currentTab === 'updates' && search ? filteredCount : updatesCount,
    },
  ];

  return (
    <aside
      className={`h-full shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border select-none transition-[margin-left] duration-250 ease-out overflow-hidden z-20 w-[200px] min-w-[200px] ${
        showSidebar ? 'ml-0' : '-ml-[200px]'
      }`}
    >
      <div className="w-[200px] flex flex-col h-full shrink-0 overflow-hidden">
        {/* macOS Traffic Lights Window Drag Region */}
        <div className="h-[52px] shrink-0 [-webkit-app-region:drag]" />

        {/* Search Input Container */}
        <div className="px-2.5 pb-2.5">
          <SearchInput />
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-2 space-y-3.5">
          {/* Main Navigation Group (No title -> not collapsable) */}
          <NavGroup>
            {navItems.map((item) => (
              <ShellButton
                key={item.id}
                variant="sidebar"
                icon={item.icon}
                active={currentTab === item.id}
                badge={item.badge}
                onClick={() => selectTab(item.id)}
              >
                {item.label}
              </ShellButton>
            ))}
          </NavGroup>

          {/* Categories Group (Collapsable with chevron) */}
          {categories && categories.length > 0 && (
            <NavGroup title={__('Categories')} defaultOpen={true}>
              {categories.map((cat) => (
                <ShellButton
                  key={cat.name}
                  variant="sidebar"
                  icon={<ShellIcon name={cat.symbolName} className="size-[18px] shrink-0 [&>svg]:size-[18px]" />}
                  active={currentTab === cat.name}
                  badge={currentTab === cat.name && search && filteredCount > 0 ? filteredCount : null}
                  onClick={() => selectTab(cat.name)}
                >
                  {__(cat.displayName)}
                </ShellButton>
              ))}
            </NavGroup>
          )}
        </div>
      </div>
    </aside>
  );
}

// Backward-compatible alias
export const CategoryList = Sidebar;
export default Sidebar;

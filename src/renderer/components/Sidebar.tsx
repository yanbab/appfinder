import React, { useMemo } from 'react';
import { useShellStore, useAppStore, selectFilteredItems } from '@/stores';
import { Button } from './Button';
import { ShellIcon } from './ShellIcon';
import { NavGroup } from './NavGroup';
import { SearchInput } from './SearchInput';

export function Sidebar(): React.JSX.Element {
  const currentTab = useShellStore((s) => s.currentTab);
  const selectTab = useShellStore((s) => s.selectTab);
  const showSidebar = useShellStore((s) => s.showSidebar);
  const __ = useShellStore((s) => s.__);

  const items = useAppStore((s) => s.items);
  const categories = useAppStore((s) => s.categories);
  const installed = useAppStore((s) => s.installed);
  const outdatedMap = useAppStore((s) => s.outdatedMap);
  const search = useAppStore((s) => s.search);
  const order = useAppStore((s) => s.order);

  const allAppsCount = useMemo(() => items.filter((c) => c.category !== 'font').length, [items]);
  const updatesCount = useMemo(() => Object.keys(outdatedMap).length, [outdatedMap]);
  const filteredCount = useMemo(() => {
    if (!search || !search.trim()) return 0;
    return selectFilteredItems({ items, search, order, installed, outdatedMap, categories }, currentTab).length;
  }, [items, search, order, installed, outdatedMap, categories, currentTab]);

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
      icon: <ShellIcon name="arrow.trianglehead.2.clockwise.rotate.90" className="size-[18px] shrink-0" />,
      badge: currentTab === 'updates' && search ? filteredCount : updatesCount,
    },
  ];

  return (
    <aside
      className={`h-full shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border select-none transition-[margin-left] duration-250 ease-out overflow-hidden z-20 w-[200px] min-w-[200px] ${showSidebar ? 'ml-0' : '-ml-[200px]'
        }`}
    >
      <div className="w-[200px] flex flex-col h-full shrink-0 overflow-hidden">
        <div className="h-[52px] shrink-0 [-webkit-app-region:drag]" />

        <div className="px-2.5 pb-2.5">
          <SearchInput />
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-3.5">
          <NavGroup>
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant="sidebar"
                className={item.id === 'discover' ? 'mb-1' : undefined}
                icon={item.icon}
                active={currentTab === item.id}
                badge={item.badge}
                onClick={() => selectTab(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </NavGroup>

          {categories && categories.length > 0 && (
            <NavGroup title={__('Categories')} defaultOpen={true}>
              {categories.map((cat) => (
                <Button
                  key={cat.name}
                  variant="sidebar"
                  icon={<ShellIcon name={cat.symbolName} className="size-[18px] shrink-0 [&>svg]:size-[18px]" />}
                  active={currentTab === cat.name}
                  badge={currentTab === cat.name && search && filteredCount > 0 ? filteredCount : null}
                  onClick={() => selectTab(cat.name)}
                >
                  {__(cat.displayName)}
                </Button>
              ))}
            </NavGroup>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

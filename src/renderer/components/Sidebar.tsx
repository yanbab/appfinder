import React, { useMemo, useState } from 'react';
import { useShellStore, useAppStore, selectFilteredItems } from '@/stores';
import { Button } from './Button';
import { ShellIcon } from './ShellIcon';
import { NavGroup } from './NavGroup';
import { SearchInput } from './SearchInput';

export function Sidebar(): React.JSX.Element {
  const currentTab = useShellStore((s) => s.currentTab);
  const selectTab = useShellStore((s) => s.selectTab);
  const showSidebar = useShellStore((s) => s.showSidebar);
  const toggleSidebar = useShellStore((s) => s.toggleSidebar);
  const __ = useShellStore((s) => s.__);

  const items = useAppStore((s) => s.items);
  const categories = useAppStore((s) => s.categories);
  const installed = useAppStore((s) => s.installed);
  const outdatedMap = useAppStore((s) => s.outdatedMap);
  const search = useAppStore((s) => s.search);
  const order = useAppStore((s) => s.order);

  const [isScrolled, setIsScrolled] = useState(false);

  const allCount = items.length;
  const applicationsCount = useMemo(() => {
    let count = 0;
    for (const c of items) {
      if (c.category !== 'font' && c.category !== 'services') count++;
    }
    return count;
  }, [items]);
  const fontsCount = useMemo(() => {
    let count = 0;
    for (const c of items) {
      if (c.category === 'font') count++;
    }
    return count;
  }, [items]);
  const servicesCount = useMemo(() => {
    let count = 0;
    for (const c of items) {
      if (c.category === 'services') count++;
    }
    return count;
  }, [items]);
  const installedCount = installed.length;
  const updatesCount = useMemo(() => Object.keys(outdatedMap).length, [outdatedMap]);

  const filteredCount = useMemo(() => {
    if (!search || !search.trim()) return 0;
    return selectFilteredItems({ items, search, order, installed, outdatedMap, categories }, currentTab).length;
  }, [items, search, order, installed, outdatedMap, categories, currentTab]);

  const sortedCategories = useMemo(() => {
    return [...categories]
      .filter((c) => c.name !== 'font' && c.name !== 'services' && c.name !== 'other')
      .sort((a, b) => {
        const nameA = __(a.displayName || a.name);
        const nameB = __(b.displayName || b.name);
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
      });
  }, [categories, __]);

  const otherCategory = useMemo(() => {
    return categories.find((c) => c.name === 'other');
  }, [categories]);

  return (
    <aside
      className={`h-full shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border select-none transition-[margin-left] duration-250 ease-out overflow-hidden z-20 w-[200px] min-w-[200px] ${
        showSidebar ? 'ml-0' : '-ml-[200px]'
      }`}
    >
      <div className="w-[200px] flex flex-col h-full shrink-0 overflow-hidden">
        {/* Fixed Sidebar toggle button right beside traffic lights */}
        <div className="h-[52px] shrink-0 flex items-center pl-[72px] pr-2.5 [-webkit-app-region:drag]">
          <Button
            icon={<ShellIcon name="sidebar.left" className="size-5" />}
            onClick={toggleSidebar}
            className="size-7 p-0 shrink-0 [-webkit-app-region:no-drag]"
            title={__("Hide categories")}
          />
        </div>

        {/* Search Input */}
        <div
          className={`px-2.5 pb-2.5 border-b transition-colors duration-150 ${
            isScrolled ? 'border-sidebar-border' : 'border-sidebar-border/40'
          }`}
        >
          <SearchInput />
        </div>

        {/* Sidebar Nav Items */}
        <div
          onScroll={(e) => {
            const scrolled = e.currentTarget.scrollTop > 0;
            if (scrolled !== isScrolled) setIsScrolled(scrolled);
          }}
          className="flex-1 overflow-y-auto px-2 py-2 space-y-3.5"
        >
          {/* Explore */}
          <NavGroup>
            <Button
              data-nav-id="discover"
              variant="sidebar"
              icon={<ShellIcon name="star" className="size-[18px] shrink-0" />}
              active={currentTab === 'discover'}
              onClick={() => selectTab('discover')}
            >
              {__('Explore')}
            </Button>
          </NavGroup>

          {/* All / Installed / Updates */}
          <NavGroup>
            <Button
              data-nav-id="all"
              variant="sidebar"
              icon={<ShellIcon name="square.grid.2x2" className="size-[18px] shrink-0" />}
              active={currentTab === 'all'}
              badge={currentTab === 'all' && search ? filteredCount : allCount}
              onClick={() => selectTab('all')}
            >
              {__('All')}
            </Button>
            <Button
              data-nav-id="installed"
              variant="sidebar"
              icon={<ShellIcon name="arrow.down.to.line" className="size-[18px] shrink-0" />}
              active={currentTab === 'installed'}
              badge={currentTab === 'installed' && search ? filteredCount : installedCount}
              onClick={() => selectTab('installed')}
            >
              {__('Installed')}
            </Button>
            <Button
              data-nav-id="updates"
              variant="sidebar"
              icon={<ShellIcon name="arrow.trianglehead.2.clockwise.rotate.90" className="size-[18px] shrink-0" />}
              active={currentTab === 'updates'}
              badge={currentTab === 'updates' && search ? filteredCount : (updatesCount > 0 ? updatesCount : null)}
              onClick={() => selectTab('updates')}
            >
              {__('Updates')}
            </Button>
          </NavGroup>

          {/* Applications / Fonts / Services */}
          <NavGroup>
            <Button
              data-nav-id="all-apps"
              variant="sidebar"
              icon={<ShellIcon name="macwindow" className="size-[18px] shrink-0" />}
              active={currentTab === 'all-apps' || currentTab === 'applications'}
              badge={(currentTab === 'all-apps' || currentTab === 'applications') && search ? filteredCount : applicationsCount}
              onClick={() => selectTab('all-apps')}
            >
              {__('Applications')}
            </Button>
            <Button
              data-nav-id="font"
              variant="sidebar"
              icon={<ShellIcon name="textformat" className="size-[18px] shrink-0" />}
              active={currentTab === 'font'}
              badge={currentTab === 'font' && search ? filteredCount : fontsCount}
              onClick={() => selectTab('font')}
            >
              {__('Fonts')}
            </Button>
            <Button
              data-nav-id="services"
              variant="sidebar"
              icon={<ShellIcon name="server.rack" className="size-[18px] shrink-0" />}
              active={currentTab === 'services'}
              badge={currentTab === 'services' && search ? filteredCount : servicesCount}
              onClick={() => selectTab('services')}
            >
              {__('Services')}
            </Button>
          </NavGroup>

          {/* Categories */}
          {sortedCategories.length > 0 && (
            <NavGroup title={__('Categories')} defaultOpen={true}>
              {sortedCategories.map((cat) => (
                <Button
                  key={cat.name}
                  data-nav-id={cat.name}
                  variant="sidebar"
                  icon={<ShellIcon name={cat.symbolName} className="size-[18px] shrink-0 [&>svg]:size-[18px]" />}
                  active={currentTab === cat.name}
                  badge={currentTab === cat.name && search && filteredCount > 0 ? filteredCount : null}
                  onClick={() => selectTab(cat.name)}
                >
                  {__(cat.displayName)}
                </Button>
              ))}
              {otherCategory && (
                <Button
                  key={otherCategory.name}
                  data-nav-id={otherCategory.name}
                  variant="sidebar"
                  icon={<ShellIcon name={otherCategory.symbolName} className="size-[18px] shrink-0 [&>svg]:size-[18px]" />}
                  active={currentTab === otherCategory.name}
                  badge={currentTab === otherCategory.name && search && filteredCount > 0 ? filteredCount : null}
                  onClick={() => selectTab(otherCategory.name)}
                >
                  {__(otherCategory.displayName)}
                </Button>
              )}
            </NavGroup>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

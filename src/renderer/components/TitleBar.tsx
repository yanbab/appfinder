import React from 'react';
import { useShellStore, useAppStore } from '@/stores';
import { Button } from './Button';
import { ShellIcon } from './ShellIcon';
import { Select } from './Select';

export function TitleBar() {
  const currentTab = useShellStore((s) => s.currentTab);
  const viewMode = useShellStore((s) => s.viewMode);
  const setViewMode = useShellStore((s) => s.setViewMode);
  const showSidebar = useShellStore((s) => s.showSidebar);
  const toggleSidebar = useShellStore((s) => s.toggleSidebar);
  const getPageTitle = useShellStore((s) => s.getPageTitle);
  const __ = useShellStore((s) => s.__);

  const order = useAppStore((s) => s.order);
  const setOrder = useAppStore((s) => s.setOrder);

  return (
    <header className="app-header h-[52px] shrink-0 flex items-center justify-between border-b border-border bg-card select-none [-webkit-app-region:drag] z-10 gap-3 px-3.5">
      {/* Left section: Sidebar toggle & Title with smooth traffic-light spacer */}
      <div className="flex items-center min-w-0 flex-1 h-full [-webkit-app-region:drag]">
        <div className={`shrink-0 transition-[width] duration-250 ease-out overflow-hidden ${showSidebar ? 'w-0' : 'w-[76px]'}`} />
        <div className="flex items-center gap-2 min-w-0 flex-1 h-full">
          <Button
            icon={<ShellIcon name="sidebar.left" className="size-5" />}
            onClick={toggleSidebar}
            className="size-7 p-0 shrink-0 [-webkit-app-region:no-drag]"
            title={showSidebar ? __("Hide categories") : __("Show categories")}
          />

          <h1 className="window-title text-sm font-semibold tracking-tight text-foreground truncate transition-opacity duration-150 [-webkit-app-region:drag] cursor-default select-none">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right actions: Sort select, View switch */}
      <div className="flex items-center gap-3 [-webkit-app-region:no-drag]">
        {currentTab !== 'discover' && currentTab !== 'updates' && (
          <div className="window-select flex items-center transition-opacity duration-150">
            <Select
              value={order}
              onChange={(e) => setOrder(e.target.value)}
            >
              <option value="popularity" className="bg-popover text-popover-foreground">{__('Popular')}</option>
              <option value="date" className="bg-popover text-popover-foreground">{__('Recent')}</option>
              <option value="name" className="bg-popover text-popover-foreground">{__('A-Z')}</option>
            </Select>
          </div>
        )}

        {currentTab !== 'discover' && (
          <div className="flex items-center gap-1 select-none">
            <Button
              variant="ghost"
              size="icon-sm"
              active={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
              title={__("Grid View")}
              icon={<ShellIcon name="square.grid.2x2" className="size-4" />}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              active={viewMode === 'list'}
              onClick={() => setViewMode('list')}
              title={__("List View")}
              icon={<ShellIcon name="list.bullet" className="size-4" />}
            />
          </div>
        )}
      </div>
    </header>
  );
}

export default TitleBar;

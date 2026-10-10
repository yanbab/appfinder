const test = require('node:test');
const assert = require('node:assert/strict');

test('updateMenuItem modifies enabled and checked properties of targeted menu items', () => {
  const menuItems = new Map();
  menuItems.set('view-as-icons', { id: 'view-as-icons', enabled: false, checked: false });
  menuItems.set('view-as-list', { id: 'view-as-list', enabled: false, checked: false });
  menuItems.set('view-order-by', { id: 'view-order-by', enabled: false });

  // Mock Menu
  const mockMenu = {
    getMenuItemById: (id) => menuItems.get(id) || null,
  };

  function updateMenuItem(id, status) {
    const item = mockMenu.getMenuItemById(id);
    if (item) {
      if (typeof status.checked === 'boolean') item.checked = status.checked;
      if (typeof status.enabled === 'boolean') item.enabled = status.enabled;
    }
  }

  // Update view-as-icons to enabled: true
  updateMenuItem('view-as-icons', { enabled: true });
  assert.equal(menuItems.get('view-as-icons').enabled, true);

  // Update view-as-list to enabled: true and checked: true
  updateMenuItem('view-as-list', { enabled: true, checked: true });
  assert.equal(menuItems.get('view-as-list').enabled, true);
  assert.equal(menuItems.get('view-as-list').checked, true);

  // Update view-order-by to enabled: true
  updateMenuItem('view-order-by', { enabled: true });
  assert.equal(menuItems.get('view-order-by').enabled, true);

  // Disabling non-existent item should not throw
  assert.doesNotThrow(() => {
    updateMenuItem('unknown-id', { enabled: false });
  });
});

test('syncTabMenu disables View As and Order By when tab is discover and enables them on other tabs', () => {
  const calls = [];
  const mockIpc = {
    updateMenu: (id, status) => {
      calls.push({ id, status });
    }
  };

  // Replicate syncTabMenu behavior
  function syncTabMenu(tab, ipc = mockIpc) {
    const isDiscover = tab === 'discover';
    ipc.updateMenu('view-as-icons', { enabled: !isDiscover });
    ipc.updateMenu('view-as-list', { enabled: !isDiscover });
    ipc.updateMenu('view-order-by', { enabled: !isDiscover });
  }

  // When tab is 'discover':
  syncTabMenu('discover');
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0], { id: 'view-as-icons', status: { enabled: false } });
  assert.deepEqual(calls[1], { id: 'view-as-list', status: { enabled: false } });
  assert.deepEqual(calls[2], { id: 'view-order-by', status: { enabled: false } });

  // Reset and test with 'all-apps':
  calls.length = 0;
  syncTabMenu('all-apps');
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0], { id: 'view-as-icons', status: { enabled: true } });
  assert.deepEqual(calls[1], { id: 'view-as-list', status: { enabled: true } });
  assert.deepEqual(calls[2], { id: 'view-order-by', status: { enabled: true } });

  // Reset and test with 'installed':
  calls.length = 0;
  syncTabMenu('installed');
  assert.deepEqual(calls[0], { id: 'view-as-icons', status: { enabled: true } });
  assert.deepEqual(calls[1], { id: 'view-as-list', status: { enabled: true } });
  assert.deepEqual(calls[2], { id: 'view-order-by', status: { enabled: true } });
});

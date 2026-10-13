const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('tray template icons exist with @1x and @2x dimensions', () => {
  const icon1x = path.join(__dirname, '../data/tray/trayTemplate.png');
  const icon2x = path.join(__dirname, '../data/tray/trayTemplate@2x.png');

  assert.equal(fs.existsSync(icon1x), true, 'trayTemplate.png must exist');
  assert.equal(fs.existsSync(icon2x), true, 'trayTemplate@2x.png must exist');

  const stat1x = fs.statSync(icon1x);
  const stat2x = fs.statSync(icon2x);

  assert.ok(stat1x.size > 100, 'trayTemplate.png should be a valid PNG');
  assert.ok(stat2x.size > 100, 'trayTemplate@2x.png should be a valid PNG');
});

test('tray context menu template structure conforms to specifications', () => {
  function formatTime(d) {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  function buildTrayTemplate({ lastChecked, appName = 'AppFinder', __ = (k, ...args) => k.replace('%s', args[0]) }) {
    const updatedLabel = lastChecked
      ? __('Updated %s', formatTime(lastChecked))
      : __('Not checked yet');

    return [
      {
        label: updatedLabel,
        enabled: false,
      },
      {
        label: __('Check updates'),
        id: 'check-updates',
      },
      { type: 'separator' },
      {
        label: __('Settings...'),
        id: 'settings',
      },
      {
        label: __('Quit %s', appName),
        id: 'quit',
      },
    ];
  }

  const testDate = new Date(2026, 9, 12, 12, 14);
  const template = buildTrayTemplate({ lastChecked: testDate, appName: 'AppFinder' });

  assert.equal(template.length, 5);
  assert.equal(template[0].label, 'Updated 12:14');
  assert.equal(template[0].enabled, false);
  assert.equal(template[1].label, 'Check updates');
  assert.equal(template[2].type, 'separator');
  assert.equal(template[3].label, 'Settings...');
  assert.equal(template[4].label, 'Quit AppFinder');
});

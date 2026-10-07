import * as React from 'react';

// Eagerly load all SF Symbol SVGs from assets/icons
const svgModules = import.meta.glob('@/assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const svgMap = Object.entries(svgModules).reduce((acc, [path, content]) => {
  const match = path.match(/\/([^/]+)\.svg$/);
  if (match) {
    acc[match[1].toLowerCase()] = content;
  }
  return acc;
}, {});

const ICON_ALIASES = {
  search: 'magnifyingglass',
  check: 'checkmark',
  'check-circle': 'checkmark',
  'check-circle-2': 'checkmark',
  stop: 'stop.fill',
  'stop.fill': 'stop.fill',
  'stop.circle': 'stop.circle',
  'stop.circle.fill': 'stop.circle.fill',
  terminal: 'apple.terminal',
  'terminal.fill': 'apple.terminal',
  'apple.terminal.fill': 'apple.terminal',
  upgrade: 'arrow.trianglehead.2.clockwise.rotate.90',
  upgrades: 'arrow.trianglehead.2.clockwise.rotate.90',
  update: 'arrow.trianglehead.2.clockwise.rotate.90',
  refresh: 'arrow.trianglehead.2.clockwise.rotate.90',
  'arrow.trianglehead.2.clockwise.rotate.90': 'arrow.trianglehead.2.clockwise.rotate.90',
  'arrow.triangle.2.circlepath': 'arrow.trianglehead.2.clockwise.rotate.90',
  install: 'arrow.down.to.line',
  installed: 'arrow.down.to.line',
  'arrow.down.circle': 'arrow.down.to.line',
  open: 'play.fill',
  play: 'play.fill',
  'play.fill': 'play.fill',
  sidebar: 'sidebar.left',
  'sidebar.left': 'sidebar.left',
  delete: 'trash',
  uninstall: 'trash',
  trash: 'trash',
};

export function ShellIcon({ name, html, className = 'size-[18px]', ...props }) {
  if (html) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 [&>svg]:size-full [&>svg]:block ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
        {...props}
      />
    );
  }

  if (name) {
    const key = name.toLowerCase();
    const resolvedName = ICON_ALIASES[key] || key;
    const rawSvg = svgMap[resolvedName] || svgMap[key];
    if (rawSvg) {
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 [&>svg]:size-full [&>svg]:block ${className}`}
          dangerouslySetInnerHTML={{ __html: rawSvg }}
          {...props}
        />
      );
    }
  }

  return <div className={`rounded-sm bg-muted shrink-0 ${className}`} {...props} />;
}


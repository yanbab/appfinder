import * as React from 'react';
import * as LucideIcons from 'lucide-react';

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
  'stop-circle': 'stop.circle',
  terminal: 'apple.terminal',
  'terminal.fill': 'apple.terminal.fill',
  upgrade: 'arrow.triangle.2.circlepath',
  refresh: 'arrow.triangle.2.circlepath',
  updates: 'arrow.triangle.2.circlepath',
  'arrow.trianglehead.2.clockwise.rotate.90': 'arrow.triangle.2.circlepath',
  install: 'arrow.down.circle',
  open: 'arrow.up.right.square',
  delete: 'trash',
  uninstall: 'trash',
};

function toPascalCase(str) {
  if (!str) return '';
  return str
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase());
}

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


    const pascalName = toPascalCase(name);
    const LucideIcon = LucideIcons[pascalName] || LucideIcons[name];
    if (LucideIcon) {
      return <LucideIcon className={className} {...props} />;
    }
  }

  return <div className={`rounded-sm bg-muted shrink-0 ${className}`} {...props} />;
}


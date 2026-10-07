// SF Symbols catalog & resolver
const svgModules = import.meta.glob('./*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const symbols: Record<string, string> = Object.entries(svgModules).reduce((acc, [path, content]) => {
  const match = path.match(/\/([^/]+)\.svg$/);
  if (match) {
    acc[match[1].toLowerCase()] = content;
  }
  return acc;
}, {} as Record<string, string>);

export const aliases: Record<string, string> = {
  search: 'magnifyingglass',
  check: 'checkmark',
  'check-circle': 'checkmark',
  'check-circle-2': 'checkmark',
  x: 'xmark',
  close: 'xmark',
  grid: 'square.grid.2x2',
  list: 'list.bullet',
  'chevron-right': 'chevron.right',
  'chevron-down': 'chevron.down',
  'chevron-up': 'chevron.up',
  'chevron-left': 'chevron.left',
  'external-link': 'arrow.up.right.square',
  info: 'info.circle',
  warning: 'exclamationmark.triangle',
  'alert-triangle': 'exclamationmark.triangle',
  'alert-octagon': 'exclamationmark.octagon',
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
  spinner: 'arrow.trianglehead.2.clockwise.rotate.90',
  loader: 'arrow.trianglehead.2.clockwise.rotate.90',
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

export function getSymbol(name?: string): string | null {
  if (!name) return null;
  const key = String(name).toLowerCase();
  const resolved = aliases[key] || key;
  return symbols[resolved] || symbols[key] || null;
}

export function hasSymbol(name?: string): boolean {
  return Boolean(getSymbol(name));
}

export default symbols;

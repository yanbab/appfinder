# electron-process-monitor

A lightweight, zero-dependency, standalone process and resource monitor window for Electron applications.

Displays real-time CPU % and Memory consumption for all Main, Renderer, GPU, and Utility processes, matching human-friendly window titles and providing an "End Process" button for rogue subprocesses.

![Process Monitor Preview](https://raw.githubusercontent.com/yanbab/appfinder/main/_mockups/process-monitor.png)

## Features

- ⚡ **Zero External Dependencies**: Pure Electron native APIs (`app.getAppMetrics()` and `webContents.getAllWebContents()`).
- 🎨 **macOS Native Aesthetics**: Dark and light mode responsive with glassmorphic accents and clean typography.
- 🔍 **Live Search & Sorting**: Real-time filtering by process name, type, or PID, with sortable columns (CPU %, Memory, PID, Name).
- 🛑 **Subprocess Termination**: Safe "End Process" button to terminate hanging renderers or workers without affecting the main process.
- 📦 **Code Independent**: Runs via an inline data URI—requires no build pipeline, no Webpack/Vite loaders, and no preload scripts.
- 🪶 **Low Overhead**: Metrics poll only while the window is visible and automatically stop when closed.

## Installation

```bash
npm install electron-process-monitor
```

## Quick Start

In your Electron main process:

```typescript
import { openProcessMonitor } from 'electron-process-monitor';

// Open or bring to front
openProcessMonitor();
```

### Add to Application Menu

```typescript
import { Menu } from 'electron';
import { openProcessMonitor } from 'electron-process-monitor';

const template = [
  // ... other menus
  {
    role: 'help',
    submenu: [
      {
        label: 'Process Monitor',
        accelerator: 'Option+Cmd+P',
        click: () => openProcessMonitor()
      }
    ]
  }
];

Menu.setApplicationMenu(Menu.buildFromTemplate(template));
```

### Options

```typescript
openProcessMonitor({
  width: 640,
  height: 500,
  title: 'My App - Task Manager',
  pollInterval: 1000, // in ms
  parent: mainWindow  // optional parent window
});
```

### Toggle Open/Close

```typescript
import { toggleProcessMonitor } from 'electron-process-monitor';

toggleProcessMonitor();
```

## License

MIT © Yan Bab

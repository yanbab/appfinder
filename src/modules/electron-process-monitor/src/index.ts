import { app, BrowserWindow, ipcMain, webContents } from 'electron';

let monitorWindow: BrowserWindow | null = null;
let metricsInterval: NodeJS.Timeout | null = null;

export interface ProcessItem {
  pid: number;
  type: string;
  name: string;
  cpu: number;
  memoryWorkingSet: number; // MB
  memoryPrivate: number;    // MB
  sandboxed?: boolean;
  isMain: boolean;
}

export interface SystemSummary {
  totalCpu: number;
  totalMemory: number;
  processCount: number;
  appName: string;
}

export interface ProcessMonitorOptions {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  parent?: BrowserWindow;
  title?: string;
  pollInterval?: number; // ms, default 1000
}

function collectMetrics(): { processes: ProcessItem[]; summary: SystemSummary } {
  const metrics = app.getAppMetrics();
  const allWebContents = webContents.getAllWebContents();

  const wcMap = new Map<number, string>();
  for (const wc of allWebContents) {
    try {
      const pid = wc.getOSProcessId();
      const title = wc.getTitle() || '';
      const url = wc.getURL() || '';
      let label = title || url;
      if (label.startsWith('data:')) label = 'Inline Window';
      if (label.includes('localhost:') || label.includes('index.html')) label = 'Main App';
      wcMap.set(pid, label);
    } catch (_) {}
  }

  let totalCpu = 0;
  let totalMemoryBytes = 0;

  const processes: ProcessItem[] = metrics.map((m) => {
    const isMain = m.pid === process.pid || m.type === 'Browser';
    let displayName: string = m.type;

    if (isMain) {
      displayName = 'Main Process';
    } else if (m.type === 'GPU') {
      displayName = 'GPU Helper';
    } else if (m.type === 'Tab') {
      const windowTitle = wcMap.get(m.pid);
      displayName = windowTitle ? `Window: ${windowTitle}` : 'Renderer Process';
    } else if (m.type === 'Utility') {
      displayName = m.name ? `Utility: ${m.name}` : 'Utility Worker';
    } else if (m.name) {
      displayName = `${m.type} (${m.name})`;
    }

    const cpuPercent = Math.round((m.cpu?.percentCPUUsage || 0) * 10) / 10;
    const memWorkingSetMb = Math.round(((m.memory?.workingSetSize || 0) / 1024) * 10) / 10;
    const memPrivateMb = Math.round(((m.memory?.privateBytes || 0) / 1024) * 10) / 10;

    totalCpu += cpuPercent;
    totalMemoryBytes += (m.memory?.workingSetSize || 0);

    return {
      pid: m.pid,
      type: m.type,
      name: displayName,
      cpu: cpuPercent,
      memoryWorkingSet: memWorkingSetMb,
      memoryPrivate: memPrivateMb,
      sandboxed: m.sandboxed,
      isMain,
    };
  });

  processes.sort((a, b) => b.cpu - a.cpu || b.memoryWorkingSet - a.memoryWorkingSet);

  const summary: SystemSummary = {
    totalCpu: Math.round(totalCpu * 10) / 10,
    totalMemory: Math.round((totalMemoryBytes / 1024) * 10) / 10,
    processCount: processes.length,
    appName: app.getName() || 'Electron',
  };

  return { processes, summary };
}

function getMonitorHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Process Monitor</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --bg: #ececec;
      --card-bg: #ffffff;
      --text: #1d1d1f;
      --text-muted: #86868b;
      --border: rgba(0, 0, 0, 0.1);
      --hover-bg: rgba(0, 0, 0, 0.04);
      --accent: #0071e3;
      --danger: #ff3b30;
      --danger-hover: #d70015;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1e1e1e;
        --card-bg: #252526;
        --text: #f5f5f7;
        --text-muted: #a1a1a6;
        --border: rgba(255, 255, 255, 0.1);
        --hover-bg: rgba(255, 255, 255, 0.05);
        --accent: #2997ff;
        --danger: #ff453a;
        --danger-hover: #ff6961;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-sans);
      background: var(--bg);
      color: var(--text);
      font-size: 12px;
      user-select: none;
      -webkit-user-select: none;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    header {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: var(--card-bg);
    }
    .stats {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    .stat-pill {
      display: flex;
      flex-direction: column;
    }
    .stat-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      font-weight: 600;
    }
    .stat-val {
      font-size: 13px;
      font-weight: 700;
      font-family: var(--font-mono);
    }
    .toolbar {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .search-box {
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 11px;
      outline: none;
      width: 140px;
    }
    .search-box:focus {
      border-color: var(--accent);
    }
    .table-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--card-bg);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    thead {
      position: sticky;
      top: 0;
      background: var(--bg);
      z-index: 2;
      border-bottom: 1px solid var(--border);
    }
    th {
      padding: 6px 12px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      cursor: pointer;
    }
    th:hover {
      color: var(--text);
    }
    td {
      padding: 7px 12px;
      border-bottom: 1px solid var(--border);
      font-size: 11px;
      vertical-align: middle;
    }
    tr:hover {
      background: var(--hover-bg);
    }
    .mono {
      font-family: var(--font-mono);
      font-size: 11px;
    }
    .pill-type {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      background: var(--hover-bg);
      border: 1px solid var(--border);
      color: var(--text-muted);
    }
    .pill-main {
      border-color: var(--accent);
      color: var(--accent);
      background: rgba(0, 113, 227, 0.08);
    }
    .pill-tab {
      border-color: #34c759;
      color: #34c759;
      background: rgba(52, 199, 89, 0.12);
    }
    .cpu-bar-bg {
      display: inline-block;
      width: 48px;
      height: 5px;
      background: var(--border);
      border-radius: 3px;
      overflow: hidden;
      margin-left: 6px;
      vertical-align: middle;
    }
    .cpu-bar-fill {
      height: 100%;
      background: var(--accent);
      border-radius: 3px;
    }
    .btn-kill {
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-kill:hover {
      background: var(--danger);
      border-color: var(--danger);
      color: #ffffff;
    }
    footer {
      padding: 6px 12px;
      font-size: 10px;
      color: var(--text-muted);
      background: var(--bg);
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .pulse-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      background: #34c759;
      border-radius: 50%;
      margin-right: 4px;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
      100% { opacity: 1; transform: scale(1); }
    }
    .charts-container {
      display: flex;
      flex-direction: column;
      border-top: 1px solid var(--border);
      background: var(--card-bg);
      flex-shrink: 0;
      width: 100%;
    }
    .chart-panel {
      position: relative;
      width: 100%;
      height: 62px;
      box-sizing: border-box;
      background: var(--card-bg);
    }
    .chart-panel:first-child {
      border-bottom: 1px solid var(--border);
    }
    .chart-header {
      position: absolute;
      top: 5px;
      left: 12px;
      right: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      pointer-events: none;
      z-index: 2;
    }
    .chart-title {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }
    .chart-subtitle {
      font-weight: 400;
      opacity: 0.7;
      text-transform: none;
      margin-left: 4px;
    }
    .chart-stat {
      font-size: 11px;
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--text);
    }
    .chart-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  </style>
</head>
<body>
  <header>
    <div class="stats">
      <div class="stat-pill">
        <span class="stat-label">Processes</span>
        <span class="stat-val" id="stat-count">-</span>
      </div>
      <div class="stat-pill">
        <span class="stat-label">Total CPU</span>
        <span class="stat-val" id="stat-cpu">-</span>
      </div>
      <div class="stat-pill">
        <span class="stat-label">Total Memory</span>
        <span class="stat-val" id="stat-mem">-</span>
      </div>
    </div>
    <div class="toolbar">
      <input type="text" id="filter" class="search-box" placeholder="Filter processes..." />
    </div>
  </header>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th onclick="sortBy('name')">Process Name</th>
          <th onclick="sortBy('pid')" style="width: 70px;">PID</th>
          <th onclick="sortBy('cpu')" style="width: 110px;">CPU %</th>
          <th onclick="sortBy('memoryWorkingSet')" style="width: 95px;">Memory</th>
          <th style="width: 75px; text-align: right;">Action</th>
        </tr>
      </thead>
      <tbody id="process-list"></tbody>
    </table>
  </div>

  <div class="charts-container">
    <div class="chart-panel">
      <div class="chart-header">
        <span class="chart-title">CPU History <span class="chart-subtitle">60s</span></span>
        <span class="chart-stat" id="chart-cpu-stat">-</span>
      </div>
      <canvas id="canvas-cpu" class="chart-canvas"></canvas>
    </div>
    <div class="chart-panel">
      <div class="chart-header">
        <span class="chart-title">Memory History <span class="chart-subtitle">60s</span></span>
        <span class="chart-stat" id="chart-mem-stat">-</span>
      </div>
      <canvas id="canvas-mem" class="chart-canvas"></canvas>
    </div>
  </div>

  <footer>
    <div><span class="pulse-dot"></span><span id="app-title">Process Monitor</span></div>
    <div>Updated every 1s</div>
  </footer>

  <script>
    let currentData = { processes: [], summary: {} };
    let currentSort = { key: 'cpu', desc: true };
    let filterQuery = '';

    const MAX_POINTS = 60;
    const cpuHistory = [];
    const memHistory = [];

    const filterInput = document.getElementById('filter');
    filterInput.addEventListener('input', (e) => {
      filterQuery = e.target.value.toLowerCase().trim();
      render();
    });

    function sortBy(key) {
      if (currentSort.key === key) {
        currentSort.desc = !currentSort.desc;
      } else {
        currentSort.key = key;
        currentSort.desc = key === 'cpu' || key === 'memoryWorkingSet';
      }
      render();
    }

    function killProcess(pid, name) {
      if (confirm('Are you sure you want to kill process "' + name + '" (PID ' + pid + ')?')) {
        console.log('__KILL_PROCESS__:' + pid);
      }
    }

    function pushHistory(cpu, mem) {
      cpuHistory.push(cpu);
      if (cpuHistory.length > MAX_POINTS) cpuHistory.shift();
      memHistory.push(mem);
      if (memHistory.length > MAX_POINTS) memHistory.shift();
    }

    function drawChart(canvasId, statId, history, unit, colorType) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;
      if (width <= 0 || height <= 0) return;

      const physicalWidth = Math.round(width * dpr);
      const physicalHeight = Math.round(height * dpr);
      if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
        canvas.width = physicalWidth;
        canvas.height = physicalHeight;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const strokeColor = colorType === 'cpu'
        ? (isDark ? '#2997ff' : '#0071e3')
        : (isDark ? '#bf5af2' : '#af52de');
      const gradTop = colorType === 'cpu'
        ? (isDark ? 'rgba(41, 151, 255, 0.32)' : 'rgba(0, 113, 227, 0.20)')
        : (isDark ? 'rgba(191, 90, 242, 0.32)' : 'rgba(175, 82, 222, 0.20)');
      const gradBottom = colorType === 'cpu'
        ? (isDark ? 'rgba(41, 151, 255, 0.0)' : 'rgba(0, 113, 227, 0.0)')
        : (isDark ? 'rgba(191, 90, 242, 0.0)' : 'rgba(175, 82, 222, 0.0)');
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';

      const currentVal = history.length > 0 ? history[history.length - 1] : 0;
      const peakVal = history.length > 0 ? Math.max(...history) : 0;

      const statEl = document.getElementById(statId);
      if (statEl) {
        statEl.innerHTML = '<span style="color: var(--text-muted); font-weight: normal; font-size: 10px;">Peak: </span>' +
          peakVal.toFixed(1) + unit +
          ' &nbsp;&middot;&nbsp; <span style="color: var(--text-muted); font-weight: normal; font-size: 10px;">Now: </span>' +
          currentVal.toFixed(1) + unit;
      }

      let maxScale = 100;
      if (colorType === 'cpu') {
        maxScale = Math.max(100, Math.ceil((peakVal + 10) / 20) * 20);
      } else {
        maxScale = Math.max(100, Math.ceil((peakVal * 1.2) / 50) * 50);
      }

      const topPadding = 20;
      const bottomPadding = 4;
      const plotHeight = Math.max(10, height - topPadding - bottomPadding);

      // Horizontal grid lines at 25%, 50%, 75%
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      [0.25, 0.5, 0.75].forEach(ratio => {
        const y = Math.round(topPadding + plotHeight * (1 - ratio)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      });

      // Vertical grid lines every 10 points
      const stepX = width / (MAX_POINTS - 1);
      for (let i = 0; i < MAX_POINTS; i += 10) {
        const x = Math.round(width - i * stepX) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, topPadding);
        ctx.lineTo(x, height - bottomPadding);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      if (history.length < 2) {
        ctx.restore();
        return;
      }

      const points = [];
      for (let i = 0; i < history.length; i++) {
        const x = width - (history.length - 1 - i) * stepX;
        const ratio = Math.min(1, Math.max(0, history[i] / maxScale));
        const y = topPadding + plotHeight * (1 - ratio);
        points.push({ x, y });
      }

      // Draw gradient area
      const gradient = ctx.createLinearGradient(0, topPadding, 0, height - bottomPadding);
      gradient.addColorStop(0, gradTop);
      gradient.addColorStop(1, gradBottom);

      ctx.beginPath();
      ctx.moveTo(points[0].x, height - bottomPadding);
      ctx.lineTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.lineTo(points[points.length - 1].x, height - bottomPadding);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.75;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Point highlight at latest value
      const latest = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(latest.x - 1, latest.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = strokeColor;
      ctx.fill();

      ctx.restore();
    }

    function drawCharts() {
      drawChart('canvas-cpu', 'chart-cpu-stat', cpuHistory, '%', 'cpu');
      drawChart('canvas-mem', 'chart-mem-stat', memHistory, ' MB', 'mem');
    }

    window.addEventListener('resize', drawCharts);

    function render() {
      const { processes, summary } = currentData;
      if (!processes) return;

      document.getElementById('stat-count').innerText = summary.processCount || processes.length;
      document.getElementById('stat-cpu').innerText = (summary.totalCpu || 0).toFixed(1) + '%';
      document.getElementById('stat-mem').innerText = (summary.totalMemory || 0).toFixed(1) + ' MB';
      if (summary.appName) {
        document.getElementById('app-title').innerText = summary.appName + ' Process Monitor';
      }

      let filtered = processes.filter(p => {
        if (!filterQuery) return true;
        return (p.name || '').toLowerCase().includes(filterQuery) ||
               (p.type || '').toLowerCase().includes(filterQuery) ||
               String(p.pid).includes(filterQuery);
      });

      filtered.sort((a, b) => {
        let valA = a[currentSort.key];
        let valB = b[currentSort.key];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return currentSort.desc ? 1 : -1;
        if (valA > valB) return currentSort.desc ? -1 : 1;
        return 0;
      });

      const tbody = document.getElementById('process-list');
      tbody.innerHTML = filtered.map(p => {
        const cpuWidth = Math.min(100, Math.round(p.cpu * 2));
        const isTab = String(p.type || '').toLowerCase() === 'tab';
        const typeClass = p.isMain ? 'pill-type pill-main' : (isTab ? 'pill-type pill-tab' : 'pill-type');
        return '<tr>' +
          '<td>' +
            '<div style="font-weight: 500;">' + escapeHtml(p.name) + '</div>' +
            '<div style="margin-top: 2px;"><span class="' + typeClass + '">' + escapeHtml(p.type) + '</span></div>' +
          '</td>' +
          '<td class="mono" style="color: var(--text-muted);">' + p.pid + '</td>' +
          '<td class="mono">' +
            p.cpu.toFixed(1) + '%' +
            '<span class="cpu-bar-bg"><span class="cpu-bar-fill" style="width: ' + cpuWidth + '%;"></span></span>' +
          '</td>' +
          '<td class="mono">' + p.memoryWorkingSet.toFixed(1) + ' MB</td>' +
          '<td style="text-align: right;">' +
            (!p.isMain
              ? '<button class="btn-kill" onclick="killProcess(' + p.pid + ', \\'' + escapeAttr(p.name) + '\\')">End</button>'
              : '<span style="color: var(--text-muted); font-size: 10px;">Primary</span>') +
          '</td>' +
        '</tr>';
      }).join('');
    }

    function escapeHtml(str) {
      return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function escapeAttr(str) {
      return String(str || '').replace(/'/g, "\\\\'");
    }

    window.__updateMetrics = (data) => {
      currentData = data;
      const cpu = data.summary ? (data.summary.totalCpu || 0) : 0;
      const mem = data.summary ? (data.summary.totalMemory || 0) : 0;
      pushHistory(cpu, mem);
      render();
      drawCharts();
    };
  </script>
</body>
</html>`;
}

/**
 * Opens or focuses the Process Monitor window.
 * Code-independent: self-contained and easily reusable across any Electron project.
 */
export function openProcessMonitor(options?: ProcessMonitorOptions): BrowserWindow {
  if (monitorWindow && !monitorWindow.isDestroyed()) {
    monitorWindow.show();
    monitorWindow.focus();
    return monitorWindow;
  }

  const width = options?.width ?? 640;
  const height = options?.height ?? 540;
  const minWidth = options?.minWidth ?? 460;
  const minHeight = options?.minHeight ?? 380;
  const parent = options?.parent;
  const title = options?.title ?? `${app.getName() || 'Electron'} - Process Monitor`;
  const pollInterval = options?.pollInterval ?? 1000;

  monitorWindow = new BrowserWindow({
    width,
    height,
    minWidth,
    minHeight,
    title,
    parent,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: undefined,
      sandbox: true,
    },
  });

  const htmlDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(getMonitorHtml())}`;
  monitorWindow.loadURL(htmlDataUrl);

  monitorWindow.once('ready-to-show', () => {
    monitorWindow?.show();
    pushMetrics();
  });

  const pushMetrics = () => {
    if (!monitorWindow || monitorWindow.isDestroyed()) return;
    const data = collectMetrics();
    monitorWindow.webContents.executeJavaScript(
      `window.__updateMetrics && window.__updateMetrics(${JSON.stringify(data)});`
    ).catch(() => {});
  };

  // Push updates every pollInterval ms while window is open
  if (metricsInterval) clearInterval(metricsInterval);
  metricsInterval = setInterval(pushMetrics, pollInterval);

  // Expose kill handler safely via webContents console-message without requiring preload
  monitorWindow.webContents.on('console-message', (_, _level, message) => {
    if (message.startsWith('__KILL_PROCESS__:')) {
      const pid = parseInt(message.replace('__KILL_PROCESS__:', ''), 10);
      if (!isNaN(pid) && pid !== process.pid) {
        try {
          process.kill(pid);
        } catch (e) {
          console.error(`Failed to kill process ${pid}:`, e);
        }
        pushMetrics();
      }
    }
  });

  monitorWindow.on('closed', () => {
    monitorWindow = null;
    if (metricsInterval) {
      clearInterval(metricsInterval);
      metricsInterval = null;
    }
  });

  return monitorWindow;
}

/**
 * Toggles the Process Monitor window open/closed.
 */
export function toggleProcessMonitor(options?: ProcessMonitorOptions): void {
  if (monitorWindow && !monitorWindow.isDestroyed() && monitorWindow.isVisible()) {
    monitorWindow.close();
  } else {
    openProcessMonitor(options);
  }
}

// Setup IPC listener if app wants to open from renderer
try {
  ipcMain.on('process-monitor:open', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    openProcessMonitor({ parent: win ?? undefined });
  });
} catch (_) {}

export default openProcessMonitor;

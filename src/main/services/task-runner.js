const { spawn } = require('child_process');
const fs = require('fs');
const { app } = require('electron');
const pty = require('node-pty');

const { ensurePtyPermissions } = require('../utils/pty-permissions');
const { broadcast } = require('../utils/broadcast');
const { getBrewPath, getEnvWithBrew } = require('./brew-cli');

const activeTasks = new Map();

function runAction(event, { taskId, action, token, zap }, onRefreshUpdates) {
  const actions = {
    install: ['install', '--force', '--cask', token],
    upgrade: ['upgrade', '--force', '--cask', token],
    uninstall: zap ? ['uninstall', '--force', '--zap', '--cask', token] : ['uninstall', '--force', '--cask', token],
    refresh: ['update'],
    cleanup: ['cleanup', '--prune=all']
  };

  const args = actions[action];
  if (!args) {
    if (!event.sender.isDestroyed()) {
      event.reply('task:complete', { taskId, code: 1, error: 'Invalid action' });
    }
    return;
  }

  const brewCmd = `"${getBrewPath()}" ${args.map(a => `"${a}"`).join(' ')}`;
  const shellCmd = fs.existsSync('/bin/zsh') ? '/bin/zsh' : (fs.existsSync('/bin/bash') ? '/bin/bash' : '/bin/sh');
  const shellArgs = ['-l', '-c', brewCmd];
  const env = getEnvWithBrew();

  const onTaskFinished = (exitCode) => {
    activeTasks.delete(taskId);

    if (exitCode === 0 && (action === 'install' || action === 'uninstall')) {
      if (app?.dock?.bounce) {
        app.dock.bounce('informational');
      }
    }

    if (action === 'cleanup') {
      broadcast('cleanup:status', 'complete');
    }

    if (exitCode === 0 && action === 'refresh' && typeof onRefreshUpdates === 'function') {
      onRefreshUpdates().catch(() => { });
    }

    if (!event.sender.isDestroyed()) {
      event.sender.send('task:complete', { taskId, code: exitCode });
    }
  };

  ensurePtyPermissions();

  let ptyProcess = null;
  try {
    ptyProcess = pty.spawn(shellCmd, shellArgs, {
      name: 'xterm-color',
      cols: 80,
      rows: 15,
      cwd: process.env.HOME || '/tmp',
      env
    });
  } catch (err) {
    console.warn('node-pty spawn failed, falling back to child_process.spawn:', err);
  }

  if (ptyProcess) {
    activeTasks.set(taskId, {
      write: (data) => { try { ptyProcess.write(data); } catch (_) { } },
      kill: () => { try { ptyProcess.kill(); } catch (_) { } }
    });

    ptyProcess.onData((data) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('task:log', { taskId, type: 'stdout', text: data });
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      onTaskFinished(exitCode);
    });
  } else {
    const cp = spawn(shellCmd, shellArgs, {
      cwd: process.env.HOME || '/tmp',
      env
    });

    activeTasks.set(taskId, {
      write: (data) => { try { cp.stdin.write(data); } catch (_) { } },
      kill: () => { try { cp.kill(); } catch (_) { } }
    });

    const forward = (stream) => stream.on('data', (data) => {
      if (!event.sender.isDestroyed()) {
        const text = data.toString();
        event.sender.send('task:log', { taskId, type: 'stdout', text });
      }
    });

    forward(cp.stdout);
    forward(cp.stderr);

    cp.on('close', (exitCode) => {
      onTaskFinished(exitCode || 0);
    });
  }
}

function cancelAction(event, taskId) {
  const task = activeTasks.get(taskId);
  if (task) {
    task.kill();
    activeTasks.delete(taskId);
    broadcast('cleanup:status', 'complete');
    if (!event.sender.isDestroyed()) {
      event.reply('task:complete', { taskId, code: -1, cancelled: true });
    }
  }
}

function writePtyInput(taskId, text) {
  activeTasks.get(taskId)?.write?.(text);
}

module.exports = {
  runAction,
  cancelAction,
  writePtyInput
};

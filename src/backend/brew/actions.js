const ptyRunner = require('./pty');
const { getBrewPath, getEnvWithBrew } = require('./brew');

/**
 * Executes a Homebrew action (install, upgrade, uninstall, refresh, cleanup) via system PTY runner
 * @param {object} data
 * @param {string} data.taskId - Task ID
 * @param {string} data.action - Action name
 * @param {string} data.token - Cask token
 * @param {boolean} [data.zap] - Whether to zap during uninstall
 * @param {object} [callbacks]
 * @param {Function} [callbacks.onLog]
 * @param {Function} [callbacks.onComplete]
 * @param {Function} [callbacks.onRefreshUpdates]
 */
function runAction({ taskId, action, token, zap }, callbacks = {}) {
  const { onLog, onComplete, onRefreshUpdates } = callbacks;

  const actions = {
    install: ['install', '--force', '--cask', token],
    upgrade: ['upgrade', '--force', '--cask', token],
    uninstall: zap ? ['uninstall', '--force', '--zap', '--cask', token] : ['uninstall', '--force', '--cask', token],
    refresh: ['update'],
    cleanup: ['cleanup', '--prune=all']
  };

  const args = actions[action];
  if (!args) {
    onComplete?.({ taskId, code: 1, error: 'Invalid action' });
    return;
  }

  const brewCmd = `"${getBrewPath()}" ${args.map(a => `"${a}"`).join(' ')}`;

  ptyRunner.runTask(
    {
      taskId,
      command: brewCmd,
      env: getEnvWithBrew()
    },
    {
      onLog,
      onComplete: ({ taskId: tid, code, error, cancelled }) => {
        if (code === 0 && action === 'refresh' && typeof onRefreshUpdates === 'function') {
          onRefreshUpdates().catch(() => { });
        }
        onComplete?.({ taskId: tid, code, error, cancelled });
      }
    }
  );
}

function cancelAction(taskId, onComplete) {
  ptyRunner.cancelTask(taskId, onComplete);
}

function writePtyInput(taskId, text) {
  ptyRunner.writeTaskInput(taskId, text);
}

module.exports = {
  runAction,
  cancelAction,
  writePtyInput
};

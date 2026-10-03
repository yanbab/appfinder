const brewService = require('./services/brew-service');
const appLauncher = require('./services/app-launcher');
const taskManager = require('./tasks/task-manager');

/**
 * Backward-compatible facade for Homebrew domain operations,
 * delegating to modular services:
 * - brew-service: data and brew CLI querying
 * - app-launcher: application launching & cache cleanup
 * - task-manager: execution & prompt handling
 */
function runAction(data, callbacks = {}) {
  const cbs = typeof callbacks === 'function' ? { onComplete: callbacks } : (callbacks || {});
  const { onLog, onComplete, onPrompt, onRefreshUpdates } = cbs;
  const { taskId, action, token, zap } = data || {};

  const args = brewService.getActionArgs(action, token, zap);
  if (!args) {
    onComplete?.({ taskId, code: 1, error: 'Invalid action' });
    return;
  }

  taskManager.runTask(
    {
      taskId,
      command: brewService.getBrewPath(),
      args,
      env: brewService.getEnvWithBrew()
    },
    {
      onLog,
      onPrompt,
      onComplete: ({ taskId: tid, code, error, cancelled }) => {
        if (code === 0 && action === 'refresh') {
          if (typeof onRefreshUpdates === 'function') {
            onRefreshUpdates().catch(() => { });
          } else {
            brewService.getUpdates(true).catch(() => { });
          }
        }
        onComplete?.({ taskId: tid, code, error, cancelled });
      }
    }
  );
}

function cancelAction(taskId, onComplete) {
  taskManager.cancelTask(taskId, onComplete);
}

function writePtyInput(taskId, text) {
  taskManager.writeTaskInput(taskId, text);
}

module.exports = {
  ...brewService,
  launchApp: appLauncher.launchApp,
  cleanCache: appLauncher.cleanCache,
  runAction,
  cancelAction,
  writePtyInput
};

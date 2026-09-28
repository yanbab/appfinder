const path = require('path');
const fs = require('fs');

let permissionsChecked = false;

/**
 * Ensures spawn-helper binaries within node-pty have executable permissions
 * when packaged on macOS.
 */
function ensurePtyPermissions() {
  if (permissionsChecked) return;
  permissionsChecked = true;

  try {
    const ptyDir = path.dirname(require.resolve('node-pty/package.json'));
    const prebuildsDir = path.join(ptyDir, 'prebuilds');
    if (fs.existsSync(prebuildsDir)) {
      for (const d of fs.readdirSync(prebuildsDir)) {
        const helper = path.join(prebuildsDir, d, 'spawn-helper');
        if (fs.existsSync(helper)) {
          try {
            fs.chmodSync(helper, 0o755);
          } catch (_) { }
        }
      }
    }
    const releaseHelper = path.join(ptyDir, 'build', 'Release', 'spawn-helper');
    if (fs.existsSync(releaseHelper)) {
      try {
        fs.chmodSync(releaseHelper, 0o755);
      } catch (_) { }
    }
  } catch (_) { }
}

module.exports = {
  ensurePtyPermissions
};

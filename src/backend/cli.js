#!/usr/bin/env node

const path = require('path');
const backends = require('./index');

function printHelp() {
  console.log(`
Usage:
  ./cli.js [backend] <command> [arguments]

Backends:
  brew | mock (default: ${backends.name})

Commands:
  getApps                   List all available apps from apps.json
  getCategories             List all categories from categories.json
  getInstalled              List installed apps and versions
  getUpdates                List available updates
  getInfo <token>           Get app metadata
  getSizes <token>          Get download/installed/data sizes
  open <token>              Launch the application
  cleanCache                Clean package manager caches

Actions:
  install <token>           Install an app
  upgrade <token>           Upgrade an app
  uninstall <token> [--zap] Uninstall an app
  refresh                   Refresh update repositories

Examples:
  ./cli.js brew getInstalled
  ./cli.js brew install iterm2
  ./cli.js mock getInstalled
  ./cli.js getInfo visual-studio-code
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  let backendName = backends.name;
  let cmd = args[0];
  let cmdArgs = args.slice(1);

  if (args[0] === 'brew' || args[0] === 'mock') {
    backendName = args[0];
    cmd = args[1];
    cmdArgs = args.slice(2);
  }

  const selectedBackend = backends.backends[backendName] || backends;
  if (!cmd) {
    printHelp();
    process.exit(1);
  }

  const normalizedCmd = cmd.toLowerCase();

  switch (normalizedCmd) {
    case 'getapps':
    case 'apps': {
      const apps = backends.getApps();
      console.log(JSON.stringify(apps, null, 2));
      break;
    }

    case 'getcategories':
    case 'categories': {
      const categories = backends.getCategories();
      console.log(JSON.stringify(categories, null, 2));
      break;
    }

    case 'getinstalled':
    case 'installed': {
      const installed = await selectedBackend.getInstalled((msg) => process.stderr.write(msg));
      console.log(JSON.stringify(installed, null, 2));
      break;
    }

    case 'getupdates':
    case 'updates': {
      const updates = await selectedBackend.getUpdates(true);
      console.log(JSON.stringify(updates, null, 2));
      break;
    }

    case 'getinfo':
    case 'getcaskinfo':
    case 'info': {
      const token = cmdArgs[0];
      if (!token) {
        console.error('Error: Token required (e.g. ./cli.js brew info iterm2)');
        process.exit(1);
      }
      const info = await selectedBackend.getCaskInfo(token);
      console.log(JSON.stringify(info, null, 2));
      break;
    }

    case 'getsizes':
    case 'getcasksizes':
    case 'sizes': {
      const token = cmdArgs[0];
      if (!token) {
        console.error('Error: Token required (e.g. ./cli.js brew sizes iterm2)');
        process.exit(1);
      }
      const sizes = await selectedBackend.getCaskSizesByToken(token);
      console.log(JSON.stringify(sizes, null, 2));
      break;
    }

    case 'open': {
      const token = cmdArgs[0];
      if (!token) {
        console.error('Error: Token required (e.g. ./cli.js brew open iterm2)');
        process.exit(1);
      }
      const res = await selectedBackend.openApp(token);
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case 'cleancache':
    case 'cleanup': {
      const res = await selectedBackend.cleanCache();
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case 'install':
    case 'upgrade':
    case 'uninstall':
    case 'refresh': {
      const token = cmdArgs[0];
      const zap = cmdArgs.includes('--zap');
      const taskId = `cli-${Date.now()}`;

      if (normalizedCmd !== 'refresh' && !token) {
        console.error(`Error: Token required for ${normalizedCmd}`);
        process.exit(1);
      }

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', (chunk) => {
          const str = chunk.toString();
          if (str === '\u0003') { // Ctrl+C
            selectedBackend.cancelAction(taskId, () => {
              process.exit(130);
            });
          } else {
            selectedBackend.writePtyInput(taskId, str);
          }
        });
      }

      selectedBackend.runAction(
        { taskId, action: normalizedCmd, token, zap },
        {
          onLog: ({ text }) => process.stdout.write(text || ''),
          onComplete: ({ code, error, cancelled }) => {
            if (process.stdin.isTTY) {
              try { process.stdin.setRawMode(false); } catch (_) { }
            }
            if (error) console.error('\nTask error:', error);
            if (cancelled) console.log('\nTask cancelled');
            process.exit(code ?? 0);
          }
        }
      );
      break;
    }

    default:
      console.error(`Unknown command: ${cmd}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

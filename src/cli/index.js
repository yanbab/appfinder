#!/usr/bin/env node

const path = require('path');
const backend = require('../main/brew');

function printHelp() {
  console.log(`
AppFinder CLI - Command Line Interface for AppFinder Backend

Usage:
  appfinder <command> [arguments]

Queries (Outputs JSON):
  apps, getApps                   List all catalog applications
  categories, getCategories       List all application categories
  installed, getInstalled         List installed applications & versions
  updates, getUpdates [--force]   List available application updates
  info, getInfo <token>           Get metadata for a specific application
  open <appName>                  Launch an application

  cleanCache                      Clean package manager caches

Actions (Direct terminal I/O & interactive PTY):
  install <token>                 Install an application
  upgrade <token>                 Upgrade an application
  uninstall <token> [--zap]       Uninstall an application (--zap to remove settings/data)
  refresh                         Refresh repository metadata
  cleanup                         Remove unused dependencies/cache

Examples:
  node src/cli/index.js installed
  node src/cli/index.js info visual-studio-code
  node src/cli/index.js install iterm2
  node src/cli/index.js getUpdates
`);
}

async function main() {
  const rawArgs = process.argv.slice(2);
  if (!rawArgs.length || rawArgs.includes('-h') || rawArgs.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  let args = [...rawArgs];
  const command = (args[0] || '').toLowerCase();
  const cmdArgs = args.slice(1);

  if (!command) {
    printHelp();
    process.exit(1);
  }

  switch (command) {
    case 'apps':
    case 'getapps': {
      const data = backend.getApps();
      console.log(JSON.stringify(data, null, 2));
      break;
    }

    case 'categories':
    case 'getcategories': {
      const data = backend.getCategories();
      console.log(JSON.stringify(data, null, 2));
      break;
    }

    case 'installed':
    case 'getinstalled': {
      const installed = await backend.getInstalled((msg) => {
        if (process.stderr.isTTY) {
          process.stderr.write(`${msg}\n`);
        }
      });
      console.log(JSON.stringify(installed, null, 2));
      break;
    }

    case 'updates':
    case 'getupdates': {
      const force = cmdArgs.includes('--force') || cmdArgs.includes('-f');
      const updates = await backend.getUpdates(force);
      console.log(JSON.stringify(updates, null, 2));
      break;
    }

    case 'info':
    case 'getinfo':
    case 'getcaskinfo': {
      const token = cmdArgs[0];
      if (!token) {
        console.error(JSON.stringify({ error: 'Token required. Example: appfinder info <token>' }, null, 2));
        process.exit(1);
      }
      const info = await backend.getCaskInfo(token);
      console.log(JSON.stringify(info, null, 2));
      break;
    }

    case 'open': {
      const appName = cmdArgs[0];
      if (!appName) {
        console.error(JSON.stringify({ error: 'App name required. Example: appfinder open <appName>' }, null, 2));
        process.exit(1);
      }
      const result = await backend.launchApp(appName);
      console.log(JSON.stringify(result, null, 2));
      break;
    }


    case 'cleancache': {
      const result = await backend.cleanCache();
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'install':
    case 'upgrade':
    case 'uninstall':
    case 'refresh':
    case 'cleanup': {
      const token = cmdArgs.find((a) => !a.startsWith('-'));
      const zap = cmdArgs.includes('--zap');
      const taskId = `cli-${Date.now()}`;

      if (['install', 'upgrade', 'uninstall'].includes(command) && !token) {
        console.error(`Error: Token required for ${command}. Example: appfinder ${command} <token>`);
        process.exit(1);
      }

      // Direct interactive terminal I/O streaming
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', (chunk) => {
          const str = chunk.toString();
          if (str === '\u0003') { // Handle Ctrl+C gracefully
            backend.cancelAction(taskId, () => {
              process.exit(130);
            });
          } else {
            backend.writePtyInput(taskId, str);
          }
        });
      }

      backend.runAction(
        { taskId, action: command, token, zap },
        {
          onLog: ({ text }) => {
            if (text) {
              process.stdout.write(text);
            }
          },
          onComplete: ({ code, error, cancelled }) => {
            if (process.stdin.isTTY) {
              try {
                process.stdin.setRawMode(false);
              } catch (_) { }
            }
            if (error) {
              console.error('\nAction error:', error);
            }
            if (cancelled) {
              console.log('\nAction cancelled.');
            }
            process.exit(code ?? 0);
          }
        }
      );
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

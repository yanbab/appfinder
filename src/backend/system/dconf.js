const { execFile, spawn } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * Parses GVariant string output from gsettings into standard JavaScript types
 * @param {string} raw - Raw output from gsettings
 * @returns {any}
 */
function parseGVariant(raw) {
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();

  // Boolean
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Number
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    if (!isNaN(num)) return num;
  }

  // Quoted string (e.g. 'prefer-dark' -> prefer-dark)
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }

  // Empty or tuple/array variants like ['a', 'b']
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const jsonLike = trimmed.replace(/'/g, '"');
      return JSON.parse(jsonLike);
    } catch (_) { }
  }

  return trimmed;
}

/**
 * Formats a JavaScript value into a valid GVariant parameter for gsettings set
 * @param {any} value
 * @returns {string}
 */
function formatGVariant(value) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      return value;
    }
    return `'${value.replace(/'/g, "\\'")}'`;
  }
  if (Array.isArray(value)) {
    return `[${value.map(formatGVariant).join(', ')}]`;
  }
  return `'${String(value)}'`;
}

/**
 * Gets a gsettings key value
 * @param {string} schema - GSettings schema (e.g. 'org.gnome.desktop.interface')
 * @param {string} key - Key name (e.g. 'color-scheme' or 'accent-color')
 * @param {object} [options]
 * @param {boolean} [options.raw=false] - Return unparsed string
 * @returns {Promise<any>}
 */
async function get(schema, key, options = {}) {
  if (!schema || !key) {
    throw new Error('Both schema and key are required for gsettings get');
  }

  try {
    const { stdout } = await execFileAsync('gsettings', ['get', schema, key], {
      timeout: 3000,
      encoding: 'utf8'
    });
    const output = (stdout || '').trim();
    return options.raw ? output : parseGVariant(output);
  } catch (err) {
    throw new Error(`gsettings get ${schema} ${key} failed: ${err.message}`);
  }
}

/**
 * Sets a gsettings key value
 * @param {string} schema - GSettings schema
 * @param {string} key - Key name
 * @param {any} value - Value to set
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function set(schema, key, value) {
  if (!schema || !key) {
    throw new Error('Both schema and key are required for gsettings set');
  }

  const formattedValue = formatGVariant(value);

  try {
    await execFileAsync('gsettings', ['set', schema, key, formattedValue], {
      timeout: 3000,
      encoding: 'utf8'
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: `gsettings set ${schema} ${key} ${formattedValue} failed: ${err.message}`
    };
  }
}

/**
 * Resets a gsettings key value to default
 * @param {string} schema
 * @param {string} key
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function reset(schema, key) {
  if (!schema || !key) {
    throw new Error('Both schema and key are required for gsettings reset');
  }

  try {
    await execFileAsync('gsettings', ['reset', schema, key], {
      timeout: 3000,
      encoding: 'utf8'
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: `gsettings reset ${schema} ${key} failed: ${err.message}`
    };
  }
}

/**
 * Subscribes to changes on a gsettings schema or specific key via `gsettings monitor`
 * @param {string} schema - GSettings schema
 * @param {string|Function} keyOrCb - Key name to monitor, or callback if monitoring entire schema
 * @param {Function} [maybeCb] - Callback function if key was provided
 * @returns {() => void} Unsubscribe function that terminates the monitor process
 */
function subscribe(schema, keyOrCb, maybeCb) {
  const key = typeof keyOrCb === 'string' ? keyOrCb : null;
  const callback = typeof keyOrCb === 'function' ? keyOrCb : maybeCb;

  if (!schema || typeof callback !== 'function') {
    throw new Error('Schema and callback function are required for gsettings subscribe');
  }

  const args = ['monitor', schema];
  if (key) {
    args.push(key);
  }

  let monitorProcess = null;
  try {
    monitorProcess = spawn('gsettings', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (err) {
    console.warn('Failed to spawn gsettings monitor:', err);
    return () => { };
  }

  monitorProcess.on('error', () => { });

  let buffer = '';

  monitorProcess.stdout?.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let changedKey = key;
      let rawVal = trimmed;

      const colonIdx = trimmed.indexOf(':');
      if (colonIdx !== -1) {
        const potentialKey = trimmed.substring(0, colonIdx).trim();
        if (!potentialKey.includes(' ') && !potentialKey.startsWith("'")) {
          changedKey = potentialKey;
          rawVal = trimmed.substring(colonIdx + 1).trim();
        }
      }

      const parsedValue = parseGVariant(rawVal);
      try {
        callback(parsedValue, changedKey, rawVal);
      } catch (cbErr) {
        console.error('Error in gsettings subscriber callback:', cbErr);
      }
    }
  });

  return () => {
    if (monitorProcess) {
      try {
        monitorProcess.stdout?.destroy();
        monitorProcess.stderr?.destroy();
        if (monitorProcess.pid && !monitorProcess.killed) {
          monitorProcess.kill('SIGTERM');
        }
      } catch (_) { }
    }
  };
}

module.exports = {
  get,
  set,
  reset,
  subscribe,
  parseGVariant,
  formatGVariant
};

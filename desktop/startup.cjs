const {appendFileSync, mkdirSync, statSync, renameSync} = require('node:fs');
const path = require('node:path');

// Works when the executable is opened directly as well as through launch.sh.
function startupLog(directory) {
  const file = path.join(directory, 'startup.log');
  try {
    mkdirSync(directory, {recursive:true});
    try { if (statSync(file).size > 2 * 1024 * 1024) renameSync(file, file + '.previous'); } catch {}
  } catch {}
  const log = (message, detail = '') => {
    const line = `[${new Date().toISOString()}] ${message}${detail ? ': ' + String(detail).slice(0, 8000) : ''}`;
    console.log(line);
    try { appendFileSync(file, line + '\n'); } catch {}
  };
  return {file, log};
}

function startupWatch({log, fail, schedule = setTimeout, cancel = clearTimeout, timeout = 120000}) {
  let settled = false, stage = 'starting the desktop runtime';
  const timer = schedule(() => reject(`Startup timed out while ${stage}.`), timeout);
  function reject(reason) {
    if (settled) return;
    settled = true; cancel(timer); log('STARTUP FAILED', reason); fail(reason);
  }
  return {
    stage(message) { if (!settled) { stage = message; log('STARTUP', message); } },
    ready() { if (!settled) { settled = true; cancel(timer); log('GAME READY'); } },
    fail: reject,
    stop() { settled = true; cancel(timer); },
  };
}
module.exports = {startupLog, startupWatch};

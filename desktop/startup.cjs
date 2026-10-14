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

function startupWatch({log, fail, schedule = setTimeout, cancel = clearTimeout, timeout = 120000, platform = process.platform}) {
  let settled = false, gpuCrashes = 0, stage = 'starting the desktop runtime';
  const timer = schedule(() => reject(`Startup timed out while ${stage}.`), timeout);
  function reject(reason) {
    if (settled) return;
    settled = true; cancel(timer); log('STARTUP FAILED', reason); fail(reason);
  }
  return {
    stage(message) { if (!settled) { stage = message; log('STARTUP', message); } },
    ready() { if (!settled) { settled = true; cancel(timer); log('GAME READY'); } },
    gpuExit(details) {
      if (settled || details.type !== 'GPU' || !['crashed','abnormal-exit','launch-failed','oom','integrity-failure'].includes(details.reason)) return;
      if (++gpuCrashes >= 3) reject(`The graphics process failed ${gpuCrashes} times (last exit: ${details.exitCode}). ${platform==='linux'?'Try Launch OpenGL.sh from the installed folder, then include the launch log if it still fails.':'Include the startup log when reporting this problem.'}`);
    },
    fail: reject,
    stop() { settled = true; cancel(timer); },
  };
}
function graphicsSwitches(platform, mode) {
  if (!mode || mode === 'default') return [];
  if (mode !== 'opengl' || platform !== 'linux') throw new Error('Supported Linux graphics modes: default, opengl.');
  // Select a hardware backend; keep GPU acceleration and all sandboxes enabled.
  // Bypass only GPU shader disk caching, never localStorage or character saves.
  return [['use-gl','angle'],['use-angle','gl'],['disable-gpu-shader-disk-cache','']];
}
module.exports = {startupLog, startupWatch, graphicsSwitches};

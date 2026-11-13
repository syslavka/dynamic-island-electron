const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const path = require('node:path');

const FEATURES = ['microphone', 'camera', 'bluetooth', 'audio', 'foreground'];
function unavailable(reason) {
  return { schemaVersion: 1, sampledAt: new Date().toISOString(), available: false,
    capabilities: Object.fromEntries(FEATURES.map(key => [key, { available: false, reason }])),
    microphone: null, camera: null, bluetooth: null, audio: null, foreground: null };
}

// Public API: request() -> schemaVersion 1 snapshot; setMute(boolean,
// 'render'|'capture') -> {ok,error}; stop() -> terminal disposal.
// Snapshot fields: sampledAt, available, capabilities, microphone/camera
// {active,apps:string[]} | null, bluetooth {sampledAt,complete,devices:[]},
// audio {renderMuted,captureMuted,role,endpoints}, foreground {pid,name,path,
// title,windowHandle} | null. Inspect capabilities before treating missing
// observations as inactive. ConsentStore identifiers are intentionally raw.
// Pull-only, one request in flight. Concurrent callers share the cached sample.
// stop() is terminal; create another bridge to restart after disposal.
function createActivityBridge({ timeoutMs = 15000, cacheMs = 1000, idleMs = 30000 } = {}) {
  for (const value of [timeoutMs, cacheMs, idleMs]) {
    if (!Number.isFinite(value) || value < 0 || value > 2147483647) throw new RangeError('Invalid activity timing');
  }
  if (!timeoutMs) throw new RangeError('timeoutMs must be positive');
  let worker, pending, flight, cached, cachedAt = 0, disposed = false, idleTimer;
  function retire(current, reason) {
    if (!current || worker !== current) return;
    worker = null;
    clearTimeout(idleTimer);
    current.lines?.close();
    current.child.kill();
    if (pending) { const done = pending; pending = null; done(unavailable(reason)); }
  }
  function start() {
    if (worker) return worker;
    const directory = __dirname.replace(/app\.asar(?=[\\/])/, 'app.asar.unpacked');
    const child = spawn(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe'),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(directory, 'activity.ps1')],
      { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const current = worker = { child };
    current.lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    current.lines.on('line', line => {
      if (worker !== current || !pending) return;
      try {
        const value = JSON.parse(line);
        if (!(typeof value.ok === 'boolean') && (value.schemaVersion !== 1 || !value.capabilities || typeof value.available !== 'boolean')) throw new Error();
        const done = pending; pending = null; done(value);
      } catch { retire(current, 'invalid-response'); }
    });
    child.stderr.resume();
    child.on('error', () => retire(current, 'helper-error'));
    child.on('exit', () => retire(current, 'helper-exited'));
    child.stdin.on('error', () => retire(current, 'helper-input-error'));
    return current;
  }
  function exchange(command = 'status', payload = {}) {
    if (!['status', 'setMute'].includes(command)) return Promise.resolve(unavailable('unsupported-command'));
    if (disposed) return Promise.resolve(unavailable('stopped'));
    if (process.platform !== 'win32') return Promise.resolve(unavailable('unsupported-platform'));
    if (flight) return flight;
    if (command === 'status' && cached && Date.now() - cachedAt < cacheMs) return Promise.resolve(structuredClone(cached));
    flight = new Promise(resolve => {
      clearTimeout(idleTimer);
      let current;
      const timer = setTimeout(() => retire(current, 'helper-timeout'), timeoutMs);
      pending = value => {
        clearTimeout(timer);
        cached = command === 'status' ? value : null; cachedAt = Date.now();
        if (worker && idleMs) {
          idleTimer = setTimeout(() => retire(worker, 'idle'), idleMs);
          idleTimer.unref();
        }
        resolve(value);
      };
      try {
        current = start();
        current.child.stdin.write(JSON.stringify({ command, ...payload }) + '\n', error => {
          if (error) retire(current, 'helper-input-error');
        });
      } catch {
        if (current) retire(current, 'helper-error');
        else { const done = pending; pending = null; done(unavailable('helper-error')); }
      }
    }).finally(() => { flight = null; });
    return flight.then(value => structuredClone(value));
  }
  let queue = Promise.resolve();
  function request(command = 'status') {
    const result = queue.then(() => exchange(command));
    queue = result.then(() => {}, () => {});
    return result;
  }
  function setMute(muted, endpoint = 'render') {
    if (typeof muted !== 'boolean' || !['render', 'capture'].includes(endpoint)) {
      return Promise.resolve({ ok: false, error: 'invalid-arguments' });
    }
    const result = queue.then(() => exchange('setMute', { muted, endpoint })).then(value =>
      typeof value.ok === 'boolean' ? value : { ok: false, error: value.capabilities?.audio?.reason || 'helper-error' });
    queue = result.then(() => {}, () => {});
    return result;
  }
  function stop() {
    disposed = true; cached = null;
    clearTimeout(idleTimer);
    retire(worker, 'stopped');
    process.removeListener('exit', stop);
  }
  process.once('exit', stop);
  return { request, setMute, stop };
}
module.exports = { createActivityBridge };

const { spawn } = require('node:child_process');
const path = require('node:path');
const { createInterface } = require('node:readline');
function createMediaBridge() {
  let child, pending, disposed = false, queue = Promise.resolve();
  function retire(current) { if (!current || child !== current) return; child = null; current.kill(); pending?.reject(new Error('Media helper stopped')); pending = null; }
  function stop() { disposed = true; retire(child); process.removeListener('exit', stop); }
  function start() {
    if (child) return;
    child = spawn(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe'), ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname.replace(/app\.asar(?=[\\/])/, 'app.asar.unpacked'), 'media.ps1')], { windowsHide: true, stdio: ['pipe','pipe','pipe'] });
    const current = child;
    createInterface({ input: child.stdout }).on('line', line => { if (child !== current || !pending) return; const request = pending; pending = null; try { const value = JSON.parse(line); if (typeof value.available !== 'boolean') throw new Error('Invalid media response'); request.resolve(value); } catch { request.reject(new Error('Invalid media response')); retire(current); } });
    child.stderr.resume();
    child.on('error', () => retire(current)); child.on('exit', () => retire(current));
    child.stdin.on('error', () => retire(current));
  }
  function request(command = 'status', position) {
    const result = queue.then(() => new Promise((resolve, reject) => {
      if (disposed || process.platform !== 'win32') { resolve({ available: false }); return; }
      start();
      const current = child;
      const timeout = setTimeout(() => retire(current), 15000);
      pending = { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } };
      child.stdin.write(JSON.stringify({ command, position }) + '\n', error => { if (error) retire(current); });
    })).catch(() => ({ available: false, error: 'Медиасервис Windows недоступен' }));
    queue = result.then(() => {}); return result;
  }
  process.once('exit', stop);
  return { request, stop };
}
module.exports = { createMediaBridge };

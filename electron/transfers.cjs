const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const samePath = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
const aborted = () => Object.assign(new Error('Copy cancelled'), { name: 'AbortError' });
const checkAbort = (signal) => { if (signal?.aborted) throw aborted(); };
async function entry(file) {
  try { return await fsp.lstat(file); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
const fingerprint = (stat) => stat && `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;

// Paths are supplied only by the main-process dialogs, never by IPC arguments.
async function copyFile({ source, destination, signal, onProgress = () => {}, confirmOverwrite = async () => false }) {
  checkAbort(signal);
  const sourcePath = await fsp.realpath(source);
  const parent = await fsp.realpath(path.dirname(path.resolve(destination)));
  const target = path.join(parent, path.basename(destination));
  if (samePath(sourcePath, target)) throw new Error('Source and destination must be different files.');
  const existing = await entry(target);
  if (existing) {
    const actual = await fsp.realpath(target);
    const sourceStat = await fsp.stat(sourcePath);
    if (samePath(sourcePath, actual) || (existing.dev === sourceStat.dev && existing.ino === sourceStat.ino)) {
      throw new Error('Source and destination must be different files.');
    }
    if (!existing.isFile() || existing.isSymbolicLink()) throw new Error('Destination must be a regular file.');
    if (!await confirmOverwrite(target)) throw aborted();
  }
  checkAbort(signal);
  const temp = path.join(parent, `.island-copy-${randomUUID()}.part`);
  let owned = false;
  let input;
  let output;
  try {
    input = await fsp.open(sourcePath, 'r');
    const stat = await input.stat();
    if (!stat.isFile()) throw new Error('Choose a regular file to copy.');
    output = await fsp.open(temp, 'wx', 0o600);
    owned = true;
    checkAbort(signal);
    let transferred = 0;
    let lastUpdate = 0;
    onProgress({ transferred, total: stat.size });
    const meter = new Transform({
      highWaterMark: 64 * 1024,
      transform(chunk, _encoding, callback) {
        transferred += chunk.length;
        const now = Date.now();
        if (now - lastUpdate >= 80) {
          lastUpdate = now;
          onProgress({ transferred, total: stat.size });
        }
        callback(null, chunk);
      },
    });
    await pipeline(
      input.createReadStream({ highWaterMark: 64 * 1024 }),
      meter,
      output.createWriteStream({ highWaterMark: 64 * 1024, flush: true }),
      { signal },
    );
    await output.close(); output = null;
    await input.close(); input = null;
    if (transferred !== stat.size) throw new Error('Source changed while copying. Please try again.');
    checkAbort(signal);
    // Never replace a file created or changed after the user's confirmation.
    if (fingerprint(await entry(target)) !== fingerprint(existing)) throw new Error('Destination changed while copying. Please try again.');
    checkAbort(signal);
    await fsp.rename(temp, target);
    owned = false;
    onProgress({ transferred, total: stat.size });
    return { transferred, total: stat.size };
  } finally {
    await Promise.all([input?.close(), output?.close()]);
    // Only unlink the exact exclusive-created temporary file in the verified parent.
    if (owned && path.isAbsolute(temp) && path.dirname(temp) === parent && /^\.island-copy-[0-9a-f-]+\.part$/.test(path.basename(temp))) {
      await fsp.unlink(temp).catch((error) => { if (error.code !== 'ENOENT') throw error; });
    }
  }
}

function setupTransfers({ ipcMain, dialog, trusted, getWindow }) {
  let current = null;
  let closed = false;
  const jobs = new Set();
  const snapshot = (job) => job?.snapshot ? { ...job.snapshot } : null;
  const emit = (job, patch) => {
    job.snapshot = { ...job.snapshot, ...patch };
    if (!job.sender.isDestroyed()) {
      try { job.sender.send('transfers:snapshot', snapshot(job)); } catch { /* Renderer closed. */ }
    }
  };
  const owned = (event) => trusted(event) && current?.sender === event.sender;
  const show = (method, event, options) => {
    const win = getWindow(event);
    return win && !win.isDestroyed() ? dialog[method](win, options) : dialog[method](options);
  };
  ipcMain.handle('transfers:get-status', (event) => owned(event) ? snapshot(current) : null);
  ipcMain.handle('transfers:cancel', (event, token) => {
    if (!owned(event) || token?.id !== current.id) return null;
    if (current.active) current.controller.abort();
    return snapshot(current);
  });
  ipcMain.handle('transfers:start', async (event) => {
    if (closed || !trusted(event)) return null;
    if (current?.active) return owned(event) ? snapshot(current) : null;
    const job = { id: randomUUID(), sender: event.sender, controller: new AbortController(), active: true, snapshot: null };
    current = job;
    const destroyed = () => job.controller.abort();
    job.sender.once('destroyed', destroyed);
    const run = async () => {
      try {
        const source = await show('showOpenDialog', event, { title: 'Choose a file to copy', properties: ['openFile'] });
        checkAbort(job.controller.signal);
        if (source.canceled || !source.filePaths?.[0]) return;
        const sourcePath = source.filePaths[0];
        job.snapshot = { id: job.id, name: path.basename(sourcePath), transferred: 0, total: 0, status: 'copying' };
        const destination = await show('showSaveDialog', event, { title: 'Copy file to', defaultPath: sourcePath, buttonLabel: 'Copy' });
        checkAbort(job.controller.signal);
        if (destination.canceled || !destination.filePath) {
          emit(job, { status: 'cancelled' }); return;
        }
        emit(job, {});
        await copyFile({
          source: sourcePath, destination: destination.filePath, signal: job.controller.signal,
          onProgress: (progress) => emit(job, progress),
          confirmOverwrite: async (target) => {
            const result = await show('showMessageBox', event, {
              type: 'warning', title: 'Replace existing file?',
              message: `Replace “${path.basename(target)}”?`,
              detail: 'The existing file will only be replaced after the copy finishes successfully.',
              buttons: ['Cancel', 'Replace'], defaultId: 0, cancelId: 0, noLink: true,
            });
            return result.response === 1;
          },
        });
        emit(job, { status: 'complete' });
      } catch (error) {
        if (!job.snapshot) job.snapshot = { id: job.id, name: '', transferred: 0, total: 0, status: 'copying' };
        emit(job, error.name === 'AbortError' ? { status: 'cancelled' } : { status: 'error', error: error.message || 'Copy failed.' });
      } finally {
        job.active = false;
        job.sender.removeListener('destroyed', destroyed);
      }
    };
    const work = run();
    jobs.add(work);
    // Return after native dialogs and copying settle; progress is delivered by events.
    try { await work; return snapshot(job); }
    finally { jobs.delete(work); }
  });
  return {
    async closeAll() {
      closed = true;
      current?.controller.abort();
      await Promise.allSettled([...jobs]);
      for (const channel of ['transfers:start', 'transfers:cancel', 'transfers:get-status']) ipcMain.removeHandler(channel);
    },
  };
}

module.exports = { setupTransfers, copyFile };

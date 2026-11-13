const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { copyFile } = require('./transfers.cjs');

async function workspace(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'island-transfer-test-'));
  try { await run(directory); }
  finally {
    // Only remove files in this exact test-created directory, without recursive deletion.
    for (const file of await fs.readdir(directory)) await fs.unlink(path.join(directory, file));
    await fs.rmdir(directory);
  }
}
test('copies real bytes and reports final progress without leaving partial files', () => workspace(async directory => {
  const source = path.join(directory, 'source.bin'), destination = path.join(directory, 'copy.bin');
  const content = Buffer.alloc(1024 * 1024 + 7, 57);
  await fs.writeFile(source, content);
  const progress = [];
  await copyFile({ source, destination, onProgress: value => progress.push(value) });
  assert.deepEqual(await fs.readFile(destination), content);
  assert.equal(progress.at(-1).transferred, content.length);
  assert.equal((await fs.readdir(directory)).some(name => name.endsWith('.part')), false);
}));
test('cancels while copying and preserves an existing destination', () => workspace(async directory => {
  const source = path.join(directory, 'source.bin'), destination = path.join(directory, 'copy.bin');
  await fs.writeFile(source, Buffer.alloc(2 * 1024 * 1024, 19));
  await fs.writeFile(destination, 'original');
  const controller = new AbortController();
  await assert.rejects(copyFile({ source, destination, signal: controller.signal, confirmOverwrite: async () => true, onProgress: value => { if (value.transferred) controller.abort(); } }), { name: 'AbortError' });
  assert.equal(await fs.readFile(destination, 'utf8'), 'original');
  assert.equal((await fs.readdir(directory)).some(name => name.endsWith('.part')), false);
}));
test('rejects self-copy without modifying source', () => workspace(async directory => {
  const source = path.join(directory, 'source.txt'); await fs.writeFile(source, 'safe');
  await assert.rejects(copyFile({ source, destination: source }), /different files/);
  assert.equal(await fs.readFile(source, 'utf8'), 'safe');
}));

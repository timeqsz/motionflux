import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdtemp, mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const hash = data => createHash('sha256').update(data).digest('hex');
const zip = await readFile('dist/downloads/motionflux.zip');
const metadata = JSON.parse(await readFile('dist/downloads/skill-download.json', 'utf8'));
assert.equal(metadata.name, 'motionflux');
assert.equal(hash(zip), metadata.sha256);
const entries = new Map();
for (let cursor = 0; zip.readUInt32LE(cursor) === 0x04034b50;) {
  assert.equal(zip.readUInt16LE(cursor + 8), 8);
  const size = zip.readUInt32LE(cursor + 18), length = zip.readUInt16LE(cursor + 26), extra = zip.readUInt16LE(cursor + 28);
  const name = zip.toString('utf8', cursor + 30, cursor + 30 + length);
  assert.ok(name.startsWith('motionflux/') && !name.split('/').includes('..'));
  assert.ok(!entries.has(name));
  const start = cursor + 30 + length + extra;
  const data = inflateRawSync(zip.subarray(start, start + size));
  assert.equal(data.length, zip.readUInt32LE(cursor + 22));
  entries.set(name, data);
  cursor = start + size;
}
const manifest = JSON.parse(entries.get('motionflux/manifest.json'));
assert.equal(manifest.name, 'motionflux');
assert.equal(entries.size, manifest.files.length + 1);
const temp = await mkdtemp(join(tmpdir(), 'motionflux 独立校验 '));
try {
  for (const [name, data] of entries) {
    await mkdir(dirname(join(temp, name)), { recursive: true });
    await writeFile(join(temp, name), data);
  }
  const root = join(temp, 'motionflux');
  for (const file of manifest.files) {
    const data = await readFile(join(root, file.path));
    assert.equal(hash(data), file.sha256, file.path);
    assert.equal(data.length, file.bytes);
    assert.equal(hash(await readFile(file.path)), file.sha256, `Root distribution: ${file.path}`);
    if (file.path.endsWith('.md')) for (const [, link] of data.toString().matchAll(/\]\(([^\s)]+)\)/g)) {
      if (/^(?:https?:|#)/.test(link)) continue;
      assert.ok((await stat(join(root, dirname(file.path), link.split('#')[0]))).isFile(), `${file.path}: ${link}`);
    }
  }
  const catalog = JSON.parse(await readFile(join(root, 'assets/catalog-index.json'), 'utf8'));
  assert.equal(catalog.length, 53);
  assert.equal(manifest.atoms2d, catalog.length);
  const ids = catalog.map(entry => entry.id).sort();
  const expected = ['SKILL.md', 'LICENSE', 'VERSION.json', 'manifest.json', 'assets/catalog.md', 'assets/catalog-index.json',
    'stage/README.md', 'stage/runtime.mjs', 'scripts/motion.mjs',
    'atoms/README.md', 'atoms/draw.mjs', 'atoms/index.mjs', ...ids.flatMap(id => [`atoms/${id}.md`, `atoms/${id}.mjs`])];
  assert.deepEqual([...entries.keys()].sort(), expected.map(path => `motionflux/${path}`).sort());
  const stageMod = await import(pathToFileURL(join(root, 'stage/runtime.mjs')).href);
  assert.equal(typeof stageMod.createStage, 'function');
  assert.equal(typeof stageMod.spring, 'function');
  assert.ok(Math.abs(stageMod.spring(2) - 1) < 0.01);
  const { atoms, drawAtom } = await import(pathToFileURL(join(root, 'atoms/index.mjs')).href);
  assert.deepEqual(Object.keys(atoms).sort(), ids);
  assert.equal(typeof drawAtom, 'function');
  const offset = frame => atoms['prop.move']({ frame, durationFrames: 30, params: { fromPx: 0, toPx: 120 } }).position[0];
  assert.deepEqual([offset(30), offset(0), offset(15), offset(30)], [120, 0, 60, 120]);
  console.log(JSON.stringify({ verified: true, atoms: ids.length, files: entries.size, zipBytes: zip.length, sha256: metadata.sha256 }));
} finally {
  await rm(temp, { recursive: true, force: true });
}

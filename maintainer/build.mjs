import { build } from 'esbuild';
import { mkdir, cp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeAtoms } from './atoms.mjs';
import { archiveSkill } from './skill-archive.mjs';
import { writeSceneExamples } from './scene-examples.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const skillOut = '.';
const bundle = (entry, outfile, platform = 'browser', format = 'esm') => build({
  absWorkingDir: root, entryPoints: [entry], outfile, bundle: true, platform, format,
  target: platform === 'node' ? 'node22' : 'es2022', sourcemap: false, legalComments: 'none',
});
await rm('dist', { recursive: true, force: true });
await mkdir('dist/lib', { recursive: true });
await mkdir('scripts/resources', { recursive: true });
await mkdir('stage', { recursive: true });
await bundle('packages/stage/src/runtime.ts', 'stage/runtime.mjs', 'browser', 'esm');
await bundle('packages/renderer-browser/src/standalone.ts', 'scripts/resources/standalone.js', 'browser', 'iife');
await bundle('packages/renderer-browser/src/panel-page.ts', 'scripts/resources/breakdown-panel.js', 'browser', 'iife');
await bundle('packages/cli/src/index.ts', 'scripts/motion.mjs', 'node');
for (const name of ['catalog', 'core', 'renderer-browser']) {
  await bundle(`packages/${name}/src/index.ts`, `packages/${name}/dist/index.js`);
}
await bundle('packages/stage/src/index.ts', 'packages/stage/dist/index.js', 'node');
await bundle('packages/catalog/src/examples.ts', 'dist/lib/examples.mjs');
const { capabilities, families } = await import(pathToFileURL(resolve('packages/catalog/dist/index.js')).href);
const { motionSchema, briefSchema, authoringSchema } = await import(pathToFileURL(resolve('packages/core/dist/index.js')).href);
await writeFile('assets/patterns/brief.schema.json', JSON.stringify(briefSchema, null, 2) + '\n');
await writeFile('assets/patterns/authoring.schema.json', JSON.stringify(authoringSchema, null, 2) + '\n');
const { createExampleScene } = await import(pathToFileURL(resolve('dist/lib/examples.mjs')).href);
// Only generated files are replaced. Hand-authored Skill and atom guidance stay at the root.
for (const file of await readdir('atoms')) {
  if (file.endsWith('.mjs') || capabilities.some(entry => file === `${entry.id}.md`)) await rm(`atoms/${file}`);
}
await rm('assets/examples', { recursive: true, force: true });
await cp('maintainer/examples', 'assets/examples', { recursive: true });
await writeSceneExamples();
for (const entry of capabilities) {
  await writeFile(`assets/examples/${entry.id}.scene.json`, JSON.stringify(createExampleScene(entry.id), null, 2));
}
await writeAtoms({ root, capabilities, families, createExampleScene, out: resolve('atoms') });
await writeFile('assets/catalog-index.json', JSON.stringify(capabilities, null, 2));

  const seriesOf = (family) => [...capabilities].filter((entry) => entry.family === family).sort((x, y) => x.cell[1] - y.cell[1] || x.cell[0] - y.cell[0]);
  const parameters = (entry) => Object.entries(entry.params).map(([key, parameter]) => `${key}=${parameter.default}${parameter.type === 'number' && !['ratio', 'count', 'number', 'deg|px'].includes(parameter.unit) ? parameter.unit : ''}`).join(', ');
  const roleLabel = { property: '属性动画', timing: '时间曲线', loop: '持续循环', layout: '复制排布', order: '先后延迟', feel: '画面质感', overlay: '场景连线' };
  await writeFile(`${skillOut}/assets/catalog.md`, `# 动效原子清单

由构建从目录生成，共 ${capabilities.length} 个原子、${Object.keys(families).length} 族。每行：ID、名称、可用节点、角色、写入、作用、参数及默认值。点 ID 打开该原子的用法说明；它的脚本是同名的 \`atoms/<ID>.mjs\`。

按用户要改变的属性查找原子；用一个就够时，不必组合其他族。

- **角色**区分属性值、曲线、副本和滤镜。每个函数独立求值，由宿主决定如何应用。详见 [原子接口](../atoms/README.md)。
- 写入 \`geometry\` 或 \`trim\` 的原子会重画节点的轮廓，只能用于 path 节点。
- 标 ◆ 的原子要做逐像素处理，画面大、同时用得多时渲染会变慢。

${Object.entries(families).map(([family, data]) => `## ${data.title} · ${data.question}

| ID | 名称 | 节点 | 角色 | 写入 | 作用 | 参数（默认值） |
|---|---|---|---|---|---|---|
${seriesOf(family).map((entry) => `| [\`${entry.id}\`](../atoms/${entry.id}.md)${entry.engine === 'raster' ? ' ◆' : ''} | ${entry.title} ${entry.english} | ${entry.targets.join(' / ')} | ${roleLabel[entry.role]} | ${entry.writes.join(', ')} | ${entry.description} | ${parameters(entry)} |`).join('\n')}`).join('\n\n')}
`);
  await writeFile(`${skillOut}/assets/motion-spec.schema.json`, JSON.stringify(motionSchema, null, 2));


const version = JSON.parse(await readFile('package.json', 'utf8')).version;
const provenance = JSON.parse(await readFile('VERSION.json', 'utf8'));
await writeFile('VERSION.json', JSON.stringify({ ...provenance, version, atoms2d: capabilities.length }, null, 2) + '\n');
// A small installable ZIP excludes development sources, dependency folders and build caches.
const stage = 'dist/skill';
await mkdir(stage, { recursive: true });
const releaseFiles = ['SKILL.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'VERSION.json', 'assets/catalog.md', 'assets/catalog-index.json',
  'stage/README.md', 'stage/runtime.mjs', 'scripts/motion.mjs', 'scripts/env.sh', 'scripts/env.ps1',
  'references/install.md', 'references/physical-3d.md', 'references/three-license.txt',
  'atoms/README.md', 'atoms/index.mjs', 'atoms/draw.mjs', 'atoms/studio.md', 'atoms/studio.mjs',
  ...capabilities.flatMap(({ id }) => [`atoms/${id}.md`, `atoms/${id}.mjs`])];
for (const name of releaseFiles) {
  await mkdir(dirname(`${stage}/${name}`), { recursive: true });
  await cp(name, `${stage}/${name}`);
}
const archive = await archiveSkill(stage, 'dist/downloads', { name: 'motionflux', version, atoms2d: capabilities.length });
await cp(`${stage}/manifest.json`, 'manifest.json');
await cp(`dist/downloads/${archive}`, 'dist/downloads/motionflux.zip');
console.log(JSON.stringify({ version, atoms: capabilities.length, archive, installable: 'dist/downloads/motionflux.zip' }));

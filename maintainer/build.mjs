import { build } from 'esbuild';
import { mkdir, cp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeAtoms } from './atoms.mjs';
import { archiveSkill } from './skill-archive.mjs';

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
await bundle('packages/renderer-browser/src/standalone.ts', 'scripts/resources/standalone.js', 'browser', 'iife');
await bundle('packages/renderer-browser/src/panel-page.ts', 'scripts/resources/breakdown-panel.js', 'browser', 'iife');
await bundle('packages/cli/src/index.ts', 'scripts/motion.mjs', 'node');
for (const name of ['catalog', 'core', 'renderer-browser']) {
  await bundle(`packages/${name}/src/index.ts`, `packages/${name}/dist/index.js`);
}
await bundle('packages/catalog/src/examples.ts', 'dist/lib/examples.mjs');
const { capabilities, families } = await import(pathToFileURL(resolve('packages/catalog/dist/index.js')).href);
const { motionSchema } = await import(pathToFileURL(resolve('packages/core/dist/index.js')).href);
const { createExampleScene } = await import(pathToFileURL(resolve('dist/lib/examples.mjs')).href);
// Only generated files are replaced. Hand-authored Skill and atom guidance stay at the root.
for (const file of await readdir('atoms')) {
  if (file.endsWith('.mjs') || capabilities.some(entry => file === `${entry.id}.md`)) await rm(`atoms/${file}`);
}
await rm('assets/examples', { recursive: true, force: true });
await cp('maintainer/examples', 'assets/examples', { recursive: true });
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

一个完整的动作通常从几族里各取一个：**变什么（属性）× 怎么变（节奏）× 谁先谁后（编排）＋ 质感**。

- **角色**决定叠加方式：同一节点上写同一属性的**属性动画**不能在时间上重叠，但可以一个接一个；时间曲线、持续循环、复制排布、先后延迟、画面质感和场景连线都是叠加的。详见 [场景编排](../references/composition.md)。
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
for (const name of ['SKILL.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'VERSION.json', 'references', 'atoms', 'scripts', 'assets']) {
  await cp(name, `${stage}/${name}`, { recursive: true });
}
const archive = await archiveSkill(stage, 'dist/downloads', { name: 'motion-atoms', version, atoms2d: capabilities.length });
await cp(`${stage}/manifest.json`, 'manifest.json');
await cp(`dist/downloads/${archive}`, 'dist/downloads/motion-atoms.zip');
console.log(JSON.stringify({ version, atoms: capabilities.length, archive, installable: 'dist/downloads/motion-atoms.zip' }));

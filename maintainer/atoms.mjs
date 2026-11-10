import { build } from 'esbuild';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const unitLabel = { px: 'px', deg: '度', ratio: '比例', frame: '帧', count: '个', Hz: 'Hz', cycle: '次', turn: '圈', number: '数值', s: '秒', 'turn/s': '圈/秒', 'deg|px': '度或 px', 'px/s': 'px/秒', 'px/s²': 'px/秒²' };
const targetLabel = { text: '文字', path: '图形（折线轮廓）' };
const writeLabel = { position: 'position（位置偏移）', rotation: 'rotation（旋转角度）', scale: 'scale（缩放倍率）', opacity: 'opacity（不透明度）', color: 'color（颜色）',
  stretch: 'stretch（横纵缩放）', geometry: 'layers（重画后的图形）', trim: 'layers（描到哪里的轮廓）', mask: 'pieces（可见区域）', text: 'lines[].text（每行文字）',
  lines: 'lines[].y / opacity（逐行偏移与透明度）', chars: 'lines[].glyphs（逐字偏移与透明度）', blur: 'filters（模糊）', dissolve: 'filters（溶解颗粒）', glow: 'filters（辉光）',
  grain: 'filters（颗粒）', glitch: 'filters（故障）', chroma: 'filters（色散）', curve: 'value（曲线值）', copies: 'copies（副本）', delay: 'copies[].delay（延迟）', overlay: 'layers（连线）' };
const roleLabel = { property: '属性动画：同一对象上写同一属性的片段轮流生效', timing: '时间曲线：改变同一对象上其他属性动画的快慢', loop: '持续循环：叠加在其他动作之上',
  layout: '复制排布：把一个对象变成多个副本', order: '先后延迟：让副本依次开始', feel: '画面质感：叠在画面上，不改变运动', overlay: '场景连线：在场景坐标里画线' };
const short = (value) => JSON.stringify(value).replace(/"([A-Za-z]\w*)":/gu, '$1: ').replace(/,/gu, ', ');
const randomAtoms = /float|flicker|random|dissolve|decode|grain|glitch|particles|shatter/u;

/** Usage notes for one atom, written from its catalog entry and its example scene. */
function usage(entry, family, example) {
  const subject = example.nodes.find((node) => node.id === 'subject'); const clip = example.clips[0]; const isText = subject.type === 'text';
  const carriers = example.clips.slice(1);
  const draws = ['property', 'feel'].includes(entry.role) && (isText || entry.writes.some((property) => ['geometry', 'trim', 'mask', 'stretch', 'chars', 'lines', 'text', 'blur', 'dissolve', 'glow', 'grain', 'glitch', 'chroma'].includes(property)));
  const generator = entry.writes.includes('geometry') && subject.type === 'path' && subject.points.length === 2 && subject.points[0][0] === -1 && subject.points[1][0] === 1;
  const name = entry.id.replace(/[.-](\w)/gu, (_, letter) => letter.toUpperCase());
  const rows = Object.entries(entry.params).map(([key, parameter]) => parameter.type === 'number'
    ? `| \`${key}\` | ${parameter.title} | ${unitLabel[parameter.unit] ?? parameter.unit}${parameter.integer ? '，整数' : ''} | ${parameter.minimum} – ${parameter.maximum} | ${parameter.default} |`
    : parameter.type === 'color' ? `| \`${key}\` | ${parameter.title} | 颜色 | #RRGGBB | \`${parameter.default}\` |`
    : `| \`${key}\` | ${parameter.title} | 选项 | ${parameter.enum.map((value, i) => `\`${value}\`${parameter.labels ? `（${parameter.labels[i]}）` : ''}`).join('、')} | \`${parameter.default}\` |`);
  const points = subject.points && subject.points.length <= 8 ? short(subject.points) : `/* ${subject.points?.length} 个点，见 assets/examples/${entry.id}.scene.json */`;
  const subjectCode = isText ? `{ text: ${JSON.stringify(subject.text)}, lineHeight: ${subject.lineHeight} }`
    : generator ? `{ strokeWidth: ${subject.strokeWidth} }` : `{ points: ${points}${subject.closed ? ', closed: true' : ''}${subject.fill ? ', fill: true' : ''}, strokeWidth: ${subject.strokeWidth} }`;
  const extra = entry.role === 'order' ? '\n  items: [[-100, 0], [0, 0], [100, 0]],   // 要排先后的几个对象的位置'
    : entry.id === 'gen.link' ? '\n  items: [[-100, 0], [0, 40], [100, 0]],   // 要连起来的点'
    : entry.id === 'gen.trace' ? '\n  items: history,              // 对象原点最近走过的位置，从旧到新'
    : entry.id === 'feel.motion-blur' ? '\n  items: [previous, current],   // 对象原点上一帧和这一帧的位置'
    : draws ? `\n  subject: ${subjectCode},` : '';
  const call = `${name}({\n  frame,                       // 宿主时间线上的当前帧，可以是小数\n  startFrame: 0,               // 这个原子从第几帧开始\n  durationFrames: ${clip.durationFrames},          // 持续多少帧\n  fps: 30,${extra}\n  params: ${short(clip.params)},${randomAtoms.test(entry.id) ? '\n  seed: 42,                    // 固定随机结果；换一个数就换一组' : ''}\n})`;
  const head = `import ${name} from './atoms/${entry.id}.mjs';`;
  const code = entry.role === 'timing'
    ? `${head}\nimport move from './atoms/prop.move.mjs';\n\n// 单独用：拿曲线值 out.value（0 → 1，可能冲过 1 或先低于 0），自己乘到任何数值上\nconst out = ${call};\n\n// 交给属性原子：把曲线作为 ease 传进去\nconst curve = (t) => ${name}({ frame: t, durationFrames: 1, params: ${short(clip.params)} }).value;\nconst moved = move({ frame, durationFrames: 30, params: { fromPx: -100, toPx: 100 }, ease: curve });`
    : entry.role === 'layout' || entry.role === 'order'
    ? `${head}\n\nconst out = ${call};\n\n// out.copies：每个副本画在哪、比原对象晚多少帧。对每个副本：\n//   用 frame - copy.delay 去求其他原子，再把结果平移 copy.offset、旋转 copy.rotation、缩放 copy.scale、乘 copy.opacity；\n//   copy.flip 为 -1 的方向要镜像（位移取反、图形翻转）。残影（ghost > 0）排在前面，先画。`
    : entry.role === 'overlay'
    ? `${head}\nimport { drawAtom } from './atoms/draw.mjs';\n\nconst out = ${call};\n\n// out.layers 和 items 在同一坐标系里，直接画：\ndrawAtom(ctx, out, { color: '${subject.color}' });`
    : draws
    ? `${head}\nimport { drawAtom } from './atoms/draw.mjs';\n\nconst out = ${call};\n\n// 画到 Canvas 2D 上：x、y 是${isText ? '第一行文字左侧基线' : '图形原点'}在画布上的位置\ndrawAtom(ctx, out, { x: ${subject.position[0]}, y: ${subject.position[1]}, color: '${subject.color}'${isText ? `, font: '${subject.fontSize}px "你的字体"'` : ''} });`
    : `${head}\n\nconst out = ${call};\n\n// 这个原子只算属性，不画东西。把结果用到任何元素上——画布图形、DOM 节点、视频图层都行：\n${entry.writes.map((property) => ({ position: '//   x = 原位置x + out.position[0];  y = 原位置y + out.position[1]', rotation: '//   旋转 out.rotation 度（顺时针），绕元素自己的原点', scale: '//   缩放 out.scale 倍，绕元素自己的原点', opacity: '//   不透明度 out.opacity（0–1）', color: '//   颜色 out.color' })[property]).filter(Boolean).join('\n')}`;
  const returns = entry.role === 'timing' ? '- `out.value`：曲线在这一帧的值，开始为 0，结束正好为 1。'
    : entry.role === 'layout' || entry.role === 'order' ? '- `out.copies`：每个副本的 `offset`、`rotation`、`scale`、`flip`、`delay`（帧）、`opacity`、`slot`（排布序号）和 `ghost`（0 为本体，残影从 1 起）。'
    : draws || entry.role === 'overlay' ? [
      entry.writes.some((property) => ['geometry', 'trim', 'overlay'].includes(property)) ? '- `out.layers`：要画的内容。每层有若干 `shapes`（`paths` 是折线点列，另有 `closed`、`fill`、`strokeWidth`、`opacity`，可能带裁剪多边形 `clip`）。坐标相对图形原点。' : '',
      isText ? '- `out.lines`：每行的 `text`、相对首行基线的纵向偏移 `y`（px）和 `opacity`；逐字原子还有 `glyphs`，每个字的 `dx`、`dy`、`opacity`、`scale`。' : '',
      entry.writes.includes('mask') ? '- `out.pieces`：只画这些区域。区域按对象自身包围盒的比例描述；空数组表示什么都不画，没有这一项表示全部画出。' : '',
      entry.writes.includes('stretch') ? '- `out.stretch`：在 `scale` 之后再乘的横向、纵向缩放，翻转时其中一个会经过 0。' : '',
      entry.engine === 'raster' ? '- `out.filters`：要对画出来的像素做的处理。自己画时需要实现对应的滤镜；直接用 `draw.mjs` 最省事。' : '',
      '`draw.mjs` 会按这个结构画；也可以自己读它，画到 SVG、WebGL 或别的地方。'].filter(Boolean).join('\n')
    : `- ${entry.writes.map((property) => `\`out.${property}\``).join('、')} 随时间变化；其余属性保持初值（position [0, 0]、rotation 0、scale 1、opacity 1）。`;
  return `# ${entry.title} ${entry.english} · \`${entry.id}\`

${entry.description}

- **族**：${family.title}（${family.question}）
- **角色**：${roleLabel[entry.role]}
- **作用对象**：${entry.targets.map((target) => targetLabel[target]).join('、')}${generator ? '。它自己生成图形，不读取轮廓，只用位置、颜色和线宽' : ''}
- **改写**：${entry.writes.map((property) => writeLabel[property] ?? property).join('、')}
- **脚本**：[\`${entry.id}.mjs\`](${entry.id}.mjs)，独立文件，不依赖别的脚本${draws || entry.role === 'overlay' ? '；画到画布上另需 [`draw.mjs`](draw.mjs)' : ''}

## 参数

${rows.length ? `| 参数 | 含义 | 单位 | 范围 | 默认 |\n|---|---|---|---|---|\n${rows.join('\n')}` : '无。'}

没写的参数取默认值；越界或写错名字会抛出带说明的错误。

## 在自己的代码里用

每一帧调用一次，传入当前帧号，拿回这一帧的结果。同样的输入永远得到同样的输出，可以任意跳帧、倒着取。

\`\`\`js
${code}
\`\`\`

返回值：

- \`out.progress\`：原子进行到哪了，0–1。开始前为 0（保持起始状态），结束后为 1（保持终值）。
${returns}

通用约定（时间、随机种子、多个原子叠加）见 [README.md](README.md)。

## 在场景 JSON 里用

\`\`\`json
${JSON.stringify({ id: 'my-clip', target: '节点 ID', recipe: entry.id, startFrame: clip.startFrame, durationFrames: clip.durationFrames, fillAfter: 'hold', params: clip.params })}
\`\`\`
${carriers.length ? `
示例场景里它和这些原子一起用在同一对象上：${carriers.map((item) => `\`${item.recipe}\``).join('、')}。` : ''}
完整的最小场景：\`assets/examples/${entry.id}.scene.json\`。

## 直接出一条素材

\`\`\`sh
node scripts/motion.mjs scaffold ${entry.id} --out work/${entry.id}.scene.json --width 1920 --height 1080 --duration ${example.durationFrames}${isText ? ' --text "你的文字"' : ''}
node scripts/motion.mjs render work/${entry.id}.scene.json --out work/${entry.id}.mov --transparent
\`\`\`
`;
}

/** Write dist/skill/atoms: one self-contained script and one usage note per atom, a shared canvas drawer and an index. */
export async function writeAtoms({ root, capabilities, families, createExampleScene, font, out = resolve(root, 'dist/skill/atoms') }) {
  await mkdir(out, { recursive: true });
  const recipes = new Map();
  for (const file of await readdir(resolve(root, 'packages/core/src/recipes'))) {
    for (const match of (await readFile(resolve(root, 'packages/core/src/recipes', file), 'utf8')).matchAll(/^export const (\w+): Recipe = /gmu)) recipes.set(match[1], file);
  }
  for (const entry of capabilities) {
    const exportName = entry.id.replace(/[.-](\w)/gu, (_, letter) => letter.toUpperCase());
    if (!recipes.has(exportName)) throw new Error(`No recipe export ${exportName} for ${entry.id}.`);
    const meta = { id: entry.id, title: entry.title, english: entry.english, description: entry.description, role: entry.role, targets: entry.targets, writes: entry.writes, params: entry.params };
    await build({
      absWorkingDir: root,
      stdin: { resolveDir: root, loader: 'ts', sourcefile: `${entry.id}.ts`, contents: `import { ${exportName} as recipe } from './packages/core/src/recipes/${recipes.get(exportName)}';
import { createAtom } from './packages/core/src/atom.ts';
export const meta = ${JSON.stringify(meta, null, 2)};
const atom = createAtom(meta, recipe);
export default atom;` },
      outfile: resolve(out, `${entry.id}.mjs`), bundle: true, format: 'esm', platform: 'neutral', target: 'es2022', legalComments: 'none',
      banner: { js: `// ${entry.title} ${entry.english} · ${entry.id}\n// ${entry.description}\n// MotionFlux 动效原子，独立脚本，没有任何依赖。用法见同目录的 ${entry.id}.md。\n//   import atom from './${entry.id}.mjs';\n//   const out = atom({ frame, durationFrames, params, subject, seed });` },
    });
    await writeFile(resolve(out, `${entry.id}.md`), usage(entry, families[entry.family], createExampleScene(entry.id, font)));
  }
  await build({ absWorkingDir: root, entryPoints: [resolve(root, 'packages/renderer-browser/src/draw.ts')], outfile: resolve(out, 'draw.mjs'), bundle: true, format: 'esm', platform: 'browser', target: 'es2022', legalComments: 'none',
    banner: { js: '// MotionFlux 动效原子的 Canvas 2D 绘制脚本，独立文件，没有任何依赖。\n//   import { drawAtom } from \'./draw.mjs\';\n//   drawAtom(ctx, out, { x, y, color });   // out 是任意一个原子的返回值\n// 像素滤镜（模糊、辉光、溶解、故障、色散等）也在这里实现。' } });
  const ordered = [...capabilities].sort((a, b) => a.cell[1] - b.cell[1] || a.cell[0] - b.cell[0]);
  await writeFile(resolve(out, 'index.mjs'), `// 全部 ${capabilities.length} 个动效原子，按 ID 取用。只需要其中几个时，直接导入对应的单个文件更轻。\n${ordered.map((entry, i) => `import a${i} from './${entry.id}.mjs';`).join('\n')}\nexport { drawAtom, drawSubject } from './draw.mjs';\nexport const atoms = {\n${ordered.map((entry, i) => `  '${entry.id}': a${i},`).join('\n')}\n};\n`);
  return ordered;
}

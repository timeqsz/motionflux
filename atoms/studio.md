# 物理棚拍与精密机械光学套件 · `studio.mjs`

[`studio.mjs`](studio.mjs) 是面向 MotionFlux Stage 底座（[stage/README.md](../stage/README.md)）及任意浏览器宿主项目的自包含三维物理摄影棚、精密机械 CAD 几何生成与电影光学后处理模块。单文件内置 **Three.js 0.180.0**（MIT，许可见 [three-license.txt](../references/three-license.txt)）、`RoundedBoxGeometry`、`EffectComposer`、切线空间法线贴图与工业机械构件生成器，无需 `npm install` 或外部 CDN 即可在 Stage 中通过 `/__motionflux/atoms/studio.mjs` 直接加载或随项目拷贝。

## 解决什么问题

裸写 Three.js 场景时，工业硬件与精密机械常出现两类致命失真（完整物理与结构规范见 [physical-3d.md](../references/physical-3d.md)）：
1. **质感塑料化**：平坦矩形白块反射印在弧面上像贴纸、金属乱加 `clearcoat` 变成塑料清漆、缺少物理各向异性（`anisotropy`）与切线空间法线贴图（`normalMap`）、生硬矩形桌面切割黑色背景、底面被错误暖色反光污染，或厚玻璃 `transmission` 把底层微距机械模糊成乳白乒乓球。
2. **机械结构失真**：手写简陋方块齿、齿轮互不啮合、轮系无轴榫/红宝石轴承/上夹板与一字槽螺丝悬空漂浮、旋钮滚花变成粗白铁条、光圈叶片缺乏真实弧形叠片结构。

`studio.mjs` 在同一确定性纯帧模块内同时解决这两层问题：

- **柔光渐变棚拍 + 吸光黑旗（`buildStudioEnvironment` + `createStudioBackdrop`）**：采用余弦超椭圆柔光屏（消除硬边白贴纸反光）穿插吸光黑旗（在拉丝金属上切出深邃黑银高反差明暗交界线），搭配中性暗石板底面反光与径向无缝消隐无影地面（`createStudioBackdrop`，彻底告别生硬桌面地平线切边）。
- **切线空间法线与物理各向异性材质库（`createStudioMaterials`）**：基于 `createRng(seed)` 生成线性拉丝、太阳放射纹、阳极喷砂与日内瓦条纹高度图及 Sobel 切线空间法线贴图（`createNormalMapDataFromHeight`），内置 16 种物理材质预设：
  - 金属与镀层：`titanium`（五级拉丝钛，`anisotropy: 0.78`，`clearcoat: 0` 无清漆塑料感）、`brushedSteel`（316L 拉丝钢）、`chrome`（镜面倒角铬钢）、`obsidian`（哑光喷砂阳极黑铝/DLC）、`roseGold`（18K 5N 玫瑰金）、`brass`（钟表铍青铜）、`bluedSteel`（淬火烤蓝钢螺丝/游丝）。
  - 光学与宝石：`arGlass`（双面绿青增透镀膜蓝宝石/镜片，保持底层微距机械 100% 锐利并带镀膜边缘冷绿虹彩）、`rubyJewel`（`IOR 1.77` 合成刚玉红宝石轴承）、`opticalGlass`、`frostedGlass`、`vermilionLacquer` 及三组自发光材质。
- **精密机械与光学 CAD 几何生成器**：
  - `createInvoluteGearGeometry`：真渐开线齿形（`20°` 压力角）轮系与齿轴，支持五辐/多辐镂空轮辐窗与双面倒角，按节圆半径 $d = R_1 + R_2$ 与齿数比 $-Z_1/Z_2$ 精确啮合。
  - `createEscapeWheelGeometry` + `createSpiralSpringGeometry`：瑞士杠杆式 15 齿冲面靴形擒纵轮与多圈同心阿基米德矩形截面游丝。
  - `createKnurledCylinderGeometry`：60–96 槽精密 CNC 滚花编码器旋钮/表冠（带上下倒角）。
  - `createIrisBladeGeometry` + `createOpticalLensGeometry`：弧形联动电影镜头光圈叶片（9–13 叶叠片收缩）与球面/弯月光学透镜组截面（`LatheGeometry`）。
- **4x MSAA 电影镜头后处理与微距接触阴影（`createStudioRig`）**：支持直接挂载舞台 `<canvas>`（`{ canvas, alpha }`），收紧阴影视锥（`shadowBounds`）使毫厘级齿轮、夹板、键帽投下扎实接触阴影；`HalfFloatType` 帧缓冲 → `UnrealBloomPass` → `OutputPass`（ACES Filmic）→ `CinemaOpticsShader`（边缘色散、光学暗角、35mm 双频确定性胶片颗粒）。
- **几何投影与兼容辅助工具（`projectedBounds` / `unionBoxes` / `drawSmokedGlass` / `mountHost`）**：8 顶点世界包围盒实时投影为画布像素 `[x, y, 宽, 高]`，支持三维构件屏幕坐标跟随标注与 Canvas 2D 毛玻璃 HUD 绘制。

## 在 Stage 底座中快速上手（推荐）

Stage 协议见 [stage/README.md](../stage/README.md)，二维原子叠加约定见 [原子说明](README.md)。本地 `serve`、`audit`、`frames`、`render` 服务已自动挂载 `/__motionflux/atoms/studio.mjs`：

```js
import { createStage } from './runtime.mjs';
import {
  THREE,
  createStudioRig,
  createStudioBackdrop,
  createInvoluteGearGeometry,
  projectedBounds,
} from '/__motionflux/atoms/studio.mjs';

const width = 1920;
const height = 1080;
const canvas = document.getElementById('studio-canvas');
const callout = document.getElementById('gear-callout');

const studio = createStudioRig({ canvas, width, height, shadowBounds: 2.8, seed: 42 });
const { scene, camera, materials } = studio;

const backdrop = createStudioBackdrop({ y: -0.65, radius: 9 });
scene.add(backdrop.mesh);

const gearA = new THREE.Mesh(
  createInvoluteGearGeometry({ teeth: 60, pitchRadius: 0.6, spokes: 5, thickness: 0.05 }),
  materials.roseGold,
);
const gearB = new THREE.Mesh(
  createInvoluteGearGeometry({ teeth: 30, pitchRadius: 0.3, spokes: 0, thickness: 0.06 }),
  materials.brushedSteel,
);
gearB.position.x = 0.6 + 0.3; // 精确节圆中心距 d = R1 + R2
scene.add(gearA, gearB);
await studio.renderer.compileAsync(scene, camera);

createStage({
  width,
  height,
  fps: 60,
  durationFrames: 240,
  scenes: [{ id: 'mechanism', startFrame: 0, endFrame: 240 }],
  audio: [{ atFrame: 0, sfx: 'tick', gain: 0.35 }],
  onFrame({ frame }) {
    const omega = frame * 0.012;
    gearA.rotation.y = omega;
    gearB.rotation.y = -omega * (60 / 30) + Math.PI / 30;
    camera.position.set(0.2, 1.35, 2.4);
    camera.lookAt(0.2, 0, 0);
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    studio.render({ frame });

    const box = projectedBounds(gearA, camera, width, height);
    if (box && callout) {
      callout.style.transform = `translate3d(${box[0] + box[2] + 16}px, ${box[1]}px, 0)`;
    }
  },
});
```

## 主要导出接口

| 导出项 | 作用 |
|---|---|
| `THREE`、`RoundedBoxGeometry` | 内置 Three.js 0.180.0 核心命名空间与圆角长方体几何构造器 |
| `createStudioRig(options)` | 创建 WebGL2 摄影棚（支持传入舞台 `{ canvas, alpha }` 或离屏画布）、柔光渐变+黑旗 PMREM 环境、微距阴影三点光、`materials` 与 4x MSAA 后处理链；别名 `createPhysicalStudio` |
| `createStudioBackdrop(options)` | 创建径向无缝消隐的喷砂微肌理阴影承接地面（无生硬矩形地平线切边） |
| `createStudioMaterials(options)` | 创建 16 种工业/制表/光学物理材质预设及法线/粗糙度贴图（含 `titanium`、`brushedSteel`、`roseGold`、`brass`、`bluedSteel`、`rubyJewel`、`arGlass` 等） |
| `createInvoluteGearGeometry(options)` | 生成真渐开线齿形齿轮/齿轴（支持多辐镂空窗与倒角） |
| `createEscapeWheelGeometry(options)` | 生成瑞士杠杆式冲面靴形擒纵轮 |
| `createSpiralSpringGeometry(options)` | 生成多圈同心阿基米德游丝（矩形截面带法线） |
| `createKnurledCylinderGeometry(options)` | 生成 60–96 槽精密 CNC 滚花编码器旋钮/表冠柱体 |
| `createIrisBladeGeometry(options)` | 生成弧形电影镜头机械光圈叶片 |
| `createOpticalLensGeometry(options)` | 生成球面/弯月光学透镜旋转体几何（`LatheGeometry`） |
| `projectedBounds` / `intersectBox` / `unionBoxes` | 三维世界包围盒实时投影与二维矩形求交/并集 |
| `drawSmokedGlass` / `mountHost` | Canvas 2D 烟熏毛玻璃信息卡绘制器与独立画布宿主同帧缓存适配器 |

## 母带级编码导出与审计

导出高质感三维成片时，启用 `--quality cinema`（H.264 `CRF 15` `-preset slow` / VP9 `CRF 16` + `256k` AAC 音频）并串联 `--audit` 防穿帮检查：

```sh
node scripts/motion.mjs audit work/chrono/index.html --contact work/chrono/contact.png
node scripts/motion.mjs render work/chrono/index.html --out work/chrono/promo.mp4 --quality cinema --audit
```

# 实物类视频：Web 3D 技术栈、物理材质、物理规则与机械结构

凡涉及**真实物理器物**（如机械腕表、桌面工业硬件、光学电影镜头、精密仪器、数码产品、消费电子、机械装置）的视频或动效制作，必须以 **Web 原生实时三维技术栈（WebGPU / WebGL2 / Three.js）** 在 MotionFlux Stage 底座（[stage/README.md](../stage/README.md)）中构建三维场景，禁止用扁平二维色块伪造立体结构，并在建模、材质、运动与抽帧验收全过程严格遵守以下物理与工程准则。

---

## 1. Web 原生渲染路线（Stage + WebGPU / WebGL2 / Three.js）

- **统一走 Stage 舞台底座（`stage/runtime.mjs`）**：使用 HTML + CSS/SVG + ES Module 组织场景，三维主体与棚拍光影通过 **Three.js（WebGL2 / WebGPU）**、原生 **WebGPU（WGSL 管线）** 或 **WebGL2（GLSL 300 es）** 渲染到舞台 `<canvas data-mf-allow-bleed>`，在 `createStage({ onFrame({ frame }) })` 中按显式帧号确定性驱动，上层叠加真实 HTML/CSS/SVG 现代排版与 HUD 标注，并由 `audit` 自动检查文字越界、溢出与重叠。
- **开箱即用套件**：默认直接引入随包零外链的 `/__motionflux/atoms/studio.mjs`（详见 [atoms/studio.md](../atoms/studio.md)，内置 Three.js 0.180、柔光渐变+吸光黑旗 PMREM 环境、切线空间法线贴图、物理各向异性材质库、精密机械 CAD 几何生成器与 4x MSAA 胶片光学后处理）。
- **GPU 环境核验**：CLI 启动无头 Chromium 时已自动开启硬件加速与 `--enable-webgl`、`--enable-unsafe-webgpu`（macOS 自动挂载 `--use-angle=metal`），可通过以下命令逐项核验图形上下文：
  ```sh
  node scripts/motion.mjs doctor --backend webgl2
  node scripts/motion.mjs doctor --backend webgpu
  ```

---

## 2. 物理材质准则（PBR 能量守恒与微表面光学）

1. **裸金属严禁涂抹塑料清漆（`clearcoat: 0`）**
   - CNC 拉丝钛合金（`titanium`）、316L 精钢（`brushedSteel`）、18K 玫瑰金（`roseGold`）、钟表黄铜（`brass`）与珠光喷砂阳极氧化铝（`obsidian`）必须保持 `metalness: 0.88–1.0` 且 **`clearcoat: 0`**。在裸金属上开启 `clearcoat` 会形成廉价塑料亮油感。
   - 必须挂载**切线空间法线贴图（`normalMap`）** + **粗糙度贴图（`roughnessMap`）**，并在拉丝/车削金属上开启物理各向异性（`anisotropy: 0.6–0.88`）。
2. **高反差棚拍反射（柔光渐变灯屏 + 吸光黑旗）**
   - 金属质感来自明暗交界反差，而非三盏强平行光把表面照成死白灰片。环境贴图（PMREM）中的柔光箱必须带边缘余弦衰减（防止在球面/弧面上印出硬边白贴纸），并在柔光箱之间布置**吸光黑旗（Negative Fill）**切出深邃的黑银金属棱线。
   - 棚拍底面反弹光必须保持中性暗灰（严禁用高饱和红/橙底光把产品下沿染成廉价霓虹色）。
3. **透明表镜与保护视窗禁止“乳白毛玻璃化”**
   - 覆盖在精密机芯、光学光圈或 OLED 屏幕上方的蓝宝石表镜/保护玻璃，必须保持底层微距细节 **100% 清晰锐利**。使用低不透明度（`opacity: 0.03–0.05`）配合低环境反射与增透镀膜虹彩（如 `materials.arGlass` 的冷青/翠绿边缘反光），严禁套用厚 `transmission` 或双层高反射半球把整块表盘糊成灰雾或乳白乒乓球。
4. **倒角（Chamfer / Anglage）与微距接触阴影**
   - 现实世界不存在绝对 90° 零厚度锐边：所有外壳、夹板、键帽、轮辐一律带实体倒角（`RoundedBoxGeometry` 或 `ExtrudeGeometry` `bevelEnabled: true`），让高光只凝聚在倒角棱线上。
   - 微距场景收紧阴影相机视锥（`shadowBounds: 2.2–3.2`），并使用无缝径向消隐地面（`createStudioBackdrop`），严禁在纯黑虚空中放置带生硬直线边缘的灰色矩形桌面。

---

## 3. 物理规则准则（运动学、刚体约束与声画因果）

1. **精确齿轮啮合与传动比**
   - 相邻啮合齿轮的轴心距必须严格等于两轮节圆半径之和 $d = R_1 + R_2$，角速度严格满足反向齿数比 $\omega_2 = -\omega_1 \cdot \frac{Z_1}{Z_2}$，初始相位对齐齿槽，严禁轮齿悬空不接触或同向乱转。
2. **弹性、步进与机械行程**
   - 擒纵机构采用离散锁止—释放节拍（`timing.steps` 驱动棘轮脉冲 + 擒纵叉正反往复锁扣），摆轮游丝使用同心周期呼吸振荡（`loop.swing`）。
   - 机械按键、光圈叶片收缩、镜组对焦滑移与爆炸图合拢必须具备真实物理行程（如键帽下压 `1.2–2.0 mm` 触底后带阻尼回弹 `spring`），禁止无惯性的匀速线性平移或构件互相穿插（Clipping）。
3. **声画物理因果对齐**
   - 在 Stage `audio` 数组中声明机械瞬态音效（`tick`、`click`、`shutter`、`sub-hit`）或外部实录采样时，每一次机械锁止滴答、微动开关触发、旋钮阻尼与金属合拢瞬态必须与对应动作帧精确对齐。

---

## 4. 真实机械结构准则（拒绝原语堆砌假零件）

在编写三维几何前，先核对真实工业产品的工程装配清单，严禁用简单方块/圆球拼凑违背常识的假结构：

- **钟表机芯与表壳**：
  - **轮系不悬空**：主夹板需铣削沉孔槽；每枚齿轮采用细密渐开线轮齿（`48–72` 齿，`createInvoluteGearGeometry`）与五辐镂空轮辐，中心必须有淬火钢齿轴、车削轴榫、合成红宝石轴承套筒（`rubyJewel`），并由上方镂空拉丝夹板（带一字槽烤蓝紧固螺丝）压合固定。
  - **擒纵与游丝真实化**：擒纵轮采用斜切靴形冲面齿（`createEscapeWheelGeometry`），配合带两枚红宝石叉瓦的 T 形擒纵叉与多圈阿基米德螺旋游丝（`createSpiralSpringGeometry`），不用粗圆环冒充游丝。
  - **一体式表壳**：表耳必须从桶形/八角中壳连续切削延伸并衔接铰接表链节，表冠带护肩与 60+ 细槽防滑滚花（`createKnurledCylinderGeometry`），外圈六角螺丝沉入沉孔且一字槽方向沿切线排布，指针采用双折面立体太妃针/剑针并带中心轴帽。
- **工业硬件与合成器**：
  - CNC 一体喷砂机身需铣出下沉键床槽（Switch Well），键帽保留均匀微缝隙与球面微凹指腹轮廓（不贴卡通圆片）；编码器旋钮采用 60+ 细密滚花并嵌入阳极氧化沉孔护圈；屏幕做成纯平内嵌黑晶玻璃视窗，配有真实微孔扬声器阵列、Torx 内六角螺丝与后侧金属接口母座。
- **光学镜头与精密机构**：
  - 镜筒具备 `0.8 MOD` 细齿跟焦环、真实丝印光圈/对焦刻度环与金属卡口法兰；机械光圈由 `9–13` 片弧形叶片（`createIrisBladeGeometry`）绕外圈销轴同步旋入围合成多边形通光孔；透镜采用真实凹凸球面/弯月旋转截面（`createOpticalLensGeometry`）配多层绿/品红增透镀膜边缘高光与内对焦导柱。

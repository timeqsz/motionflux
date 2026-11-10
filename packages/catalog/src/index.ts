export const CATALOG_VERSION = '0.4.0';
/**
 * Families answer one question each. A complete motion is usually one pick from several of them:
 * a property, a timing curve, a choreography, then a feel laid on top.
 */
export type Family = 'prop' | 'timing' | 'loop' | 'choreo' | 'transition' | 'text' | 'feel' | 'generate';
/** `color` is the family accent: cell symbols, guides and highlights use it. */
export const families: Record<Family, { title: string; english: string; question: string; color: string }> = {
  prop: { title: '属性', english: 'Property', question: '变什么', color: '#d4513f' },
  timing: { title: '节奏', english: 'Timing', question: '怎么变', color: '#c98a12' },
  loop: { title: '循环', english: 'Loop', question: '一直动', color: '#8f8f10' },
  choreo: { title: '编排', english: 'Choreo', question: '谁先谁后', color: '#2f8f5b' },
  transition: { title: '转场', english: 'Transition', question: '出现消失', color: '#1f8a8f' },
  text: { title: '文字', english: 'Text', question: '字的动法', color: '#3f6fc2' },
  feel: { title: '质感', english: 'Feel', question: '叠在上面', color: '#7a5bc7' },
  generate: { title: '生成', english: 'Generate', question: '凭空产生', color: '#b4487f' },
};
export type Parameter =
  | { type: 'number'; title: string; minimum: number; maximum: number; default: number; unit: string; integer?: boolean }
  | { type: 'string'; title: string; enum: readonly string[]; labels?: readonly string[]; default: string }
  | { type: 'color'; title: string; default: string };
/**
 * How a clip takes part in evaluation.
 * - `property`: changes the subject over the clip. Clips on one node that write the same property take turns.
 * - `timing`: supplies the curve for property clips on the same node that start inside its span.
 * - `loop`: an ongoing motion layered on top of everything else; never takes turns.
 * - `layout`: turns one subject into several copies (placed, mirrored or trailing in time).
 * - `order`: delays copies so they start one after another.
 * - `feel`: a look laid over the subject (glow, grain, blur from motion).
 * - `overlay`: draws lines in scene space from the copies or the path the subject travelled.
 */
export type Role = 'property' | 'timing' | 'loop' | 'layout' | 'order' | 'feel' | 'overlay';
export interface Capability {
  id: RecipeId;
  symbol: string;
  english: string;
  family: Family;
  role: Role;
  /** `finite` animates from a start to an end; `ongoing` keeps evolving with time; `static` does not depend on time. */
  time: 'finite' | 'ongoing' | 'static';
  /** [row, column] in the periodic table, both 1-based. Derived from `table`. */
  cell: [number, number];
  version: string;
  title: string;
  description: string;
  tags: readonly string[];
  targets: readonly ('text' | 'path')[];
  /** What this recipe changes. Property clips that write the same thing on one node may not overlap in time. */
  writes: readonly string[];
  params: Record<string, Parameter>;
  backend: { js: string };
  /** `raster` recipes filter the subject's pixels and cost more per frame than plain vector drawing. */
  engine: 'vector' | 'raster';
}
// `id` stays a plain string here so RecipeId can be derived from the definitions below.
type Definition = Omit<Capability, 'id' | 'family' | 'cell' | 'version' | 'targets' | 'backend' | 'engine' | 'time'> & { id: string } & Partial<Pick<Capability, 'targets' | 'backend' | 'engine' | 'time'>>;
const num = (title: string, minimum: number, maximum: number, value: number, unit: string): Parameter => ({ type: 'number', title, minimum, maximum, default: value, unit });
const int = (title: string, minimum: number, maximum: number, value: number, unit: string): Parameter => ({ type: 'number', title, minimum, maximum, default: value, unit, integer: true });
const pick = (title: string, options: readonly string[], labels: readonly string[], value: string): Parameter => ({ type: 'string', title, enum: options, labels, default: value });
const color = (title: string, value: string): Parameter => ({ type: 'color', title, default: value });
const mode = pick('方向', ['in', 'out'], ['出现', '消失'], 'in');
const any = ['text', 'path'] as const;
const text = ['text'] as const;
const raster = 'raster' as const;
const ongoing = 'ongoing' as const;
const fixed = 'static' as const;

const definitions = [
  // 属性：变什么
  { id: 'prop.move', symbol: 'Mv', english: 'Move', title: '位移', role: 'property', targets: any, writes: ['position'],
    description: '沿一个方向从起始偏移移到结束偏移；方向 0° 向右、90° 向下。', tags: ['位移', '移动', '入场', 'move', 'translate'],
    params: { fromPx: num('起始偏移', -2000, 2000, -120, 'px'), toPx: num('结束偏移', -2000, 2000, 120, 'px'), angleDeg: num('移动方向', -180, 180, 0, 'deg') } },
  { id: 'prop.rotate', symbol: 'Rt', english: 'Rotate', title: '旋转', role: 'property', targets: any, writes: ['rotation'],
    description: '绕对象原点从起始角转到结束角，正角度为顺时针。', tags: ['旋转', '转动', 'rotate'],
    params: { fromDeg: num('起始角度', -720, 720, 0, 'deg'), toDeg: num('结束角度', -720, 720, 180, 'deg') } },
  { id: 'prop.scale', symbol: 'Sc', english: 'Scale', title: '缩放', role: 'property', targets: any, writes: ['scale'],
    description: '绕对象原点等比缩放。', tags: ['缩放', '放大', '缩小', 'scale', 'zoom'],
    params: { from: num('起始倍率', 0, 8, 0.4, 'ratio'), to: num('结束倍率', 0, 8, 1.2, 'ratio') } },
  { id: 'prop.opacity', symbol: 'Op', english: 'Opacity', title: '透明', role: 'property', targets: any, writes: ['opacity'],
    description: '整体透明度从起始值过渡到结束值，用来显现和隐去。', tags: ['透明度', '淡入', '淡出', 'opacity', 'fade'],
    params: { from: num('起始透明度', 0, 1, 0, 'ratio'), to: num('结束透明度', 0, 1, 1, 'ratio') } },
  { id: 'prop.color', symbol: 'Co', english: 'Color', title: '颜色', role: 'property', targets: any, writes: ['color'],
    description: '颜色从起始色过渡到结束色，在线性光下混合，中途不发灰。', tags: ['颜色', '变色', '色彩', 'color'],
    params: { from: color('起始颜色', '#1d201d'), to: color('结束颜色', '#d4513f') } },
  { id: 'prop.blur', symbol: 'Bu', english: 'Blur', title: '模糊', role: 'property', engine: raster, targets: any, writes: ['blur'],
    description: '高斯模糊半径从起始值变到结束值，从虚到实或从实到虚。', tags: ['模糊', '虚化', '对焦', 'blur', 'focus'],
    params: { fromPx: num('起始半径', 0, 60, 16, 'px'), toPx: num('结束半径', 0, 60, 0, 'px') } },
  { id: 'prop.morph', symbol: 'Mp', english: 'Morph', title: '变形', role: 'property', writes: ['geometry'],
    description: '轮廓按弧长对齐后逐点过渡到目标形状，不会扭成一团。', tags: ['变形', '形变', '过渡', 'morph', 'shape'],
    params: { target: pick('目标形状', ['circle', 'triangle', 'square', 'star'], ['圆形', '三角形', '方形', '星形'], 'star'), amount: num('变形程度', 0, 1, 1, 'ratio') } },
  { id: 'prop.draw', symbol: 'Dr', english: 'Draw', title: '描线', role: 'property', writes: ['trim'],
    description: '按真实弧长把路径从起点画到终点；拖尾大于 0 时只留一段在路径上跑。', tags: ['描线', '描边', '路径', '手写', 'draw', 'trim', 'stroke'],
    params: { from: num('起始比例', 0, 1, 0, 'ratio'), to: num('结束比例', 0, 1, 1, 'ratio'), trailRatio: num('拖尾长度', 0, 1, 0, 'ratio') } },
  { id: 'prop.crop', symbol: 'Cp', english: 'Crop', title: '裁切', role: 'property', targets: any, writes: ['mask'],
    description: '可见范围从一侧或中心向外展开，对象本身不动。', tags: ['裁切', '遮罩', '展开', 'crop', 'mask'],
    params: { from: num('起始可见', 0, 1, 0, 'ratio'), to: num('结束可见', 0, 1, 1, 'ratio'),
      origin: pick('展开起点', ['center', 'left', 'right', 'top', 'bottom'], ['中心', '左侧', '右侧', '顶部', '底部'], 'center') } },

  // 节奏：怎么变
  { id: 'timing.ease', symbol: 'Es', english: 'Ease', title: '缓动', role: 'timing', time: fixed, targets: any, writes: ['curve'],
    description: '加速、减速或两头慢中间快。作用在同一对象、在它范围内开始的属性动画上。', tags: ['缓动', '加速', '减速', 'ease', 'easing'],
    params: { mode: pick('类型', ['in', 'out', 'inOut'], ['渐快', '渐慢', '先快后慢'], 'out'), power: num('力度', 1, 6, 3, 'number') } },
  { id: 'timing.spring', symbol: 'Sp', english: 'Spring', title: '弹簧', role: 'timing', time: fixed, targets: any, writes: ['curve'],
    description: '像挂在弹簧上，冲过终点后来回晃几下再停稳；片段结束时正好停在终值。', tags: ['弹簧', '弹性', '晃动', 'spring'],
    params: { oscillations: num('晃动次数', 0.5, 8, 2.5, 'cycle'), damping: num('阻尼', 0, 12, 4, 'number') } },
  { id: 'timing.bounce', symbol: 'Bn', english: 'Bounce', title: '回弹', role: 'timing', time: fixed, targets: any, writes: ['curve'],
    description: '像球落地：到达终点后反弹几次，每次更低。', tags: ['回弹', '弹跳', '落地', 'bounce'],
    params: { bounces: int('弹跳次数', 1, 6, 3, 'count'), decay: num('衰减', 0.1, 0.8, 0.4, 'ratio') } },
  { id: 'timing.overshoot', symbol: 'Ov', english: 'Overshoot', title: '过冲', role: 'timing', time: fixed, targets: any, writes: ['curve'],
    description: '冲过终点一点再收回来，只回一次。', tags: ['过冲', '回收', '弹出', 'overshoot', 'back'],
    params: { tension: num('过冲力度', 0, 6, 1.8, 'number') } },
  { id: 'timing.anticipate', symbol: 'Ac', english: 'Anticipate', title: '预备', role: 'timing', time: fixed, targets: any, writes: ['curve'],
    description: '先往反方向退一点蓄力，再加速出发、减速到达。', tags: ['预备', '蓄力', '反向', 'anticipate'],
    params: { amount: num('后退幅度', 0, 1, 0.3, 'ratio') } },
  { id: 'timing.steps', symbol: 'St', english: 'Steps', title: '步进', role: 'timing', time: fixed, targets: any, writes: ['curve'],
    description: '不连续地变化，一格一格跳到终点，像秒针或逐帧动画。', tags: ['步进', '逐帧', '跳格', 'steps'],
    params: { steps: int('格数', 2, 30, 6, 'count') } },

  // 循环：一直动
  { id: 'loop.breathe', symbol: 'Pu', english: 'Breathe', title: '呼吸', role: 'loop', time: ongoing, targets: any, writes: ['scale'],
    description: '缓慢地放大缩小，像在呼吸。', tags: ['呼吸', '脉动', '涨缩', 'breathe', 'pulse'],
    params: { amount: num('涨缩幅度', 0, 1, 0.12, 'ratio'), periodS: num('周期', 0.2, 10, 2, 's') } },
  { id: 'loop.swing', symbol: 'Sw', english: 'Swing', title: '摆动', role: 'loop', time: ongoing, targets: any, writes: ['rotation', 'position'],
    description: '规律地来回：绕原点摆动，或沿水平、竖直方向往复。', tags: ['摆动', '钟摆', '往复', 'swing', 'sine'],
    params: { axis: pick('摆动方式', ['rotate', 'x', 'y'], ['绕原点摆', '左右', '上下'], 'rotate'), amount: num('幅度（度或 px）', 0, 360, 24, 'deg|px'), periodS: num('周期', 0.2, 10, 1.6, 's') } },
  { id: 'loop.float', symbol: 'Fl', english: 'Float', title: '漂浮', role: 'loop', time: ongoing, targets: any, writes: ['position', 'rotation'],
    description: '用平滑噪声不规则地游移和微微转动，不会有规律的重复感。', tags: ['漂浮', '游移', '噪声', 'float', 'wiggle', 'noise'],
    params: { amplitudePx: num('游移幅度', 0, 300, 40, 'px'), rotateDeg: num('转动幅度', 0, 180, 10, 'deg'), frequencyHz: num('变化频率', 0, 6, 0.5, 'Hz') } },
  { id: 'loop.spin', symbol: 'Sn', english: 'Spin', title: '自转', role: 'loop', time: ongoing, targets: any, writes: ['rotation'],
    description: '匀速持续旋转，负值逆时针。', tags: ['自转', '旋转', '加载', 'spin', 'loading'],
    params: { turnsPerSecond: num('转速', -4, 4, 0.25, 'turn/s') } },
  { id: 'loop.flicker', symbol: 'Fk', english: 'Flicker', title: '闪烁', role: 'loop', time: ongoing, targets: any, writes: ['opacity'],
    description: '亮度在亮和暗之间随机跳变，像接触不良的灯。', tags: ['闪烁', '频闪', '跳变', 'flicker', 'blink'],
    params: { rateHz: num('跳变频率', 0.5, 30, 10, 'Hz'), low: num('暗时透明度', 0, 1, 0.15, 'ratio'), chance: num('变暗概率', 0, 1, 0.35, 'ratio') } },
  { id: 'loop.wave', symbol: 'Wv', english: 'Wave', title: '波动', role: 'loop', time: ongoing, targets: any, writes: ['position'],
    description: '一排副本依次上下起伏，波峰从一端传到另一端；单个对象则只是上下浮动。', tags: ['波动', '起伏', '波浪', 'wave'],
    params: { amplitudePx: num('起伏幅度', 0, 200, 24, 'px'), periodS: num('周期', 0.2, 10, 1.4, 's'), phaseDeg: num('相邻相位差', 0, 360, 45, 'deg') } },

  // 编排：谁先谁后
  { id: 'choreo.stagger', symbol: 'Sg', english: 'Stagger', title: '错开', role: 'order', time: fixed, targets: any, writes: ['delay'],
    description: '让副本一个接一个开始，每个比前一个晚固定帧数。', tags: ['错开', '依次', '延迟', 'stagger', 'delay'],
    params: { stepFrames: num('每个间隔', 0, 60, 5, 'frame'), order: pick('顺序', ['forward', 'reverse', 'center', 'edges'], ['从头到尾', '从尾到头', '从中间向两端', '从两端向中间'], 'forward') } },
  { id: 'choreo.cascade', symbol: 'Cs', english: 'Cascade', title: '扩散', role: 'order', time: fixed, targets: any, writes: ['delay'],
    description: '离起点越远的副本开始得越晚，动作像水波一样从一点传开。', tags: ['扩散', '传播', '波及', 'cascade', 'ripple'],
    params: { framesPer100Px: num('每 100px 延迟', 0, 60, 6, 'frame'), originX: num('起点 X', -2000, 2000, 0, 'px'), originY: num('起点 Y', -2000, 2000, 0, 'px') } },
  { id: 'choreo.follow', symbol: 'Fo', english: 'Follow', title: '跟随', role: 'layout', time: fixed, targets: any, writes: ['copies'],
    description: '复制出几个跟随者，每个比前一个晚几帧走同样的路线，越往后越小越淡。', tags: ['跟随', '尾随', '追赶', 'follow', 'delay'],
    params: { count: int('跟随数量', 1, 16, 5, 'count'), lagFrames: num('每个落后', 0, 60, 5, 'frame'), falloff: num('逐个衰减', 0, 0.5, 0.12, 'ratio') } },
  { id: 'choreo.mirror', symbol: 'Mi', english: 'Mirror', title: '镜像', role: 'layout', time: fixed, targets: any, writes: ['copies'],
    description: '在对称位置放一个镜像副本，它的动作也左右或上下相反。', tags: ['镜像', '对称', '翻转', 'mirror', 'symmetry'],
    params: { axis: pick('对称轴', ['x', 'y', 'both'], ['左右对称', '上下对称', '四向对称'], 'x'), distancePx: num('两侧间距', 0, 2000, 200, 'px') } },
  { id: 'choreo.array', symbol: 'Ar', english: 'Array', title: '阵列', role: 'layout', time: fixed, targets: any, writes: ['copies'],
    description: '沿一条直线等距复制成一排，以原位置为中心。', tags: ['阵列', '复制', '一排', 'array', 'repeat'],
    params: { count: int('数量', 1, 32, 5, 'count'), gapPx: num('间距', 0, 1000, 80, 'px'), angleDeg: num('排列方向', -180, 180, 0, 'deg') } },
  { id: 'choreo.ring', symbol: 'Rg', english: 'Ring', title: '环形', role: 'layout', time: fixed, targets: any, writes: ['copies'],
    description: '围绕原位置复制成一圈；可以让每个副本朝外。', tags: ['环形', '圆周', '一圈', 'ring', 'radial'],
    params: { count: int('数量', 1, 48, 8, 'count'), radiusPx: num('半径', 0, 1000, 120, 'px'), orient: pick('朝向', ['keep', 'outward'], ['保持原朝向', '朝外'], 'outward') } },
  { id: 'choreo.grid', symbol: 'Gd', english: 'Grid', title: '网格', role: 'layout', time: fixed, targets: any, writes: ['copies'],
    description: '复制成行列整齐的矩阵，以原位置为中心。', tags: ['网格', '矩阵', '平铺', 'grid', 'tile'],
    params: { columns: int('列数', 1, 24, 6, 'count'), rows: int('行数', 1, 24, 4, 'count'), gapPx: num('间距', 0, 1000, 64, 'px') } },
  { id: 'choreo.random', symbol: 'Rd', english: 'Shuffle', title: '乱序', role: 'order', time: fixed, targets: any, writes: ['delay'],
    description: '给每个副本一个固定种子下的随机延迟，先后没有规律。', tags: ['乱序', '随机', '先后', 'random', 'shuffle'],
    params: { spreadFrames: num('最大延迟', 0, 120, 24, 'frame') } },

  // 转场：出现消失
  { id: 'transition.wipe', symbol: 'Wp', english: 'Wipe', title: '擦除', role: 'property', targets: any, writes: ['mask'],
    description: '一条直边扫过对象，扫过的部分出现或消失。', tags: ['擦除', '划入', '遮罩', 'wipe'],
    params: { mode, angleDeg: num('扫动方向', -180, 180, 0, 'deg') } },
  { id: 'transition.iris', symbol: 'Ir', english: 'Iris', title: '圆形展开', role: 'property', targets: any, writes: ['mask'],
    description: '从一点开始圆形张开或收拢。', tags: ['圆形', '展开', '光圈', 'iris', 'circle'],
    params: { mode, centerX: num('圆心 X（比例）', 0, 1, 0.5, 'ratio'), centerY: num('圆心 Y（比例）', 0, 1, 0.5, 'ratio') } },
  { id: 'transition.slices', symbol: 'Sl', english: 'Slices', title: '分条', role: 'property', targets: any, writes: ['mask'],
    description: '切成几条，相邻条从相反方向错位滑入或滑出。', tags: ['分条', '条片', '错位', 'slices', 'strips'],
    params: { mode, count: int('条数', 2, 24, 5, 'count'), distancePx: num('滑动距离', 0, 2000, 160, 'px'), staggerRatio: num('错开比例', 0, 0.9, 0.35, 'ratio') } },
  { id: 'transition.blinds', symbol: 'Bl', english: 'Blinds', title: '百叶', role: 'property', targets: any, writes: ['mask'],
    description: '像百叶窗，一片片同时打开或合上。', tags: ['百叶窗', '叶片', '条纹', 'blinds'],
    params: { mode, count: int('叶片数', 2, 40, 8, 'count'), angleDeg: num('叶片方向', -90, 90, 0, 'deg') } },
  { id: 'transition.flip', symbol: 'Fp', english: 'Flip', title: '翻转', role: 'property', targets: any, writes: ['stretch'],
    description: '像卡片一样绕竖轴或横轴翻过来，侧面朝前时最窄。', tags: ['翻转', '翻面', '卡片', 'flip', 'card'],
    params: { mode, axis: pick('翻转轴', ['y', 'x'], ['绕竖轴', '绕横轴'], 'y'), turns: num('翻转圈数', 0.25, 4, 0.25, 'turn') } },
  { id: 'transition.push', symbol: 'Ps', english: 'Push', title: '推入', role: 'property', targets: any, writes: ['mask'],
    description: '内容在自己的范围里滑进或滑出，范围外不可见；两个对象一进一出就是推走。', tags: ['推入', '推出', '滑入', 'push', 'slide'],
    params: { mode, angleDeg: num('推动方向', -180, 180, 0, 'deg') } },
  { id: 'transition.dissolve', symbol: 'Ds', english: 'Dissolve', title: '溶解', role: 'property', engine: raster, targets: any, writes: ['dissolve'],
    description: '一颗颗随机颗粒逐渐出现或消失。', tags: ['溶解', '颗粒', '消散', 'dissolve'],
    params: { mode, grainPx: num('颗粒大小', 1, 40, 6, 'px') } },

  // 文字：字的动法
  { id: 'text.chars', symbol: 'Ch', english: 'Per Character', title: '逐字', role: 'property', targets: text, writes: ['chars'],
    description: '每个字依次升起并显现；片段时长包含错开的时间。', tags: ['逐字', '文字', '标题', '入场', 'characters'],
    params: { stepFrames: num('每字间隔', 0, 30, 3, 'frame'), distancePx: num('升起距离', -300, 300, 36, 'px') } },
  { id: 'text.lines', symbol: 'Ln', english: 'Per Line', title: '逐行', role: 'property', targets: text, writes: ['lines'],
    description: '按换行一行一行移动并淡入；片段时长包含错开的时间。', tags: ['逐行', '文字', '字幕', 'lines'],
    params: { stepFrames: int('每行间隔', 0, 120, 8, 'frame'), distancePx: num('移动距离', -300, 300, 40, 'px') } },
  { id: 'text.decode', symbol: 'Dc', english: 'Decode', title: '解码', role: 'property', targets: text, writes: ['text'],
    description: '字符先随机乱跳，再从左到右依次定格成正文。', tags: ['解码', '乱码', '黑客', 'decode', 'scramble'],
    params: { rateHz: num('乱跳频率', 1, 60, 20, 'Hz'), charset: pick('乱码字符', ['own', 'symbols', 'binary'], ['用正文的字', '符号', '0 和 1'], 'symbols') } },
  { id: 'text.type', symbol: 'Ty', english: 'Typewriter', title: '打字', role: 'property', targets: text, writes: ['text'],
    description: '字一个个打出来，光标跟在后面闪。', tags: ['打字', '打字机', '光标', 'typewriter', 'typing'],
    params: { cursor: pick('光标', ['bar', 'block', 'none'], ['竖线', '方块', '不显示'], 'bar'), blinkHz: num('光标闪烁', 0, 6, 2, 'Hz') } },
  { id: 'text.count', symbol: 'Ct', english: 'Count', title: '计数', role: 'property', targets: text, writes: ['text'],
    description: '数字从起始值滚到目标值；文字中的 # 会被替换成数字。', tags: ['计数', '数字', '数据', 'count', 'number'],
    params: { from: num('起始值', -1e9, 1e9, 0, 'number'), to: num('目标值', -1e9, 1e9, 2026, 'number'), decimals: int('小数位', 0, 4, 0, 'count'),
      grouping: pick('千分位', ['none', 'comma'], ['不分组', '逗号分组'], 'none') } },
  { id: 'text.tracking', symbol: 'Tk', english: 'Tracking', title: '字距', role: 'property', targets: text, writes: ['chars'],
    description: '字与字的间距从散开收拢到正常，或反过来。', tags: ['字距', '散开', '收拢', 'tracking', 'letter spacing'],
    params: { fromPx: num('起始额外字距', -100, 400, 60, 'px'), toPx: num('结束额外字距', -100, 400, 0, 'px'), anchor: pick('对齐点', ['center', 'left'], ['中心不动', '左侧不动'], 'center') } },

  // 质感：叠在上面
  { id: 'feel.trail', symbol: 'Tl', english: 'Trail', title: '拖影', role: 'layout', time: fixed, targets: any, writes: ['copies'],
    description: '在身后留下几个刚刚经过位置的残影，越旧越淡。', tags: ['拖影', '残影', '余像', 'trail', 'echo'],
    params: { count: int('残影数量', 1, 16, 6, 'count'), gapFrames: num('残影间隔', 0.25, 10, 1.5, 'frame'), strength: num('残影强度', 0, 1, 0.5, 'ratio') } },
  { id: 'feel.motion-blur', symbol: 'Mb', english: 'Motion Blur', title: '运动模糊', role: 'feel', engine: raster, time: fixed, targets: any, writes: ['blur'],
    description: '按真实速度沿运动方向拉虚，快的时候虚、停下就清楚。', tags: ['运动模糊', '速度', '拖尾', 'motion blur'],
    params: { shutterDeg: num('快门角度', 0, 720, 180, 'deg') } },
  { id: 'feel.glow', symbol: 'Gl', english: 'Glow', title: '辉光', role: 'feel', engine: raster, time: fixed, targets: any, writes: ['glow'],
    description: '把对象自身模糊后叠回去，周围泛出同色的光。', tags: ['辉光', '发光', '霓虹', 'glow', 'neon'],
    params: { radiusPx: num('光晕半径', 0, 80, 14, 'px'), strength: num('强度', 0, 4, 1.2, 'ratio') } },
  { id: 'feel.grain', symbol: 'Gn', english: 'Grain', title: '颗粒', role: 'feel', engine: raster, time: ongoing, targets: any, writes: ['grain'],
    description: '胶片似的随机颗粒，按设定频率刷新。', tags: ['颗粒', '噪点', '胶片', 'grain', 'film'],
    params: { amount: num('强度', 0, 1, 0.55, 'ratio'), sizePx: num('颗粒大小', 1, 12, 2, 'px'), rateHz: num('刷新频率', 1, 60, 12, 'Hz') } },
  { id: 'feel.glitch', symbol: 'Gt', english: 'Glitch', title: '故障', role: 'feel', engine: raster, time: ongoing, targets: any, writes: ['glitch'],
    description: '随机几条横带突然错位撕裂，再跳回原位。', tags: ['故障', '撕裂', '错位', 'glitch'],
    params: { offsetPx: num('最大错位', 0, 200, 28, 'px'), bandPx: num('横带高度', 2, 120, 14, 'px'), chance: num('出现频率', 0, 1, 0.35, 'ratio'), rateHz: num('刷新频率', 1, 30, 8, 'Hz') } },
  { id: 'feel.chroma', symbol: 'Ca', english: 'Chromatic', title: '色散', role: 'feel', engine: raster, time: fixed, targets: any, writes: ['chroma'],
    description: '在两侧错开一红一青两层，边缘出现彩色分离。', tags: ['色散', 'RGB 分离', '色差', 'chromatic aberration', 'rgb split'],
    params: { offsetPx: num('分离距离', 0, 60, 6, 'px'), angleDeg: num('分离方向', -180, 180, 0, 'deg') } },

  // 生成：凭空产生
  { id: 'gen.particles', symbol: 'Pa', english: 'Particles', title: '粒子', role: 'property', time: ongoing, writes: ['geometry'],
    description: '从原点持续喷出粒子，受重力下落并逐渐变小消失；每个粒子的轨迹都可直接按时间求值。', tags: ['粒子', '喷发', '火花', 'particles', 'emitter'],
    params: { count: int('同时在飞', 1, 300, 48, 'count'), speedPx: num('速度', 0, 2000, 260, 'px/s'), spreadDeg: num('扩散角', 0, 360, 80, 'deg'),
      gravityPx: num('重力', -2000, 4000, 420, 'px/s²'), lifeFrames: int('寿命', 2, 600, 40, 'frame'), sizePx: num('大小', 0.5, 60, 7, 'px') } },
  { id: 'gen.shatter', symbol: 'Sh', english: 'Shatter', title: '碎裂', role: 'property', writes: ['geometry'],
    description: '把轮廓切成三角碎片，从中心向外依次炸开、旋转、下落并淡出。', tags: ['碎裂', '爆炸', '碎片', 'shatter', 'break'],
    params: { pieces: int('切分密度', 2, 16, 6, 'count'), forcePx: num('飞散距离', 0, 2000, 180, 'px'), spinDeg: num('碎片旋转', 0, 1440, 240, 'deg'),
      gravityPx: num('下落距离', 0, 2000, 120, 'px'), delayRatio: num('由内向外延迟', 0, 0.9, 0.3, 'ratio') } },
  { id: 'gen.ripple', symbol: 'Rp', english: 'Ripple', title: '波纹', role: 'property', time: ongoing, writes: ['geometry'],
    description: '对象的轮廓一圈圈向外放大并淡出，像水面荡开。', tags: ['波纹', '涟漪', '扩散', 'ripple', 'pulse ring'],
    params: { rings: int('同时圈数', 1, 12, 3, 'count'), growth: num('放大倍率', 1, 12, 3.2, 'ratio'), periodS: num('每圈时长', 0.2, 10, 1.8, 's') } },
  { id: 'gen.trace', symbol: 'Tr', english: 'Trace', title: '轨迹', role: 'overlay', time: fixed, targets: any, writes: ['overlay'],
    description: '画出对象（和每个副本）原点刚刚走过的路线，越旧越淡。', tags: ['轨迹', '路线', '运动路径', 'trace', 'path'],
    params: { lengthFrames: num('轨迹长度', 1, 240, 30, 'frame'), widthPx: num('线宽', 0.5, 40, 3, 'px') } },
  { id: 'gen.link', symbol: 'Lk', english: 'Link', title: '连线', role: 'overlay', time: fixed, targets: any, writes: ['overlay'],
    description: '用线把副本按顺序或按距离连起来，副本移动时线跟着走。', tags: ['连线', '网络', '节点', 'link', 'network'],
    params: { mode: pick('连法', ['chain', 'near'], ['按顺序首尾相连', '连接距离内的'], 'near'), maxDistancePx: num('最远连接距离', 0, 2000, 120, 'px'), widthPx: num('线宽', 0.5, 20, 1.5, 'px') } },
] as const satisfies readonly Definition[];
export type RecipeId = (typeof definitions)[number]['id'];

/**
 * The periodic table: one entry per column, left to right. Columns are bottom-aligned; a family takes one or two
 * adjacent columns. Tall families stand at both ends so the short middle leaves room for the title, as in a
 * chemical table. Reclassifying a recipe only means moving its ID here.
 */
export const tableRows = 5;
export const table: readonly (readonly [Family, readonly RecipeId[]])[] = [
  ['prop', ['prop.move', 'prop.rotate', 'prop.scale', 'prop.opacity', 'prop.color']],
  ['prop', ['prop.blur', 'prop.morph', 'prop.draw', 'prop.crop']],
  ['timing', ['timing.ease', 'timing.spring', 'timing.bounce']],
  ['timing', ['timing.overshoot', 'timing.anticipate', 'timing.steps']],
  ['loop', ['loop.breathe', 'loop.swing', 'loop.float']],
  ['loop', ['loop.spin', 'loop.flicker', 'loop.wave']],
  ['text', ['text.chars', 'text.lines', 'text.decode']],
  ['text', ['text.type', 'text.count', 'text.tracking']],
  ['feel', ['feel.trail', 'feel.motion-blur', 'feel.glow']],
  ['feel', ['feel.grain', 'feel.glitch', 'feel.chroma']],
  ['transition', ['transition.wipe', 'transition.iris', 'transition.slices']],
  ['transition', ['transition.blinds', 'transition.flip', 'transition.push', 'transition.dissolve']],
  ['choreo', ['choreo.stagger', 'choreo.cascade', 'choreo.follow', 'choreo.random']],
  ['choreo', ['choreo.array', 'choreo.ring', 'choreo.grid', 'choreo.mirror']],
  ['generate', ['gen.particles', 'gen.shatter', 'gen.ripple', 'gen.trace', 'gen.link']],
];
const placement = new Map<RecipeId, { family: Family; cell: [number, number] }>();
table.forEach(([family, ids], column) => ids.forEach((id, index) => placement.set(id, { family, cell: [tableRows - ids.length + index + 1, column + 1] })));
export const capabilities: readonly Capability[] = definitions.map((definition): Capability => {
  const placed = placement.get(definition.id);
  if (!placed) throw new Error(`Capability ${definition.id} has no cell in the periodic table.`);
  const entry: Definition = definition;
  return { version: '0.1.0', targets: ['path'], backend: { js: 'implemented' }, engine: 'vector', time: 'finite', ...entry, id: definition.id, ...placed };
});
export function getCapability(id: string): Capability | undefined {
  return capabilities.find((entry) => entry.id === id);
}
export function defaultParams(id: RecipeId): Record<string, number | string> {
  return Object.fromEntries(Object.entries(getCapability(id)!.params).map(([key, parameter]) => [key, parameter.default]));
}
export function searchCapabilities(query: string): readonly Capability[] {
  const terms = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  return capabilities.filter((entry) => terms.every((term) =>
    [entry.id, entry.title, entry.english, entry.symbol, entry.description, families[entry.family].title, families[entry.family].english, ...entry.tags].join(' ').toLowerCase().includes(term)));
}

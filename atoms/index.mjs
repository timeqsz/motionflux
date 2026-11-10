// 全部 53 个动效原子，按 ID 取用。只需要其中几个时，直接导入对应的单个文件更轻。
import a0 from './prop.move.mjs';
import a1 from './prop.rotate.mjs';
import a2 from './prop.scale.mjs';
import a3 from './prop.opacity.mjs';
import a4 from './prop.color.mjs';
import a5 from './prop.blur.mjs';
import a6 from './prop.morph.mjs';
import a7 from './prop.draw.mjs';
import a8 from './prop.crop.mjs';
import a9 from './timing.ease.mjs';
import a10 from './timing.spring.mjs';
import a11 from './timing.bounce.mjs';
import a12 from './timing.overshoot.mjs';
import a13 from './timing.anticipate.mjs';
import a14 from './timing.steps.mjs';
import a15 from './loop.breathe.mjs';
import a16 from './loop.swing.mjs';
import a17 from './loop.float.mjs';
import a18 from './loop.spin.mjs';
import a19 from './loop.flicker.mjs';
import a20 from './loop.wave.mjs';
import a21 from './text.chars.mjs';
import a22 from './text.lines.mjs';
import a23 from './text.decode.mjs';
import a24 from './text.type.mjs';
import a25 from './text.count.mjs';
import a26 from './text.tracking.mjs';
import a27 from './feel.trail.mjs';
import a28 from './feel.motion-blur.mjs';
import a29 from './feel.glow.mjs';
import a30 from './feel.grain.mjs';
import a31 from './feel.glitch.mjs';
import a32 from './feel.chroma.mjs';
import a33 from './transition.wipe.mjs';
import a34 from './transition.iris.mjs';
import a35 from './transition.slices.mjs';
import a36 from './transition.blinds.mjs';
import a37 from './transition.flip.mjs';
import a38 from './transition.push.mjs';
import a39 from './transition.dissolve.mjs';
import a40 from './choreo.stagger.mjs';
import a41 from './choreo.cascade.mjs';
import a42 from './choreo.follow.mjs';
import a43 from './choreo.random.mjs';
import a44 from './choreo.array.mjs';
import a45 from './choreo.ring.mjs';
import a46 from './choreo.grid.mjs';
import a47 from './choreo.mirror.mjs';
import a48 from './gen.particles.mjs';
import a49 from './gen.shatter.mjs';
import a50 from './gen.ripple.mjs';
import a51 from './gen.trace.mjs';
import a52 from './gen.link.mjs';
export { drawAtom, drawSubject } from './draw.mjs';
export const atoms = {
  'prop.move': a0,
  'prop.rotate': a1,
  'prop.scale': a2,
  'prop.opacity': a3,
  'prop.color': a4,
  'prop.blur': a5,
  'prop.morph': a6,
  'prop.draw': a7,
  'prop.crop': a8,
  'timing.ease': a9,
  'timing.spring': a10,
  'timing.bounce': a11,
  'timing.overshoot': a12,
  'timing.anticipate': a13,
  'timing.steps': a14,
  'loop.breathe': a15,
  'loop.swing': a16,
  'loop.float': a17,
  'loop.spin': a18,
  'loop.flicker': a19,
  'loop.wave': a20,
  'text.chars': a21,
  'text.lines': a22,
  'text.decode': a23,
  'text.type': a24,
  'text.count': a25,
  'text.tracking': a26,
  'feel.trail': a27,
  'feel.motion-blur': a28,
  'feel.glow': a29,
  'feel.grain': a30,
  'feel.glitch': a31,
  'feel.chroma': a32,
  'transition.wipe': a33,
  'transition.iris': a34,
  'transition.slices': a35,
  'transition.blinds': a36,
  'transition.flip': a37,
  'transition.push': a38,
  'transition.dissolve': a39,
  'choreo.stagger': a40,
  'choreo.cascade': a41,
  'choreo.follow': a42,
  'choreo.random': a43,
  'choreo.array': a44,
  'choreo.ring': a45,
  'choreo.grid': a46,
  'choreo.mirror': a47,
  'gen.particles': a48,
  'gen.shatter': a49,
  'gen.ripple': a50,
  'gen.trace': a51,
  'gen.link': a52,
};

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export { THREE, RoundedBoxGeometry, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass };

export type Bounds = [number, number, number, number];

/** Deterministic Mulberry32 PRNG — never touches Math.random(), 100% reproducible across platforms and frame jumps. */
export function createRng(seed = 20261114): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convert an RGBA height buffer (R channel 0..255) into a tangent-space normal map RGBA buffer via wrapped 3x3 Sobel. */
export function createNormalMapDataFromHeight(heightRgba: Uint8Array, size: number, strength = 2.4): Uint8Array {
  const out = new Uint8Array(size * size * 4);
  const sample = (x: number, y: number): number => {
    const wx = ((x % size) + size) % size;
    const wy = ((y % size) + size) % size;
    return (heightRgba[(wy * size + wx) * 4] ?? 128) / 255;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = sample(x - 1, y - 1);
      const tc = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const ml = sample(x - 1, y);
      const mr = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const bc = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dx = (tr + 2 * mr + br - (tl + 2 * ml + bl)) * strength;
      const dy = (bl + 2 * bc + br - (tl + 2 * tc + tr)) * strength;
      const invLen = 1 / Math.hypot(dx, dy, 1);
      const nx = -dx * invLen;
      const ny = -dy * invLen;
      const nz = invLen;

      const idx = (y * size + x) * 4;
      out[idx] = Math.max(0, Math.min(255, Math.round((nx * 0.5 + 0.5) * 255)));
      out[idx + 1] = Math.max(0, Math.min(255, Math.round((ny * 0.5 + 0.5) * 255)));
      out[idx + 2] = Math.max(0, Math.min(255, Math.round((nz * 0.5 + 0.5) * 255)));
      out[idx + 3] = 255;
    }
  }
  return out;
}

function makeRepeatDataTexture(data: Uint8Array, size: number, repeatX = 2, repeatY = 2): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/** Deterministic anisotropic linear brushed-metal RGBA buffer (usable directly in Node tests and DataTexture). */
export function createBrushedMetalData(seed = 101, size = 512): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  const rng = createRng(seed);
  const rowBase = new Float32Array(size);
  for (let y = 0; y < size; y++) rowBase[y] = (rng() - 0.5) * 44 + Math.sin((y / size) * Math.PI * 32) * 8;
  for (let y = 0; y < size; y++) {
    let streak = 0;
    const base = rowBase[y] ?? 0;
    for (let x = 0; x < size; x++) {
      streak = streak * 0.92 + (rng() - 0.5) * 22;
      const micro = (rng() - 0.5) * 9;
      const v = Math.max(0, Math.min(255, Math.round(134 + base * 0.52 + streak + micro)));
      const i = (y * size + x) * 4;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return data;
}

/** Deterministic anisotropic brushed-metal texture for roughnessMap and normal derivation. */
export function createBrushedMetalTexture(seed = 101, size = 512): THREE.DataTexture {
  return makeRepeatDataTexture(createBrushedMetalData(seed, size), size, 3, 3);
}

/** Deterministic radial sunray brushed RGBA buffer for watch ratchets, rotary encoder caps, and lens flanges. */
export function createRadialBrushedData(seed = 303, size = 512): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  const rng = createRng(seed);
  const angularBins = 720;
  const rays = new Float32Array(angularBins);
  let acc = 0;
  for (let i = 0; i < angularBins; i++) {
    acc = acc * 0.72 + (rng() - 0.5) * 42;
    rays[i] = acc;
  }
  const half = size * 0.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - half;
      const dy = y + 0.5 - half;
      const angle = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
      const fBin = angle * angularBins;
      const b0 = Math.floor(fBin) % angularBins;
      const b1 = (b0 + 1) % angularBins;
      const frac = fBin - Math.floor(fBin);
      const rayVal = (rays[b0] ?? 0) * (1 - frac) + (rays[b1] ?? 0) * frac;
      const rNorm = Math.hypot(dx, dy) / half;
      const lathe = Math.sin(rNorm * Math.PI * 48) * 7;
      const v = Math.max(0, Math.min(255, Math.round(136 + rayVal * 0.75 + lathe + (rng() - 0.5) * 8)));
      const idx = (y * size + x) * 4;
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }
  return data;
}

/** Deterministic radial sunray texture (clamp-to-edge centered on UV 0.5, 0.5). */
export function createRadialBrushedTexture(seed = 303, size = 512): THREE.DataTexture {
  const tex = new THREE.DataTexture(createRadialBrushedData(seed, size), size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/** Deterministic bead-blasted anodized micro-stipple RGBA buffer. */
export function createBeadBlastedData(seed = 202, size = 512): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  const rng = createRng(seed);
  for (let i = 0; i < size * size; i++) {
    const n = (rng() + rng() + rng() - 1.5) * 24;
    const v = Math.max(0, Math.min(255, Math.round(142 + n)));
    const p = i * 4;
    data[p] = v;
    data[p + 1] = v;
    data[p + 2] = v;
    data[p + 3] = 255;
  }
  return data;
}

/** Deterministic bead-blasted anodized micro-stipple texture for roughnessMap and normal derivation. */
export function createBeadBlastedTexture(seed = 202, size = 512): THREE.DataTexture {
  return makeRepeatDataTexture(createBeadBlastedData(seed, size), size, 4, 4);
}

/** Deterministic Côtes de Genève (Geneva stripes) horology bridge finish RGBA buffer. */
export function createGenevaStripesData(seed = 404, size = 512, stripes = 10): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  const rng = createRng(seed);
  for (let y = 0; y < size; y++) {
    const uStripe = ((y / size) * stripes) % 1;
    const rib = Math.pow(Math.sin(uStripe * Math.PI), 0.65) * 44;
    for (let x = 0; x < size; x++) {
      const fineArc = Math.sin((x / size) * Math.PI * 24 + uStripe * 4.2) * 5;
      const grain = (rng() - 0.5) * 8;
      const v = Math.max(0, Math.min(255, Math.round(112 + rib + fineArc + grain)));
      const idx = (y * size + x) * 4;
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }
  return data;
}

function createSoftScrimTexture(colorHex: number, peakIntensity: number, edgePower = 2.2, size = 128): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const base = new THREE.Color(colorHex);
  for (let y = 0; y < size; y++) {
    const ny = (y / (size - 1)) * 2 - 1;
    for (let x = 0; x < size; x++) {
      const nx = (x / (size - 1)) * 2 - 1;
      const d = Math.min(1, Math.pow(Math.abs(nx), 2.4) + Math.pow(Math.abs(ny), 2.4));
      const falloff = Math.pow(Math.max(0, 1 - d), edgePower);
      const idx = (y * size + x) * 4;
      data[idx] = Math.min(255, Math.round(base.r * 255));
      data[idx + 1] = Math.min(255, Math.round(base.g * 255));
      data[idx + 2] = Math.min(255, Math.round(base.b * 255));
      data[idx + 3] = Math.min(255, Math.round(falloff * Math.min(1, peakIntensity / 10) * 255));
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export interface StudioEnvironmentOptions {
  background?: THREE.ColorRepresentation;
  blurSigma?: number;
}

/**
 * Bake a high-contrast photographic studio HDRI environment via PMREMGenerator:
 * diffused cosine-falloff softbox scrims separated by matte-black negative-fill flags (for crisp dark-to-specular
 * luxury horology & CNC metal contrast) and a neutral slate studio floor bounce (zero colored underside bleed).
 */
export function buildStudioEnvironment(renderer: THREE.WebGLRenderer, options: StudioEnvironmentOptions = {}): THREE.WebGLRenderTarget {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(options.background ?? 0x050608);

  const scrimTextures: THREE.DataTexture[] = [];
  const scrim = (
    w: number,
    h: number,
    colorHex: number,
    intensity: number,
    pos: [number, number, number],
    look: [number, number, number] = [0, 0, 0],
    edgePower = 1.85,
  ) => {
    const tex = createSoftScrimTexture(colorHex, 10, edgePower, 128);
    scrimTextures.push(tex);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex).multiplyScalar(intensity),
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.lookAt(look[0], look[1], look[2]);
    envScene.add(mesh);
  };

  const negativeFlag = (w: number, h: number, pos: [number, number, number], look: [number, number, number] = [0, 0, 0]) => {
    const mat = new THREE.MeshBasicMaterial({ color: 0x010203, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.lookAt(look[0], look[1], look[2]);
    envScene.add(mesh);
  };

  // Primary overhead diffused silk softbox + secondary front-top fill strip
  scrim(16, 10, 0xf6f8ff, 4.2, [-1.5, 11.5, 2.2], [0, 0, 0], 1.65);
  scrim(24, 1.4, 0xffffff, 6.8, [0, 4.6, -11.5], [0, 0, 0], 1.5);
  scrim(22, 1.1, 0xfaf6f0, 4.8, [0, 3.2, 12.0], [0, 0, 0], 1.7);

  // Warm tungsten key-kicker scrim (left) & cool ice rim scrim (right)
  scrim(7.5, 13, 0xffcfa0, 4.1, [-12, 3.8, 2.5], [0, 0, 0], 1.8);
  scrim(7.0, 13, 0xc4dbff, 3.9, [12, 3.4, -2.5], [0, 0, 0], 1.8);

  // Black negative-fill flags between softboxes to carve razor-sharp dark specular transitions on metals
  negativeFlag(6.5, 12, [-8.5, 2.0, 8.5]);
  negativeFlag(6.5, 12, [8.5, 2.0, 8.5]);
  negativeFlag(9.0, 8.0, [0, 8.5, -8.5]);

  // Neutral dark slate floor bounce — eliminates artificial orange/red underside color contamination
  scrim(18, 18, 0x1b202b, 0.55, [0, -10.5, 0], [0, 0, 0], 1.4);

  const rt = pmrem.fromScene(envScene, options.blurSigma ?? 0.028);
  envScene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose();
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
  for (const t of scrimTextures) t.dispose();
  pmrem.dispose();
  return rt;
}

export interface StudioMaterialOptions {
  seed?: number;
  textureSize?: number;
  accentColor?: THREE.ColorRepresentation;
}

export interface StudioMaterials {
  obsidian: THREE.MeshPhysicalMaterial;
  darkSlate: THREE.MeshPhysicalMaterial;
  titanium: THREE.MeshPhysicalMaterial;
  brushedSteel: THREE.MeshPhysicalMaterial;
  chrome: THREE.MeshPhysicalMaterial;
  roseGold: THREE.MeshPhysicalMaterial;
  brass: THREE.MeshPhysicalMaterial;
  bluedSteel: THREE.MeshPhysicalMaterial;
  rubyJewel: THREE.MeshPhysicalMaterial;
  arGlass: THREE.MeshPhysicalMaterial;
  vermilionLacquer: THREE.MeshPhysicalMaterial;
  opticalGlass: THREE.MeshPhysicalMaterial;
  frostedGlass: THREE.MeshPhysicalMaterial;
  moltenEmissive: THREE.MeshStandardMaterial;
  platinumEmissive: THREE.MeshStandardMaterial;
  amberEmissive: THREE.MeshStandardMaterial;
  brushedMap: THREE.DataTexture;
  brushedNormalMap: THREE.DataTexture;
  beadMap: THREE.DataTexture;
  beadNormalMap: THREE.DataTexture;
  radialMap: THREE.DataTexture;
  radialNormalMap: THREE.DataTexture;
  genevaMap: THREE.DataTexture;
  genevaNormalMap: THREE.DataTexture;
  dispose(): void;
}

/**
 * Curated industrial, horology, and optical PBR material presets backed by deterministic height + tangent-space
 * Sobel normal maps and physical anisotropy (no plastic clearcoat varnish on bare metals).
 */
export function createStudioMaterials(options: StudioMaterialOptions = {}): StudioMaterials {
  const baseSeed = options.seed ?? 101;
  const size = options.textureSize ?? 512;

  const brushedData = createBrushedMetalData(baseSeed, size);
  const brushedMap = makeRepeatDataTexture(brushedData, size, 3, 3);
  const brushedNormalMap = makeRepeatDataTexture(createNormalMapDataFromHeight(brushedData, size, 2.2), size, 3, 3);

  const beadData = createBeadBlastedData(baseSeed + 101, size);
  const beadMap = makeRepeatDataTexture(beadData, size, 4, 4);
  const beadNormalMap = makeRepeatDataTexture(createNormalMapDataFromHeight(beadData, size, 1.9), size, 4, 4);

  const radialData = createRadialBrushedData(baseSeed + 202, size);
  const radialMap = new THREE.DataTexture(radialData, size, size, THREE.RGBAFormat);
  radialMap.wrapS = THREE.ClampToEdgeWrapping;
  radialMap.wrapT = THREE.ClampToEdgeWrapping;
  radialMap.minFilter = THREE.LinearMipmapLinearFilter;
  radialMap.magFilter = THREE.LinearFilter;
  radialMap.generateMipmaps = true;
  radialMap.needsUpdate = true;

  const radialNormalMap = new THREE.DataTexture(createNormalMapDataFromHeight(radialData, size, 2.0), size, size, THREE.RGBAFormat);
  radialNormalMap.wrapS = THREE.ClampToEdgeWrapping;
  radialNormalMap.wrapT = THREE.ClampToEdgeWrapping;
  radialNormalMap.minFilter = THREE.LinearMipmapLinearFilter;
  radialNormalMap.magFilter = THREE.LinearFilter;
  radialNormalMap.generateMipmaps = true;
  radialNormalMap.needsUpdate = true;

  const genevaData = createGenevaStripesData(baseSeed + 303, size, 10);
  const genevaMap = makeRepeatDataTexture(genevaData, size, 2, 2);
  const genevaNormalMap = makeRepeatDataTexture(createNormalMapDataFromHeight(genevaData, size, 2.5), size, 2, 2);

  // Matte bead-blasted black anodized aluminum / DLC titanium (zero plastic clearcoat)
  const obsidian = new THREE.MeshPhysicalMaterial({
    color: 0x171a21,
    metalness: 0.88,
    roughness: 0.34,
    roughnessMap: beadMap,
    normalMap: beadNormalMap,
    normalScale: new THREE.Vector2(0.26, 0.26),
    envMapIntensity: 1.15,
  });

  const darkSlate = new THREE.MeshPhysicalMaterial({
    color: 0x07080b,
    metalness: 0.25,
    roughness: 0.68,
    roughnessMap: beadMap,
    normalMap: beadNormalMap,
    normalScale: new THREE.Vector2(0.18, 0.18),
    envMapIntensity: 0.32,
  });

  // Satin-brushed Grade-5 Titanium with true physical anisotropy
  const titanium = new THREE.MeshPhysicalMaterial({
    color: 0xbec4cf,
    metalness: 1.0,
    roughness: 0.23,
    roughnessMap: brushedMap,
    normalMap: brushedNormalMap,
    normalScale: new THREE.Vector2(0.32, 0.32),
    anisotropy: 0.78,
    anisotropyRotation: 0,
    envMapIntensity: 1.25,
  });

  // Fine satin 316L / movement bridge steel
  const brushedSteel = new THREE.MeshPhysicalMaterial({
    color: 0xdadfe8,
    metalness: 1.0,
    roughness: 0.18,
    roughnessMap: brushedMap,
    normalMap: brushedNormalMap,
    normalScale: new THREE.Vector2(0.24, 0.24),
    anisotropy: 0.84,
    envMapIntensity: 1.32,
  });

  // Mirror-polished bevels (anglage), arbors, and chrome hardware
  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xf0f4fa,
    metalness: 1.0,
    roughness: 0.045,
    envMapIntensity: 1.42,
  });

  // 18K 5N Horology Rose Gold
  const roseGold = new THREE.MeshPhysicalMaterial({
    color: 0xe6a574,
    metalness: 1.0,
    roughness: 0.17,
    roughnessMap: brushedMap,
    normalMap: brushedNormalMap,
    normalScale: new THREE.Vector2(0.2, 0.2),
    anisotropy: 0.68,
    envMapIntensity: 1.35,
  });

  // Precision instrument / gear-train Glucydur brass
  const brass = new THREE.MeshPhysicalMaterial({
    color: 0xdcb668,
    metalness: 1.0,
    roughness: 0.2,
    roughnessMap: radialMap,
    normalMap: radialNormalMap,
    normalScale: new THREE.Vector2(0.22, 0.22),
    anisotropy: 0.62,
    envMapIntensity: 1.3,
  });

  // Heat-blued watchmaker screws, hairsprings, and seconds hands
  const bluedSteel = new THREE.MeshPhysicalMaterial({
    color: 0x18489c,
    metalness: 0.96,
    roughness: 0.1,
    iridescence: 0.26,
    iridescenceIOR: 1.45,
    envMapIntensity: 1.38,
  });

  // Synthetic corundum (ruby jewel bearing, IOR 1.77)
  const rubyJewel = new THREE.MeshPhysicalMaterial({
    color: 0xd9143c,
    metalness: 0.0,
    roughness: 0.05,
    transmission: 0.72,
    transparent: true,
    opacity: 1,
    ior: 1.77,
    thickness: 0.16,
    attenuationColor: new THREE.Color(0x8c001a),
    attenuationDistance: 0.24,
    emissive: 0x2e0009,
    emissiveIntensity: 0.32,
    envMapIntensity: 1.4,
  });

  // Double anti-reflective coated sapphire / optical singlet (100% crisp underlying mechanics, subtle cyan-emerald AR rim glint)
  const arGlass = new THREE.MeshPhysicalMaterial({
    color: 0xeefaff,
    metalness: 0.0,
    roughness: 0.018,
    transparent: true,
    opacity: 0.045,
    ior: 1.77,
    reflectivity: 0.18,
    specularIntensity: 0.32,
    specularColor: new THREE.Color(0x7ef2d4),
    iridescence: 0.35,
    iridescenceIOR: 1.38,
    iridescenceThicknessRange: [180, 420],
    envMapIntensity: 0.34,
    depthWrite: false,
  });

  // Anodized / industrial satin-lacquered vermilion accent
  const vermilionLacquer = new THREE.MeshPhysicalMaterial({
    color: options.accentColor ?? 0xd93b20,
    metalness: 0.58,
    roughness: 0.24,
    roughnessMap: beadMap,
    normalMap: beadNormalMap,
    normalScale: new THREE.Vector2(0.16, 0.16),
    clearcoat: 0.35,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.18,
  });

  const opticalGlass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.92,
    opacity: 1,
    transparent: true,
    ior: 1.54,
    thickness: 0.42,
    roughness: 0.035,
    clearcoat: 0.65,
    clearcoatRoughness: 0.03,
    iridescence: 0.48,
    iridescenceIOR: 1.36,
    attenuationColor: new THREE.Color(0xdcf2ff),
    attenuationDistance: 3.6,
    envMapIntensity: 1.2,
  });

  const frostedGlass = new THREE.MeshPhysicalMaterial({
    color: 0xdce2ee,
    transmission: 0.78,
    opacity: 1,
    transparent: true,
    ior: 1.48,
    thickness: 0.65,
    roughness: 0.28,
    clearcoat: 0.6,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.95,
  });

  const moltenEmissive = new THREE.MeshStandardMaterial({
    color: 0xff7642,
    emissive: 0xff491a,
    emissiveIntensity: 1.85,
    roughness: 0.22,
    metalness: 0.1,
  });
  const platinumEmissive = new THREE.MeshStandardMaterial({
    color: 0xeef4ff,
    emissive: 0xc8deff,
    emissiveIntensity: 1.42,
    roughness: 0.18,
    metalness: 0.1,
  });
  const amberEmissive = new THREE.MeshStandardMaterial({
    color: 0xffb86b,
    emissive: 0xff8c2b,
    emissiveIntensity: 1.55,
    roughness: 0.22,
    metalness: 0.1,
  });

  const list = [
    obsidian,
    darkSlate,
    titanium,
    brushedSteel,
    chrome,
    roseGold,
    brass,
    bluedSteel,
    rubyJewel,
    arGlass,
    vermilionLacquer,
    opticalGlass,
    frostedGlass,
    moltenEmissive,
    platinumEmissive,
    amberEmissive,
  ];
  const textures = [
    brushedMap,
    brushedNormalMap,
    beadMap,
    beadNormalMap,
    radialMap,
    radialNormalMap,
    genevaMap,
    genevaNormalMap,
  ];

  return {
    obsidian,
    darkSlate,
    titanium,
    brushedSteel,
    chrome,
    roseGold,
    brass,
    bluedSteel,
    rubyJewel,
    arGlass,
    vermilionLacquer,
    opticalGlass,
    frostedGlass,
    moltenEmissive,
    platinumEmissive,
    amberEmissive,
    brushedMap,
    brushedNormalMap,
    beadMap,
    beadNormalMap,
    radialMap,
    radialNormalMap,
    genevaMap,
    genevaNormalMap,
    dispose() {
      for (const mat of list) mat.dispose();
      for (const tex of textures) tex.dispose();
    },
  };
}

export interface StudioBackdropOptions {
  radius?: number;
  y?: number;
  color?: THREE.ColorRepresentation;
  seed?: number;
  receiveShadow?: boolean;
}

/**
 * Seamless radial-falloff studio cyclorama floor disc: catches crisp contact shadows directly beneath hardware
 * and melts smoothly into `scene.background` with zero straight-line table horizon cut.
 */
export function createStudioBackdrop(options: StudioBackdropOptions = {}) {
  const radius = options.radius ?? 9.5;
  const size = 256;
  const alphaData = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const ny = (y / (size - 1)) * 2 - 1;
    for (let x = 0; x < size; x++) {
      const nx = (x / (size - 1)) * 2 - 1;
      const r = Math.hypot(nx, ny);
      const a = r >= 1 ? 0 : Math.pow(1 - r * r, 2.2);
      const v = Math.round(a * 255);
      const idx = (y * size + x) * 4;
      alphaData[idx] = 255;
      alphaData[idx + 1] = 255;
      alphaData[idx + 2] = 255;
      alphaData[idx + 3] = v;
    }
  }
  const alphaTex = new THREE.DataTexture(alphaData, size, size, THREE.RGBAFormat);
  alphaTex.minFilter = THREE.LinearFilter;
  alphaTex.magFilter = THREE.LinearFilter;
  alphaTex.needsUpdate = true;

  const bead = createBeadBlastedData(options.seed ?? 505, 256);
  const roughTex = makeRepeatDataTexture(bead, 256, 28, 28);
  const normTex = makeRepeatDataTexture(createNormalMapDataFromHeight(bead, 256, 0.9), 256, 28, 28);

  const material = new THREE.MeshPhysicalMaterial({
    color: options.color ?? 0x0c0e13,
    metalness: 0.14,
    roughness: 0.82,
    roughnessMap: roughTex,
    normalMap: normTex,
    normalScale: new THREE.Vector2(0.035, 0.035),
    map: alphaTex,
    transparent: true,
    envMapIntensity: 0.28,
    depthWrite: false,
  });

  const geometry = new THREE.CircleGeometry(radius, 96);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = options.y ?? -0.8;
  mesh.receiveShadow = options.receiveShadow ?? true;
  mesh.renderOrder = -10;

  return {
    mesh,
    dispose() {
      geometry.dispose();
      material.dispose();
      alphaTex.dispose();
      roughTex.dispose();
      normTex.dispose();
    },
  };
}

// ============================================================================
// Precision CAD, Horology & Optical Mechanical Primitives
// ============================================================================

export interface InvoluteGearOptions {
  teeth: number;
  pitchRadius: number;
  addendum?: number;
  dedendum?: number;
  pressureAngleDeg?: number;
  thickness?: number;
  boreRadius?: number;
  spokes?: number;
  rimWidth?: number;
  spokeWidth?: number;
  bevel?: number;
}

/**
 * True involute-profile spur gear or pinion with optional spoked crossings (`spokes >= 3`) and chamfered bevels.
 * Adjacent gears with `pitchRadius` $R_1, R_2$ mesh cleanly at center distance $d = R_1 + R_2$ with ratio $-Z_1 / Z_2$.
 */
export function createInvoluteGearGeometry(options: InvoluteGearOptions): THREE.ExtrudeGeometry {
  const Z = Math.max(6, Math.round(options.teeth));
  const Rp = options.pitchRadius;
  const mod = (2 * Rp) / Z;
  const add = options.addendum ?? mod * 0.92;
  const ded = options.dedendum ?? mod * 1.12;
  const Rtip = Rp + add;
  const Rroot = Math.max(mod * 0.8, Rp - ded);
  const alpha = ((options.pressureAngleDeg ?? 20) * Math.PI) / 180;
  const Rbase = Rp * Math.cos(alpha);
  const depth = options.thickness ?? 0.04;
  const bevel = options.bevel ?? Math.min(0.005, depth * 0.14, mod * 0.12);

  const inv = (phi: number) => Math.tan(phi) - phi;
  const phiPitch = Math.acos(Math.min(1, Rbase / Rp));
  const halfToothPitchAngle = Math.PI / (2 * Z) + inv(phiPitch);

  const involuteAngleAtR = (r: number) => {
    if (r <= Rbase) return 0;
    const phi = Math.acos(Math.min(1, Rbase / r));
    return inv(phi);
  };

  const shape = new THREE.Shape();
  const pitchStep = (Math.PI * 2) / Z;
  const flankSamples = 4;

  for (let i = 0; i < Z; i++) {
    const centerA = i * pitchStep;
    const aRootStart = centerA - pitchStep * 0.5;
    const aLeftBase = centerA - halfToothPitchAngle;

    if (i === 0) shape.moveTo(Math.cos(aRootStart) * Rroot, Math.sin(aRootStart) * Rroot);
    else shape.lineTo(Math.cos(aRootStart) * Rroot, Math.sin(aRootStart) * Rroot);

    shape.lineTo(Math.cos(aLeftBase) * Rroot, Math.sin(aLeftBase) * Rroot);

    for (let s = 1; s <= flankSamples; s++) {
      const r = Rroot + ((Rtip - Rroot) * s) / flankSamples;
      const a = centerA - (halfToothPitchAngle - involuteAngleAtR(r));
      shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    for (let s = flankSamples; s >= 1; s--) {
      const r = Rroot + ((Rtip - Rroot) * s) / flankSamples;
      const a = centerA + (halfToothPitchAngle - involuteAngleAtR(r));
      shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }

    const aRightBase = centerA + halfToothPitchAngle;
    shape.lineTo(Math.cos(aRightBase) * Rroot, Math.sin(aRightBase) * Rroot);
  }
  shape.closePath();

  const boreR = options.boreRadius ?? Rp * 0.14;
  if (boreR > 0.001) {
    const bore = new THREE.Path();
    bore.absarc(0, 0, boreR, 0, Math.PI * 2, true);
    shape.holes.push(bore);
  }

  const spokes = Math.round(options.spokes ?? 0);
  const rimW = options.rimWidth ?? Math.max(mod * 1.4, (Rroot - boreR) * 0.18);
  const hubR = Math.max(boreR * 1.85, Rp * 0.24);
  const winOuterR = Rroot - rimW;
  const spokeHalfW = (options.spokeWidth ?? Math.max(mod * 1.1, Rp * 0.09)) * 0.5;

  if (spokes >= 3 && winOuterR > hubR + mod * 0.8) {
    const sectorStep = (Math.PI * 2) / spokes;
    for (let s = 0; s < spokes; s++) {
      const a0 = s * sectorStep + Math.asin(Math.min(0.45, spokeHalfW / hubR));
      const a1 = (s + 1) * sectorStep - Math.asin(Math.min(0.45, spokeHalfW / hubR));
      const b0 = s * sectorStep + Math.asin(Math.min(0.45, spokeHalfW / winOuterR));
      const b1 = (s + 1) * sectorStep - Math.asin(Math.min(0.45, spokeHalfW / winOuterR));
      if (a1 <= a0 + 0.08 || b1 <= b0 + 0.08) continue;

      const hole = new THREE.Path();
      // CW winding for hole (opposite to CCW outer gear contour): inner a0 -> a1, outward to b1, outer b1 -> b0
      hole.moveTo(Math.cos(a0) * hubR, Math.sin(a0) * hubR);
      hole.absarc(0, 0, hubR, a0, a1, false);
      hole.lineTo(Math.cos(b1) * winOuterR, Math.sin(b1) * winOuterR);
      hole.absarc(0, 0, winOuterR, b1, b0, true);
      hole.closePath();
      shape.holes.push(hole);
    }
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.85,
    bevelSegments: 2,
    curveSegments: 18,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -depth * 0.5, 0);
  return geo;
}

export interface EscapeWheelOptions {
  teeth?: number;
  outerRadius: number;
  thickness?: number;
  boreRadius?: number;
  spokes?: number;
}

/** Authentic raked club-tooth Swiss lever horology escape wheel (`15` slender locking/impulse teeth + spoked hub). */
export function createEscapeWheelGeometry(options: EscapeWheelOptions): THREE.ExtrudeGeometry {
  const Z = Math.max(8, Math.round(options.teeth ?? 15));
  const Rout = options.outerRadius;
  const Rrim = Rout * 0.72;
  const depth = options.thickness ?? 0.032;
  const step = (Math.PI * 2) / Z;
  const rake = step * 0.36;

  const shape = new THREE.Shape();
  for (let i = 0; i < Z; i++) {
    const a0 = i * step;
    const pRootA: [number, number] = [Math.cos(a0) * Rrim, Math.sin(a0) * Rrim];
    const pRootB: [number, number] = [Math.cos(a0 + step * 0.16) * Rrim, Math.sin(a0 + step * 0.16) * Rrim];
    const pTipLead: [number, number] = [Math.cos(a0 + rake) * Rout, Math.sin(a0 + rake) * Rout];
    const pImpulse: [number, number] = [
      Math.cos(a0 + rake + step * 0.13) * (Rout * 0.965),
      Math.sin(a0 + rake + step * 0.13) * (Rout * 0.965),
    ];
    const pBackRoot: [number, number] = [Math.cos(a0 + step * 0.34) * Rrim, Math.sin(a0 + step * 0.34) * Rrim];

    if (i === 0) shape.moveTo(pRootA[0], pRootA[1]);
    else shape.lineTo(pRootA[0], pRootA[1]);
    shape.lineTo(pRootB[0], pRootB[1]);
    shape.lineTo(pTipLead[0], pTipLead[1]);
    shape.lineTo(pImpulse[0], pImpulse[1]);
    shape.lineTo(pBackRoot[0], pBackRoot[1]);
  }
  shape.closePath();

  const boreR = options.boreRadius ?? Rout * 0.14;
  const bore = new THREE.Path();
  bore.absarc(0, 0, boreR, 0, Math.PI * 2, true);
  shape.holes.push(bore);

  const spokes = Math.round(options.spokes ?? 3);
  const hubR = boreR * 1.9;
  const winOuter = Rrim * 0.86;
  if (spokes >= 3 && winOuter > hubR * 1.25) {
    const sStep = (Math.PI * 2) / spokes;
    for (let s = 0; s < spokes; s++) {
      const a0 = s * sStep + 0.18;
      const a1 = (s + 1) * sStep - 0.18;
      const hole = new THREE.Path();
      hole.moveTo(Math.cos(a0) * hubR, Math.sin(a0) * hubR);
      hole.absarc(0, 0, hubR, a0, a1, false);
      hole.lineTo(Math.cos(a1) * winOuter, Math.sin(a1) * winOuter);
      hole.absarc(0, 0, winOuter, a1, a0, true);
      hole.closePath();
      shape.holes.push(hole);
    }
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.12,
    bevelSize: depth * 0.1,
    bevelSegments: 2,
    curveSegments: 16,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -depth * 0.5, 0);
  return geo;
}

export interface SpiralSpringOptions {
  turns?: number;
  innerRadius: number;
  outerRadius: number;
  ribbonThickness?: number;
  ribbonHeight?: number;
  segmentsPerTurn?: number;
}

/** Analytical multi-turn concentric Archimedean ribbon hairspring (`BufferGeometry` with clean facet normals). */
export function createSpiralSpringGeometry(options: SpiralSpringOptions): THREE.BufferGeometry {
  const turns = Math.max(1.5, options.turns ?? 5.5);
  const rIn = options.innerRadius;
  const rOut = options.outerRadius;
  const halfW = (options.ribbonThickness ?? (rOut - rIn) / (turns * 4.5)) * 0.5;
  const halfH = (options.ribbonHeight ?? halfW * 3.2) * 0.5;
  const steps = Math.max(48, Math.round(turns * (options.segmentsPerTurn ?? 48)));

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * turns * Math.PI * 2;
    const r = rIn + (rOut - rIn) * t;
    const nx = Math.cos(theta);
    const nz = Math.sin(theta);

    // 4 corners of rectangular ribbon cross-section duplicated per face for crisp ribbon edges
    // Ring vertices: 0=innerBottom, 1=outerBottom, 2=outerTop, 3=innerTop
    const r0 = r - halfW;
    const r1 = r + halfW;
    positions.push(
      nx * r0, -halfH, nz * r0,
      nx * r1, -halfH, nz * r1,
      nx * r1, halfH, nz * r1,
      nx * r0, halfH, nz * r0,
    );
    uvs.push(t, 0, t, 0.25, t, 0.5, t, 0.75);
  }

  const pushQuad = (a: number, b: number, c: number, d: number) => {
    indices.push(a, b, c, a, c, d);
  };

  for (let i = 0; i < steps; i++) {
    const b0 = i * 4;
    const b1 = (i + 1) * 4;
    pushQuad(b0 + 3, b0 + 2, b1 + 2, b1 + 3); // top
    pushQuad(b0 + 0, b1 + 0, b1 + 1, b0 + 1); // bottom
    pushQuad(b0 + 1, b1 + 1, b1 + 2, b0 + 2); // outer wall
    pushQuad(b0 + 0, b0 + 3, b1 + 3, b1 + 0); // inner wall
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  const nonIndexed = geo.toNonIndexed();
  geo.dispose();
  nonIndexed.computeVertexNormals();
  return nonIndexed;
}

export interface KnurledCylinderOptions {
  radius: number;
  height: number;
  grooves?: number;
  grooveDepth?: number;
  bevel?: number;
}

/** Precision CNC micro-fluted rotary encoder / watch crown cylinder with chamfered top & bottom bevels. */
export function createKnurledCylinderGeometry(options: KnurledCylinderOptions): THREE.ExtrudeGeometry {
  const R = options.radius;
  const H = options.height;
  const grooves = Math.max(16, Math.round(options.grooves ?? 64));
  const depth = options.grooveDepth ?? R * 0.042;
  const bevel = options.bevel ?? Math.min(R * 0.08, H * 0.12);
  const samples = grooves * 4;

  const shape = new THREE.Shape();
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    const r = R - depth * 0.5 + Math.cos(a * grooves) * (depth * 0.5);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.005, H - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.85,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -(H - bevel * 2) * 0.5, 0);
  return geo;
}

export interface IrisBladeOptions {
  innerRadius: number;
  outerRadius: number;
  sweepAngle?: number;
  thickness?: number;
}

/** Crescent-arc mechanical camera aperture iris blade that tiles cleanly into 9- to 13-blade lens diaphragms. */
export function createIrisBladeGeometry(options: IrisBladeOptions): THREE.ExtrudeGeometry {
  const rIn = options.innerRadius;
  const rOut = options.outerRadius;
  const sweep = options.sweepAngle ?? Math.PI * 0.58;
  const depth = options.thickness ?? 0.008;
  const segs = 28;

  const shape = new THREE.Shape();
  // Pivot is placed at (0, 0) so rotating blade.rotation.z or blade.rotation.y opens/closes the aperture cleanly!
  // Outer arc from (0, 0) curving along circle of radius rOut
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * sweep;
    const x = Math.cos(a) * rOut - rOut;
    const y = Math.sin(a) * rOut;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  // Inner concave cutting edge returning back to pivot (0, 0)
  const chordX = Math.cos(sweep) * rOut - rOut;
  const chordY = Math.sin(sweep) * rOut;
  const midX = chordX * 0.48 + (rOut - rIn) * 0.28;
  const midY = chordY * 0.52 - (rOut - rIn) * 0.16;
  shape.quadraticCurveTo(midX, midY, 0, 0);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.18,
    bevelSize: depth * 0.18,
    bevelSegments: 1,
    curveSegments: 20,
  });
  return geo;
}

export interface OpticalLensOptions {
  radius: number;
  edgeThickness: number;
  frontSag?: number;
  backSag?: number;
  segments?: number;
}

/** Axisymmetric spherical/meniscus optical lens element (`LatheGeometry` around Z optical axis or Y axis). */
export function createOpticalLensGeometry(options: OpticalLensOptions): THREE.LatheGeometry {
  const R = options.radius;
  const edgeT = options.edgeThickness;
  const frontSag = options.frontSag ?? R * 0.24;
  const backSag = options.backSag ?? R * 0.12;
  const profileSamples = 24;
  const pts: THREE.Vector2[] = [];

  // Front optical surface from center (0, +centerFront) to rim (R, +edgeT/2)
  for (let i = 0; i <= profileSamples; i++) {
    const u = i / profileSamples;
    const r = u * R;
    const sag = frontSag * (1 - u * u);
    pts.push(new THREE.Vector2(r, edgeT * 0.5 + sag));
  }
  // Ground cylindrical rim edge
  pts.push(new THREE.Vector2(R, -edgeT * 0.5));
  // Rear optical surface from rim (R, -edgeT/2) back to center (0, -edgeT/2 - backSag)
  for (let i = profileSamples - 1; i >= 0; i--) {
    const u = i / profileSamples;
    const r = u * R;
    const sag = backSag * (1 - u * u);
    pts.push(new THREE.Vector2(r, -edgeT * 0.5 - sag));
  }

  return new THREE.LatheGeometry(pts, options.segments ?? 72);
}

/** Optical cinema post-FX shader: radial chromatic dispersion, S-curve obsidian contrast, vignette & 35mm fine grain. */
export const CinemaOpticsShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1920, 1080) },
    uChroma: { value: 0.0011 },
    uVignette: { value: 0.34 },
    uGrain: { value: 0.018 },
    uFrame: { value: 0.0 },
    uFlash: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uChroma;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uFrame;
    uniform float uFlash;
    varying vec2 vUv;

    float hash13(vec3 p3) {
      p3 = fract(p3 * 0.1031);
      p3 += dot(p3, p3.zyx + 31.32);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 centered = vUv - 0.5;
      float r2 = dot(centered, centered);
      vec2 shift = centered * uChroma * (0.35 + r2 * 3.2);

      float r = texture2D(tDiffuse, clamp(vUv + shift, 0.001, 0.999)).r;
      vec4 centerSample = texture2D(tDiffuse, vUv);
      float g = centerSample.g;
      float b = texture2D(tDiffuse, clamp(vUv - shift, 0.001, 0.999)).b;
      vec3 col = vec3(r, g, b);

      col = mix(col, smoothstep(0.0, 1.0, col), 0.10);
      col += vec3(1.0, 0.94, 0.88) * uFlash;

      float vig = 1.0 - smoothstep(0.18, 0.92, r2 * 1.65) * uVignette;
      col *= vig;

      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      float n1 = hash13(vec3(floor(vUv * uResolution), mod(uFrame, 1024.0) * 1.37));
      float n2 = hash13(vec3(floor(vUv * uResolution * 0.5), mod(uFrame, 1024.0) * 2.91 + 17.0));
      float grain = ((n1 * 0.65 + n2 * 0.35) - 0.5) * 2.0;
      float grainWeight = mix(0.65, 1.0, smoothstep(0.0, 0.25, luma)) * (1.0 - smoothstep(0.75, 1.0, luma) * 0.55);
      col += grain * uGrain * grainWeight;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), centerSample.a);
    }
  `,
};

export interface StudioRigOptions {
  canvas?: HTMLCanvasElement;
  alpha?: boolean;
  width?: number;
  height?: number;
  fov?: number;
  background?: THREE.ColorRepresentation;
  fogDensity?: number;
  exposure?: number;
  envIntensity?: number;
  shadowBounds?: number;
  samples?: number;
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
  seed?: number;
  accentColor?: THREE.ColorRepresentation;
}

export interface StudioRenderParams {
  frame?: number;
  chroma?: number;
  flash?: number;
  vignette?: number;
  grain?: number;
  bloom?: number;
}

/**
 * Complete physical WebGL2 studio: diffused PMREM softbox + negative-fill reflections, tight micro-contact shadows,
 * anisotropic + normal-mapped PBR materials, and a 4x MSAA HalfFloat post-processing chain (Bloom + ACES + CinemaOptics).
 * Supports mounting directly onto a `<canvas>` inside a MotionFlux `Stage` HTML composition (`options.canvas`).
 */
export function createStudioRig(options: StudioRigOptions = {}) {
  const width = options.width ?? 1920;
  const height = options.height ?? 1080;
  const alpha = Boolean(options.alpha);
  const bloomStrength = options.bloomStrength ?? 0.16;
  const bloomRadius = options.bloomRadius ?? 0.45;
  const bloomThreshold = options.bloomThreshold ?? 1.08;
  const bg = options.background ?? 0x050608;
  const shadowBounds = options.shadowBounds ?? 3.2;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      ...(options.canvas ? { canvas: options.canvas } : {}),
      antialias: true,
      alpha,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
  } catch {
    renderer = new THREE.WebGLRenderer({
      ...(options.canvas ? { canvas: options.canvas } : {}),
      antialias: false,
      alpha,
      powerPreference: 'default',
      preserveDrawingBuffer: true,
    });
  }
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = options.exposure ?? 0.96;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (alpha) renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.background = alpha ? null : new THREE.Color(bg);
  const fogDensity = options.fogDensity ?? (alpha ? 0 : 0.042);
  if (fogDensity > 0 && !alpha) scene.fog = new THREE.FogExp2(bg, fogDensity);

  const camera = new THREE.PerspectiveCamera(options.fov ?? 32, width / height, 0.08, 80);

  const envRT = buildStudioEnvironment(renderer, { background: bg });
  scene.environment = envRT.texture;
  scene.environmentIntensity = options.envIntensity ?? 1.22;

  const keyLight = new THREE.DirectionalLight(0xf7f9ff, 1.32);
  keyLight.position.set(-3.8, 7.2, 4.6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 22;
  keyLight.shadow.camera.left = -shadowBounds;
  keyLight.shadow.camera.right = shadowBounds;
  keyLight.shadow.camera.top = shadowBounds;
  keyLight.shadow.camera.bottom = -shadowBounds;
  keyLight.shadow.bias = -0.00018;
  keyLight.shadow.normalBias = 0.006;
  keyLight.shadow.radius = 2.4;
  scene.add(keyLight);

  const warmRim = new THREE.DirectionalLight(0xffdfb8, 0.78);
  warmRim.position.set(5.2, 2.8, -3.6);
  scene.add(warmRim);

  const coolRim = new THREE.DirectionalLight(0xc4dcff, 0.68);
  coolRim.position.set(-4.8, 1.6, -4.2);
  scene.add(coolRim);

  const materials = createStudioMaterials({
    ...(options.seed !== undefined ? { seed: options.seed } : {}),
    ...(options.accentColor !== undefined ? { accentColor: options.accentColor } : {}),
  });

  const rt = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    samples: options.samples ?? 4,
  });
  const composer = new EffectComposer(renderer, rt);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), bloomStrength, bloomRadius, bloomThreshold);
  const outputPass = new OutputPass();
  const opticsPass = new ShaderPass(CinemaOpticsShader);
  (opticsPass.uniforms['uResolution']!.value as THREE.Vector2).set(width, height);

  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);
  composer.addPass(opticsPass);

  function render(params: StudioRenderParams = {}): void {
    bloomPass.strength = params.bloom ?? bloomStrength;
    opticsPass.uniforms['uFrame']!.value = params.frame ?? 0;
    opticsPass.uniforms['uChroma']!.value = params.chroma ?? 0.0011;
    opticsPass.uniforms['uFlash']!.value = params.flash ?? 0;
    opticsPass.uniforms['uVignette']!.value = params.vignette ?? 0.34;
    opticsPass.uniforms['uGrain']!.value = params.grain ?? 0.018;
    composer.render();
  }

  function resize(nextWidth: number, nextHeight: number): void {
    renderer.setSize(nextWidth, nextHeight);
    rt.setSize(nextWidth, nextHeight);
    composer.setSize(nextWidth, nextHeight);
    bloomPass.setSize(nextWidth, nextHeight);
    (opticsPass.uniforms['uResolution']!.value as THREE.Vector2).set(nextWidth, nextHeight);
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
  }

  function dispose(): void {
    composer.dispose();
    rt.dispose();
    envRT.dispose();
    materials.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return {
    renderer,
    scene,
    camera,
    keyLight,
    warmRim,
    coolRim,
    materials,
    brushedMap: materials.brushedMap,
    beadMap: materials.beadMap,
    composer,
    bloomPass,
    opticsPass,
    render,
    resize,
    dispose,
  };
}

export const createPhysicalStudio = createStudioRig;

/** Intersection of two [x, y, width, height] boxes, or null when disjoint. */
export function intersectBox(a: Bounds | null | undefined, b: Bounds): Bounds | null {
  if (!a) return null;
  const left = Math.max(a[0], b[0]);
  const top = Math.max(a[1], b[1]);
  const right = Math.min(a[0] + a[2], b[0] + b[2]);
  const bottom = Math.min(a[1] + a[3], b[1] + b[3]);
  return right > left && bottom > top ? [left, top, right - left, bottom - top] : null;
}

/** Smallest bounding box enclosing all non-empty boxes, or null when none are visible. */
export function unionBoxes(...boxes: (Bounds | null | undefined)[]): Bounds | null {
  const valid = boxes.filter((b): b is Bounds => Boolean(b && b[2] > 0 && b[3] > 0));
  if (!valid.length) return null;
  const left = Math.min(...valid.map((b) => b[0]));
  const top = Math.min(...valid.map((b) => b[1]));
  const right = Math.max(...valid.map((b) => b[0] + b[2]));
  const bottom = Math.max(...valid.map((b) => b[1] + b[3]));
  return [left, top, right - left, bottom - top];
}

const _projBox = new THREE.Box3();
const _projVec = new THREE.Vector3();

/**
 * Project a 3D Object3D's world bounding box (8 corners) through `camera` into `[x, y, width, height]` pixels,
 * clipped to `viewport` (defaults to `[0, 0, width, height]`). Returns `null` when empty, hidden, or behind camera.
 */
export function projectedBounds(
  object: THREE.Object3D,
  camera: THREE.Camera,
  width = 1920,
  height = 1080,
  viewport: Bounds = [0, 0, width, height],
): Bounds | null {
  if (!object.visible) return null;
  _projBox.setFromObject(object);
  if (_projBox.isEmpty()) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let inFront = 0;
  for (let i = 0; i < 8; i++) {
    _projVec
      .set(
        i & 1 ? _projBox.max.x : _projBox.min.x,
        i & 2 ? _projBox.max.y : _projBox.min.y,
        i & 4 ? _projBox.max.z : _projBox.min.z,
      )
      .project(camera);
    if (_projVec.z <= 1) inFront++;
    const sx = viewport[0] + (_projVec.x + 1) * 0.5 * viewport[2];
    const sy = viewport[1] + (1 - _projVec.y) * 0.5 * viewport[3];
    if (sx < minX) minX = sx;
    if (sx > maxX) maxX = sx;
    if (sy < minY) minY = sy;
    if (sy > maxY) maxY = sy;
  }
  if (inFront === 0) return null;
  return intersectBox([minX, minY, maxX - minX, maxY - minY], viewport);
}

export interface SmokedGlassOptions {
  topAlpha?: number;
  bottomAlpha?: number;
  borderAlpha?: number;
  shadowBlur?: number;
}

/** Draw a dark smoked-glass HUD panel with soft physical drop shadow and top-left specular bevel on Canvas 2D. */
export function drawSmokedGlass(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 14,
  options: SmokedGlassOptions = {},
): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.62)';
  ctx.shadowBlur = options.shadowBlur ?? 36;
  ctx.shadowOffsetY = 14;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  const bg = ctx.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, `rgba(24, 26, 33, ${options.topAlpha ?? 0.82})`);
  bg.addColorStop(1, `rgba(11, 12, 16, ${options.bottomAlpha ?? 0.88})`);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, radius);
  const rim = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
  rim.addColorStop(0, `rgba(255, 255, 255, ${options.borderAlpha ?? 0.28})`);
  rim.addColorStop(0.45, 'rgba(255, 255, 255, 0.09)');
  rim.addColorStop(1, 'rgba(255, 255, 255, 0.04)');
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

export interface HostSceneItem {
  id: string;
  visible?: boolean;
  opacity?: number;
  bounds?: Bounds | null;
  paint?: (ctx: CanvasRenderingContext2D) => void | Promise<void>;
}

export interface HostConfig {
  canvas: { width: number; height: number };
  fps: { numerator: number; denominator: number };
  durationFrames: number;
  parameters: Record<string, string | number | boolean>;
  objects?: unknown[];
}

export interface MountHostOptions {
  designWidth?: number;
  designHeight?: number;
}

/**
 * Deterministic `hostVersion: 2` browser harness with same-frame evaluation caching so `renderFrame(f)` followed by
 * `inspect(f)` computes 3D projections and atom states only once per frame.
 */
export async function mountHost<C extends HostConfig>(
  defaultConfig: C,
  createScene: (config: C) => Promise<{ objects(ctx: CanvasRenderingContext2D, frame: number): HostSceneItem[] | Promise<HostSceneItem[]>; dispose?(): void }>,
  options: MountHostOptions = {},
): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-motion-output]');
  if (!canvas) throw new Error('HOST_CONTRACT: canvas[data-motion-output] missing.');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('HOST_CONTRACT: 2D context unavailable.');
  const status = document.getElementById('status');
  const win = window as unknown as { motionFluxConfig?: C; motionFlux?: unknown };

  let config!: C;
  let scene: Awaited<ReturnType<typeof createScene>> | undefined;
  let raf = 0;
  let disposed = false;
  let cachedFrame = -1;
  let cachedItems: HostSceneItem[] | null = null;

  const designW = () => options.designWidth ?? config.canvas.width;
  const designH = () => options.designHeight ?? config.canvas.height;

  async function configure(next: C): Promise<void> {
    cancelAnimationFrame(raf);
    scene?.dispose?.();
    config = structuredClone(next);
    cachedFrame = -1;
    cachedItems = null;
    canvas!.width = config.canvas.width;
    canvas!.height = config.canvas.height;
    await document.fonts.ready;
    scene = await createScene(config);
  }

  const fit = () => {
    const dw = designW();
    const dh = designH();
    const scale = Math.min(canvas.width / dw, canvas.height / dh);
    return { scale, x: (canvas.width - dw * scale) / 2, y: (canvas.height - dh * scale) / 2 };
  };

  async function layout(frame: number): Promise<HostSceneItem[]> {
    if (disposed) throw new Error('HOST_DISPOSED');
    if (!Number.isInteger(frame) || frame < 0 || frame >= config.durationFrames) throw new Error('HOST_FRAME_RANGE');
    if (cachedFrame === frame && cachedItems) return cachedItems;
    ctx!.save();
    ctx!.resetTransform();
    try {
      cachedItems = await scene!.objects(ctx!, frame);
      cachedFrame = frame;
      return cachedItems;
    } finally {
      ctx!.restore();
    }
  }

  async function renderFrame(frame: number, background = true): Promise<void> {
    const items = await layout(frame);
    const { scale, x, y } = fit();
    ctx!.resetTransform();
    ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
    if (background && typeof config.parameters['background'] === 'string') {
      ctx!.fillStyle = config.parameters['background'];
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
    }
    ctx!.save();
    ctx!.translate(x, y);
    ctx!.scale(scale, scale);
    for (const item of items) {
      if (item.visible === false || item.opacity === 0 || !item.paint) continue;
      ctx!.save();
      ctx!.globalAlpha = item.opacity ?? 1;
      await item.paint(ctx!);
      ctx!.restore();
    }
    ctx!.restore();
  }

  async function inspect(frame: number): Promise<Record<string, { visible: boolean; bounds?: Bounds; opacity?: number }>> {
    const items = await layout(frame);
    const { scale, x, y } = fit();
    const states: Record<string, { visible: boolean; bounds?: Bounds; opacity?: number }> = {};
    for (const item of items) {
      const b = item.bounds;
      const visible = item.visible !== false && item.opacity !== 0 && (!b || (b[2] > 0 && b[3] > 0));
      states[item.id] = {
        visible,
        ...(visible && b ? { bounds: [x + b[0] * scale, y + b[1] * scale, b[2] * scale, b[3] * scale] } : {}),
        ...(item.opacity === undefined ? {} : { opacity: item.opacity }),
      };
    }
    return states;
  }

  function dispose(): void {
    cancelAnimationFrame(raf);
    scene?.dispose?.();
    cachedItems = null;
    disposed = true;
  }

  try {
    await configure(win.motionFluxConfig ?? defaultConfig);
    await renderFrame(0);
    win.motionFlux = { configure, renderFrame, inspect, dispose };
    if (status) status.textContent = 'Ready · click canvas to replay';
    const play = () => {
      cancelAnimationFrame(raf);
      const started = performance.now();
      const tick = async (now: number) => {
        const frame = Math.min(
          config.durationFrames - 1,
          Math.floor(((now - started) / 1000) * (config.fps.numerator / config.fps.denominator)),
        );
        await renderFrame(frame);
        if (frame < config.durationFrames - 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    canvas.addEventListener('click', play);
    if (!new URLSearchParams(location.search).has('motionfluxCapture')) play();
    window.addEventListener('pagehide', dispose, { once: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (status) status.textContent = `ERROR: ${message}`;
    throw err;
  }
}

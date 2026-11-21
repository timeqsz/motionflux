declare module 'three' {
  export type ColorRepresentation = number | string | Color;
  export const SRGBColorSpace: string;
  export const ACESFilmicToneMapping: number;
  export const PCFSoftShadowMap: number;
  export const RepeatWrapping: number;
  export const ClampToEdgeWrapping: number;
  export const AdditiveBlending: number;
  export const DoubleSide: number;
  export const HalfFloatType: number;
  export const RGBAFormat: number;
  export const LinearMipmapLinearFilter: number;
  export const LinearFilter: number;

  export class Color {
    r: number;
    g: number;
    b: number;
    constructor(color?: ColorRepresentation);
    multiplyScalar(s: number): this;
    setHex(hex: number): this;
  }
  export class Vector2 {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    set(x: number, y: number): this;
  }
  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    project(camera: Camera): this;
  }
  export class Box3 {
    min: Vector3;
    max: Vector3;
    constructor(min?: Vector3, max?: Vector3);
    setFromObject(object: Object3D): this;
    isEmpty(): boolean;
  }
  export class Object3D {
    position: Vector3;
    rotation: { x: number; y: number; z: number; set(x: number, y: number, z: number): void };
    scale: Vector3 & { setScalar(s: number): void };
    visible: boolean;
    renderOrder: number;
    castShadow: boolean;
    receiveShadow: boolean;
    geometry?: BufferGeometry;
    material?: Material | Material[];
    add(...objects: Object3D[]): this;
    lookAt(x: number, y: number, z: number): void;
    traverse(callback: (object: Object3D) => void): void;
    updateMatrixWorld(force?: boolean): void;
  }
  export class Group extends Object3D {}
  export class Scene extends Object3D {
    background: Color | Texture | null;
    environment: Texture | null;
    environmentIntensity: number;
    fog: FogExp2 | null;
  }
  export class FogExp2 {
    constructor(color: ColorRepresentation, density?: number);
  }
  export class Camera extends Object3D {}
  export class PerspectiveCamera extends Camera {
    aspect: number;
    constructor(fov?: number, aspect?: number, near?: number, far?: number);
    updateProjectionMatrix(): void;
  }
  export class Float32BufferAttribute {
    count: number;
    constructor(array: Iterable<number> | ArrayLike<number>, itemSize: number, normalized?: boolean);
  }
  export class BufferGeometry {
    attributes: Record<string, Float32BufferAttribute | undefined>;
    setAttribute(name: string, attribute: Float32BufferAttribute): this;
    setIndex(index: number[]): this;
    toNonIndexed(): BufferGeometry;
    computeVertexNormals(): void;
    rotateX(angle: number): this;
    rotateY(angle: number): this;
    rotateZ(angle: number): this;
    translate(x: number, y: number, z: number): this;
    dispose(): void;
  }
  export class Path {
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    quadraticCurveTo(cpX: number, cpY: number, x: number, y: number): this;
    absarc(x: number, y: number, radius: number, startAngle: number, endAngle: number, clockwise?: boolean): this;
    closePath(): this;
  }
  export class Shape extends Path {
    holes: Path[];
  }
  export class PlaneGeometry extends BufferGeometry {
    constructor(width?: number, height?: number, widthSegments?: number, heightSegments?: number);
  }
  export class CircleGeometry extends BufferGeometry {
    constructor(radius?: number, segments?: number, thetaStart?: number, thetaLength?: number);
  }
  export class ExtrudeGeometry extends BufferGeometry {
    constructor(shapes?: Shape | Shape[], options?: Record<string, unknown>);
  }
  export class LatheGeometry extends BufferGeometry {
    constructor(points?: Vector2[], segments?: number, phiStart?: number, phiLength?: number);
  }
  export class Material {
    dispose(): void;
  }
  export class MeshBasicMaterial extends Material {
    constructor(parameters?: Record<string, unknown>);
  }
  export class MeshStandardMaterial extends Material {
    emissive: Color;
    emissiveIntensity: number;
    constructor(parameters?: Record<string, unknown>);
  }
  export class MeshPhysicalMaterial extends MeshStandardMaterial {
    constructor(parameters?: Record<string, unknown>);
  }
  export class Mesh extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material | Material[]);
  }
  export class DirectionalLight extends Object3D {
    intensity: number;
    shadow: {
      mapSize: Vector2;
      camera: { near: number; far: number; left: number; right: number; top: number; bottom: number };
      bias: number;
      normalBias: number;
      radius: number;
    };
    constructor(color?: ColorRepresentation, intensity?: number);
  }
  export class Texture {
    wrapS: number;
    wrapT: number;
    repeat: Vector2;
    minFilter: number;
    magFilter: number;
    colorSpace: string;
    generateMipmaps: boolean;
    needsUpdate: boolean;
    dispose(): void;
  }
  export class DataTexture extends Texture {
    constructor(data: BufferSource, width: number, height: number, format?: number);
  }
  export class WebGLRenderTarget {
    texture: Texture;
    constructor(width: number, height: number, options?: Record<string, unknown>);
    setSize(width: number, height: number): void;
    dispose(): void;
  }
  export class PMREMGenerator {
    constructor(renderer: WebGLRenderer);
    compileEquirectangularShader(): void;
    fromScene(scene: Scene, sigma?: number, near?: number, far?: number): WebGLRenderTarget;
    dispose(): void;
  }
  export class WebGLRenderer {
    domElement: HTMLCanvasElement;
    outputColorSpace: string;
    toneMapping: number;
    toneMappingExposure: number;
    shadowMap: { enabled: boolean; type: number };
    constructor(parameters?: Record<string, unknown>);
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    setClearColor(color: ColorRepresentation, alpha?: number): void;
    compileAsync(scene: Object3D, camera: Camera): Promise<void>;
    render(scene: Object3D, camera: Camera): void;
    dispose(): void;
    forceContextLoss(): void;
  }
}

declare module 'three/addons/geometries/RoundedBoxGeometry.js' {
  import { BufferGeometry } from 'three';
  export class RoundedBoxGeometry extends BufferGeometry {
    constructor(width?: number, height?: number, depth?: number, segments?: number, radius?: number);
  }
}

declare module 'three/addons/postprocessing/EffectComposer.js' {
  import { WebGLRenderer, WebGLRenderTarget } from 'three';
  export class EffectComposer {
    constructor(renderer: WebGLRenderer, renderTarget?: WebGLRenderTarget);
    addPass(pass: unknown): void;
    setSize(width: number, height: number): void;
    render(deltaTime?: number): void;
    dispose(): void;
  }
}

declare module 'three/addons/postprocessing/RenderPass.js' {
  import { Scene, Camera } from 'three';
  export class RenderPass {
    constructor(scene: Scene, camera: Camera);
  }
}

declare module 'three/addons/postprocessing/UnrealBloomPass.js' {
  import { Vector2 } from 'three';
  export class UnrealBloomPass {
    strength: number;
    radius: number;
    threshold: number;
    constructor(resolution: Vector2, strength: number, radius: number, threshold: number);
    setSize(width: number, height: number): void;
    dispose(): void;
  }
}

declare module 'three/addons/postprocessing/OutputPass.js' {
  export class OutputPass {
    constructor();
    dispose(): void;
  }
}

declare module 'three/addons/postprocessing/ShaderPass.js' {
  export class ShaderPass {
    uniforms: Record<string, { value: unknown }>;
    constructor(shader: Record<string, unknown>);
    dispose(): void;
  }
}

import { capabilities } from '../../catalog/src/index.js';
import { studySchema } from './study.js';
// This deliberately small schema vocabulary is shared by validation and distribution.
export interface Schema {
  type?: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean';
  properties?: Record<string, Schema>; required?: string[];
  additionalProperties?: boolean | Schema; items?: Schema;
  minimum?: number; maximum?: number; minItems?: number; maxItems?: number;
  minLength?: number; maxLength?: number; pattern?: string;
  enum?: readonly (string | number)[]; const?: string | number; oneOf?: Schema[];
  title?: string; description?: string;
}
export const number = (minimum: number, maximum: number): Schema => ({ type: 'number', minimum, maximum });
export const integer = (minimum: number, maximum: number): Schema => ({ type: 'integer', minimum, maximum });
export const string = (maxLength: number, pattern?: string): Schema => ({ type: 'string', minLength: 1, maxLength, ...(pattern ? { pattern } : {}) });
export const object = (properties: Record<string, Schema>): Schema => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const id = string(64, '^[a-zA-Z][a-zA-Z0-9_-]*$');
const color = string(7, '^#[0-9a-fA-F]{6}$');
const point: Schema = { type: 'array', items: number(-32768, 32768), minItems: 2, maxItems: 2 };
const baseNode = { id, position: point, color };
const textNode = object({ ...baseNode, type: { const: 'text' }, text: string(2000), font: { ...id, description: 'system and mono use the device sans-serif or monospace font without a download; otherwise reference a declared font asset.' },
  fontSize: number(1, 512), lineHeight: number(1, 1024) });
const pathFields = { ...baseNode, type: { const: 'path' }, points: { type: 'array', items: point, minItems: 2, maxItems: 1000 }, strokeWidth: number(0.1, 100) } satisfies Record<string, Schema>;
// closed and fill are optional and default to an open stroked polyline.
const pathNode: Schema = { ...object(pathFields), properties: { ...pathFields, closed: { type: 'boolean' }, fill: { type: 'boolean' } } };
const legacyScene: Schema = object({
    specVersion: { const: '0.1' }, seed: integer(0, 4294967295),
    canvas: object({ width: integer(16, 4096), height: integer(16, 4096), background: color }),
    fps: object({ numerator: integer(1, 120000), denominator: integer(1, 10000) }),
    durationFrames: integer(1, 18000),
    assets: { type: 'object', additionalProperties: object({ type: { const: 'font' },
      src: string(200, '^assets/[a-zA-Z0-9_-]+\\.(otf|ttf|woff2)$'),
      sha256: string(64, '^[0-9a-f]{64}$'), family: string(64, '^[a-zA-Z][a-zA-Z0-9_-]*$'), postscriptName: string(100) }) },
    nodes: { type: 'array', items: { oneOf: [textNode, pathNode] }, minItems: 1, maxItems: 100 },
    clips: { type: 'array', maxItems: 300, items: { oneOf: capabilities.map((entry) => object({
      id, target: id, recipe: { const: entry.id }, startFrame: integer(0, 17999),
      durationFrames: integer(1, 18000), fillAfter: { const: 'hold' },
      params: object(Object.fromEntries(Object.entries(entry.params).map(([key, parameter]) => [key,
        parameter.type === 'number'
          ? { type: parameter.integer ? 'integer' : 'number', minimum: parameter.minimum, maximum: parameter.maximum, description: `${parameter.title} (${parameter.unit})` }
          : parameter.type === 'color' ? { ...color, description: parameter.title } : { type: 'string', enum: parameter.enum },
      ]))),
    })) } },
  });
const transform = { parent: id, pivot: point, rotation: number(-360000, 360000), scale: number(0, 100), opacity: number(0, 1), stretch: point };
const extendNode = (schema: Schema): Schema => ({ ...schema, properties: { ...schema.properties, ...transform } });
const vectorNode = object({ ...baseNode, type: { const: 'vector' }, fill: { type: 'boolean' }, strokeWidth: number(0.1, 100),
  commands: { type: 'array', minItems: 2, maxItems: 1000, items: { oneOf: [
    ...['M', 'L'].map(op => object({ op: { const: op }, to: point })),
    object({ op: { const: 'Q' }, control: point, to: point }),
    object({ op: { const: 'C' }, control1: point, control2: point, to: point }), object({ op: { const: 'Z' } }),
  ] } } });
const size = { width: number(1, 4096), height: number(1, 4096) };
const groupNode: Schema = { ...object({ ...baseNode, type: { const: 'group' } }), properties: { ...baseNode, type: { const: 'group' },
  layout: object({ type: { enum: ['row', 'column', 'grid'] }, cell: { ...point, items: number(0, 4096) },
    gap: { ...point, items: number(0, 4096) }, columns: integer(1, 100) }) } };
const imageNode = object({ ...baseNode, type: { const: 'image' }, asset: id, ...size, fit: { enum: ['contain', 'cover', 'stretch'] } });
const customNode = object({ ...baseNode, type: { const: 'custom' }, module: id, ...size,
  params: { type: 'object', additionalProperties: number(-1000000, 1000000) } });
const keyframe: Schema = { ...object({ frame: number(0, 18000), value: { oneOf: [number(-1000000, 1000000), color] } }), properties: {
  frame: number(0, 18000), value: { oneOf: [number(-1000000, 1000000), color] },
  easing: { oneOf: [{ enum: ['linear', 'smooth', 'hold'] }, { type: 'array', items: number(-10, 10), minItems: 4, maxItems: 4 }] },
} };
const modernScene: Schema = { ...legacyScene, properties: { ...legacyScene.properties,
  specVersion: { const: '0.2' },
  assets: { type: 'object', additionalProperties: { oneOf: [legacyScene.properties!.assets!.additionalProperties as Schema,
    object({ type: { const: 'image' }, src: string(200, '^assets/[a-zA-Z0-9_-]+\\.(png|jpg|jpeg|webp)$'), sha256: string(64, '^[0-9a-f]{64}$') }),
    object({ type: { const: 'module' }, src: string(200, '^assets/[a-zA-Z0-9_-]+\\.mjs$'), sha256: string(64, '^[0-9a-f]{64}$') }),
  ] } },
  nodes: { ...legacyScene.properties!.nodes, items: { oneOf: [textNode, pathNode, vectorNode, imageNode, groupNode, customNode].map(extendNode) } },
  animations: { type: 'array', maxItems: 500, items: object({ id, target: id,
    property: string(100, '^(position\\.[xy]|rotation|scale|opacity|stretch\\.[xy]|color|fontSize|strokeWidth|width|height|params\\.[a-zA-Z][a-zA-Z0-9_-]*)$'),
    keyframes: { type: 'array', minItems: 1, maxItems: 1000, items: keyframe } }) },
  // The study validator owns its domain rules and can also validate an independent analysis document.
  study: studySchema,
} };
export const motionSchema: Schema & { $schema: string; $id: string } = {
  $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'urn:motionflux:spec:0.2', oneOf: [legacyScene, modernScene],
};

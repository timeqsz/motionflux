import { capabilities } from '../../catalog/src/index.js';
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
const number = (minimum: number, maximum: number): Schema => ({ type: 'number', minimum, maximum });
const integer = (minimum: number, maximum: number): Schema => ({ type: 'integer', minimum, maximum });
const string = (maxLength: number, pattern?: string): Schema => ({ type: 'string', minLength: 1, maxLength, ...(pattern ? { pattern } : {}) });
const object = (properties: Record<string, Schema>): Schema => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const id = string(64, '^[a-zA-Z][a-zA-Z0-9_-]*$');
const color = string(7, '^#[0-9a-fA-F]{6}$');
const point: Schema = { type: 'array', items: number(-32768, 32768), minItems: 2, maxItems: 2 };
const baseNode = { id, position: point, color };
const textNode = object({ ...baseNode, type: { const: 'text' }, text: string(2000), font: { ...id, description: 'system and mono use the device sans-serif or monospace font without a download; otherwise reference a declared font asset.' },
  fontSize: number(1, 512), lineHeight: number(1, 1024) });
const pathFields = { ...baseNode, type: { const: 'path' }, points: { type: 'array', items: point, minItems: 2, maxItems: 1000 }, strokeWidth: number(0.1, 100) } satisfies Record<string, Schema>;
// closed and fill are optional and default to an open stroked polyline.
const pathNode: Schema = { ...object(pathFields), properties: { ...pathFields, closed: { type: 'boolean' }, fill: { type: 'boolean' } } };
export const motionSchema: Schema & { $schema: string; $id: string } = {
  $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'urn:motionflux:spec:0.1',
  ...object({
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
  }),
};

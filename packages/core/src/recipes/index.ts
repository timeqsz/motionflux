import type { RecipeId } from '../../../catalog/src/index.js';
import { prop } from './prop.js';
import { timing } from './timing.js';
import { loop } from './loop.js';
import { choreo } from './choreo.js';
import { transition } from './transition.js';
import { text } from './text.js';
import { feel } from './feel.js';
import { generate } from './generate.js';
import type { Recipe } from './context.js';
export type { Copy, Curve, NodeState, Recipe, RecipeContext } from './context.js';
/** Every catalog recipe has exactly one implementation; a missing or extra ID fails the type check. */
export const recipes: Record<RecipeId, Recipe> = { ...prop, ...timing, ...loop, ...choreo, ...transition, ...text, ...feel, ...generate };

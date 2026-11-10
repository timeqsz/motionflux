import { drawPanel, panelHeight, type BreakdownPlan } from './breakdown.js';
declare global { interface Window { motionFlux?: { renderFrame(frame: number, background?: boolean): void; scene: unknown } } }

/**
 * The timeline panel on its own, for breakdowns of a source video: the CLI captures one panel per output frame
 * and stacks it under the matching video frame. Same capture contract as the standalone scene page.
 */
const plan = JSON.parse(document.getElementById('plan-data')!.textContent!) as BreakdownPlan;
const canvas = document.querySelector('canvas')!;
canvas.width = plan.width; canvas.height = panelHeight(plan) + (panelHeight(plan) % 2);
const context = canvas.getContext('2d')!;
drawPanel(context, plan, 0);
window.motionFlux = { renderFrame: (frame) => drawPanel(context, plan, frame), scene: plan };

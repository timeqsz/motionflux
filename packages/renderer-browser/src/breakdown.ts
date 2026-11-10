/** Source picture above, one colored track per atom below; each track contains independent named action blocks. */
export interface BreakdownBlock { name: string; from: number; to: number }
export interface BreakdownTrack { symbol: string; name: string; color: string; blocks: BreakdownBlock[] }
export interface BreakdownPlan {
  width: number; title?: string;
  /** Frame units throughout; source-video times are converted by the CLI. */
  durationFrames: number; fps: number; sourceStartSeconds?: number; tracks: BreakdownTrack[];
}
const unitOf = (plan: BreakdownPlan) => plan.width / 640;
const header = 46, blockHeight = 22, laneGap = 4, trackGap = 12, footer = 18, labelWidth = 120;

function layout(plan: BreakdownPlan) {
  let top = header;
  const tracks = plan.tracks.map(track => {
    const ends: number[] = [];
    const blocks = [...track.blocks].sort((a, b) => a.from - b.from || a.to - b.to).map(block => {
      let lane = ends.findIndex(end => end <= block.from);
      if (lane < 0) lane = ends.length;
      ends[lane] = block.to;
      return { ...block, lane };
    });
    const height = Math.max(1, ends.length) * (blockHeight + laneGap) - laneGap;
    const result = { track, blocks, top, height };
    top += height + trackGap;
    return result;
  });
  return { tracks, height: top + footer };
}
export function panelHeight(plan: BreakdownPlan): number { return Math.ceil(layout(plan).height * unitOf(plan)); }
export function breakdownSize(plan: BreakdownPlan, scene: { width: number; height: number }): { width: number; height: number; sceneHeight: number } {
  const sceneHeight = Math.round(scene.height * plan.width / scene.width);
  const height = sceneHeight + panelHeight(plan);
  return { width: plan.width + (plan.width % 2), height: height + (height % 2), sceneHeight };
}
const sans = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
const mono = '"SF Mono", ui-monospace, Menlo, Consolas, monospace';
/** Overlapping blocks use sublanes inside their atom track, so dim blocks cannot cover bright ones. */
export function drawPanel(context: CanvasRenderingContext2D, plan: BreakdownPlan, frame: number, top = 0): void {
  const u = unitOf(plan), arranged = layout(plan), laneX = labelWidth * u, laneWidth = plan.width - laneX - 12 * u;
  context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.globalAlpha = 1;
  context.fillStyle = '#0f1114'; context.fillRect(0, top, context.canvas.width, panelHeight(plan) + 1);
  context.textBaseline = 'middle'; context.textAlign = 'left';
  context.fillStyle = '#f2f3ee'; context.font = `600 ${15 * u}px ${sans}`;
  if (plan.title) context.fillText(plan.title, 12 * u, top + 18 * u, plan.width - 24 * u);
  context.fillStyle = '#ffffff8f'; context.font = `${10 * u}px ${mono}`;
  const startSeconds = plan.sourceStartSeconds ?? 0;
  context.fillText(`${(startSeconds + frame / plan.fps).toFixed(2)} / ${(startSeconds + plan.durationFrames / plan.fps).toFixed(2)} s`, 12 * u, top + 35 * u);
  for (const [index, { track, blocks, top: trackTop, height }] of arranged.tracks.entries()) {
    context.globalAlpha = 1;
    // Flush alternating bands keep the timeline continuous instead of boxing each atom into a card.
    context.fillStyle = index % 2 === 0 ? '#14171b' : '#0f1114';
    context.fillRect(0, top + (trackTop - trackGap / 2) * u, plan.width, (height + trackGap) * u);
    const middle = top + (trackTop + height / 2) * u;
    const active = blocks.some(block => frame >= block.from && frame < block.to);
    context.globalAlpha = active ? 1 : 0.7; context.fillStyle = track.color;
    context.fillRect(0, middle - 8 * u, 2 * u, 16 * u);
    context.font = `700 ${11 * u}px ${sans}`; context.fillText(track.symbol, 12 * u, middle);
    context.font = `${12 * u}px ${sans}`; context.fillText(track.name, 42 * u, middle, laneX - 50 * u);
    context.globalAlpha = 1;
    for (const block of blocks) {
      const y = top + (trackTop + block.lane * (blockHeight + laneGap)) * u;
      const from = laneX + laneWidth * block.from / plan.durationFrames;
      const to = laneX + laneWidth * block.to / plan.durationFrames;
      // Insets visibly separate touching actions without modifying their timestamps.
      const inset = Math.min(1.5 * u, (to - from) / 4), x = from + inset, width = to - from - inset * 2;
      const acting = frame >= block.from && frame < block.to;
      context.globalAlpha = acting ? 1 : 0.35; context.fillStyle = track.color;
      context.beginPath(); context.roundRect(x, y, width, blockHeight * u, 3 * u); context.fill();
    }
    context.globalAlpha = 1;
  }
  context.globalAlpha = 1; context.fillStyle = '#f2f3ee';
  context.fillRect(laneX + laneWidth * Math.min(1, frame / plan.durationFrames) - 0.5 * u,
    top + header * u, u, (arranged.height - header - footer + 2) * u);
  context.restore();
}
export function drawBreakdown(target: HTMLCanvasElement, picture: HTMLCanvasElement, plan: BreakdownPlan, frame: number): void {
  const context = target.getContext('2d')!, { sceneHeight } = breakdownSize(plan, picture);
  context.save(); context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = '#0f1114'; context.fillRect(0, 0, target.width, target.height);
  context.drawImage(picture, 0, 0, plan.width, sceneHeight); context.restore();
  drawPanel(context, plan, frame, sceneHeight);
}

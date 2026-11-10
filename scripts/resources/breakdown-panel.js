"use strict";
(() => {
  // packages/renderer-browser/src/breakdown.ts
  var unitOf = (plan2) => plan2.width / 640;
  var header = 46;
  var blockHeight = 22;
  var laneGap = 4;
  var trackGap = 12;
  var footer = 18;
  var labelWidth = 120;
  function layout(plan2) {
    let top = header;
    const tracks = plan2.tracks.map((track) => {
      const ends = [];
      const blocks = [...track.blocks].sort((a, b) => a.from - b.from || a.to - b.to).map((block) => {
        let lane = ends.findIndex((end) => end <= block.from);
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
  function panelHeight(plan2) {
    return Math.ceil(layout(plan2).height * unitOf(plan2));
  }
  var sans = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
  var mono = '"SF Mono", ui-monospace, Menlo, Consolas, monospace';
  function drawPanel(context2, plan2, frame, top = 0) {
    const u = unitOf(plan2), arranged = layout(plan2), laneX = labelWidth * u, laneWidth = plan2.width - laneX - 12 * u;
    context2.save();
    context2.setTransform(1, 0, 0, 1, 0, 0);
    context2.globalAlpha = 1;
    context2.fillStyle = "#0f1114";
    context2.fillRect(0, top, context2.canvas.width, panelHeight(plan2) + 1);
    context2.textBaseline = "middle";
    context2.textAlign = "left";
    context2.fillStyle = "#f2f3ee";
    context2.font = `600 ${15 * u}px ${sans}`;
    if (plan2.title) context2.fillText(plan2.title, 12 * u, top + 18 * u, plan2.width - 24 * u);
    context2.fillStyle = "#ffffff8f";
    context2.font = `${10 * u}px ${mono}`;
    const startSeconds = plan2.sourceStartSeconds ?? 0;
    context2.fillText(`${(startSeconds + frame / plan2.fps).toFixed(2)} / ${(startSeconds + plan2.durationFrames / plan2.fps).toFixed(2)} s`, 12 * u, top + 35 * u);
    for (const [index, { track, blocks, top: trackTop, height }] of arranged.tracks.entries()) {
      context2.globalAlpha = 1;
      context2.fillStyle = index % 2 === 0 ? "#14171b" : "#0f1114";
      context2.fillRect(0, top + (trackTop - trackGap / 2) * u, plan2.width, (height + trackGap) * u);
      const middle = top + (trackTop + height / 2) * u;
      const active = blocks.some((block) => frame >= block.from && frame < block.to);
      context2.globalAlpha = active ? 1 : 0.7;
      context2.fillStyle = track.color;
      context2.fillRect(0, middle - 8 * u, 2 * u, 16 * u);
      context2.font = `700 ${11 * u}px ${sans}`;
      context2.fillText(track.symbol, 12 * u, middle);
      context2.font = `${12 * u}px ${sans}`;
      context2.fillText(track.name, 42 * u, middle, laneX - 50 * u);
      context2.globalAlpha = 1;
      for (const block of blocks) {
        const y = top + (trackTop + block.lane * (blockHeight + laneGap)) * u;
        const from = laneX + laneWidth * block.from / plan2.durationFrames;
        const to = laneX + laneWidth * block.to / plan2.durationFrames;
        const inset = Math.min(1.5 * u, (to - from) / 4), x = from + inset, width = to - from - inset * 2;
        const acting = frame >= block.from && frame < block.to;
        context2.globalAlpha = acting ? 1 : 0.35;
        context2.fillStyle = track.color;
        context2.beginPath();
        context2.roundRect(x, y, width, blockHeight * u, 3 * u);
        context2.fill();
      }
      context2.globalAlpha = 1;
    }
    context2.globalAlpha = 1;
    context2.fillStyle = "#f2f3ee";
    context2.fillRect(
      laneX + laneWidth * Math.min(1, frame / plan2.durationFrames) - 0.5 * u,
      top + header * u,
      u,
      (arranged.height - header - footer + 2) * u
    );
    context2.restore();
  }

  // packages/renderer-browser/src/panel-page.ts
  var plan = JSON.parse(document.getElementById("plan-data").textContent);
  var canvas = document.querySelector("canvas");
  canvas.width = plan.width;
  canvas.height = panelHeight(plan) + panelHeight(plan) % 2;
  var context = canvas.getContext("2d");
  drawPanel(context, plan, 0);
  window.motionFlux = { renderFrame: (frame) => drawPanel(context, plan, frame), scene: plan };
})();

// packages/stage/src/runtime.ts
function clamp(value, min = 0, max = 1) {
  return value < min ? min : value > max ? max : value;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function remap(value, inMin, inMax, outMin = 0, outMax = 1, clamped = true) {
  if (inMax === inMin) return value >= inMax ? outMax : outMin;
  const raw = (value - inMin) / (inMax - inMin);
  const t = clamped ? clamp(raw, 0, 1) : raw;
  return outMin + (outMax - outMin) * t;
}
function easeOutCubic(t) {
  const u = clamp(t);
  return 1 - Math.pow(1 - u, 3);
}
function easeInOutCubic(t) {
  const u = clamp(t);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}
function easeOutExpo(t) {
  const u = clamp(t);
  return u >= 1 ? 1 : 1 - Math.pow(2, -10 * u);
}
function easeOutBack(t, overshoot = 1.70158) {
  const u = clamp(t);
  return 1 + (overshoot + 1) * Math.pow(u - 1, 3) + overshoot * Math.pow(u - 1, 2);
}
function spring(tSec, options = {}) {
  if (tSec <= 0) return 0;
  const k = Math.max(1, options.stiffness ?? 180);
  const c = Math.max(0.1, options.damping ?? 18);
  const m = Math.max(0.05, options.mass ?? 1);
  const v0 = options.velocity ?? 0;
  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  const x0 = -1;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const A = x0;
    const B = (zeta * w0 * x0 + v0) / wd;
    const envelope = Math.exp(-zeta * w0 * tSec);
    return 1 + envelope * (A * Math.cos(wd * tSec) + B * Math.sin(wd * tSec));
  }
  if (Math.abs(zeta - 1) < 1e-6) {
    const A = x0;
    const B = v0 + w0 * x0;
    return 1 + (A + B * tSec) * Math.exp(-w0 * tSec);
  }
  const sqrtTerm = Math.sqrt(zeta * zeta - 1);
  const r1 = -w0 * (zeta - sqrtTerm);
  const r2 = -w0 * (zeta + sqrtTerm);
  const C1 = (v0 - r2 * x0) / (r1 - r2);
  const C2 = x0 - C1;
  return 1 + C1 * Math.exp(r1 * tSec) + C2 * Math.exp(r2 * tSec);
}
function stagger(index, stepFrames, startFrame = 0) {
  return startFrame + index * stepFrames;
}
function isCaptureMode() {
  if (typeof window === "undefined") return false;
  if (window.__MOTIONFLUX_CAPTURE__) return true;
  try {
    return new URLSearchParams(window.location.search).get("capture") === "1";
  } catch {
    return false;
  }
}
function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
function resolveStageElement(target) {
  if (target instanceof HTMLElement) return target;
  if (typeof target === "string") {
    const found2 = document.querySelector(target);
    if (!found2) throw new Error(`STAGE_ELEMENT_MISSING: Selector "${target}" did not match any element.`);
    return found2;
  }
  const found = document.querySelector("[data-mf-stage], #stage");
  if (found) return found;
  return document.body;
}
function findActiveScene(scenes, frame) {
  if (scenes.length === 0) return void 0;
  for (const scene of scenes) {
    if (frame >= scene.startFrame && frame < scene.endFrame) return scene;
  }
  const last = scenes[scenes.length - 1];
  if (last && frame >= last.endFrame) return last;
  return scenes[0];
}
function describeElement(el) {
  const role = el.getAttribute("data-mf-id") ?? el.getAttribute("data-mf-role");
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/u).filter(Boolean).slice(0, 2).map((c) => `.${c}`).join("") : "";
  const snippet = (el.textContent ?? "").trim().replace(/\s+/gu, " ").slice(0, 24);
  const base = `${tag}${id}${cls}${role ? `[${role}]` : ""}`;
  return snippet ? `${base} ("${snippet}")` : base;
}
function hasAncestorAttr(el, attr, stopAt) {
  let cur = el;
  while (cur) {
    if (cur.hasAttribute(attr)) return true;
    if (cur === stopAt) break;
    cur = cur.parentElement;
  }
  return false;
}
function isVisuallyPresent(el, stopAt) {
  let cur = el;
  while (cur) {
    const style = getComputedStyle(cur);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (parseFloat(style.opacity) <= 0.04) return false;
    if (cur === stopAt) break;
    cur = cur.parentElement;
  }
  return true;
}
function hasDirectText(el) {
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim().length > 0) {
      return true;
    }
  }
  return false;
}
function toStageRect(domRect, stageRect, stageW, stageH) {
  const scaleX = stageRect.width > 0 ? stageW / stageRect.width : 1;
  const scaleY = stageRect.height > 0 ? stageH / stageRect.height : 1;
  return {
    x: Math.round((domRect.left - stageRect.left) * scaleX * 10) / 10,
    y: Math.round((domRect.top - stageRect.top) * scaleY * 10) / 10,
    width: Math.round(domRect.width * scaleX * 10) / 10,
    height: Math.round(domRect.height * scaleY * 10) / 10
  };
}
function rectIntersectionArea(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
}
async function seekVideoElement(video, frame, fps) {
  if (video.error) return;
  if (video.readyState < 1) {
    await new Promise((resolve) => {
      const done = () => {
        video.removeEventListener("loadedmetadata", done);
        video.removeEventListener("error", done);
        resolve();
      };
      video.addEventListener("loadedmetadata", done, { once: true });
      video.addEventListener("error", done, { once: true });
      setTimeout(done, 4e3);
    });
  }
  if (!Number.isFinite(video.duration) || video.duration <= 0) return;
  video.pause();
  const startFrame = Number(video.dataset.mfStartFrame ?? 0);
  const offsetSec = Number(video.dataset.mfOffsetSec ?? 0);
  const rate = Number(video.dataset.mfRate ?? 1);
  const localSec = Math.max(0, (frame - startFrame) / fps) * rate + offsetSec;
  const target = clamp(localSec, 0, Math.max(0, video.duration - 1e-3));
  if (Math.abs(video.currentTime - target) < 1e-3 && video.readyState >= 2) return;
  await new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", done);
      resolve();
    };
    video.addEventListener("seeked", done, { once: true });
    video.addEventListener("error", done, { once: true });
    video.currentTime = target;
    setTimeout(done, 3e3);
  });
}
function mountPreviewChrome(stageEl, meta, api) {
  const root = document.documentElement;
  root.style.margin = "0";
  root.style.height = "100%";
  document.body.style.margin = "0";
  document.body.style.height = "100%";
  document.body.style.background = "#0b0d12";
  document.body.style.overflow = "hidden";
  const viewport = document.createElement("div");
  viewport.setAttribute("data-mf-preview-viewport", "1");
  viewport.style.cssText = "position:fixed;inset:0 0 64px 0;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:20px;box-sizing:border-box;";
  const holder = document.createElement("div");
  holder.style.cssText = `position:relative;width:${meta.width}px;height:${meta.height}px;flex:none;transform-origin:center center;box-shadow:0 24px 80px rgba(0,0,0,0.65);border-radius:6px;overflow:hidden;`;
  if (stageEl !== document.body) {
    stageEl.parentElement?.insertBefore(viewport, stageEl);
    holder.appendChild(stageEl);
    viewport.appendChild(holder);
  }
  const overlayCanvas = document.createElement("div");
  overlayCanvas.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:99999;display:none;";
  holder.appendChild(overlayCanvas);
  const fit = () => {
    const rect = viewport.getBoundingClientRect();
    const scale = Math.min((rect.width - 32) / meta.width, (rect.height - 32) / meta.height, 1);
    holder.style.transform = `scale(${Math.max(0.1, scale)})`;
  };
  fit();
  window.addEventListener("resize", fit);
  const host = document.createElement("div");
  host.setAttribute("data-mf-preview-ui", "1");
  host.style.cssText = "position:fixed;left:0;right:0;bottom:0;height:64px;z-index:100000;";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  const sceneButtons = meta.scenes.map((s) => `<button class="chip" data-frame="${s.startFrame}" title="${s.id}">${s.label ?? s.id}</button>`).join("");
  shadow.innerHTML = `
    <style>
      :host { font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #e5e7eb; }
      .bar { height: 64px; background: rgba(17, 20, 27, 0.96); border-top: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 12px; padding: 0 18px; box-sizing: border-box; backdrop-filter: blur(12px); }
      button { background: rgba(255,255,255,0.08); color: #f3f4f6; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: 500; transition: background 0.12s; }
      button:hover { background: rgba(255,255,255,0.16); }
      button.active { background: #3b82f6; border-color: #60a5fa; color: #fff; }
      .scrubber { flex: 1; accent-color: #60a5fa; cursor: pointer; min-width: 140px; }
      .time { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #9ca3af; min-width: 155px; text-align: right; }
      .scenes { display: flex; gap: 6px; overflow-x: auto; max-width: 38vw; }
      .chip { padding: 4px 9px; font-size: 11px; white-space: nowrap; }
      .badge { font-size: 11px; padding: 3px 8px; border-radius: 999px; background: rgba(255,255,255,0.08); color: #9ca3af; }
      .badge.ok { background: rgba(16,185,129,0.18); color: #34d399; }
      .badge.err { background: rgba(239,68,68,0.2); color: #f87171; }
    </style>
    <div class="bar">
      <button id="play">Play</button>
      <input id="scrub" class="scrubber" type="range" min="0" max="${Math.max(0, meta.durationFrames - 1)}" value="0" step="1" />
      <div class="scenes">${sceneButtons}</div>
      <button id="guide" title="Toggle Safe-Area & Audit Overlay (G)">Audit</button>
      <span id="status" class="badge">${meta.width}\xD7${meta.height} \xB7 ${meta.fps}fps</span>
      <div id="time" class="time">00:00.00 \xB7 0/${meta.durationFrames}</div>
    </div>
  `;
  const playBtn = shadow.getElementById("play");
  const scrub = shadow.getElementById("scrub");
  const timeEl = shadow.getElementById("time");
  const guideBtn = shadow.getElementById("guide");
  const statusEl = shadow.getElementById("status");
  let guideOn = false;
  const renderOverlay = async (frame) => {
    if (!guideOn) {
      overlayCanvas.style.display = "none";
      return;
    }
    overlayCanvas.style.display = "block";
    const report = await api.audit(frame);
    const marginX = meta.width * 0.04;
    const marginY = meta.height * 0.04;
    const boxes = report.issues.filter((issue) => issue.rect).map((issue) => {
      const r = issue.rect;
      const color = issue.severity === "error" ? "#ef4444" : "#f59e0b";
      return `<div style="position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;border:2px solid ${color};background:${color}22;box-sizing:border-box;">
          <span style="position:absolute;left:0;top:-20px;background:${color};color:#fff;font:600 11px/18px ui-monospace,monospace;padding:0 6px;border-radius:3px;white-space:nowrap;">${issue.code}</span>
        </div>`;
    }).join("");
    overlayCanvas.innerHTML = `
      <div style="position:absolute;left:${marginX}px;top:${marginY}px;width:${meta.width - marginX * 2}px;height:${meta.height - marginY * 2}px;border:1px dashed rgba(96,165,250,0.65);box-sizing:border-box;"></div>
      ${boxes}
    `;
    const errs = report.issues.filter((i) => i.severity === "error").length;
    const warns = report.issues.filter((i) => i.severity === "warning").length;
    statusEl.className = errs > 0 ? "badge err" : "badge ok";
    statusEl.textContent = errs > 0 ? `${errs} err \xB7 ${warns} warn` : warns > 0 ? `0 err \xB7 ${warns} warn` : "Audit OK";
  };
  playBtn.addEventListener("click", () => api.togglePlay());
  scrub.addEventListener("input", () => {
    if (api.isPlaying()) api.togglePlay();
    void api.seek(Number(scrub.value)).then(() => renderOverlay(Number(scrub.value)));
  });
  guideBtn.addEventListener("click", () => {
    guideOn = !guideOn;
    guideBtn.classList.toggle("active", guideOn);
    void renderOverlay(api.getFrame());
  });
  shadow.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = Number(btn.dataset.frame ?? 0);
      if (api.isPlaying()) api.togglePlay();
      void api.seek(f).then(() => renderOverlay(f));
    });
  });
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.code === "Space") {
      e.preventDefault();
      api.togglePlay();
    } else if (e.code === "ArrowRight" || e.code === "ArrowLeft") {
      e.preventDefault();
      if (api.isPlaying()) api.togglePlay();
      const delta = (e.shiftKey ? 10 : 1) * (e.code === "ArrowRight" ? 1 : -1);
      const next = clamp(Math.round(api.getFrame() + delta), 0, Math.max(0, meta.durationFrames - 1));
      void api.seek(next).then(() => renderOverlay(next));
    } else if (e.code === "Home") {
      e.preventDefault();
      if (api.isPlaying()) api.togglePlay();
      void api.seek(0).then(() => renderOverlay(0));
    } else if (e.code === "End") {
      e.preventDefault();
      if (api.isPlaying()) api.togglePlay();
      const last = Math.max(0, meta.durationFrames - 1);
      void api.seek(last).then(() => renderOverlay(last));
    } else if (e.key === "g" || e.key === "G") {
      guideBtn.click();
    }
  });
  return {
    syncUi(frame, playing) {
      playBtn.textContent = playing ? "Pause" : "Play";
      scrub.value = String(Math.round(clamp(frame, 0, Math.max(0, meta.durationFrames - 1))));
      const sec = frame / meta.fps;
      const mins = Math.floor(sec / 60);
      const rem = (sec - mins * 60).toFixed(2).padStart(5, "0");
      timeEl.textContent = `${String(mins).padStart(2, "0")}:${rem} \xB7 ${Math.round(frame)}/${meta.durationFrames}`;
      if (guideOn && !playing) void renderOverlay(frame);
    }
  };
}
function createStage(config) {
  const fps = config.fps ?? 30;
  if (!(config.width > 0 && config.height > 0 && fps > 0 && config.durationFrames > 0)) {
    throw new Error("STAGE_CONFIG_INVALID: width, height, fps, and durationFrames must be positive numbers.");
  }
  const meta = {
    version: "stage-1",
    width: Math.round(config.width),
    height: Math.round(config.height),
    fps,
    durationFrames: Math.round(config.durationFrames),
    ...config.background !== void 0 ? { background: config.background } : {},
    scenes: (config.scenes ?? []).map((scene) => ({ ...scene })),
    audio: (config.audio ?? []).map((cue) => ({ ...cue }))
  };
  const stageEl = resolveStageElement(config.element);
  const capture = isCaptureMode();
  stageEl.style.width = `${meta.width}px`;
  stageEl.style.height = `${meta.height}px`;
  stageEl.style.position = "relative";
  stageEl.style.overflow = "hidden";
  stageEl.style.boxSizing = "border-box";
  if (meta.background) stageEl.style.background = meta.background;
  const originalStageBg = stageEl.style.background;
  const originalBodyBg = document.body.style.background;
  if (capture) {
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.documentElement.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    stageEl.style.margin = "0";
  }
  let currentFrame = 0;
  let playing = false;
  let rafId = 0;
  let playStartWall = 0;
  let playStartFrame = 0;
  let ui;
  const sceneLookup = new Map(meta.scenes.map((s) => [s.id, s]));
  const seek = async (rawFrame, options) => {
    const frame = clamp(rawFrame, 0, meta.durationFrames);
    currentFrame = frame;
    const time = frame / meta.fps;
    const progress = meta.durationFrames > 1 ? frame / (meta.durationFrames - 1) : 1;
    const activeScene = findActiveScene(meta.scenes, frame);
    const sceneLen = activeScene ? Math.max(1, activeScene.endFrame - activeScene.startFrame) : meta.durationFrames;
    const localFrame = activeScene ? clamp(frame - activeScene.startFrame, 0, sceneLen) : frame;
    const localTime = localFrame / meta.fps;
    const localProgress = sceneLen > 1 ? clamp(localFrame / (sceneLen - 1), 0, 1) : 1;
    if (options?.transparent !== void 0) {
      if (options.transparent) {
        document.documentElement.style.background = "transparent";
        document.body.style.background = "transparent";
        stageEl.style.background = "transparent";
      } else {
        stageEl.style.background = originalStageBg;
        if (!capture) document.body.style.background = originalBodyBg;
      }
    }
    const vars = {
      "--mf-frame": String(frame),
      "--mf-time": `${time.toFixed(6)}s`,
      "--mf-time-sec": time.toFixed(6),
      "--mf-progress": progress.toFixed(6),
      "--mf-fps": String(meta.fps),
      "--mf-duration": String(meta.durationFrames),
      "--mf-scene-frame": String(localFrame),
      "--mf-scene-progress": localProgress.toFixed(6)
    };
    for (const [k, v] of Object.entries(vars)) {
      stageEl.style.setProperty(k, v);
      document.documentElement.style.setProperty(k, v);
    }
    if (activeScene) stageEl.dataset.mfActiveScene = activeScene.id;
    const sceneNodes = stageEl.querySelectorAll("[data-mf-scene]");
    for (const node of sceneNodes) {
      const id = node.dataset.mfScene ?? "";
      const def = sceneLookup.get(id);
      const start = def ? def.startFrame : Number(node.dataset.mfStart ?? 0);
      const end = def ? def.endFrame : Number(node.dataset.mfEnd ?? meta.durationFrames);
      const isLast = def && def === meta.scenes[meta.scenes.length - 1];
      const active = frame >= start && (frame < end || Boolean(isLast) && frame <= end);
      const span = Math.max(1, end - start);
      const nodeLocalFrame = clamp(frame - start, 0, span);
      const nodeLocalProgress = span > 1 ? clamp(nodeLocalFrame / (span - 1), 0, 1) : 1;
      node.dataset.mfActive = active ? "true" : "false";
      node.style.setProperty("--mf-local-frame", String(nodeLocalFrame));
      node.style.setProperty("--mf-local-progress", nodeLocalProgress.toFixed(6));
    }
    if (typeof stageEl.getAnimations === "function") {
      const animations = stageEl.getAnimations({ subtree: true });
      for (const anim of animations) {
        anim.pause();
        const effect = anim.effect;
        const target = effect?.target instanceof Element ? effect.target : null;
        let targetMs = time * 1e3;
        if (target && hasAncestorAttr(target, "data-mf-local-time", stageEl)) {
          const ownerScene = target.closest("[data-mf-scene]");
          if (ownerScene) {
            const localF = Number(ownerScene.style.getPropertyValue("--mf-local-frame") || "0");
            targetMs = Math.max(0, localF / meta.fps * 1e3);
          }
        }
        try {
          anim.currentTime = targetMs;
        } catch {
        }
      }
    }
    const videos = Array.from(stageEl.querySelectorAll("video"));
    if (videos.length > 0) {
      await Promise.all(videos.map((v) => seekVideoElement(v, frame, meta.fps)));
    }
    if (config.onFrame) {
      await config.onFrame({
        frame,
        time,
        progress,
        fps: meta.fps,
        durationFrames: meta.durationFrames,
        width: meta.width,
        height: meta.height,
        scene: activeScene,
        localFrame,
        localTime,
        localProgress,
        stage: stageEl
      });
    }
    await nextFrame();
    if (capture) await nextFrame();
    ui?.syncUi(frame, playing);
  };
  const audit = async (frame, options = {}) => {
    await seek(frame);
    const activeScene = findActiveScene(meta.scenes, frame);
    const issues = [];
    const safeMarginRatio = options.safeMarginRatio ?? 0.04;
    const overlapThreshold = options.overlapThreshold ?? 0.15;
    const minReadableFont = Math.max(13, Math.round(Math.min(meta.width, meta.height) * 0.013));
    const stageRect = stageEl.getBoundingClientRect();
    if (document.fonts) {
      for (const face of document.fonts) {
        if (face.status === "error") {
          issues.push({
            code: "FONT_LOAD_ERROR",
            severity: "error",
            frame,
            ...activeScene ? { sceneId: activeScene.id } : {},
            target: face.family,
            message: `Font "${face.family}" failed to load.`
          });
        }
      }
    }
    const allElements = Array.from(stageEl.querySelectorAll("*"));
    let visibleElements = 0;
    const overlapCandidates = [];
    for (const el of allElements) {
      if (el instanceof SVGElement && el.tagName.toLowerCase() !== "svg") continue;
      if (!isVisuallyPresent(el, stageEl)) continue;
      const domRect = el.getBoundingClientRect();
      if (domRect.width < 1 || domRect.height < 1) continue;
      const rect = toStageRect(domRect, stageRect, meta.width, meta.height);
      const allowBleed = hasAncestorAttr(el, "data-mf-allow-bleed", stageEl) || el.getAttribute("data-mf-role") === "background";
      const style = getComputedStyle(el);
      const isTextLeaf = hasDirectText(el);
      const isMedia = el instanceof HTMLImageElement || el instanceof HTMLVideoElement || el instanceof HTMLCanvasElement || el.tagName.toLowerCase() === "svg";
      if (isTextLeaf || isMedia || el.hasAttribute("data-mf-role") || el.hasAttribute("data-mf-no-overlap")) {
        visibleElements++;
      }
      if (el instanceof HTMLImageElement && (!el.complete || el.naturalWidth === 0)) {
        issues.push({
          code: "BROKEN_IMAGE",
          severity: "error",
          frame,
          ...activeScene ? { sceneId: activeScene.id } : {},
          target: describeElement(el),
          message: `Image failed to load (src="${el.getAttribute("src") ?? ""}").`,
          rect
        });
      }
      if (el instanceof HTMLVideoElement && el.error) {
        issues.push({
          code: "BROKEN_VIDEO",
          severity: "error",
          frame,
          ...activeScene ? { sceneId: activeScene.id } : {},
          target: describeElement(el),
          message: `Video failed to load (code=${el.error.code}).`,
          rect
        });
      }
      if (!allowBleed && (isTextLeaf || el.hasAttribute("data-mf-role") || el.hasAttribute("data-mf-no-overlap"))) {
        const tol = 1.5;
        if (rect.x < -tol || rect.y < -tol || rect.x + rect.width > meta.width + tol || rect.y + rect.height > meta.height + tol) {
          issues.push({
            code: "CLIPPED_OUTSIDE_STAGE",
            severity: "error",
            frame,
            ...activeScene ? { sceneId: activeScene.id } : {},
            target: describeElement(el),
            message: `Element bounds (${rect.x}, ${rect.y}, ${rect.width}\xD7${rect.height}) extend outside stage ${meta.width}\xD7${meta.height}.`,
            rect
          });
        }
      }
      if (el instanceof HTMLElement && isTextLeaf) {
        const clipsX = style.overflowX === "hidden" || style.overflowX === "clip";
        const clipsY = style.overflowY === "hidden" || style.overflowY === "clip";
        if (clipsX && el.scrollWidth > el.clientWidth + 2 || clipsY && el.scrollHeight > el.clientHeight + 2) {
          issues.push({
            code: "TEXT_OVERFLOW",
            severity: "error",
            frame,
            ...activeScene ? { sceneId: activeScene.id } : {},
            target: describeElement(el),
            message: `Text overflows its container (${el.scrollWidth}\xD7${el.scrollHeight} > ${el.clientWidth}\xD7${el.clientHeight}).`,
            rect
          });
        }
        const fontSize = parseFloat(style.fontSize);
        if (Number.isFinite(fontSize) && fontSize > 0 && fontSize < minReadableFont && !hasAncestorAttr(el, "data-mf-allow-tiny", stageEl)) {
          issues.push({
            code: "TINY_TEXT",
            severity: "warning",
            frame,
            ...activeScene ? { sceneId: activeScene.id } : {},
            target: describeElement(el),
            message: `Font size ${fontSize.toFixed(1)}px is below recommended floor ${minReadableFont}px for ${meta.width}\xD7${meta.height}.`,
            rect
          });
        }
        const mx = meta.width * safeMarginRatio;
        const my = meta.height * safeMarginRatio;
        if (!allowBleed && !hasAncestorAttr(el, "data-mf-allow-safe-margin", stageEl)) {
          if (rect.x < mx || rect.y < my || rect.x + rect.width > meta.width - mx || rect.y + rect.height > meta.height - my) {
            issues.push({
              code: "SAFE_AREA_WARNING",
              severity: "warning",
              frame,
              ...activeScene ? { sceneId: activeScene.id } : {},
              target: describeElement(el),
              message: `Text intrudes into the ${Math.round(safeMarginRatio * 100)}% outer safe margin.`,
              rect
            });
          }
        }
      }
      if ((isTextLeaf || el.hasAttribute("data-mf-no-overlap")) && !hasAncestorAttr(el, "data-mf-allow-overlap", stageEl)) {
        overlapCandidates.push({ el, name: describeElement(el), rect });
      }
    }
    for (let i = 0; i < overlapCandidates.length; i++) {
      const a = overlapCandidates[i];
      const areaA = a.rect.width * a.rect.height;
      for (let j = i + 1; j < overlapCandidates.length; j++) {
        const b = overlapCandidates[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const inter = rectIntersectionArea(a.rect, b.rect);
        if (inter <= 0) continue;
        const minArea = Math.min(areaA, b.rect.width * b.rect.height);
        if (minArea > 0 && inter / minArea > overlapThreshold) {
          issues.push({
            code: "ELEMENT_OVERLAP",
            severity: "error",
            frame,
            ...activeScene ? { sceneId: activeScene.id } : {},
            target: a.name,
            otherTarget: b.name,
            message: `Elements overlap by ${Math.round(inter / minArea * 100)}% of the smaller box.`,
            rect: a.rect
          });
        }
      }
    }
    if (visibleElements === 0 && !options.allowBlank) {
      issues.push({
        code: "BLANK_FRAME",
        severity: "warning",
        frame,
        ...activeScene ? { sceneId: activeScene.id } : {},
        target: "stage",
        message: "No visible content elements detected on stage at this frame."
      });
    }
    return {
      frame,
      timeSec: Math.round(frame / meta.fps * 1e3) / 1e3,
      ...activeScene ? { sceneId: activeScene.id } : {},
      visibleElements,
      issues
    };
  };
  const pause = () => {
    playing = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    ui?.syncUi(currentFrame, false);
  };
  const play = () => {
    if (capture || playing) return;
    playing = true;
    if (currentFrame >= meta.durationFrames - 1) currentFrame = 0;
    playStartWall = performance.now();
    playStartFrame = currentFrame;
    const tick = () => {
      if (!playing) return;
      const elapsedSec = (performance.now() - playStartWall) / 1e3;
      const nextF = (playStartFrame + elapsedSec * meta.fps) % meta.durationFrames;
      void seek(nextF).then(() => {
        if (playing) rafId = requestAnimationFrame(tick);
      });
    };
    ui?.syncUi(currentFrame, true);
    rafId = requestAnimationFrame(tick);
  };
  if (!capture) {
    ui = mountPreviewChrome(stageEl, meta, {
      getFrame: () => currentFrame,
      seek: (f) => seek(f),
      audit: (f) => audit(f),
      isPlaying: () => playing,
      togglePlay: () => playing ? pause() : play()
    });
  }
  const ready = (async () => {
    if (config.onInit) await config.onInit(stageEl, meta);
    if (document.fonts) await document.fonts.ready;
    const images = Array.from(stageEl.querySelectorAll("img"));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
          setTimeout(resolve, 6e3);
        });
      })
    );
    await seek(0);
  })();
  const handle = {
    version: "stage-1",
    meta,
    stageElement: stageEl,
    ready,
    seek,
    audit,
    play,
    pause
  };
  window.__motionflux = handle;
  return handle;
}
export {
  clamp,
  createStage,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  easeOutExpo,
  lerp,
  remap,
  spring,
  stagger
};

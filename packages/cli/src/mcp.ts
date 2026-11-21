import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { capabilities, searchCapabilities } from '../../catalog/src/index.js';
import { ENGINE_VERSION } from '../../core/src/index.js';
import {
  auditStage,
  compileMotionMdProject,
  compileMotionMdToHtml,
  initStageProject,
  listStageTemplates,
  parseMotionMd,
  renderStageVideo,
} from '../../stage/src/index.js';
import { ffmpegPath, findBrowser, probeWebGL2, probeWebGPU, toolVersion } from './capture.js';
import { buildInstallPlan, detectPackageManagers, runInstallStep } from './env.js';
import { inspectReferenceVideo } from './video-inspect.js';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

const MCP_RESOURCES = [
  { uri: 'motionflux://docs/skill', name: 'MotionFlux Skill Overview', mimeType: 'text/markdown', relPath: 'SKILL.md' },
  { uri: 'motionflux://docs/stage', name: 'Stage Runtime Protocol (stage-1)', mimeType: 'text/markdown', relPath: 'stage/README.md' },
  { uri: 'motionflux://docs/motion-md', name: 'Motion.md Director Script Spec', mimeType: 'text/markdown', relPath: 'references/motion-md.md' },
  { uri: 'motionflux://docs/physical-3d', name: 'Physical 3D & Mechanical Engineering Rules', mimeType: 'text/markdown', relPath: 'references/physical-3d.md' },
  { uri: 'motionflux://docs/studio', name: '3D PBR & CAD Studio Kit (studio.mjs)', mimeType: 'text/markdown', relPath: 'atoms/studio.md' },
  { uri: 'motionflux://docs/install', name: 'Environment Check & Automated Setup', mimeType: 'text/markdown', relPath: 'references/install.md' },
  { uri: 'motionflux://docs/catalog', name: '53 2D Motion Atoms Catalog', mimeType: 'text/markdown', relPath: 'assets/catalog.md' },
] as const;

const MCP_TOOLS = [
  {
    name: 'motionflux_doctor',
    description: 'Check MotionFlux runtime environment (Node >=22, Chrome/Chromium/Edge, WebGL2, WebGPU, FFmpeg, and available package managers).',
    inputSchema: {
      type: 'object',
      properties: {
        backend: {
          type: 'string',
          enum: ['all', 'js', 'browser', 'webgl2', 'webgpu', 'ffmpeg'],
          description: 'Target backend to probe (defaults to "all").',
        },
        browser: { type: 'string', description: 'Optional explicit browser executable path.' },
      },
    },
  },
  {
    name: 'motionflux_setup',
    description: 'Preview (apply=false) or execute (apply=true) automated cross-platform installation for missing browser or FFmpeg dependencies.',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', enum: ['all', 'browser', 'ffmpeg'] },
        manager: { type: 'string', description: 'auto | playwright | brew | apt | dnf | pacman | apk | winget | scoop | choco' },
        apply: { type: 'boolean', description: 'False by default (safe dry-run). Set true to execute installation.' },
      },
    },
  },
  {
    name: 'motionflux_templates',
    description: 'List built-in commercial Stage and Motion.md templates (default, saas-launch, hardware-3d, data-story).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'motionflux_search_atoms',
    description: 'Search the 53 zero-dependency pure motion atoms by effect, property, or keyword.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords, e.g. "spring", "decode", "ripple", "stagger".' },
      },
      required: ['query'],
    },
  },
  {
    name: 'motionflux_init',
    description: 'Scaffold a runnable Stage HTML + Motion.md project from a built-in commercial template.',
    inputSchema: {
      type: 'object',
      properties: {
        outDir: { type: 'string', description: 'Target directory to create.' },
        template: { type: 'string', enum: ['default', 'saas-launch', 'hardware-3d', 'data-story'] },
        aspect: { type: 'string', enum: ['16:9', '9:16', '1:1', '4:5'] },
        width: { type: 'number' },
        height: { type: 'number' },
        fps: { type: 'number' },
        durationFrames: { type: 'number' },
        title: { type: 'string' },
      },
      required: ['outDir'],
    },
  },
  {
    name: 'motionflux_plan',
    description: 'Parse and validate a structured Motion.md director script (from file path or inline markdown), returning frame budgets, audio cues, and copy-density diagnostics.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to a Motion.md file.' },
        markdown: { type: 'string', description: 'Inline Motion.md content (used if path is omitted).' },
        aspect: { type: 'string', enum: ['16:9', '9:16', '1:1', '4:5'] },
      },
    },
  },
  {
    name: 'motionflux_compile',
    description: 'Compile a Motion.md file or inline markdown script into a self-contained HTML/CSS/SVG/3D Stage project directory.',
    inputSchema: {
      type: 'object',
      properties: {
        outDir: { type: 'string', description: 'Output directory for index.html, Motion.md, and stage.plan.json.' },
        path: { type: 'string', description: 'Path to source Motion.md.' },
        markdown: { type: 'string', description: 'Inline Motion.md content if path is omitted.' },
        aspect: { type: 'string', enum: ['16:9', '9:16', '1:1', '4:5'] },
      },
      required: ['outDir'],
    },
  },
  {
    name: 'motionflux_audit',
    description: 'Run Visual Audit 2.0 in headless Chrome on a Stage index.html or Motion.md, checking clipping, overflow, overlap, and WCAG contrast with exact CSS selector & fix hints.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to index.html or Motion.md.' },
        frames: { type: 'array', items: { type: 'number' }, description: 'Optional explicit frame numbers to audit.' },
        contactSheetOut: { type: 'string', description: 'Optional path to save annotated contact sheet PNG.' },
      },
      required: ['path'],
    },
  },
  {
    name: 'motionflux_render',
    description: 'Render a Stage index.html or Motion.md to MP4 (H.264), MOV (ProRes 4444), or WebM (VP9) with procedural SFX/audio muxing and optional pre-render audit.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to Stage index.html or Motion.md.' },
        outPath: { type: 'string', description: 'Output video path (.mp4, .mov, or .webm).' },
        quality: { type: 'string', enum: ['cinema', 'standard'], description: 'Defaults to "cinema" (-preset slow -crf 15).' },
        crf: { type: 'number' },
        transparent: { type: 'boolean' },
        scale: { type: 'number' },
        runAudit: { type: 'boolean' },
        aspect: { type: 'string', enum: ['16:9', '9:16', '1:1', '4:5'] },
      },
      required: ['path', 'outPath'],
    },
  },
  {
    name: 'motionflux_inspect_video',
    description: 'Inspect a reference video via ffprobe + FFmpeg scene-cut detection (scdet), generate a contact sheet PNG, and scaffold a breakdown.template.json.',
    inputSchema: {
      type: 'object',
      properties: {
        videoPath: { type: 'string', description: 'Path to reference video file.' },
        outDir: { type: 'string', description: 'Directory to write source-sheet.png, inspection.json, and breakdown.template.json.' },
        tiles: { type: 'number', description: 'Number of contact sheet tiles (4–24, default 9).' },
      },
      required: ['videoPath', 'outDir'],
    },
  },
] as const;

async function withTempStageFromPath(
  inputPath: string,
  aspect: string | undefined,
  fn: (entryHtml: string) => Promise<unknown>,
): Promise<unknown> {
  const abs = resolve(inputPath);
  if (!/\.md$/iu.test(abs)) return fn(abs);
  const doc = parseMotionMd(await readFile(abs, 'utf8'), aspect ? { aspect } : {});
  const html = compileMotionMdToHtml(doc);
  const tempHtml = join(dirname(abs), `.mf-mcp-${process.pid}-${Date.now()}.html`);
  await writeFile(tempHtml, html);
  try {
    return await fn(tempHtml);
  } finally {
    await rm(tempHtml, { force: true });
  }
}

export async function dispatchMcpRequest(
  req: JsonRpcRequest,
  motionfluxRoot: string,
): Promise<Record<string, unknown> | null> {
  if (req.id === undefined) return null; // JSON-RPC notification

  const ok = (result: unknown) => ({ jsonrpc: '2.0', id: req.id, result });
  const err = (code: number, message: string) => ({ jsonrpc: '2.0', id: req.id, error: { code, message } });

  try {
    if (req.method === 'initialize') {
      const clientProto = typeof req.params?.protocolVersion === 'string' ? req.params.protocolVersion : '2024-11-05';
      return ok({
        protocolVersion: clientProto,
        capabilities: {
          tools: {},
          resources: {},
        },
        serverInfo: {
          name: 'motionflux',
          version: ENGINE_VERSION,
        },
      });
    }

    if (req.method === 'ping') {
      return ok({});
    }

    if (req.method === 'tools/list') {
      return ok({ tools: MCP_TOOLS });
    }

    if (req.method === 'resources/list') {
      return ok({
        resources: MCP_RESOURCES.map(({ uri, name, mimeType }) => ({ uri, name, mimeType })),
      });
    }

    if (req.method === 'resources/read') {
      const uri = String(req.params?.uri ?? '');
      const found = MCP_RESOURCES.find((r) => r.uri === uri);
      if (!found) return err(-32602, `Unknown resource URI: ${uri}`);
      const text = await readFile(join(motionfluxRoot, found.relPath), 'utf8');
      return ok({
        contents: [{ uri: found.uri, mimeType: found.mimeType, text }],
      });
    }

    if (req.method === 'tools/call') {
      const name = String(req.params?.name ?? '');
      const toolArgs = (req.params?.arguments ?? {}) as Record<string, unknown>;
      const runtimeSource = join(motionfluxRoot, 'stage', 'runtime.mjs');
      const hasRuntime = await stat(runtimeSource).then(() => true, () => false);

      const wrapToolResult = async (fn: () => Promise<unknown>) => {
        try {
          const data = await fn();
          return ok({
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
          });
        } catch (toolErr) {
          const message = toolErr instanceof Error ? toolErr.message : String(toolErr);
          return ok({
            isError: true,
            content: [{ type: 'text', text: message }],
          });
        }
      };

      if (name === 'motionflux_doctor') {
        return wrapToolResult(async () => {
          const backend = typeof toolArgs.backend === 'string' ? toolArgs.backend : 'all';
          const browserArg = typeof toolArgs.browser === 'string' ? toolArgs.browser : undefined;
          const jsOk = Number(process.versions.node.split('.')[0]) >= 22;
          if (backend === 'js') return { backend, available: jsOk, node: process.version, capabilities: capabilities.length };
          if (backend === 'webgl2') {
            const br = await findBrowser(browserArg);
            return br ? { backend, browser: br, ...(await probeWebGL2(br)) } : { backend, available: false };
          }
          if (backend === 'webgpu') {
            const br = await findBrowser(browserArg);
            return br ? { backend, browser: br, ...(await probeWebGPU(br)) } : { backend, available: false };
          }
          const br = await findBrowser(browserArg);
          const ff = toolVersion(ffmpegPath());
          const managers = detectPackageManagers();
          const missing: ('browser' | 'ffmpeg')[] = [];
          if (!br) missing.push('browser');
          if (!ff) missing.push('ffmpeg');
          return {
            backend: 'all',
            available: jsOk && Boolean(br) && Boolean(ff),
            node: { available: jsOk, version: process.version },
            browser: br ? { available: true, path: br } : { available: false },
            ffmpeg: ff ? { available: true, version: ff } : { available: false },
            packageManagers: managers,
            missing,
          };
        });
      }

      if (name === 'motionflux_setup') {
        return wrapToolResult(async () => {
          const target = typeof toolArgs.target === 'string' ? toolArgs.target : 'all';
          const manager = typeof toolArgs.manager === 'string' ? toolArgs.manager : 'auto';
          const apply = Boolean(toolArgs.apply);
          const br = await findBrowser();
          const ff = toolVersion(ffmpegPath());
          const wanted: ('browser' | 'ffmpeg')[] = target === 'all' ? ['browser', 'ffmpeg'] : [target as 'browser' | 'ffmpeg'];
          const missing = wanted.filter((c) => (c === 'browser' ? !br : !ff));
          const plan = buildInstallPlan(missing, detectPackageManagers(), manager);
          if (!apply) return { applied: false, missing, steps: plan.steps, blocked: plan.blocked };
          if (plan.blocked.length > 0) throw new Error(`SETUP_BLOCKED: ${plan.blocked.map((b) => b.reason).join(' ')}`);
          const executed = [];
          for (const step of plan.steps) {
            const res = await runInstallStep(step);
            executed.push({ component: step.component, command: step.command, ok: res.ok, code: res.code });
            if (!res.ok) throw new Error(`SETUP_FAILED: ${step.command} exited ${res.code}`);
          }
          return { applied: true, executed };
        });
      }

      if (name === 'motionflux_templates') {
        return wrapToolResult(async () => ({ templates: listStageTemplates() }));
      }

      if (name === 'motionflux_search_atoms') {
        return wrapToolResult(async () => ({
          capabilities: searchCapabilities(String(toolArgs.query ?? '')),
        }));
      }

      if (name === 'motionflux_init') {
        return wrapToolResult(async () =>
          initStageProject({
            outDir: String(toolArgs.outDir),
            ...(typeof toolArgs.template === 'string' ? { template: toolArgs.template } : {}),
            ...(typeof toolArgs.aspect === 'string' ? { aspect: toolArgs.aspect } : {}),
            ...(typeof toolArgs.width === 'number' ? { width: toolArgs.width } : {}),
            ...(typeof toolArgs.height === 'number' ? { height: toolArgs.height } : {}),
            ...(typeof toolArgs.fps === 'number' ? { fps: toolArgs.fps } : {}),
            ...(typeof toolArgs.durationFrames === 'number' ? { durationFrames: toolArgs.durationFrames } : {}),
            ...(typeof toolArgs.title === 'string' ? { title: toolArgs.title } : {}),
            ...(hasRuntime ? { runtimeSourcePath: runtimeSource } : {}),
          }),
        );
      }

      if (name === 'motionflux_plan') {
        return wrapToolResult(async () => {
          const raw =
            typeof toolArgs.path === 'string'
              ? await readFile(resolve(toolArgs.path), 'utf8')
              : String(toolArgs.markdown ?? '');
          return parseMotionMd(raw, typeof toolArgs.aspect === 'string' ? { aspect: toolArgs.aspect } : {});
        });
      }

      if (name === 'motionflux_compile') {
        return wrapToolResult(async () => {
          const outDir = String(toolArgs.outDir);
          const aspect = typeof toolArgs.aspect === 'string' ? toolArgs.aspect : undefined;
          if (typeof toolArgs.path === 'string') {
            return compileMotionMdProject(toolArgs.path, {
              outDir,
              ...(aspect ? { aspect } : {}),
              ...(hasRuntime ? { runtimeSourcePath: runtimeSource } : {}),
            });
          }
          const work = await mkdtemp(join(tmpdir(), 'motionflux-mcp-md-'));
          try {
            const mdPath = join(work, 'Motion.md');
            await writeFile(mdPath, String(toolArgs.markdown ?? ''));
            return await compileMotionMdProject(mdPath, {
              outDir,
              ...(aspect ? { aspect } : {}),
              ...(hasRuntime ? { runtimeSourcePath: runtimeSource } : {}),
            });
          } finally {
            await rm(work, { recursive: true, force: true });
          }
        });
      }

      if (name === 'motionflux_audit') {
        try {
          const inputPath = String(toolArgs.path);
          const frames = Array.isArray(toolArgs.frames) ? toolArgs.frames.map(Number) : undefined;
          const contactSheetOut = typeof toolArgs.contactSheetOut === 'string' ? toolArgs.contactSheetOut : undefined;
          const report = (await withTempStageFromPath(inputPath, undefined, (entryHtml) =>
            auditStage(entryHtml, {
              motionfluxRoot,
              ...(frames ? { frames } : {}),
              ...(contactSheetOut ? { contactSheetOut } : {}),
            }),
          )) as { contactSheet?: string };
          const content: Array<Record<string, unknown>> = [{ type: 'text', text: JSON.stringify(report, null, 2) }];
          if (report.contactSheet) {
            const pngBytes = await readFile(report.contactSheet);
            content.push({ type: 'image', data: pngBytes.toString('base64'), mimeType: 'image/png' });
          }
          return ok({ content });
        } catch (auditErr) {
          return ok({
            isError: true,
            content: [{ type: 'text', text: auditErr instanceof Error ? auditErr.message : String(auditErr) }],
          });
        }
      }

      if (name === 'motionflux_render') {
        return wrapToolResult(async () => {
          const inputPath = String(toolArgs.path);
          const outPath = String(toolArgs.outPath);
          await mkdir(dirname(resolve(outPath)), { recursive: true });
          const aspect = typeof toolArgs.aspect === 'string' ? toolArgs.aspect : undefined;
          return withTempStageFromPath(inputPath, aspect, (entryHtml) =>
            renderStageVideo(entryHtml, {
              outPath,
              motionfluxRoot,
              quality: typeof toolArgs.quality === 'string' ? toolArgs.quality : 'cinema',
              ...(typeof toolArgs.crf === 'number' ? { crf: toolArgs.crf } : {}),
              transparent: Boolean(toolArgs.transparent),
              ...(typeof toolArgs.scale === 'number' ? { scale: toolArgs.scale } : {}),
              runAudit: toolArgs.runAudit !== false,
            }),
          );
        });
      }

      if (name === 'motionflux_inspect_video') {
        return wrapToolResult(async () =>
          inspectReferenceVideo(String(toolArgs.videoPath), {
            outDir: String(toolArgs.outDir),
            ...(typeof toolArgs.tiles === 'number' ? { tiles: toolArgs.tiles } : {}),
          }),
        );
      }

      return err(-32601, `Unknown tool: ${name}`);
    }

    return err(-32601, `Method not found: ${req.method}`);
  } catch (error) {
    return err(-32603, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Run the zero-dependency MotionFlux MCP server over stdio.
 * Auto-detects both newline-delimited JSON-RPC 2.0 (MCP 2024-11-05 / 2025-03-26)
 * and Content-Length header framing.
 */
export async function runMcpStdioServer(motionfluxRoot: string): Promise<void> {
  // Ensure any incidental console output goes to stderr so stdout remains clean JSON-RPC
  console.log = (...args: unknown[]) => {
    process.stderr.write(`${args.map(String).join(' ')}\n`);
  };

  await new Promise<void>((done) => {
    let buffer: Buffer = Buffer.alloc(0);
    let queue = Promise.resolve();

    const send = (payload: Record<string, unknown>, mode: 'jsonl' | 'content-length') => {
      const json = JSON.stringify(payload);
      if (mode === 'content-length') {
        process.stdout.write(`Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`);
      } else {
        process.stdout.write(`${json}\n`);
      }
    };

    const drain = () => {
      while (buffer.length > 0) {
        // Trim leading CR/LF between messages
        let start = 0;
        while (start < buffer.length && (buffer[start] === 0x0d || buffer[start] === 0x0a)) start++;
        if (start > 0) buffer = buffer.subarray(start);
        if (buffer.length === 0) break;

        const headAscii = buffer.subarray(0, Math.min(32, buffer.length)).toString('ascii');
        if (/^content-length:/iu.test(headAscii)) {
          const sepCrLf = buffer.indexOf('\r\n\r\n');
          const sepLf = buffer.indexOf('\n\n');
          const hasCrLf = sepCrLf !== -1 && (sepLf === -1 || sepCrLf < sepLf);
          const sepIdx = hasCrLf ? sepCrLf : sepLf;
          const sepLen = hasCrLf ? 4 : 2;
          if (sepIdx === -1) break;
          const headerText = buffer.subarray(0, sepIdx).toString('ascii');
          const lenMatch = headerText.match(/content-length:\s*(\d+)/iu);
          if (!lenMatch) {
            buffer = buffer.subarray(sepIdx + sepLen);
            continue;
          }
          const bodyBytes = Number(lenMatch[1]);
          if (buffer.length < sepIdx + sepLen + bodyBytes) break;
          const rawJson = buffer.subarray(sepIdx + sepLen, sepIdx + sepLen + bodyBytes).toString('utf8');
          buffer = buffer.subarray(sepIdx + sepLen + bodyBytes);
          queue = queue.then(async () => {
            const parsed = JSON.parse(rawJson) as JsonRpcRequest;
            const reply = await dispatchMcpRequest(parsed, motionfluxRoot);
            if (reply) send(reply, 'content-length');
          });
        } else {
          const nlIdx = buffer.indexOf(0x0a);
          if (nlIdx === -1) break;
          const rawLine = buffer.subarray(0, nlIdx).toString('utf8').trim();
          buffer = buffer.subarray(nlIdx + 1);
          if (!rawLine) continue;
          queue = queue.then(async () => {
            const parsed = JSON.parse(rawLine) as JsonRpcRequest;
            const reply = await dispatchMcpRequest(parsed, motionfluxRoot);
            if (reply) send(reply, 'jsonl');
          });
        }
      }
    };

    process.stdin.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      drain();
    });
    process.stdin.once('end', () => {
      void queue.then(() => done());
    });
  });
}

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.wasm': 'application/wasm',
};

function safeJoin(root: string, relPath: string): string | undefined {
  const clean = normalize(relPath).replace(/^(\.\.[/\\])+/u, '');
  const full = resolve(root, clean);
  const absRoot = resolve(root);
  if (full !== absRoot && !full.startsWith(`${absRoot}${sep}`)) return undefined;
  return full;
}

export interface StageServer {
  url: string;
  port: number;
  close(): Promise<void>;
}

/**
 * Start a local-only HTTP server for serving HTML Stage compositions without `file://` ESM/CORS restrictions.
 * Automatically mounts `/__motionflux/stage/*` and `/__motionflux/atoms/*` from `motionfluxRoot` when provided.
 */
export async function startStageServer(
  projectDir: string,
  options: { motionfluxRoot?: string; port?: number } = {},
): Promise<StageServer> {
  const absProject = resolve(projectDir);
  const absMfRoot = options.motionfluxRoot ? resolve(options.motionfluxRoot) : undefined;

  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const rawUrl = req.url ?? '/';
      const pathname = decodeURIComponent(rawUrl.split('?')[0] ?? '/');
      let filePath: string | undefined;

      if (absMfRoot && pathname.startsWith('/__motionflux/')) {
        const sub = pathname.slice('/__motionflux/'.length);
        if (sub.startsWith('stage/') || sub.startsWith('atoms/')) {
          filePath = safeJoin(absMfRoot, sub);
        }
      } else {
        const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/u, '');
        filePath = safeJoin(absProject, rel);
      }

      if (!filePath) {
        res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      let info = await stat(filePath).catch(() => undefined);
      if (info?.isDirectory()) {
        filePath = join(filePath, 'index.html');
        info = await stat(filePath).catch(() => undefined);
      }
      if (!info || !info.isFile()) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(`Not found: ${pathname}`);
        return;
      }

      const contentType = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
      const rangeHeader = req.headers.range;
      res.setHeader('access-control-allow-origin', '*');
      res.setHeader('cache-control', 'no-store');
      res.setHeader('accept-ranges', 'bytes');

      if (rangeHeader && /^bytes=\d*-\d*$/u.test(rangeHeader)) {
        const [startStr, endStr] = rangeHeader.replace(/^bytes=/u, '').split('-');
        const start = startStr ? Number(startStr) : 0;
        const end = endStr ? Math.min(Number(endStr), info.size - 1) : info.size - 1;
        if (start > end || start >= info.size) {
          res.writeHead(416, { 'content-range': `bytes */${info.size}` });
          res.end();
          return;
        }
        res.writeHead(206, {
          'content-type': contentType,
          'content-length': String(end - start + 1),
          'content-range': `bytes ${start}-${end}/${info.size}`,
        });
        createReadStream(filePath, { start, end }).pipe(res);
        return;
      }

      res.writeHead(200, {
        'content-type': contentType,
        'content-length': String(info.size),
      });
      createReadStream(filePath).pipe(res);
    } catch (error) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(error instanceof Error ? error.message : String(error));
    }
  };

  const server = createServer((req, res) => {
    void handler(req, res);
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(options.port ?? 0, '127.0.0.1', () => {
      server.off('error', rejectListen);
      resolveListen();
    });
  });

  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : (options.port ?? 0);
  return {
    url: `http://127.0.0.1:${port}`,
    port,
    close: () => new Promise<void>((done) => server.close(() => done())),
  };
}

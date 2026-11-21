import { spawn, spawnSync } from 'node:child_process';
import { access, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const home = () => homedir();

const staticBrowserCandidates = (): string[] => [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  join(home(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
  join(home(), 'Applications/Chromium.app/Contents/MacOS/Chromium'),
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
  '/snap/bin/chromium',
  '/var/lib/flatpak/exports/bin/com.google.Chrome',
  '/var/lib/flatpak/exports/bin/org.chromium.Chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ...(process.env['LOCALAPPDATA']
    ? [
        join(process.env['LOCALAPPDATA'], 'Google\\Chrome\\Application\\chrome.exe'),
        join(process.env['LOCALAPPDATA'], 'Chromium\\Application\\chrome.exe'),
        join(process.env['LOCALAPPDATA'], 'Microsoft\\Edge\\Application\\msedge.exe'),
      ]
    : []),
];

const pathBinaries = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'msedge'];

/** Resolve a command name on PATH to its executable path, or undefined when absent. */
export function resolveOnPath(binary: string): string | undefined {
  const locator = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(locator, [binary], { encoding: 'utf8' });
  if (result.status !== 0) return undefined;
  const first = result.stdout.split(/\r?\n/u).map((line) => line.trim()).find(Boolean);
  return first || undefined;
}

async function exists(path: string | undefined): Promise<boolean> {
  return Boolean(path && (await access(path).then(() => true, () => false)));
}

/** Discover Chromium binaries installed in Playwright's user cache (`npx playwright install chromium`). */
async function playwrightChromiumCandidates(): Promise<string[]> {
  const roots = [
    process.env['PLAYWRIGHT_BROWSERS_PATH'],
    process.platform === 'darwin'
      ? join(home(), 'Library/Caches/ms-playwright')
      : process.platform === 'win32'
        ? join(process.env['LOCALAPPDATA'] ?? join(home(), 'AppData/Local'), 'ms-playwright')
        : join(home(), '.cache/ms-playwright'),
  ].filter((item): item is string => Boolean(item));

  const found: string[] = [];
  for (const root of roots) {
    const entries = await readdir(root).catch(() => [] as string[]);
    const dirs = entries
      .filter((name) => name.startsWith('chromium-'))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const dir of dirs) {
      const base = join(root, dir);
      const rels =
        process.platform === 'darwin'
          ? [
              'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
              'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
              'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
            ]
          : process.platform === 'win32'
            ? ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe']
            : ['chrome-linux64/chrome', 'chrome-linux/chrome'];
      for (const rel of rels) found.push(join(base, rel));
    }
  }
  return found;
}

/** Locate an installed Chromium-family browser across explicit flags, env vars, OS paths, PATH and Playwright cache. */
export async function discoverBrowser(explicit?: string): Promise<string | undefined> {
  if (explicit) return (await exists(explicit)) ? explicit : undefined;
  if (process.env['MOTIONFLUX_BROWSER_PATH'] && (await exists(process.env['MOTIONFLUX_BROWSER_PATH']))) {
    return process.env['MOTIONFLUX_BROWSER_PATH'];
  }
  for (const candidate of staticBrowserCandidates()) {
    if (await exists(candidate)) return candidate;
  }
  for (const bin of pathBinaries) {
    const resolved = resolveOnPath(bin);
    if (resolved && (await exists(resolved))) return resolved;
  }
  for (const pw of await playwrightChromiumCandidates()) {
    if (await exists(pw)) return pw;
  }
  return undefined;
}

export type PackageManager = 'brew' | 'apt' | 'dnf' | 'pacman' | 'apk' | 'winget' | 'scoop' | 'choco' | 'playwright';

/** Detect available system and user-space package managers on the current host. */
export function detectPackageManagers(): PackageManager[] {
  const checks: [PackageManager, string][] =
    process.platform === 'darwin'
      ? [
          ['brew', 'brew'],
          ['playwright', 'npx'],
        ]
      : process.platform === 'win32'
        ? [
            ['winget', 'winget'],
            ['scoop', 'scoop'],
            ['choco', 'choco'],
            ['playwright', 'npx'],
          ]
        : [
            ['apt', 'apt-get'],
            ['dnf', 'dnf'],
            ['pacman', 'pacman'],
            ['apk', 'apk'],
            ['brew', 'brew'],
            ['playwright', 'npx'],
          ];
  return checks.filter(([, bin]) => Boolean(resolveOnPath(bin))).map(([id]) => id);
}

export interface InstallStep {
  component: 'browser' | 'ffmpeg';
  manager: PackageManager;
  command: string;
  argv: [string, ...string[]];
  requiresPrivilege?: boolean;
}

function withPrivilege(argv: [string, ...string[]]): { argv: [string, ...string[]]; requiresPrivilege: boolean } {
  if (process.platform === 'win32' || (typeof process.getuid === 'function' && process.getuid() === 0)) {
    return { argv, requiresPrivilege: false };
  }
  return { argv: ['sudo', '-n', ...argv], requiresPrivilege: true };
}

/** Build deterministic installation commands for missing `browser` and/or `ffmpeg` components. */
export function buildInstallPlan(
  missing: readonly ('browser' | 'ffmpeg')[],
  availableManagers: readonly PackageManager[],
  preferredManager = 'auto',
): { steps: InstallStep[]; blocked: { component: 'browser' | 'ffmpeg'; reason: string }[] } {
  const validManagers = ['auto', 'brew', 'apt', 'dnf', 'pacman', 'apk', 'winget', 'scoop', 'choco', 'playwright'];
  if (!validManagers.includes(preferredManager)) {
    throw new Error(`USAGE: --manager must be one of ${validManagers.join(', ')}; got "${preferredManager}".`);
  }

  const pick = (...choices: PackageManager[]): PackageManager | undefined => {
    if (preferredManager !== 'auto') {
      const explicit = preferredManager as PackageManager;
      return choices.includes(explicit) && availableManagers.includes(explicit) ? explicit : undefined;
    }
    return choices.find((m) => availableManagers.includes(m));
  };

  const steps: InstallStep[] = [];
  const blocked: { component: 'browser' | 'ffmpeg'; reason: string }[] = [];

  for (const component of missing) {
    if (component === 'browser') {
      // Prefer user-space Playwright Chromium on Unix when auto-selecting so installation succeeds without sudo.
      const mgr =
        process.platform === 'win32'
          ? pick('winget', 'scoop', 'choco', 'playwright')
          : pick('playwright', 'brew', 'apt', 'dnf', 'pacman', 'apk');
      if (!mgr) {
        blocked.push({
          component,
          reason:
            preferredManager === 'auto'
              ? 'No supported installer (npx, brew, apt-get, dnf, pacman, apk, winget, scoop, choco) was found on PATH.'
              : `Manager "${preferredManager}" is either not installed or cannot install ${component}.`,
        });
        continue;
      }
      const spec: { argv: [string, ...string[]]; requiresPrivilege?: boolean } =
        mgr === 'playwright'
          ? { argv: ['npx', '-y', 'playwright', 'install', 'chromium'] }
          : mgr === 'brew'
            ? { argv: ['brew', 'install', '--cask', 'chromium'] }
            : mgr === 'winget'
              ? { argv: ['winget', 'install', '--id', 'Google.Chrome', '-e', '--accept-source-agreements', '--accept-package-agreements'] }
              : mgr === 'scoop'
                ? { argv: ['scoop', 'install', 'chromium'] }
                : mgr === 'choco'
                  ? { argv: ['choco', 'install', 'googlechrome', '-y'] }
                  : mgr === 'apt'
                    ? withPrivilege(['apt-get', 'install', '-y', 'chromium'])
                    : mgr === 'dnf'
                      ? withPrivilege(['dnf', 'install', '-y', 'chromium'])
                      : mgr === 'pacman'
                        ? withPrivilege(['pacman', '-S', '--noconfirm', 'chromium'])
                        : withPrivilege(['apk', 'add', 'chromium']);
      steps.push({
        component,
        manager: mgr,
        command: spec.argv.join(' '),
        argv: spec.argv,
        ...(spec.requiresPrivilege ? { requiresPrivilege: true } : {}),
      });
    } else if (component === 'ffmpeg') {
      const mgr = pick('brew', 'winget', 'scoop', 'choco', 'apt', 'dnf', 'pacman', 'apk');
      if (!mgr) {
        blocked.push({
          component,
          reason:
            preferredManager === 'playwright'
              ? 'Playwright only installs browsers; use --manager auto or a system package manager (brew, apt, winget, etc.) for ffmpeg.'
              : preferredManager === 'auto'
                ? 'No system package manager (brew, apt-get, dnf, pacman, apk, winget, scoop, choco) was found on PATH to install ffmpeg.'
                : `Manager "${preferredManager}" is not available on PATH.`,
        });
        continue;
      }
      const spec: { argv: [string, ...string[]]; requiresPrivilege?: boolean } =
        mgr === 'brew'
          ? { argv: ['brew', 'install', 'ffmpeg'] }
          : mgr === 'winget'
            ? { argv: ['winget', 'install', '--id', 'Gyan.FFmpeg', '-e', '--accept-source-agreements', '--accept-package-agreements'] }
            : mgr === 'scoop'
              ? { argv: ['scoop', 'install', 'ffmpeg'] }
              : mgr === 'choco'
                ? { argv: ['choco', 'install', 'ffmpeg', '-y'] }
                : mgr === 'apt'
                  ? withPrivilege(['apt-get', 'install', '-y', 'ffmpeg'])
                  : mgr === 'dnf'
                    ? withPrivilege(['dnf', 'install', '-y', 'ffmpeg'])
                    : mgr === 'pacman'
                      ? withPrivilege(['pacman', '-S', '--noconfirm', 'ffmpeg'])
                      : withPrivilege(['apk', 'add', 'ffmpeg']);
      steps.push({
        component,
        manager: mgr,
        command: spec.argv.join(' '),
        argv: spec.argv,
        ...(spec.requiresPrivilege ? { requiresPrivilege: true } : {}),
      });
    }
  }

  return { steps, blocked };
}

export async function runInstallStep(step: InstallStep): Promise<{ ok: boolean; code: number | null; output: string }> {
  const [cmd, ...rest] = step.argv;
  return new Promise((done) => {
    const child = spawn(cmd, rest, { stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    child.stdout.on('data', (chunk: Buffer) => {
      log += chunk;
    });
    child.stderr.on('data', (chunk: Buffer) => {
      log += chunk;
    });
    child.once('error', (err) => done({ ok: false, code: null, output: err.message }));
    child.once('close', (code) => {
      const tail = log.trim().split(/\r?\n/u).slice(-8).join('\n');
      done({ ok: code === 0, code, output: tail });
    });
  });
}

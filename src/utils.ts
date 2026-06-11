const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const childProcess = require('node:child_process');

export const FS = fs;
export const Path = path;

export function exists(p: string): boolean {
  try { return fs.existsSync(p); } catch { return false; }
}

export function ensureDir(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

export function readText(file: string, maxChars = 1_200_000): string {
  try {
    const buf = fs.readFileSync(file);
    let text = buf.toString('utf8');
    text = text.replace(/\u0000/g, '');
    if (text.length > maxChars) return text.slice(0, maxChars);
    return text;
  } catch {
    return '';
  }
}

export function writeText(file: string, text: string): void {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text, 'utf8');
}

export function writeTextIfChanged(file: string, text: string): boolean {
  try {
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return false;
  } catch {}
  writeText(file, text);
  return true;
}

export function loadJson<T = any>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(file: string, value: any): void {
  writeTextIfChanged(file, JSON.stringify(value, null, 2) + '\n');
}

export function writeJsonIfChanged(file: string, value: any): boolean {
  return writeTextIfChanged(file, JSON.stringify(value, null, 2) + '\n');
}

export function rel(file: string, root: string): string {
  const r = path.relative(root, file).replace(/\\/g, '/');
  return r === '' ? '.' : r;
}

export function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

export function utcNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function sha1Short(value: string, len = 10): string {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, len);
}

export function cleanId(value: string): string {
  return String(value || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

export function countLines(file: string): number {
  const text = readText(file, 5_000_000);
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

export function getLine(file: string, line: number): string {
  if (!line || line < 1) return '';
  const text = readText(file, 5_000_000);
  if (!text) return '';
  return (text.split(/\r?\n/)[line - 1] || '').trim();
}

export function escapeHtml(value: any): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeJsonForHtml(value: any): string {
  return JSON.stringify(value ?? {}, null, 0)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export function asList(value: any): any[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return [value];
  return [];
}

export function mergeDict(target: any, incoming: any): any {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return target;
  for (const [key, value] of Object.entries(incoming)) {
    if (Array.isArray(value)) {
      if (!Array.isArray(target[key])) target[key] = [];
      target[key].push(...value);
    } else if (value && typeof value === 'object') {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
      mergeDict(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

export function listFileInventory(root: string, maxFileSize: number): { included: string[], skipped: any[] } {
  const out: string[] = [];
  const skipped: any[] = [];
  const ignored = new Set([
    '.git', '.hg', '.svn', 'node_modules', 'vendor', '.venv', '.venvs', 'venv', 'venvs', '__pycache__', '.mypy_cache', '.pytest_cache', '.tox', '.nox', '.ruff_cache',
    'dist', 'build', 'out', 'target', '.gradle', '.idea', '.vscode', '.analysis', '.analysis-seed', 'coverage', '.next', '.turbo', '.cache'
  ]);
  const ignoredFiles = new Set(['.DS_Store', 'Thumbs.db']);
  function walk(dir: string): void {
    let entries: any[] = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (ignored.has(entry.name)) continue;
      if (entry.name.startsWith('.verify-tmp-')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        if (ignoredFiles.has(entry.name)) continue;
        try {
          const st = fs.statSync(full);
          if (st.size <= maxFileSize) out.push(full);
          else skipped.push({ path: rel(full, root), bytes: st.size, reason: 'exceeds_max_file_size' });
        } catch {}
      }
    }
  }
  walk(root);
  return { included: out.sort(), skipped: skipped.sort((a, b) => String(a.path).localeCompare(String(b.path))) };
}

export function listFiles(root: string, maxFileSize: number): string[] {
  return listFileInventory(root, maxFileSize).included;
}

export function gitCommit(root: string): string | null {
  try {
    return childProcess.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').trim() || null;
  } catch {
    return null;
  }
}

export function copyRecursive(src: string, dst: string, force = false): void {
  if (!fs.existsSync(src)) return;
  if (fs.existsSync(dst) && force) fs.rmSync(dst, { recursive: true, force: true });
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    ensureDir(dst);
    for (const child of fs.readdirSync(src)) copyRecursive(path.join(src, child), path.join(dst, child), force);
  } else {
    if (force || !fs.existsSync(dst)) {
      ensureDir(path.dirname(dst));
      fs.copyFileSync(src, dst);
    }
  }
}

export function argValue(args: string[], name: string, fallback?: string): string | undefined {
  const i = args.indexOf(name);
  if (i >= 0 && i + 1 < args.length) return args[i + 1];
  return fallback;
}

export function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

export function numericArg(args: string[], name: string, fallback: number): number {
  const v = argValue(args, name);
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

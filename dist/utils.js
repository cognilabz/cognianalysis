"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Path = exports.FS = void 0;
exports.exists = exists;
exports.ensureDir = ensureDir;
exports.readText = readText;
exports.writeText = writeText;
exports.loadJson = loadJson;
exports.writeJson = writeJson;
exports.rel = rel;
exports.toPosix = toPosix;
exports.utcNow = utcNow;
exports.sha1Short = sha1Short;
exports.cleanId = cleanId;
exports.countLines = countLines;
exports.getLine = getLine;
exports.escapeHtml = escapeHtml;
exports.safeJsonForHtml = safeJsonForHtml;
exports.asList = asList;
exports.mergeDict = mergeDict;
exports.listFiles = listFiles;
exports.gitCommit = gitCommit;
exports.copyRecursive = copyRecursive;
exports.argValue = argValue;
exports.hasFlag = hasFlag;
exports.numericArg = numericArg;
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const childProcess = require('node:child_process');
exports.FS = fs;
exports.Path = path;
function exists(p) {
    try {
        return fs.existsSync(p);
    }
    catch {
        return false;
    }
}
function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}
function readText(file, maxChars = 1200000) {
    try {
        const buf = fs.readFileSync(file);
        let text = buf.toString('utf8');
        text = text.replace(/\u0000/g, '');
        if (text.length > maxChars)
            return text.slice(0, maxChars);
        return text;
    }
    catch {
        return '';
    }
}
function writeText(file, text) {
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, text, 'utf8');
}
function loadJson(file, fallback) {
    try {
        if (!fs.existsSync(file))
            return fallback;
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    catch {
        return fallback;
    }
}
function writeJson(file, value) {
    writeText(file, JSON.stringify(value, null, 2) + '\n');
}
function rel(file, root) {
    const r = path.relative(root, file).replace(/\\/g, '/');
    return r === '' ? '.' : r;
}
function toPosix(p) {
    return p.replace(/\\/g, '/');
}
function utcNow() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}
function sha1Short(value, len = 10) {
    return crypto.createHash('sha1').update(value).digest('hex').slice(0, len);
}
function cleanId(value) {
    return String(value || 'item')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'item';
}
function countLines(file) {
    const text = readText(file, 5000000);
    if (!text)
        return 0;
    return text.split(/\r?\n/).length;
}
function getLine(file, line) {
    if (!line || line < 1)
        return '';
    const text = readText(file, 5000000);
    if (!text)
        return '';
    return (text.split(/\r?\n/)[line - 1] || '').trim();
}
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function safeJsonForHtml(value) {
    return JSON.stringify(value ?? {}, null, 0)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');
}
function asList(value) {
    if (value === null || value === undefined)
        return [];
    if (Array.isArray(value))
        return value;
    if (typeof value === 'object')
        return [value];
    return [];
}
function mergeDict(target, incoming) {
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming))
        return target;
    for (const [key, value] of Object.entries(incoming)) {
        if (Array.isArray(value)) {
            if (!Array.isArray(target[key]))
                target[key] = [];
            target[key].push(...value);
        }
        else if (value && typeof value === 'object') {
            if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key]))
                target[key] = {};
            mergeDict(target[key], value);
        }
        else {
            target[key] = value;
        }
    }
    return target;
}
function listFiles(root, maxFileSize) {
    const out = [];
    const ignored = new Set([
        '.git', '.hg', '.svn', 'node_modules', 'vendor', '.venv', 'venv', '__pycache__', '.mypy_cache', '.pytest_cache',
        'dist', 'build', 'out', 'target', '.gradle', '.idea', '.vscode', '.analysis', 'coverage', '.next', '.turbo', '.cache'
    ]);
    function walk(dir) {
        let entries = [];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (ignored.has(entry.name))
                continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            }
            else if (entry.isFile()) {
                try {
                    const st = fs.statSync(full);
                    if (st.size <= maxFileSize)
                        out.push(full);
                }
                catch { }
            }
        }
    }
    walk(root);
    return out.sort();
}
function gitCommit(root) {
    try {
        return childProcess.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').trim() || null;
    }
    catch {
        return null;
    }
}
function copyRecursive(src, dst, force = false) {
    if (!fs.existsSync(src))
        return;
    if (fs.existsSync(dst) && force)
        fs.rmSync(dst, { recursive: true, force: true });
    const st = fs.statSync(src);
    if (st.isDirectory()) {
        ensureDir(dst);
        for (const child of fs.readdirSync(src))
            copyRecursive(path.join(src, child), path.join(dst, child), force);
    }
    else {
        if (force || !fs.existsSync(dst)) {
            ensureDir(path.dirname(dst));
            fs.copyFileSync(src, dst);
        }
    }
}
function argValue(args, name, fallback) {
    const i = args.indexOf(name);
    if (i >= 0 && i + 1 < args.length)
        return args[i + 1];
    return fallback;
}
function hasFlag(args, name) {
    return args.includes(name);
}
function numericArg(args, name, fallback) {
    const v = argValue(args, name);
    if (!v)
        return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

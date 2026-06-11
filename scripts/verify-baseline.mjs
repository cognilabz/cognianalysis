import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const baselineRoot = join(root, 'benchmarks', 'baseline');
const verifyRoot = mkdtempSync(join(root, '.verify-tmp-baseline-'));
const resultRoot = process.env.COGNIANALYSIS_UPDATE_BENCHMARK_RESULTS === '1'
  ? root
  : verifyRoot;
process.on('exit', () => rmSync(verifyRoot, { recursive: true, force: true }));

function walk(dir, predicate, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, predicate, out);
    else if (stat.isFile() && predicate(full)) out.push(full);
  }
  return out.sort();
}

const baselineFiles = walk(baselineRoot, file => file.endsWith('.baseline.json'));
const baselines = baselineFiles.map(file => {
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  return {
    file: relative(root, file),
    repo: parsed.repo || '',
    baseline_kind: parsed.baseline_kind || parsed.kind || '',
    verdict: parsed.verdict || 'unknown',
    metrics: parsed.metrics || {}
  };
});

const requiredKinds = new Set(['raw_agent_prompt', 'scanner_report']);
const presentKinds = new Set(baselines.map(item => item.baseline_kind).filter(Boolean));
const missingKinds = [...requiredKinds].filter(kind => !presentKinds.has(kind));
const failed = baselines.filter(item => item.verdict !== 'pass');
const result = {
  schemaVersion: '1.0',
  benchmark: 'baseline-comparison',
  generated_at: new Date().toISOString(),
  total_baselines: baselines.length,
  required_baseline_kinds: [...requiredKinds],
  present_baseline_kinds: [...presentKinds],
  missing_baseline_kinds: missingKinds,
  failed_baselines: failed.map(item => item.file),
  verdict: baselines.length > 0 && missingKinds.length === 0 && failed.length === 0 ? 'pass' : 'missing_baselines',
  baselines
};

const outPath = join(resultRoot, 'benchmarks', 'baseline', 'results.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');

console.log(`Baseline benchmark: ${result.verdict}`);
console.log(`Result: ${outPath}`);
console.log(`Baselines: ${baselines.length} · required=${[...requiredKinds].join(', ')}`);
for (const kind of missingKinds) console.log(`MISSING ${kind}`);
for (const item of failed) console.log(`FAIL ${item.file} verdict=${item.verdict}`);
if (result.verdict !== 'pass') process.exit(1);

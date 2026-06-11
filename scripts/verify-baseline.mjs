import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname);
const baselineRoot = join(root, 'benchmarks', 'baseline');
const verifierId = 'scripts/verify-baseline.mjs';
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

const REQUIRED_METRICS = ['fact_recall', 'evidence_precision', 'unsupported_claim_rate', 'decision_usefulness'];

function gitCommit() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  return result.status === 0 ? result.stdout.trim() : '';
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateBaseline(parsed) {
  const errors = [];
  const metrics = parsed.metrics || {};
  if (parsed.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (!String(parsed.repo || '').trim()) errors.push('repo is required');
  if (!String(parsed.baseline_kind || parsed.kind || '').trim()) errors.push('baseline_kind is required');
  if (parsed.verdict !== 'pass') errors.push('verdict must be pass');
  for (const metric of REQUIRED_METRICS) {
    if (!isFiniteNumber(metrics[metric])) errors.push(`metrics.${metric} must be a finite number`);
  }
  for (const metric of ['fact_recall', 'evidence_precision', 'decision_usefulness']) {
    if (isFiniteNumber(metrics[metric]) && (metrics[metric] < 0 || metrics[metric] > 1)) errors.push(`metrics.${metric} must be between 0 and 1`);
  }
  if (isFiniteNumber(metrics.unsupported_claim_rate) && metrics.unsupported_claim_rate < 0) errors.push('metrics.unsupported_claim_rate must be >= 0');
  const provenance = parsed.provenance || parsed.baseline_provenance || {};
  if (!String(provenance.generated_by || provenance.tool || '').trim()) errors.push('provenance.generated_by or provenance.tool is required');
  if (!String(provenance.artifact || provenance.artifact_path || provenance.source || '').trim()) errors.push('provenance.artifact/artifact_path/source is required');
  const comparison = parsed.comparison || parsed.compared_to || {};
  if (!String(comparison.target || comparison.golden_benchmark || comparison.report || '').trim()) errors.push('comparison target/golden_benchmark/report is required');
  return errors;
}

const baselineFiles = walk(baselineRoot, file => file.endsWith('.baseline.json'));
const baselines = baselineFiles.map(file => {
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  const validation_errors = validateBaseline(parsed);
  return {
    file: relative(root, file),
    repo: parsed.repo || '',
    baseline_kind: parsed.baseline_kind || parsed.kind || '',
    verdict: parsed.verdict || 'unknown',
    metrics: parsed.metrics || {},
    validation_errors
  };
});

const requiredKinds = new Set(['raw_agent_prompt', 'scanner_report']);
const presentKinds = new Set(baselines.map(item => item.baseline_kind).filter(Boolean));
const missingKinds = [...requiredKinds].filter(kind => !presentKinds.has(kind));
const failed = baselines.filter(item => item.verdict !== 'pass' || item.validation_errors.length > 0);
const result = {
  schemaVersion: '1.0',
  benchmark: 'baseline-comparison',
  generated_by: verifierId,
  source_commit: gitCommit(),
  generated_at: new Date().toISOString(),
  total_baselines: baselines.length,
  required_baseline_kinds: [...requiredKinds],
  present_baseline_kinds: [...presentKinds],
  missing_baseline_kinds: missingKinds,
  failed_baselines: failed.map(item => ({
    file: item.file,
    validation_errors: item.validation_errors
  })),
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
for (const item of failed) console.log(`FAIL ${item.file} verdict=${item.verdict}${item.validation_errors.length ? ` · ${item.validation_errors.join('; ')}` : ''}`);
if (result.verdict !== 'pass') process.exit(1);

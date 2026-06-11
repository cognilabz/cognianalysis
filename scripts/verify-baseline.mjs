import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

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

function asList(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function numbersEqual(left, right) {
  return typeof left === 'number' && typeof right === 'number' && Math.abs(left - right) < 1e-9;
}

function fileSha1(file) {
  return createHash('sha1').update(readFileSync(file)).digest('hex');
}

function resolveInsideRoot(relativePath) {
  const resolved = resolve(root, relativePath);
  return resolved === root || resolved.startsWith(`${root}/`) ? resolved : '';
}

function readJsonObject(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function rowSnippet(row) {
  return String(row?.artifact_snippet || row?.snippet || row?.evidence_text || row?.matched_text || '').trim();
}

function idSetFrom(value) {
  return new Set(asList(value).map(item => String(item?.id || '').trim()).filter(Boolean));
}

function validateRowsBoundToArtifact(rows, artifactText, label) {
  const errors = [];
  rows.forEach((row, index) => {
    if (!String(row?.id || '').trim()) errors.push(`metric_derivation ${label} row ${index + 1} id is required`);
    const snippet = rowSnippet(row);
    if (!snippet) errors.push(`metric_derivation ${label} row ${row?.id || index + 1} artifact_snippet is required`);
    else if (!artifactText.includes(snippet)) errors.push(`metric_derivation ${label} row ${row?.id || index + 1} artifact_snippet is absent from provenance artifact`);
  });
  return errors;
}

function validateMetricDerivation(parsed, comparisonTargetFile, artifactFile) {
  const errors = [];
  const metrics = parsed.metrics || {};
  const derivation = parsed.metric_derivation || parsed.metricDerivation || {};
  const comparison = parsed.comparison || parsed.compared_to || {};
  const factRows = asList(derivation.fact_rows || derivation.facts || comparison.fact_rows || comparison.facts || parsed.facts || parsed.scored_facts);
  const claimRows = asList(derivation.claim_rows || derivation.claims || comparison.claim_rows || comparison.claims || parsed.claims);
  const decisionRows = asList(derivation.decision_rows || derivation.decisions || comparison.decision_rows || comparison.decisions || parsed.decisions);
  if (factRows.length === 0) errors.push('metric_derivation fact rows are required');
  if (claimRows.length === 0) errors.push('metric_derivation claim rows are required');
  if (decisionRows.length === 0) errors.push('metric_derivation decision rows are required');
  const artifactText = artifactFile && existsSync(artifactFile) ? readFileSync(artifactFile, 'utf8') : '';
  errors.push(...validateRowsBoundToArtifact(factRows, artifactText, 'fact'));
  errors.push(...validateRowsBoundToArtifact(claimRows, artifactText, 'claim'));
  errors.push(...validateRowsBoundToArtifact(decisionRows, artifactText, 'decision'));
  if (comparisonTargetFile && existsSync(comparisonTargetFile)) {
    const target = readJsonObject(comparisonTargetFile);
    const expectedFactIds = idSetFrom(target?.facts || target?.expected_facts);
    const expectedClaimIds = idSetFrom(target?.claims || target?.expected_claims);
    const expectedDecisionIds = idSetFrom(target?.decisions || target?.expected_decisions);
    if (factRows.length > 0 && expectedFactIds.size === 0) errors.push('comparison target fact expectations are required for baseline fact derivation');
    if (claimRows.length > 0 && expectedClaimIds.size === 0) errors.push('comparison target claim expectations are required for baseline claim derivation');
    if (decisionRows.length > 0 && expectedDecisionIds.size === 0) errors.push('comparison target decision expectations are required for baseline decision derivation');
    for (const row of factRows) {
      const id = String(row?.id || '').trim();
      if (id && expectedFactIds.size > 0 && !expectedFactIds.has(id)) errors.push(`metric_derivation fact row ${id} is not present in comparison target facts`);
    }
    for (const row of claimRows) {
      const id = String(row?.id || '').trim();
      if (id && expectedClaimIds.size > 0 && !expectedClaimIds.has(id)) errors.push(`metric_derivation claim row ${id} is not present in comparison target claims`);
    }
    for (const row of decisionRows) {
      const id = String(row?.id || '').trim();
      if (id && expectedDecisionIds.size > 0 && !expectedDecisionIds.has(id)) errors.push(`metric_derivation decision row ${id} is not present in comparison target decisions`);
    }
  }
  if (factRows.length > 0) {
    const foundRows = factRows.filter(row => row?.found === true);
    const evidenceRows = foundRows.filter(row => row?.evidence_present === true || row?.has_evidence === true);
    const factRecall = foundRows.length / factRows.length;
    const evidencePrecision = foundRows.length ? evidenceRows.length / foundRows.length : 0;
    if (!numbersEqual(metrics.fact_recall, factRecall)) errors.push('metrics.fact_recall must match metric_derivation fact rows');
    if (!numbersEqual(metrics.evidence_precision, evidencePrecision)) errors.push('metrics.evidence_precision must match metric_derivation fact rows');
  }
  if (claimRows.length > 0) {
    const unsupported = claimRows.filter(row => row?.unsupported === true || row?.supported === false).length;
    const unsupportedRate = unsupported / claimRows.length;
    if (!numbersEqual(metrics.unsupported_claim_rate, unsupportedRate)) errors.push('metrics.unsupported_claim_rate must match metric_derivation claim rows');
  }
  if (decisionRows.length > 0) {
    const useful = decisionRows.filter(row => row?.useful === true || row?.decision_useful === true).length;
    const decisionUsefulness = useful / decisionRows.length;
    if (!numbersEqual(metrics.decision_usefulness, decisionUsefulness)) errors.push('metrics.decision_usefulness must match metric_derivation decision rows');
  }
  return errors;
}

function validateBaseline(parsed, sourceCommit) {
  const errors = [];
  const metrics = parsed.metrics || {};
  if (parsed.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (!String(parsed.repo || '').trim()) errors.push('repo is required');
  if (!String(parsed.baseline_kind || parsed.kind || '').trim()) errors.push('baseline_kind is required');
  if (parsed.verdict !== 'pass') errors.push('verdict must be pass');
  const provenance = parsed.provenance || parsed.baseline_provenance || {};
  const artifactSourceCommit = String(parsed.source_commit || provenance.source_commit || provenance.sourceCommit || '').trim();
  if (!sourceCommit) errors.push('current source commit is unavailable');
  if (!artifactSourceCommit) errors.push('source_commit is required');
  if (sourceCommit && artifactSourceCommit !== sourceCommit) errors.push(`source_commit must match current HEAD ${sourceCommit}`);
  const artifactPath = String(provenance.artifact || provenance.artifact_path || provenance.source || '').trim();
  const artifactHash = String(provenance.artifact_sha1 || provenance.artifact_hash || provenance.content_hash || provenance.sha1 || '').trim();
  if (!artifactPath) errors.push('provenance artifact path is required');
  const resolvedArtifact = artifactPath ? resolveInsideRoot(artifactPath) : '';
  if (artifactPath && !resolvedArtifact) errors.push('provenance artifact path must stay inside repository root');
  if (resolvedArtifact && !existsSync(resolvedArtifact)) errors.push(`provenance artifact does not exist: ${artifactPath}`);
  if (!artifactHash) errors.push('provenance artifact sha1/hash is required');
  if (resolvedArtifact && existsSync(resolvedArtifact) && artifactHash && fileSha1(resolvedArtifact) !== artifactHash) errors.push('provenance artifact hash does not match');
  for (const metric of REQUIRED_METRICS) {
    if (!isFiniteNumber(metrics[metric])) errors.push(`metrics.${metric} must be a finite number`);
  }
  for (const metric of ['fact_recall', 'evidence_precision', 'decision_usefulness']) {
    if (isFiniteNumber(metrics[metric]) && (metrics[metric] < 0 || metrics[metric] > 1)) errors.push(`metrics.${metric} must be between 0 and 1`);
  }
  if (isFiniteNumber(metrics.unsupported_claim_rate) && metrics.unsupported_claim_rate < 0) errors.push('metrics.unsupported_claim_rate must be >= 0');
  if (!String(provenance.generated_by || provenance.tool || '').trim()) errors.push('provenance.generated_by or provenance.tool is required');
  const comparison = parsed.comparison || parsed.compared_to || {};
  const comparisonTarget = String(comparison.target || comparison.golden_benchmark || comparison.report || '').trim();
  if (!comparisonTarget) errors.push('comparison target/golden_benchmark/report is required');
  const resolvedComparison = comparisonTarget ? resolveInsideRoot(comparisonTarget) : '';
  if (comparisonTarget && !resolvedComparison) errors.push('comparison target must stay inside repository root');
  if (resolvedComparison && !existsSync(resolvedComparison)) errors.push(`comparison target does not exist: ${comparisonTarget}`);
  errors.push(...validateMetricDerivation(parsed, resolvedComparison, resolvedArtifact));
  return errors;
}

const sourceCommit = gitCommit();
const baselineFiles = walk(baselineRoot, file => file.endsWith('.baseline.json'));
const baselines = baselineFiles.map(file => {
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  const validation_errors = validateBaseline(parsed, sourceCommit);
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
  source_commit: sourceCommit,
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

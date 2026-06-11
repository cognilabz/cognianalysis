import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const cli = join(root, 'dist', 'cli.js');
const goldenRoot = join(root, 'benchmarks', 'golden');
const verifyRoot = mkdtempSync(join(root, '.verify-tmp-golden-'));
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

function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  if (result.status !== 0) {
    throw new Error(`Command failed with exit ${result.status}: cognianalysis ${args.join(' ')}\n${result.stdout || ''}\n${result.stderr || ''}`);
  }
  return result;
}

function asList(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function hasEvidence(item) {
  return asList(item?.evidence).length > 0;
}

function add(out, text, item, source) {
  const value = String(text || '').trim();
  if (!value) return;
  out.push({ text: value, source, has_evidence: hasEvidence(item) });
}

function reportFacts(bundle) {
  const out = [];
  for (const section of asList(bundle.analysis_document?.sections)) {
    for (const block of asList(section?.blocks)) {
      const type = String(block?.type || 'narrative').toLowerCase();
      for (const item of asList(block?.entries)) add(out, item.name || item.title, item, `${section.id || section.title}:${type}:entry`);
      for (const item of asList(block?.exits)) add(out, item.name || item.title, item, `${section.id || section.title}:${type}:exit`);
      for (const item of asList(block?.state)) add(out, item.name || item.title, item, `${section.id || section.title}:${type}:state`);
      for (const item of asList(block?.steps)) add(out, item.description || item.title, item, `${section.id || section.title}:${type}:step`);
      for (const item of asList(block?.items)) add(out, item.title || item.name || item.description, item, `${section.id || section.title}:${type}:item`);
      for (const item of asList(block?.rows)) {
        add(out, item.decision, item, `${section.id || section.title}:${type}:decision`);
        add(out, item.recommendation, item, `${section.id || section.title}:${type}:recommendation`);
      }
      for (const item of asList(block?.levels)) add(out, item.level || item.title, item, `${section.id || section.title}:${type}:level`);
      for (const item of asList(block?.families)) add(out, item.name || item.title, item, `${section.id || section.title}:${type}:family`);
    }
  }
  return out;
}

function scoreExpected(expectedPath) {
  const expected = JSON.parse(readFileSync(expectedPath, 'utf8'));
  const sourceRepo = join(root, expected.repo);
  const repo = join(verifyRoot, 'repos', expected.benchmark || relative(goldenRoot, expectedPath).replace(/\.expected\.json$/, ''));
  cpSync(sourceRepo, repo, { recursive: true });
  const analysis = join(repo, '.analysis');
  rmSync(analysis, { recursive: true, force: true });
  run(['analyze', repo, '--goal', expected.goal || 'Create a decision report for this repository.']);

  const bundlePath = join(analysis, 'data', 'bundle.json');
  if (!existsSync(bundlePath)) throw new Error(`Missing bundle: ${bundlePath}`);
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
  const facts = reportFacts(bundle);
  const scoredFacts = expected.facts.map(fact => {
    const hit = facts.find(item => item.text === fact.expected || item.text.includes(fact.expected));
    return {
      ...fact,
      found: !!hit,
      matched_text: hit?.text || '',
      source: hit?.source || '',
      evidence_present: !!hit && (!fact.evidence_required || hit.has_evidence)
    };
  });

  const foundCount = scoredFacts.filter(fact => fact.found).length;
  const evidenceCount = scoredFacts.filter(fact => fact.found && fact.evidence_present).length;
  const unsupportedClaimCount = Number(bundle.analysis_document_report_lint?.unsupported_claim_count || 0);
  const factRecall = scoredFacts.length ? foundCount / scoredFacts.length : 0;
  const evidencePrecision = foundCount ? evidenceCount / foundCount : 0;
  const unsupportedClaimRate = facts.length ? unsupportedClaimCount / facts.length : unsupportedClaimCount;
  const decisionReadiness = bundle.final_llm_readiness?.state === 'ready' ? 1 : 0;
  const reportCompleteness = bundle.analysis_document_report_lint?.complete === true && bundle.analysis_document_component_coverage?.complete === true ? 1 : 0;
  const invalidEvidence = (bundle.evidence_index || []).filter(item => item.valid === false).length;

  const result = {
    schemaVersion: '1.0',
    benchmark: expected.benchmark || relative(goldenRoot, expectedPath).replace(/\.expected\.json$/, ''),
    expected_file: relative(root, expectedPath),
    repo: expected.repo,
    generated_at: new Date().toISOString(),
    metrics: {
      fact_recall: factRecall,
      evidence_precision: evidencePrecision,
      unsupported_claim_rate: unsupportedClaimRate,
      decision_readiness: decisionReadiness,
      report_completeness: reportCompleteness,
      invalid_evidence: invalidEvidence
    },
    minimums: expected.minimums,
    facts: scoredFacts,
    unsupported_claims: bundle.analysis_document_report_lint?.unsupported_claims || [],
    verdict: 'pass'
  };

  const failures = [];
  for (const [metric, minimum] of Object.entries(expected.minimums || {})) {
    const actual = result.metrics[metric];
    if (typeof actual !== 'number' || actual < minimum) failures.push(`${metric}: ${actual} < ${minimum}`);
  }
  if (invalidEvidence > 0) failures.push(`invalid_evidence: ${invalidEvidence}`);
  const missingFacts = scoredFacts.filter(fact => !fact.found).map(fact => fact.id);
  if (missingFacts.length) failures.push(`missing_facts: ${missingFacts.join(', ')}`);
  const factsWithoutEvidence = scoredFacts.filter(fact => fact.found && !fact.evidence_present).map(fact => fact.id);
  if (factsWithoutEvidence.length) failures.push(`facts_without_evidence: ${factsWithoutEvidence.join(', ')}`);
  if (failures.length) result.verdict = 'fail';
  result.failures = failures;

  const outPath = join(resultRoot, expected.repo, '.analysis', 'data', 'golden-benchmark.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
  return result;
}

const expectedFiles = walk(goldenRoot, file => file.endsWith('.expected.json'));
if (!expectedFiles.length) {
  console.log(`Golden benchmark: fail`);
  console.log(`FAIL no expected files under ${goldenRoot}`);
  process.exit(1);
}

const results = expectedFiles.map(scoreExpected);
const failed = results.filter(result => result.verdict !== 'pass');
const aggregate = {
  schemaVersion: '1.0',
  benchmark: 'golden-suite',
  generated_at: new Date().toISOString(),
  total_repos: results.length,
  passed_repos: results.length - failed.length,
  failed_repos: failed.length,
  minimum_market_proof_repos: 5,
  market_proof_ready: results.length >= 5 && failed.length === 0,
  verdict: failed.length ? 'fail' : 'pass',
  results: results.map(result => ({
    benchmark: result.benchmark,
    repo: result.repo,
    expected_file: result.expected_file,
    verdict: result.verdict,
    metrics: result.metrics,
    failures: result.failures
  }))
};
const aggregatePath = join(resultRoot, 'benchmarks', 'golden', 'results.json');
mkdirSync(dirname(aggregatePath), { recursive: true });
writeFileSync(aggregatePath, JSON.stringify(aggregate, null, 2) + '\n');

console.log(`Golden benchmark: ${aggregate.verdict}`);
console.log(`Result: ${aggregatePath}`);
console.log(`Repos: ${aggregate.passed_repos}/${aggregate.total_repos} passed · market-proof-ready=${aggregate.market_proof_ready}`);
for (const result of results) {
  console.log(`${result.benchmark}: ${result.verdict} · Fact recall ${result.metrics.fact_recall.toFixed(3)} · Evidence precision ${result.metrics.evidence_precision.toFixed(3)} · Unsupported claim rate ${result.metrics.unsupported_claim_rate.toFixed(3)} · Decision readiness ${result.metrics.decision_readiness}`);
}
if (failed.length) process.exit(1);

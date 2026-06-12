import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(new URL('..', import.meta.url).pathname);
const cli = join(root, 'dist', 'cli.js');
const manifestPath = process.env.COGNIANALYSIS_EXTERNAL_SEMANTIC_MANIFEST
  ? resolve(process.env.COGNIANALYSIS_EXTERNAL_SEMANTIC_MANIFEST)
  : join(root, 'benchmarks', 'external', 'semantic', 'manifest.json');
const workRoot = process.env.COGNIANALYSIS_EXTERNAL_SEMANTIC_WORKDIR
  ? resolve(process.env.COGNIANALYSIS_EXTERNAL_SEMANTIC_WORKDIR)
  : mkdtempSync(join(tmpdir(), 'cognianalysis-external-semantic-'));

if (!process.env.COGNIANALYSIS_EXTERNAL_SEMANTIC_KEEP && !process.env.COGNIANALYSIS_EXTERNAL_SEMANTIC_WORKDIR) {
  process.on('exit', () => rmSync(workRoot, { recursive: true, force: true }));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: options.timeoutMs || 120000
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  if (options.expectFailure) {
    assert.notEqual(result.status, 0, `${command} ${args.join(' ')} should fail but exited 0`);
  } else if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${command} ${args.join(' ')} failed with exit ${result.status}\n${output.slice(0, 6000)}`);
  }
  return { ...result, output };
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function gitHead(repo) {
  return run('git', ['rev-parse', 'HEAD'], { cwd: repo }).stdout.trim();
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function walk(value, visit) {
  if (Array.isArray(value)) {
    for (const child of value) walk(child, visit);
    return;
  }
  if (!value || typeof value !== 'object') return;
  visit(value);
  for (const child of Object.values(value)) walk(child, visit);
}

function visibleBlockTypes(doc) {
  return new Set(asList(doc?.sections).flatMap(section => asList(section?.blocks).map(block => String(block?.type || '').trim()).filter(Boolean)));
}

function evidenceRefs(value) {
  const refs = [];
  walk(value, node => {
    for (const ev of asList(node.evidence || node.evidence_refs)) {
      if (ev && typeof ev === 'object' && ev.path) refs.push({ path: String(ev.path), line: Number(ev.line || 1) });
    }
  });
  return refs;
}

function traceRefs(doc) {
  return new Set(asList(doc?.requirements_trace).flatMap(row => asList(row?.goal_contract_refs || row?.goal_refs).map(String)));
}

function expectedGoalRefs(bundle) {
  const goal = bundle.analysis_goal_contract || {};
  const refs = [];
  for (const key of Object.keys(goal.required_output_shape || {})) refs.push(`required_output_shape.${key}`);
  for (const row of asList(goal.required_levels)) refs.push(`required_levels.${row.id}`);
  for (const row of asList(goal.required_views)) refs.push(`required_views.${row.id}`);
  for (const row of asList(goal.required_report_behaviors)) refs.push(`required_report_behaviors.${row.id}`);
  return refs;
}

function validateManifest(manifest) {
  assert.equal(manifest.schemaVersion, '1.0', 'external semantic manifest schemaVersion must be 1.0');
  const repos = Array.isArray(manifest.repositories) ? manifest.repositories : [];
  assert(repos.length >= Number(manifest.minimum_repositories || 1), 'external semantic manifest must include the minimum repository count');
  for (const entry of repos) {
    const id = String(entry.id || '').trim();
    const url = String(entry.url || '').trim();
    const commit = String(entry.commit || entry.expected_commit || '').trim();
    const seedPath = String(entry.seed_path || '').trim();
    assert(id, 'external semantic repository id is required');
    assert(url.startsWith('https://'), `external semantic repository ${id} must use an https URL`);
    assert(/^[0-9a-f]{40}$/i.test(commit), `external semantic repository ${id} must include a pinned 40-character commit`);
    assert(seedPath, `external semantic repository ${id} must declare a seed_path`);
    assert(existsSync(resolve(root, seedPath)), `external semantic repository ${id} seed_path does not exist: ${seedPath}`);
    assert(entry.expected?.source_fact?.path, `external semantic repository ${id} must declare expected.source_fact.path`);
    assert(asList(entry.expected?.required_block_types).length > 0, `external semantic repository ${id} must declare required block types`);
  }
  return repos;
}

assert.throws(
  () => validateManifest({ schemaVersion: '1.0', minimum_repositories: 1, repositories: [{ id: 'missing-pin', url: 'https://example.com/repo.git', seed_path: 'benchmarks/external/semantic/octocat-hello-world/.analysis-seed', expected: { source_fact: { path: 'README' }, required_block_types: ['narrative'] } }] }),
  /pinned 40-character commit/,
  'external semantic manifest validation must fail before clone/analyze when a repo lacks a pinned commit'
);

const manifest = readJson(manifestPath);
const repos = validateManifest(manifest);
mkdirSync(workRoot, { recursive: true });

const results = [];
for (const entry of repos) {
  const id = String(entry.id || '').trim();
  const url = String(entry.url || '').trim();
  const expectedCommit = String(entry.commit || entry.expected_commit || '').trim().toLowerCase();
  const repoDir = join(workRoot, id);
  const expected = entry.expected || {};
  rmSync(repoDir, { recursive: true, force: true });
  mkdirSync(repoDir, { recursive: true });
  run('git', ['init'], { cwd: repoDir, timeoutMs: 120000 });
  run('git', ['remote', 'add', 'origin', url], { cwd: repoDir, timeoutMs: 120000 });
  run('git', ['fetch', '--depth', '1', 'origin', expectedCommit], { cwd: repoDir, timeoutMs: 180000 });
  run('git', ['checkout', '--detach', 'FETCH_HEAD'], { cwd: repoDir, timeoutMs: 120000 });
  const commit = gitHead(repoDir);
  assert.equal(commit.toLowerCase(), expectedCommit, `${id} must checkout the pinned external commit`);

  const seedPath = resolve(root, entry.seed_path);
  cpSync(seedPath, join(repoDir, '.analysis-seed'), { recursive: true });

  const scope = String(entry.scope || 'complete');
  const analyzeArgs = [
    cli,
    'analyze',
    repoDir,
    '--mode',
    String(entry.mode || 'brief'),
    '--scope',
    scope,
    '--goal',
    String(entry.goal || 'Create a concise decision report for this external repository.')
  ];
  run(process.execPath, analyzeArgs, { timeoutMs: 180000 });
  const audit = run(process.execPath, [cli, 'dev', 'audit-report', repoDir], { timeoutMs: 180000 });
  assert(audit.output.includes('Report audit: passed'), `${id} semantic fixture must pass report audit`);
  const evalOutput = run(process.execPath, [cli, 'eval', repoDir], { timeoutMs: 120000 });
  assert(evalOutput.output.includes('Original product readiness:'), `${id} eval must print product readiness context`);

  const bundle = readJson(join(repoDir, '.analysis', 'data', 'bundle.json'));
  const doc = bundle.analysis_document || {};
  const sourceFact = expected.source_fact || {};
  const factPath = join(repoDir, String(sourceFact.path || ''));
  const sourceText = readFileSync(factPath, 'utf8').split(/\r?\n/)[Number(sourceFact.line || 1) - 1] || '';
  assert(sourceText.includes(String(sourceFact.text || '')), `${id} pinned source fact must still match ${sourceFact.path}:${sourceFact.line}`);
  assert.equal(bundle.final_llm_readiness?.state, 'ready', `${id} final LLM readiness must be ready`);
  assert.equal(bundle.analysis_document_quality_review?.verdict, 'decision_ready', `${id} report quality review must be decision_ready`);
  assert.equal(bundle.analysis_document_open_questions?.blocking_count, 0, `${id} must not leave blocking open questions`);
  assert.equal(bundle.analysis_document_quality_review?.partial_requirement_rationale_ok, true, `${id} must rationalize partial/open requirement rows`);
  assert.equal(bundle.analysis_goal_trace_alignment?.complete, true, `${id} must explicitly reference all original goal contract refs`);
  assert.equal(bundle.source_inventory_accounting?.complete, true, `${id} must account for all included source files`);
  assert.equal(bundle.source_tier_coverage?.complete, true, `${id} must complete Tier 1 coverage for the included source inventory`);
  assert.equal((bundle.evidence_index || []).filter(ev => ev.valid === false).length, 0, `${id} must not have invalid evidence`);

  const blockTypes = visibleBlockTypes(doc);
  for (const type of asList(expected.required_block_types)) {
    assert(blockTypes.has(type), `${id} report must include ${type} block`);
  }
  const usedGoalRefs = traceRefs(doc);
  for (const ref of expectedGoalRefs(bundle)) {
    assert(usedGoalRefs.has(ref), `${id} requirements_trace must reference ${ref}`);
  }
  assert(evidenceRefs(doc).some(ev => ev.path === sourceFact.path && ev.line === Number(sourceFact.line || 1)), `${id} report must cite the expected source fact`);

  const serializedDoc = JSON.stringify(doc).toLowerCase();
  for (const term of asList(expected.forbidden_claim_terms)) {
    assert(!serializedDoc.includes(String(term).toLowerCase()), `${id} report must not invent unsupported claim term: ${term}`);
  }

  results.push({
    id,
    url,
    expected_commit: expectedCommit,
    commit,
    source_fact_checked: `${sourceFact.path}:${sourceFact.line}`,
    audit_passed: true,
    eval_checked: true,
    final_llm_readiness: bundle.final_llm_readiness?.state,
    report_quality_verdict: bundle.analysis_document_quality_review?.verdict,
    block_types: [...blockTypes].sort(),
    goal_refs_checked: expectedGoalRefs(bundle).length,
    forbidden_claim_terms_checked: asList(expected.forbidden_claim_terms).length
  });
}

const output = {
  schemaVersion: '1.0',
  benchmark: 'external-repo-semantic',
  generated_by: 'scripts/verify-external-semantic.mjs',
  generated_at: new Date().toISOString(),
  work_root: workRoot,
  total_repositories: results.length,
  passed_repositories: results.length,
  results
};
const outPath = process.env.COGNIANALYSIS_UPDATE_EXTERNAL_SEMANTIC_RESULTS === '1'
  ? join(root, 'benchmarks', 'external', 'semantic', 'results.json')
  : join(workRoot, 'external-semantic-results.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');

console.log('External repo semantic benchmark: pass');
console.log(`Result: ${outPath}`);
console.log(`Repos: ${results.length}/${results.length} passed`);
for (const result of results) console.log(`${result.id}: pass · ${result.commit} · ${result.report_quality_verdict}`);

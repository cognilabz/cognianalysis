import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(new URL('..', import.meta.url).pathname);
const cli = join(root, 'dist', 'cli.js');
const manifestPath = process.env.COGNIANALYSIS_EXTERNAL_MANIFEST
  ? resolve(process.env.COGNIANALYSIS_EXTERNAL_MANIFEST)
  : join(root, 'benchmarks', 'external', 'manifest.json');
const workRoot = process.env.COGNIANALYSIS_EXTERNAL_WORKDIR
  ? resolve(process.env.COGNIANALYSIS_EXTERNAL_WORKDIR)
  : mkdtempSync(join(tmpdir(), 'cognianalysis-external-'));

if (!process.env.COGNIANALYSIS_EXTERNAL_KEEP && !process.env.COGNIANALYSIS_EXTERNAL_WORKDIR) {
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

function validateManifest(manifest) {
  assert.equal(manifest.schemaVersion, '1.0', 'external manifest schemaVersion must be 1.0');
  const repos = Array.isArray(manifest.repositories) ? manifest.repositories : [];
  assert(repos.length >= Number(manifest.minimum_repositories || 1), 'external manifest must include the minimum repository count');
  for (const entry of repos) {
    const id = String(entry.id || '').trim();
    const url = String(entry.url || '').trim();
    const commit = String(entry.commit || entry.expected_commit || '').trim();
    assert(id, 'external repository id is required');
    assert(url.startsWith('https://'), `external repository ${id} must use an https URL`);
    assert(/^[0-9a-f]{40}$/i.test(commit), `external repository ${id} must include a pinned 40-character commit`);
  }
  return repos;
}

assert.throws(
  () => validateManifest({ schemaVersion: '1.0', minimum_repositories: 1, repositories: [{ id: 'missing-pin', url: 'https://example.com/repo.git' }] }),
  /pinned 40-character commit/,
  'external manifest validation must fail before clone/analyze when a repo lacks a pinned commit'
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
  rmSync(repoDir, { recursive: true, force: true });
  mkdirSync(repoDir, { recursive: true });
  run('git', ['init'], { cwd: repoDir, timeoutMs: 120000 });
  run('git', ['remote', 'add', 'origin', url], { cwd: repoDir, timeoutMs: 120000 });
  run('git', ['fetch', '--depth', '1', 'origin', expectedCommit], { cwd: repoDir, timeoutMs: 180000 });
  run('git', ['checkout', '--detach', 'FETCH_HEAD'], { cwd: repoDir, timeoutMs: 120000 });
  const commit = gitHead(repoDir);
  assert.equal(commit.toLowerCase(), expectedCommit, `${id} must checkout the pinned external commit`);
  const analyze = run(process.execPath, [
    cli,
    'analyze',
    repoDir,
    '--mode',
    'brief',
    '--scope',
    'representative',
    '--scope-files',
    String(Number(entry.scope_files || 20)),
    '--goal',
    String(entry.goal || 'Create a concise decision report for this external repository.'),
    '--no-seed',
    '--no-html'
  ], { timeoutMs: 180000 });
  const analysis = join(repoDir, '.analysis');
  assert(existsSync(join(analysis, 'TASK.md')), `${id} must get a TASK.md guide`);
  assert(existsSync(join(analysis, 'data', 'code-map.json')), `${id} must get a code map`);
  assert(existsSync(join(analysis, 'data', 'product-analysis-request.json')), `${id} must get a product analysis request`);
  assert(analyze.output.includes('waiting for Codex-authored workflow artifacts') || analyze.output.includes('MISSING llm/analysis-strategy.json'), `${id} must stay honest about missing Codex-authored artifacts`);
  const status = run(process.execPath, [cli, 'status', repoDir], { allowFailure: true, timeoutMs: 120000 });
  assert(status.output.includes('Repository Analysis Status'), `${id} status must print product-language status`);
  assert(status.output.includes('Next action:'), `${id} status must print a next action`);
  const evalOutput = run(process.execPath, [cli, 'eval', repoDir], { timeoutMs: 120000 });
  assert(evalOutput.output.includes('Original product readiness:'), `${id} eval must print product readiness`);
  assert(!evalOutput.output.includes('Verdict: PRODUCT_READY'), `${id} must not claim product readiness without LLM artifacts`);
  const strictEval = run(process.execPath, [cli, 'eval', repoDir, '--strict'], { expectFailure: true, timeoutMs: 120000 });
  assert(strictEval.output.includes('PRODUCT-MISSING'), `${id} strict eval failure must explain missing product readiness`);
  results.push({
    id,
    url,
    expected_commit: expectedCommit,
    commit,
    analysis_prepared: true,
    status_checked: true,
    eval_checked: true,
    strict_eval_blocks_readiness: true
  });
}

const output = {
  schemaVersion: '1.0',
  benchmark: 'external-repo-smoke',
  generated_by: 'scripts/verify-external-repos.mjs',
  generated_at: new Date().toISOString(),
  work_root: workRoot,
  total_repositories: results.length,
  passed_repositories: results.length,
  results
};
const outPath = process.env.COGNIANALYSIS_UPDATE_EXTERNAL_RESULTS === '1'
  ? join(root, 'benchmarks', 'external', 'results.json')
  : join(workRoot, 'external-results.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');

console.log(`External repo smoke: pass`);
console.log(`Result: ${outPath}`);
console.log(`Repos: ${results.length}/${results.length} passed`);
for (const result of results) console.log(`${result.id}: pass · ${result.commit}`);

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(new URL('..', import.meta.url).pathname);
const cli = join(root, 'dist', 'cli.js');
const manifestPath = process.env.COGNIANALYSIS_EXTERNAL_AUTONOMOUS_MANIFEST
  ? resolve(process.env.COGNIANALYSIS_EXTERNAL_AUTONOMOUS_MANIFEST)
  : join(root, 'benchmarks', 'external', 'autonomous', 'manifest.json');
const workRoot = process.env.COGNIANALYSIS_EXTERNAL_AUTONOMOUS_WORKDIR
  ? resolve(process.env.COGNIANALYSIS_EXTERNAL_AUTONOMOUS_WORKDIR)
  : mkdtempSync(join(tmpdir(), 'cognianalysis-external-autonomous-'));

if (!process.env.COGNIANALYSIS_EXTERNAL_AUTONOMOUS_KEEP && !process.env.COGNIANALYSIS_EXTERNAL_AUTONOMOUS_WORKDIR) {
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

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function gitHead(repo) {
  return run('git', ['rev-parse', 'HEAD'], { cwd: repo }).stdout.trim();
}

function validateManifest(manifest) {
  assert.equal(manifest.schemaVersion, '1.0', 'external autonomous manifest schemaVersion must be 1.0');
  const repos = Array.isArray(manifest.repositories) ? manifest.repositories : [];
  assert(repos.length >= Number(manifest.minimum_repositories || 1), 'external autonomous manifest must include the minimum repository count');
  for (const entry of repos) {
    const id = String(entry.id || '').trim();
    const url = String(entry.url || '').trim();
    const commit = String(entry.commit || entry.expected_commit || '').trim();
    assert(id, 'external autonomous repository id is required');
    assert(url.startsWith('https://'), `external autonomous repository ${id} must use an https URL`);
    assert(/^[0-9a-f]{40}$/i.test(commit), `external autonomous repository ${id} must include a pinned 40-character commit`);
    assert(entry.expected?.source_fact?.path, `external autonomous repository ${id} must declare expected.source_fact.path`);
    assert(asList(entry.expected?.required_task_files).length > 0, `external autonomous repository ${id} must declare required task files`);
  }
  return repos;
}

assert.throws(
  () => validateManifest({ schemaVersion: '1.0', minimum_repositories: 1, repositories: [{ id: 'missing-pin', url: 'https://example.com/repo.git', expected: { source_fact: { path: 'README' }, required_task_files: ['TASK.md'] } }] }),
  /pinned 40-character commit/,
  'external autonomous manifest validation must fail before clone/analyze when a repo lacks a pinned commit'
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
  const sourceFact = expected.source_fact || {};

  rmSync(repoDir, { recursive: true, force: true });
  mkdirSync(repoDir, { recursive: true });
  run('git', ['init'], { cwd: repoDir, timeoutMs: 120000 });
  run('git', ['remote', 'add', 'origin', url], { cwd: repoDir, timeoutMs: 120000 });
  run('git', ['fetch', '--depth', '1', 'origin', expectedCommit], { cwd: repoDir, timeoutMs: 180000 });
  run('git', ['checkout', '--detach', 'FETCH_HEAD'], { cwd: repoDir, timeoutMs: 120000 });
  const commit = gitHead(repoDir);
  assert.equal(commit.toLowerCase(), expectedCommit, `${id} must checkout the pinned external commit`);
  assert(!existsSync(join(repoDir, '.analysis-seed')), `${id} must be an unseeded external benchmark`);

  const factPath = join(repoDir, String(sourceFact.path || ''));
  const sourceLine = readFileSync(factPath, 'utf8').split(/\r?\n/)[Number(sourceFact.line || 1) - 1] || '';
  assert(sourceLine.includes(String(sourceFact.text || '')), `${id} pinned source fact must still match ${sourceFact.path}:${sourceFact.line}`);

  const analyze = run(process.execPath, [
    cli,
    'analyze',
    repoDir,
    '--mode',
    String(entry.mode || 'brief'),
    '--scope',
    String(entry.scope || 'complete'),
    '--goal',
    String(entry.goal || 'Create a concise decision report for this external repository.'),
    '--no-seed',
    '--no-html'
  ], { timeoutMs: 180000 });
  assert(analyze.output.includes('waiting for Codex-authored workflow artifacts'), `${id} unseeded analyze must wait for Codex-authored workflow artifacts`);

  const analysis = join(repoDir, '.analysis');
  for (const taskFile of asList(expected.required_task_files)) {
    assert(existsSync(join(analysis, taskFile)), `${id} must generate ${taskFile}`);
  }
  const taskText = [
    readFileSync(join(analysis, 'TASK.md'), 'utf8'),
    readFileSync(join(analysis, 'llm_tasks', '00-analysis-strategy.md'), 'utf8'),
    readFileSync(join(analysis, 'llm_tasks', '12-analysis-document.md'), 'utf8')
  ].join('\n');
  for (const phrase of asList(expected.required_task_phrases)) {
    assert(taskText.includes(String(phrase)), `${id} task handoff must include phrase: ${phrase}`);
  }

  const capsules = readFileSync(join(analysis, 'source-capsules.json'), 'utf8');
  assert(capsules.includes(String(sourceFact.text || '')), `${id} source capsules must expose the expected source fact to Codex`);
  const codeMap = readJson(join(analysis, 'data', 'code-map.json'));
  assert(asList(codeMap.files).some(file => file.path === sourceFact.path), `${id} code map must include ${sourceFact.path}`);
  assert(!existsSync(join(analysis, 'llm', 'analysis-document.json')), `${id} must not have a final report before Codex authors LLM artifacts`);

  const status = run(process.execPath, [cli, 'status', repoDir], { allowFailure: true, timeoutMs: 120000 });
  assert(status.output.includes('Next action:'), `${id} status must print a next action`);
  const evalOutput = run(process.execPath, [cli, 'eval', repoDir], { timeoutMs: 120000 });
  assert(evalOutput.output.includes('Original product readiness:'), `${id} eval must print product readiness`);
  assert(!evalOutput.output.includes('Verdict: PRODUCT_READY'), `${id} unseeded eval must not claim product readiness`);
  const strictEval = run(process.execPath, [cli, 'eval', repoDir, '--strict'], { expectFailure: true, timeoutMs: 120000 });
  assert(strictEval.output.includes('PRODUCT-MISSING'), `${id} strict eval failure must explain missing product readiness`);

  results.push({
    id,
    url,
    expected_commit: expectedCommit,
    commit,
    source_fact_checked: `${sourceFact.path}:${sourceFact.line}`,
    seed_artifacts_used: false,
    codex_task_handoff_ready: true,
    source_capsules_include_expected_fact: true,
    final_report_absent_until_codex_authors_artifacts: true,
    strict_eval_blocks_readiness: true
  });
}

const output = {
  schemaVersion: '1.0',
  benchmark: 'external-repo-autonomous-handoff',
  generated_by: 'scripts/verify-external-autonomous.mjs',
  generated_at: new Date().toISOString(),
  work_root: workRoot,
  total_repositories: results.length,
  passed_repositories: results.length,
  results
};
const outPath = process.env.COGNIANALYSIS_UPDATE_EXTERNAL_AUTONOMOUS_RESULTS === '1'
  ? join(root, 'benchmarks', 'external', 'autonomous', 'results.json')
  : join(workRoot, 'external-autonomous-results.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');

console.log('External repo autonomous handoff: pass');
console.log(`Result: ${outPath}`);
console.log(`Repos: ${results.length}/${results.length} passed`);
for (const result of results) console.log(`${result.id}: pass · ${result.commit}`);

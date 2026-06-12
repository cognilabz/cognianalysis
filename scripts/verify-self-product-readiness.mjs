import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const cli = join(root, 'dist', 'cli.js');
const verifyRoot = mkdtempSync(join(root, '.verify-tmp-self-product-'));
const cleanRepo = join(verifyRoot, 'clean-checkout');
const goal = 'Assess Cognianalysis itself against the original product goal: LLM-first evidence-backed repository analysis, decision reports, simplification, benchmarks, external validation and orchestration readiness.';
const forbiddenMachinePath = /\/Users\/|\/var\/folders\/|\/private\/var\/|\/tmp\//;

process.on('exit', () => rmSync(verifyRoot, { recursive: true, force: true }));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  if (options.expectFailure) {
    if (result.status === 0) throw new Error(`Expected command to fail: cognianalysis ${args.join(' ')}`);
    return result;
  }
  if (result.status !== 0) {
    throw new Error(`Command failed with exit ${result.status}: cognianalysis ${args.join(' ')}\n${result.stdout || ''}\n${result.stderr || ''}`);
  }
  return result;
}

function copyCleanTree(src, dst) {
  const tracked = spawnSync('git', ['ls-files', '--cached', '-z'], {
    cwd: src,
    encoding: 'buffer',
    stdio: 'pipe'
  });
  if (tracked.status === 0 && tracked.stdout.length > 0) {
    mkdirSync(dst, { recursive: true });
    for (const rel of tracked.stdout.toString('utf8').split('\0').filter(Boolean)) {
      if (rel === '.analysis' || rel.startsWith('.analysis/')) continue;
      const from = join(src, rel);
      if (!existsSync(from) || !statSync(from).isFile()) continue;
      const to = join(dst, rel);
      mkdirSync(dirname(to), { recursive: true });
      cpSync(from, to);
    }
    return;
  }

  mkdirSync(dst, { recursive: true });
  for (const name of readdirSync(src)) {
    if (['.git', '.analysis', 'node_modules'].includes(name) || name.startsWith('.verify-tmp-')) continue;
    const from = join(src, name);
    const to = join(dst, name);
    const stat = statSync(from);
    if (stat.isDirectory()) copyCleanTree(from, to);
    else if (stat.isFile()) cpSync(from, to);
  }
}

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walkFiles(full, out);
    else if (stat.isFile()) out.push(full);
  }
  return out.sort();
}

function assertNoMachinePaths(label, dirOrFile) {
  const files = statSync(dirOrFile).isDirectory() ? walkFiles(dirOrFile) : [dirOrFile];
  const offenders = files
    .filter(file => /\.(json|md|html|txt|yml|yaml|xml|wsdl|cpy)$/i.test(file))
    .filter(file => forbiddenMachinePath.test(readFileSync(file, 'utf8')))
    .map(file => file.slice(root.length + 1));
  assert(offenders.length === 0, `${label} must not contain machine-local absolute paths: ${offenders.slice(0, 8).join(', ')}`);
}

function sha1Short(value, len = 20) {
  return createHash('sha1').update(value).digest('hex').slice(0, len);
}

function writeOrchestrationInputs(repo) {
  const analysis = join(repo, '.analysis');
  const bundle = JSON.parse(readFileSync(join(analysis, 'data', 'bundle.json'), 'utf8'));
  const hashByPath = Object.fromEntries((bundle.artifact_dependency_graph?.nodes || []).map(node => [node.path, node.content_hash]));
  const runId = bundle.analysis_run?.analysis_run_id || '';
  const sourceCommit = bundle.analysis_run?.source_commit || '';
  const requestHash = bundle.product_analysis_request?.request_hash || '';
  const tasks = (bundle.source_tier_task_manifest?.tasks || []).slice(0, 2);
  assert(tasks.length >= 2, 'Self-product readiness proof requires at least two source-tier tasks for parallel proof');
  const starts = ['2026-06-12T03:05:00.000Z', '2026-06-12T03:05:10.000Z'];
  const ends = ['2026-06-12T03:06:20.000Z', '2026-06-12T03:06:05.000Z'];
  const workerTasks = tasks.map((task, index) => ({
    worker_id: `clean-checkout-worker-${index + 1}`,
    task_id: task.id,
    artifact_path: task.expected_output,
    started_at: starts[index],
    ended_at: ends[index],
    duration_ms: Date.parse(ends[index]) - Date.parse(starts[index]),
    artifact_hash: hashByPath[task.expected_output]
  }));
  writeFileSync(join(analysis, 'data', 'orchestration-execution-log.json'), JSON.stringify({
    schemaVersion: '1.0',
    execution_kind: 'source_tier_workpack_execution',
    analysis_run_id: runId,
    source_commit: sourceCommit,
    generated_at: new Date().toISOString(),
    worker_tasks: workerTasks
  }, null, 2) + '\n');
  const cacheEntries = tasks.map((task, index) => {
    const artifactPath = task.expected_output;
    const artifactHash = hashByPath[artifactPath];
    return {
      cache_key: sha1Short(`${runId}|${sourceCommit}|${requestHash}|${artifactPath}|${artifactHash}`),
      hit: true,
      artifact_path: artifactPath,
      artifact_hash: artifactHash,
      created_at: '2026-06-12T03:04:00.000Z',
      reused_at: `2026-06-12T03:07:0${index + 1}.000Z`
    };
  });
  writeFileSync(join(analysis, 'data', 'cache-ledger.json'), JSON.stringify({
    schemaVersion: '1.0',
    ledger_kind: 'artifact_cache_ledger',
    analysis_run_id: runId,
    source_commit: sourceCommit,
    generated_at: new Date().toISOString(),
    cache_entries: cacheEntries
  }, null, 2) + '\n');
}

assert(existsSync(join(root, '.analysis-seed', 'llm', 'analysis-document.json')), 'Root .analysis-seed must include authored self-analysis document');
assertNoMachinePaths('Root .analysis-seed', join(root, '.analysis-seed'));
assertNoMachinePaths('Published golden benchmark artifacts', join(root, 'examples'));
assertNoMachinePaths('Golden aggregate results', join(root, 'benchmarks', 'golden', 'results.json'));
assertNoMachinePaths('Baseline aggregate results', join(root, 'benchmarks', 'baseline', 'results.json'));

copyCleanTree(root, cleanRepo);
rmSync(join(cleanRepo, '.analysis'), { recursive: true, force: true });
const cleanEval = run(['eval', cleanRepo, '--strict'], { expectFailure: true });
const cleanEvalOutput = `${cleanEval.stdout || ''}\n${cleanEval.stderr || ''}`;
assert(!cleanEvalOutput.includes('Verdict: PRODUCT_READY'), 'Clean checkout must not claim product readiness before analysis is prepared');

run(['analyze', cleanRepo, '--mode', 'complete', '--scope', 'complete', '--goal', goal, '--no-html']);
writeOrchestrationInputs(cleanRepo);
run(['dev', 'prove-orchestration', cleanRepo]);
run(['dev', 'finalize', cleanRepo]);
const strict = run(['eval', cleanRepo, '--strict']);
const strictOutput = strict.stdout || '';
assert(strictOutput.includes('Verdict: PRODUCT_READY'), 'Seeded clean checkout must reproduce PRODUCT_READY');
assert(strictOutput.includes('Core ideas covered: yes'), 'Seeded clean checkout must cover core ideas');
assert(strictOutput.includes('Core features implemented: yes'), 'Seeded clean checkout must implement core features');
assert(strictOutput.includes('Perfectly simplified: yes'), 'Seeded clean checkout must prove simplification');

console.log('verify-self-product-readiness: clean checkout reproduces PRODUCT_READY from committed seed and sanitized artifacts');

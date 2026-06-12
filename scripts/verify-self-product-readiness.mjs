import { spawnSync } from 'node:child_process';
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
  const cliPath = options.cliPath || cli;
  const cwd = options.cwd || dirname(cliPath);
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
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

function runNodeScript(scriptPath, options = {}) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: options.cwd || dirname(scriptPath),
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, ...(options.env || {}) }
  });
  if (result.status !== 0) {
    throw new Error(`Command failed with exit ${result.status}: node ${scriptPath}\n${result.stdout || ''}\n${result.stderr || ''}`);
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

function writeRejectedVerifierFabrication(repo) {
  const analysis = join(repo, '.analysis');
  const bundle = JSON.parse(readFileSync(join(analysis, 'data', 'bundle.json'), 'utf8'));
  const hashByPath = Object.fromEntries((bundle.artifact_dependency_graph?.nodes || []).map(node => [node.path, node.content_hash]));
  const runId = bundle.analysis_run?.analysis_run_id || '';
  const sourceCommit = bundle.analysis_run?.source_commit || '';
  const tasks = (bundle.source_tier_task_manifest?.tasks || []).slice(0, 2);
  assert(tasks.length >= 2, 'Self-product readiness proof requires at least two source-tier tasks for orchestration proof');
  const workerTasks = tasks.map((task, index) => ({
    worker_id: `verifier-fabricated-worker-${index + 1}`,
    task_id: task.id,
    artifact_path: task.expected_output,
    started_at: `2026-06-12T03:05:0${index}.000Z`,
    ended_at: `2026-06-12T03:05:1${index}.000Z`,
    duration_ms: 10_000,
    artifact_hash: hashByPath[task.expected_output]
  }));
  writeFileSync(join(analysis, 'data', 'orchestration-execution-log.json'), JSON.stringify({
    schemaVersion: '1.0',
    execution_kind: 'source_tier_workpack_execution',
    generated_by: 'scripts/verify-self-product-readiness.mjs',
    analysis_run_id: runId,
    source_commit: sourceCommit,
    worker_tasks: workerTasks
  }, null, 2) + '\n');
  const cacheEntries = tasks.map(task => {
    const artifactPath = task.expected_output;
    const artifactHash = hashByPath[artifactPath];
    return {
      cache_key: 'verifier-fabricated-cache-key',
      hit: true,
      artifact_path: artifactPath,
      artifact_hash: artifactHash,
      created_at: '2026-06-12T03:04:00.000Z',
      reused_at: '2026-06-12T03:07:00.000Z'
    };
  });
  writeFileSync(join(analysis, 'data', 'cache-ledger.json'), JSON.stringify({
    schemaVersion: '1.0',
    ledger_kind: 'artifact_cache_ledger',
    generated_by: 'scripts/verify-self-product-readiness.mjs',
    analysis_run_id: runId,
    source_commit: sourceCommit,
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
const cleanCli = join(cleanRepo, 'dist', 'cli.js');
assert(existsSync(cleanCli), 'Clean checkout must include its own built dist/cli.js runtime');
const cleanEval = run(['eval', cleanRepo, '--strict'], { cliPath: cleanCli, expectFailure: true });
const cleanEvalOutput = `${cleanEval.stdout || ''}\n${cleanEval.stderr || ''}`;
assert(!cleanEvalOutput.includes('Verdict: PRODUCT_READY'), 'Clean checkout must not claim product readiness before analysis is prepared');

run(['analyze', cleanRepo, '--mode', 'complete', '--scope', 'complete', '--goal', goal, '--no-html'], { cliPath: cleanCli });
writeRejectedVerifierFabrication(cleanRepo);
const fabricatedProof = run(['dev', 'prove-orchestration', cleanRepo], { cliPath: cleanCli, expectFailure: true });
const fabricatedOutput = `${fabricatedProof.stdout || ''}\n${fabricatedProof.stderr || ''}`;
assert(fabricatedOutput.includes('execution_log.generated_by') || fabricatedOutput.includes('cache_ledger.generated_by'), 'Verifier-fabricated orchestration/cache logs must be rejected');
rmSync(join(cleanRepo, '.analysis', 'data', 'orchestration-execution-log.json'), { force: true });
rmSync(join(cleanRepo, '.analysis', 'data', 'cache-ledger.json'), { force: true });
run(['dev', 'run-orchestration', cleanRepo], { cliPath: cleanCli });
const firstRunnerProof = run(['dev', 'prove-orchestration', cleanRepo], { cliPath: cleanCli, expectFailure: true });
const firstRunnerOutput = `${firstRunnerProof.stdout || ''}\n${firstRunnerProof.stderr || ''}`;
assert(firstRunnerOutput.includes('cache_ledger.hit_entries') || firstRunnerOutput.includes('cache_ledger.prior_cache_reuse_timing'), 'First runner pass must not prove cache reuse before a prior cache entry exists');
run(['dev', 'run-orchestration', cleanRepo], { cliPath: cleanCli });
run(['dev', 'prove-orchestration', cleanRepo], { cliPath: cleanCli });
run(['dev', 'finalize', cleanRepo], { cliPath: cleanCli });
runNodeScript(join(cleanRepo, 'scripts', 'verify-golden.mjs'), {
  cwd: cleanRepo,
  env: { COGNIANALYSIS_UPDATE_BENCHMARK_RESULTS: '1' }
});
runNodeScript(join(cleanRepo, 'scripts', 'verify-baseline.mjs'), {
  cwd: cleanRepo,
  env: { COGNIANALYSIS_UPDATE_BENCHMARK_RESULTS: '1' }
});
const strict = run(['eval', cleanRepo, '--strict'], { cliPath: cleanCli });
const strictOutput = strict.stdout || '';
assert(strictOutput.includes('Verdict: PRODUCT_READY'), 'Seeded clean checkout must reproduce PRODUCT_READY');
assert(strictOutput.includes('Core ideas covered: yes'), 'Seeded clean checkout must cover core ideas');
assert(strictOutput.includes('Core features implemented: yes'), 'Seeded clean checkout must implement core features');
assert(strictOutput.includes('Perfectly simplified: yes'), 'Seeded clean checkout must prove simplification');

console.log('verify-self-product-readiness: clean checkout reproduces PRODUCT_READY from committed seed and sanitized artifacts');

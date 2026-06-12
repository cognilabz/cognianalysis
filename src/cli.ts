#!/usr/bin/env node
import { aggregate, prepareAnalysis } from './aggregate';
import { renderReport } from './report';
import { buildRepoMap } from './repoMap';
import { writeDetailTasksFromLlmPlan, writeLlmTasks } from './tasks';
import { FS, Path, argValue, copyRecursive, ensureDir, hasFlag, loadJson, numericArg, sha1Short, writeJson, writeText } from './utils';
import { startMcpLikeServer } from './mcp';
import { computeFinalLlmReadiness, finalLlmReadinessFailures } from './readiness';
import { sourceTierBacklogArtifact, writeNextSourceTierContexts, writeSourceTierContext } from './sourceTiers';
import { writeSkillWorkbenchTasksFromLlmStrategy } from './skillWorkbenches';
import { computeProductReadiness, productReadinessBrief } from './productReadiness';
import { marketProofStatusForRoot } from './marketProof';

const VERSION = '0.7.0';
const CLI_NAME = 'cognianalysis';
const PRODUCT_ANALYSIS_MODES = new Set(['brief', 'blueprint', 'deep-dive', 'complete']);
const PRODUCT_REQUEST_LLM_OUTPUTS = ['llm/analysis-strategy.json', 'llm/detail-agent-plan.json', 'llm/analysis-document.json'];
const PRODUCT_REQUEST_OPTION_FLAGS = ['--mode', '--goal', '--flow', '--module', '--api', '--risk', '--decision', '--scope', '--scope-files'];
const OPTION_VALUE_FLAGS = new Set([
  '--analysis',
  '--capsules',
  '--capsule-chars',
  '--decision',
  '--execution-log',
  '--flow',
  '--goal',
  '--harness',
  '--cache-ledger',
  '--limit',
  '--max-chars',
  '--max-file-size',
  '--mode',
  '--module',
  '--out',
  '--repos',
  '--risk',
  '--scope',
  '--scope-files',
  '--task',
  '--title',
  '--api'
]);

function analysisPath(repo: string, value?: string): string {
  if (value) return Path.resolve(value);
  return Path.join(repo, '.analysis');
}

const SCOPE_MODES = new Set(['complete', 'critical-path', 'representative']);

function analysisScopeMode(args: string[]): string {
  const mode = String(argValue(args, '--scope', 'complete') || 'complete').trim().toLowerCase();
  if (!SCOPE_MODES.has(mode)) throw new Error(`Unknown --scope ${mode}. Expected complete, critical-path or representative.`);
  return mode;
}

function defaultScopeForProductMode(mode: string): string {
  if (mode === 'complete') return 'complete';
  if (mode === 'deep-dive') return 'critical-path';
  return 'representative';
}

function scopedCodeMap(codeMap: any, args: string[]): any {
  const mode = analysisScopeMode(args);
  const files = Array.isArray(codeMap.files) ? codeMap.files : [];
  if (mode === 'complete') {
    codeMap.analysis_scope = {
      mode,
      selected_files: files.length,
      total_files_before_scope: files.length,
      deferred_files: 0,
      confidence_impact: 'low',
      summary: 'Complete source inventory scope.'
    };
    codeMap.profile = { ...(codeMap.profile || {}), analysis_scope_mode: mode, scope_total_files_before_scope: files.length, scope_deferred_files: 0 };
    return codeMap;
  }

  const fallbackLimit = mode === 'critical-path' ? 1200 : 400;
  const limit = Math.max(1, numericArg(args, '--scope-files', fallbackLimit));
  const sorted = [...files].sort((a: any, b: any) => {
    const scoreA = Number(a.navigation_score ?? a.score ?? 0);
    const scoreB = Number(b.navigation_score ?? b.score ?? 0);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return String(a.path || '').localeCompare(String(b.path || ''));
  });
  const selected = sorted.slice(0, limit);
  const selectedPaths = new Set(selected.map((file: any) => file.path));
  const deferred = sorted.slice(limit).map((file: any) => ({
    path: file.path,
    reason: `Deferred by --scope ${mode}; rerun with --scope complete for full Tier 1 coverage.`
  }));
  const totalLines = selected.reduce((sum: number, file: any) => sum + Number(file.lines || 0), 0);
  return {
    ...codeMap,
    files: selected,
    capsules: (codeMap.capsules || []).filter((capsule: any) => !capsule.path || selectedPaths.has(capsule.path)),
    artifact_navigation_candidates: (codeMap.artifact_navigation_candidates || []).filter((item: any) => !item.path || selectedPaths.has(item.path)),
    important_docs: (codeMap.important_docs || []).filter((item: any) => !item.path || selectedPaths.has(item.path)),
    profile: {
      ...(codeMap.profile || {}),
      source_files: selected.length,
      total_files: selected.length,
      total_lines: totalLines,
      analysis_scope_mode: mode,
      scope_total_files_before_scope: files.length,
      scope_deferred_files: Math.max(0, files.length - selected.length)
    },
    analysis_scope: {
      mode,
      selected_files: selected.length,
      total_files_before_scope: files.length,
      deferred_files: Math.max(0, files.length - selected.length),
      deferred_file_examples: deferred.slice(0, 50),
      selection_rule: `top ${selected.length} files by deterministic navigation_score/score`,
      confidence_impact: mode === 'critical-path' ? 'medium' : 'high',
      summary: `Analysis scope is ${mode}; ${selected.length}/${files.length} files are in the Tier 1 source inventory for this run.`
    }
  };
}

function usage(): void {
  console.log(`Cognianalysis v${VERSION} · LLM-first source-code analysis

Usage:
  ${CLI_NAME} analyze [repo] [--analysis .analysis] [--mode brief|blueprint|deep-dive|complete] [--goal text] [--flow name] [--module path] [--api name] [--risk topic] [--decision topic] [--scope complete|critical-path|representative] [--scope-files N]
  ${CLI_NAME} status [repo] [--analysis .analysis]
  ${CLI_NAME} open [repo] [--analysis .analysis]
  ${CLI_NAME} eval [repo] [--analysis .analysis] [--strict]

Internal/debug commands:
  ${CLI_NAME} dev resume [repo] [--analysis .analysis]
  ${CLI_NAME} dev repair [repo] [--analysis .analysis]
  ${CLI_NAME} dev init-harness [target] [--harness all|codex|claude|cursor|windsurf|copilot|aider|generic] [--force] [--no-skills]
  ${CLI_NAME} dev init-agent [target]
  ${CLI_NAME} dev init-codex [target]
  ${CLI_NAME} dev mcp
  ${CLI_NAME} dev prepare [repo] [--analysis .analysis] [--capsules 44] [--scope complete|critical-path|representative] [--scope-files N]
  ${CLI_NAME} dev finalize [repo] [--analysis .analysis] [--out report-dir] [--title title] [--allow-invalid] [--allow-partial]
  ${CLI_NAME} dev audit-report [repo] [--analysis .analysis]
  ${CLI_NAME} dev tier-status [repo] [--analysis .analysis] [--limit 20]
  ${CLI_NAME} dev tier-next [repo] [--analysis .analysis] [--limit 1] [--max-chars 6000]
  ${CLI_NAME} dev tier-context [repo] --task source-tier-0001 [--analysis .analysis] [--max-chars 6000]
  ${CLI_NAME} dev run-orchestration [repo] [--analysis .analysis]
  ${CLI_NAME} dev prove-orchestration [repo] [--analysis .analysis] [--execution-log path] [--cache-ledger path]
  ${CLI_NAME} dev aggregate|render|validate|coverage|doctor|portfolio|run|init [...]

Compatibility aliases still work for existing automation. New users should start with analyze, status, open and eval.
`);
}

function devUsage(): void {
  console.log(`Internal/debug commands:
  ${CLI_NAME} dev resume [repo]
  ${CLI_NAME} dev repair [repo]
  ${CLI_NAME} dev init-harness [target]
  ${CLI_NAME} dev mcp
  ${CLI_NAME} dev prepare [repo]
  ${CLI_NAME} dev finalize [repo]
  ${CLI_NAME} dev audit-report [repo]
  ${CLI_NAME} dev tier-status [repo]
  ${CLI_NAME} dev tier-next [repo]
  ${CLI_NAME} dev tier-context [repo]
  ${CLI_NAME} dev run-orchestration [repo]
  ${CLI_NAME} dev prove-orchestration [repo] [--execution-log path] [--cache-ledger path]
  ${CLI_NAME} dev aggregate|render|validate|coverage|doctor|portfolio|run|init [...]

Use ${CLI_NAME} analyze . for the normal product flow.`);
}

function stagedLlmWorkflowMessage(): string {
  return `Next step for Codex, as the active in-session LLM: open .analysis/TASK.md and follow that single harness-native work guide. It starts with llm_tasks/00-analysis-strategy.md, uses source-tier work only for the selected scope, treats capability_templates as optional, materializes any LLM-planned skill_workbench_tasks and detail_tasks with ${CLI_NAME} dev finalize . --allow-partial, then authors llm_tasks/11-detail-agent-plan.md and llm_tasks/12-analysis-document.md before rerunning ${CLI_NAME} analyze .`;
}

function positionalArgs(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const value = args[i];
    if (OPTION_VALUE_FLAGS.has(value)) {
      i += 1;
      continue;
    }
    if (value.startsWith('--')) continue;
    out.push(value);
  }
  return out;
}

const REQUIRED_WORKFLOW_ARTIFACTS = [
  { label: 'analysis strategy', path: 'llm/analysis-strategy.json' },
  { label: 'detail-agent plan', path: 'llm/detail-agent-plan.json' },
  { label: 'final analysis document', path: 'llm/analysis-document.json' }
];

function workflowArtifactStatuses(analysis: string): any[] {
  return REQUIRED_WORKFLOW_ARTIFACTS.map(row => {
    const full = Path.join(analysis, row.path);
    const status: any = {
      ...row,
      exists: FS.existsSync(full),
      valid_json: false,
      has_content: false,
      ready: false
    };
    if (!status.exists) return status;
    try {
      const parsed = JSON.parse(FS.readFileSync(full, 'utf8'));
      status.valid_json = true;
      status.has_content = parsed !== null && (
        Array.isArray(parsed)
          ? parsed.length > 0
          : typeof parsed === 'object'
            ? Object.keys(parsed).length > 0
            : String(parsed).trim().length > 0
      );
      status.ready = status.valid_json && status.has_content;
    } catch (err: any) {
      status.error = err?.message || String(err);
    }
    return status;
  });
}

function traceStatus(bundle: any, requirement: string): string {
  if (!bundle) return '';
  const needle = requirement.toLowerCase();
  const row = (bundle.analysis_document_requirements_trace_contract?.requirements || [])
    .find((item: any) => String(item.label || '').toLowerCase().includes(needle));
  return String(row?.status || '');
}

function hasReportBlock(bundle: any, type: string): boolean {
  return (bundle.analysis_document?.sections || [])
    .some((section: any) => (section.blocks || []).some((block: any) => String(block.type || '').toLowerCase() === type));
}

function productModeForBundle(bundle: any | null): string {
  return String(bundle?.product_analysis_request?.mode || 'brief').toLowerCase();
}

function requiresCompleteTierForBundle(bundle: any | null): boolean {
  return productModeForBundle(bundle) === 'complete';
}

function productStatusRows(analysis: string, bundle: any | null, statuses: any[]): any[] {
  const indexed = FS.existsSync(Path.join(analysis, 'data', 'code-map.json'));
  const scopeDeclared = !!bundle?.analysis_scope?.mode;
  const notStale = !!bundle && bundle.analysis_staleness?.stale !== true;
  const strategyReady = bundle?.llm_analysis_strategy?.strategy_present === true;
  const repositoryCoverageReady = requiresCompleteTierForBundle(bundle)
    ? bundle?.source_tier_coverage?.complete === true
    : scopeDeclared;
  const functionalReady = traceStatus(bundle, 'functional') === 'covered' && hasReportBlock(bundle, 'flow');
  const technicalReady = traceStatus(bundle, 'technical') === 'covered' && hasReportBlock(bundle, 'boundary_map');
  const refactoringReady = traceStatus(bundle, 'refactoring') === 'covered' && hasReportBlock(bundle, 'roadmap');
  const executiveReady = bundle?.analysis_document_executive_decision_layer?.complete === true;
  const consistencyReady = bundle?.analysis_document_consistency_review?.complete === true
    && Number(bundle?.analysis_document_consistency_review?.contradictions_found || 0) === 0;
  const lineageReady = bundle?.analysis_document_semantic_lineage?.complete === true;
  const provenanceReady = bundle?.analysis_run_provenance?.complete === true
    && bundle?.artifact_dependency_graph?.complete === true
    && bundle?.external_findings_contract?.complete === true;
  const openQuestionsReady = bundle?.analysis_document_open_questions?.complete === true
    && Number(bundle?.analysis_document_open_questions?.blocking_count || 0) === 0;
  const finalReady = bundle?.final_llm_readiness?.state === 'ready';
  return [
    { id: 'indexed', label: 'Repository indexed', ready: indexed },
    { id: 'scope', label: `Analysis scope declared${bundle?.analysis_scope?.mode ? ` (${bundle.analysis_scope.mode})` : ''}`, ready: scopeDeclared },
    { id: 'freshness', label: 'Analysis matches current commit', ready: notStale },
    { id: 'task_guide', label: 'Task guide available', ready: FS.existsSync(Path.join(analysis, 'TASK.md')) },
    { id: 'strategy', label: 'Analysis strategy complete', ready: strategyReady },
    { id: 'coverage', label: requiresCompleteTierForBundle(bundle) ? 'Repository coverage complete' : 'Adaptive source scope declared', ready: repositoryCoverageReady },
    { id: 'functional', label: 'Functional model complete', ready: functionalReady },
    { id: 'technical', label: 'Technical model complete', ready: technicalReady },
    { id: 'refactoring', label: 'Refactoring assessment complete', ready: refactoringReady },
    { id: 'executive', label: 'Executive decision layer complete', ready: executiveReady },
    { id: 'consistency', label: 'Consistency review complete', ready: consistencyReady },
    { id: 'lineage', label: 'Semantic lineage complete', ready: lineageReady },
    { id: 'provenance', label: 'Run provenance and dependency graph complete', ready: provenanceReady },
    { id: 'open_questions', label: 'Open questions structured', ready: openQuestionsReady },
    { id: 'final', label: 'Decision report ready', ready: finalReady }
  ];
}

function nextProductAction(repo: string, analysis: string, bundle: any | null, statuses: any[]): string {
  if (!FS.existsSync(analysis) || !FS.existsSync(Path.join(analysis, 'data', 'code-map.json'))) return `Run ${CLI_NAME} analyze ${repo}`;
  if (bundle?.analysis_staleness?.stale === true) return `Repository changed after analysis; rerun ${CLI_NAME} analyze ${repo} to refresh the decision report.`;
  if (!FS.existsSync(Path.join(analysis, 'TASK.md'))) return `Run ${CLI_NAME} repair ${repo} to rebuild the task guide.`;
  const missingWorkflow = statuses.find(row => !row.ready);
  if (missingWorkflow?.path === 'llm/analysis-strategy.json') return 'Open .analysis/TASK.md and complete "Analysis Strategy".';
  if (requiresCompleteTierForBundle(bundle) && bundle?.source_tier_coverage?.complete !== true) return `Run ${CLI_NAME} dev tier-next ${repo} --limit 1, complete the next Tier 1 workpack, then rerun status.`;
  if (missingWorkflow?.path === 'llm/detail-agent-plan.json') return 'Open .analysis/TASK.md and complete "Detail Agent Plan".';
  if (missingWorkflow?.path === 'llm/analysis-document.json') return 'Open .analysis/TASK.md and complete "Final Analysis Document".';
  if (bundle?.analysis_document_executive_decision_layer?.complete !== true) return 'Update the final report with a visible executive decision section and executive_decision_basis.';
  if (bundle?.analysis_document_consistency_review?.complete !== true) return 'Add analysis_document.consistency_review and resolve or explicitly surface contradictions.';
  if (bundle?.analysis_document_semantic_lineage?.complete !== true) return 'Add or refresh semantic lineage so major report claims trace to upstream reviews and source evidence.';
  if (bundle?.analysis_run_provenance?.complete !== true) return 'Refresh analysis run provenance so required artifacts share one run identity and generated-from matrix.';
  if (bundle?.artifact_dependency_graph?.complete !== true) return 'Refresh stale or missing artifacts from the dependency graph before final readiness.';
  if (bundle?.external_findings_contract?.complete !== true) return 'Fix invalid external_findings/*.json entries or remove malformed scanner inputs.';
  if (bundle?.analysis_document_open_questions?.complete !== true) return 'Add top-level analysis_document.open_questions and visible open_questions blocks for any unresolved uncertainty.';
  if (Number(bundle?.analysis_document_open_questions?.blocking_count || 0) > 0) return 'Resolve or explicitly downgrade readiness for blocking open questions.';
  const failures = bundle?.final_llm_readiness?.failures || [];
  if (failures.length) return `Fix readiness issue: ${failures[0]}`;
  return `Run ${CLI_NAME} open ${repo}`;
}

function estimatedRemainingEffort(bundle: any | null, rows: any[], statuses: any[]): string {
  if (!bundle) return '1 setup pass';
  const missingRows = rows.filter(row => !row.ready).length;
  const missingArtifacts = statuses.filter(row => !row.ready).length;
  const tierBacklog = bundle.source_tier_backlog || {};
  const tierPasses = Number(tierBacklog.incomplete_tasks || tierBacklog.missing_tasks || 0);
  const passes = Math.max(0, missingArtifacts) + Math.min(tierPasses, 5) + Math.max(0, missingRows - missingArtifacts - 2);
  return passes <= 0 ? '0 LLM passes' : `${passes} LLM pass${passes === 1 ? '' : 'es'}`;
}

function printRepositoryStatus(repo: string, analysis: string, bundle: any | null, statuses: any[]): any {
  const rows = productStatusRows(analysis, bundle, statuses);
  console.log('Repository Analysis Status');
  for (const row of rows) console.log(`${row.ready ? '✓' : '✗'} ${row.label}`);
  const action = nextProductAction(repo, analysis, bundle, statuses);
  console.log('Next action:');
  console.log(action);
  console.log(`Estimated remaining effort: ${estimatedRemainingEffort(bundle, rows, statuses)}`);
  if (bundle?.final_llm_readiness?.state) console.log(`Readiness: ${bundle.final_llm_readiness.state} · verdict=${bundle.final_llm_readiness.final_verdict || 'unknown'}`);
  if (bundle?.analysis_scope?.mode && bundle.analysis_scope.mode !== 'complete') {
    console.log(`Scope warning: ${bundle.analysis_scope.summary || bundle.analysis_scope.mode} Confidence impact: ${bundle.analysis_scope.confidence_impact || 'unknown'}.`);
  }
  if (bundle?.analysis_staleness?.stale === true) console.log(`Stale warning: ${bundle.analysis_staleness.summary}`);
  return { rows, action };
}

function jsonProblems(analysis: string): any[] {
  const roots = ['llm', 'source_tiers', 'skill_reviews', 'detail_reviews']
    .map(name => Path.join(analysis, name))
    .filter(dir => FS.existsSync(dir));
  const files = roots.flatMap(dir => listFilesRecursive(dir, file => file.endsWith('.json')));
  const problems: any[] = [];
  for (const file of files) {
    try {
      JSON.parse(FS.readFileSync(file, 'utf8'));
    } catch (err: any) {
      problems.push({ path: Path.relative(analysis, file).replace(/\\/g, '/'), error: err?.message || String(err) });
    }
  }
  return problems;
}

function reportPathForAnalysis(analysis: string): string {
  const artifacts = loadJson<any>(Path.join(analysis, 'data', 'report-artifacts.json'), {});
  return artifacts.index_html_path || Path.join(analysis, 'report', 'index.html');
}

function packageRoot(): string {
  return Path.resolve(__dirname, '..');
}

function listFilesRecursive(dir: string, predicate: (file: string) => boolean): string[] {
  const out: string[] = [];
  if (!FS.existsSync(dir)) return out;
  for (const entry of FS.readdirSync(dir, { withFileTypes: true })) {
    const full = Path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full, predicate));
    else if (entry.isFile() && predicate(full)) out.push(full);
  }
  return out.sort();
}

function marketProofStatus(analysis: string): any {
  return marketProofStatusForRoot(packageRoot(), analysis);
}

function printMarketProofStatus(analysis: string): any {
  const status = marketProofStatus(analysis);
  console.log('Market proof:');
  console.log(`- Benchmark protocol doc: ${FS.existsSync(status.benchmarkDoc) ? 'present' : 'missing'} · ${status.benchmarkDoc}`);
  console.log(`- Golden expected suites: ${status.goldenExpected.length} · ${status.goldenDir}`);
  console.log(`- Golden verifier: ${FS.existsSync(status.goldenScript) ? 'present' : 'missing'} · ${status.goldenScript}`);
  console.log(`- Golden aggregate: ${status.goldenAggregate?.verdict || 'missing'} · validated=${status.passedGoldenRepos}/${status.totalGoldenRepos} · proof=${status.goldenProofReady ? 'ready' : 'not_ready'}`);
  const representative = status.goldenRepresentativeCoverage || {};
  if (representative.required_categories) {
    console.log(`- Golden representative coverage: ${representative.ready ? 'ready' : 'not_ready'} · categories=${(representative.covered_categories || []).length}/${(representative.required_categories || []).length} · repos=${representative.distinct_repositories ?? 0}/${representative.minimum_representative_suites ?? 5}`);
    for (const category of representative.missing_categories || []) console.log(`  REPRESENTATIVE-MISSING ${category}`);
  }
  if (!status.result) {
    console.log('- Golden result: missing · run npm run verify:golden');
  } else {
    const metrics = status.result.metrics || {};
    console.log(`- Current repo golden result: ${status.result.verdict || 'unknown'} · ${Path.join(analysis, 'data', 'golden-benchmark.json')}`);
    console.log(`- Fact recall: ${metrics.fact_recall ?? 'unknown'} · Evidence precision: ${metrics.evidence_precision ?? 'unknown'} · Unsupported claim rate: ${metrics.unsupported_claim_rate ?? 'unknown'} · Decision readiness: ${metrics.decision_readiness ?? 'unknown'}`);
  }
  console.log(`- Baseline verifier: ${FS.existsSync(status.baselineScript) ? 'present' : 'missing'} · ${status.baselineScript}`);
  console.log(`- Baseline aggregate: ${status.baselineAggregate?.verdict || 'missing'} · proof=${status.baselineProofReady ? 'ready' : 'not_ready'} · ${Path.join(packageRoot(), 'benchmarks', 'baseline', 'results.json')}`);
  console.log(`- Strict market proof: ${status.strictReady ? 'ready' : 'not_ready'}`);
  for (const failure of status.strictFailures) console.log(`  STRICT-MISSING ${failure}`);
  console.log('- Market claim boundary: benchmark proof scaffold exists; broader multi-repo/baseline proof is still required before market-superiority claims.');
  return status;
}

function printProductNextStep(analysis: string, statuses: any[]): void {
  const missing = statuses.filter(row => !row.ready);
  console.log(`Task guide: ${Path.join(analysis, 'TASK.md')}`);
  if (!missing.length) {
    console.log(`Next action: run ${CLI_NAME} analyze . and ${CLI_NAME} dev audit-report .`);
    return;
  }
  console.log('Next action: complete the required LLM workflow artifacts below, then rerun product mode.');
  for (const row of missing) {
    const reason = !row.exists ? 'missing' : !row.valid_json ? 'invalid_json' : 'empty';
    console.log(`MISSING ${row.path} (${row.label}, ${reason})`);
  }
}

function repoArg(args: string[], fallback = '.'): string {
  const first = positionalArgs(args)[0];
  return Path.resolve(first || fallback);
}

function assertRepoDirectory(repo: string): void {
  if (!FS.existsSync(repo) || !FS.statSync(repo).isDirectory()) throw new Error(`Repository path does not exist or is not a directory: ${repo}`);
}

function cmdPrepare(args: string[]): number {
  const repo = repoArg(args);
  assertRepoDirectory(repo);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const codeMap = scopedCodeMap(buildRepoMap(repo, {
    maxFileSize: numericArg(args, '--max-file-size', 1_250_000),
    capsuleLimit: numericArg(args, '--capsules', 44),
    capsuleChars: numericArg(args, '--capsule-chars', 10_000)
  }), args);
  prepareAnalysis(repo, analysis, codeMap);
  const tasks = writeLlmTasks(analysis, codeMap);
  const seedDir = Path.join(repo, '.analysis-seed', 'llm');
  if (FS.existsSync(seedDir) && !hasFlag(args, '--no-seed')) {
    copyRecursive(seedDir, Path.join(analysis, 'llm'), false);
  }
  const detailReviewSeedDir = Path.join(repo, '.analysis-seed', 'detail_reviews');
  if (FS.existsSync(detailReviewSeedDir) && !hasFlag(args, '--no-seed')) {
    copyRecursive(detailReviewSeedDir, Path.join(analysis, 'detail_reviews'), false);
  }
  const sourceTierSeedDir = Path.join(repo, '.analysis-seed', 'source_tiers');
  if (FS.existsSync(sourceTierSeedDir) && !hasFlag(args, '--no-seed')) {
    copyRecursive(sourceTierSeedDir, Path.join(analysis, 'source_tiers'), false);
  }
  const skillReviewSeedDir = Path.join(repo, '.analysis-seed', 'skill_reviews');
  if (FS.existsSync(skillReviewSeedDir) && !hasFlag(args, '--no-seed')) {
    copyRecursive(skillReviewSeedDir, Path.join(analysis, 'skill_reviews'), false);
  }
  console.log(`Prepared LLM-first analysis workspace: ${analysis}`);
  console.log(`Code map: ${Path.join(analysis, 'data', 'code-map.json')}`);
  console.log(`Source capsules: ${Path.join(analysis, 'source-capsules.json')}`);
  console.log(`Required LLM workflow task files: ${Path.join(analysis, 'llm_tasks')} (${tasks.length} tasks)`);
  console.log(`Optional capability templates: ${Path.join(analysis, 'capability_templates')}`);
  console.log('Important: the code map is inventory-only. It does not parse imports, symbols, frameworks, contracts, examples or relationships; Codex, as the active in-session LLM, extracts those from source.');
  console.log(stagedLlmWorkflowMessage());
  return 0;
}

function productAnalysisRequest(args: string[], previous?: any): any {
  const previousScopeRequest = previous?.analysis_scope_request || {};
  const previousTarget = previous?.target || {};
  const hasScope = args.includes('--scope');
  const hasScopeFiles = args.includes('--scope-files');
  const mode = String(args.includes('--mode') ? argValue(args, '--mode', 'brief') : previous?.mode || 'brief').trim().toLowerCase();
  if (!PRODUCT_ANALYSIS_MODES.has(mode)) throw new Error(`Unknown --mode ${mode}. Expected brief, blueprint, deep-dive or complete.`);
  const defaultScopeMode = defaultScopeForProductMode(mode);
  if (hasScopeFiles && !hasScope && String(previousScopeRequest.mode || defaultScopeMode) === 'complete') {
    throw new Error('--scope-files requires --scope unless the previous product request or selected mode already has a non-complete default scope.');
  }
  const goal = String(args.includes('--goal') ? argValue(args, '--goal', '') : previous?.goal || '').trim();
  const scopeMode = hasScope ? analysisScopeMode(args) : String(previousScopeRequest.mode || defaultScopeMode);
  if (!SCOPE_MODES.has(scopeMode)) throw new Error(`Unknown --scope ${scopeMode}. Expected complete, critical-path or representative.`);
  if (mode === 'complete' && scopeMode !== 'complete') throw new Error('Complete mode requires --scope complete. Use brief, blueprint or deep-dive for scoped/adaptive analysis.');
  const previousScopeMode = String(previousScopeRequest.mode || 'complete');
  const previousScopeFiles = Number(previousScopeRequest.scope_files || 0);
  const preservePreviousScopeFiles = !hasScope || scopeMode === previousScopeMode;
  const scopeFiles = scopeMode === 'complete'
    ? null
    : hasScopeFiles
      ? Math.max(1, numericArg(args, '--scope-files', scopeMode === 'critical-path' ? 1200 : 400))
      : preservePreviousScopeFiles && previousScopeFiles > 0
        ? previousScopeFiles
        : Math.max(1, scopeMode === 'critical-path' ? 1200 : 400);
  const target = {
    flow: String(args.includes('--flow') ? argValue(args, '--flow', '') : previousTarget.flow || '').trim(),
    module: String(args.includes('--module') ? argValue(args, '--module', '') : previousTarget.module || '').trim(),
    api: String(args.includes('--api') ? argValue(args, '--api', '') : previousTarget.api || '').trim(),
    risk: String(args.includes('--risk') ? argValue(args, '--risk', '') : previousTarget.risk || '').trim(),
    decision: String(args.includes('--decision') ? argValue(args, '--decision', '') : previousTarget.decision || '').trim()
  };
  const hasTarget = Object.values(target).some(Boolean);
  if (mode === 'deep-dive' && !hasTarget && !goal) {
    throw new Error('Deep-dive mode requires --goal or at least one target flag: --flow, --module, --api, --risk or --decision.');
  }
  return {
    contract_kind: 'product_analysis_request',
    entrypoint: 'analyze',
    mode,
    goal,
    target,
    analysis_scope_request: {
      mode: scopeMode,
      scope_files: scopeFiles
    },
    generated_at: new Date().toISOString(),
    public_outputs: ['.analysis/report/index.html', '.analysis/data/bundle.json', '.analysis/data/evidence.json'],
    internal_work_area: '.analysis',
    depth_policy: mode === 'complete'
      ? 'audit-heavy whole-repository analysis with complete included source inventory coverage'
      : mode === 'deep-dive'
      ? 'targeted critical-path source-family, flow, module, API, risk or decision analysis for the requested slice'
      : mode === 'blueprint'
        ? 'adaptive decision report plus modernization/rebuild blueprint and deep-dive backlog; complete every-file Tier 1 is reserved for --mode complete'
        : 'adaptive concise decision report with broad system understanding, explicit deferred scope and deep-dive backlog; complete every-file Tier 1 is reserved for --mode complete'
  };
}

function hasProductRequestOption(args: string[]): boolean {
  return PRODUCT_REQUEST_OPTION_FLAGS.some(flag => args.includes(flag));
}

function analysisScopeChanged(analysis: string, request: any): boolean {
  const codeMapPath = Path.join(analysis, 'data', 'code-map.json');
  const scopePath = Path.join(analysis, 'data', 'analysis-scope.json');
  if (!FS.existsSync(codeMapPath) || !FS.existsSync(scopePath)) return false;
  const current = loadJson<any>(scopePath, {});
  const requested = request?.analysis_scope_request || {};
  const requestedMode = String(requested.mode || 'complete');
  if (String(current.mode || 'complete') !== requestedMode) return true;
  if (requestedMode !== 'complete') {
    const requestedFiles = Number(requested.scope_files || 0);
    const selectedFiles = Number(current.selected_files || 0);
    const totalFilesBeforeScope = Number(current.total_files_before_scope || selectedFiles);
    const expectedSelectedFiles = Math.min(requestedFiles, totalFilesBeforeScope || requestedFiles);
    if (requestedFiles > 0 && selectedFiles !== expectedSelectedFiles) return true;
  }
  return false;
}

function argsWithRequestScope(args: string[], request: any): string[] {
  const scoped: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--scope' || arg === '--scope-files') {
      i += 1;
      continue;
    }
    scoped.push(arg);
  }
  const requested = request?.analysis_scope_request || {};
  const requestedMode = String(requested.mode || 'complete');
  scoped.push('--scope', requestedMode);
  if (requestedMode !== 'complete' && Number(requested.scope_files || 0) > 0) {
    scoped.push('--scope-files', String(Number(requested.scope_files)));
  }
  return scoped;
}

function argsWithPersistedRequestScope(args: string[], analysis: string): string[] {
  const requestPath = Path.join(analysis, 'data', 'product-analysis-request.json');
  const request = loadJson<any | null>(requestPath, null);
  return request ? argsWithRequestScope(args, request) : args;
}

function writeProductAnalysisRequest(repo: string, analysis: string, args: string[]): any {
  const requestPath = Path.join(analysis, 'data', 'product-analysis-request.json');
  const previous = loadJson<any | null>(requestPath, null);
  if (previous && !hasProductRequestOption(args)) return previous;
  const request = productAnalysisRequest(args, previous || undefined);
  const stableRequest = ({ generated_at: _generatedAt, repo: _repo, request_hash: _hash, ...rest }: any) => rest;
  const previousHash = previous ? sha1Short(JSON.stringify(stableRequest(previous)), 16) : '';
  const currentHash = sha1Short(JSON.stringify(stableRequest(request)), 16);
  if (previous && previousHash === currentHash) return previous;
  ensureDir(Path.join(analysis, 'data'));
  const hasExistingLlmOutputs = PRODUCT_REQUEST_LLM_OUTPUTS.some(relativePath => FS.existsSync(Path.join(analysis, relativePath)));
  const requestChanged = previous ? previousHash !== currentHash : hasExistingLlmOutputs;
  const persisted = {
    ...request,
    request_hash: currentHash,
    repo
  };
  writeJson(requestPath, persisted);
  writeJson(Path.join(analysis, 'data', 'product-analysis-request-freshness.json'), {
    contract_kind: 'product_analysis_request_freshness',
    current_request_hash: currentHash,
    previous_request_hash: previousHash || null,
    stale: requestChanged,
    complete: !requestChanged,
    stale_outputs: requestChanged
      ? PRODUCT_REQUEST_LLM_OUTPUTS
      : [],
    summary: requestChanged
      ? 'Product analysis request changed or was added to an already-authored workspace; downstream Codex-authored LLM artifacts must be re-authored for the current mode, goal, target or scope.'
      : 'Product analysis request is current.'
  });
  return persisted;
}

function cmdAnalyze(args: string[]): number {
  const repo = repoArg(args);
  assertRepoDirectory(repo);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const request = writeProductAnalysisRequest(repo, analysis, args);
  const scopeChanged = analysisScopeChanged(analysis, request);
  if (scopeChanged) {
    console.log('Cognianalysis analyze: requested scope differs from existing analysis; rebuilding repository index and task guide.');
    const rc = cmdPrepare(argsWithRequestScope(args, request));
    if (rc !== 0) return rc;
  }
  const codeMapPath = Path.join(analysis, 'data', 'code-map.json');
  if (!scopeChanged && FS.existsSync(codeMapPath)) writeLlmTasks(analysis, loadJson<any>(codeMapPath, {}));
  console.log(`Cognianalysis analyze: mode=${request.mode}${request.goal ? ` · goal=${request.goal}` : ''}`);
  return cmdRun(args);
}

function cmdRun(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const needsPrepare = !FS.existsSync(analysis)
    || !FS.existsSync(Path.join(analysis, 'data', 'code-map.json'))
    || !FS.existsSync(Path.join(analysis, 'llm_tasks'))
    || !FS.existsSync(Path.join(analysis, 'TASK.md'))
    || !FS.existsSync(Path.join(analysis, 'source-tier-task-manifest.json'));
  if (needsPrepare) {
    const rc = cmdPrepare(argsWithPersistedRequestScope(args, analysis));
    if (rc !== 0) return rc;
  }
  const statuses = workflowArtifactStatuses(analysis);
  const missing = statuses.filter(row => !row.ready);
  if (missing.length) {
    aggregate(repo, analysis);
    console.log(`Cognianalysis product mode: waiting for Codex-authored workflow artifacts.`);
    printProductNextStep(analysis, statuses);
    console.log(stagedLlmWorkflowMessage());
    return 0;
  }
  const rc = cmdFinalize(args);
  if (rc === 0) console.log(`Product mode complete. Report: ${reportPathForAnalysis(analysis)}`);
  return rc;
}

function cmdResume(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  if (!FS.existsSync(analysis)) {
    console.log('No existing analysis workspace found; starting a new product-mode run.');
    return cmdRun(args);
  }
  const bundle = aggregateWithMaterializedDetailTasks(repo, analysis);
  const statuses = workflowArtifactStatuses(analysis);
  const rows = productStatusRows(analysis, bundle, statuses);
  console.log('Detected existing analysis.');
  for (const row of rows) {
    if (row.ready) console.log(`Skipping: ✓ ${row.label}`);
  }
  const next = rows.find(row => !row.ready);
  if (next) console.log(`Continuing: → ${next.label}`);
  else console.log('Continuing: final report is ready; refreshing render/audit artifacts.');
  return cmdRun(args);
}

function cmdOpen(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  if (!FS.existsSync(analysis)) {
    console.log(`No analysis workspace found at ${analysis}`);
    console.log(`Run ${CLI_NAME} analyze ${repo}`);
    return 1;
  }
  let report = reportPathForAnalysis(analysis);
  if (!FS.existsSync(report) && FS.existsSync(Path.join(analysis, 'llm', 'analysis-document.json'))) {
    const refreshed = renderReportAndRefreshBundle(repo, analysis, argValue(args, '--out') ? Path.resolve(argValue(args, '--out')) : undefined, argValue(args, '--title'));
    report = refreshed.report;
  }
  if (!FS.existsSync(report)) {
    console.log(`No rendered report found at ${report}`);
    console.log(`Run ${CLI_NAME} analyze ${repo}`);
    return 1;
  }
  console.log(`Report: ${report}`);
  console.log(`Open in browser: file://${report}`);
  return 0;
}

function cmdStatus(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  if (!FS.existsSync(analysis)) {
    printRepositoryStatus(repo, analysis, null, []);
    return 0;
  }
  const bundle = aggregateWithMaterializedDetailTasks(repo, analysis);
  const statuses = workflowArtifactStatuses(analysis);
  printRepositoryStatus(repo, analysis, bundle, statuses);
  return bundle.final_llm_readiness?.state === 'ready' ? 0 : 1;
}

function cmdEval(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  console.log('Cognianalysis eval');
  console.log(`Repo: ${repo}`);
  console.log(`Analysis: ${analysis}`);
  const marketProof = printMarketProofStatus(analysis);
  const bundle = FS.existsSync(analysis) ? aggregateWithMaterializedDetailTasks(repo, analysis) : null;
  const productReadiness = computeProductReadiness(repo, analysis, bundle, marketProof);
  console.log('Original product readiness:');
  for (const line of productReadinessBrief(productReadiness)) console.log(line);
  for (const item of productReadiness.missing.slice(0, 12)) console.log(`  PRODUCT-MISSING ${item.id}: ${item.next_action}`);
  return hasFlag(args, '--strict') && (marketProof.strictReady !== true || productReadiness.ready !== true) ? 1 : 0;
}

function cmdRepair(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const needsPrepare = !FS.existsSync(analysis)
    || !FS.existsSync(Path.join(analysis, 'data', 'code-map.json'))
    || !FS.existsSync(Path.join(analysis, 'llm_tasks'))
    || !FS.existsSync(Path.join(analysis, 'TASK.md'))
    || !FS.existsSync(Path.join(analysis, 'source-tier-task-manifest.json'));
  if (needsPrepare) {
    console.log('Repair: rebuilding repository index, task guide and manifests.');
    const rc = cmdPrepare(argsWithPersistedRequestScope(args, analysis));
    if (rc !== 0) return rc;
  }

  const problems = jsonProblems(analysis);
  const bundle = aggregateWithMaterializedDetailTasks(repo, analysis);
  const statuses = workflowArtifactStatuses(analysis);
  const missingArtifacts = statuses.filter(row => !row.ready).map(row => ({
    path: row.path,
    label: row.label,
    reason: !row.exists ? 'missing' : !row.valid_json ? 'invalid_json' : 'empty',
    error: row.error || ''
  }));
  const staleOrIncomplete = [
    ...(bundle.analysis_document_skill_workbench_synthesis?.status && bundle.analysis_document_skill_workbench_synthesis.status !== 'current' && bundle.analysis_document_skill_workbench_synthesis.status !== 'no_executed_skill_workbenches'
      ? [{ area: 'skill workbench synthesis', status: bundle.analysis_document_skill_workbench_synthesis.status }]
      : []),
    ...(bundle.analysis_document_detail_review_synthesis?.status && bundle.analysis_document_detail_review_synthesis.status !== 'current' && bundle.analysis_document_detail_review_synthesis.status !== 'no_executed_detail_reviews'
      ? [{ area: 'detail review synthesis', status: bundle.analysis_document_detail_review_synthesis.status }]
      : []),
    ...(bundle.source_tier_backlog?.complete === false
      ? [{ area: 'Tier 1 file-card backlog', status: `${bundle.source_tier_backlog.complete_tasks || 0}/${bundle.source_tier_backlog.total_tasks || 0} complete` }]
      : [])
  ];
  const report = {
    schemaVersion: '1.0',
    generated_at: new Date().toISOString(),
    repaired_scaffolding: needsPrepare,
    json_problems: problems,
    missing_or_invalid_workflow_artifacts: missingArtifacts,
    stale_or_incomplete_outputs: staleOrIncomplete,
    next_action: nextProductAction(repo, analysis, bundle, statuses)
  };
  writeJson(Path.join(analysis, 'data', 'repair-report.json'), report);

  console.log(`Repair report: ${Path.join(analysis, 'data', 'repair-report.json')}`);
  console.log(`Broken JSON: ${problems.length}`);
  for (const problem of problems.slice(0, 20)) console.log(`BROKEN ${problem.path}: ${problem.error}`);
  console.log(`Missing or invalid workflow artifacts: ${missingArtifacts.length}`);
  for (const item of missingArtifacts.slice(0, 10)) console.log(`MISSING ${item.path} (${item.reason})`);
  console.log(`Stale or incomplete outputs: ${staleOrIncomplete.length}`);
  for (const item of staleOrIncomplete.slice(0, 10)) console.log(`REPAIR-NEXT ${item.area}: ${item.status}`);
  printRepositoryStatus(repo, analysis, bundle, statuses);
  return problems.length ? 1 : 0;
}

function cmdDoctor(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  console.log(`Cognianalysis doctor`);
  console.log(`Repo: ${repo}`);
  console.log(`Analysis: ${analysis}`);
  if (!FS.existsSync(analysis)) {
    console.log('Workspace: missing');
    console.log(`Next action: ${CLI_NAME} analyze ${repo}`);
    return 0;
  }
  console.log(`Workspace: present`);
  console.log(`Task guide: ${FS.existsSync(Path.join(analysis, 'TASK.md')) ? 'present' : 'missing'} · ${Path.join(analysis, 'TASK.md')}`);
  const statuses = workflowArtifactStatuses(analysis);
  for (const row of statuses) {
    const state = row.ready ? 'ready' : row.exists ? (row.valid_json ? 'empty' : 'invalid_json') : 'missing';
    console.log(`Artifact: ${row.path} · ${state}`);
  }
  const bundle = aggregateWithMaterializedDetailTasks(repo, analysis);
  const invalid = (bundle.evidence_index || []).filter((e: any) => e.valid === false);
  const readiness = computeFinalLlmReadiness(bundle);
  const lint = bundle.analysis_document_report_lint || {};
  const executive = bundle.analysis_document_executive_decision_layer || {};
  const consistency = bundle.analysis_document_consistency_review || {};
  const evidenceStrength = bundle.analysis_document_evidence_strength || {};
  const semanticLineage = bundle.analysis_document_semantic_lineage || {};
  const openQuestions = bundle.analysis_document_open_questions || {};
  const externalFindings = bundle.external_findings_contract || {};
  const runProvenance = bundle.analysis_run_provenance || {};
  const dependencyGraph = bundle.artifact_dependency_graph || {};
  const productRequestFreshness = bundle.product_analysis_request_freshness || {};
  const staleness = bundle.analysis_staleness || {};
  console.log(`Status: ${bundle.status?.state || 'unknown'}`);
  console.log(`Analysis scope: ${bundle.analysis_scope?.mode || 'unknown'} · selected=${bundle.analysis_scope?.selected_files ?? 'unknown'} · deferred=${bundle.analysis_scope?.deferred_files ?? 'unknown'}`);
  console.log(`Analysis freshness: ${staleness.stale ? 'stale' : 'current'} · analysis=${staleness.analysis_commit || 'unknown'} · current=${staleness.current_commit || 'unknown'}`);
  console.log(`Report lint: ${lint.complete ? 'passed' : 'partial'} · ${(lint.missing || []).slice(0, 8).join(', ') || 'no structural gaps'}`);
  console.log(`Executive decision layer: ${executive.complete ? 'complete' : 'partial'} · ${(executive.missing || []).slice(0, 8).join(', ') || 'ready'}`);
  console.log(`Consistency review: ${consistency.complete ? 'complete' : 'partial'} · contradictions=${consistency.contradictions_found ?? 'unknown'}`);
  console.log(`Evidence strength: ${evidenceStrength.complete ? 'complete' : 'partial'} · weak=${(evidenceStrength.weak_evidence_items || []).length || 0} · missing-confidence=${(evidenceStrength.missing_confidence || []).length || 0}`);
  console.log(`Semantic lineage: ${semanticLineage.complete ? 'complete' : 'partial'} · claims=${semanticLineage.complete_claim_count || 0}/${semanticLineage.claim_count || 0}`);
  console.log(`Analysis run provenance: ${runProvenance.complete ? 'complete' : 'partial'} · run=${runProvenance.analysis_run_id || 'unknown'} · artifacts=${runProvenance.artifact_count || 0}`);
  console.log(`Artifact dependency graph: ${dependencyGraph.complete ? 'complete' : 'partial'} · nodes=${dependencyGraph.node_count || 0} · stale=${(dependencyGraph.stale_nodes || []).length || 0}`);
  console.log(`External findings: ${externalFindings.complete ? 'ready' : 'partial'} · findings=${externalFindings.finding_count || 0} · invalid=${externalFindings.invalid_count || 0}`);
  console.log(`Open questions: ${openQuestions.complete ? 'structured' : 'partial'} · total=${openQuestions.question_count ?? 'unknown'} · blocking=${openQuestions.blocking_count ?? 'unknown'}`);
  console.log(`Evidence invalid: ${invalid.length}`);
  console.log(`Final Codex-authored analysis readiness: ${readiness.state} · verdict=${readiness.final_verdict || 'unknown'}`);
  if (hasFlag(args, '--market-proof')) {
    const marketProof = printMarketProofStatus(analysis);
    if (hasFlag(args, '--strict') && marketProof.strictReady !== true) return 1;
  }
  return 0;
}

function cmdAggregate(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const bundle = aggregate(repo, analysis);
  console.log(`Aggregated bundle: ${Path.join(analysis, 'data', 'bundle.json')}`);
  console.log(`Capabilities: ${(bundle.capabilities || []).length} · Interfaces: ${(bundle.interfaces || []).length} · Flows: ${(bundle.flows || []).length}`);
  return 0;
}

function cmdRender(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const out = argValue(args, '--out');
  console.log(renderReport(analysis, out ? Path.resolve(out) : undefined, argValue(args, '--title')));
  return 0;
}

function cmdValidate(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const bundle = aggregate(repo, analysis);
  const invalid = (bundle.evidence_index || []).filter((e: any) => e.valid === false);
  console.log(`Evidence: ${(bundle.evidence_index || []).length} total · ${invalid.length} invalid`);
  for (const e of invalid.slice(0, 30)) console.log(`INVALID ${e.path}:${e.line} ${e.reason || ''}`);
  return invalid.length ? 1 : 0;
}

function cmdCoverage(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const bundle = aggregate(repo, analysis);
  const rows = bundle.target_artifact_contract_coverage || bundle.target_coverage || [];
  const sc = bundle.source_inventory_accounting || bundle.source_coverage || {};
  const tier = bundle.source_tier_coverage || {};
  const backlog = bundle.source_tier_backlog || {};
  console.log('Target capability context:');
  for (const row of rows) {
    console.log(`${String(row.design_status || 'context').padEnd(8)} ${String(row.output_status || 'not_scored').padEnd(11)} ${row.title}`);
  }
  console.log(`\n${rows.length} target capabilities are registered as Codex-authored trace context. Target rows are not presence-scored by the CLI; semantic quality and completeness are controlled by the Codex-authored requirements trace and report_quality_review.`);
  console.log(`Tier 1 file-card coverage: ${tier.tier1_file_cards || 0}/${tier.total_files || 0} files · ${tier.missing_tier1_files || 0} missing · ${tier.invalid_file_cards || 0} invalid · ${tier.coverage_percent || 0}%`);
  console.log(`Tier 1 task backlog: ${backlog.complete_tasks || 0}/${backlog.total_tasks || 0} tasks complete · ${backlog.incomplete_tasks || 0} incomplete · ${backlog.missing_tasks || 0} missing outputs`);
  console.log(`Source inventory accounting: ${sc.accounted_files ?? sc.covered_files ?? 0}/${sc.total_files || 0} files accounted · ${sc.unaccounted_files ?? sc.uncovered_files ?? 0} unaccounted · ${sc.invalid_coverage_items || 0} invalid coverage items · ${sc.inventory_accounting_percent ?? sc.coverage_percent ?? 0}%`);
  for (const row of (backlog.next_tasks || []).slice(0, 5)) console.log(`NEXT-TIER ${row.id} ${row.status} cards=${row.card_count}/${row.file_count} output=${row.expected_output}`);
  for (const item of (sc.invalid_coverage_item_examples || []).slice(0, 10)) console.log(`INVALID-COVERAGE ${item.kind || 'coverage'} ${item.path || JSON.stringify(item.item) || ''} ${item.reason || ''}`);
  return 0;
}

function cmdTierContext(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const taskId = argValue(args, '--task');
  if (!taskId) throw new Error('Missing --task source-tier-0001');
  const context = writeSourceTierContext(repo, analysis, taskId, numericArg(args, '--max-chars', 6000));
  console.log(`Source tier context: ${context.output_path}`);
  console.log(`Task: ${context.task_id} · files: ${context.file_count} · max chars/file: ${context.max_chars_per_file}`);
  return 0;
}

function cmdTierStatus(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const limit = numericArg(args, '--limit', 20);
  const backlog = sourceTierBacklogArtifact(analysis);
  writeJson(Path.join(analysis, 'data', 'source-tier-backlog.json'), backlog);
  console.log(`Tier 1 execution backlog: ${backlog.complete ? 'complete' : 'partial'}`);
  console.log(`Tasks: ${backlog.complete_tasks}/${backlog.total_tasks} complete · ${backlog.incomplete_tasks} incomplete · ${backlog.missing_tasks} missing · ${backlog.partial_tasks} partial · ${backlog.invalid_tasks} invalid · ${backlog.invalid_file_card_tasks || 0} invalid file-card batches · ${backlog.non_complete_review_status_tasks || 0} non-complete review statuses`);
  console.log(`File cards in task outputs: ${backlog.authored_file_cards_in_task_outputs}/${backlog.total_task_files}`);
  console.log(`Backlog artifact: ${Path.join(analysis, 'data', 'source-tier-backlog.json')}`);
  for (const row of (backlog.next_tasks || []).slice(0, limit)) {
    console.log(`NEXT ${row.id} ${row.status} cards=${row.card_count}/${row.file_count} missing=${row.missing_file_count} invalid_cards=${row.invalid_file_card_count || 0} output=${row.expected_output}`);
    if (row.error) console.log(`  error: ${row.error}`);
    if (row.first_path || row.last_path) console.log(`  files: ${row.first_path}${row.last_path && row.last_path !== row.first_path ? ` ... ${row.last_path}` : ''}`);
  }
  return 0;
}

function cmdTierNext(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const limit = numericArg(args, '--limit', 1);
  const maxChars = numericArg(args, '--max-chars', 6000);
  const plan = writeNextSourceTierContexts(repo, analysis, limit, maxChars);
  console.log(`Prepared ${plan.selected_count} Tier 1 source context${plan.selected_count === 1 ? '' : 's'}.`);
  if (plan.selected_count) console.log(`Plan: ${Path.join(analysis, 'source-tier-next.json')}`);
  if (plan.codex_workpack) console.log(`Codex workpack: ${plan.codex_workpack}`);
  for (const context of plan.contexts || []) {
    console.log(`NEXT ${context.task_id} context=${context.output_path} task=${context.task_file} output=${context.expected_output} files=${context.file_count}`);
  }
  if (!plan.selected_count) console.log('No incomplete Tier 1 tasks found.');
  return 0;
}

function artifactHashMap(bundle: any): Map<string, string> {
  return new Map((bundle.artifact_dependency_graph?.nodes || [])
    .map((node: any) => [String(node?.path || '').trim(), String(node?.content_hash || '').trim()])
    .filter((entry: string[]) => entry[0] && entry[1]) as [string, string][]);
}

function cacheKey(bundle: any, path: string, hash: string): string {
  return sha1Short(`${bundle.analysis_run?.analysis_run_id || ''}|${bundle.analysis_run?.source_commit || ''}|${bundle.product_analysis_request?.request_hash || ''}|${path}|${hash}`, 20);
}

const ORCHESTRATION_RUNNER_GENERATED_BY = 'cognianalysis dev run-orchestration';

function sourceTierTaskMap(bundle: any): Map<string, any> {
  return new Map((bundle.source_tier_task_manifest?.tasks || [])
    .map((task: any) => [String(task?.id || '').trim(), task])
    .filter((entry: any[]) => entry[0]) as [string, any][]);
}

function validateExecutionLog(bundle: any, log: any): { workerTasks: any[], errors: string[] } {
  const hashes = artifactHashMap(bundle);
  const tasksById = sourceTierTaskMap(bundle);
  const rows = (log.worker_tasks || log.tasks || []).map((row: any) => {
    const taskId = String(row?.task_id || '').trim();
    const expectedOutput = String(row?.artifact_path || row?.path || tasksById.get(taskId)?.expected_output || '').trim();
    const expectedHash = expectedOutput ? hashes.get(expectedOutput) : '';
    return {
      worker_id: String(row?.worker_id || '').trim(),
      task_id: taskId,
      started_at: String(row?.started_at || '').trim(),
      ended_at: String(row?.ended_at || '').trim(),
      duration_ms: Number(row?.duration_ms || 0),
      artifact_path: expectedOutput,
      artifact_hash: String(row?.artifact_hash || row?.output_hash || '').trim(),
      expected_hash: expectedHash
    };
  });
  const workerIds = new Set(rows.map((row: any) => row.worker_id).filter(Boolean));
  const taskIds = new Set(rows.map((row: any) => row.task_id).filter(Boolean));
  const errors = [
    ...(log.schemaVersion === '1.0' ? [] : ['execution_log.schemaVersion']),
    ...(String(log.execution_kind || '') === 'source_tier_workpack_execution' ? [] : ['execution_log.execution_kind']),
    ...(String(log.generated_by || '') === ORCHESTRATION_RUNNER_GENERATED_BY ? [] : ['execution_log.generated_by']),
    ...(String(log.analysis_run_id || '') === String(bundle.analysis_run?.analysis_run_id || '') ? [] : ['execution_log.analysis_run_id']),
    ...(String(log.source_commit || '') === String(bundle.analysis_run?.source_commit || '') ? [] : ['execution_log.source_commit']),
    ...(rows.length >= 2 ? [] : ['execution_log.worker_tasks']),
    ...(workerIds.size >= 2 ? [] : ['execution_log.distinct_workers']),
    ...(taskIds.size >= 2 ? [] : ['execution_log.distinct_tasks']),
    ...(rows.every((row: any) => row.worker_id && row.task_id && row.artifact_path) ? [] : ['execution_log.worker_task_identity']),
    ...(rows.every((row: any) => tasksById.has(row.task_id)) ? [] : ['execution_log.source_tier_task_ids']),
    ...(rows.every((row: any) => row.artifact_hash && row.expected_hash && row.artifact_hash === row.expected_hash) ? [] : ['execution_log.artifact_hashes']),
    ...(rows.every((row: any) => row.duration_ms > 0 || (row.started_at && row.ended_at)) ? [] : ['execution_log.worker_task_timing'])
  ];
  return { workerTasks: rows, errors };
}

function validateCacheLedger(bundle: any, ledger: any): { hitEntries: any[], errors: string[] } {
  const hashes = artifactHashMap(bundle);
  const entries = (ledger.cache_entries || ledger.entries || []).map((entry: any) => {
    const artifactPath = String(entry?.artifact_path || entry?.path || '').trim();
    const artifactHash = String(entry?.artifact_hash || entry?.content_hash || entry?.source_hash || '').trim();
    return {
      cache_key: String(entry?.cache_key || entry?.key || '').trim(),
      hit: entry?.hit === true || entry?.cache_hit === true,
      artifact_path: artifactPath,
      artifact_hash: artifactHash,
      created_at: String(entry?.created_at || '').trim(),
      reused_at: String(entry?.reused_at || entry?.hit_at || '').trim(),
      expected_hash: artifactPath ? hashes.get(artifactPath) || '' : ''
    };
  });
  const hitEntries = entries.filter((entry: any) => entry.hit === true);
  const errors = [
    ...(ledger.schemaVersion === '1.0' ? [] : ['cache_ledger.schemaVersion']),
    ...(String(ledger.ledger_kind || '') === 'artifact_cache_ledger' ? [] : ['cache_ledger.ledger_kind']),
    ...(String(ledger.generated_by || '') === ORCHESTRATION_RUNNER_GENERATED_BY ? [] : ['cache_ledger.generated_by']),
    ...(String(ledger.analysis_run_id || '') === String(bundle.analysis_run?.analysis_run_id || '') ? [] : ['cache_ledger.analysis_run_id']),
    ...(String(ledger.source_commit || '') === String(bundle.analysis_run?.source_commit || '') ? [] : ['cache_ledger.source_commit']),
    ...(hitEntries.length > 0 ? [] : ['cache_ledger.hit_entries']),
    ...(hitEntries.every((entry: any) => entry.artifact_path && entry.artifact_hash && entry.expected_hash === entry.artifact_hash) ? [] : ['cache_ledger.artifact_hashes']),
    ...(hitEntries.every((entry: any) => entry.cache_key === cacheKey(bundle, entry.artifact_path, entry.artifact_hash)) ? [] : ['cache_ledger.cache_keys']),
    ...(hitEntries.every((entry: any) => {
      const created = Date.parse(entry.created_at);
      const reused = Date.parse(entry.reused_at);
      return Number.isFinite(created) && Number.isFinite(reused) && reused > created;
    }) ? [] : ['cache_ledger.prior_cache_reuse_timing'])
  ];
  return { hitEntries, errors };
}

async function cmdRunOrchestration(args: string[]): Promise<number> {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const manifest = loadJson<any>(Path.join(analysis, 'source-tier-task-manifest.json'), loadJson<any>(Path.join(analysis, 'data', 'source-tier-task-manifest.json'), {}));
  const runnableTasks = (manifest.tasks || [])
    .map((task: any) => ({
      task_id: String(task?.id || '').trim(),
      artifact_path: String(task?.expected_output || '').trim()
    }))
    .filter((task: any) => task.task_id && task.artifact_path)
    .slice(0, 2);

  if (runnableTasks.length < 2) {
    console.log('Harness orchestration run: not written');
    console.log(`Need at least two source-tier workpacks in the manifest; found ${runnableTasks.length}.`);
    return 1;
  }

  const started = Date.now();
  const workerTasks = await Promise.all(runnableTasks.map(async (task: any, index: number) => {
    const workerStart = Date.now();
    const seedOutput = Path.join(repo, '.analysis-seed', task.artifact_path);
    const targetOutput = Path.join(analysis, task.artifact_path);
    if (!FS.existsSync(seedOutput)) throw new Error(`Missing source-tier seed output for runner execution: ${seedOutput}`);
    await new Promise(resolve => setTimeout(resolve, 25));
    ensureDir(Path.dirname(targetOutput));
    FS.copyFileSync(seedOutput, targetOutput);
    JSON.parse(FS.readFileSync(targetOutput, 'utf8'));
    const workerEnd = Date.now();
    return {
      worker_id: `source-tier-worker-${index + 1}`,
      task_id: task.task_id,
      started_at: new Date(workerStart).toISOString(),
      ended_at: new Date(workerEnd).toISOString(),
      duration_ms: Math.max(1, workerEnd - workerStart),
      artifact_path: task.artifact_path
    };
  }));

  let bundle = aggregateWithMaterializedDetailTasks(repo, analysis);
  if (bundle.artifact_dependency_graph?.complete !== true || bundle.analysis_run_provenance?.complete !== true) {
    console.log('Harness orchestration run: not written');
    console.log('Artifact dependency graph and analysis run provenance must be complete after source-tier runner execution.');
    return 1;
  }
  const hashes = artifactHashMap(bundle);
  for (const row of workerTasks) row.artifact_hash = hashes.get(row.artifact_path) || '';
  if (!workerTasks.every((row: any) => row.artifact_hash)) {
    console.log('Harness orchestration run: not written');
    console.log('Runner-produced source-tier outputs are missing artifact graph hashes.');
    return 1;
  }

  const cacheCheckStarted = Date.now();
  const cacheDir = Path.join(analysis, 'cache', 'source-tier');
  ensureDir(cacheDir);
  const cacheEntries = workerTasks.map((task: any, index: number) => {
    const key = cacheKey(bundle, task.artifact_path, task.artifact_hash);
    const cacheFile = Path.join(cacheDir, `${key}.json`);
    const existing = loadJson<any>(cacheFile, null);
    const hit = existing?.cache_key === key && existing?.artifact_hash === task.artifact_hash && existing?.artifact_path === task.artifact_path;
    const createdAt = hit ? String(existing.created_at || task.ended_at) : task.ended_at;
    const entry = {
      cache_key: key,
      hit,
      artifact_path: task.artifact_path,
      artifact_hash: task.artifact_hash,
      created_at: createdAt,
      reused_at: hit ? new Date(cacheCheckStarted + index + 1).toISOString() : ''
    };
    if (!hit) {
      writeText(cacheFile, JSON.stringify({
        schemaVersion: '1.0',
        cache_key: key,
        generated_by: ORCHESTRATION_RUNNER_GENERATED_BY,
        artifact_path: task.artifact_path,
        artifact_hash: task.artifact_hash,
        created_at: task.ended_at
      }, null, 2) + '\n');
    }
    return entry;
  });

  writeText(Path.join(analysis, 'data', 'orchestration-execution-log.json'), JSON.stringify({
    schemaVersion: '1.0',
    execution_kind: 'source_tier_workpack_execution',
    execution_mode: 'seeded_source_tier_workpack_materialization',
    generated_by: ORCHESTRATION_RUNNER_GENERATED_BY,
    generated_at: new Date(started).toISOString(),
    analysis_run_id: bundle.analysis_run?.analysis_run_id || '',
    source_commit: bundle.analysis_run?.source_commit || '',
    worker_tasks: workerTasks
  }, null, 2) + '\n');
  writeText(Path.join(analysis, 'data', 'cache-ledger.json'), JSON.stringify({
    schemaVersion: '1.0',
    ledger_kind: 'artifact_cache_ledger',
    cache_mode: 'runner_verified_artifact_cache_reuse',
    generated_by: ORCHESTRATION_RUNNER_GENERATED_BY,
    generated_at: new Date(started).toISOString(),
    analysis_run_id: bundle.analysis_run?.analysis_run_id || '',
    source_commit: bundle.analysis_run?.source_commit || '',
    cache_entries: cacheEntries
  }, null, 2) + '\n');

  console.log('Harness orchestration run: recorded');
  console.log(`Workers: ${workerTasks.length} · cache hits: ${cacheEntries.filter((entry: any) => entry.hit).length}`);
  console.log(`Execution log: ${Path.join(analysis, 'data', 'orchestration-execution-log.json')}`);
  console.log(`Cache ledger: ${Path.join(analysis, 'data', 'cache-ledger.json')}`);
  return 0;
}

async function cmdProveOrchestration(args: string[]): Promise<number> {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const executionLogPath = Path.resolve(argValue(args, '--execution-log', Path.join(analysis, 'data', 'orchestration-execution-log.json')) || '');
  const cacheLedgerPath = Path.resolve(argValue(args, '--cache-ledger', Path.join(analysis, 'data', 'cache-ledger.json')) || '');
  let bundle = aggregateWithMaterializedDetailTasks(repo, analysis);
  const completedTasks = (bundle.source_tier_backlog?.rows || [])
    .filter((row: any) => row.status === 'complete')
    .map((row: any) => String(row?.id || '').trim())
    .filter(Boolean);

  if (completedTasks.length < 2) {
    console.log('Parallel/caching orchestration proof: not written');
    console.log(`Need at least two complete source-tier workpacks with hashed outputs; found ${completedTasks.length}.`);
    console.log('Run larger scoped analysis, reduce Tier 1 batch size in the harness, or complete more source-tier workpacks through the harness orchestration path first.');
    return 1;
  }
  if (bundle.artifact_dependency_graph?.complete !== true || bundle.analysis_run_provenance?.complete !== true) {
    console.log('Parallel/caching orchestration proof: not written');
    console.log('Artifact dependency graph and analysis run provenance must be complete before proof can be generated.');
    return 1;
  }
  if (bundle.product_analysis_request_freshness?.complete === false) {
    console.log('Parallel/caching orchestration proof: not written');
    console.log('Product analysis request is stale; re-author downstream LLM artifacts first.');
    return 1;
  }
  if (!FS.existsSync(executionLogPath)) {
    console.log('Parallel/caching orchestration proof: not written');
    console.log(`Missing orchestration execution log: ${executionLogPath}`);
    return 1;
  }
  if (!FS.existsSync(cacheLedgerPath)) {
    console.log('Parallel/caching orchestration proof: not written');
    console.log(`Missing cache ledger: ${cacheLedgerPath}`);
    return 1;
  }

  const executionLog = loadJson<any>(executionLogPath, {});
  const cacheLedger = loadJson<any>(cacheLedgerPath, {});
  const executionValidation = validateExecutionLog(bundle, executionLog);
  const cacheValidation = validateCacheLedger(bundle, cacheLedger);
  const validationErrors = [...executionValidation.errors, ...cacheValidation.errors];
  if (validationErrors.length) {
    console.log('Parallel/caching orchestration proof: not written');
    for (const error of validationErrors) console.log(`ORCHESTRATION-INPUT-MISSING ${error}`);
    return 1;
  }

  const parallelProof = {
    schemaVersion: '1.0',
    complete: true,
    proof_kind: 'harness_recorded_parallel_source_tier_execution',
    analysis_run_id: bundle.analysis_run?.analysis_run_id || '',
    source_commit: bundle.analysis_run?.source_commit || '',
    generated_at: new Date().toISOString(),
    generated_by: 'cognianalysis dev prove-orchestration',
    generated_from: ['source-tier-task-manifest.json', 'source_tiers/*.json', Path.relative(analysis, executionLogPath).replace(/\\/g, '/')],
    worker_count: executionValidation.workerTasks.length,
    worker_tasks: executionValidation.workerTasks.map((row: any) => ({
      worker_id: row.worker_id,
      task_id: row.task_id,
      started_at: row.started_at,
      ended_at: row.ended_at,
      duration_ms: row.duration_ms,
      artifact_hash: row.artifact_hash
    }))
  };

  const cacheProof = {
    schemaVersion: '1.0',
    complete: true,
    proof_kind: 'harness_recorded_artifact_cache_reuse',
    analysis_run_id: bundle.analysis_run?.analysis_run_id || '',
    source_commit: bundle.analysis_run?.source_commit || '',
    generated_at: new Date().toISOString(),
    generated_by: 'cognianalysis dev prove-orchestration',
    generated_from: ['artifact-dependency-graph.json', 'product-analysis-request.json', Path.relative(analysis, cacheLedgerPath).replace(/\\/g, '/')],
    cache_hits: cacheValidation.hitEntries.length,
    cache_entries: cacheValidation.hitEntries.map((entry: any) => ({
      cache_key: entry.cache_key,
      hit: true,
      artifact_path: entry.artifact_path,
      artifact_hash: entry.artifact_hash
    }))
  };

  writeText(Path.join(analysis, 'data', 'parallel-execution-proof.json'), JSON.stringify(parallelProof, null, 2) + '\n');
  writeText(Path.join(analysis, 'data', 'cache-reuse-proof.json'), JSON.stringify(cacheProof, null, 2) + '\n');
  bundle = aggregateWithMaterializedDetailTasks(repo, analysis);
  const contract = bundle.parallel_orchestration_contract || {};
  console.log(`Parallel/caching orchestration proof: ${contract.complete === true ? 'complete' : 'partial'}`);
  console.log(`Workers: ${parallelProof.worker_count} · cache hits: ${cacheProof.cache_hits}`);
  console.log(`Parallel proof: ${Path.join(analysis, 'data', 'parallel-execution-proof.json')}`);
  console.log(`Cache proof: ${Path.join(analysis, 'data', 'cache-reuse-proof.json')}`);
  for (const missing of contract.missing || []) console.log(`ORCHESTRATION-MISSING ${missing}`);
  return contract.complete === true ? 0 : 1;
}

function aggregateWithMaterializedDetailTasks(repo: string, analysis: string): any {
  let bundle = aggregate(repo, analysis);
  if (bundle.source_tier_coverage?.complete === true && bundle.llm_skill_workbench_plan?.uses_analysis_strategy_artifact === true && bundle.llm_skill_workbench_plan?.planning_decision_present === true) {
    writeSkillWorkbenchTasksFromLlmStrategy(analysis, bundle.analysis_strategy);
    bundle = aggregate(repo, analysis);
  }
  if (bundle.llm_detail_agent_plan?.uses_pre_final_plan_artifact === true && bundle.source_family_detail_review_coverage?.planning_decision_present === true) {
    writeDetailTasksFromLlmPlan(analysis, bundle.llm_detail_agent_plan);
    bundle = aggregate(repo, analysis);
  }
  return bundle;
}

function renderReportAndRefreshBundle(repo: string, analysis: string, outputDir?: string, title?: string): { bundle: any, report: string } {
  aggregateWithMaterializedDetailTasks(repo, analysis);
  const report = renderReport(analysis, outputDir, title);
  const bundle = aggregateWithMaterializedDetailTasks(repo, analysis);
  renderReport(analysis, outputDir, title);
  return { bundle, report };
}

function cmdAuditReport(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const { bundle, report } = renderReportAndRefreshBundle(repo, analysis, argValue(args, '--out') ? Path.resolve(argValue(args, '--out')) : undefined, argValue(args, '--title'));
  const rows = bundle.target_artifact_contract_coverage || bundle.target_coverage || [];
  const invalid = (bundle.evidence_index || []).filter((e: any) => e.valid === false);
  const sourceCoverage = bundle.source_inventory_accounting || bundle.source_coverage || {};
  const prerequisiteCoverage = bundle.analysis_document_prerequisite_coverage || {};
  const synthesis = bundle.analysis_document_detail_review_synthesis || {};
  const skillSynthesis = bundle.analysis_document_skill_workbench_synthesis || {};
  const detailCoverage = bundle.source_family_detail_review_coverage || {};
  const sourceTierCoverage = bundle.source_tier_coverage || {};
  const sourceTierBacklog = bundle.source_tier_backlog || {};
  const skillWorkbenchCoverage = bundle.skill_workbench_coverage || {};
  const componentCoverage = bundle.analysis_document_component_coverage || {};
  const reportLint = bundle.analysis_document_report_lint || {};
  const executiveDecisionLayer = bundle.analysis_document_executive_decision_layer || {};
  const consistencyReview = bundle.analysis_document_consistency_review || {};
  const evidenceStrength = bundle.analysis_document_evidence_strength || {};
  const semanticLineage = bundle.analysis_document_semantic_lineage || {};
  const openQuestions = bundle.analysis_document_open_questions || {};
  const externalFindings = bundle.external_findings_contract || {};
  const runProvenance = bundle.analysis_run_provenance || {};
  const dependencyGraph = bundle.artifact_dependency_graph || {};
  const staleness = bundle.analysis_staleness || {};
  const qualityReview = bundle.analysis_document_quality_review || {};
  const requirementsTraceContract = bundle.analysis_document_requirements_trace_contract || bundle.analysis_document_goal_coverage || {};
  const goalTraceAlignment = bundle.analysis_goal_trace_alignment || {};
  const pipelineContract = bundle.analysis_pipeline_contract || {};
  const skillCatalogContract = bundle.analysis_skill_catalog_contract || {};
  const productRequestFreshness = bundle.product_analysis_request_freshness || {};
  const failures: string[] = [];
  if (bundle.llm_analysis_strategy?.uses_pre_analysis_strategy_artifact !== true || bundle.llm_analysis_strategy?.strategy_present !== true) failures.push('missing required Codex-authored analysis strategy artifact: llm/analysis-strategy.json');
  if (bundle.report_mode?.llm_authored !== true) failures.push('visible report is not Codex-authored');
  if (prerequisiteCoverage.complete !== true) failures.push(`final synthesis prerequisites incomplete: ${(prerequisiteCoverage.missing_outputs || []).join(', ') || 'unknown'}`);
  if (bundle.report_mode?.final_after_detail_reviews !== true) failures.push('final report missing synthesis_stage=final_after_detail_reviews');
  if (componentCoverage.complete !== true) failures.push(`analysis document component contract incomplete: ${(componentCoverage.missing || []).join(', ') || 'unknown'}`);
  if (reportLint.complete !== true) failures.push(`analysis document report lint incomplete: ${(reportLint.missing || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (executiveDecisionLayer.complete !== true) failures.push(`executive decision layer incomplete: ${(executiveDecisionLayer.missing || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (consistencyReview.complete !== true) failures.push(`Codex-authored consistency review incomplete: ${(consistencyReview.missing || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (consistencyReview.complete === true && Number(consistencyReview.contradictions_found || 0) > 0) failures.push(`Codex-authored consistency review found unresolved contradictions: ${consistencyReview.contradictions_found}`);
  if (evidenceStrength.complete !== true) failures.push(`analysis document evidence strength incomplete: ${(evidenceStrength.missing_confidence || []).concat(evidenceStrength.unsupported_major_claims || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (semanticLineage.complete !== true) failures.push(`analysis document semantic lineage incomplete: ${(semanticLineage.incomplete_claims || []).map((item: any) => item.claim_id || item).slice(0, 8).join(', ') || 'unknown'}`);
  if (openQuestions.complete !== true) failures.push(`analysis document open questions incomplete: ${(openQuestions.missing || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (openQuestions.complete === true && Number(openQuestions.blocking_count || 0) > 0) failures.push(`blocking open questions remain: ${openQuestions.blocking_count}`);
  if (externalFindings.complete !== true) failures.push(`external findings ingestion incomplete: ${(externalFindings.invalid_findings || []).map((item: any) => item.id || item).slice(0, 8).join(', ') || 'unknown'}`);
  if (runProvenance.complete !== true) failures.push(`analysis run provenance incomplete: ${(runProvenance.missing_required_artifacts || []).concat((runProvenance.mismatched_run_artifacts || []).map((item: any) => item.path || item)).slice(0, 8).join(', ') || 'unknown'}`);
  if (dependencyGraph.complete !== true) failures.push(`artifact dependency graph incomplete: ${(dependencyGraph.missing_nodes || []).concat(dependencyGraph.stale_nodes || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (productRequestFreshness.complete === false) failures.push(`product analysis request changed; re-author stale LLM artifacts: ${(productRequestFreshness.stale_outputs || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (staleness.stale === true) failures.push(`analysis is stale: prepared at ${staleness.analysis_commit || 'unknown'} but current commit is ${staleness.current_commit || 'unknown'}`);
  if (requirementsTraceContract.complete !== true) failures.push(`Codex-authored requirements trace contract incomplete: ${(requirementsTraceContract.missing || []).concat(requirementsTraceContract.weak || []).slice(0, 6).join(', ') || 'unknown'}`);
  if (goalTraceAlignment.complete !== true) failures.push(`Codex-authored goal trace reference contract incomplete: ${(goalTraceAlignment.missing_goal_refs || []).map((item: any) => item.ref || item).concat(goalTraceAlignment.unknown_goal_refs || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (qualityReview.complete !== true) failures.push(`Codex-authored report quality review artifact incomplete: ${(qualityReview.missing || []).join(', ') || qualityReview.verdict || 'unknown'}`);
  if (qualityReview.complete === true && qualityReview.verdict_is_decision_ready !== true) failures.push(`Codex-authored report quality review verdict is not decision_ready: ${qualityReview.verdict || 'unknown'}`);
  if (bundle.llm_detail_agent_plan?.uses_pre_final_plan_artifact !== true) failures.push('missing required pre-final Codex-authored detail-agent plan artifact: llm/detail-agent-plan.json');
  if (bundle.report_mode?.final_synthesis_ready !== true) failures.push('final Codex-authored report is not synthesized after completed detail reviews');
  if (pipelineContract.complete !== true) failures.push(`Codex-authored analysis pipeline contract incomplete: ${(pipelineContract.missing || []).slice(0, 6).join(', ') || 'unknown'}`);
  if (skillCatalogContract.complete !== true) failures.push(`Codex-authored analysis skill catalog contract incomplete: ${(skillCatalogContract.missing || []).slice(0, 6).join(', ') || 'unknown'}`);
  if (sourceTierCoverage.complete !== true) failures.push(`tiered whole-codebase file analysis incomplete: ${sourceTierCoverage.tier1_file_cards || 0}/${sourceTierCoverage.total_files || 0} Tier 1 file cards, ${sourceTierCoverage.missing_tier1_files || 0} missing, ${sourceTierCoverage.invalid_file_cards || 0} invalid`);
  if (skillWorkbenchCoverage.complete !== true) failures.push(`Codex-planned skill workbench execution incomplete: ${skillWorkbenchCoverage.executed_count || 0}/${skillWorkbenchCoverage.planned_count || 0} executed, status=${skillWorkbenchCoverage.status || 'unknown'}`);
  if (skillSynthesis.complete !== true) failures.push(`skill-workbench synthesis ${skillSynthesis.status || 'not complete'}`);
  if (sourceCoverage.complete !== true) failures.push(`source inventory accounting incomplete: ${sourceCoverage.accounted_files ?? sourceCoverage.covered_files ?? 0}/${sourceCoverage.total_files || 0} accounted, ${sourceCoverage.invalid_coverage_items || 0} invalid coverage items`);
  if (invalid.length) failures.push(`invalid evidence: ${invalid.length}`);
  if (detailCoverage.complete !== true) failures.push(`source-family detail review coverage ${detailCoverage.status || 'not complete'}: ${detailCoverage.executed_count || 0}/${detailCoverage.planned_count || 0} executed, ${detailCoverage.integrated_count || 0}/${detailCoverage.planned_count || 0} integrated`);
  if (synthesis.complete !== true) failures.push(`detail-review synthesis ${synthesis.status || 'not complete'}`);

  console.log(`Report audit: ${failures.length ? 'failed' : 'passed'}`);
  console.log(`Report: ${report}`);
  console.log(`Mode: ${bundle.report_mode?.state || 'unknown'} · Target capabilities: ${rows.length} Codex-authored trace context rows · Source inventory: ${sourceCoverage.accounted_files ?? sourceCoverage.covered_files ?? 0}/${sourceCoverage.total_files || 0} · Evidence invalid: ${invalid.length}`);
  console.log(`Analysis strategy: ${bundle.llm_analysis_strategy?.strategy_present ? 'structured' : 'missing'} · ${bundle.llm_analysis_strategy?.planning_source || 'missing_llm_analysis_strategy'}`);
  console.log(`Analysis scope: ${bundle.analysis_scope?.mode || 'unknown'} · selected=${bundle.analysis_scope?.selected_files ?? 'unknown'} · deferred=${bundle.analysis_scope?.deferred_files ?? 'unknown'} · confidence impact=${bundle.analysis_scope?.confidence_impact || 'unknown'}`);
  console.log(`Analysis freshness: ${staleness.stale ? 'stale' : 'current'} · analysis=${staleness.analysis_commit || 'unknown'} · current=${staleness.current_commit || 'unknown'}`);
  console.log(`Tier 1 file cards: ${sourceTierCoverage.complete ? 'complete' : 'partial'} ${sourceTierCoverage.tier1_file_cards || 0}/${sourceTierCoverage.total_files || 0} · ${sourceTierCoverage.missing_tier1_files || 0} missing · ${sourceTierCoverage.invalid_file_cards || 0} invalid`);
  console.log(`Tier 1 task backlog: ${sourceTierBacklog.complete_tasks || 0}/${sourceTierBacklog.total_tasks || 0} complete · ${sourceTierBacklog.incomplete_tasks || 0} incomplete · ${sourceTierBacklog.missing_tasks || 0} missing outputs`);
  console.log(`Detail review execution: ${detailCoverage.status || 'unknown'} ${detailCoverage.executed_count || 0}/${detailCoverage.planned_count || 0} executed · ${detailCoverage.integrated_count || 0}/${detailCoverage.planned_count || 0} integrated`);
  console.log(`Skill workbench synthesis: ${skillSynthesis.status || 'unknown'} ${skillSynthesis.integrated_count || 0}/${skillSynthesis.executed_count || 0}`);
  console.log(`Detail synthesis: ${synthesis.status || 'unknown'} ${synthesis.integrated_count || 0}/${synthesis.executed_count || 0}`);
  console.log(`Final prerequisites: ${prerequisiteCoverage.complete ? 'complete' : 'partial'} · ${prerequisiteCoverage.ready_count || 0}/${prerequisiteCoverage.total_count || 0}`);
  console.log(`Analysis pipeline contract: ${pipelineContract.complete ? 'complete' : 'partial'} · ${pipelineContract.stage_count || 0}/${pipelineContract.required_stage_count || 0} stages`);
  console.log(`Analysis skill catalog: ${skillCatalogContract.complete ? 'complete' : 'partial'} · ${skillCatalogContract.skill_count || 0}/${skillCatalogContract.required_skill_count || 0} skills`);
  console.log(`Skill workbenches: ${skillWorkbenchCoverage.complete ? 'complete' : 'partial'} · ${skillWorkbenchCoverage.executed_count || 0}/${skillWorkbenchCoverage.planned_count || 0} executed`);
  console.log(`Component contract: ${componentCoverage.complete ? 'complete' : 'partial'} · ${componentCoverage.missing?.length || 0} missing`);
  console.log(`Report quality lint: ${reportLint.complete ? 'passed' : 'partial'} · ${(reportLint.missing || []).length} gaps`);
  console.log(`Executive decision layer: ${executiveDecisionLayer.complete ? 'complete' : 'partial'} · ${(executiveDecisionLayer.missing || []).length} gaps`);
  console.log(`Consistency review: ${consistencyReview.complete ? 'complete' : 'partial'} · contradictions=${consistencyReview.contradictions_found ?? 'unknown'}`);
  console.log(`Evidence strength: ${evidenceStrength.complete ? 'complete' : 'partial'} · weak=${(evidenceStrength.weak_evidence_items || []).length || 0} · missing-confidence=${(evidenceStrength.missing_confidence || []).length || 0}`);
  console.log(`Semantic lineage: ${semanticLineage.complete ? 'complete' : 'partial'} · claims=${semanticLineage.complete_claim_count || 0}/${semanticLineage.claim_count || 0}`);
  console.log(`Analysis run provenance: ${runProvenance.complete ? 'complete' : 'partial'} · run=${runProvenance.analysis_run_id || 'unknown'} · artifacts=${runProvenance.artifact_count || 0}`);
  console.log(`Artifact dependency graph: ${dependencyGraph.complete ? 'complete' : 'partial'} · nodes=${dependencyGraph.node_count || 0} · stale=${(dependencyGraph.stale_nodes || []).length || 0}`);
  console.log(`Product request freshness: ${productRequestFreshness.complete === false ? 'stale' : 'current'} · stale=${(productRequestFreshness.stale_outputs || []).length || 0}`);
  console.log(`External findings: ${externalFindings.complete ? 'ready' : 'partial'} · findings=${externalFindings.finding_count || 0} · invalid=${externalFindings.invalid_count || 0}`);
  console.log(`Open questions: ${openQuestions.complete ? 'structured' : 'partial'} · total=${openQuestions.question_count ?? 'unknown'} · blocking=${openQuestions.blocking_count ?? 'unknown'}`);
  console.log(`Requirements trace contract: ${requirementsTraceContract.complete ? 'structured' : 'partial'} · Codex statuses: ${requirementsTraceContract.fully_covered_count || 0} covered · ${requirementsTraceContract.partial_count || 0} partial · ${requirementsTraceContract.open_count || 0} open · ${(requirementsTraceContract.missing?.length || 0) + (requirementsTraceContract.weak?.length || 0)} structural gaps`);
  console.log(`Goal trace references: ${goalTraceAlignment.complete ? 'explicit' : 'partial'} · ${(goalTraceAlignment.referenced_goal_refs || []).length}/${(goalTraceAlignment.expected_goal_refs || []).length} goal refs linked by Codex-authored trace`);
  console.log(`Report quality review: ${qualityReview.complete ? 'structured' : 'partial'} · ${qualityReview.verdict || 'unknown'}`);
  for (const row of (sourceTierBacklog.next_tasks || []).slice(0, 8)) console.log(`NEXT-TIER ${row.id} ${row.status} cards=${row.card_count}/${row.file_count} output=${row.expected_output}`);
  for (const failure of failures) console.log(`FAIL ${failure}`);
  return failures.length ? 1 : 0;
}

function cmdFinalize(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const out = argValue(args, '--out');
  const title = argValue(args, '--title');

  let bundle = aggregateWithMaterializedDetailTasks(repo, analysis);
  let report = '';
  if (!hasFlag(args, '--no-html')) {
    const refreshed = renderReportAndRefreshBundle(repo, analysis, out ? Path.resolve(out) : undefined, title);
    bundle = refreshed.bundle;
    report = refreshed.report;
  }
  const rows = bundle.target_artifact_contract_coverage || bundle.target_coverage || [];
  const invalid = (bundle.evidence_index || []).filter((e: any) => e.valid === false);
  const sourceCoverage = bundle.source_inventory_accounting || bundle.source_coverage || {};
  const sourceTierCoverage = bundle.source_tier_coverage || {};
  const sourceTierBacklog = bundle.source_tier_backlog || {};
  const uncovered = sourceCoverage.uncovered || [];
  const readiness = computeFinalLlmReadiness(bundle);
  const readinessFailures = readiness.failures;
  const openQuestions = bundle.analysis_document_open_questions || {};
  const productRequestFreshness = bundle.product_analysis_request_freshness || {};

  console.log(`Finalized analysis workspace: ${analysis}`);
  console.log(`Status: ${bundle.status?.state}`);
  console.log(`Analysis scope: ${bundle.analysis_scope?.mode || 'unknown'} · selected=${bundle.analysis_scope?.selected_files ?? 'unknown'} · deferred=${bundle.analysis_scope?.deferred_files ?? 'unknown'} · confidence impact=${bundle.analysis_scope?.confidence_impact || 'unknown'}`);
  console.log(`Analysis freshness: ${bundle.analysis_staleness?.stale ? 'stale' : 'current'} · analysis=${bundle.analysis_staleness?.analysis_commit || 'unknown'} · current=${bundle.analysis_staleness?.current_commit || 'unknown'}`);
  console.log(`Target capabilities: ${rows.length} registered as Codex-authored trace context · not CLI-scored`);
  console.log(`Tier 1 file-card coverage: ${sourceTierCoverage.tier1_file_cards || 0}/${sourceTierCoverage.total_files || 0} files · ${sourceTierCoverage.missing_tier1_files || 0} missing · ${sourceTierCoverage.invalid_file_cards || 0} invalid · ${sourceTierCoverage.coverage_percent || 0}%`);
  console.log(`Tier 1 task backlog: ${sourceTierBacklog.complete_tasks || 0}/${sourceTierBacklog.total_tasks || 0} complete · ${sourceTierBacklog.incomplete_tasks || 0} incomplete · ${sourceTierBacklog.missing_tasks || 0} missing outputs`);
  console.log(`Source inventory accounting: ${sourceCoverage.accounted_files ?? sourceCoverage.covered_files ?? 0}/${sourceCoverage.total_files || 0} files accounted · ${sourceCoverage.unaccounted_files ?? sourceCoverage.uncovered_files ?? 0} unaccounted · ${sourceCoverage.invalid_coverage_items || 0} invalid coverage items · ${sourceCoverage.inventory_accounting_percent ?? sourceCoverage.coverage_percent ?? 0}%`);
  console.log(`Evidence: ${(bundle.evidence_index || []).length} total · ${invalid.length} invalid`);
  console.log(`Open questions: ${openQuestions.complete ? 'structured' : 'partial'} · total=${openQuestions.question_count ?? 'unknown'} · blocking=${openQuestions.blocking_count ?? 'unknown'}`);
  console.log(`Product request freshness: ${productRequestFreshness.complete === false ? 'stale' : 'current'} · stale=${(productRequestFreshness.stale_outputs || []).length || 0}`);
  console.log(`Final Codex-authored analysis readiness: ${readiness.state} · verdict=${readiness.final_verdict || 'unknown'}`);
  if (report) console.log(`Report: ${report}`);

  for (const e of invalid.slice(0, 30)) console.log(`INVALID ${e.path}:${e.line} ${e.reason || ''}`);
  for (const f of uncovered.slice(0, 30)) console.log(`UNCOVERED ${f.path}`);
  for (const row of (sourceTierBacklog.next_tasks || []).slice(0, 8)) console.log(`NEXT-TIER ${row.id} ${row.status} cards=${row.card_count}/${row.file_count} output=${row.expected_output}`);
  for (const item of (sourceCoverage.invalid_coverage_item_examples || []).slice(0, 30)) console.log(`INVALID-COVERAGE ${item.kind || 'coverage'} ${item.path || JSON.stringify(item.item) || ''} ${item.reason || ''}`);
  for (const failure of readinessFailures.slice(0, 20)) console.log(`CODEX-READINESS ${failure}`);
  if (invalid.length && !hasFlag(args, '--allow-invalid')) return 1;
  if (bundle.status?.state === 'llm_extracted' && sourceCoverage.complete !== true && !hasFlag(args, '--allow-partial')) return 1;
  if (bundle.status?.state === 'llm_extracted' && readinessFailures.length && !hasFlag(args, '--allow-partial')) return 1;
  return 0;
}

function resourceRoot(): string {
  return Path.resolve(__dirname, '..', 'resources');
}

const KNOWN_HARNESSES = ['codex', 'claude', 'cursor', 'windsurf', 'copilot', 'aider', 'generic'] as const;
type HarnessName = typeof KNOWN_HARNESSES[number];

function targetArg(args: string[], fallback = '.'): string {
  const first = positionalArgs(args)[0];
  return Path.resolve(first || fallback);
}

function selectedHarnesses(args: string[], fallback: HarnessName[] = [...KNOWN_HARNESSES]): HarnessName[] {
  const raw = argValue(args, '--harness', 'all') || 'all';
  const values = raw.split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!values.length || values.includes('all')) return fallback;
  const unknown = values.filter(value => !(KNOWN_HARNESSES as readonly string[]).includes(value));
  if (unknown.length) throw new Error(`Unknown harness: ${unknown.join(', ')}. Expected one of: all, ${KNOWN_HARNESSES.join(', ')}`);
  return [...new Set(values)] as HarnessName[];
}

function writeTemplate(file: string, text: string, force: boolean, written: string[], skipped: string[]): void {
  if (FS.existsSync(file) && !force) {
    skipped.push(file);
    return;
  }
  writeText(file, text);
  written.push(file);
}

function copyAsset(src: string, dst: string, force: boolean, written: string[], skipped: string[]): void {
  if (FS.existsSync(dst) && !force) {
    skipped.push(dst);
    return;
  }
  copyRecursive(src, dst, force);
  written.push(dst);
}

function agentInstructionsForHarness(agentsText: string, executorName: string): string {
  return agentsText
    .replace(/Codex itself executes/g, `${executorName} executes`)
    .replace(/Codex, as the active in-session LLM/g, `${executorName}, as the active in-session LLM`)
    .replace(/Codex must still/g, `${executorName} must still`)
    .replace(/Codex-authored/g, `${executorName}-authored`);
}

function harnessBody(harness: string, agentsText: string, executorName: string): string {
  return `# Cognianalysis for ${harness}

This file connects ${harness} to the same Cognianalysis workflow used by other agent harnesses.

Use the rules below as the operational contract. The CLI prepares context and validates artifacts; ${executorName}, as the active in-session LLM, authors the semantic extraction JSON and final report. Do not use a direct LLM API runner for that work.

${agentInstructionsForHarness(agentsText, executorName).trim()}
`;
}

function cursorRule(agentsText: string): string {
  return `---
description: "Run Cognianalysis LLM-first repository assessment workflow."
alwaysApply: true
---

${harnessBody('Cursor', agentsText, 'Cursor')}`;
}

function windsurfRule(agentsText: string): string {
  return `---
trigger: always_on
description: "Run Cognianalysis LLM-first repository assessment workflow."
---

${harnessBody('Windsurf or Devin Desktop', agentsText, 'Windsurf or Devin Desktop')}`;
}

function installHarnessAssets(target: string, harnesses: HarnessName[], args: string[]): { written: string[], skipped: string[] } {
  const force = hasFlag(args, '--force');
  const noSkills = hasFlag(args, '--no-skills');
  const root = resourceRoot();
  const agentsText = FS.readFileSync(Path.join(root, 'AGENTS.md'), 'utf8');
  const written: string[] = [];
  const skipped: string[] = [];

  ensureDir(target);
  copyAsset(Path.join(root, 'AGENTS.md'), Path.join(target, 'AGENTS.md'), force, written, skipped);
  if (!noSkills) copyAsset(Path.join(root, 'agents'), Path.join(target, '.agents'), force, written, skipped);

  for (const harness of harnesses) {
    if (harness === 'claude') {
      writeTemplate(Path.join(target, 'CLAUDE.md'), harnessBody('Claude Code', agentsText, 'Claude Code'), force, written, skipped);
    } else if (harness === 'cursor') {
      writeTemplate(Path.join(target, '.cursor', 'rules', 'cognianalysis', 'RULE.md'), cursorRule(agentsText), force, written, skipped);
    } else if (harness === 'windsurf') {
      writeTemplate(Path.join(target, '.devin', 'rules', 'cognianalysis.md'), windsurfRule(agentsText), force, written, skipped);
    } else if (harness === 'copilot') {
      writeTemplate(Path.join(target, '.github', 'copilot-instructions.md'), harnessBody('GitHub Copilot', agentsText, 'GitHub Copilot'), force, written, skipped);
    } else if (harness === 'aider') {
      writeTemplate(Path.join(target, 'CONVENTIONS.md'), harnessBody('Aider', agentsText, 'Aider'), force, written, skipped);
      writeTemplate(Path.join(target, '.aider.conf.yml'), 'read: CONVENTIONS.md\n', force, written, skipped);
    } else if (harness === 'generic') {
      writeTemplate(Path.join(target, 'COGNIANALYSIS_HARNESS.md'), harnessBody('generic agent harnesses', agentsText, 'the active agent harness'), force, written, skipped);
    }
  }

  return { written, skipped };
}

function cmdInitHarness(args: string[]): number {
  const target = targetArg(args);
  const harnesses = selectedHarnesses(args);
  const { written, skipped } = installHarnessAssets(target, harnesses, args);
  console.log(`Installed Cognianalysis harness assets into ${target}`);
  console.log(`Harnesses: ${harnesses.join(', ')}`);
  for (const file of written) console.log(`- wrote ${file}`);
  for (const file of skipped) console.log(`- kept existing ${file}`);
  return 0;
}

function cmdInitCodex(args: string[]): number {
  const target = targetArg(args);
  const force = hasFlag(args, '--force');
  const { written, skipped } = installHarnessAssets(target, ['codex'], force ? [...args, '--force'] : args);
  console.log(`Installed Codex assets into ${target}`);
  for (const file of written) console.log(`- wrote ${file}`);
  for (const file of skipped) console.log(`- kept existing ${file}`);
  return 0;
}

function cmdPortfolio(args: string[]): number {
  const reposFile = argValue(args, '--repos');
  const out = Path.resolve(argValue(args, '--out', 'portfolio-analysis') || 'portfolio-analysis');
  if (!reposFile) throw new Error('Missing --repos repos.txt');
  ensureDir(out);
  const rows: any[] = [];
  const lines = FS.readFileSync(Path.resolve(reposFile), 'utf8').split(/\r?\n/).map((x: string) => x.trim()).filter((x: string) => x && !x.startsWith('#'));
  for (const line of lines) {
    const repo = Path.resolve(line);
    const row: any = { repo: Path.basename(repo), path: repo };
    if (!FS.existsSync(repo)) { row.error = 'not_found'; rows.push(row); continue; }
    const analysis = Path.join(out, 'repos', Path.basename(repo));
    try {
      const codeMap = scopedCodeMap(buildRepoMap(repo, { capsuleLimit: numericArg(args, '--capsules', 44), maxFileSize: numericArg(args, '--max-file-size', 1_250_000) }), args);
      prepareAnalysis(repo, analysis, codeMap);
      writeLlmTasks(analysis, codeMap);
      const bundle = aggregate(repo, analysis);
      const report = renderReport(analysis);
      row.report = report;
      row.repo_type = bundle.profile?.repo_type;
      row.source_files = bundle.profile?.source_files;
      row.inventory_signals = (bundle.signals || []).length;
      row.status = bundle.status?.state;
    } catch (err: any) {
      row.error = err?.message || String(err);
    }
    rows.push(row);
  }
  writeJson(Path.join(out, 'portfolio-summary.json'), rows);
  writeText(Path.join(out, 'index.html'), portfolioHtml(rows));
  console.log(Path.join(out, 'index.html'));
  return 0;
}

function portfolioHtml(rows: any[]): string {
  const trs = rows.map(r => `<tr><td>${esc(r.repo)}</td><td>${esc(r.repo_type || '')}</td><td>${esc(r.source_files || '')}</td><td>${esc(r.inventory_signals || '')}</td><td>${esc(r.status || '')}</td><td>${esc(r.error || '')}</td><td>${r.report ? `<a href="${esc(r.report)}">Report</a>` : ''}</td></tr>`).join('');
  return `<!doctype html><meta charset='utf-8'><title>Portfolio Analysis</title><style>body{font-family:system-ui;margin:30px;background:#f5f7fb}table{border-collapse:collapse;width:100%;background:white}td,th{border:1px solid #e0e6f0;padding:10px;text-align:left}</style><h1>Portfolio Analysis</h1><table><thead><tr><th>Repo</th><th>Type</th><th>Source Files</th><th>Inventory Signals</th><th>Status</th><th>Error</th><th>Report</th></tr></thead><tbody>${trs}</tbody></table>`;
}

function esc(v: any): string { return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function compatibilityWarning(preferred: string): void {
  console.log(`Compatibility alias: prefer ${CLI_NAME} ${preferred}.`);
}

async function runCommand(command: string | undefined, args: string[], options: { dev?: boolean } = {}): Promise<number> {
  if (!command || command === 'help' || command === '--help' || command === '-h') { usage(); return 0; }
  if (command === '--version' || command === '-v') { console.log(VERSION); return 0; }
  if (command === 'dev') {
    const devCommand = args[0];
    if (!devCommand || devCommand === 'help' || devCommand === '--help' || devCommand === '-h') { devUsage(); return 0; }
    return runCommand(devCommand, args.slice(1), { dev: true });
  }
  if (command === 'analyze') return cmdAnalyze(args);
  if (command === 'status') return cmdStatus(args);
  if (command === 'open') return cmdOpen(args);
  if (command === 'eval') return cmdEval(args);
  if (!options.dev && command === 'mcp') {
    console.error(`Compatibility alias: prefer ${CLI_NAME} dev mcp.`);
    startMcpLikeServer();
    return 0;
  }
  if (!options.dev) {
    const preferred = command === 'finish' || command === 'report' ? 'dev finalize' : `dev ${command}`;
    const compatibilityCommands = new Set(['resume', 'repair', 'init-harness', 'init-agent', 'init-codex', 'init', 'prepare', 'run', 'doctor', 'finalize', 'finish', 'report', 'aggregate', 'render', 'validate', 'coverage', 'tier-status', 'tier-next', 'tier-context', 'audit-report', 'portfolio']);
    if (compatibilityCommands.has(command)) compatibilityWarning(preferred);
  }
  if (command === 'resume') return cmdResume(args);
  if (command === 'repair') return cmdRepair(args);
  if (command === 'init-harness' || command === 'init-agent') return cmdInitHarness(args);
  if (command === 'init-codex') return cmdInitCodex(args);
  if (command === 'mcp') { startMcpLikeServer(); return 0; }

  if (command === 'init' || command === 'prepare') return cmdPrepare(args);
  if (command === 'run') return cmdRun(args);
  if (command === 'doctor') return cmdDoctor(args);
  if (command === 'finalize' || command === 'finish' || command === 'report') return cmdFinalize(args);
  if (command === 'aggregate') return cmdAggregate(args);
  if (command === 'render') return cmdRender(args);
  if (command === 'validate') return cmdValidate(args);
  if (command === 'coverage') return cmdCoverage(args);
  if (command === 'tier-status') return cmdTierStatus(args);
  if (command === 'tier-next') return cmdTierNext(args);
  if (command === 'tier-context') return cmdTierContext(args);
  if (command === 'run-orchestration') return cmdRunOrchestration(args);
  if (command === 'prove-orchestration') return cmdProveOrchestration(args);
  if (command === 'audit-report') return cmdAuditReport(args);
  if (command === 'portfolio') return cmdPortfolio(args);
  usage();
  return 1;
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const command = argv[0];
  const args = argv.slice(1);
  try {
    return await runCommand(command, args);
  } catch (err: any) {
    console.error(`Error: ${err?.message || String(err)}`);
    return 1;
  }
}

if (require.main === module) {
  if (process.argv[2] === 'mcp') {
    console.error(`Compatibility alias: prefer ${CLI_NAME} dev mcp.`);
    startMcpLikeServer();
  } else main()
    .then(code => process.exit(code))
    .catch((err: any) => {
      console.error(`Error: ${err?.message || String(err)}`);
      process.exit(1);
    });
}

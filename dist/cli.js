#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const aggregate_1 = require("./aggregate");
const report_1 = require("./report");
const repoMap_1 = require("./repoMap");
const tasks_1 = require("./tasks");
const utils_1 = require("./utils");
const mcp_1 = require("./mcp");
const readiness_1 = require("./readiness");
const sourceTiers_1 = require("./sourceTiers");
const skillWorkbenches_1 = require("./skillWorkbenches");
const VERSION = '0.7.0';
const CLI_NAME = 'cognianalysis';
const PRODUCT_ANALYSIS_MODES = new Set(['brief', 'blueprint', 'deep-dive']);
const PRODUCT_REQUEST_LLM_OUTPUTS = ['llm/analysis-strategy.json', 'llm/detail-agent-plan.json', 'llm/analysis-document.json'];
const PRODUCT_REQUEST_OPTION_FLAGS = ['--mode', '--goal', '--flow', '--module', '--api', '--risk', '--decision', '--scope', '--scope-files'];
const OPTION_VALUE_FLAGS = new Set([
    '--analysis',
    '--capsules',
    '--capsule-chars',
    '--decision',
    '--flow',
    '--goal',
    '--harness',
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
function analysisPath(repo, value) {
    if (value)
        return utils_1.Path.resolve(value);
    return utils_1.Path.join(repo, '.analysis');
}
const SCOPE_MODES = new Set(['complete', 'critical-path', 'representative']);
function analysisScopeMode(args) {
    const mode = String((0, utils_1.argValue)(args, '--scope', 'complete') || 'complete').trim().toLowerCase();
    if (!SCOPE_MODES.has(mode))
        throw new Error(`Unknown --scope ${mode}. Expected complete, critical-path or representative.`);
    return mode;
}
function scopedCodeMap(codeMap, args) {
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
    const limit = Math.max(1, (0, utils_1.numericArg)(args, '--scope-files', fallbackLimit));
    const sorted = [...files].sort((a, b) => {
        const scoreA = Number(a.navigation_score ?? a.score ?? 0);
        const scoreB = Number(b.navigation_score ?? b.score ?? 0);
        if (scoreA !== scoreB)
            return scoreB - scoreA;
        return String(a.path || '').localeCompare(String(b.path || ''));
    });
    const selected = sorted.slice(0, limit);
    const selectedPaths = new Set(selected.map((file) => file.path));
    const deferred = sorted.slice(limit).map((file) => ({
        path: file.path,
        reason: `Deferred by --scope ${mode}; rerun with --scope complete for full Tier 1 coverage.`
    }));
    const totalLines = selected.reduce((sum, file) => sum + Number(file.lines || 0), 0);
    return {
        ...codeMap,
        files: selected,
        capsules: (codeMap.capsules || []).filter((capsule) => !capsule.path || selectedPaths.has(capsule.path)),
        artifact_navigation_candidates: (codeMap.artifact_navigation_candidates || []).filter((item) => !item.path || selectedPaths.has(item.path)),
        important_docs: (codeMap.important_docs || []).filter((item) => !item.path || selectedPaths.has(item.path)),
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
function usage() {
    console.log(`Cognianalysis v${VERSION} · LLM-first source-code analysis

Usage:
  ${CLI_NAME} analyze [repo] [--analysis .analysis] [--mode brief|blueprint|deep-dive] [--goal text] [--flow name] [--module path] [--api name] [--risk topic] [--decision topic] [--scope complete|critical-path|representative] [--scope-files N]
  ${CLI_NAME} status [repo] [--analysis .analysis]
  ${CLI_NAME} open [repo] [--analysis .analysis]
  ${CLI_NAME} resume [repo] [--analysis .analysis]
  ${CLI_NAME} repair [repo] [--analysis .analysis]
  ${CLI_NAME} init-harness [target] [--harness all|codex|claude|cursor|windsurf|copilot|aider|generic] [--force] [--no-skills]
  ${CLI_NAME} init-agent [target]   # alias for init-harness
  ${CLI_NAME} init-codex [target]   # compatibility alias for init-harness --harness codex
  ${CLI_NAME} mcp

Internal/debug commands:
  ${CLI_NAME} dev prepare [repo] [--analysis .analysis] [--capsules 44] [--scope complete|critical-path|representative] [--scope-files N]
  ${CLI_NAME} dev finalize [repo] [--analysis .analysis] [--out report-dir] [--title title] [--allow-invalid] [--allow-partial]
  ${CLI_NAME} dev audit-report [repo] [--analysis .analysis]
  ${CLI_NAME} dev tier-status [repo] [--analysis .analysis] [--limit 20]
  ${CLI_NAME} dev tier-next [repo] [--analysis .analysis] [--limit 1] [--max-chars 6000]
  ${CLI_NAME} dev tier-context [repo] --task source-tier-0001 [--analysis .analysis] [--max-chars 6000]
  ${CLI_NAME} dev aggregate|render|validate|coverage|doctor|portfolio|run|init [...]

Compatibility aliases still work: run, init/prepare, finalize/finish/report, aggregate, render, validate, coverage, tier-status, tier-next, tier-context, audit-report, doctor, portfolio.
`);
}
function devUsage() {
    console.log(`Internal/debug commands:
  ${CLI_NAME} dev prepare [repo]
  ${CLI_NAME} dev finalize [repo]
  ${CLI_NAME} dev audit-report [repo]
  ${CLI_NAME} dev tier-status [repo]
  ${CLI_NAME} dev tier-next [repo]
  ${CLI_NAME} dev tier-context [repo]
  ${CLI_NAME} dev aggregate|render|validate|coverage|doctor|portfolio|run|init [...]

Use ${CLI_NAME} analyze . for the normal product flow.`);
}
function stagedLlmWorkflowMessage() {
    return `Next step for Codex, as the active in-session LLM: author llm_tasks/00-analysis-strategy.md first, execute source_tier_tasks/*.md to create Tier 1 file cards for every included file, run ${CLI_NAME} dev finalize . --allow-partial to materialize Codex-planned skill_workbench_tasks from the strategy, execute skill_workbench_tasks into skill_reviews, optionally use capability_templates/*.md only when the Codex-authored strategy or skill reviews need that output shape, then author 11-detail-agent-plan.md, run ${CLI_NAME} dev finalize . --allow-partial to materialize detail_tasks, execute detail_tasks, then author 12-analysis-document.md and run ${CLI_NAME} analyze . plus ${CLI_NAME} dev audit-report .`;
}
function positionalArgs(args) {
    const out = [];
    for (let i = 0; i < args.length; i += 1) {
        const value = args[i];
        if (OPTION_VALUE_FLAGS.has(value)) {
            i += 1;
            continue;
        }
        if (value.startsWith('--'))
            continue;
        out.push(value);
    }
    return out;
}
const REQUIRED_WORKFLOW_ARTIFACTS = [
    { label: 'analysis strategy', path: 'llm/analysis-strategy.json' },
    { label: 'detail-agent plan', path: 'llm/detail-agent-plan.json' },
    { label: 'final analysis document', path: 'llm/analysis-document.json' }
];
function workflowArtifactStatuses(analysis) {
    return REQUIRED_WORKFLOW_ARTIFACTS.map(row => {
        const full = utils_1.Path.join(analysis, row.path);
        const status = {
            ...row,
            exists: utils_1.FS.existsSync(full),
            valid_json: false,
            has_content: false,
            ready: false
        };
        if (!status.exists)
            return status;
        try {
            const parsed = JSON.parse(utils_1.FS.readFileSync(full, 'utf8'));
            status.valid_json = true;
            status.has_content = parsed !== null && (Array.isArray(parsed)
                ? parsed.length > 0
                : typeof parsed === 'object'
                    ? Object.keys(parsed).length > 0
                    : String(parsed).trim().length > 0);
            status.ready = status.valid_json && status.has_content;
        }
        catch (err) {
            status.error = err?.message || String(err);
        }
        return status;
    });
}
function traceStatus(bundle, requirement) {
    if (!bundle)
        return '';
    const needle = requirement.toLowerCase();
    const row = (bundle.analysis_document_requirements_trace_contract?.requirements || [])
        .find((item) => String(item.label || '').toLowerCase().includes(needle));
    return String(row?.status || '');
}
function hasReportBlock(bundle, type) {
    return (bundle.analysis_document?.sections || [])
        .some((section) => (section.blocks || []).some((block) => String(block.type || '').toLowerCase() === type));
}
function productStatusRows(analysis, bundle, statuses) {
    const indexed = utils_1.FS.existsSync(utils_1.Path.join(analysis, 'data', 'code-map.json'));
    const scopeDeclared = !!bundle?.analysis_scope?.mode;
    const notStale = !!bundle && bundle.analysis_staleness?.stale !== true;
    const strategyReady = bundle?.llm_analysis_strategy?.strategy_present === true;
    const repositoryCoverageReady = bundle?.source_tier_coverage?.complete === true;
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
        { id: 'task_guide', label: 'Task guide available', ready: utils_1.FS.existsSync(utils_1.Path.join(analysis, 'TASK.md')) },
        { id: 'strategy', label: 'Analysis strategy complete', ready: strategyReady },
        { id: 'coverage', label: 'Repository coverage complete', ready: repositoryCoverageReady },
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
function nextProductAction(repo, analysis, bundle, statuses) {
    if (!utils_1.FS.existsSync(analysis) || !utils_1.FS.existsSync(utils_1.Path.join(analysis, 'data', 'code-map.json')))
        return `Run ${CLI_NAME} analyze ${repo}`;
    if (bundle?.analysis_staleness?.stale === true)
        return `Repository changed after analysis; rerun ${CLI_NAME} analyze ${repo} to refresh the decision report.`;
    if (!utils_1.FS.existsSync(utils_1.Path.join(analysis, 'TASK.md')))
        return `Run ${CLI_NAME} repair ${repo} to rebuild the task guide.`;
    const missingWorkflow = statuses.find(row => !row.ready);
    if (missingWorkflow?.path === 'llm/analysis-strategy.json')
        return 'Open .analysis/TASK.md and complete "Analysis Strategy".';
    if (bundle?.source_tier_coverage?.complete !== true)
        return `Run ${CLI_NAME} dev tier-next ${repo} --limit 1, complete the next Tier 1 workpack, then rerun status.`;
    if (missingWorkflow?.path === 'llm/detail-agent-plan.json')
        return 'Open .analysis/TASK.md and complete "Detail Agent Plan".';
    if (missingWorkflow?.path === 'llm/analysis-document.json')
        return 'Open .analysis/TASK.md and complete "Final Analysis Document".';
    if (bundle?.analysis_document_executive_decision_layer?.complete !== true)
        return 'Update the final report with a visible executive decision section and executive_decision_basis.';
    if (bundle?.analysis_document_consistency_review?.complete !== true)
        return 'Add analysis_document.consistency_review and resolve or explicitly surface contradictions.';
    if (bundle?.analysis_document_semantic_lineage?.complete !== true)
        return 'Add or refresh semantic lineage so major report claims trace to upstream reviews and source evidence.';
    if (bundle?.analysis_run_provenance?.complete !== true)
        return 'Refresh analysis run provenance so required artifacts share one run identity and generated-from matrix.';
    if (bundle?.artifact_dependency_graph?.complete !== true)
        return 'Refresh stale or missing artifacts from the dependency graph before final readiness.';
    if (bundle?.external_findings_contract?.complete !== true)
        return 'Fix invalid external_findings/*.json entries or remove malformed scanner inputs.';
    if (bundle?.analysis_document_open_questions?.complete !== true)
        return 'Add top-level analysis_document.open_questions and visible open_questions blocks for any unresolved uncertainty.';
    if (Number(bundle?.analysis_document_open_questions?.blocking_count || 0) > 0)
        return 'Resolve or explicitly downgrade readiness for blocking open questions.';
    const failures = bundle?.final_llm_readiness?.failures || [];
    if (failures.length)
        return `Fix readiness issue: ${failures[0]}`;
    return `Run ${CLI_NAME} open ${repo}`;
}
function estimatedRemainingEffort(bundle, rows, statuses) {
    if (!bundle)
        return '1 setup pass';
    const missingRows = rows.filter(row => !row.ready).length;
    const missingArtifacts = statuses.filter(row => !row.ready).length;
    const tierBacklog = bundle.source_tier_backlog || {};
    const tierPasses = Number(tierBacklog.incomplete_tasks || tierBacklog.missing_tasks || 0);
    const passes = Math.max(0, missingArtifacts) + Math.min(tierPasses, 5) + Math.max(0, missingRows - missingArtifacts - 2);
    return passes <= 0 ? '0 LLM passes' : `${passes} LLM pass${passes === 1 ? '' : 'es'}`;
}
function printRepositoryStatus(repo, analysis, bundle, statuses) {
    const rows = productStatusRows(analysis, bundle, statuses);
    console.log('Repository Analysis Status');
    for (const row of rows)
        console.log(`${row.ready ? '✓' : '✗'} ${row.label}`);
    const action = nextProductAction(repo, analysis, bundle, statuses);
    console.log('Next action:');
    console.log(action);
    console.log(`Estimated remaining effort: ${estimatedRemainingEffort(bundle, rows, statuses)}`);
    if (bundle?.final_llm_readiness?.state)
        console.log(`Readiness: ${bundle.final_llm_readiness.state} · verdict=${bundle.final_llm_readiness.final_verdict || 'unknown'}`);
    if (bundle?.analysis_scope?.mode && bundle.analysis_scope.mode !== 'complete') {
        console.log(`Scope warning: ${bundle.analysis_scope.summary || bundle.analysis_scope.mode} Confidence impact: ${bundle.analysis_scope.confidence_impact || 'unknown'}.`);
    }
    if (bundle?.analysis_staleness?.stale === true)
        console.log(`Stale warning: ${bundle.analysis_staleness.summary}`);
    return { rows, action };
}
function jsonProblems(analysis) {
    const roots = ['llm', 'source_tiers', 'skill_reviews', 'detail_reviews']
        .map(name => utils_1.Path.join(analysis, name))
        .filter(dir => utils_1.FS.existsSync(dir));
    const files = roots.flatMap(dir => listFilesRecursive(dir, file => file.endsWith('.json')));
    const problems = [];
    for (const file of files) {
        try {
            JSON.parse(utils_1.FS.readFileSync(file, 'utf8'));
        }
        catch (err) {
            problems.push({ path: utils_1.Path.relative(analysis, file).replace(/\\/g, '/'), error: err?.message || String(err) });
        }
    }
    return problems;
}
function reportPathForAnalysis(analysis) {
    const artifacts = (0, utils_1.loadJson)(utils_1.Path.join(analysis, 'data', 'report-artifacts.json'), {});
    return artifacts.index_html_path || utils_1.Path.join(analysis, 'report', 'index.html');
}
function packageRoot() {
    return utils_1.Path.resolve(__dirname, '..');
}
function listFilesRecursive(dir, predicate) {
    const out = [];
    if (!utils_1.FS.existsSync(dir))
        return out;
    for (const entry of utils_1.FS.readdirSync(dir, { withFileTypes: true })) {
        const full = utils_1.Path.join(dir, entry.name);
        if (entry.isDirectory())
            out.push(...listFilesRecursive(full, predicate));
        else if (entry.isFile() && predicate(full))
            out.push(full);
    }
    return out.sort();
}
function marketProofStatus(analysis) {
    const root = packageRoot();
    const benchmarkDoc = utils_1.Path.join(root, 'docs', 'BENCHMARK.md');
    const goldenDir = utils_1.Path.join(root, 'benchmarks', 'golden');
    const goldenExpected = listFilesRecursive(goldenDir, file => file.endsWith('.expected.json'));
    const goldenScript = utils_1.Path.join(root, 'scripts', 'verify-golden.mjs');
    const goldenAggregate = (0, utils_1.loadJson)(utils_1.Path.join(goldenDir, 'results.json'), null);
    const result = (0, utils_1.loadJson)(utils_1.Path.join(analysis, 'data', 'golden-benchmark.json'), null);
    const baselineScript = utils_1.Path.join(root, 'scripts', 'verify-baseline.mjs');
    const baselineAggregate = (0, utils_1.loadJson)(utils_1.Path.join(root, 'benchmarks', 'baseline', 'results.json'), null);
    const passedGoldenRepos = Number(goldenAggregate?.passed_repos || (result?.verdict === 'pass' ? 1 : 0));
    const totalGoldenRepos = Number(goldenAggregate?.total_repos || goldenExpected.length);
    const strictFailures = [
        ...(!utils_1.FS.existsSync(benchmarkDoc) ? ['missing benchmark protocol doc'] : []),
        ...(!utils_1.FS.existsSync(goldenScript) ? ['missing golden verifier'] : []),
        ...(goldenExpected.length < 5 ? [`need at least 5 golden repos, found ${goldenExpected.length}`] : []),
        ...(passedGoldenRepos < 5 ? [`need at least 5 passing golden repos, found ${passedGoldenRepos}`] : []),
        ...(!utils_1.FS.existsSync(baselineScript) ? ['missing baseline verifier'] : []),
        ...(baselineAggregate?.verdict !== 'pass' ? ['missing passing baseline comparison'] : [])
    ];
    return {
        benchmarkDoc,
        goldenDir,
        goldenExpected,
        goldenScript,
        goldenAggregate,
        result,
        baselineScript,
        baselineAggregate,
        totalGoldenRepos,
        passedGoldenRepos,
        strictReady: strictFailures.length === 0,
        strictFailures
    };
}
function printMarketProofStatus(analysis) {
    const status = marketProofStatus(analysis);
    console.log('Market proof:');
    console.log(`- Benchmark protocol doc: ${utils_1.FS.existsSync(status.benchmarkDoc) ? 'present' : 'missing'} · ${status.benchmarkDoc}`);
    console.log(`- Golden expected suites: ${status.goldenExpected.length} · ${status.goldenDir}`);
    console.log(`- Golden verifier: ${utils_1.FS.existsSync(status.goldenScript) ? 'present' : 'missing'} · ${status.goldenScript}`);
    console.log(`- Golden aggregate: ${status.goldenAggregate?.verdict || 'missing'} · passed=${status.passedGoldenRepos}/${status.totalGoldenRepos}`);
    if (!status.result) {
        console.log('- Golden result: missing · run npm run verify:golden');
    }
    else {
        const metrics = status.result.metrics || {};
        console.log(`- Current repo golden result: ${status.result.verdict || 'unknown'} · ${utils_1.Path.join(analysis, 'data', 'golden-benchmark.json')}`);
        console.log(`- Fact recall: ${metrics.fact_recall ?? 'unknown'} · Evidence precision: ${metrics.evidence_precision ?? 'unknown'} · Unsupported claim rate: ${metrics.unsupported_claim_rate ?? 'unknown'} · Decision readiness: ${metrics.decision_readiness ?? 'unknown'}`);
    }
    console.log(`- Baseline verifier: ${utils_1.FS.existsSync(status.baselineScript) ? 'present' : 'missing'} · ${status.baselineScript}`);
    console.log(`- Baseline aggregate: ${status.baselineAggregate?.verdict || 'missing'} · ${utils_1.Path.join(packageRoot(), 'benchmarks', 'baseline', 'results.json')}`);
    console.log(`- Strict market proof: ${status.strictReady ? 'ready' : 'not_ready'}`);
    for (const failure of status.strictFailures)
        console.log(`  STRICT-MISSING ${failure}`);
    console.log('- Market claim boundary: benchmark proof scaffold exists; broader multi-repo/baseline proof is still required before market-superiority claims.');
    return status;
}
function printProductNextStep(analysis, statuses) {
    const missing = statuses.filter(row => !row.ready);
    console.log(`Task guide: ${utils_1.Path.join(analysis, 'TASK.md')}`);
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
function repoArg(args, fallback = '.') {
    const first = positionalArgs(args)[0];
    return utils_1.Path.resolve(first || fallback);
}
function assertRepoDirectory(repo) {
    if (!utils_1.FS.existsSync(repo) || !utils_1.FS.statSync(repo).isDirectory())
        throw new Error(`Repository path does not exist or is not a directory: ${repo}`);
}
function cmdPrepare(args) {
    const repo = repoArg(args);
    assertRepoDirectory(repo);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const codeMap = scopedCodeMap((0, repoMap_1.buildRepoMap)(repo, {
        maxFileSize: (0, utils_1.numericArg)(args, '--max-file-size', 1250000),
        capsuleLimit: (0, utils_1.numericArg)(args, '--capsules', 44),
        capsuleChars: (0, utils_1.numericArg)(args, '--capsule-chars', 10000)
    }), args);
    (0, aggregate_1.prepareAnalysis)(repo, analysis, codeMap);
    const tasks = (0, tasks_1.writeLlmTasks)(analysis, codeMap);
    const seedDir = utils_1.Path.join(repo, '.analysis-seed', 'llm');
    if (utils_1.FS.existsSync(seedDir) && !(0, utils_1.hasFlag)(args, '--no-seed')) {
        (0, utils_1.copyRecursive)(seedDir, utils_1.Path.join(analysis, 'llm'), false);
    }
    const detailReviewSeedDir = utils_1.Path.join(repo, '.analysis-seed', 'detail_reviews');
    if (utils_1.FS.existsSync(detailReviewSeedDir) && !(0, utils_1.hasFlag)(args, '--no-seed')) {
        (0, utils_1.copyRecursive)(detailReviewSeedDir, utils_1.Path.join(analysis, 'detail_reviews'), false);
    }
    const sourceTierSeedDir = utils_1.Path.join(repo, '.analysis-seed', 'source_tiers');
    if (utils_1.FS.existsSync(sourceTierSeedDir) && !(0, utils_1.hasFlag)(args, '--no-seed')) {
        (0, utils_1.copyRecursive)(sourceTierSeedDir, utils_1.Path.join(analysis, 'source_tiers'), false);
    }
    const skillReviewSeedDir = utils_1.Path.join(repo, '.analysis-seed', 'skill_reviews');
    if (utils_1.FS.existsSync(skillReviewSeedDir) && !(0, utils_1.hasFlag)(args, '--no-seed')) {
        (0, utils_1.copyRecursive)(skillReviewSeedDir, utils_1.Path.join(analysis, 'skill_reviews'), false);
    }
    console.log(`Prepared LLM-first analysis workspace: ${analysis}`);
    console.log(`Code map: ${utils_1.Path.join(analysis, 'data', 'code-map.json')}`);
    console.log(`Source capsules: ${utils_1.Path.join(analysis, 'source-capsules.json')}`);
    console.log(`Required LLM workflow task files: ${utils_1.Path.join(analysis, 'llm_tasks')} (${tasks.length} tasks)`);
    console.log(`Optional capability templates: ${utils_1.Path.join(analysis, 'capability_templates')}`);
    console.log('Important: the code map is inventory-only. It does not parse imports, symbols, frameworks, contracts, examples or relationships; Codex, as the active in-session LLM, extracts those from source.');
    console.log(stagedLlmWorkflowMessage());
    return 0;
}
function productAnalysisRequest(args, previous) {
    const previousScopeRequest = previous?.analysis_scope_request || {};
    const previousTarget = previous?.target || {};
    const hasScope = args.includes('--scope');
    const hasScopeFiles = args.includes('--scope-files');
    if (hasScopeFiles && !hasScope && (!previous || String(previousScopeRequest.mode || 'complete') === 'complete')) {
        throw new Error('--scope-files requires --scope unless the previous product request already has a non-complete scope.');
    }
    const mode = String(args.includes('--mode') ? (0, utils_1.argValue)(args, '--mode', 'brief') : previous?.mode || 'brief').trim().toLowerCase();
    if (!PRODUCT_ANALYSIS_MODES.has(mode))
        throw new Error(`Unknown --mode ${mode}. Expected brief, blueprint or deep-dive.`);
    const goal = String(args.includes('--goal') ? (0, utils_1.argValue)(args, '--goal', '') : previous?.goal || '').trim();
    const scopeMode = hasScope ? analysisScopeMode(args) : String(previousScopeRequest.mode || 'complete');
    if (!SCOPE_MODES.has(scopeMode))
        throw new Error(`Unknown --scope ${scopeMode}. Expected complete, critical-path or representative.`);
    const previousScopeMode = String(previousScopeRequest.mode || 'complete');
    const previousScopeFiles = Number(previousScopeRequest.scope_files || 0);
    const preservePreviousScopeFiles = !hasScope || scopeMode === previousScopeMode;
    const scopeFiles = scopeMode === 'complete'
        ? null
        : hasScopeFiles
            ? Math.max(1, (0, utils_1.numericArg)(args, '--scope-files', scopeMode === 'critical-path' ? 1200 : 400))
            : preservePreviousScopeFiles && previousScopeFiles > 0
                ? previousScopeFiles
                : Math.max(1, scopeMode === 'critical-path' ? 1200 : 400);
    const target = {
        flow: String(args.includes('--flow') ? (0, utils_1.argValue)(args, '--flow', '') : previousTarget.flow || '').trim(),
        module: String(args.includes('--module') ? (0, utils_1.argValue)(args, '--module', '') : previousTarget.module || '').trim(),
        api: String(args.includes('--api') ? (0, utils_1.argValue)(args, '--api', '') : previousTarget.api || '').trim(),
        risk: String(args.includes('--risk') ? (0, utils_1.argValue)(args, '--risk', '') : previousTarget.risk || '').trim(),
        decision: String(args.includes('--decision') ? (0, utils_1.argValue)(args, '--decision', '') : previousTarget.decision || '').trim()
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
        depth_policy: mode === 'deep-dive'
            ? 'targeted source-family, flow, module, API, risk or decision analysis for the requested slice'
            : mode === 'blueprint'
                ? 'decision report plus modernization/rebuild blueprint and deep-dive backlog'
                : 'concise decision report with broad system understanding and explicit deep-dive backlog'
    };
}
function hasProductRequestOption(args) {
    return PRODUCT_REQUEST_OPTION_FLAGS.some(flag => args.includes(flag));
}
function analysisScopeChanged(analysis, request) {
    const codeMapPath = utils_1.Path.join(analysis, 'data', 'code-map.json');
    const scopePath = utils_1.Path.join(analysis, 'data', 'analysis-scope.json');
    if (!utils_1.FS.existsSync(codeMapPath) || !utils_1.FS.existsSync(scopePath))
        return false;
    const current = (0, utils_1.loadJson)(scopePath, {});
    const requested = request?.analysis_scope_request || {};
    const requestedMode = String(requested.mode || 'complete');
    if (String(current.mode || 'complete') !== requestedMode)
        return true;
    if (requestedMode !== 'complete') {
        const requestedFiles = Number(requested.scope_files || 0);
        const selectedFiles = Number(current.selected_files || 0);
        const totalFilesBeforeScope = Number(current.total_files_before_scope || selectedFiles);
        const expectedSelectedFiles = Math.min(requestedFiles, totalFilesBeforeScope || requestedFiles);
        if (requestedFiles > 0 && selectedFiles !== expectedSelectedFiles)
            return true;
    }
    return false;
}
function argsWithRequestScope(args, request) {
    const scoped = [];
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
function argsWithPersistedRequestScope(args, analysis) {
    const requestPath = utils_1.Path.join(analysis, 'data', 'product-analysis-request.json');
    const request = (0, utils_1.loadJson)(requestPath, null);
    return request ? argsWithRequestScope(args, request) : args;
}
function writeProductAnalysisRequest(repo, analysis, args) {
    const requestPath = utils_1.Path.join(analysis, 'data', 'product-analysis-request.json');
    const previous = (0, utils_1.loadJson)(requestPath, null);
    if (previous && !hasProductRequestOption(args))
        return previous;
    const request = productAnalysisRequest(args, previous || undefined);
    const stableRequest = ({ generated_at: _generatedAt, repo: _repo, request_hash: _hash, ...rest }) => rest;
    const previousHash = previous ? (0, utils_1.sha1Short)(JSON.stringify(stableRequest(previous)), 16) : '';
    const currentHash = (0, utils_1.sha1Short)(JSON.stringify(stableRequest(request)), 16);
    if (previous && previousHash === currentHash)
        return previous;
    (0, utils_1.ensureDir)(utils_1.Path.join(analysis, 'data'));
    const hasExistingLlmOutputs = PRODUCT_REQUEST_LLM_OUTPUTS.some(relativePath => utils_1.FS.existsSync(utils_1.Path.join(analysis, relativePath)));
    const requestChanged = previous ? previousHash !== currentHash : hasExistingLlmOutputs;
    const persisted = {
        ...request,
        request_hash: currentHash,
        repo
    };
    (0, utils_1.writeJson)(requestPath, persisted);
    (0, utils_1.writeJson)(utils_1.Path.join(analysis, 'data', 'product-analysis-request-freshness.json'), {
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
function cmdAnalyze(args) {
    const repo = repoArg(args);
    assertRepoDirectory(repo);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const request = writeProductAnalysisRequest(repo, analysis, args);
    const scopeChanged = analysisScopeChanged(analysis, request);
    if (scopeChanged) {
        console.log('Cognianalysis analyze: requested scope differs from existing analysis; rebuilding repository index and task guide.');
        const rc = cmdPrepare(argsWithRequestScope(args, request));
        if (rc !== 0)
            return rc;
    }
    const codeMapPath = utils_1.Path.join(analysis, 'data', 'code-map.json');
    if (!scopeChanged && utils_1.FS.existsSync(codeMapPath))
        (0, tasks_1.writeLlmTasks)(analysis, (0, utils_1.loadJson)(codeMapPath, {}));
    console.log(`Cognianalysis analyze: mode=${request.mode}${request.goal ? ` · goal=${request.goal}` : ''}`);
    return cmdRun(args);
}
function cmdRun(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const needsPrepare = !utils_1.FS.existsSync(analysis)
        || !utils_1.FS.existsSync(utils_1.Path.join(analysis, 'data', 'code-map.json'))
        || !utils_1.FS.existsSync(utils_1.Path.join(analysis, 'llm_tasks'))
        || !utils_1.FS.existsSync(utils_1.Path.join(analysis, 'TASK.md'))
        || !utils_1.FS.existsSync(utils_1.Path.join(analysis, 'source-tier-task-manifest.json'));
    if (needsPrepare) {
        const rc = cmdPrepare(argsWithPersistedRequestScope(args, analysis));
        if (rc !== 0)
            return rc;
    }
    const statuses = workflowArtifactStatuses(analysis);
    const missing = statuses.filter(row => !row.ready);
    if (missing.length) {
        (0, aggregate_1.aggregate)(repo, analysis);
        console.log(`Cognianalysis product mode: waiting for Codex-authored workflow artifacts.`);
        printProductNextStep(analysis, statuses);
        console.log(stagedLlmWorkflowMessage());
        return 0;
    }
    const rc = cmdFinalize(args);
    if (rc === 0)
        console.log(`Product mode complete. Report: ${reportPathForAnalysis(analysis)}`);
    return rc;
}
function cmdResume(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    if (!utils_1.FS.existsSync(analysis)) {
        console.log('No existing analysis workspace found; starting a new product-mode run.');
        return cmdRun(args);
    }
    const bundle = aggregateWithMaterializedDetailTasks(repo, analysis);
    const statuses = workflowArtifactStatuses(analysis);
    const rows = productStatusRows(analysis, bundle, statuses);
    console.log('Detected existing analysis.');
    for (const row of rows) {
        if (row.ready)
            console.log(`Skipping: ✓ ${row.label}`);
    }
    const next = rows.find(row => !row.ready);
    if (next)
        console.log(`Continuing: → ${next.label}`);
    else
        console.log('Continuing: final report is ready; refreshing render/audit artifacts.');
    return cmdRun(args);
}
function cmdOpen(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    if (!utils_1.FS.existsSync(analysis)) {
        console.log(`No analysis workspace found at ${analysis}`);
        console.log(`Run ${CLI_NAME} analyze ${repo}`);
        return 1;
    }
    let report = reportPathForAnalysis(analysis);
    if (!utils_1.FS.existsSync(report) && utils_1.FS.existsSync(utils_1.Path.join(analysis, 'llm', 'analysis-document.json'))) {
        const refreshed = renderReportAndRefreshBundle(repo, analysis, (0, utils_1.argValue)(args, '--out') ? utils_1.Path.resolve((0, utils_1.argValue)(args, '--out')) : undefined, (0, utils_1.argValue)(args, '--title'));
        report = refreshed.report;
    }
    if (!utils_1.FS.existsSync(report)) {
        console.log(`No rendered report found at ${report}`);
        console.log(`Run ${CLI_NAME} analyze ${repo}`);
        return 1;
    }
    console.log(`Report: ${report}`);
    console.log(`Open in browser: file://${report}`);
    return 0;
}
function cmdStatus(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    if (!utils_1.FS.existsSync(analysis)) {
        printRepositoryStatus(repo, analysis, null, []);
        return 0;
    }
    const bundle = aggregateWithMaterializedDetailTasks(repo, analysis);
    const statuses = workflowArtifactStatuses(analysis);
    printRepositoryStatus(repo, analysis, bundle, statuses);
    return bundle.final_llm_readiness?.state === 'ready' ? 0 : 1;
}
function cmdRepair(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const needsPrepare = !utils_1.FS.existsSync(analysis)
        || !utils_1.FS.existsSync(utils_1.Path.join(analysis, 'data', 'code-map.json'))
        || !utils_1.FS.existsSync(utils_1.Path.join(analysis, 'llm_tasks'))
        || !utils_1.FS.existsSync(utils_1.Path.join(analysis, 'TASK.md'))
        || !utils_1.FS.existsSync(utils_1.Path.join(analysis, 'source-tier-task-manifest.json'));
    if (needsPrepare) {
        console.log('Repair: rebuilding repository index, task guide and manifests.');
        const rc = cmdPrepare(argsWithPersistedRequestScope(args, analysis));
        if (rc !== 0)
            return rc;
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
    (0, utils_1.writeJson)(utils_1.Path.join(analysis, 'data', 'repair-report.json'), report);
    console.log(`Repair report: ${utils_1.Path.join(analysis, 'data', 'repair-report.json')}`);
    console.log(`Broken JSON: ${problems.length}`);
    for (const problem of problems.slice(0, 20))
        console.log(`BROKEN ${problem.path}: ${problem.error}`);
    console.log(`Missing or invalid workflow artifacts: ${missingArtifacts.length}`);
    for (const item of missingArtifacts.slice(0, 10))
        console.log(`MISSING ${item.path} (${item.reason})`);
    console.log(`Stale or incomplete outputs: ${staleOrIncomplete.length}`);
    for (const item of staleOrIncomplete.slice(0, 10))
        console.log(`REPAIR-NEXT ${item.area}: ${item.status}`);
    printRepositoryStatus(repo, analysis, bundle, statuses);
    return problems.length ? 1 : 0;
}
function cmdDoctor(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    console.log(`Cognianalysis doctor`);
    console.log(`Repo: ${repo}`);
    console.log(`Analysis: ${analysis}`);
    if (!utils_1.FS.existsSync(analysis)) {
        console.log('Workspace: missing');
        console.log(`Next action: ${CLI_NAME} analyze ${repo}`);
        return 0;
    }
    console.log(`Workspace: present`);
    console.log(`Task guide: ${utils_1.FS.existsSync(utils_1.Path.join(analysis, 'TASK.md')) ? 'present' : 'missing'} · ${utils_1.Path.join(analysis, 'TASK.md')}`);
    const statuses = workflowArtifactStatuses(analysis);
    for (const row of statuses) {
        const state = row.ready ? 'ready' : row.exists ? (row.valid_json ? 'empty' : 'invalid_json') : 'missing';
        console.log(`Artifact: ${row.path} · ${state}`);
    }
    const bundle = aggregateWithMaterializedDetailTasks(repo, analysis);
    const invalid = (bundle.evidence_index || []).filter((e) => e.valid === false);
    const readiness = (0, readiness_1.computeFinalLlmReadiness)(bundle);
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
    if ((0, utils_1.hasFlag)(args, '--market-proof')) {
        const marketProof = printMarketProofStatus(analysis);
        if ((0, utils_1.hasFlag)(args, '--strict') && marketProof.strictReady !== true)
            return 1;
    }
    return 0;
}
function cmdAggregate(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const bundle = (0, aggregate_1.aggregate)(repo, analysis);
    console.log(`Aggregated bundle: ${utils_1.Path.join(analysis, 'data', 'bundle.json')}`);
    console.log(`Capabilities: ${(bundle.capabilities || []).length} · Interfaces: ${(bundle.interfaces || []).length} · Flows: ${(bundle.flows || []).length}`);
    return 0;
}
function cmdRender(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const out = (0, utils_1.argValue)(args, '--out');
    console.log((0, report_1.renderReport)(analysis, out ? utils_1.Path.resolve(out) : undefined, (0, utils_1.argValue)(args, '--title')));
    return 0;
}
function cmdValidate(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const bundle = (0, aggregate_1.aggregate)(repo, analysis);
    const invalid = (bundle.evidence_index || []).filter((e) => e.valid === false);
    console.log(`Evidence: ${(bundle.evidence_index || []).length} total · ${invalid.length} invalid`);
    for (const e of invalid.slice(0, 30))
        console.log(`INVALID ${e.path}:${e.line} ${e.reason || ''}`);
    return invalid.length ? 1 : 0;
}
function cmdCoverage(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const bundle = (0, aggregate_1.aggregate)(repo, analysis);
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
    for (const row of (backlog.next_tasks || []).slice(0, 5))
        console.log(`NEXT-TIER ${row.id} ${row.status} cards=${row.card_count}/${row.file_count} output=${row.expected_output}`);
    for (const item of (sc.invalid_coverage_item_examples || []).slice(0, 10))
        console.log(`INVALID-COVERAGE ${item.kind || 'coverage'} ${item.path || JSON.stringify(item.item) || ''} ${item.reason || ''}`);
    return 0;
}
function cmdTierContext(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const taskId = (0, utils_1.argValue)(args, '--task');
    if (!taskId)
        throw new Error('Missing --task source-tier-0001');
    const context = (0, sourceTiers_1.writeSourceTierContext)(repo, analysis, taskId, (0, utils_1.numericArg)(args, '--max-chars', 6000));
    console.log(`Source tier context: ${context.output_path}`);
    console.log(`Task: ${context.task_id} · files: ${context.file_count} · max chars/file: ${context.max_chars_per_file}`);
    return 0;
}
function cmdTierStatus(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const limit = (0, utils_1.numericArg)(args, '--limit', 20);
    const backlog = (0, sourceTiers_1.sourceTierBacklogArtifact)(analysis);
    (0, utils_1.writeJson)(utils_1.Path.join(analysis, 'data', 'source-tier-backlog.json'), backlog);
    console.log(`Tier 1 execution backlog: ${backlog.complete ? 'complete' : 'partial'}`);
    console.log(`Tasks: ${backlog.complete_tasks}/${backlog.total_tasks} complete · ${backlog.incomplete_tasks} incomplete · ${backlog.missing_tasks} missing · ${backlog.partial_tasks} partial · ${backlog.invalid_tasks} invalid · ${backlog.invalid_file_card_tasks || 0} invalid file-card batches · ${backlog.non_complete_review_status_tasks || 0} non-complete review statuses`);
    console.log(`File cards in task outputs: ${backlog.authored_file_cards_in_task_outputs}/${backlog.total_task_files}`);
    console.log(`Backlog artifact: ${utils_1.Path.join(analysis, 'data', 'source-tier-backlog.json')}`);
    for (const row of (backlog.next_tasks || []).slice(0, limit)) {
        console.log(`NEXT ${row.id} ${row.status} cards=${row.card_count}/${row.file_count} missing=${row.missing_file_count} invalid_cards=${row.invalid_file_card_count || 0} output=${row.expected_output}`);
        if (row.error)
            console.log(`  error: ${row.error}`);
        if (row.first_path || row.last_path)
            console.log(`  files: ${row.first_path}${row.last_path && row.last_path !== row.first_path ? ` ... ${row.last_path}` : ''}`);
    }
    return 0;
}
function cmdTierNext(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const limit = (0, utils_1.numericArg)(args, '--limit', 1);
    const maxChars = (0, utils_1.numericArg)(args, '--max-chars', 6000);
    const plan = (0, sourceTiers_1.writeNextSourceTierContexts)(repo, analysis, limit, maxChars);
    console.log(`Prepared ${plan.selected_count} Tier 1 source context${plan.selected_count === 1 ? '' : 's'}.`);
    if (plan.selected_count)
        console.log(`Plan: ${utils_1.Path.join(analysis, 'source-tier-next.json')}`);
    if (plan.codex_workpack)
        console.log(`Codex workpack: ${plan.codex_workpack}`);
    for (const context of plan.contexts || []) {
        console.log(`NEXT ${context.task_id} context=${context.output_path} task=${context.task_file} output=${context.expected_output} files=${context.file_count}`);
    }
    if (!plan.selected_count)
        console.log('No incomplete Tier 1 tasks found.');
    return 0;
}
function aggregateWithMaterializedDetailTasks(repo, analysis) {
    let bundle = (0, aggregate_1.aggregate)(repo, analysis);
    if (bundle.source_tier_coverage?.complete === true && bundle.llm_skill_workbench_plan?.uses_analysis_strategy_artifact === true && bundle.llm_skill_workbench_plan?.planning_decision_present === true) {
        (0, skillWorkbenches_1.writeSkillWorkbenchTasksFromLlmStrategy)(analysis, bundle.analysis_strategy);
        bundle = (0, aggregate_1.aggregate)(repo, analysis);
    }
    if (bundle.llm_detail_agent_plan?.uses_pre_final_plan_artifact === true && (bundle.llm_detail_agent_plan?.tasks || []).length) {
        (0, tasks_1.writeDetailTasksFromLlmPlan)(analysis, bundle.llm_detail_agent_plan);
        bundle = (0, aggregate_1.aggregate)(repo, analysis);
    }
    return bundle;
}
function renderReportAndRefreshBundle(repo, analysis, outputDir, title) {
    aggregateWithMaterializedDetailTasks(repo, analysis);
    const report = (0, report_1.renderReport)(analysis, outputDir, title);
    const bundle = aggregateWithMaterializedDetailTasks(repo, analysis);
    (0, report_1.renderReport)(analysis, outputDir, title);
    return { bundle, report };
}
function cmdAuditReport(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const { bundle, report } = renderReportAndRefreshBundle(repo, analysis, (0, utils_1.argValue)(args, '--out') ? utils_1.Path.resolve((0, utils_1.argValue)(args, '--out')) : undefined, (0, utils_1.argValue)(args, '--title'));
    const rows = bundle.target_artifact_contract_coverage || bundle.target_coverage || [];
    const invalid = (bundle.evidence_index || []).filter((e) => e.valid === false);
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
    const failures = [];
    if (bundle.llm_analysis_strategy?.uses_pre_analysis_strategy_artifact !== true || bundle.llm_analysis_strategy?.strategy_present !== true)
        failures.push('missing required Codex-authored analysis strategy artifact: llm/analysis-strategy.json');
    if (bundle.report_mode?.llm_authored !== true)
        failures.push('visible report is not Codex-authored');
    if (prerequisiteCoverage.complete !== true)
        failures.push(`final synthesis prerequisites incomplete: ${(prerequisiteCoverage.missing_outputs || []).join(', ') || 'unknown'}`);
    if (bundle.report_mode?.final_after_detail_reviews !== true)
        failures.push('final report missing synthesis_stage=final_after_detail_reviews');
    if (componentCoverage.complete !== true)
        failures.push(`analysis document component contract incomplete: ${(componentCoverage.missing || []).join(', ') || 'unknown'}`);
    if (reportLint.complete !== true)
        failures.push(`analysis document report lint incomplete: ${(reportLint.missing || []).slice(0, 8).join(', ') || 'unknown'}`);
    if (executiveDecisionLayer.complete !== true)
        failures.push(`executive decision layer incomplete: ${(executiveDecisionLayer.missing || []).slice(0, 8).join(', ') || 'unknown'}`);
    if (consistencyReview.complete !== true)
        failures.push(`Codex-authored consistency review incomplete: ${(consistencyReview.missing || []).slice(0, 8).join(', ') || 'unknown'}`);
    if (consistencyReview.complete === true && Number(consistencyReview.contradictions_found || 0) > 0)
        failures.push(`Codex-authored consistency review found unresolved contradictions: ${consistencyReview.contradictions_found}`);
    if (evidenceStrength.complete !== true)
        failures.push(`analysis document evidence strength incomplete: ${(evidenceStrength.missing_confidence || []).concat(evidenceStrength.unsupported_major_claims || []).slice(0, 8).join(', ') || 'unknown'}`);
    if (semanticLineage.complete !== true)
        failures.push(`analysis document semantic lineage incomplete: ${(semanticLineage.incomplete_claims || []).map((item) => item.claim_id || item).slice(0, 8).join(', ') || 'unknown'}`);
    if (openQuestions.complete !== true)
        failures.push(`analysis document open questions incomplete: ${(openQuestions.missing || []).slice(0, 8).join(', ') || 'unknown'}`);
    if (openQuestions.complete === true && Number(openQuestions.blocking_count || 0) > 0)
        failures.push(`blocking open questions remain: ${openQuestions.blocking_count}`);
    if (externalFindings.complete !== true)
        failures.push(`external findings ingestion incomplete: ${(externalFindings.invalid_findings || []).map((item) => item.id || item).slice(0, 8).join(', ') || 'unknown'}`);
    if (runProvenance.complete !== true)
        failures.push(`analysis run provenance incomplete: ${(runProvenance.missing_required_artifacts || []).concat((runProvenance.mismatched_run_artifacts || []).map((item) => item.path || item)).slice(0, 8).join(', ') || 'unknown'}`);
    if (dependencyGraph.complete !== true)
        failures.push(`artifact dependency graph incomplete: ${(dependencyGraph.missing_nodes || []).concat(dependencyGraph.stale_nodes || []).slice(0, 8).join(', ') || 'unknown'}`);
    if (productRequestFreshness.complete === false)
        failures.push(`product analysis request changed; re-author stale LLM artifacts: ${(productRequestFreshness.stale_outputs || []).slice(0, 8).join(', ') || 'unknown'}`);
    if (staleness.stale === true)
        failures.push(`analysis is stale: prepared at ${staleness.analysis_commit || 'unknown'} but current commit is ${staleness.current_commit || 'unknown'}`);
    if (requirementsTraceContract.complete !== true)
        failures.push(`Codex-authored requirements trace contract incomplete: ${(requirementsTraceContract.missing || []).concat(requirementsTraceContract.weak || []).slice(0, 6).join(', ') || 'unknown'}`);
    if (goalTraceAlignment.complete !== true)
        failures.push(`Codex-authored goal trace reference contract incomplete: ${(goalTraceAlignment.missing_goal_refs || []).map((item) => item.ref || item).concat(goalTraceAlignment.unknown_goal_refs || []).slice(0, 8).join(', ') || 'unknown'}`);
    if (qualityReview.complete !== true)
        failures.push(`Codex-authored report quality review artifact incomplete: ${(qualityReview.missing || []).join(', ') || qualityReview.verdict || 'unknown'}`);
    if (qualityReview.complete === true && qualityReview.verdict_is_decision_ready !== true)
        failures.push(`Codex-authored report quality review verdict is not decision_ready: ${qualityReview.verdict || 'unknown'}`);
    if (bundle.llm_detail_agent_plan?.uses_pre_final_plan_artifact !== true)
        failures.push('missing required pre-final Codex-authored detail-agent plan artifact: llm/detail-agent-plan.json');
    if (bundle.report_mode?.final_synthesis_ready !== true)
        failures.push('final Codex-authored report is not synthesized after completed detail reviews');
    if (pipelineContract.complete !== true)
        failures.push(`Codex-authored analysis pipeline contract incomplete: ${(pipelineContract.missing || []).slice(0, 6).join(', ') || 'unknown'}`);
    if (skillCatalogContract.complete !== true)
        failures.push(`Codex-authored analysis skill catalog contract incomplete: ${(skillCatalogContract.missing || []).slice(0, 6).join(', ') || 'unknown'}`);
    if (sourceTierCoverage.complete !== true)
        failures.push(`tiered whole-codebase file analysis incomplete: ${sourceTierCoverage.tier1_file_cards || 0}/${sourceTierCoverage.total_files || 0} Tier 1 file cards, ${sourceTierCoverage.missing_tier1_files || 0} missing, ${sourceTierCoverage.invalid_file_cards || 0} invalid`);
    if (skillWorkbenchCoverage.complete !== true)
        failures.push(`Codex-planned skill workbench execution incomplete: ${skillWorkbenchCoverage.executed_count || 0}/${skillWorkbenchCoverage.planned_count || 0} executed, status=${skillWorkbenchCoverage.status || 'unknown'}`);
    if (skillSynthesis.complete !== true)
        failures.push(`skill-workbench synthesis ${skillSynthesis.status || 'not complete'}`);
    if (sourceCoverage.complete !== true)
        failures.push(`source inventory accounting incomplete: ${sourceCoverage.accounted_files ?? sourceCoverage.covered_files ?? 0}/${sourceCoverage.total_files || 0} accounted, ${sourceCoverage.invalid_coverage_items || 0} invalid coverage items`);
    if (invalid.length)
        failures.push(`invalid evidence: ${invalid.length}`);
    if (detailCoverage.complete !== true)
        failures.push(`source-family detail review coverage ${detailCoverage.status || 'not complete'}: ${detailCoverage.executed_count || 0}/${detailCoverage.planned_count || 0} executed, ${detailCoverage.integrated_count || 0}/${detailCoverage.planned_count || 0} integrated`);
    if (synthesis.complete !== true)
        failures.push(`detail-review synthesis ${synthesis.status || 'not complete'}`);
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
    for (const row of (sourceTierBacklog.next_tasks || []).slice(0, 8))
        console.log(`NEXT-TIER ${row.id} ${row.status} cards=${row.card_count}/${row.file_count} output=${row.expected_output}`);
    for (const failure of failures)
        console.log(`FAIL ${failure}`);
    return failures.length ? 1 : 0;
}
function cmdFinalize(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const out = (0, utils_1.argValue)(args, '--out');
    const title = (0, utils_1.argValue)(args, '--title');
    let bundle = aggregateWithMaterializedDetailTasks(repo, analysis);
    let report = '';
    if (!(0, utils_1.hasFlag)(args, '--no-html')) {
        const refreshed = renderReportAndRefreshBundle(repo, analysis, out ? utils_1.Path.resolve(out) : undefined, title);
        bundle = refreshed.bundle;
        report = refreshed.report;
    }
    const rows = bundle.target_artifact_contract_coverage || bundle.target_coverage || [];
    const invalid = (bundle.evidence_index || []).filter((e) => e.valid === false);
    const sourceCoverage = bundle.source_inventory_accounting || bundle.source_coverage || {};
    const sourceTierCoverage = bundle.source_tier_coverage || {};
    const sourceTierBacklog = bundle.source_tier_backlog || {};
    const uncovered = sourceCoverage.uncovered || [];
    const readiness = (0, readiness_1.computeFinalLlmReadiness)(bundle);
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
    if (report)
        console.log(`Report: ${report}`);
    for (const e of invalid.slice(0, 30))
        console.log(`INVALID ${e.path}:${e.line} ${e.reason || ''}`);
    for (const f of uncovered.slice(0, 30))
        console.log(`UNCOVERED ${f.path}`);
    for (const row of (sourceTierBacklog.next_tasks || []).slice(0, 8))
        console.log(`NEXT-TIER ${row.id} ${row.status} cards=${row.card_count}/${row.file_count} output=${row.expected_output}`);
    for (const item of (sourceCoverage.invalid_coverage_item_examples || []).slice(0, 30))
        console.log(`INVALID-COVERAGE ${item.kind || 'coverage'} ${item.path || JSON.stringify(item.item) || ''} ${item.reason || ''}`);
    for (const failure of readinessFailures.slice(0, 20))
        console.log(`CODEX-READINESS ${failure}`);
    if (invalid.length && !(0, utils_1.hasFlag)(args, '--allow-invalid'))
        return 1;
    if (bundle.status?.state === 'llm_extracted' && sourceCoverage.complete !== true && !(0, utils_1.hasFlag)(args, '--allow-partial'))
        return 1;
    if (bundle.status?.state === 'llm_extracted' && readinessFailures.length && !(0, utils_1.hasFlag)(args, '--allow-partial'))
        return 1;
    return 0;
}
function resourceRoot() {
    return utils_1.Path.resolve(__dirname, '..', 'resources');
}
const KNOWN_HARNESSES = ['codex', 'claude', 'cursor', 'windsurf', 'copilot', 'aider', 'generic'];
function targetArg(args, fallback = '.') {
    const first = positionalArgs(args)[0];
    return utils_1.Path.resolve(first || fallback);
}
function selectedHarnesses(args, fallback = [...KNOWN_HARNESSES]) {
    const raw = (0, utils_1.argValue)(args, '--harness', 'all') || 'all';
    const values = raw.split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    if (!values.length || values.includes('all'))
        return fallback;
    const unknown = values.filter(value => !KNOWN_HARNESSES.includes(value));
    if (unknown.length)
        throw new Error(`Unknown harness: ${unknown.join(', ')}. Expected one of: all, ${KNOWN_HARNESSES.join(', ')}`);
    return [...new Set(values)];
}
function writeTemplate(file, text, force, written, skipped) {
    if (utils_1.FS.existsSync(file) && !force) {
        skipped.push(file);
        return;
    }
    (0, utils_1.writeText)(file, text);
    written.push(file);
}
function copyAsset(src, dst, force, written, skipped) {
    if (utils_1.FS.existsSync(dst) && !force) {
        skipped.push(dst);
        return;
    }
    (0, utils_1.copyRecursive)(src, dst, force);
    written.push(dst);
}
function agentInstructionsForHarness(agentsText, executorName) {
    return agentsText
        .replace(/Codex itself executes/g, `${executorName} executes`)
        .replace(/Codex, as the active in-session LLM/g, `${executorName}, as the active in-session LLM`)
        .replace(/Codex must still/g, `${executorName} must still`)
        .replace(/Codex-authored/g, `${executorName}-authored`);
}
function harnessBody(harness, agentsText, executorName) {
    return `# Cognianalysis for ${harness}

This file connects ${harness} to the same Cognianalysis workflow used by other agent harnesses.

Use the rules below as the operational contract. The CLI prepares context and validates artifacts; ${executorName}, as the active in-session LLM, authors the semantic extraction JSON and final report. Do not use a direct LLM API runner for that work.

${agentInstructionsForHarness(agentsText, executorName).trim()}
`;
}
function cursorRule(agentsText) {
    return `---
description: "Run Cognianalysis LLM-first repository assessment workflow."
alwaysApply: true
---

${harnessBody('Cursor', agentsText, 'Cursor')}`;
}
function windsurfRule(agentsText) {
    return `---
trigger: always_on
description: "Run Cognianalysis LLM-first repository assessment workflow."
---

${harnessBody('Windsurf or Devin Desktop', agentsText, 'Windsurf or Devin Desktop')}`;
}
function installHarnessAssets(target, harnesses, args) {
    const force = (0, utils_1.hasFlag)(args, '--force');
    const noSkills = (0, utils_1.hasFlag)(args, '--no-skills');
    const root = resourceRoot();
    const agentsText = utils_1.FS.readFileSync(utils_1.Path.join(root, 'AGENTS.md'), 'utf8');
    const written = [];
    const skipped = [];
    (0, utils_1.ensureDir)(target);
    copyAsset(utils_1.Path.join(root, 'AGENTS.md'), utils_1.Path.join(target, 'AGENTS.md'), force, written, skipped);
    if (!noSkills)
        copyAsset(utils_1.Path.join(root, 'agents'), utils_1.Path.join(target, '.agents'), force, written, skipped);
    for (const harness of harnesses) {
        if (harness === 'claude') {
            writeTemplate(utils_1.Path.join(target, 'CLAUDE.md'), harnessBody('Claude Code', agentsText, 'Claude Code'), force, written, skipped);
        }
        else if (harness === 'cursor') {
            writeTemplate(utils_1.Path.join(target, '.cursor', 'rules', 'cognianalysis', 'RULE.md'), cursorRule(agentsText), force, written, skipped);
        }
        else if (harness === 'windsurf') {
            writeTemplate(utils_1.Path.join(target, '.devin', 'rules', 'cognianalysis.md'), windsurfRule(agentsText), force, written, skipped);
        }
        else if (harness === 'copilot') {
            writeTemplate(utils_1.Path.join(target, '.github', 'copilot-instructions.md'), harnessBody('GitHub Copilot', agentsText, 'GitHub Copilot'), force, written, skipped);
        }
        else if (harness === 'aider') {
            writeTemplate(utils_1.Path.join(target, 'CONVENTIONS.md'), harnessBody('Aider', agentsText, 'Aider'), force, written, skipped);
            writeTemplate(utils_1.Path.join(target, '.aider.conf.yml'), 'read: CONVENTIONS.md\n', force, written, skipped);
        }
        else if (harness === 'generic') {
            writeTemplate(utils_1.Path.join(target, 'COGNIANALYSIS_HARNESS.md'), harnessBody('generic agent harnesses', agentsText, 'the active agent harness'), force, written, skipped);
        }
    }
    return { written, skipped };
}
function cmdInitHarness(args) {
    const target = targetArg(args);
    const harnesses = selectedHarnesses(args);
    const { written, skipped } = installHarnessAssets(target, harnesses, args);
    console.log(`Installed Cognianalysis harness assets into ${target}`);
    console.log(`Harnesses: ${harnesses.join(', ')}`);
    for (const file of written)
        console.log(`- wrote ${file}`);
    for (const file of skipped)
        console.log(`- kept existing ${file}`);
    return 0;
}
function cmdInitCodex(args) {
    const target = targetArg(args);
    const force = (0, utils_1.hasFlag)(args, '--force');
    const { written, skipped } = installHarnessAssets(target, ['codex'], force ? [...args, '--force'] : args);
    console.log(`Installed Codex assets into ${target}`);
    for (const file of written)
        console.log(`- wrote ${file}`);
    for (const file of skipped)
        console.log(`- kept existing ${file}`);
    return 0;
}
function cmdPortfolio(args) {
    const reposFile = (0, utils_1.argValue)(args, '--repos');
    const out = utils_1.Path.resolve((0, utils_1.argValue)(args, '--out', 'portfolio-analysis') || 'portfolio-analysis');
    if (!reposFile)
        throw new Error('Missing --repos repos.txt');
    (0, utils_1.ensureDir)(out);
    const rows = [];
    const lines = utils_1.FS.readFileSync(utils_1.Path.resolve(reposFile), 'utf8').split(/\r?\n/).map((x) => x.trim()).filter((x) => x && !x.startsWith('#'));
    for (const line of lines) {
        const repo = utils_1.Path.resolve(line);
        const row = { repo: utils_1.Path.basename(repo), path: repo };
        if (!utils_1.FS.existsSync(repo)) {
            row.error = 'not_found';
            rows.push(row);
            continue;
        }
        const analysis = utils_1.Path.join(out, 'repos', utils_1.Path.basename(repo));
        try {
            const codeMap = scopedCodeMap((0, repoMap_1.buildRepoMap)(repo, { capsuleLimit: (0, utils_1.numericArg)(args, '--capsules', 44), maxFileSize: (0, utils_1.numericArg)(args, '--max-file-size', 1250000) }), args);
            (0, aggregate_1.prepareAnalysis)(repo, analysis, codeMap);
            (0, tasks_1.writeLlmTasks)(analysis, codeMap);
            const bundle = (0, aggregate_1.aggregate)(repo, analysis);
            const report = (0, report_1.renderReport)(analysis);
            row.report = report;
            row.repo_type = bundle.profile?.repo_type;
            row.source_files = bundle.profile?.source_files;
            row.inventory_signals = (bundle.signals || []).length;
            row.status = bundle.status?.state;
        }
        catch (err) {
            row.error = err?.message || String(err);
        }
        rows.push(row);
    }
    (0, utils_1.writeJson)(utils_1.Path.join(out, 'portfolio-summary.json'), rows);
    (0, utils_1.writeText)(utils_1.Path.join(out, 'index.html'), portfolioHtml(rows));
    console.log(utils_1.Path.join(out, 'index.html'));
    return 0;
}
function portfolioHtml(rows) {
    const trs = rows.map(r => `<tr><td>${esc(r.repo)}</td><td>${esc(r.repo_type || '')}</td><td>${esc(r.source_files || '')}</td><td>${esc(r.inventory_signals || '')}</td><td>${esc(r.status || '')}</td><td>${esc(r.error || '')}</td><td>${r.report ? `<a href="${esc(r.report)}">Report</a>` : ''}</td></tr>`).join('');
    return `<!doctype html><meta charset='utf-8'><title>Portfolio Analysis</title><style>body{font-family:system-ui;margin:30px;background:#f5f7fb}table{border-collapse:collapse;width:100%;background:white}td,th{border:1px solid #e0e6f0;padding:10px;text-align:left}</style><h1>Portfolio Analysis</h1><table><thead><tr><th>Repo</th><th>Type</th><th>Source Files</th><th>Inventory Signals</th><th>Status</th><th>Error</th><th>Report</th></tr></thead><tbody>${trs}</tbody></table>`;
}
function esc(v) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function runCommand(command, args) {
    if (!command || command === 'help' || command === '--help' || command === '-h') {
        usage();
        return 0;
    }
    if (command === '--version' || command === '-v') {
        console.log(VERSION);
        return 0;
    }
    if (command === 'dev') {
        const devCommand = args[0];
        if (!devCommand || devCommand === 'help' || devCommand === '--help' || devCommand === '-h') {
            devUsage();
            return 0;
        }
        return runCommand(devCommand, args.slice(1));
    }
    if (command === 'analyze')
        return cmdAnalyze(args);
    if (command === 'status')
        return cmdStatus(args);
    if (command === 'open')
        return cmdOpen(args);
    if (command === 'resume')
        return cmdResume(args);
    if (command === 'repair')
        return cmdRepair(args);
    if (command === 'init-harness' || command === 'init-agent')
        return cmdInitHarness(args);
    if (command === 'init-codex')
        return cmdInitCodex(args);
    if (command === 'mcp') {
        (0, mcp_1.startMcpLikeServer)();
        return 0;
    }
    if (command === 'init' || command === 'prepare')
        return cmdPrepare(args);
    if (command === 'run')
        return cmdRun(args);
    if (command === 'doctor')
        return cmdDoctor(args);
    if (command === 'finalize' || command === 'finish' || command === 'report')
        return cmdFinalize(args);
    if (command === 'aggregate')
        return cmdAggregate(args);
    if (command === 'render')
        return cmdRender(args);
    if (command === 'validate')
        return cmdValidate(args);
    if (command === 'coverage')
        return cmdCoverage(args);
    if (command === 'tier-status')
        return cmdTierStatus(args);
    if (command === 'tier-next')
        return cmdTierNext(args);
    if (command === 'tier-context')
        return cmdTierContext(args);
    if (command === 'audit-report')
        return cmdAuditReport(args);
    if (command === 'portfolio')
        return cmdPortfolio(args);
    usage();
    return 1;
}
async function main(argv = process.argv.slice(2)) {
    const command = argv[0];
    const args = argv.slice(1);
    try {
        return runCommand(command, args);
    }
    catch (err) {
        console.error(`Error: ${err?.message || String(err)}`);
        return 1;
    }
}
if (require.main === module) {
    if (process.argv[2] === 'mcp')
        (0, mcp_1.startMcpLikeServer)();
    else
        main()
            .then(code => process.exit(code))
            .catch((err) => {
            console.error(`Error: ${err?.message || String(err)}`);
            process.exit(1);
        });
}

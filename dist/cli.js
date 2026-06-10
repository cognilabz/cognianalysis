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
const VERSION = '0.6.0';
function analysisPath(repo, value) {
    if (value)
        return utils_1.Path.resolve(value);
    return utils_1.Path.join(repo, '.analysis');
}
function usage() {
    console.log(`Codebase Analysis Pack v${VERSION} · TypeScript

Usage:
  cba prepare [repo] [--analysis .analysis] [--capsules 44]
  cba analyze [repo] [--analysis .analysis] [--no-html]
  cba finalize [repo] [--analysis .analysis] [--out report-dir] [--title title] [--allow-invalid] [--allow-partial]
  cba finish [repo]   # alias for finalize
  cba report [repo]   # alias for finalize
  cba aggregate [repo] [--analysis .analysis]
  cba render [repo] [--analysis .analysis] [--out report-dir] [--title title]
  cba validate [repo] [--analysis .analysis]
  cba coverage [repo] [--analysis .analysis]
  cba audit-report [repo] [--analysis .analysis]
  cba init-codex [target] [--force]
  cba portfolio --repos repos.txt --out portfolio-analysis
  cba mcp
`);
}
function stagedLlmWorkflowMessage() {
    return 'Next step for an agent harness: execute llm_tasks/01-*.md through 10-*.md, then 11-detail-agent-plan.md, run cba finalize . --allow-partial to materialize detail_tasks, execute detail_tasks, then author 12-analysis-document.md and run cba finalize . plus cba audit-report .';
}
function repoArg(args, fallback = '.') {
    const first = args.find(a => !a.startsWith('--'));
    return utils_1.Path.resolve(first || fallback);
}
function cmdPrepare(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const codeMap = (0, repoMap_1.buildRepoMap)(repo, {
        maxFileSize: (0, utils_1.numericArg)(args, '--max-file-size', 1250000),
        capsuleLimit: (0, utils_1.numericArg)(args, '--capsules', 44),
        capsuleChars: (0, utils_1.numericArg)(args, '--capsule-chars', 10000)
    });
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
    console.log(`Prepared LLM-first analysis workspace: ${analysis}`);
    console.log(`Code map: ${utils_1.Path.join(analysis, 'data', 'code-map.json')}`);
    console.log(`Source capsules: ${utils_1.Path.join(analysis, 'source-capsules.json')}`);
    console.log(`Codex tasks: ${utils_1.Path.join(analysis, 'llm_tasks')} (${tasks.length} tasks)`);
    console.log('Important: code-map signals, navigation tags, scores and artifact candidates are hints only; Codex/LLM extracts final interfaces, flows and business logic.');
    console.log(stagedLlmWorkflowMessage());
    return 0;
}
function hasLlmJson(analysis) {
    const llmDir = utils_1.Path.join(analysis, 'llm');
    if (!utils_1.FS.existsSync(llmDir))
        return false;
    return utils_1.FS.readdirSync(llmDir).some((f) => f.endsWith('.json'));
}
function cmdAnalyze(args) {
    const rc = cmdPrepare(args);
    if (rc !== 0)
        return rc;
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    if (hasLlmJson(analysis)) {
        console.log('LLM output detected. Finalizing report.');
        return cmdFinalize(args);
    }
    const bundle = (0, aggregate_1.aggregate)(repo, analysis);
    if (!(0, utils_1.hasFlag)(args, '--no-html'))
        console.log(`Report: ${(0, report_1.renderReport)(analysis, undefined, (0, utils_1.argValue)(args, '--title'))}`);
    console.log(`Status: ${bundle.status?.state}`);
    console.log(stagedLlmWorkflowMessage());
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
    console.log('Target artifact contract matrix:');
    for (const row of rows) {
        const displayStatus = row.output_status === 'present' ? 'linked' : row.output_status;
        console.log(`${row.design_status.padEnd(7)} ${String(displayStatus).padEnd(8)} ${row.title}`);
    }
    const gaps = rows.filter((r) => ['missing', 'pending', 'partial'].includes(r.output_status));
    console.log(`\n${rows.length - gaps.length}/${rows.length} target artifact references are structurally linked. Partial/missing rows are diagnostic only; semantic quality and completeness are controlled by the LLM-authored requirements trace and report_quality_review.`);
    console.log(`Source inventory accounting: ${sc.accounted_files ?? sc.covered_files ?? 0}/${sc.total_files || 0} files accounted · ${sc.unaccounted_files ?? sc.uncovered_files ?? 0} unaccounted · ${sc.invalid_coverage_items || 0} invalid coverage items · ${sc.inventory_accounting_percent ?? sc.coverage_percent ?? 0}%`);
    for (const item of (sc.invalid_coverage_item_examples || []).slice(0, 10))
        console.log(`INVALID-COVERAGE ${item.kind || 'coverage'} ${item.path || JSON.stringify(item.item) || ''} ${item.reason || ''}`);
    return 0;
}
function aggregateWithMaterializedDetailTasks(repo, analysis) {
    let bundle = (0, aggregate_1.aggregate)(repo, analysis);
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
    const html = utils_1.FS.readFileSync(report, 'utf8');
    const rows = bundle.target_artifact_contract_coverage || bundle.target_coverage || [];
    const targetArtifactGaps = rows.filter((r) => ['missing', 'pending', 'partial'].includes(r.output_status));
    const invalid = (bundle.evidence_index || []).filter((e) => e.valid === false);
    const sourceCoverage = bundle.source_inventory_accounting || bundle.source_coverage || {};
    const prerequisiteCoverage = bundle.analysis_document_prerequisite_coverage || {};
    const synthesis = bundle.analysis_document_detail_review_synthesis || {};
    const detailCoverage = bundle.source_family_detail_review_coverage || {};
    const componentCoverage = bundle.analysis_document_component_coverage || {};
    const qualityReview = bundle.analysis_document_quality_review || {};
    const requirementsTraceContract = bundle.analysis_document_requirements_trace_contract || bundle.analysis_document_goal_coverage || {};
    const goalTraceAlignment = bundle.analysis_goal_trace_alignment || {};
    const pipelineContract = bundle.analysis_pipeline_contract || {};
    const skillCatalogContract = bundle.analysis_skill_catalog_contract || {};
    const fixedLabels = ['Management Brief', 'Technical Zoom-In', 'Technical Appendix', 'Coverage & Evidence', 'Raw Data Appendix', 'Appendix / Raw Data', 'Detail Agent Plan'];
    const fixedNavHits = fixedLabels.filter(label => html.includes(`>${label}<`));
    const fixedShellLabels = ['Architecture Report', 'business first · technical drilldown', 'Source-Derived Management Report'];
    const fixedShellHits = fixedShellLabels.filter(label => html.includes(label));
    const failures = [];
    if (bundle.report_mode?.llm_authored !== true)
        failures.push('visible report is not LLM-authored');
    if (prerequisiteCoverage.complete !== true)
        failures.push(`final synthesis prerequisites incomplete: ${(prerequisiteCoverage.missing_outputs || []).join(', ') || 'unknown'}`);
    if (bundle.report_mode?.final_after_detail_reviews !== true)
        failures.push('final report missing synthesis_stage=final_after_detail_reviews');
    if (componentCoverage.complete !== true)
        failures.push(`analysis document component contract incomplete: ${(componentCoverage.missing || []).join(', ') || 'unknown'}`);
    if (requirementsTraceContract.complete !== true)
        failures.push(`LLM requirements trace contract incomplete: ${(requirementsTraceContract.missing || []).concat(requirementsTraceContract.weak || []).slice(0, 6).join(', ') || 'unknown'}`);
    if (goalTraceAlignment.complete !== true)
        failures.push(`LLM goal trace reference contract incomplete: ${(goalTraceAlignment.missing_goal_refs || []).map((item) => item.ref || item).concat(goalTraceAlignment.unknown_goal_refs || []).slice(0, 8).join(', ') || 'unknown'}`);
    if (qualityReview.complete !== true)
        failures.push(`LLM report quality review artifact incomplete: ${(qualityReview.missing || []).join(', ') || qualityReview.verdict || 'unknown'}`);
    if (qualityReview.complete === true && qualityReview.verdict_is_decision_ready !== true)
        failures.push(`LLM report quality review verdict is not decision_ready: ${qualityReview.verdict || 'unknown'}`);
    if (bundle.llm_detail_agent_plan?.uses_pre_final_plan_artifact !== true)
        failures.push('missing required pre-final LLM detail-agent plan artifact: llm/detail-agent-plan.json');
    if (bundle.report_mode?.final_synthesis_ready !== true)
        failures.push('final LLM report is not synthesized after completed detail reviews');
    if (pipelineContract.complete !== true)
        failures.push(`LLM analysis pipeline contract incomplete: ${(pipelineContract.missing || []).slice(0, 6).join(', ') || 'unknown'}`);
    if (skillCatalogContract.complete !== true)
        failures.push(`LLM analysis skill catalog contract incomplete: ${(skillCatalogContract.missing || []).slice(0, 6).join(', ') || 'unknown'}`);
    if (sourceCoverage.complete !== true)
        failures.push(`source inventory accounting incomplete: ${sourceCoverage.accounted_files ?? sourceCoverage.covered_files ?? 0}/${sourceCoverage.total_files || 0} accounted, ${sourceCoverage.invalid_coverage_items || 0} invalid coverage items`);
    if (invalid.length)
        failures.push(`invalid evidence: ${invalid.length}`);
    if (detailCoverage.complete !== true)
        failures.push(`source-family detail review coverage ${detailCoverage.status || 'not complete'}: ${detailCoverage.executed_count || 0}/${detailCoverage.planned_count || 0} executed, ${detailCoverage.integrated_count || 0}/${detailCoverage.planned_count || 0} integrated`);
    if (synthesis.complete !== true)
        failures.push(`detail-review synthesis ${synthesis.status || 'not complete'}`);
    if (fixedNavHits.length)
        failures.push(`old fixed report nav labels present: ${fixedNavHits.join(', ')}`);
    if (bundle.report_mode?.llm_authored === true && fixedShellHits.length)
        failures.push(`fixed report shell copy present: ${fixedShellHits.join(', ')}`);
    if (bundle.report_mode?.llm_authored === true && html.includes('data-section="analysis-document"'))
        failures.push('fixed Analysis Document start page present before LLM-authored sections');
    if (/Syntax error in text|mermaid version/.test(html))
        failures.push('Mermaid syntax error text present in report');
    if (/<pre class="mermaid"/.test(html))
        failures.push('legacy Mermaid pre-render path present');
    console.log(`Report audit: ${failures.length ? 'failed' : 'passed'}`);
    console.log(`Report: ${report}`);
    console.log(`Mode: ${bundle.report_mode?.state || 'unknown'} · Target artifact refs: ${rows.length - targetArtifactGaps.length}/${rows.length} structurally linked · Source inventory: ${sourceCoverage.accounted_files ?? sourceCoverage.covered_files ?? 0}/${sourceCoverage.total_files || 0} · Evidence invalid: ${invalid.length}`);
    console.log(`Detail review execution: ${detailCoverage.status || 'unknown'} ${detailCoverage.executed_count || 0}/${detailCoverage.planned_count || 0} executed · ${detailCoverage.integrated_count || 0}/${detailCoverage.planned_count || 0} integrated`);
    console.log(`Detail synthesis: ${synthesis.status || 'unknown'} ${synthesis.integrated_count || 0}/${synthesis.executed_count || 0}`);
    console.log(`Final prerequisites: ${prerequisiteCoverage.complete ? 'complete' : 'partial'} · ${prerequisiteCoverage.ready_count || 0}/${prerequisiteCoverage.total_count || 0}`);
    console.log(`Analysis pipeline contract: ${pipelineContract.complete ? 'complete' : 'partial'} · ${pipelineContract.stage_count || 0}/${pipelineContract.required_stage_count || 0} stages`);
    console.log(`Analysis skill catalog: ${skillCatalogContract.complete ? 'complete' : 'partial'} · ${skillCatalogContract.skill_count || 0}/${skillCatalogContract.required_skill_count || 0} skills`);
    console.log(`Component contract: ${componentCoverage.complete ? 'complete' : 'partial'} · ${componentCoverage.missing?.length || 0} missing`);
    console.log(`Requirements trace contract: ${requirementsTraceContract.complete ? 'structured' : 'partial'} · LLM statuses: ${requirementsTraceContract.fully_covered_count || 0} covered · ${requirementsTraceContract.partial_count || 0} partial · ${requirementsTraceContract.open_count || 0} open · ${(requirementsTraceContract.missing?.length || 0) + (requirementsTraceContract.weak?.length || 0)} structural gaps`);
    console.log(`Goal trace references: ${goalTraceAlignment.complete ? 'explicit' : 'partial'} · ${(goalTraceAlignment.referenced_goal_refs || []).length}/${(goalTraceAlignment.expected_goal_refs || []).length} goal refs linked by LLM trace`);
    console.log(`Report quality review: ${qualityReview.complete ? 'structured' : 'partial'} · ${qualityReview.verdict || 'unknown'}`);
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
    const gaps = rows.filter((r) => ['missing', 'pending', 'partial'].includes(r.output_status));
    const invalid = (bundle.evidence_index || []).filter((e) => e.valid === false);
    const sourceCoverage = bundle.source_inventory_accounting || bundle.source_coverage || {};
    const uncovered = sourceCoverage.uncovered || [];
    const readiness = (0, readiness_1.computeFinalLlmReadiness)(bundle);
    const readinessFailures = readiness.failures;
    console.log(`Finalized analysis workspace: ${analysis}`);
    console.log(`Status: ${bundle.status?.state}`);
    console.log(`Target artifact contract refs: ${rows.length - gaps.length}/${rows.length} structurally linked`);
    if (gaps.length)
        console.log(`Unresolved artifact refs: ${gaps.map((r) => r.title).slice(0, 8).join(', ')}${gaps.length > 8 ? ' …' : ''}`);
    console.log(`Source inventory accounting: ${sourceCoverage.accounted_files ?? sourceCoverage.covered_files ?? 0}/${sourceCoverage.total_files || 0} files accounted · ${sourceCoverage.unaccounted_files ?? sourceCoverage.uncovered_files ?? 0} unaccounted · ${sourceCoverage.invalid_coverage_items || 0} invalid coverage items · ${sourceCoverage.inventory_accounting_percent ?? sourceCoverage.coverage_percent ?? 0}%`);
    console.log(`Evidence: ${(bundle.evidence_index || []).length} total · ${invalid.length} invalid`);
    console.log(`Final LLM readiness: ${readiness.state} · verdict=${readiness.final_verdict || 'unknown'}`);
    if (report)
        console.log(`Report: ${report}`);
    for (const e of invalid.slice(0, 30))
        console.log(`INVALID ${e.path}:${e.line} ${e.reason || ''}`);
    for (const f of uncovered.slice(0, 30))
        console.log(`UNCOVERED ${f.path}`);
    for (const item of (sourceCoverage.invalid_coverage_item_examples || []).slice(0, 30))
        console.log(`INVALID-COVERAGE ${item.kind || 'coverage'} ${item.path || JSON.stringify(item.item) || ''} ${item.reason || ''}`);
    for (const failure of readinessFailures.slice(0, 20))
        console.log(`LLM-READINESS ${failure}`);
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
function cmdInitCodex(args) {
    const target = repoArg(args);
    const force = (0, utils_1.hasFlag)(args, '--force');
    (0, utils_1.ensureDir)(target);
    const root = resourceRoot();
    (0, utils_1.copyRecursive)(utils_1.Path.join(root, 'AGENTS.md'), utils_1.Path.join(target, 'AGENTS.md'), force);
    (0, utils_1.copyRecursive)(utils_1.Path.join(root, 'agents'), utils_1.Path.join(target, '.agents'), force);
    console.log(`Installed Codex assets into ${target}`);
    console.log(`- ${utils_1.Path.join(target, 'AGENTS.md')}`);
    console.log(`- ${utils_1.Path.join(target, '.agents')}`);
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
            const codeMap = (0, repoMap_1.buildRepoMap)(repo, { capsuleLimit: (0, utils_1.numericArg)(args, '--capsules', 44), maxFileSize: (0, utils_1.numericArg)(args, '--max-file-size', 1250000) });
            (0, aggregate_1.prepareAnalysis)(repo, analysis, codeMap);
            (0, tasks_1.writeLlmTasks)(analysis, codeMap);
            const bundle = (0, aggregate_1.aggregate)(repo, analysis);
            const report = (0, report_1.renderReport)(analysis);
            row.report = report;
            row.repo_type = bundle.profile?.repo_type;
            row.source_files = bundle.profile?.source_files;
            row.signals = (bundle.signals || []).length;
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
    const trs = rows.map(r => `<tr><td>${esc(r.repo)}</td><td>${esc(r.repo_type || '')}</td><td>${esc(r.source_files || '')}</td><td>${esc(r.signals || '')}</td><td>${esc(r.status || '')}</td><td>${esc(r.error || '')}</td><td>${r.report ? `<a href="${esc(r.report)}">Report</a>` : ''}</td></tr>`).join('');
    return `<!doctype html><meta charset='utf-8'><title>Portfolio Analysis</title><style>body{font-family:system-ui;margin:30px;background:#f5f7fb}table{border-collapse:collapse;width:100%;background:white}td,th{border:1px solid #e0e6f0;padding:10px;text-align:left}</style><h1>Portfolio Analysis</h1><table><thead><tr><th>Repo</th><th>Type</th><th>Source Files</th><th>Signals</th><th>Status</th><th>Error</th><th>Report</th></tr></thead><tbody>${trs}</tbody></table>`;
}
function esc(v) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function main(argv = process.argv.slice(2)) {
    const command = argv[0];
    const args = argv.slice(1);
    try {
        if (!command || command === 'help' || command === '--help' || command === '-h') {
            usage();
            return 0;
        }
        if (command === '--version' || command === '-v') {
            console.log(VERSION);
            return 0;
        }
        if (command === 'prepare')
            return cmdPrepare(args);
        if (command === 'analyze')
            return cmdAnalyze(args);
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
        if (command === 'audit-report')
            return cmdAuditReport(args);
        if (command === 'init-codex')
            return cmdInitCodex(args);
        if (command === 'portfolio')
            return cmdPortfolio(args);
        if (command === 'mcp') {
            (0, mcp_1.startMcpLikeServer)();
            return 0;
        }
        usage();
        return 1;
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
        process.exit(main());
}

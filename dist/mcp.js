"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMcpLikeServer = startMcpLikeServer;
const aggregate_1 = require("./aggregate");
const repoMap_1 = require("./repoMap");
const report_1 = require("./report");
const tasks_1 = require("./tasks");
const aggregate_2 = require("./aggregate");
const utils_1 = require("./utils");
const readiness_1 = require("./readiness");
const skillWorkbenches_1 = require("./skillWorkbenches");
function send(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }
const SERVER_NAME = 'cognianalysis';
const VERSION = '0.7.0';
const CLI_NAME = 'cognianalysis';
function stagedLlmWorkflowMessage() {
    return `author llm_tasks/00-analysis-strategy.md first, execute source_tier_tasks/*.md for Tier 1 file cards, run ${CLI_NAME} dev finalize . --allow-partial to materialize Codex-planned skill_workbench_tasks, execute skill_workbench_tasks into skill_reviews, optionally use capability_templates/*.md only when the Codex-authored strategy or skill reviews need that output shape, then 11-detail-agent-plan.md, run ${CLI_NAME} dev finalize . --allow-partial to materialize detail_tasks, execute detail_tasks, then author 12-analysis-document.md and run ${CLI_NAME} analyze . plus ${CLI_NAME} dev audit-report .`;
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
function renderReportAndRefreshBundle(repo, analysis, out, title) {
    aggregateWithMaterializedDetailTasks(repo, analysis);
    const report = (0, report_1.renderReport)(analysis, out, title);
    const bundle = aggregateWithMaterializedDetailTasks(repo, analysis);
    (0, report_1.renderReport)(analysis, out, title);
    return { bundle, report };
}
async function callTool(name, args) {
    const repo = utils_1.Path.resolve(args?.repo || '.');
    const analysis = utils_1.Path.resolve(args?.analysis || utils_1.Path.join(repo, '.analysis'));
    if (!utils_1.FS.existsSync(repo) || !utils_1.FS.statSync(repo).isDirectory())
        throw new Error(`Repository path does not exist or is not a directory: ${repo}`);
    if (name === 'prepare') {
        const codeMap = (0, repoMap_1.buildRepoMap)(repo, { maxFileSize: args?.maxFileSize, capsuleLimit: args?.capsules, capsuleChars: args?.capsuleChars });
        (0, aggregate_2.prepareAnalysis)(repo, analysis, codeMap);
        const tasks = (0, tasks_1.writeLlmTasks)(analysis, codeMap);
        const seedDir = utils_1.Path.join(repo, '.analysis-seed', 'llm');
        if (utils_1.FS.existsSync(seedDir))
            (0, utils_1.copyRecursive)(seedDir, utils_1.Path.join(analysis, 'llm'), false);
        const detailReviewSeedDir = utils_1.Path.join(repo, '.analysis-seed', 'detail_reviews');
        if (utils_1.FS.existsSync(detailReviewSeedDir))
            (0, utils_1.copyRecursive)(detailReviewSeedDir, utils_1.Path.join(analysis, 'detail_reviews'), false);
        const skillReviewSeedDir = utils_1.Path.join(repo, '.analysis-seed', 'skill_reviews');
        if (utils_1.FS.existsSync(skillReviewSeedDir))
            (0, utils_1.copyRecursive)(skillReviewSeedDir, utils_1.Path.join(analysis, 'skill_reviews'), false);
        return { analysis, tasks: tasks.length, staged_llm_workflow: stagedLlmWorkflowMessage() };
    }
    if (name === 'aggregate')
        return (0, aggregate_1.aggregate)(repo, analysis);
    if (name === 'finalize') {
        const { bundle, report } = renderReportAndRefreshBundle(repo, analysis, args?.out, args?.title);
        const invalid = (bundle.evidence_index || []).filter((e) => e.valid === false);
        const rows = bundle.target_artifact_contract_coverage || bundle.target_coverage || [];
        const readiness = (0, readiness_1.computeFinalLlmReadiness)(bundle);
        if (bundle.status?.state === 'llm_extracted' && readiness.failures.length && args?.allowPartial !== true) {
            throw new Error(`Final Codex-authored analysis readiness is partial: ${readiness.failures.slice(0, 6).join('; ')}`);
        }
        return {
            report,
            status: bundle.status?.state,
            final_llm_readiness: readiness.state,
            final_llm_readiness_detail: readiness,
            final_llm_readiness_failures: readiness.failures,
            analysis_strategy: bundle.llm_analysis_strategy,
            report_mode: bundle.report_mode,
            analysis_goal_contract: bundle.analysis_goal_contract,
            analysis_goal_trace_alignment: bundle.analysis_goal_trace_alignment,
            tool_positioning_references: bundle.tool_positioning_references,
            requirements_trace_contract: bundle.analysis_document_requirements_trace_contract,
            report_quality_review: bundle.analysis_document_quality_review,
            target_artifact_contract_coverage_total: rows.length,
            target_artifact_contract_coverage_scored: false,
            target_artifact_contract_coverage_status: 'not_scored_cli_context_only',
            target_artifact_contract_coverage_gaps: [],
            target_coverage_total: rows.length,
            target_coverage_scored: false,
            semantic_authority: bundle.semantic_authority,
            source_tier_coverage: bundle.source_tier_coverage,
            skill_workbench_coverage: bundle.skill_workbench_coverage,
            source_inventory_accounting: bundle.source_inventory_accounting || bundle.source_coverage,
            source_coverage: bundle.source_coverage,
            evidence_total: (bundle.evidence_index || []).length,
            invalid: invalid.length,
            invalid_examples: invalid.slice(0, 20)
        };
    }
    if (name === 'audit-report') {
        const { bundle, report } = renderReportAndRefreshBundle(repo, analysis, args?.out, args?.title);
        const invalid = (bundle.evidence_index || []).filter((e) => e.valid === false);
        const sourceCoverage = bundle.source_inventory_accounting || bundle.source_coverage || {};
        const failures = [
            ...(0, readiness_1.finalLlmReadinessFailures)(bundle),
            ...(sourceCoverage.complete !== true ? [`source inventory accounting incomplete: ${sourceCoverage.accounted_files ?? sourceCoverage.covered_files ?? 0}/${sourceCoverage.total_files || 0} accounted, ${sourceCoverage.invalid_coverage_items || 0} invalid coverage items`] : []),
            ...(invalid.length ? [`invalid evidence: ${invalid.length}`] : [])
        ];
        const uniqueFailures = [...new Set(failures)];
        return {
            report,
            report_audit: uniqueFailures.length ? 'failed' : 'passed',
            failures: uniqueFailures,
            final_llm_readiness: (0, readiness_1.computeFinalLlmReadiness)(bundle),
            analysis_strategy: bundle.llm_analysis_strategy,
            report_mode: bundle.report_mode,
            detail_review_coverage: bundle.source_family_detail_review_coverage,
            detail_review_synthesis: bundle.analysis_document_detail_review_synthesis,
            skill_workbench_synthesis: bundle.analysis_document_skill_workbench_synthesis,
            analysis_pipeline_contract: bundle.analysis_pipeline_contract,
            analysis_skill_catalog_contract: bundle.analysis_skill_catalog_contract,
            skill_workbench_coverage: bundle.skill_workbench_coverage,
            requirements_trace_contract: bundle.analysis_document_requirements_trace_contract,
            analysis_goal_trace_alignment: bundle.analysis_goal_trace_alignment,
            report_quality_review: bundle.analysis_document_quality_review,
            semantic_authority: bundle.semantic_authority,
            source_tier_coverage: bundle.source_tier_coverage,
            source_inventory_accounting: sourceCoverage,
            evidence_total: (bundle.evidence_index || []).length,
            invalid: invalid.length,
            invalid_examples: invalid.slice(0, 20)
        };
    }
    if (name === 'render')
        return { report: (0, report_1.renderReport)(analysis, args?.out, args?.title) };
    if (name === 'validate') {
        const bundle = (0, aggregate_1.aggregate)(repo, analysis);
        const invalid = (bundle.evidence_index || []).filter((e) => e.valid === false);
        return { evidence_total: (bundle.evidence_index || []).length, invalid: invalid.length, invalid_examples: invalid.slice(0, 20) };
    }
    if (name === 'coverage') {
        const bundle = (0, aggregate_1.aggregate)(repo, analysis);
        return {
            target_artifact_contract_coverage: bundle.target_artifact_contract_coverage || bundle.target_coverage || [],
            target_coverage: bundle.target_coverage || [],
            skill_workbench_coverage: bundle.skill_workbench_coverage,
            source_inventory_accounting: bundle.source_inventory_accounting || bundle.source_coverage,
            source_coverage: bundle.source_coverage
        };
    }
    throw new Error(`Unknown tool: ${name}`);
}
function startMcpLikeServer() {
    process.stdin.setEncoding('utf8');
    let buffer = '';
    process.stdin.on('data', async (chunk) => {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        for (const line of lines) {
            if (!line.trim())
                continue;
            let req;
            try {
                req = JSON.parse(line);
            }
            catch (err) {
                send({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } });
                continue;
            }
            try {
                if (req.method === 'initialize') {
                    send({ jsonrpc: '2.0', id: req.id, result: { protocolVersion: '2024-11-05', serverInfo: { name: SERVER_NAME, version: VERSION }, capabilities: { tools: {} } } });
                }
                else if (req.method === 'tools/list') {
                    send({ jsonrpc: '2.0', id: req.id, result: { tools: ['prepare', 'finalize', 'audit-report', 'aggregate', 'render', 'validate', 'coverage'].map(name => ({ name, description: `Run ${CLI_NAME} ${name}`, inputSchema: { type: 'object', properties: { repo: { type: 'string' }, analysis: { type: 'string' }, allowPartial: { type: 'boolean' } } } })) } });
                }
                else if (req.method === 'tools/call') {
                    const result = await callTool(req.params?.name, req.params?.arguments || {});
                    send({ jsonrpc: '2.0', id: req.id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
                }
                else {
                    send({ jsonrpc: '2.0', id: req.id, error: { code: -32601, message: `Method not found: ${req.method}` } });
                }
            }
            catch (err) {
                send({ jsonrpc: '2.0', id: req.id, error: { code: -32000, message: err?.message || String(err) } });
            }
        }
    });
}

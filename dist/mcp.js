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
function send(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }
function stagedLlmWorkflowMessage() {
    return 'execute llm_tasks/01-*.md through 10-*.md, then 11-detail-agent-plan.md, run cba finalize . --allow-partial to materialize detail_tasks, execute detail_tasks, then author 12-analysis-document.md and run cba finalize . plus cba audit-report .';
}
function aggregateWithMaterializedDetailTasks(repo, analysis) {
    let bundle = (0, aggregate_1.aggregate)(repo, analysis);
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
        return { analysis, tasks: tasks.length, staged_llm_workflow: stagedLlmWorkflowMessage() };
    }
    if (name === 'aggregate')
        return (0, aggregate_1.aggregate)(repo, analysis);
    if (name === 'finalize') {
        const { bundle, report } = renderReportAndRefreshBundle(repo, analysis, args?.out, args?.title);
        const invalid = (bundle.evidence_index || []).filter((e) => e.valid === false);
        const rows = bundle.target_artifact_contract_coverage || bundle.target_coverage || [];
        const gaps = rows.filter((r) => ['missing', 'pending', 'partial'].includes(r.output_status));
        const readiness = (0, readiness_1.computeFinalLlmReadiness)(bundle);
        if (bundle.status?.state === 'llm_extracted' && readiness.failures.length && args?.allowPartial !== true) {
            throw new Error(`Final LLM readiness is partial: ${readiness.failures.slice(0, 6).join('; ')}`);
        }
        return {
            report,
            status: bundle.status?.state,
            final_llm_readiness: readiness.state,
            final_llm_readiness_detail: readiness,
            final_llm_readiness_failures: readiness.failures,
            report_mode: bundle.report_mode,
            analysis_goal_contract: bundle.analysis_goal_contract,
            analysis_goal_trace_alignment: bundle.analysis_goal_trace_alignment,
            tool_positioning_references: bundle.tool_positioning_references,
            requirements_trace_contract: bundle.analysis_document_requirements_trace_contract,
            report_quality_review: bundle.analysis_document_quality_review,
            target_artifact_contract_coverage_present: rows.length - gaps.length,
            target_artifact_contract_coverage_total: rows.length,
            target_artifact_contract_coverage_gaps: gaps.map((row) => ({ id: row.id, title: row.title, output_status: row.output_status })),
            target_coverage_present: rows.length - gaps.length,
            target_coverage_total: rows.length,
            semantic_authority: bundle.semantic_authority,
            source_inventory_accounting: bundle.source_inventory_accounting || bundle.source_coverage,
            source_coverage: bundle.source_coverage,
            evidence_total: (bundle.evidence_index || []).length,
            invalid: invalid.length,
            invalid_examples: invalid.slice(0, 20)
        };
    }
    if (name === 'audit-report') {
        const { bundle, report } = renderReportAndRefreshBundle(repo, analysis, args?.out, args?.title);
        const html = utils_1.FS.readFileSync(report, 'utf8');
        const invalid = (bundle.evidence_index || []).filter((e) => e.valid === false);
        const sourceCoverage = bundle.source_inventory_accounting || bundle.source_coverage || {};
        const fixedLabels = ['Management Brief', 'Technical Zoom-In', 'Technical Appendix', 'Coverage & Evidence', 'Raw Data Appendix', 'Appendix / Raw Data', 'Detail Agent Plan'];
        const fixedNavHits = fixedLabels.filter(label => html.includes(`>${label}<`));
        const fixedShellLabels = ['Architecture Report', 'business first · technical drilldown', 'Source-Derived Management Report'];
        const fixedShellHits = fixedShellLabels.filter(label => html.includes(label));
        const failures = [
            ...(0, readiness_1.finalLlmReadinessFailures)(bundle),
            ...(sourceCoverage.complete !== true ? [`source inventory accounting incomplete: ${sourceCoverage.accounted_files ?? sourceCoverage.covered_files ?? 0}/${sourceCoverage.total_files || 0} accounted, ${sourceCoverage.invalid_coverage_items || 0} invalid coverage items`] : []),
            ...(invalid.length ? [`invalid evidence: ${invalid.length}`] : []),
            ...(fixedNavHits.length ? [`old fixed report nav labels present: ${fixedNavHits.join(', ')}`] : []),
            ...(bundle.report_mode?.llm_authored === true && fixedShellHits.length ? [`fixed report shell copy present: ${fixedShellHits.join(', ')}`] : []),
            ...(bundle.report_mode?.llm_authored === true && html.includes('data-section="analysis-document"') ? ['fixed Analysis Document start page present before LLM-authored sections'] : []),
            ...(/Syntax error in text|mermaid version/.test(html) ? ['Mermaid syntax error text present in report'] : []),
            ...(/<pre class="mermaid"/.test(html) ? ['legacy Mermaid pre-render path present'] : [])
        ];
        const uniqueFailures = [...new Set(failures)];
        return {
            report,
            report_audit: uniqueFailures.length ? 'failed' : 'passed',
            failures: uniqueFailures,
            final_llm_readiness: (0, readiness_1.computeFinalLlmReadiness)(bundle),
            report_mode: bundle.report_mode,
            detail_review_coverage: bundle.source_family_detail_review_coverage,
            detail_review_synthesis: bundle.analysis_document_detail_review_synthesis,
            analysis_pipeline_contract: bundle.analysis_pipeline_contract,
            analysis_skill_catalog_contract: bundle.analysis_skill_catalog_contract,
            requirements_trace_contract: bundle.analysis_document_requirements_trace_contract,
            analysis_goal_trace_alignment: bundle.analysis_goal_trace_alignment,
            report_quality_review: bundle.analysis_document_quality_review,
            semantic_authority: bundle.semantic_authority,
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
                    send({ jsonrpc: '2.0', id: req.id, result: { protocolVersion: '2024-11-05', serverInfo: { name: 'codebase-analysis-pack', version: '0.6.0' }, capabilities: { tools: {} } } });
                }
                else if (req.method === 'tools/list') {
                    send({ jsonrpc: '2.0', id: req.id, result: { tools: ['prepare', 'finalize', 'audit-report', 'aggregate', 'render', 'validate', 'coverage'].map(name => ({ name, description: `Run cba ${name}`, inputSchema: { type: 'object', properties: { repo: { type: 'string' }, analysis: { type: 'string' }, allowPartial: { type: 'boolean' } } } })) } });
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

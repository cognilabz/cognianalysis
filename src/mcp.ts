import { aggregate } from './aggregate';
import { buildRepoMap } from './repoMap';
import { renderReport } from './report';
import { writeDetailTasksFromLlmPlan, writeLlmTasks } from './tasks';
import { prepareAnalysis } from './aggregate';
import { FS, Path, copyRecursive } from './utils';
import { computeFinalLlmReadiness, finalLlmReadinessFailures } from './readiness';
import { writeSkillWorkbenchTasksFromLlmStrategy } from './skillWorkbenches';

function send(obj: any): void { process.stdout.write(JSON.stringify(obj) + '\n'); }

const SERVER_NAME = 'cognianalysis';
const VERSION = '0.7.0';
const CLI_NAME = 'cognianalysis';

function stagedLlmWorkflowMessage(): string {
  return `author llm_tasks/00-analysis-strategy.md first, execute source_tier_tasks/*.md for Tier 1 file cards, run ${CLI_NAME} finalize . --allow-partial to materialize Codex-planned skill_workbench_tasks, execute skill_workbench_tasks into skill_reviews, optionally use capability_templates/*.md only when the Codex-authored strategy or skill reviews need that output shape, then 11-detail-agent-plan.md, run ${CLI_NAME} finalize . --allow-partial to materialize detail_tasks, execute detail_tasks, then author 12-analysis-document.md and run ${CLI_NAME} finalize . plus ${CLI_NAME} audit-report .`;
}

function aggregateWithMaterializedDetailTasks(repo: string, analysis: string): any {
  let bundle = aggregate(repo, analysis);
  if (bundle.source_tier_coverage?.complete === true && bundle.llm_skill_workbench_plan?.uses_analysis_strategy_artifact === true && bundle.llm_skill_workbench_plan?.planning_decision_present === true) {
    writeSkillWorkbenchTasksFromLlmStrategy(analysis, bundle.analysis_strategy);
    bundle = aggregate(repo, analysis);
  }
  if (bundle.llm_detail_agent_plan?.uses_pre_final_plan_artifact === true && (bundle.llm_detail_agent_plan?.tasks || []).length) {
    writeDetailTasksFromLlmPlan(analysis, bundle.llm_detail_agent_plan);
    bundle = aggregate(repo, analysis);
  }
  return bundle;
}

function renderReportAndRefreshBundle(repo: string, analysis: string, out?: string, title?: string): { bundle: any, report: string } {
  aggregateWithMaterializedDetailTasks(repo, analysis);
  const report = renderReport(analysis, out, title);
  const bundle = aggregateWithMaterializedDetailTasks(repo, analysis);
  renderReport(analysis, out, title);
  return { bundle, report };
}

async function callTool(name: string, args: any): Promise<any> {
  const repo = Path.resolve(args?.repo || '.');
  const analysis = Path.resolve(args?.analysis || Path.join(repo, '.analysis'));
  if (name === 'prepare') {
    const codeMap = buildRepoMap(repo, { maxFileSize: args?.maxFileSize, capsuleLimit: args?.capsules, capsuleChars: args?.capsuleChars });
    prepareAnalysis(repo, analysis, codeMap);
    const tasks = writeLlmTasks(analysis, codeMap);
    const seedDir = Path.join(repo, '.analysis-seed', 'llm');
    if (FS.existsSync(seedDir)) copyRecursive(seedDir, Path.join(analysis, 'llm'), false);
    const detailReviewSeedDir = Path.join(repo, '.analysis-seed', 'detail_reviews');
    if (FS.existsSync(detailReviewSeedDir)) copyRecursive(detailReviewSeedDir, Path.join(analysis, 'detail_reviews'), false);
    const skillReviewSeedDir = Path.join(repo, '.analysis-seed', 'skill_reviews');
    if (FS.existsSync(skillReviewSeedDir)) copyRecursive(skillReviewSeedDir, Path.join(analysis, 'skill_reviews'), false);
    return { analysis, tasks: tasks.length, staged_llm_workflow: stagedLlmWorkflowMessage() };
  }
  if (name === 'aggregate') return aggregate(repo, analysis);
  if (name === 'finalize') {
    const { bundle, report } = renderReportAndRefreshBundle(repo, analysis, args?.out, args?.title);
    const invalid = (bundle.evidence_index || []).filter((e: any) => e.valid === false);
    const rows = bundle.target_artifact_contract_coverage || bundle.target_coverage || [];
    const readiness = computeFinalLlmReadiness(bundle);
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
    const invalid = (bundle.evidence_index || []).filter((e: any) => e.valid === false);
    const sourceCoverage = bundle.source_inventory_accounting || bundle.source_coverage || {};
    const failures = [
      ...finalLlmReadinessFailures(bundle),
      ...(sourceCoverage.complete !== true ? [`source inventory accounting incomplete: ${sourceCoverage.accounted_files ?? sourceCoverage.covered_files ?? 0}/${sourceCoverage.total_files || 0} accounted, ${sourceCoverage.invalid_coverage_items || 0} invalid coverage items`] : []),
      ...(invalid.length ? [`invalid evidence: ${invalid.length}`] : [])
    ];
    const uniqueFailures = [...new Set(failures)];
    return {
      report,
      report_audit: uniqueFailures.length ? 'failed' : 'passed',
      failures: uniqueFailures,
      final_llm_readiness: computeFinalLlmReadiness(bundle),
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
  if (name === 'render') return { report: renderReport(analysis, args?.out, args?.title) };
  if (name === 'validate') {
    const bundle = aggregate(repo, analysis);
    const invalid = (bundle.evidence_index || []).filter((e: any) => e.valid === false);
    return { evidence_total: (bundle.evidence_index || []).length, invalid: invalid.length, invalid_examples: invalid.slice(0, 20) };
  }
  if (name === 'coverage') {
    const bundle = aggregate(repo, analysis);
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

export function startMcpLikeServer(): void {
  process.stdin.setEncoding('utf8');
  let buffer = '';
  process.stdin.on('data', async (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      let req: any;
      try { req = JSON.parse(line); } catch (err: any) { send({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }); continue; }
      try {
        if (req.method === 'initialize') {
          send({ jsonrpc: '2.0', id: req.id, result: { protocolVersion: '2024-11-05', serverInfo: { name: SERVER_NAME, version: VERSION }, capabilities: { tools: {} } } });
        } else if (req.method === 'tools/list') {
          send({ jsonrpc: '2.0', id: req.id, result: { tools: ['prepare','finalize','audit-report','aggregate','render','validate','coverage'].map(name => ({ name, description: `Run ${CLI_NAME} ${name}`, inputSchema: { type: 'object', properties: { repo: { type: 'string' }, analysis: { type: 'string' }, allowPartial: { type: 'boolean' } } } })) } });
        } else if (req.method === 'tools/call') {
          const result = await callTool(req.params?.name, req.params?.arguments || {});
          send({ jsonrpc: '2.0', id: req.id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
        } else {
          send({ jsonrpc: '2.0', id: req.id, error: { code: -32601, message: `Method not found: ${req.method}` } });
        }
      } catch (err: any) {
        send({ jsonrpc: '2.0', id: req.id, error: { code: -32000, message: err?.message || String(err) } });
      }
    }
  });
}

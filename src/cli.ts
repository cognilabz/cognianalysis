#!/usr/bin/env node
import { aggregate, prepareAnalysis } from './aggregate';
import { renderReport } from './report';
import { buildRepoMap } from './repoMap';
import { writeDetailTasksFromLlmPlan, writeLlmTasks } from './tasks';
import { FS, Path, argValue, copyRecursive, ensureDir, hasFlag, numericArg, writeJson, writeText } from './utils';
import { startMcpLikeServer } from './mcp';
import { computeFinalLlmReadiness, finalLlmReadinessFailures } from './readiness';
import { sourceTierBacklogArtifact, writeNextSourceTierContexts, writeSourceTierContext } from './sourceTiers';
import { writeSkillWorkbenchTasksFromLlmStrategy } from './skillWorkbenches';

const VERSION = '0.7.0';
const CLI_NAME = 'cognianalysis';

function analysisPath(repo: string, value?: string): string {
  if (value) return Path.resolve(value);
  return Path.join(repo, '.analysis');
}

function usage(): void {
  console.log(`Cognianalysis v${VERSION} · LLM-first source-code analysis

Usage:
  ${CLI_NAME} prepare [repo] [--analysis .analysis] [--capsules 44]
  ${CLI_NAME} analyze [repo] [--analysis .analysis] [--no-html]
  ${CLI_NAME} finalize [repo] [--analysis .analysis] [--out report-dir] [--title title] [--allow-invalid] [--allow-partial]
  ${CLI_NAME} finish [repo]   # alias for finalize
  ${CLI_NAME} report [repo]   # alias for finalize
  ${CLI_NAME} aggregate [repo] [--analysis .analysis]
  ${CLI_NAME} render [repo] [--analysis .analysis] [--out report-dir] [--title title]
  ${CLI_NAME} validate [repo] [--analysis .analysis]
  ${CLI_NAME} coverage [repo] [--analysis .analysis]
  ${CLI_NAME} tier-status [repo] [--analysis .analysis] [--limit 20]
  ${CLI_NAME} tier-next [repo] [--analysis .analysis] [--limit 1] [--max-chars 6000]
  ${CLI_NAME} tier-context [repo] --task source-tier-0001 [--analysis .analysis] [--max-chars 6000]
  ${CLI_NAME} audit-report [repo] [--analysis .analysis]
  ${CLI_NAME} init-harness [target] [--harness all|codex|claude|cursor|windsurf|copilot|aider|generic] [--force] [--no-skills]
  ${CLI_NAME} init-agent [target]   # alias for init-harness
  ${CLI_NAME} init-codex [target]   # compatibility alias for init-harness --harness codex
  ${CLI_NAME} portfolio --repos repos.txt --out portfolio-analysis
  ${CLI_NAME} mcp
`);
}

function stagedLlmWorkflowMessage(): string {
  return `Next step for an agent harness: author llm_tasks/00-analysis-strategy.md first, execute source_tier_tasks/*.md to create Tier 1 file cards for every included file, run ${CLI_NAME} finalize . --allow-partial to materialize LLM-planned skill_workbench_tasks from the strategy, execute skill_workbench_tasks into skill_reviews, optionally use capability_templates/*.md only when the LLM strategy or skill reviews need that output shape, then author 11-detail-agent-plan.md, run ${CLI_NAME} finalize . --allow-partial to materialize detail_tasks, execute detail_tasks, then author 12-analysis-document.md and run ${CLI_NAME} finalize . plus ${CLI_NAME} audit-report .`;
}

function repoArg(args: string[], fallback = '.'): string {
  const first = args.find(a => !a.startsWith('--'));
  return Path.resolve(first || fallback);
}

function cmdPrepare(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const codeMap = buildRepoMap(repo, {
    maxFileSize: numericArg(args, '--max-file-size', 1_250_000),
    capsuleLimit: numericArg(args, '--capsules', 44),
    capsuleChars: numericArg(args, '--capsule-chars', 10_000)
  });
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
  console.log('Important: the code map is inventory-only. It does not parse imports, symbols, frameworks, contracts, examples or relationships; the agent harness/LLM extracts those from source.');
  console.log(stagedLlmWorkflowMessage());
  return 0;
}

function hasLlmJson(analysis: string): boolean {
  const llmDir = Path.join(analysis, 'llm');
  if (!FS.existsSync(llmDir)) return false;
  return FS.readdirSync(llmDir).some((f: string) => f.endsWith('.json'));
}

function cmdAnalyze(args: string[]): number {
  const rc = cmdPrepare(args);
  if (rc !== 0) return rc;
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  if (hasLlmJson(analysis)) {
    console.log('LLM output detected. Finalizing report.');
    return cmdFinalize(args);
  }
  const bundle = aggregate(repo, analysis);
  if (!hasFlag(args, '--no-html')) console.log(`Report: ${renderReport(analysis, undefined, argValue(args, '--title'))}`);
  console.log(`Status: ${bundle.status?.state}`);
  console.log(stagedLlmWorkflowMessage());
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
  console.log(`\n${rows.length} target capabilities are registered as LLM trace context. Target rows are not presence-scored by the CLI; semantic quality and completeness are controlled by the LLM-authored requirements trace and report_quality_review.`);
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
  console.log(`Tasks: ${backlog.complete_tasks}/${backlog.total_tasks} complete · ${backlog.incomplete_tasks} incomplete · ${backlog.missing_tasks} missing · ${backlog.partial_tasks} partial · ${backlog.invalid_tasks} invalid · ${backlog.invalid_file_card_tasks || 0} invalid file-card batches · ${backlog.blocked_tasks} blocked`);
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
  const qualityReview = bundle.analysis_document_quality_review || {};
  const requirementsTraceContract = bundle.analysis_document_requirements_trace_contract || bundle.analysis_document_goal_coverage || {};
  const goalTraceAlignment = bundle.analysis_goal_trace_alignment || {};
  const pipelineContract = bundle.analysis_pipeline_contract || {};
  const skillCatalogContract = bundle.analysis_skill_catalog_contract || {};
  const failures: string[] = [];
  if (bundle.llm_analysis_strategy?.uses_pre_analysis_strategy_artifact !== true || bundle.llm_analysis_strategy?.strategy_present !== true) failures.push('missing required LLM analysis strategy artifact: llm/analysis-strategy.json');
  if (bundle.report_mode?.llm_authored !== true) failures.push('visible report is not LLM-authored');
  if (prerequisiteCoverage.complete !== true) failures.push(`final synthesis prerequisites incomplete: ${(prerequisiteCoverage.missing_outputs || []).join(', ') || 'unknown'}`);
  if (bundle.report_mode?.final_after_detail_reviews !== true) failures.push('final report missing synthesis_stage=final_after_detail_reviews');
  if (componentCoverage.complete !== true) failures.push(`analysis document component contract incomplete: ${(componentCoverage.missing || []).join(', ') || 'unknown'}`);
  if (requirementsTraceContract.complete !== true) failures.push(`LLM requirements trace contract incomplete: ${(requirementsTraceContract.missing || []).concat(requirementsTraceContract.weak || []).slice(0, 6).join(', ') || 'unknown'}`);
  if (goalTraceAlignment.complete !== true) failures.push(`LLM goal trace reference contract incomplete: ${(goalTraceAlignment.missing_goal_refs || []).map((item: any) => item.ref || item).concat(goalTraceAlignment.unknown_goal_refs || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (qualityReview.complete !== true) failures.push(`LLM report quality review artifact incomplete: ${(qualityReview.missing || []).join(', ') || qualityReview.verdict || 'unknown'}`);
  if (qualityReview.complete === true && qualityReview.verdict_is_decision_ready !== true) failures.push(`LLM report quality review verdict is not decision_ready: ${qualityReview.verdict || 'unknown'}`);
  if (bundle.llm_detail_agent_plan?.uses_pre_final_plan_artifact !== true) failures.push('missing required pre-final LLM detail-agent plan artifact: llm/detail-agent-plan.json');
  if (bundle.report_mode?.final_synthesis_ready !== true) failures.push('final LLM report is not synthesized after completed detail reviews');
  if (pipelineContract.complete !== true) failures.push(`LLM analysis pipeline contract incomplete: ${(pipelineContract.missing || []).slice(0, 6).join(', ') || 'unknown'}`);
  if (skillCatalogContract.complete !== true) failures.push(`LLM analysis skill catalog contract incomplete: ${(skillCatalogContract.missing || []).slice(0, 6).join(', ') || 'unknown'}`);
  if (sourceTierCoverage.complete !== true) failures.push(`tiered whole-codebase file analysis incomplete: ${sourceTierCoverage.tier1_file_cards || 0}/${sourceTierCoverage.total_files || 0} Tier 1 file cards, ${sourceTierCoverage.missing_tier1_files || 0} missing, ${sourceTierCoverage.invalid_file_cards || 0} invalid`);
  if (skillWorkbenchCoverage.complete !== true) failures.push(`LLM-planned skill workbench execution incomplete: ${skillWorkbenchCoverage.executed_count || 0}/${skillWorkbenchCoverage.planned_count || 0} executed, status=${skillWorkbenchCoverage.status || 'unknown'}`);
  if (skillSynthesis.complete !== true) failures.push(`skill-workbench synthesis ${skillSynthesis.status || 'not complete'}`);
  if (sourceCoverage.complete !== true) failures.push(`source inventory accounting incomplete: ${sourceCoverage.accounted_files ?? sourceCoverage.covered_files ?? 0}/${sourceCoverage.total_files || 0} accounted, ${sourceCoverage.invalid_coverage_items || 0} invalid coverage items`);
  if (invalid.length) failures.push(`invalid evidence: ${invalid.length}`);
  if (detailCoverage.complete !== true) failures.push(`source-family detail review coverage ${detailCoverage.status || 'not complete'}: ${detailCoverage.executed_count || 0}/${detailCoverage.planned_count || 0} executed, ${detailCoverage.integrated_count || 0}/${detailCoverage.planned_count || 0} integrated`);
  if (synthesis.complete !== true) failures.push(`detail-review synthesis ${synthesis.status || 'not complete'}`);

  console.log(`Report audit: ${failures.length ? 'failed' : 'passed'}`);
  console.log(`Report: ${report}`);
  console.log(`Mode: ${bundle.report_mode?.state || 'unknown'} · Target capabilities: ${rows.length} LLM trace context rows · Source inventory: ${sourceCoverage.accounted_files ?? sourceCoverage.covered_files ?? 0}/${sourceCoverage.total_files || 0} · Evidence invalid: ${invalid.length}`);
  console.log(`Analysis strategy: ${bundle.llm_analysis_strategy?.strategy_present ? 'structured' : 'missing'} · ${bundle.llm_analysis_strategy?.planning_source || 'missing_llm_analysis_strategy'}`);
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
  console.log(`Requirements trace contract: ${requirementsTraceContract.complete ? 'structured' : 'partial'} · LLM statuses: ${requirementsTraceContract.fully_covered_count || 0} covered · ${requirementsTraceContract.partial_count || 0} partial · ${requirementsTraceContract.open_count || 0} open · ${(requirementsTraceContract.missing?.length || 0) + (requirementsTraceContract.weak?.length || 0)} structural gaps`);
  console.log(`Goal trace references: ${goalTraceAlignment.complete ? 'explicit' : 'partial'} · ${(goalTraceAlignment.referenced_goal_refs || []).length}/${(goalTraceAlignment.expected_goal_refs || []).length} goal refs linked by LLM trace`);
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

  console.log(`Finalized analysis workspace: ${analysis}`);
  console.log(`Status: ${bundle.status?.state}`);
  console.log(`Target capabilities: ${rows.length} registered as LLM trace context · not CLI-scored`);
  console.log(`Tier 1 file-card coverage: ${sourceTierCoverage.tier1_file_cards || 0}/${sourceTierCoverage.total_files || 0} files · ${sourceTierCoverage.missing_tier1_files || 0} missing · ${sourceTierCoverage.invalid_file_cards || 0} invalid · ${sourceTierCoverage.coverage_percent || 0}%`);
  console.log(`Tier 1 task backlog: ${sourceTierBacklog.complete_tasks || 0}/${sourceTierBacklog.total_tasks || 0} complete · ${sourceTierBacklog.incomplete_tasks || 0} incomplete · ${sourceTierBacklog.missing_tasks || 0} missing outputs`);
  console.log(`Source inventory accounting: ${sourceCoverage.accounted_files ?? sourceCoverage.covered_files ?? 0}/${sourceCoverage.total_files || 0} files accounted · ${sourceCoverage.unaccounted_files ?? sourceCoverage.uncovered_files ?? 0} unaccounted · ${sourceCoverage.invalid_coverage_items || 0} invalid coverage items · ${sourceCoverage.inventory_accounting_percent ?? sourceCoverage.coverage_percent ?? 0}%`);
  console.log(`Evidence: ${(bundle.evidence_index || []).length} total · ${invalid.length} invalid`);
  console.log(`Final LLM readiness: ${readiness.state} · verdict=${readiness.final_verdict || 'unknown'}`);
  if (report) console.log(`Report: ${report}`);

  for (const e of invalid.slice(0, 30)) console.log(`INVALID ${e.path}:${e.line} ${e.reason || ''}`);
  for (const f of uncovered.slice(0, 30)) console.log(`UNCOVERED ${f.path}`);
  for (const row of (sourceTierBacklog.next_tasks || []).slice(0, 8)) console.log(`NEXT-TIER ${row.id} ${row.status} cards=${row.card_count}/${row.file_count} output=${row.expected_output}`);
  for (const item of (sourceCoverage.invalid_coverage_item_examples || []).slice(0, 30)) console.log(`INVALID-COVERAGE ${item.kind || 'coverage'} ${item.path || JSON.stringify(item.item) || ''} ${item.reason || ''}`);
  for (const failure of readinessFailures.slice(0, 20)) console.log(`LLM-READINESS ${failure}`);
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
  const first = args[0];
  return Path.resolve(first && !first.startsWith('--') ? first : fallback);
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

function harnessBody(harness: string, agentsText: string): string {
  return `# Cognianalysis for ${harness}

This file connects ${harness} to the same Cognianalysis workflow used by other agent harnesses.

Use the rules below as the operational contract. The CLI prepares context and validates artifacts; the agent harness/LLM authors the semantic extraction JSON and final report.

${agentsText.trim()}
`;
}

function cursorRule(agentsText: string): string {
  return `---
description: "Run Cognianalysis LLM-first repository assessment workflow."
alwaysApply: true
---

${harnessBody('Cursor', agentsText)}`;
}

function windsurfRule(agentsText: string): string {
  return `---
trigger: always_on
description: "Run Cognianalysis LLM-first repository assessment workflow."
---

${harnessBody('Windsurf or Devin Desktop', agentsText)}`;
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
      writeTemplate(Path.join(target, 'CLAUDE.md'), harnessBody('Claude Code', agentsText), force, written, skipped);
    } else if (harness === 'cursor') {
      writeTemplate(Path.join(target, '.cursor', 'rules', 'cognianalysis', 'RULE.md'), cursorRule(agentsText), force, written, skipped);
    } else if (harness === 'windsurf') {
      writeTemplate(Path.join(target, '.devin', 'rules', 'cognianalysis.md'), windsurfRule(agentsText), force, written, skipped);
    } else if (harness === 'copilot') {
      writeTemplate(Path.join(target, '.github', 'copilot-instructions.md'), harnessBody('GitHub Copilot', agentsText), force, written, skipped);
    } else if (harness === 'aider') {
      writeTemplate(Path.join(target, 'CONVENTIONS.md'), harnessBody('Aider', agentsText), force, written, skipped);
      writeTemplate(Path.join(target, '.aider.conf.yml'), 'read: CONVENTIONS.md\n', force, written, skipped);
    } else if (harness === 'generic') {
      writeTemplate(Path.join(target, 'COGNIANALYSIS_HARNESS.md'), harnessBody('generic agent harnesses', agentsText), force, written, skipped);
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
      const codeMap = buildRepoMap(repo, { capsuleLimit: numericArg(args, '--capsules', 44), maxFileSize: numericArg(args, '--max-file-size', 1_250_000) });
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

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const command = argv[0];
  const args = argv.slice(1);
  try {
    if (!command || command === 'help' || command === '--help' || command === '-h') { usage(); return 0; }
    if (command === '--version' || command === '-v') { console.log(VERSION); return 0; }
    if (command === 'prepare') return cmdPrepare(args);
    if (command === 'analyze') return cmdAnalyze(args);
    if (command === 'finalize' || command === 'finish' || command === 'report') return cmdFinalize(args);
    if (command === 'aggregate') return cmdAggregate(args);
    if (command === 'render') return cmdRender(args);
    if (command === 'validate') return cmdValidate(args);
    if (command === 'coverage') return cmdCoverage(args);
    if (command === 'tier-status') return cmdTierStatus(args);
    if (command === 'tier-next') return cmdTierNext(args);
    if (command === 'tier-context') return cmdTierContext(args);
    if (command === 'audit-report') return cmdAuditReport(args);
    if (command === 'init-harness' || command === 'init-agent') return cmdInitHarness(args);
    if (command === 'init-codex') return cmdInitCodex(args);
    if (command === 'portfolio') return cmdPortfolio(args);
    if (command === 'mcp') { startMcpLikeServer(); return 0; }
    usage();
    return 1;
  } catch (err: any) {
    console.error(`Error: ${err?.message || String(err)}`);
    return 1;
  }
}

if (require.main === module) {
  if (process.argv[2] === 'mcp') startMcpLikeServer();
  else main()
    .then(code => process.exit(code))
    .catch((err: any) => {
      console.error(`Error: ${err?.message || String(err)}`);
      process.exit(1);
    });
}

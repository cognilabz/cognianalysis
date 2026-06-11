export function finalLlmReadinessGaps(bundle: any): string[] {
  const prerequisiteCoverage = bundle.analysis_document_prerequisite_coverage || {};
  const synthesis = bundle.analysis_document_detail_review_synthesis || {};
  const skillSynthesis = bundle.analysis_document_skill_workbench_synthesis || {};
  const detailCoverage = bundle.source_family_detail_review_coverage || {};
  const sourceTierCoverage = bundle.source_tier_coverage || {};
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
  const productRequestFreshness = bundle.product_analysis_request_freshness || {};
  const staleness = bundle.analysis_staleness || {};
  const qualityReview = bundle.analysis_document_quality_review || {};
  const requirementsTraceContract = bundle.analysis_document_requirements_trace_contract || bundle.analysis_document_goal_coverage || {};
  const goalTraceAlignment = bundle.analysis_goal_trace_alignment || {};
  const pipelineContract = bundle.analysis_pipeline_contract || {};
  const skillCatalogContract = bundle.analysis_skill_catalog_contract || {};
  const productMode = String(bundle.product_analysis_request?.mode || 'brief').toLowerCase();
  const completeMode = productMode === 'complete';
  const gaps: string[] = [];
  if (bundle.llm_analysis_strategy?.uses_pre_analysis_strategy_artifact !== true || bundle.llm_analysis_strategy?.strategy_present !== true) gaps.push('missing required Codex-authored analysis strategy artifact: llm/analysis-strategy.json');
  if (bundle.report_mode?.llm_authored !== true) gaps.push('visible report is not Codex-authored');
  if (prerequisiteCoverage.complete !== true) gaps.push(`final synthesis prerequisites incomplete: ${(prerequisiteCoverage.missing_outputs || []).join(', ') || 'unknown'}`);
  if (bundle.report_mode?.final_after_detail_reviews !== true) gaps.push('final report missing synthesis_stage=final_after_detail_reviews');
  if (componentCoverage.complete !== true) gaps.push(`analysis document component contract incomplete: ${(componentCoverage.missing || []).join(', ') || 'unknown'}`);
  if (reportLint.complete !== true) gaps.push(`analysis document report lint incomplete: ${(reportLint.missing || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (executiveDecisionLayer.complete !== true) gaps.push(`executive decision layer incomplete: ${(executiveDecisionLayer.missing || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (consistencyReview.complete !== true) gaps.push(`Codex-authored consistency review incomplete: ${(consistencyReview.missing || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (consistencyReview.complete === true && Number(consistencyReview.contradictions_found || 0) > 0) gaps.push(`Codex-authored consistency review found unresolved contradictions: ${consistencyReview.contradictions_found}`);
  if (evidenceStrength.complete !== true) gaps.push(`analysis document evidence strength incomplete: ${(evidenceStrength.missing_confidence || []).concat(evidenceStrength.unsupported_major_claims || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (semanticLineage.complete !== true) gaps.push(`analysis document semantic lineage incomplete: ${(semanticLineage.incomplete_claims || []).map((item: any) => item.claim_id || item).slice(0, 8).join(', ') || 'unknown'}`);
  if (openQuestions.complete !== true) gaps.push(`analysis document open questions incomplete: ${(openQuestions.missing || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (openQuestions.complete === true && Number(openQuestions.blocking_count || 0) > 0) gaps.push(`blocking open questions remain: ${openQuestions.blocking_count}`);
  if (externalFindings.complete !== true) gaps.push(`external findings ingestion incomplete: ${(externalFindings.invalid_findings || []).map((item: any) => item.id || item).slice(0, 8).join(', ') || 'unknown'}`);
  if (runProvenance.complete !== true) gaps.push(`analysis run provenance incomplete: ${(runProvenance.missing_required_artifacts || []).concat((runProvenance.mismatched_run_artifacts || []).map((item: any) => item.path || item)).slice(0, 8).join(', ') || 'unknown'}`);
  if (dependencyGraph.complete !== true) gaps.push(`artifact dependency graph incomplete: ${(dependencyGraph.missing_nodes || []).concat(dependencyGraph.stale_nodes || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (productRequestFreshness.complete === false) gaps.push(`product analysis request changed; re-author stale LLM artifacts: ${(productRequestFreshness.stale_outputs || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (staleness.stale === true) gaps.push(`analysis is stale: prepared at ${staleness.analysis_commit || 'unknown'} but current commit is ${staleness.current_commit || 'unknown'}`);
  if (requirementsTraceContract.complete !== true) gaps.push(`Codex-authored requirements trace contract incomplete: ${(requirementsTraceContract.missing || []).concat(requirementsTraceContract.weak || []).slice(0, 6).join(', ') || 'unknown'}`);
  if (goalTraceAlignment.complete !== true) gaps.push(`Codex-authored goal trace reference contract incomplete: ${(goalTraceAlignment.missing_goal_refs || []).map((item: any) => item.ref || item).concat(goalTraceAlignment.unknown_goal_refs || []).slice(0, 8).join(', ') || 'unknown'}`);
  if (qualityReview.complete !== true) gaps.push(`Codex-authored report quality review artifact incomplete: ${(qualityReview.missing || []).join(', ') || qualityReview.verdict || 'unknown'}`);
  if (qualityReview.complete === true && qualityReview.verdict_is_decision_ready !== true) gaps.push(`Codex-authored report quality review verdict is not decision_ready: ${qualityReview.verdict || 'unknown'}`);
  if (bundle.llm_detail_agent_plan?.uses_pre_final_plan_artifact !== true) gaps.push('missing required pre-final Codex-authored detail-agent plan artifact: llm/detail-agent-plan.json');
  if (bundle.report_mode?.final_synthesis_ready !== true) gaps.push('final Codex-authored report is not synthesized after completed detail reviews');
  if (pipelineContract.complete !== true) gaps.push(`Codex-authored analysis pipeline contract incomplete: ${(pipelineContract.missing || []).slice(0, 6).join(', ') || 'unknown'}`);
  if (skillCatalogContract.complete !== true) gaps.push(`Codex-authored analysis skill catalog contract incomplete: ${(skillCatalogContract.missing || []).slice(0, 6).join(', ') || 'unknown'}`);
  if (completeMode && sourceTierCoverage.complete !== true) gaps.push(`tiered whole-codebase file analysis incomplete: ${sourceTierCoverage.tier1_file_cards || 0}/${sourceTierCoverage.total_files || 0} Tier 1 file cards, ${sourceTierCoverage.missing_tier1_files || 0} missing, ${sourceTierCoverage.invalid_file_cards || 0} invalid`);
  if (skillWorkbenchCoverage.complete !== true) gaps.push(`Codex-planned skill workbench execution incomplete: ${skillWorkbenchCoverage.executed_count || 0}/${skillWorkbenchCoverage.planned_count || 0} executed, status=${skillWorkbenchCoverage.status || 'unknown'}`);
  if (skillSynthesis.complete !== true) gaps.push(`skill-workbench synthesis ${skillSynthesis.status || 'not complete'}`);
  if (detailCoverage.complete !== true) gaps.push(`source-family detail review coverage ${detailCoverage.status || 'not complete'}: ${detailCoverage.executed_count || 0}/${detailCoverage.planned_count || 0} executed, ${detailCoverage.integrated_count || 0}/${detailCoverage.planned_count || 0} integrated`);
  if (synthesis.complete !== true) gaps.push(`detail-review synthesis ${synthesis.status || 'not complete'}`);
  return gaps;
}

export function finalLlmReadinessFailures(bundle: any): string[] {
  return finalLlmReadinessGaps(bundle);
}

export function computeFinalLlmReadiness(bundle: any): any {
  const readinessGaps = finalLlmReadinessGaps(bundle);
  return {
    state: readinessGaps.length ? 'partial' : 'ready',
    semantic_verdict_authority: 'codex_llm',
    product_mode: String(bundle.product_analysis_request?.mode || 'brief').toLowerCase(),
    complete_mode_requires_whole_repo_tier1: String(bundle.product_analysis_request?.mode || 'brief').toLowerCase() === 'complete',
    llm_execution_model: {
      executor: 'codex_in_session',
      execution_surface: 'current_codex_session',
      direct_llm_api_allowed: false,
      api_credentials_required: false,
      external_service_state_tracked: false,
      runtime_contract: 'codex_authors_required_artifacts_in_session',
      partial_state_meaning: 'artifact/readiness contract is incomplete; Codex execution is in-session'
    },
    final_verdict_source: 'analysis_document.report_quality_review.verdict',
    final_verdict: bundle.analysis_document_quality_review?.verdict || '',
    deterministic_contract_scope: 'prerequisite artifacts, explicit Codex-authored goal-trace references, mode-aware Tier 1 source-file analysis coverage, Codex-planned skill workbench execution, detail-review integration, renderer contract, evidence/index contracts, semantic lineage, run provenance, artifact dependency freshness, external finding shape, open-question structure, and Codex-authored verdict/rationale presence only',
    failures: readinessGaps,
    readiness_gaps: readinessGaps,
    gap_count: readinessGaps.length
  };
}

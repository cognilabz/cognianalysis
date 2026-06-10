"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalLlmReadinessFailures = finalLlmReadinessFailures;
exports.computeFinalLlmReadiness = computeFinalLlmReadiness;
function finalLlmReadinessFailures(bundle) {
    const prerequisiteCoverage = bundle.analysis_document_prerequisite_coverage || {};
    const synthesis = bundle.analysis_document_detail_review_synthesis || {};
    const detailCoverage = bundle.source_family_detail_review_coverage || {};
    const sourceTierCoverage = bundle.source_tier_coverage || {};
    const componentCoverage = bundle.analysis_document_component_coverage || {};
    const qualityReview = bundle.analysis_document_quality_review || {};
    const requirementsTraceContract = bundle.analysis_document_requirements_trace_contract || bundle.analysis_document_goal_coverage || {};
    const goalTraceAlignment = bundle.analysis_goal_trace_alignment || {};
    const pipelineContract = bundle.analysis_pipeline_contract || {};
    const skillCatalogContract = bundle.analysis_skill_catalog_contract || {};
    const failures = [];
    if (bundle.llm_analysis_strategy?.uses_pre_analysis_strategy_artifact !== true || bundle.llm_analysis_strategy?.strategy_present !== true)
        failures.push('missing required LLM analysis strategy artifact: llm/analysis-strategy.json');
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
    if (sourceTierCoverage.complete !== true)
        failures.push(`tiered whole-codebase file analysis incomplete: ${sourceTierCoverage.tier1_file_cards || 0}/${sourceTierCoverage.total_files || 0} Tier 1 file cards, ${sourceTierCoverage.missing_tier1_files || 0} missing, ${sourceTierCoverage.invalid_file_cards || 0} invalid`);
    if (detailCoverage.complete !== true)
        failures.push(`source-family detail review coverage ${detailCoverage.status || 'not complete'}: ${detailCoverage.executed_count || 0}/${detailCoverage.planned_count || 0} executed, ${detailCoverage.integrated_count || 0}/${detailCoverage.planned_count || 0} integrated`);
    if (synthesis.complete !== true)
        failures.push(`detail-review synthesis ${synthesis.status || 'not complete'}`);
    return failures;
}
function computeFinalLlmReadiness(bundle) {
    const failures = finalLlmReadinessFailures(bundle);
    return {
        state: failures.length ? 'partial' : 'ready',
        semantic_verdict_authority: 'llm',
        final_verdict_source: 'analysis_document.report_quality_review.verdict',
        final_verdict: bundle.analysis_document_quality_review?.verdict || '',
        deterministic_contract_scope: 'prerequisite artifacts, explicit LLM goal-trace references, Tier 1 source-file analysis coverage, detail-review integration, renderer contract, evidence/index contracts, and LLM-authored verdict/rationale presence only',
        failures
    };
}

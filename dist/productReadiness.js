"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeProductReadiness = computeProductReadiness;
exports.productReadinessBrief = productReadinessBrief;
const utils_1 = require("./utils");
const TRACE_MATCHERS = {
    reverse_engineering: { refs: ['required_levels.reverse_engineering_documentation'], labels: ['reverse engineering documentation'] },
    code: { refs: ['required_levels.code_analysis'], labels: ['code analysis'] },
    process: { refs: ['required_levels.process_analysis'], labels: ['process analysis'] },
    refactoring: { refs: ['required_levels.refactoring_target_architecture'], labels: ['refactoring target architecture'] },
    functional: { refs: ['required_views.functional_view'], labels: ['functional view'] },
    technical: { refs: ['required_views.technical_view'], labels: ['technical view'] },
    security: { refs: [], labels: ['security', 'security assessment', 'security coverage'] }
};
const UNCERTAINTY_EVIDENCE_KEYS = new Set([
    'open_questions',
    'open_question',
    'uncertainty',
    'uncertainties',
    'limitations',
    'accepted_limitations',
    'accepted_limit',
    'evidence_gap',
    'evidence_gaps',
    'missing_evidence',
    'proof_gap',
    'proof_gaps'
]);
function asList(value) {
    if (value === null || value === undefined)
        return [];
    return Array.isArray(value) ? value : [value];
}
function traceStatus(bundle, needle) {
    const row = traceRow(bundle, needle);
    return String(row?.status || '').toLowerCase();
}
function traceRow(bundle, needle) {
    const matcher = TRACE_MATCHERS[needle] || { refs: [], labels: [needle] };
    const rows = asList(bundle?.analysis_document_requirements_trace_contract?.requirements);
    const byRef = rows.find((item) => asList(item?.goal_contract_refs)
        .some((ref) => matcher.refs.includes(String(ref || ''))));
    if (byRef)
        return byRef;
    return rows.find((item) => {
        const label = normalizeTraceLabel(item?.label || item?.requirement);
        return matcher.labels.some(expected => label === normalizeTraceLabel(expected));
    });
}
function normalizeTraceLabel(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function hasReportBlock(bundle, type) {
    return asList(bundle?.analysis_document?.sections)
        .some((section) => asList(section?.blocks)
        .some((block) => String(block?.type || '').toLowerCase() === type));
}
function hasEvidenceBackedReportBlock(bundle, type) {
    return asList(bundle?.analysis_document?.sections)
        .some((section) => asList(section?.blocks)
        .some((block) => String(block?.type || '').toLowerCase() === type && hasEvidence(block)));
}
function hasEvidenceBackedItems(bundle, key) {
    return asList(bundle?.[key]).some((item) => hasEvidence(item));
}
function hasDirectEvidence(value) {
    return asList(value?.evidence).length > 0 || asList(value?.evidence_refs).length > 0;
}
function hasEvidence(value) {
    if (!value)
        return false;
    if (Array.isArray(value))
        return value.some(item => hasEvidence(item));
    if (typeof value !== 'object')
        return false;
    if (hasDirectEvidence(value))
        return true;
    return Object.keys(value).some(key => !isNonSupportEvidenceKey(key) && hasEvidence(value[key]));
}
function traceCoveredWithEvidence(bundle, needle, statuses = ['covered']) {
    const row = traceRow(bundle, needle);
    return statuses.includes(String(row?.status || '').toLowerCase()) && hasDirectEvidence(row);
}
function evidenceBackedExamples(bundle) {
    const interfaces = asList(bundle?.interfaces).flatMap((item) => asList(item?.examples));
    const flows = asList(bundle?.flows).flatMap((item) => asList(item?.examples));
    return [
        ...asList(bundle?.documentation?.request_response_examples),
        ...asList(bundle?.documentation?.function_examples),
        ...asList(bundle?.documentation?.business_logic_examples),
        ...asList(bundle?.documentation?.openapi),
        ...asList(bundle?.documentation?.soap),
        ...asList(bundle?.documentation?.contract_examples),
        ...interfaces,
        ...flows
    ].filter(item => hasEvidence(item));
}
function hasProcessEvidence(bundle) {
    if (traceCoveredWithEvidence(bundle, 'process', ['covered', 'partial']))
        return true;
    const process = bundle?.process;
    if (!process || typeof process !== 'object')
        return false;
    return hasEvidence(process);
}
function textFields(value, fields) {
    return fields.map(field => String(value?.[field] || '').toLowerCase()).join(' ');
}
function hasExplicitSecurityEvidence(value) {
    if (!value)
        return false;
    if (Array.isArray(value))
        return value.some(item => hasExplicitSecurityEvidence(item));
    if (typeof value !== 'object')
        return false;
    if (hasDirectEvidence(value)) {
        const classifierText = textFields(value, ['category', 'kind', 'type', 'area', 'dimension', 'intent']);
        const statementText = textFields(value, ['title', 'summary', 'description', 'reason', 'recommendation', 'status', 'verdict']);
        const allText = `${classifierText} ${statementText}`;
        const securityClass = /\b(security|vulnerability|vulnerabilities|vulnerable|cve|sast)\b/.test(classifierText);
        const securityRiskStatement = /\b(security|vulnerability|vulnerabilities|vulnerable|cve|injection|xss|csrf|secret|secrets|credential|credentials)\b/.test(allText);
        const authRiskStatement = /\b(authentication|authorization|authn|authz)\b/.test(allText)
            && /\b(risk|gap|missing|weak|bypass|exposure|vulnerability|vulnerable|security|unauthorized|finding|findings)\b/.test(allText);
        if (securityClass || securityRiskStatement || authRiskStatement)
            return true;
    }
    return Object.keys(value).some(key => !isNonSupportEvidenceKey(key) && hasExplicitSecurityEvidence(value[key]));
}
function isNonSupportEvidenceKey(key) {
    return key === 'evidence' || key === 'evidence_refs' || UNCERTAINTY_EVIDENCE_KEYS.has(key);
}
function hasExplicitSecurityCoverage(bundle) {
    return traceCoveredWithEvidence(bundle, 'security', ['covered', 'partial'])
        || hasExplicitSecurityEvidence(bundle?.quality)
        || hasExplicitSecurityEvidence(bundle?.findings)
        || hasExplicitSecurityEvidence(bundle?.analysis_document?.sections);
}
function hasQualityEvidence(bundle) {
    return traceCoveredWithEvidence(bundle, 'code', ['covered', 'partial'])
        && (hasEvidence(bundle?.quality) || hasEvidenceBackedItems(bundle, 'findings'));
}
function unsupportedMajorClaimCount(bundle) {
    return asList(bundle?.analysis_document_evidence_strength?.unsupported_major_claims).length;
}
function check(id, label, ready, evidence, missing) {
    return ready ? { id, label, ready, evidence } : { id, label, ready, evidence, missing };
}
function computeProductReadiness(repo, analysis, bundle, marketProof) {
    const finalReady = bundle?.final_llm_readiness?.state === 'ready';
    const requirementsTraceReady = bundle?.analysis_document_requirements_trace_contract?.complete === true
        && bundle?.analysis_goal_trace_alignment?.complete === true;
    const reverseEngineeringReady = traceCoveredWithEvidence(bundle, 'reverse_engineering');
    const functionalReady = traceCoveredWithEvidence(bundle, 'functional') || hasEvidenceBackedReportBlock(bundle, 'flow');
    const technicalReady = traceCoveredWithEvidence(bundle, 'technical') || hasEvidenceBackedReportBlock(bundle, 'boundary_map');
    const exampleCount = evidenceBackedExamples(bundle).length;
    const examplesReady = exampleCount > 0;
    const qualityReady = hasQualityEvidence(bundle) && hasExplicitSecurityCoverage(bundle);
    const processReady = hasProcessEvidence(bundle);
    const refactoringReady = traceCoveredWithEvidence(bundle, 'refactoring')
        || hasEvidenceBackedReportBlock(bundle, 'roadmap')
        || hasEvidenceBackedItems(bundle, 'refactoring')
        || hasEvidenceBackedItems(bundle, 'modernization');
    const decisionReady = bundle?.analysis_document_executive_decision_layer?.complete === true
        && bundle?.analysis_document_quality_review?.complete === true;
    const evidenceReady = bundle?.analysis_document_evidence_strength?.complete === true
        && Number(bundle?.analysis_document_report_lint?.unsupported_claim_count || 0) === 0
        && unsupportedMajorClaimCount(bundle) === 0
        && asList(bundle?.evidence_index).filter((item) => item?.valid === false).length === 0;
    const benchmarkReady = marketProof.goldenProofReady === true
        && Number(marketProof.passedGoldenRepos || 0) >= 5
        && Number(marketProof.totalGoldenRepos || 0) >= 5
        && asList(marketProof.goldenExpected).length >= 5;
    const baselineReady = marketProof.baselineProofReady === true;
    const simplifiedHarnessReady = bundle?.simplified_harness_contract?.complete === true;
    const orchestrationReady = bundle?.parallel_orchestration_contract?.complete === true;
    const artifactModelReady = bundle?.product_artifact_model?.model === 'thin_llm_first_harness'
        && bundle?.product_artifact_model?.complete === true;
    const checks = [
        check('decision_report_ready', 'Decision report generated and LLM-marked ready', finalReady, String(bundle?.final_llm_readiness?.state || 'missing'), 'Run/complete the LLM analysis until final_llm_readiness.state is ready.'),
        check('original_requirements_trace', 'Original entry-question requirements are traced', requirementsTraceReady, `requirements=${bundle?.analysis_document_requirements_trace_contract?.complete === true}, goal_alignment=${bundle?.analysis_goal_trace_alignment?.complete === true}`, 'Complete analysis_document.requirements_trace with goal_contract_refs and passing goal alignment.'),
        check('reverse_engineering_documentation', 'Reverse-engineering/documentation level is covered', reverseEngineeringReady, `trace=${traceStatus(bundle, 'reverse_engineering') || 'missing'}`, 'Cover reverse engineering and documentation with evidence.'),
        check('functional_reverse_engineering', 'Functional/user-flow view is covered', functionalReady, `trace=${traceStatus(bundle, 'functional') || 'missing'}, flow_block=${hasEvidenceBackedReportBlock(bundle, 'flow')}`, 'Produce a functional view with capabilities/user flows and evidence.'),
        check('technical_architecture_view', 'Technical/API/interface/architecture view is covered', technicalReady, `trace=${traceStatus(bundle, 'technical') || 'missing'}, boundary_map=${hasEvidenceBackedReportBlock(bundle, 'boundary_map')}`, 'Produce technical/API/interface/architecture sections with evidence.'),
        check('examples_view', 'Examples are extracted or explicitly inferred', examplesReady, `evidence_backed_examples=${exampleCount}, request_response_examples=${asList(bundle?.documentation?.request_response_examples).length}`, 'Extract request/response, OpenAPI, SOAP, CLI, event or inferred examples with provenance.'),
        check('quality_security_view', 'Bugs/security/code-quality findings are covered', qualityReady, `code_trace=${traceStatus(bundle, 'code') || 'missing'}, quality_evidence=${hasQualityEvidence(bundle)}, explicit_security=${hasExplicitSecurityCoverage(bundle)}, findings=${asList(bundle?.findings).length}`, 'Cover bugs, security and quality findings with evidence or explicit evidence-backed no-finding statements.'),
        check('process_view', 'Process/readiness optimization view is covered', processReady, `trace=${traceStatus(bundle, 'process') || 'missing'}, process_evidence=${hasEvidence(bundle?.process)}`, 'Cover process analysis and optimization potential with evidence.'),
        check('refactoring_modernization', 'Refactoring and modernization roadmap is covered', refactoringReady, `trace=${traceStatus(bundle, 'refactoring') || 'missing'}, roadmap=${hasEvidenceBackedReportBlock(bundle, 'roadmap')}`, 'Cover refactoring and modernization roadmap toward target architecture or tech stack.'),
        check('decision_basis', 'Decision basis and recommendations are covered', decisionReady, `executive=${bundle?.analysis_document_executive_decision_layer?.complete === true}, quality_review=${bundle?.analysis_document_quality_review?.complete === true}`, 'Complete executive decision layer, recommendations and report quality review.'),
        check('evidence_backed', 'Visible claims are evidence-backed', evidenceReady, `unsupported=${Number(bundle?.analysis_document_report_lint?.unsupported_claim_count || 0)}, unsupported_major=${unsupportedMajorClaimCount(bundle)}, invalid_evidence=${asList(bundle?.evidence_index).filter((item) => item?.valid === false).length}`, 'Resolve unsupported claims and invalid evidence references.'),
        check('multi_repo_benchmark', 'Representative golden benchmark proof exists', benchmarkReady, `validated=${Number(marketProof.passedGoldenRepos || 0)}/${Number(marketProof.totalGoldenRepos || 0)}, expected=${asList(marketProof.goldenExpected).length}, proof=${marketProof.goldenProofReady === true}`, 'Add and pass at least five representative golden suites with verifier-produced per-suite artifacts.'),
        check('baseline_comparison', 'Baseline comparison proof exists', baselineReady, `aggregate=${String(marketProof.baselineAggregate?.verdict || 'missing')}, proof=${marketProof.baselineProofReady === true}`, 'Add passing raw-agent/scanner/manual baseline comparison artifacts.'),
        check('thin_artifact_model', 'Artifact model is simplified to a thin harness', artifactModelReady, String(bundle?.product_artifact_model?.model || 'missing'), 'Collapse user-facing artifacts around run, plan, facts, reviews and report.'),
        check('simplified_harness_contract', 'Workflow is proven simplified', simplifiedHarnessReady, String(bundle?.simplified_harness_contract?.complete ?? 'missing'), 'Provide a simplified harness contract and remove/hide nonessential product workflow concepts.'),
        check('parallel_orchestration', 'Parallel/caching orchestration is productized', orchestrationReady, String(bundle?.parallel_orchestration_contract?.complete ?? 'missing'), 'Implement or prove parallel worker execution, caching and fast orchestration as the core path.')
    ];
    const missing = checks.filter(row => !row.ready).map(row => ({ id: row.id, label: row.label, next_action: row.missing }));
    const coreIds = new Set([
        'decision_report_ready',
        'original_requirements_trace',
        'reverse_engineering_documentation',
        'functional_reverse_engineering',
        'technical_architecture_view',
        'examples_view',
        'quality_security_view',
        'process_view',
        'refactoring_modernization',
        'decision_basis',
        'evidence_backed'
    ]);
    const simplificationIds = new Set(['thin_artifact_model', 'simplified_harness_contract', 'parallel_orchestration']);
    const coreChecks = checks.filter(row => coreIds.has(row.id));
    const simplificationChecks = checks.filter(row => simplificationIds.has(row.id));
    const proofChecks = checks.filter(row => row.id === 'multi_repo_benchmark' || row.id === 'baseline_comparison');
    const coreReadyCount = coreChecks.filter(row => row.ready).length;
    const coreIdeasCovered = coreReadyCount === coreChecks.length ? 'yes' : coreReadyCount > 0 ? 'partly' : 'no';
    const coreFeaturesImplemented = coreChecks.every(row => row.ready) && proofChecks.every(row => row.ready) ? 'yes' : coreReadyCount > 0 ? 'partly' : 'no';
    const perfectlySimplified = simplificationChecks.every(row => row.ready) ? 'yes' : 'no';
    const ready = checks.every(row => row.ready);
    const result = {
        schemaVersion: '1.0',
        contract_kind: 'original_product_readiness_contract',
        generated_at: new Date().toISOString(),
        repo,
        analysis,
        verdict: ready ? 'PRODUCT_READY' : coreReadyCount > 0 ? 'PARTIALLY_READY' : 'NOT_PRODUCT_READY',
        core_ideas_covered: coreIdeasCovered,
        core_features_implemented: coreFeaturesImplemented,
        perfectly_simplified: perfectlySimplified,
        ready,
        summary: ready
            ? 'Original entry-question product contract is fully implemented and simplified.'
            : 'Original entry-question product contract is not fully implemented or perfectly simplified yet.',
        checks,
        missing,
        next_best_action: missing[0]?.next_action || 'Keep benchmark suites and baseline comparisons current.'
    };
    try {
        (0, utils_1.writeJson)(utils_1.Path.join(analysis, 'data', 'product-readiness.json'), result);
    }
    catch {
        // Eval should still be printable on read-only or missing workspaces.
    }
    return result;
}
function productReadinessBrief(readiness) {
    return [
        `- Verdict: ${readiness.verdict}`,
        `- Core ideas covered: ${readiness.core_ideas_covered}`,
        `- Core features implemented: ${readiness.core_features_implemented}`,
        `- Perfectly simplified: ${readiness.perfectly_simplified}`,
        `- Missing checks: ${readiness.missing.length}`,
        `- Next best action: ${readiness.next_best_action}`
    ];
}

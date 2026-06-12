import { FS, Path, asList as utilAsList, writeJson } from './utils';

export interface ProductReadinessMarketProof {
  goldenExpected?: string[];
  passedGoldenRepos?: number;
  totalGoldenRepos?: number;
  baselineAggregate?: any;
  goldenProofReady?: boolean;
  baselineProofReady?: boolean;
  strictReady?: boolean;
  strictFailures?: string[];
}

interface ProductReadinessCheck {
  id: string;
  label: string;
  ready: boolean;
  evidence: string;
  missing?: string;
}

const TRACE_MATCHERS: Record<string, { refs: string[]; labels: string[] }> = {
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

function asList(value: any): any[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function traceStatus(bundle: any, needle: string): string {
  const row = traceRow(bundle, needle);
  return String(row?.status || '').toLowerCase();
}

function traceRow(bundle: any, needle: string): any {
  const matcher = TRACE_MATCHERS[needle] || { refs: [], labels: [needle] };
  const rows = asList(bundle?.analysis_document_requirements_trace_contract?.requirements);
  const byRef = rows.find((item: any) => asList(item?.goal_contract_refs)
    .some((ref: any) => matcher.refs.includes(String(ref || ''))));
  if (byRef) return byRef;
  return rows.find((item: any) => {
    const label = normalizeTraceLabel(item?.label || item?.requirement);
    return matcher.labels.some(expected => label === normalizeTraceLabel(expected));
  });
}

function normalizeTraceLabel(value: any): string {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function hasReportBlock(bundle: any, type: string): boolean {
  return asList(bundle?.analysis_document?.sections)
    .some((section: any) => asList(section?.blocks)
      .some((block: any) => String(block?.type || '').toLowerCase() === type));
}

function hasEvidenceBackedReportBlock(bundle: any, type: string): boolean {
  return asList(bundle?.analysis_document?.sections)
    .some((section: any) => asList(section?.blocks)
      .some((block: any) => String(block?.type || '').toLowerCase() === type && hasEvidence(block)));
}

function hasEvidenceBackedItems(bundle: any, key: string): boolean {
  return asList(bundle?.[key]).some((item: any) => hasEvidence(item));
}

function hasDirectEvidence(value: any): boolean {
  return asList(value?.evidence).length > 0 || asList(value?.evidence_refs).length > 0;
}

function hasEvidence(value: any): boolean {
  if (!value) return false;
  if (Array.isArray(value)) return value.some(item => hasEvidence(item));
  if (typeof value !== 'object') return false;
  if (hasDirectEvidence(value)) return true;
  return Object.keys(value).some(key => !isNonSupportEvidenceKey(key) && hasEvidence(value[key]));
}

function traceCoveredWithEvidence(bundle: any, needle: string, statuses = ['covered']): boolean {
  const row = traceRow(bundle, needle);
  return statuses.includes(String(row?.status || '').toLowerCase()) && hasDirectEvidence(row);
}

function evidenceBackedExamples(bundle: any): any[] {
  const interfaces = asList(bundle?.interfaces).flatMap((item: any) => asList(item?.examples));
  const flows = asList(bundle?.flows).flatMap((item: any) => asList(item?.examples));
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

function hasProcessEvidence(bundle: any): boolean {
  if (traceCoveredWithEvidence(bundle, 'process', ['covered', 'partial'])) return true;
  const process = bundle?.process;
  if (!process || typeof process !== 'object') return false;
  return hasEvidence(process);
}

function textFields(value: any, fields: string[]): string {
  return fields.map(field => String(value?.[field] || '').toLowerCase()).join(' ');
}

function hasExplicitSecurityEvidence(value: any): boolean {
  if (!value) return false;
  if (Array.isArray(value)) return value.some(item => hasExplicitSecurityEvidence(item));
  if (typeof value !== 'object') return false;
  if (hasDirectEvidence(value)) {
    const classifierText = textFields(value, ['category', 'kind', 'type', 'area', 'dimension', 'intent']);
    const statementText = textFields(value, ['title', 'summary', 'description', 'reason', 'recommendation', 'status', 'verdict']);
    const allText = `${classifierText} ${statementText}`;
    const securityClass = /\b(security|vulnerability|vulnerabilities|vulnerable|cve|sast)\b/.test(classifierText);
    const securityRiskStatement = /\b(security|vulnerability|vulnerabilities|vulnerable|cve|injection|xss|csrf|secret|secrets|credential|credentials)\b/.test(allText);
    const authRiskStatement = /\b(authentication|authorization|authn|authz)\b/.test(allText)
      && /\b(risk|gap|missing|weak|bypass|exposure|vulnerability|vulnerable|security|unauthorized|finding|findings)\b/.test(allText);
    if (securityClass || securityRiskStatement || authRiskStatement) return true;
  }
  return Object.keys(value).some(key => !isNonSupportEvidenceKey(key) && hasExplicitSecurityEvidence(value[key]));
}

function isNonSupportEvidenceKey(key: string): boolean {
  return key === 'evidence' || key === 'evidence_refs' || UNCERTAINTY_EVIDENCE_KEYS.has(key);
}

function hasExplicitSecurityCoverage(bundle: any): boolean {
  return traceCoveredWithEvidence(bundle, 'security', ['covered', 'partial'])
    || hasExplicitSecurityEvidence(bundle?.quality)
    || hasExplicitSecurityEvidence(bundle?.findings)
    || hasExplicitSecurityEvidence(bundle?.analysis_document?.sections);
}

function hasQualityEvidence(bundle: any): boolean {
  return traceCoveredWithEvidence(bundle, 'code', ['covered', 'partial'])
    && (hasEvidence(bundle?.quality) || hasEvidenceBackedItems(bundle, 'findings'));
}

function unsupportedMajorClaimCount(bundle: any): number {
  return asList(bundle?.analysis_document_evidence_strength?.unsupported_major_claims).length;
}

function check(id: string, label: string, ready: boolean, evidence: string, missing: string): ProductReadinessCheck {
  return ready ? { id, label, ready, evidence } : { id, label, ready, evidence, missing };
}

export function computeProductReadiness(
  repo: string,
  analysis: string,
  bundle: any | null,
  marketProof: ProductReadinessMarketProof
): any {
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
    && asList(bundle?.evidence_index).filter((item: any) => item?.valid === false).length === 0;
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
    check('evidence_backed', 'Visible claims are evidence-backed', evidenceReady, `unsupported=${Number(bundle?.analysis_document_report_lint?.unsupported_claim_count || 0)}, unsupported_major=${unsupportedMajorClaimCount(bundle)}, invalid_evidence=${asList(bundle?.evidence_index).filter((item: any) => item?.valid === false).length}`, 'Resolve unsupported claims and invalid evidence references.'),
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
    writeJson(Path.join(analysis, 'data', 'product-readiness.json'), result);
  } catch {
    // Eval should still be printable on read-only or missing workspaces.
  }
  return result;
}

export function productReadinessBrief(readiness: any): string[] {
  return [
    `- Verdict: ${readiness.verdict}`,
    `- Core ideas covered: ${readiness.core_ideas_covered}`,
    `- Core features implemented: ${readiness.core_features_implemented}`,
    `- Perfectly simplified: ${readiness.perfectly_simplified}`,
    `- Missing checks: ${readiness.missing.length}`,
    `- Next best action: ${readiness.next_best_action}`
  ];
}

type ProductReadinessV2State =
  | 'not_started'
  | 'inventory_ready'
  | 'workpacks_ready'
  | 'shards_partial'
  | 'analysis_ready'
  | 'report_ready'
  | 'stale'
  | 'invalid';

function v2Check(id: string, label: string, ready: boolean, evidence: string, next_action: string): any {
  return { id, label, ready, evidence, ...(ready ? {} : { next_action }) };
}

function hasText(value: any): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasItems(value: any): boolean {
  return Array.isArray(value) && value.length > 0;
}

function openQuestionsStructured(value: any): boolean {
  if (!Array.isArray(value)) return false;
  return value.every((item: any) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    if (!hasText(item.id) || !hasText(item.question) || !hasText(item.reason) || !hasText(item.impact) || typeof item.blocking !== 'boolean') return false;
    return hasDirectEvidence(item) || hasText(item.evidence_gap) || hasText(item.missing_evidence) || hasText(item.proof_gap);
  });
}

function reportQualityValid(analysis: any): boolean {
  const review = analysis?.report_quality_review;
  if (!review || typeof review !== 'object') return false;
  const verdict = String(review.verdict || '');
  if (!['decision_ready', 'partial', 'not_ready'].includes(verdict)) return false;
  const blockingGaps = utilAsList(review.blocking_gaps);
  const blockingOpenQuestions = utilAsList(analysis?.open_questions).filter((item: any) => item?.blocking === true);
  return !(verdict === 'decision_ready' && (blockingGaps.length > 0 || blockingOpenQuestions.length > 0));
}

function determineV2State(checks: any[], bundle: any | null): ProductReadinessV2State {
  if (!bundle) return 'not_started';
  if (bundle.analysis_staleness?.stale === true) return 'stale';
  const byId = new Map(checks.map(check => [check.id, check]));
  if (byId.get('analysis_json_exists')?.ready && (!byId.get('analysis_json_valid')?.ready || !byId.get('evidence_validated')?.ready || !byId.get('major_claims_supported_or_gapped')?.ready)) return 'invalid';
  if (byId.get('analysis_json_exists')?.ready
    && String(bundle?.analysis?.report_quality_review?.verdict || '') === 'decision_ready'
    && byId.get('report_quality_review_present')?.ready !== true) return 'invalid';
  if (checks.every(check => check.ready === true)) return 'report_ready';
  if (byId.get('analysis_json_valid')?.ready) return 'analysis_ready';
  if ((bundle.synthesis_input?.shards_present || []).length > 0) return 'shards_partial';
  if (byId.get('workpacks_exist')?.ready) return 'workpacks_ready';
  if (byId.get('inventory_exists')?.ready) return 'inventory_ready';
  return 'not_started';
}

export function computeProductReadinessV2(repo: string, analysis: string, bundle: any | null): any {
  const inventoryExists = FS.existsSync(Path.join(analysis, 'inventory.json')) && bundle?.inventory?.schema_version === '2.0';
  const workpacks = utilAsList(bundle?.workpack_manifest?.workpacks || bundle?.task_manifest?.workpacks);
  const workpacksExist = FS.existsSync(Path.join(analysis, 'workpack-manifest.json')) && workpacks.length > 0;
  const analysisExists = FS.existsSync(Path.join(analysis, 'analysis.json'));
  const analysisValid = bundle?.analysis_contract?.source === 'analysis-v2' && bundle?.analysis_contract?.valid === true;
  const evidenceValidation = bundle?.analysis_evidence_validation || {};
  const evidenceValidated = !analysisExists || (analysisValid && evidenceValidation.invalid_evidence?.length === 0);
  const unsupportedCount = utilAsList(evidenceValidation.unsupported_claims).length;
  const reportArtifacts = bundle?.report_artifacts || {};
  const analysisDoc = bundle?.analysis || {};
  const qualityOrRisk = hasItems(analysisDoc?.code_quality_security?.bugs)
    || hasItems(analysisDoc?.code_quality_security?.vulnerabilities)
    || hasItems(analysisDoc?.code_quality_security?.code_quality_findings)
    || hasItems(analysisDoc?.executive_decision?.top_risks)
    || hasItems(analysisDoc?.process_analysis?.delivery_risks);
  const refactoringOrNext = hasItems(analysisDoc?.refactoring?.target_architecture_options)
    || hasItems(analysisDoc?.refactoring?.migration_roadmap)
    || hasItems(analysisDoc?.refactoring?.quick_wins)
    || hasItems(analysisDoc?.executive_decision?.next_steps);
  const checks = [
    v2Check('inventory_exists', 'Inventory prepared', inventoryExists, String(bundle?.inventory?.schema_version || 'missing'), `Run cognianalysis analyze ${repo}`),
    v2Check('workpacks_exist', 'Workpacks prepared', workpacksExist, `workpacks=${workpacks.length}`, `Run cognianalysis analyze ${repo}`),
    v2Check('analysis_json_exists', 'LLM-authored analysis.json present', analysisExists, analysisExists ? 'analysis.json' : 'missing', 'Open .analysis/TASK.md in your agent harness and write .analysis/analysis.json.'),
    v2Check('analysis_json_valid', 'analysis.json contract valid', analysisValid, `source=${bundle?.analysis_contract?.source || 'missing'}, valid=${bundle?.analysis_contract?.valid === true}`, 'Fix .analysis/analysis.json against schemas/analysis-v2.schema.json.'),
    v2Check('evidence_validated', 'Evidence references valid', evidenceValidated, `invalid=${utilAsList(evidenceValidation.invalid_evidence).length}`, 'Fix invalid evidence path:line references.'),
    v2Check('major_claims_supported_or_gapped', 'Major claims supported or explicitly gapped', analysisExists && unsupportedCount === 0, `unsupported=${unsupportedCount}`, 'Add file:line evidence, evidence_gap or open questions for unsupported major claims.'),
    v2Check('executive_decision_present', 'Executive decision present', hasText(analysisDoc?.executive_decision?.summary) && hasText(analysisDoc?.executive_decision?.recommended_action), 'summary/action', 'Complete executive_decision.summary and recommended_action.'),
    v2Check('functional_view_present', 'Functional view present', hasText(analysisDoc?.functional_view?.system_purpose) || hasItems(analysisDoc?.functional_view?.capabilities) || hasItems(analysisDoc?.functional_view?.user_or_system_flows), 'functional_view', 'Complete functional_view with purpose, capabilities or flows.'),
    v2Check('technical_view_present', 'Technical view present', hasText(analysisDoc?.technical_view?.architecture_summary) || hasItems(analysisDoc?.technical_view?.entrypoints) || hasItems(analysisDoc?.technical_view?.apis_and_interfaces), 'technical_view', 'Complete technical_view with architecture, entrypoints or interfaces.'),
    v2Check('quality_or_risk_view_present', 'Quality/risk view present', qualityOrRisk, 'quality/security/risk', 'Add code_quality_security findings, executive top risks or explicit evidence-backed no-finding statements.'),
    v2Check('refactoring_or_next_steps_present', 'Refactoring or next steps present', refactoringOrNext, 'refactoring/next_steps', 'Add refactoring roadmap, target architecture options, quick wins or next steps.'),
    v2Check('open_questions_structured', 'Open questions structured', Array.isArray(analysisDoc?.open_questions) && openQuestionsStructured(analysisDoc.open_questions), `open_questions=${utilAsList(analysisDoc?.open_questions).length}`, 'Use structured open_questions[]; use [] only when no proof gaps remain.'),
    v2Check('report_quality_review_present', 'Report quality self-review present', reportQualityValid(analysisDoc), String(analysisDoc?.report_quality_review?.verdict || 'missing'), 'Add report_quality_review with valid verdict, rationale, gaps and confidence.'),
    v2Check('report_rendered', 'Report rendered', reportArtifacts.index_html === true && reportArtifacts.analysis_data_json === true, `index=${reportArtifacts.index_html === true}, data=${reportArtifacts.analysis_data_json === true}`, `Run cognianalysis analyze ${repo} after analysis.json exists.`),
    v2Check('staleness_checked', 'Staleness checked', !!bundle?.analysis_staleness && bundle.analysis_staleness.stale !== true, bundle?.analysis_staleness?.summary || 'missing', `Rerun cognianalysis analyze ${repo} after repository changes.`)
  ];
  const missing = checks.filter(check => !check.ready);
  const state = determineV2State(checks, bundle);
  const readiness = {
    schema_version: '2.0',
    contract_kind: 'product_readiness_v2',
    state,
    ready: state === 'report_ready',
    invalid: state === 'invalid',
    mode: String(bundle?.product_analysis_request?.mode || 'brief'),
    checks,
    missing,
    next_action: missing[0]?.next_action || `Run cognianalysis open ${repo}`,
    audit_only_checks: [
      'source_tier_coverage',
      'skill_workbench_coverage',
      'detail_review_coverage',
      'artifact_dependency_graph',
      'parallel_execution_proof',
      'cache_reuse_proof',
      'run_provenance',
      'semantic_lineage'
    ]
  };
  try {
    writeJson(Path.join(analysis, 'data', 'product-readiness-v2.json'), readiness);
    writeJson(Path.join(analysis, 'data', 'product-readiness.json'), readiness);
  } catch {
    // Status/eval should still print on read-only or missing workspaces.
  }
  return readiness;
}

export function productReadinessV2Brief(readiness: any): string[] {
  return [
    `- State: ${readiness?.state || 'not_started'}`,
    `- Ready: ${readiness?.ready === true ? 'yes' : 'no'}`,
    `- Missing checks: ${utilAsList(readiness?.missing).length}`,
    `- Next action: ${readiness?.next_action || 'Run cognianalysis analyze .'}`
  ];
}

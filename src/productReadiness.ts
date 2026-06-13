import { FS, Path, asList as utilAsList, writeJson } from './utils';

function hasDirectEvidence(value: any): boolean {
  return utilAsList(value?.evidence).length > 0 || utilAsList(value?.evidence_refs).length > 0;
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

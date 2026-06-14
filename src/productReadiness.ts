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

function hasDetailedText(value: any): boolean {
  if (!hasText(value)) return false;
  const text = value.trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  return text.length >= 120 || words >= 18;
}

function hasItems(value: any): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasAnyItems(...values: any[]): boolean {
  return values.some(hasItems);
}

function itemText(value: any): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  return [
    value.narrative,
    value.summary,
    value.description,
    value.rationale,
    value.recommendation,
    value.outcome,
    value.trigger,
    value.rule
  ].find(hasText) || '';
}

function hasDetailedItem(items: any): boolean {
  return utilAsList(items).some((item: any) => hasDetailedText(itemText(item)));
}

function mermaidSource(value: any): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  return String(value.source || value.mermaid || '').trim();
}

function hasE2eFlow(value: any): boolean {
  return utilAsList(value).some((flow: any) => {
    const text = itemText(flow);
    return hasText(text)
      && (hasItems(flow?.steps) || hasText(mermaidSource(flow?.mermaid || flow?.source)));
  });
}

function qualityCheckCovered(value: any): boolean {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  return value.trim().toLowerCase() === 'covered';
}

const REQUIRED_DEPTH_QUALITY_CHECKS = [
  'stakeholder_report_style',
  'clear_reader_categories',
  'freeform_llm_authored_report',
  'consulting_grade_narrative',
  'reader_comprehension_review',
  'concrete_examples_and_implications',
  'jargon_and_domain_terms_explained',
  'human_readable_layered_report',
  'detailed_textual_explanations',
  'whole_e2e_flow_explained',
  'business_processes_explained',
  'api_contracts_and_examples_visible',
  'technical_drilldown_visible',
  'graphs_and_flows_visible',
  'four_layers_explained',
  'functional_and_technical_views_explained',
  'core_capability_coverage_model',
  'whole_file_coverage_reflected'
];

const REQUIRED_CORE_CAPABILITY_IDS = [
  'reverse_engineering_documentation',
  'code_analysis',
  'process_analysis',
  'refactoring_target_architecture'
];

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
  if (!hasText(review.rationale) && !hasText(review.summary)) return false;
  if (!hasText(review.confidence)) return false;
  const blockingGaps = utilAsList(review.blocking_gaps);
  const blockingOpenQuestions = utilAsList(analysis?.open_questions).filter((item: any) => item?.blocking === true);
  return !(verdict === 'decision_ready' && (blockingGaps.length > 0 || blockingOpenQuestions.length > 0));
}

function reportQualityDecisionReady(analysis: any): boolean {
  const review = analysis?.report_quality_review;
  if (!reportQualityValid(analysis)) return false;
  if (String(review?.verdict || '') !== 'decision_ready') return false;
  const blockingGaps = utilAsList(review?.blocking_gaps);
  const blockingOpenQuestions = utilAsList(analysis?.open_questions).filter((item: any) => item?.blocking === true);
  return blockingGaps.length === 0 && blockingOpenQuestions.length === 0;
}

function reportQualityDecisionReadyEvidence(analysis: any): string {
  const review = analysis?.report_quality_review || {};
  const blockingGaps = utilAsList(review?.blocking_gaps);
  const blockingOpenQuestions = utilAsList(analysis?.open_questions).filter((item: any) => item?.blocking === true);
  return `verdict=${String(review.verdict || 'missing')}, blocking_gaps=${blockingGaps.length}, blocking_open_questions=${blockingOpenQuestions.length}`;
}

function reportQualityDepthChecksCovered(analysis: any): boolean {
  const checks = analysis?.report_quality_review?.checks || {};
  return REQUIRED_DEPTH_QUALITY_CHECKS.every(id => qualityCheckCovered(checks?.[id]));
}

function reportBlocks(analysis: any): any[] {
  const sections = utilAsList(analysis?.report_sections).length
    ? utilAsList(analysis?.report_sections)
    : utilAsList(analysis?.sections);
  return sections.flatMap((section: any) => utilAsList(section?.blocks));
}

function blockText(block: any): string {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return '';
  const parts = [
    block.text,
    block.paragraphs,
    block.summary,
    block.description,
    block.plain_language,
    block.what_happens,
    block.business_context,
    block.why_it_matters,
    block.technical_detail,
    block.technical_drilldown,
    block.operational_impact,
    block.thesis_impact_summary
  ];
  return parts.flatMap(part => Array.isArray(part) ? part : [part])
    .filter(hasText)
    .join(' ');
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function humanReadableLayeredReportComplete(analysis: any): boolean {
  const blocks = reportBlocks(analysis);
  const layered = blocks.filter((block: any) => String(block?.type || '').toLowerCase() === 'layered_explanation');
  const authoredWords = blocks.reduce((sum: number, block: any) => sum + wordCount(blockText(block)), 0);
  return layered.length >= 3 && authoredWords >= 900;
}

function apiContractsAndExamplesVisible(analysis: any): boolean {
  const blocks = reportBlocks(analysis);
  const apiBlocks = blocks.filter((block: any) => String(block?.type || '').toLowerCase() === 'api_contracts');
  const exampleBlocks = blocks.filter((block: any) => String(block?.type || '').toLowerCase() === 'request_response_examples');
  const apiRows = apiBlocks.flatMap((block: any) => utilAsList(block?.apis || block?.items || block?.contracts));
  const exampleRows = exampleBlocks.flatMap((block: any) => utilAsList(block?.examples || block?.items));
  const contractReady = apiRows.some((row: any) =>
    hasText(row?.name || row?.title || row?.path || row?.endpoint)
    && (hasText(row?.purpose || row?.description) || utilAsList(row?.request_fields).length || utilAsList(row?.response_fields).length)
  );
  const examplesReady = exampleRows.some((row: any) =>
    hasText(row?.title || row?.name || row?.scenario || row?.endpoint)
    && hasText(row?.example_origin || row?.origin)
    && (row?.request !== undefined || row?.response !== undefined)
  );
  return contractReady && examplesReady;
}

function technicalDrilldownVisible(analysis: any): boolean {
  const blocks = reportBlocks(analysis);
  return blocks.some((block: any) => ['api_contracts', 'request_response_examples', 'technical_drilldown', 'boundary_map', 'source_family_map'].includes(String(block?.type || '').toLowerCase()));
}

function graphsAndFlowsVisible(analysis: any): boolean {
  const blocks = reportBlocks(analysis);
  const diagramBlocks = blocks.filter((block: any) => {
    const type = String(block?.type || '').toLowerCase();
    return type === 'flow' && hasText(mermaidSource(block?.mermaid || block?.source));
  });
  return diagramBlocks.length >= 2;
}

function normalizedCapabilityId(value: any): string {
  const id = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (id === 'reverse_engineering' || id === 'documentation' || id === 'reverse_engineering_and_documentation') return 'reverse_engineering_documentation';
  if (id === 'process' || id === 'business_process_analysis') return 'process_analysis';
  if (id === 'refactoring' || id === 'modernization' || id === 'refactoring_modernization' || id === 'target_architecture') return 'refactoring_target_architecture';
  return id;
}

function coverageStatusCovered(value: any): boolean {
  return ['covered', 'complete', 'ready', 'decision_ready'].includes(String(value || '').trim().toLowerCase());
}

function capabilityCoverageRows(analysis: any): any[] {
  return utilAsList(analysis?.core_capability_coverage || analysis?.capability_coverage || analysis?.four_core_capabilities);
}

function coreCapabilityCoverageModelComplete(analysis: any): boolean {
  const rows = capabilityCoverageRows(analysis);
  if (!rows.length) return false;
  const byId = new Map<string, any>();
  rows.forEach((row: any) => byId.set(normalizedCapabilityId(row?.capability_id || row?.id || row?.level || row?.label), row));
  return REQUIRED_CORE_CAPABILITY_IDS.every(id => {
    const row = byId.get(id);
    return row
      && coverageStatusCovered(row.status || row.coverage || row.verdict)
      && hasDetailedText(row.summary || row.description || row.thesis_impact)
      && utilAsList(row.covered_by_sections).length > 0;
  });
}

function numericField(value: any, keys: string[]): number | null {
  for (const key of keys) {
    const raw = value?.[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const num = Number(raw);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function wholeFileThesisTrace(analysis: any): any {
  return analysis?.whole_file_thesis_trace || analysis?.whole_repository_file_accounting || analysis?.source_coverage_trace || null;
}

function wholeFileThesisTraceComplete(analysis: any, bundle: any | null): boolean {
  const trace = wholeFileThesisTrace(analysis);
  if (!trace || typeof trace !== 'object' || Array.isArray(trace)) return false;
  const included = numericField(trace, ['included_files', 'total_files', 'file_count']);
  const cards = numericField(trace, ['tier1_file_cards', 'file_cards', 'covered_files']);
  const missing = numericField(trace, ['missing_tier1_file_cards', 'missing_files', 'missing']);
  const impacts = utilAsList(trace.source_family_impacts || trace.families || trace.impacts);
  const sourceCoverage = bundle?.source_tier_coverage || {};
  const expectedTotal = Number(sourceCoverage.total_files || 0);
  const expectedCards = Number(sourceCoverage.tier1_file_cards || 0);
  if (included === null || cards === null || missing === null || missing !== 0) return false;
  const auditCountsOk = sourceCoverage.complete !== true
    || ((expectedTotal === 0 || included >= expectedTotal) && (expectedCards === 0 || cards >= expectedCards));
  return auditCountsOk
    && hasDetailedText(trace.thesis_impact_summary || trace.summary || trace.description)
    && impacts.length > 0;
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
  const workpacks = utilAsList(bundle?.workpack_manifest?.workpacks)
    .concat(utilAsList(bundle?.task_manifest?.workpacks))
    .concat(utilAsList(bundle?.task_manifest?.tasks))
    .concat(utilAsList(bundle?.analysis_pipeline?.tasks))
    .concat(utilAsList(bundle?.tasks))
    .concat(utilAsList(bundle?.skill_workbench_task_manifest?.tasks))
    .concat(utilAsList(bundle?.detail_task_manifest?.tasks))
    .concat(utilAsList(bundle?.source_tier_task_manifest?.tasks));
  const workpacksExist = (
    FS.existsSync(Path.join(analysis, 'workpack-manifest.json'))
    || FS.existsSync(Path.join(analysis, 'task-manifest.json'))
    || FS.existsSync(Path.join(analysis, 'analysis-pipeline.json'))
  ) && workpacks.length > 0;
  const analysisExists = FS.existsSync(Path.join(analysis, 'analysis.json'));
  const analysisValid = bundle?.analysis_contract?.source === 'analysis-v2' && bundle?.analysis_contract?.valid === true;
  const evidenceValidation = bundle?.analysis_evidence_validation || {};
  const evidenceValidated = !analysisExists || (analysisValid && evidenceValidation.invalid_evidence?.length === 0);
  const unsupportedCount = utilAsList(evidenceValidation.unsupported_claims).length;
  const reportArtifacts = bundle?.report_artifacts || {};
  const analysisDoc = bundle?.analysis || {};
  const productMode = String(bundle?.product_analysis_request?.mode || analysisDoc?.mode || '').toLowerCase();
  const completeAuditMode = productMode === 'complete-audit' || productMode === 'complete';
  const functionalView = analysisDoc?.functional_view || {};
  const technicalView = analysisDoc?.technical_view || {};
  const codeQuality = analysisDoc?.code_quality_security || {};
  const processAnalysis = analysisDoc?.process_analysis || {};
  const refactoring = analysisDoc?.refactoring || {};
  const qualityOrRisk = hasItems(analysisDoc?.code_quality_security?.bugs)
    || hasItems(analysisDoc?.code_quality_security?.vulnerabilities)
    || hasItems(analysisDoc?.code_quality_security?.code_quality_findings)
    || hasItems(analysisDoc?.executive_decision?.top_risks)
    || hasItems(analysisDoc?.process_analysis?.delivery_risks);
  const refactoringOrNext = hasItems(analysisDoc?.refactoring?.target_architecture_options)
    || hasItems(analysisDoc?.refactoring?.migration_roadmap)
    || hasItems(analysisDoc?.refactoring?.quick_wins)
    || hasItems(analysisDoc?.executive_decision?.next_steps);
  const functionalComplete = hasText(functionalView.system_purpose)
    && hasAnyItems(functionalView.capabilities, functionalView.actors)
    && hasAnyItems(functionalView.user_or_system_flows, functionalView.e2e_flows)
    && hasAnyItems(functionalView.business_processes, functionalView.business_rules, functionalView.e2e_flows);
  const technicalComplete = hasText(technicalView.architecture_summary)
    && hasAnyItems(technicalView.entrypoints, technicalView.apis_and_interfaces)
    && hasAnyItems(technicalView.data_and_state, technicalView.data_flows)
    && hasAnyItems(technicalView.integrations, technicalView.dependencies, technicalView.technology_stack, technicalView.deployment_runtime);
  const codeAnalysisComplete = hasAnyItems(codeQuality.bugs, codeQuality.vulnerabilities, codeQuality.code_quality_findings, codeQuality.scanner_findings_imported);
  const businessProcessComplete = hasAnyItems(functionalView.business_processes, processAnalysis.implemented_business_processes, processAnalysis.process_flows);
  const e2eFlowComplete = hasE2eFlow(functionalView.e2e_flows)
    || hasE2eFlow(functionalView.user_or_system_flows)
    || hasE2eFlow(processAnalysis.process_flows);
  const processComplete = hasText(processAnalysis.test_readiness)
    && businessProcessComplete
    && hasAnyItems(processAnalysis.optimization_opportunities, processAnalysis.process_improvements, processAnalysis.workflow_inefficiencies, processAnalysis.delivery_risks, processAnalysis.observability, processAnalysis.documentation_gaps);
  const refactoringComplete = hasAnyItems(refactoring.target_architecture_options, refactoring.migration_roadmap, refactoring.tech_stack_options, refactoring.quick_wins);
  const detailedTextComplete = hasDetailedText(analysisDoc?.executive_decision?.summary)
    && hasDetailedText(functionalView.system_purpose)
    && hasDetailedText(technicalView.architecture_summary)
    && (hasDetailedText(processAnalysis.test_readiness) || hasDetailedItem(processAnalysis.implemented_business_processes) || hasDetailedItem(processAnalysis.process_flows))
    && (hasDetailedItem(refactoring.target_architecture_options) || hasDetailedItem(refactoring.migration_roadmap) || hasDetailedItem(refactoring.quick_wins));
  const humanLayeredReportComplete = humanReadableLayeredReportComplete(analysisDoc);
  const apiExamplesComplete = apiContractsAndExamplesVisible(analysisDoc);
  const technicalDrilldownComplete = technicalDrilldownVisible(analysisDoc);
  const graphsVisible = graphsAndFlowsVisible(analysisDoc);
  const fourCoreCapabilitiesComplete = functionalComplete && codeAnalysisComplete && processComplete && refactoringComplete;
  const coreCapabilityCoverageComplete = coreCapabilityCoverageModelComplete(analysisDoc);
  const wholeFileTraceComplete = wholeFileThesisTraceComplete(analysisDoc, bundle);
  const auditSourceTierComplete = !completeAuditMode || bundle?.source_tier_coverage?.complete === true;
  const auditSkillWorkbenchComplete = !completeAuditMode || bundle?.skill_workbench_coverage?.complete === true;
  const auditDetailReviewsComplete = !completeAuditMode || bundle?.source_family_detail_review_coverage?.complete === true;
  const auditRequirementsTraceComplete = !completeAuditMode || bundle?.analysis_document_requirements_trace_contract?.complete === true;
  const auditGoalTraceComplete = !completeAuditMode || bundle?.analysis_goal_trace_alignment?.complete === true;
  const auditQualityReviewComplete = !completeAuditMode || (
    bundle?.analysis_document_quality_review?.complete === true
    && bundle?.analysis_document_quality_review?.verdict_is_decision_ready === true
  );
  const auditConsistencyComplete = !completeAuditMode || bundle?.analysis_document_consistency_review?.complete === true;
  const auditSemanticLineageComplete = !completeAuditMode || bundle?.analysis_document_semantic_lineage?.complete === true;
  const auditReportModeReady = !completeAuditMode || bundle?.report_mode?.final_synthesis_ready === true;
  const auditArtifactGraphComplete = !completeAuditMode || bundle?.artifact_dependency_graph?.complete === true;
  const checks = [
    v2Check('inventory_exists', 'Inventory prepared', inventoryExists, String(bundle?.inventory?.schema_version || 'missing'), `Run cognianalysis analyze ${repo}`),
    v2Check('workpacks_exist', 'Workpacks prepared', workpacksExist, `workpacks=${workpacks.length}`, `Run cognianalysis analyze ${repo}`),
    v2Check('analysis_json_exists', 'LLM-authored analysis.json present', analysisExists, analysisExists ? 'analysis.json' : 'missing', 'Open .analysis/TASK.md in your agent harness and write .analysis/analysis.json.'),
    v2Check('analysis_json_valid', 'analysis.json contract valid', analysisValid, `source=${bundle?.analysis_contract?.source || 'missing'}, valid=${bundle?.analysis_contract?.valid === true}`, 'Fix .analysis/analysis.json against schemas/analysis-v2.schema.json.'),
    v2Check('evidence_validated', 'Evidence references valid', evidenceValidated, `invalid=${utilAsList(evidenceValidation.invalid_evidence).length}`, 'Fix invalid evidence path:line references.'),
    v2Check('major_claims_supported_or_gapped', 'Major claims supported or explicitly gapped', analysisExists && unsupportedCount === 0, `unsupported=${unsupportedCount}`, 'Add file:line evidence, evidence_gap or open questions for unsupported major claims.'),
    v2Check('executive_decision_present', 'Executive decision present', hasText(analysisDoc?.executive_decision?.summary) && hasText(analysisDoc?.executive_decision?.recommended_action), 'summary/action', 'Complete executive_decision.summary and recommended_action.'),
    v2Check('functional_view_complete', 'Functional view covers capabilities, workflows, rules and E2E material', functionalComplete, 'functional_view', 'Complete functional_view with purpose, actors/capabilities, workflows/E2E flows and business rules/process logic.'),
    v2Check('technical_view_complete', 'Technical view covers architecture, interfaces, data flows and dependencies', technicalComplete, 'technical_view', 'Complete technical_view with architecture, entrypoints/interfaces, data/state or data flows, integrations/dependencies/technology stack.'),
    v2Check('quality_or_risk_view_present', 'Quality/risk view present', qualityOrRisk, 'quality/security/risk', 'Add code_quality_security findings, executive top risks or explicit evidence-backed no-finding statements.'),
    v2Check('code_analysis_complete', 'Code analysis covers bugs, vulnerabilities or quality findings', codeAnalysisComplete, 'code_quality_security', 'Add code_quality_security bugs, vulnerabilities, maintainability findings, scanner imports or explicit evidence-backed quality findings.'),
    v2Check('process_analysis_complete', 'Process analysis covers implemented workflows and improvements', processComplete, 'process_analysis', 'Complete process_analysis with test/readiness, implemented business processes or process flows, and optimization/improvement opportunities.'),
    v2Check('refactoring_or_next_steps_present', 'Refactoring or next steps present', refactoringOrNext, 'refactoring/next_steps', 'Add refactoring roadmap, target architecture options, quick wins or next steps.'),
    v2Check('refactoring_modernization_complete', 'Refactoring and modernization view complete', refactoringComplete, 'refactoring', 'Add target architecture options, migration roadmap, technology stack options or quick wins.'),
    v2Check('detailed_textual_explanations_present', 'Detailed textual explanations present', detailedTextComplete, 'narrative-depth-fields', 'Expand executive, functional, technical, process and refactoring explanations beyond labels or short bullets.'),
    v2Check('human_readable_layered_report_present', 'Human-readable layered report narrative present', humanLayeredReportComplete, 'layered_explanation blocks and narrative word depth', 'Add layered_explanation blocks that explain the system in plain language first, with technical detail and evidence underneath.'),
    v2Check('whole_e2e_flow_present', 'Whole E2E flow explained with steps or Mermaid', e2eFlowComplete, 'functional_view.e2e_flows/process_analysis.process_flows', 'Add at least one source-backed E2E flow with narrative plus steps or Mermaid.'),
    v2Check('business_processes_present', 'Business process descriptions present', businessProcessComplete, 'business_processes/process_flows', 'Add implemented business process or workflow descriptions with trigger, decisions and outcome.'),
    v2Check('api_contracts_and_examples_present', 'API contracts and request/response examples visible', apiExamplesComplete, 'api_contracts + request_response_examples blocks', 'Add visible API/interface contracts and request/response examples, marking inferred examples with example_origin="inferred".'),
    v2Check('technical_drilldown_visible', 'Technical drilldown visible under human narrative', technicalDrilldownComplete, 'technical component blocks', 'Add API contracts, request/response examples, boundary map, source-family map or technical drilldown blocks.'),
    v2Check('graphs_and_flows_visible', 'Graphs and flow diagrams visible', graphsVisible, 'flow Mermaid blocks >= 2', 'Add at least two visible Mermaid flow/architecture/process diagrams when source evidence supports them.'),
    v2Check('four_core_capabilities_complete', 'Four core capabilities structurally covered', fourCoreCapabilitiesComplete, 'functional+code+process+refactoring', 'Cover reverse engineering/documentation, code analysis, process analysis and refactoring/modernization in analysis.json.'),
    v2Check('core_capability_coverage_model_present', 'LLM-authored four-core-capability coverage model present', coreCapabilityCoverageComplete, `rows=${capabilityCoverageRows(analysisDoc).length}/${REQUIRED_CORE_CAPABILITY_IDS.length}`, 'Author core_capability_coverage[] with all four core capabilities, covered status, detailed summary and covered_by_sections links.'),
    v2Check('whole_file_thesis_trace_present', 'LLM-authored whole-file thesis trace present', wholeFileTraceComplete, wholeFileThesisTrace(analysisDoc) ? 'present' : 'missing', 'Author whole_file_thesis_trace with included files, Tier 1 file cards, zero missing cards, task completion and source-family thesis impact.'),
    v2Check('open_questions_structured', 'Open questions structured', Array.isArray(analysisDoc?.open_questions) && openQuestionsStructured(analysisDoc.open_questions), `open_questions=${utilAsList(analysisDoc?.open_questions).length}`, 'Use structured open_questions[]; use [] only when no proof gaps remain.'),
    v2Check('report_quality_review_present', 'Report quality self-review present', reportQualityValid(analysisDoc), String(analysisDoc?.report_quality_review?.verdict || 'missing'), 'Add report_quality_review with valid verdict, rationale, gaps and confidence.'),
    v2Check('report_quality_decision_ready', 'Report quality verdict is decision-ready with no blocking gaps', reportQualityDecisionReady(analysisDoc), reportQualityDecisionReadyEvidence(analysisDoc), 'Resolve blocking gaps/open questions or keep the report not ready; only verdict=decision_ready with no blocking gaps can be done.'),
    v2Check('report_quality_depth_checks_covered', 'Report self-review covers depth checks', reportQualityDepthChecksCovered(analysisDoc), REQUIRED_DEPTH_QUALITY_CHECKS.join(','), `Set report_quality_review.checks for ${REQUIRED_DEPTH_QUALITY_CHECKS.join(', ')} to covered only when the LLM-authored report actually covers them.`),
    v2Check('complete_audit_source_tier_coverage_complete', 'Complete-audit Tier 1 whole-repo file-card coverage complete', auditSourceTierComplete, `mode=${productMode || 'missing'}, complete=${bundle?.source_tier_coverage?.complete === true}, cards=${Number(bundle?.source_tier_coverage?.tier1_file_cards || 0)}/${Number(bundle?.source_tier_coverage?.total_files || 0)}`, `Run cognianalysis dev tier-next ${repo} --limit 1, complete every Tier 1 source-tier workpack, then rerun analyze/eval.`),
    v2Check('complete_audit_skill_workbench_complete', 'Complete-audit planned skill workbenches complete', auditSkillWorkbenchComplete, `mode=${productMode || 'missing'}, status=${String(bundle?.skill_workbench_coverage?.status || 'missing')}`, 'Run cognianalysis dev finalize . --allow-partial after Tier 1 coverage, then execute every planned skill_workbench task.'),
    v2Check('complete_audit_detail_reviews_complete', 'Complete-audit planned detail reviews complete', auditDetailReviewsComplete, `mode=${productMode || 'missing'}, status=${String(bundle?.source_family_detail_review_coverage?.status || 'missing')}`, 'Author the detail-agent plan, materialize detail tasks, execute every planned detail review, then rerun analyze/eval.'),
    v2Check('complete_audit_requirements_trace_complete', 'Complete-audit final requirements trace complete', auditRequirementsTraceComplete, `mode=${productMode || 'missing'}, complete=${bundle?.analysis_document_requirements_trace_contract?.complete === true}`, 'Author analysis_document.requirements_trace with goal_contract_refs, section links and evidence/open questions.'),
    v2Check('complete_audit_goal_trace_complete', 'Complete-audit goal trace alignment complete', auditGoalTraceComplete, `mode=${productMode || 'missing'}, complete=${bundle?.analysis_goal_trace_alignment?.complete === true}`, 'Cover every analysis goal contract reference in analysis_document.requirements_trace.'),
    v2Check('complete_audit_quality_review_complete', 'Complete-audit LLM quality review complete and decision-ready', auditQualityReviewComplete, `mode=${productMode || 'missing'}, complete=${bundle?.analysis_document_quality_review?.complete === true}, decision_ready=${bundle?.analysis_document_quality_review?.verdict_is_decision_ready === true}`, 'Author analysis_document.report_quality_review with reviewer=codex_llm, summary, checks and verdict=decision_ready only after prerequisites are complete.'),
    v2Check('complete_audit_consistency_review_complete', 'Complete-audit consistency review complete', auditConsistencyComplete, `mode=${productMode || 'missing'}, complete=${bundle?.analysis_document_consistency_review?.complete === true}`, 'Author analysis_document.consistency_review with reviewer=codex_llm and contradiction findings.'),
    v2Check('complete_audit_semantic_lineage_complete', 'Complete-audit semantic lineage complete', auditSemanticLineageComplete, `mode=${productMode || 'missing'}, complete=${bundle?.analysis_document_semantic_lineage?.complete === true}`, 'Add semantic_lineage for major findings/recommendations/decisions, including origin and supporting artifacts plus file:line evidence.'),
    v2Check('complete_audit_final_synthesis_ready', 'Complete-audit final synthesis mode ready', auditReportModeReady, `mode=${productMode || 'missing'}, final_synthesis_ready=${bundle?.report_mode?.final_synthesis_ready === true}`, 'Complete the full complete-audit workflow before treating the rendered report as final.'),
    v2Check('complete_audit_artifact_graph_complete', 'Complete-audit artifact dependency graph complete', auditArtifactGraphComplete, `mode=${productMode || 'missing'}, complete=${bundle?.artifact_dependency_graph?.complete === true}`, 'Materialize and execute required task manifests so the artifact dependency graph is complete.'),
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

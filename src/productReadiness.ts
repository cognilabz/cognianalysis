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
    return hasDetailedText(text)
      || hasDetailedItem(flow?.steps)
      || hasText(mermaidSource(flow?.mermaid || flow?.source));
  });
}

function qualityCheckCovered(value: any): boolean {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  return normalizeSemanticStatus(value) === 'covered';
}

function normalizeSemanticStatus(value: any): string {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['covered', 'complete', 'ready', 'decision_ready'].includes(raw)) return 'covered';
  if (['not_applicable', 'not_relevant', 'not_needed', 'not_useful', 'out_of_scope', 'n_a', 'na'].includes(raw)) return 'not_applicable';
  if (raw === 'partial') return 'partial';
  if (['open', 'unknown', 'blocked'].includes(raw)) return 'open';
  return raw;
}

function qualityCheckReady(value: any): boolean {
  if (value === true) return true;
  const status = normalizeSemanticStatus(value);
  return status === 'covered' || status === 'not_applicable';
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
  'e2e_relationships_explained',
  'business_processes_explained',
  'api_contracts_and_examples_visible',
  'technical_drilldown_visible',
  'visual_explanations_fit_purpose',
  'architecture_visuals_visible',
  'process_flow_visuals_visible',
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

function qualityDimensionRows(analysis: any): any[] {
  const review = analysis?.report_quality_review || {};
  const direct = utilAsList(review.dimension_checks || review.quality_dimensions || review.applicability_checks);
  if (direct.length) return direct;
  const checks = review.checks;
  if (checks && typeof checks === 'object' && !Array.isArray(checks)) {
    return Object.entries(checks).map(([id, status]) => ({ id, label: id, status }));
  }
  return [];
}

function qualityDimensionReady(row: any): boolean {
  const status = normalizeSemanticStatus(row?.status ?? row?.coverage ?? row?.verdict ?? row?.result);
  if (status !== 'covered' && status !== 'not_applicable') return false;
  return hasDetailedText(row?.rationale || row?.reason || row?.summary || row?.description)
    || status === 'not_applicable'
    || utilAsList(row?.affected_sections || row?.covered_by_sections).length > 0
    || hasDirectEvidence(row)
    || utilAsList(row?.open_questions).length > 0;
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
  const dimensionRows = qualityDimensionRows(analysis);
  if (dimensionRows.length && Array.isArray(analysis?.report_quality_review?.dimension_checks)) {
    return dimensionRows.length >= 3 && dimensionRows.every(qualityDimensionReady);
  }
  const checks = analysis?.report_quality_review?.checks || {};
  return REQUIRED_DEPTH_QUALITY_CHECKS.every(id => {
    if (id === 'e2e_relationships_explained') return qualityCheckReady(checks?.e2e_relationships_explained ?? checks?.whole_e2e_flow_explained);
    if (id === 'visual_explanations_fit_purpose') return qualityCheckReady(checks?.visual_explanations_fit_purpose ?? checks?.graphs_and_flows_visible);
    return qualityCheckReady(checks?.[id]);
  });
}

function authoredReportSections(analysis: any): any[] {
  return utilAsList(analysis?.authored_report?.sections || analysis?.freeform_report?.sections || analysis?.narrative_report?.sections);
}

function authoredReportText(analysis: any): string {
  const sections = authoredReportSections(analysis);
  const collect = (value: any): string[] => {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(collect);
    if (!value || typeof value !== 'object') return [];
    return [
      value.title,
      value.kicker,
      value.intent,
      value.lead,
      value.body,
      value.callouts,
      value.subsections,
      value.bullets,
      value.summary,
      value.description
    ].flatMap(collect);
  };
  return sections.flatMap(collect).filter(hasText).join(' ');
}

function reportBlocks(analysis: any): any[] {
  const sections = utilAsList(analysis?.report_sections).length
    ? utilAsList(analysis?.report_sections)
    : utilAsList(analysis?.sections);
  const sectionBlocks = sections.flatMap((section: any) => utilAsList(section?.blocks));
  const authoredBlocks = authoredReportSections(analysis).flatMap((section: any) => [
    ...utilAsList(section?.technical_blocks),
    ...utilAsList(section?.blocks).filter((block: any) => block?.render_in_freeform === true || block?.type)
  ]);
  return [...sectionBlocks, ...authoredBlocks];
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
  const authoredWords = wordCount(authoredReportText(analysis));
  const authoredSections = authoredReportSections(analysis);
  if (authoredSections.length >= 3 && authoredWords >= 900) return true;
  const blocks = reportBlocks(analysis);
  const layered = blocks.filter((block: any) => String(block?.type || '').toLowerCase() === 'layered_explanation');
  const blockWords = blocks.reduce((sum: number, block: any) => sum + wordCount(blockText(block)), 0);
  return layered.length >= 2 && blockWords >= 700;
}

function apiContractsAndExamplesVisible(analysis: any): boolean {
  const qualityStatus = analysis?.report_quality_review?.checks?.api_contracts_and_examples_visible;
  if (qualityCheckReady(qualityStatus)) return true;
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
  const qualityStatus = analysis?.report_quality_review?.checks?.technical_drilldown_visible;
  if (qualityCheckReady(qualityStatus)) return true;
  const blocks = reportBlocks(analysis);
  return blocks.some((block: any) => ['api_contracts', 'request_response_examples', 'technical_drilldown', 'boundary_map', 'source_family_map'].includes(String(block?.type || '').toLowerCase()));
}

function blockHasVisibleVisualArtifact(block: any): boolean {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return false;
  return hasText(mermaidSource(block?.mermaid || block?.source))
    || hasText(block?.svg)
    || hasText(block?.src)
    || hasText(block?.image)
    || hasText(block?.image?.src)
    || hasText(block?.image?.svg)
    || hasItems(block?.nodes)
    || hasItems(block?.edges)
    || hasItems(block?.layers)
    || hasItems(block?.lanes)
    || hasItems(block?.phases)
    || utilAsList(block?.steps).length >= 2;
}

function visibleVisualBlocks(analysis: any): any[] {
  return reportBlocks(analysis).filter((block: any) => {
    const type = String(block?.type || '').toLowerCase();
    return ['flow', 'diagram', 'visual_explanation', 'architecture_visual', 'process_flow_visual', 'report_image', 'architecture_view', 'process_view'].includes(type)
      && blockHasVisibleVisualArtifact(block);
  });
}

function architectureVisualVisible(analysis: any): boolean {
  return visibleVisualBlocks(analysis).some((block: any) => {
    const type = String(block?.type || '').toLowerCase();
    return ['architecture_visual', 'architecture_view', 'diagram', 'visual_explanation', 'report_image'].includes(type)
      && (hasItems(block?.nodes) || hasItems(block?.edges) || hasItems(block?.layers) || hasText(block?.svg) || hasText(block?.src) || hasText(block?.image) || hasText(block?.image?.src) || hasText(block?.image?.svg) || hasText(mermaidSource(block?.mermaid || block?.source)));
  });
}

function processFlowVisualVisible(analysis: any): boolean {
  const processStatus = coreCapabilityStatus(analysis, 'process_analysis');
  if (processStatus === 'not_applicable') return true;
  return visibleVisualBlocks(analysis).some((block: any) => {
    const type = String(block?.type || '').toLowerCase();
    return ['process_flow_visual', 'process_view', 'flow', 'diagram', 'visual_explanation'].includes(type)
      && (utilAsList(block?.steps).length >= 2 || hasItems(block?.phases) || hasItems(block?.lanes) || hasText(block?.svg) || hasText(block?.src) || hasText(block?.image) || hasText(block?.image?.src) || hasText(block?.image?.svg) || hasText(mermaidSource(block?.mermaid || block?.source)));
  });
}

function visualExplanationsFitPurpose(analysis: any): boolean {
  return visibleVisualBlocks(analysis).length > 0;
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
  return normalizeSemanticStatus(value) === 'covered';
}

function coverageStatusReady(value: any): boolean {
  const status = normalizeSemanticStatus(value);
  return status === 'covered' || status === 'not_applicable';
}

function capabilitySupportPresent(row: any): boolean {
  return hasDirectEvidence(row)
    || utilAsList(row?.covered_by_sections).length > 0
    || utilAsList(row?.open_questions).length > 0
    || hasText(row?.evidence_gap)
    || hasText(row?.missing_evidence)
    || hasText(row?.proof_gap);
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
      && coverageStatusReady(row.status || row.coverage || row.verdict)
      && hasDetailedText(row.summary || row.description || row.thesis_impact)
      && capabilitySupportPresent(row);
  });
}

function coreCapabilityStatus(analysis: any, id: string): string {
  const rows = capabilityCoverageRows(analysis);
  const byId = new Map<string, any>();
  rows.forEach((row: any) => byId.set(normalizedCapabilityId(row?.capability_id || row?.id || row?.level || row?.label), row));
  const row = byId.get(id);
  return normalizeSemanticStatus(row?.status || row?.coverage || row?.verdict);
}

function coreCapabilityReady(analysis: any, id: string): boolean {
  const rows = capabilityCoverageRows(analysis);
  const byId = new Map<string, any>();
  rows.forEach((row: any) => byId.set(normalizedCapabilityId(row?.capability_id || row?.id || row?.level || row?.label), row));
  const row = byId.get(id);
  return !!row
    && coverageStatusReady(row.status || row.coverage || row.verdict)
    && hasDetailedText(row.summary || row.description || row.thesis_impact || row.rationale)
    && capabilitySupportPresent(row);
}

function analysisDimensionReady(analysis: any, id: string): boolean {
  const rows = utilAsList(analysis?.analysis_dimensions || analysis?.dimensions || analysis?.decision_dimensions);
  const normalized = normalizedCapabilityId(id);
  return rows.some((row: any) => {
    const rowId = normalizedCapabilityId(row?.dimension_id || row?.id || row?.capability_id || row?.label);
    return rowId === normalized
      && coverageStatusReady(row.status || row.coverage || row.verdict)
      && hasDetailedText(row.summary || row.description || row.decision_value || row.rationale)
      && (hasDirectEvidence(row) || utilAsList(row?.covered_by_sections).length > 0 || utilAsList(row?.open_questions).length > 0 || normalizeSemanticStatus(row.status) === 'not_applicable');
  });
}

function capabilityOrDimensionReady(analysis: any, id: string): boolean {
  return coreCapabilityReady(analysis, id) || analysisDimensionReady(analysis, id);
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
  const refactoringNotApplicable = coreCapabilityStatus(analysisDoc, 'refactoring_target_architecture') === 'not_applicable';
  const reverseEngineeringReady = capabilityOrDimensionReady(analysisDoc, 'reverse_engineering_documentation');
  const codeCapabilityReady = capabilityOrDimensionReady(analysisDoc, 'code_analysis');
  const processCapabilityReady = capabilityOrDimensionReady(analysisDoc, 'process_analysis');
  const modernizationCapabilityReady = capabilityOrDimensionReady(analysisDoc, 'refactoring_target_architecture');
  const authoredWords = wordCount(authoredReportText(analysisDoc));
  const qualityOrRisk = hasItems(analysisDoc?.code_quality_security?.bugs)
    || hasItems(analysisDoc?.code_quality_security?.vulnerabilities)
    || hasItems(analysisDoc?.code_quality_security?.code_quality_findings)
    || hasItems(analysisDoc?.executive_decision?.top_risks)
    || hasItems(analysisDoc?.process_analysis?.delivery_risks)
    || codeCapabilityReady;
  const refactoringOrNext = refactoringNotApplicable
    || modernizationCapabilityReady
    || hasItems(analysisDoc?.refactoring?.target_architecture_options)
    || hasItems(analysisDoc?.refactoring?.migration_roadmap)
    || hasItems(analysisDoc?.refactoring?.quick_wins)
    || hasItems(analysisDoc?.executive_decision?.next_steps);
  const functionalComplete = reverseEngineeringReady || (hasText(functionalView.system_purpose)
    && hasAnyItems(functionalView.capabilities, functionalView.actors)
    && hasAnyItems(functionalView.user_or_system_flows, functionalView.e2e_flows)
    && hasAnyItems(functionalView.business_processes, functionalView.business_rules, functionalView.e2e_flows));
  const technicalComplete = qualityCheckReady(analysisDoc?.report_quality_review?.checks?.technical_view_explained)
    || hasText(technicalView.architecture_summary)
    && hasAnyItems(technicalView.entrypoints, technicalView.apis_and_interfaces)
    && hasAnyItems(technicalView.data_and_state, technicalView.data_flows)
    && hasAnyItems(technicalView.integrations, technicalView.dependencies, technicalView.technology_stack, technicalView.deployment_runtime);
  const codeAnalysisComplete = codeCapabilityReady
    || hasAnyItems(codeQuality.bugs, codeQuality.vulnerabilities, codeQuality.code_quality_findings, codeQuality.scanner_findings_imported);
  const businessProcessComplete = qualityCheckReady(analysisDoc?.report_quality_review?.checks?.business_processes_explained)
    || processCapabilityReady
    || hasAnyItems(functionalView.business_processes, processAnalysis.implemented_business_processes, processAnalysis.process_flows);
  const e2eFlowComplete = qualityCheckReady(analysisDoc?.report_quality_review?.checks?.e2e_relationships_explained ?? analysisDoc?.report_quality_review?.checks?.whole_e2e_flow_explained)
    || hasE2eFlow(functionalView.e2e_flows)
    || hasE2eFlow(functionalView.user_or_system_flows)
    || hasE2eFlow(processAnalysis.process_flows);
  const processComplete = processCapabilityReady || (hasText(processAnalysis.test_readiness)
    && businessProcessComplete
    && hasAnyItems(processAnalysis.optimization_opportunities, processAnalysis.process_improvements, processAnalysis.workflow_inefficiencies, processAnalysis.delivery_risks, processAnalysis.observability, processAnalysis.documentation_gaps));
  const refactoringComplete = refactoringNotApplicable
    || modernizationCapabilityReady
    || hasAnyItems(refactoring.target_architecture_options, refactoring.migration_roadmap, refactoring.tech_stack_options, refactoring.quick_wins);
  const detailedTextComplete = qualityCheckReady(analysisDoc?.report_quality_review?.checks?.detailed_textual_explanations)
    || (authoredWords >= 900 && hasDetailedText(analysisDoc?.executive_decision?.summary))
    || (hasDetailedText(analysisDoc?.executive_decision?.summary)
      && hasDetailedText(functionalView.system_purpose)
      && hasDetailedText(technicalView.architecture_summary)
      && (hasDetailedText(processAnalysis.test_readiness) || hasDetailedItem(processAnalysis.implemented_business_processes) || hasDetailedItem(processAnalysis.process_flows))
      && (refactoringNotApplicable || hasDetailedItem(refactoring.target_architecture_options) || hasDetailedItem(refactoring.migration_roadmap) || hasDetailedItem(refactoring.quick_wins)));
  const humanLayeredReportComplete = humanReadableLayeredReportComplete(analysisDoc);
  const apiExamplesComplete = apiContractsAndExamplesVisible(analysisDoc);
  const technicalDrilldownComplete = technicalDrilldownVisible(analysisDoc);
  const visualExplanationsReady = visualExplanationsFitPurpose(analysisDoc);
  const architectureVisualReady = architectureVisualVisible(analysisDoc);
  const processFlowVisualReady = processFlowVisualVisible(analysisDoc);
  const coreCapabilityCoverageComplete = coreCapabilityCoverageModelComplete(analysisDoc);
  const fourCoreCapabilitiesComplete = coreCapabilityCoverageComplete
    || (functionalComplete && codeAnalysisComplete && processComplete && refactoringComplete);
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
    v2Check('functional_view_complete', 'Functional understanding or applicable analogue covered', functionalComplete, reverseEngineeringReady ? 'capability/dimension model' : 'functional_view', 'Add source-backed functional/business/system understanding, or mark the dimension not_applicable with a detailed rationale.'),
    v2Check('technical_view_complete', 'Technical understanding covered in repository-fit form', technicalComplete, qualityCheckReady(analysisDoc?.report_quality_review?.checks?.technical_view_explained) ? 'LLM quality review' : 'technical_view', 'Add source-backed technical understanding in the form that fits the repository: architecture, interfaces, data, runtime/build, dependencies, or a no-interface rationale.'),
    v2Check('quality_or_risk_view_present', 'Quality/risk view present', qualityOrRisk, 'quality/security/risk', 'Add code_quality_security findings, executive top risks or explicit evidence-backed no-finding statements.'),
    v2Check('code_analysis_complete', 'Code analysis/applicability covered', codeAnalysisComplete, codeCapabilityReady ? 'capability/dimension model' : 'code_quality_security', 'Add source-backed code/risk/quality analysis, scanner triage, or an explicit evidence-backed no-finding/not-applicable rationale.'),
    v2Check('process_analysis_complete', 'Process analysis/applicability covered', processComplete, processCapabilityReady ? 'capability/dimension model' : 'process_analysis', 'Describe implemented workflows and improvements when they exist, or mark process analysis not_applicable with source-backed rationale.'),
    v2Check('refactoring_or_next_steps_present', 'Modernization/refactoring applicability or next steps assessed', refactoringOrNext, refactoringNotApplicable ? 'refactoring=not_applicable' : 'refactoring/next_steps', 'Add source-backed refactoring roadmap/next steps when useful, or mark refactoring_target_architecture as not_applicable with a detailed rationale and evidence/open question.'),
    v2Check('refactoring_modernization_complete', 'Modernization/refactoring decision complete or explicitly not applicable', refactoringComplete, refactoringNotApplicable || modernizationCapabilityReady ? 'capability/dimension model' : 'refactoring', 'Add target architecture options, migration roadmap, technology stack options or quick wins only when evidence justifies them; otherwise mark the capability not_applicable with rationale.'),
    v2Check('detailed_textual_explanations_present', 'Detailed textual explanations present', detailedTextComplete, 'narrative-depth-fields', 'Expand executive, functional, technical and process explanations beyond labels or short bullets; include modernization/refactoring prose only when applicable.'),
    v2Check('human_readable_layered_report_present', 'Human-readable layered report narrative present', humanLayeredReportComplete, 'layered_explanation blocks and narrative word depth', 'Add layered_explanation blocks that explain the system in plain language first, with technical detail and evidence underneath.'),
    v2Check('whole_e2e_relationship_present', 'E2E relationship or clearer repository-fit analogue explained', e2eFlowComplete, qualityCheckReady(analysisDoc?.report_quality_review?.checks?.e2e_relationships_explained) ? 'LLM quality review' : 'flows/process relationships', 'Explain source-backed E2E relationships where applicable, or use a clearer repository-fit analogue such as lifecycle, contract, state, module or data transformation with rationale.'),
    v2Check('business_processes_present', 'Business/process layer described or explicitly not applicable', businessProcessComplete, processCapabilityReady ? 'capability/dimension model' : 'business_processes/process_flows', 'Add implemented business/operational process descriptions when they exist, or mark the dimension not_applicable with source-backed rationale.'),
    v2Check('api_contracts_and_examples_present', 'API contracts and request/response examples visible', apiExamplesComplete, 'api_contracts + request_response_examples blocks', 'Add visible API/interface contracts and request/response examples, marking inferred examples with example_origin="inferred".'),
    v2Check('technical_drilldown_visible', 'Technical drilldown visible under human narrative', technicalDrilldownComplete, 'technical component blocks', 'Add API contracts, request/response examples, boundary map, source-family map or technical drilldown blocks.'),
    v2Check('visual_explanations_fit_purpose', 'Visual explanations fit the repository-specific story', visualExplanationsReady, `visible_visual_blocks=${visibleVisualBlocks(analysisDoc).length}`, 'Add visible LLM-authored diagram/image/flow/architecture/process artifacts, or mark the relevant dimension not_applicable with source-backed rationale.'),
    v2Check('architecture_visual_present', 'Architecture picture or system landscape visible', architectureVisualReady, architectureVisualReady ? 'architecture visual block present' : 'missing', 'Add a visible architecture_visual, report_image, diagram or equivalent system-landscape artifact with source-backed nodes/edges or SVG/image content.'),
    v2Check('process_flow_visual_present', 'Process or E2E flow picture visible where applicable', processFlowVisualReady, processFlowVisualReady ? 'process visual block present or not applicable' : 'missing', 'Add a visible process_flow_visual or flow artifact with trigger, steps/lanes, decisions and outcome, or mark process analysis not_applicable with source-backed rationale.'),
    v2Check('four_core_capabilities_complete', 'Core capabilities covered or explicitly not applicable', fourCoreCapabilitiesComplete, `coverage_model=${coreCapabilityCoverageComplete}, refactoring=${refactoringNotApplicable ? 'not_applicable' : 'applicable'}`, 'Author core_capability_coverage[] so each core capability is either covered or explicitly not_applicable with a detailed source-backed rationale.'),
    v2Check('core_capability_coverage_model_present', 'LLM-authored core-capability applicability model present', coreCapabilityCoverageComplete, `rows=${capabilityCoverageRows(analysisDoc).length}/${REQUIRED_CORE_CAPABILITY_IDS.length}`, 'Author core_capability_coverage[] with all four core capabilities, status covered/not_applicable/partial/open, detailed summary, and either section links, evidence or explicit proof gaps.'),
    v2Check('whole_file_thesis_trace_present', 'LLM-authored whole-file thesis trace present', wholeFileTraceComplete, wholeFileThesisTrace(analysisDoc) ? 'present' : 'missing', 'Author whole_file_thesis_trace with included files, Tier 1 file cards, zero missing cards, task completion and source-family thesis impact.'),
    v2Check('open_questions_structured', 'Open questions structured', Array.isArray(analysisDoc?.open_questions) && openQuestionsStructured(analysisDoc.open_questions), `open_questions=${utilAsList(analysisDoc?.open_questions).length}`, 'Use structured open_questions[]; use [] only when no proof gaps remain.'),
    v2Check('report_quality_review_present', 'Report quality self-review present', reportQualityValid(analysisDoc), String(analysisDoc?.report_quality_review?.verdict || 'missing'), 'Add report_quality_review with valid verdict, rationale, gaps and confidence.'),
    v2Check('report_quality_decision_ready', 'Report quality verdict is decision-ready with no blocking gaps', reportQualityDecisionReady(analysisDoc), reportQualityDecisionReadyEvidence(analysisDoc), 'Resolve blocking gaps/open questions or keep the report not ready; only verdict=decision_ready with no blocking gaps can be done.'),
    v2Check('report_quality_depth_checks_covered', 'LLM-authored quality/applicability review complete', reportQualityDepthChecksCovered(analysisDoc), Array.isArray(analysisDoc?.report_quality_review?.dimension_checks) ? `dimension_checks=${qualityDimensionRows(analysisDoc).length}` : REQUIRED_DEPTH_QUALITY_CHECKS.join(','), 'Author report_quality_review.dimension_checks[] for the repository-specific report dimensions, or legacy checks, with covered/not_applicable statuses and rationale.'),
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

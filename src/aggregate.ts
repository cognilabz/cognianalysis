import { CodeMap } from './types';
import { FS, Path, asList, ensureDir, getLine, loadJson, mergeDict, writeJson } from './utils';
import { computeTargetCoverage, TARGET_CAPABILITIES } from './targetCoverage';
import { reportComponentLibraryArtifact, supportedReportComponentTypes } from './reportComponents';
import { analysisPipelineArtifact, computeAnalysisPipelineContract } from './analysisPipeline';
import { analysisSkillCatalogArtifact, analysisSkillIds } from './analysisSkills';
import { computeFinalLlmReadiness } from './readiness';
import { analysisGoalContractArtifact } from './analysisGoal';
import { toolPositioningReferencesArtifact } from './toolPositioningReferences';

export function prepareAnalysis(repo: string, analysisDir: string, codeMap: CodeMap): void {
  const dataDir = Path.join(analysisDir, 'data');
  ensureDir(dataDir);
  writeJson(Path.join(dataDir, 'repo-profile.json'), codeMap.profile);
  writeJson(Path.join(dataDir, 'code-map.json'), codeMap);
  writeJson(Path.join(dataDir, 'source-inventory.json'), {
    included_files: (codeMap.files || []).map((f: any) => ({
      path: f.path,
      module: f.module,
      language: f.language,
      navigation_tags: f.navigation_tags || f.roles,
      roles: f.roles,
      lines: f.lines,
      bytes: f.bytes
    })),
    skipped_files: codeMap.skipped_files || [],
    scope_note: 'Every included file is in scope for semantic analysis. Source capsules, navigation tags and artifact candidates are only navigation aids; files must be accounted for by evidence, explicit inspection, or an explicit deferral reason.'
  });
  writeJson(Path.join(analysisDir, 'source-capsules.json'), codeMap.capsules || []);
  writeJson(Path.join(dataDir, 'interface-signals.json'), codeMap.signals || []);
  writeJson(Path.join(dataDir, 'navigation-artifact-candidates.json'), codeMap.artifact_navigation_candidates || codeMap.important_docs || []);
  writeJson(Path.join(dataDir, 'important-docs.json'), codeMap.important_docs || []);
  writeJson(Path.join(dataDir, 'analysis-goal-contract.json'), analysisGoalContractArtifact());
  writeJson(Path.join(dataDir, 'tool-positioning-references.json'), toolPositioningReferencesArtifact());
  writeJson(Path.join(dataDir, 'report-component-library.json'), reportComponentLibraryArtifact());
  writeJson(Path.join(dataDir, 'analysis-skill-catalog.json'), analysisSkillCatalogArtifact());
  writeJson(Path.join(dataDir, 'target-coverage.json'), TARGET_CAPABILITIES);
}

export function aggregate(repo: string, analysisDir: string): any {
  const dataDir = Path.join(analysisDir, 'data');
  const codeMap = loadJson<any>(Path.join(dataDir, 'code-map.json'), {});
  const profile = codeMap.profile || { repo_name: Path.basename(repo), root: repo };
  const llm = loadLlmOutputs(Path.join(analysisDir, 'llm'));
  const llmOutputPresence = llm.__output_presence || {};
  delete llm.__output_presence;
  const detailAgentPlanArtifact = loadJson<any | null>(Path.join(analysisDir, 'llm', 'detail-agent-plan.json'), null);
  const detail = loadDetailOutputs(Path.join(analysisDir, 'detail_reviews'));
  const sourceFamilyInventory = loadJson<any>(Path.join(dataDir, 'source-family-inventory.json'), {});
  const detailTaskManifest = loadJson<any>(Path.join(analysisDir, 'detail-task-manifest.json'), { tasks: [] });

  const assessment = llm.assessment || fallbackAssessment(codeMap);
  const capabilities = asList(llm.capabilities);
  const interfaces = asList(llm.interfaces);
  const flows = asList(llm.flows);
  const businessLogic = asList(llm.business_logic);
  const domainModel = llm.domain_model || fallbackDomainModel(codeMap);
  const dataModel = llm.data_model || fallbackDataModel(codeMap);
  const integrations = asList(llm.integrations);
  const sideEffects = asList(llm.side_effects);
  const architecture = llm.architecture || fallbackArchitecture(codeMap);
  const process = llm.process || fallbackProcess(codeMap);
  const quality = llm.quality || fallbackQuality(codeMap);
  const findings = asList(llm.findings);
  const refactoring = asList(llm.refactoring);
  const modernization = asList(llm.modernization);
  const documentation = llm.documentation || fallbackDocumentation(codeMap);
  const analysisDocument = llm.analysis_document || null;
  const detailAgentPlan = detailAgentPlanArtifact?.detail_agent_plan || detailAgentPlanArtifact || llm.detail_agent_plan || null;
  const hasDetailAgentPlanArtifact = !!detailAgentPlanArtifact && typeof detailAgentPlanArtifact === 'object' && !Array.isArray(detailAgentPlanArtifact);
  const analysisCoverage = validateNested(repo, mergeCoverage(llm.analysis_coverage || fallbackAnalysisCoverage(codeMap), detail.coverageItems));

  const hasSemanticOutput = hasAssessmentContent(llm) || !!analysisDocument || capabilities.length || interfaces.length || flows.length || hasDocContent(documentation) || businessLogic.length || integrations.length || refactoring.length;
  const status = hasSemanticOutput
    ? { state: 'llm_extracted', message: 'Report contains Codex/LLM-extracted semantic data merged with the code map, examples and evidence.' }
    : { state: 'awaiting_llm_extraction', message: 'Codex/LLM extraction has not been run yet. The report shows repo map, target artifact/contract coverage, source capsules, documentation candidates and broad signals only.' };

  const tasks = loadJson<any>(Path.join(analysisDir, 'task-manifest.json'), { tasks: [] }).tasks || [];
  const analysisPipeline = analysisPipelineArtifact(tasks);
  const bundle: any = {
    profile,
    status,
    extraction_policy: codeMap.extraction_policy,
    modules: codeMap.modules || [],
    files: (codeMap.files || []).slice(0, 1200),
    signals: (codeMap.signals || []).slice(0, 3000),
    symbols: (codeMap.symbols || []).slice(0, 5000),
    glossary_terms: codeMap.glossary_terms || [],
    capsules: codeMap.capsules || [],
    navigation_policy: codeMap.navigation_policy || {},
    artifact_navigation_candidates: codeMap.artifact_navigation_candidates || codeMap.important_docs || [],
    important_docs: codeMap.important_docs || [],
    analysis_goal_contract: analysisGoalContractArtifact(),
    tool_positioning_references: toolPositioningReferencesArtifact(),
    report_component_library: reportComponentLibraryArtifact(),
    analysis_skill_catalog: analysisSkillCatalogArtifact(),
    analysis_pipeline: analysisPipeline,
    assessment: validateNested(repo, assessment),
    capabilities: validateItems(repo, capabilities),
    interfaces: validateItems(repo, interfaces),
    flows: validateItems(repo, flows),
    business_logic: validateItems(repo, businessLogic),
    domain_model: validateNested(repo, domainModel),
    data_model: validateNested(repo, dataModel),
    integrations: validateItems(repo, integrations),
    side_effects: validateItems(repo, sideEffects),
    architecture: validateNested(repo, architecture),
    process: validateNested(repo, process),
    quality: validateNested(repo, quality),
    findings: validateItems(repo, findings),
    refactoring: validateItems(repo, refactoring),
    modernization: validateItems(repo, modernization),
    documentation: validateNested(repo, documentation),
    analysis_document: validateNested(repo, analysisDocument),
    detail_agent_plan: validateNested(repo, detailAgentPlan),
    llm_detail_agent_plan: validateNested(repo, extractLlmDetailAgentPlan(detailAgentPlan, analysisDocument, hasDetailAgentPlanArtifact)),
    source_family_inventory: validateNested(repo, sourceFamilyInventory),
    detail_task_manifest: validateNested(repo, detailTaskManifest),
    source_family_detail_reviews: validateItems(repo, detail.reviews),
    analysis_coverage: analysisCoverage,
    tasks,
    tooling: computeToolingCapabilities(),
    report_artifacts: computeReportArtifacts(analysisDir)
  };
  bundle.llm_output_presence = llmOutputPresence;

  let evidence: any[] = [];
  for (const key of ['capabilities','interfaces','flows','business_logic','integrations','side_effects','findings','refactoring','modernization']) evidence = evidence.concat(collectEvidence(bundle[key] || []));
  for (const key of ['assessment','domain_model','data_model','architecture','process','quality','documentation','detail_agent_plan','analysis_document','source_family_detail_reviews','analysis_coverage']) evidence = evidence.concat(collectEvidence(bundle[key] || {}));
  bundle.evidence_index = dedupeEvidence(evidence);
  bundle.source_inventory_accounting = computeSourceCoverage(codeMap, bundle.evidence_index, bundle.analysis_coverage);
  bundle.source_coverage = bundle.source_inventory_accounting;
  ensureRepositoryWideView(bundle);
  bundle.analysis_document_requirements_trace_contract = computeAnalysisDocumentRequirementsTraceContract(bundle.analysis_document);
  bundle.analysis_document_goal_coverage = bundle.analysis_document_requirements_trace_contract;
  bundle.analysis_goal_trace_alignment = computeAnalysisGoalTraceAlignment(bundle.analysis_goal_contract, bundle.analysis_document);
  bundle.analysis_document_component_coverage = computeAnalysisDocumentComponentCoverage(bundle.analysis_document, bundle.profile, bundle.modules);
  bundle.analysis_document_quality_review = computeAnalysisDocumentQualityReview(bundle.analysis_document);
  bundle.llm_artifacts = computeLlmArtifactStatus(analysisDir, bundle.tasks);
  bundle.analysis_document_prerequisite_coverage = computeAnalysisDocumentPrerequisiteCoverage(bundle.llm_artifacts);
  bundle.analysis_document_detail_review_synthesis = computeDetailReviewSynthesisStatus(bundle.analysis_document, bundle.source_family_detail_reviews);
  bundle.source_family_detail_review_coverage = computeDetailReviewCoverage(bundle.llm_detail_agent_plan, bundle.source_family_detail_reviews, bundle.analysis_document_detail_review_synthesis);
  bundle.report_mode = computeReportMode(bundle.analysis_document, bundle.source_family_detail_review_coverage, bundle.analysis_document_detail_review_synthesis, bundle.analysis_document_prerequisite_coverage, bundle.analysis_document_quality_review, bundle.analysis_goal_trace_alignment);
  bundle.analysis_pipeline_contract = computeAnalysisPipelineContract(bundle);
  bundle.analysis_skill_catalog_contract = computeAnalysisSkillCatalogContract(bundle.analysis_skill_catalog);
  bundle.semantic_authority = computeSemanticAuthority(bundle);
  bundle.final_llm_readiness = computeFinalLlmReadiness(bundle);
  bundle.target_coverage = computeTargetCoverage(bundle);
  bundle.target_artifact_contract_coverage = bundle.target_coverage;

  ensureDir(dataDir);
  writeJson(Path.join(dataDir, 'analysis-goal-contract.json'), bundle.analysis_goal_contract);
  writeJson(Path.join(dataDir, 'tool-positioning-references.json'), bundle.tool_positioning_references);
  writeJson(Path.join(dataDir, 'report-component-library.json'), bundle.report_component_library);
  writeJson(Path.join(dataDir, 'analysis-skill-catalog.json'), bundle.analysis_skill_catalog);
  writeJson(Path.join(dataDir, 'analysis-pipeline.json'), bundle.analysis_pipeline);
  writeJson(Path.join(analysisDir, 'analysis-pipeline.json'), bundle.analysis_pipeline);
  writeJson(Path.join(dataDir, 'analysis-goal-trace-alignment.json'), bundle.analysis_goal_trace_alignment);
  writeJson(Path.join(dataDir, 'bundle.json'), bundle);
  writeJson(Path.join(dataDir, 'evidence.json'), bundle.evidence_index);
  writeJson(Path.join(dataDir, 'source-inventory-accounting.json'), bundle.source_inventory_accounting);
  writeJson(Path.join(dataDir, 'target-coverage.json'), bundle.target_coverage);
  writeJson(Path.join(dataDir, 'target-artifact-contract-coverage.json'), bundle.target_artifact_contract_coverage);
  return bundle;
}

export function loadBundle(analysisDir: string): any {
  const bundlePath = Path.join(analysisDir, 'data', 'bundle.json');
  const bundle = loadJson<any | null>(bundlePath, null);
  if (bundle) return bundle;
  const codeMap = loadJson<any>(Path.join(analysisDir, 'data', 'code-map.json'), {});
  const root = codeMap.profile?.root || process.cwd();
  return aggregate(root, analysisDir);
}

function computeToolingCapabilities(): any {
  return {
    cli_commands: ['prepare', 'finalize', 'audit-report', 'aggregate', 'coverage', 'render', 'validate', 'portfolio', 'mcp'],
    portfolio_mode_available: true,
    harness_portability_available: true,
    report_renderer_available: true,
    summary: 'Deterministic CLI capabilities available in this Codebase Analysis Pack build.'
  };
}

function computeReportArtifacts(analysisDir: string): any {
  const persisted = loadJson<any>(Path.join(analysisDir, 'data', 'report-artifacts.json'), {});
  const defaultIndex = Path.join(analysisDir, 'report', 'index.html');
  const defaultData = Path.join(analysisDir, 'report', 'analysis-data.json');
  const indexPath = persisted.index_html_path || defaultIndex;
  const dataPath = persisted.analysis_data_json_path || defaultData;
  return {
    output_dir: persisted.output_dir || Path.join(analysisDir, 'report'),
    index_html_path: indexPath,
    analysis_data_json_path: dataPath,
    index_html: FS.existsSync(indexPath),
    analysis_data_json: FS.existsSync(dataPath),
    generated_at: persisted.generated_at || '',
    renderer: 'src/report.ts'
  };
}

function artifactStatus(analysisDir: string, task: any): any {
  const expectedOutput = String(task?.expected_output || '');
  const full = Path.join(analysisDir, expectedOutput);
  const row: any = {
    title: task?.title || expectedOutput,
    task_file: task?.task_file || '',
    expected_output: expectedOutput,
    exists: FS.existsSync(full),
    valid_json: false,
    has_content: false,
    top_level_keys: []
  };
  if (!row.exists) return row;
  try {
    const parsed = JSON.parse(FS.readFileSync(full, 'utf8'));
    row.valid_json = true;
    row.has_content = parsed !== null && (
      Array.isArray(parsed)
        ? parsed.length > 0
        : typeof parsed === 'object'
          ? Object.keys(parsed).length > 0
          : String(parsed).trim().length > 0
    );
    row.top_level_keys = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? Object.keys(parsed).sort() : [];
  } catch (err: any) {
    row.error = err?.message || String(err);
  }
  return row;
}

function computeLlmArtifactStatus(analysisDir: string, tasks: any[]): any {
  const artifacts = asList(tasks)
    .filter((task: any) => String(task?.expected_output || '').startsWith('llm/'))
    .map((task: any) => artifactStatus(analysisDir, task));
  const missing = artifacts.filter((row: any) => !row.exists || !row.valid_json || !row.has_content);
  return {
    complete: artifacts.length > 0 && missing.length === 0,
    total_count: artifacts.length,
    ready_count: artifacts.length - missing.length,
    missing_count: missing.length,
    artifacts,
    missing: missing.map((row: any) => ({
      title: row.title,
      expected_output: row.expected_output,
      exists: row.exists,
      valid_json: row.valid_json,
      has_content: row.has_content,
      error: row.error || ''
    }))
  };
}

function computeAnalysisDocumentPrerequisiteCoverage(llmArtifacts: any): any {
  const artifacts = asList(llmArtifacts?.artifacts);
  const finalOutput = 'llm/analysis-document.json';
  const prerequisites = artifacts.filter((row: any) => row.expected_output !== finalOutput);
  const missing = prerequisites.filter((row: any) => !row.exists || !row.valid_json || !row.has_content);
  return {
    complete: prerequisites.length > 0 && missing.length === 0,
    stage: 'pre_final_building_blocks',
    required_before: finalOutput,
    total_count: prerequisites.length,
    ready_count: prerequisites.length - missing.length,
    missing_count: missing.length,
    ready_outputs: prerequisites.filter((row: any) => row.exists && row.valid_json && row.has_content).map((row: any) => row.expected_output),
    missing_outputs: missing.map((row: any) => row.expected_output),
    missing,
    summary: missing.length
      ? `Final analysis document prerequisites are incomplete: ${missing.map((row: any) => row.expected_output).join(', ')}.`
      : 'All pre-final LLM building-block artifacts are present before the final analysis document.'
  };
}

function ensureRepositoryWideView(bundle: any): void {
  const assessment = bundle.assessment || {};
  if (assessment.repository_wide_view && typeof assessment.repository_wide_view === 'object' && Object.keys(assessment.repository_wide_view).length) {
    return;
  }
  const sc = bundle.source_inventory_accounting || bundle.source_coverage || {};
  const modules = asList(sc.modules)
    .filter((m: any) => m?.name)
    .sort((a: any, b: any) => (b.files || 0) - (a.files || 0) || String(a.name).localeCompare(String(b.name)));
  const total = sc.total_files || bundle.profile?.source_files || 0;
  const covered = sc.covered_files || 0;
  const coverage = total ? `${covered}/${total} files accounted (${sc.inventory_accounting_percent ?? sc.coverage_percent ?? 0}%)` : 'source inventory is pending';
  assessment.repository_wide_view = {
    summary: `Whole-repository inventory view for ${bundle.profile?.repo_name || 'the repository'} across ${modules.length || 0} source families.`,
    coverage_statement: `The source inventory accounting contract accounts for ${coverage}. This fallback is derived from inventory/evidence bookkeeping; semantic understanding, documentation quality and decision readiness still come from LLM extraction evidence and the final LLM-authored quality review.`,
    source_families: modules.slice(0, 80).map((m: any) => ({
      name: m.name,
      purpose: `Source family with ${m.files || 0} included files in the repository inventory.`,
      business_use: 'Requires LLM/source evidence for owner-grade business wording.',
      entry_points: [],
      exits_or_integrations: [],
      evidence_level: (m.uncovered_files || 0) === 0 ? 'surface' : 'inventory_only',
      confidence: 'low',
      evidence: [],
      open_questions: []
    })),
    deep_slice_boundaries: [],
    e2e_coverage_statement: 'Route/process-level E2E coverage depends on extracted flows; source families without flow evidence remain visible as follow-up drilldown areas.'
  };
  assessment.completeness ||= {};
  assessment.completeness.whole_repository_view ||= total ? 'partial' : 'none';
  assessment.completeness.source_family_coverage ||= modules.length ? 'partial' : 'none';
  bundle.assessment = assessment;
}

function normalizeRequirement(value: any): string {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function computeAnalysisDocumentRequirementsTraceContract(doc: any): any {
  const trace = Array.isArray(doc?.requirements_trace) ? doc.requirements_trace : [];
  const rows = trace.map((item: any, index: number) => {
    const requirement = String(item?.requirement || '').trim();
    const id = normalizeRequirement(requirement) || `trace_${index + 1}`;
    const status = String(item?.status || '').toLowerCase();
    const statusKnown = ['covered', 'partial', 'open'].includes(status);
    const sectionRefs = asList(item?.covered_by_sections).filter(Boolean);
    const evidence = asList(item?.evidence);
    const openQuestions = asList(item?.open_questions);
    const hasSupport = evidence.length > 0 || openQuestions.length > 0 || status === 'open';
    const structured = requirement.length > 0 && statusKnown && sectionRefs.length > 0 && hasSupport;
    return {
      id,
      label: requirement || `Trace item ${index + 1}`,
      present: requirement.length > 0,
      status,
      status_known: statusKnown,
      supported: structured,
      covered_by_sections: sectionRefs,
      goal_contract_refs: asList(item?.goal_contract_refs || item?.goal_refs).map(normalizeGoalTraceRef).filter(Boolean),
      evidence,
      open_questions: openQuestions
    };
  });
  const statusCounts = rows.reduce((acc: any, row: any) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const structuralMissing = rows
    .filter(r => !r.present || !r.status_known || !r.covered_by_sections.length || (!r.evidence.length && !r.open_questions.length && r.status !== 'open'))
    .map(r => r.id);
  return {
    contract_kind: 'llm_authored_requirements_trace',
    semantic_verdict_authority: 'llm',
    contract_summary: 'Checks that the LLM authored a structured analysis_document.requirements_trace with named requirements, LLM statuses, section links and evidence or open questions. This is not a deterministic checklist of original requirements and not a judgment that the repository is fully understood.',
    complete: trace.length > 0 && structuralMissing.length === 0,
    trace_count: rows.length,
    authored_trace_count: rows.length,
    covered_count: rows.filter(r => r.status === 'covered').length,
    fully_covered_count: rows.filter(r => r.status === 'covered').length,
    partial_count: rows.filter(r => r.status === 'partial').length,
    open_count: rows.filter(r => r.status === 'open').length,
    total_count: rows.length,
    missing: trace.length ? [] : ['requirements_trace'],
    weak: structuralMissing,
    status_counts: statusCounts,
    status_counts_meaning: 'Counts are authored LLM trace statuses. They are reported for transparency, not computed semantic truth.',
    requirements: rows
  };
}

function normalizeGoalTraceRef(value: any): string {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  const direct = String(value.ref || value.goal_contract_ref || '').trim();
  if (direct) return direct;
  const group = String(value.group || value.category || '').trim();
  const id = String(value.id || '').trim();
  return group && id ? `${group}.${id}` : '';
}

function collectGoalContractRefs(goal: any): any[] {
  const groups = [
    { key: 'required_levels', type: 'level' },
    { key: 'required_views', type: 'view' },
    { key: 'required_report_behaviors', type: 'report_behavior' }
  ];
  const outputShapeLabels: any = {
    deliverable: {
      label: 'Structured decision-basis analysis document',
      intent: 'The output is a structured decision document, not only raw extraction data.'
    },
    visible_report_authority: {
      label: 'Visible report authored by the LLM',
      intent: 'The visible human report structure and narrative come from analysis_document.sections authored by the LLM.'
    },
    style_system: {
      label: 'Stable component/style library',
      intent: 'The visual system is stable while report wording, ordering and emphasis remain LLM-authored.'
    },
    source_basis: {
      label: 'Source-code evidence basis',
      intent: 'The analysis is grounded in source code, tests, docs, contracts, examples and configuration.'
    },
    automation_goal: {
      label: 'Automated source-code analysis goal',
      intent: 'The workflow should be as automated as possible from source code through final analysis document.'
    }
  };
  const refs: any[] = [];
  const outputShape = goal?.required_output_shape && typeof goal.required_output_shape === 'object' ? goal.required_output_shape : {};
  for (const id of Object.keys(outputShape)) {
    const meta = outputShapeLabels[id] || {};
    refs.push({
      ref: `required_output_shape.${id}`,
      group: 'required_output_shape',
      type: 'output_shape',
      id,
      label: meta.label || String(id).replace(/_/g, ' '),
      intent: meta.intent || String(outputShape[id] || '')
    });
  }
  for (const group of groups) {
    for (const item of asList(goal?.[group.key])) {
      const id = String(item?.id || '').trim();
      if (!id) continue;
      refs.push({
        ref: `${group.key}.${id}`,
        group: group.key,
        type: group.type,
        id,
        label: item?.label || id,
        intent: item?.intent || ''
      });
    }
  }
  return refs;
}

function computeAnalysisGoalTraceAlignment(goal: any, doc: any): any {
  const expectedRefs = collectGoalContractRefs(goal);
  const expectedSet = new Set(expectedRefs.map(item => item.ref));
  const trace = Array.isArray(doc?.requirements_trace) ? doc.requirements_trace : [];
  const rows = trace.map((item: any, index: number) => {
    const requirement = String(item?.requirement || '').trim();
    const id = normalizeRequirement(requirement) || `trace_${index + 1}`;
    const refs = [...new Set(asList(item?.goal_contract_refs || item?.goal_refs).map(normalizeGoalTraceRef).filter(Boolean))];
    return {
      id,
      label: requirement || `Trace item ${index + 1}`,
      status: String(item?.status || '').toLowerCase(),
      goal_contract_refs: refs,
      valid_goal_contract_refs: refs.filter(ref => expectedSet.has(ref)),
      unknown_goal_contract_refs: refs.filter(ref => !expectedSet.has(ref))
    };
  });
  const referencedSet = new Set(rows.flatMap(row => row.valid_goal_contract_refs));
  const missing = expectedRefs.filter(item => !referencedSet.has(item.ref));
  const unknown = [...new Set(rows.flatMap(row => row.unknown_goal_contract_refs))];
  const complete = expectedRefs.length > 0 && trace.length > 0 && missing.length === 0 && unknown.length === 0;
  return {
    contract_kind: 'llm_authored_goal_trace_references',
    semantic_verdict_authority: 'llm',
    status_source: 'analysis_document.requirements_trace[].status and analysis_document.report_quality_review.verdict',
    deterministic_contract_scope: 'explicit goal-contract reference syntax only; no semantic matching, keyword matching, coverage scoring or report-quality judgment',
    complete,
    status: complete ? 'explicit_llm_goal_trace' : 'goal_trace_references_partial',
    expected_goal_refs: expectedRefs,
    referenced_goal_refs: expectedRefs.filter(item => referencedSet.has(item.ref)),
    missing_goal_refs: missing,
    unknown_goal_refs: unknown,
    trace_rows: rows,
    rows_without_goal_refs: rows.filter(row => !row.goal_contract_refs.length).map(row => row.id),
    summary: complete
      ? 'Every original goal-contract item is explicitly referenced by at least one LLM-authored requirements_trace row. The LLM-authored row statuses and report_quality_review remain the semantic verdict.'
      : 'The LLM-authored requirements_trace does not explicitly reference every original goal-contract item yet. This is a reference-shape gap, not a deterministic semantic judgment.'
  };
}

function hasRenderablePrimitive(value: any): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  return false;
}

function hasRenderableValue(value: any): boolean {
  if (hasRenderablePrimitive(value)) return true;
  if (Array.isArray(value)) return value.some(hasRenderableValue);
  if (!value || typeof value !== 'object') return false;
  return [
    value.title,
    value.text,
    value.paragraphs,
    value.name,
    value.id,
    value.label,
    value.value,
    value.detail,
    value.summary,
    value.description,
    value.reason,
    value.rationale,
    value.recommendation,
    value.benefit,
    value.risk,
    value.status,
    value.verdict,
    value.question,
    value.why_it_matters,
    value.role,
    value.business_need,
    value.business_use,
    value.technical_drilldown,
    value.technical_shape,
    value.source_family,
    value.recommended_agent,
    value.actor,
    value.kind,
    value.source,
    value.mermaid,
    value.options,
    value.focus,
    value.expected_outputs,
    value.seed_files,
    value.next_steps,
    value.phase,
    value.effort,
    value.confidence,
    value.severity,
    value.owner,
    value.target,
    value.path
  ].some(hasRenderableValue);
}

function hasEvidenceReference(value: any): boolean {
  return asList(value).length > 0;
}

function statementHasRenderableContent(item: any): boolean {
  return hasRenderableValue(item) || hasEvidenceReference(item?.evidence);
}

function blockRef(section: any, index: number, type: string): string {
  return `${section?.id || section?.title || 'section'}[${index}]:${type}`;
}

function blockHasRenderableContent(block: any): boolean {
  const type = String(block?.type || 'narrative').toLowerCase();
  if (hasEvidenceReference(block?.evidence)) return true;

  switch (type) {
    case 'metric_grid':
      return asList(block?.metrics).some((metric: any) => hasRenderableValue(metric));
    case 'source_family_map':
      return asList(block?.families).some((family: any) => hasRenderableValue(family) || hasEvidenceReference(family?.evidence));
    case 'boundary_map':
      return ['entries', 'exits', 'state'].some(key => asList(block?.[key]).some(statementHasRenderableContent));
    case 'flow':
      return hasRenderableValue(block?.summary)
        || hasRenderableValue(block?.description)
        || hasRenderableValue(block?.source)
        || hasRenderableValue(block?.mermaid)
        || asList(block?.steps).some((step: any) => hasRenderableValue(step) || hasEvidenceReference(step?.evidence));
    case 'four_level_assessment':
      return asList(block?.levels).some((level: any) => hasRenderableValue(level) || hasEvidenceReference(level?.evidence));
    case 'decision_matrix':
      return asList(block?.rows).some((row: any) => hasRenderableValue(row) || hasEvidenceReference(row?.evidence));
    case 'roadmap':
      return asList(block?.items).some((item: any) => hasRenderableValue(item) || hasEvidenceReference(item?.evidence));
    case 'agent_plan':
      return hasRenderableValue(block?.summary)
        || hasRenderableValue(block?.description)
        || asList(block?.tasks || block?.detail_agent_tasks).some((task: any) => hasRenderableValue(task) || hasEvidenceReference(task?.evidence));
    case 'technical_drilldown':
      return asList(block?.references).some((reference: any) => hasRenderableValue(reference) || hasEvidenceReference(reference?.evidence));
    case 'open_questions':
      return asList(block?.items).some((item: any) => hasRenderableValue(item) || hasEvidenceReference(item?.evidence));
    case 'statement_list':
      return asList(block?.items).some(statementHasRenderableContent);
    case 'narrative':
    default:
      return hasRenderableValue(block?.text)
        || hasRenderableValue(block?.paragraphs)
        || hasRenderableValue(block?.summary)
        || hasRenderableValue(block?.description)
        || hasRenderableValue(block?.business_need)
        || hasRenderableValue(block?.business_use)
        || hasRenderableValue(block?.technical_drilldown);
  }
}

function computeAnalysisDocumentComponentCoverage(doc: any, profile: any, modules: any[]): any {
  const sections = asList(doc?.sections);
  const sectionLevels = [...new Set(sections.map((s: any) => String(s?.level || '').toLowerCase()).filter(Boolean))];
  const blockTypes = [...new Set(sections.flatMap((s: any) => asList(s?.blocks).map((b: any) => String(b?.type || '').toLowerCase()).filter(Boolean)))];
  const supportedBlockTypes = new Set(supportedReportComponentTypes());
  const unsupportedBlockTypes = blockTypes.filter(type => !supportedBlockTypes.has(type));
  const sectionsWithoutIdentity = sections
    .filter((section: any) => !String(section?.id || section?.title || '').trim())
    .map((section: any, index: number) => index);
  const sectionsWithoutBlocks = sections
    .filter((section: any) => asList(section?.blocks).length === 0)
    .map((section: any, index: number) => section?.id || section?.title || `section[${index}]`);
  const blocksWithoutSupportedType: string[] = [];
  const blocksWithoutRenderableContent: string[] = [];
  sections.forEach((section: any) => {
    asList(section?.blocks).forEach((block: any, index: number) => {
      const type = String(block?.type || 'narrative').toLowerCase();
      if (!supportedBlockTypes.has(type)) blocksWithoutSupportedType.push(`${section?.id || section?.title || 'section'}[${index}]:${type}`);
      if (!blockHasRenderableContent(block)) blocksWithoutRenderableContent.push(blockRef(section, index, type));
    });
  });
  const required = [
    {
      id: 'authored_sections',
      label: 'LLM-authored report sections exist',
      present: sections.length > 0
    },
    {
      id: 'section_blocks_contract',
      label: 'Authored sections include LLM blocks for renderer content',
      present: sectionsWithoutBlocks.length === 0
    },
    {
      id: 'supported_component_contract',
      label: 'Authored blocks use supported renderer components',
      present: unsupportedBlockTypes.length === 0 && blocksWithoutSupportedType.length === 0
    },
    {
      id: 'block_render_content_contract',
      label: 'Authored blocks contain renderer-supported content fields or evidence',
      present: blocksWithoutRenderableContent.length === 0
    },
    {
      id: 'section_identity_contract',
      label: 'Authored sections have an id or title for navigation',
      present: sectionsWithoutIdentity.length === 0
    }
  ];
  const missing = required.filter(r => !r.present);
  return {
    complete: sections.length > 0 && missing.length === 0,
    section_count: sections.length,
    levels: sectionLevels,
    block_types: blockTypes,
    supported_block_types: [...supportedBlockTypes],
    component_library_kind: 'analysis_document_component_library',
    semantic_verdict_authority: 'llm',
    contract_summary: 'Checks only whether LLM-authored report sections can be rendered by the stable component library. This is not a judgment of report quality or semantic completeness.',
    unsupported_block_types: unsupportedBlockTypes,
    blocks_without_supported_type: blocksWithoutSupportedType,
    blocks_without_renderable_content: blocksWithoutRenderableContent,
    sections_without_blocks: sectionsWithoutBlocks,
    sections_without_identity: sectionsWithoutIdentity,
    required,
    missing: missing.map(r => r.id),
    summary: missing.length
      ? `Final analysis document does not satisfy the renderer component contract: ${missing.map(r => r.label).join(', ')}.`
      : 'Final analysis document uses the supported component contract. Semantic report quality is judged by the LLM-authored requirements trace and report_quality_review.'
  };
}

function computeAnalysisSkillCatalogContract(catalog: any): any {
  const skills = asList(catalog?.skills);
  const requiredIds = analysisSkillIds();
  const skillIds = new Set(skills.map((skill: any) => String(skill?.id || '')));
  const missingRequired = requiredIds.filter(id => !skillIds.has(id));
  const malformed = skills
    .filter((skill: any) => !String(skill?.id || '').trim() || !String(skill?.purpose || '').trim() || !asList(skill?.stage_ids).length || !asList(skill?.expected_outputs).length)
    .map((skill: any, index: number) => String(skill?.id || `skill_${index + 1}`));
  const semanticAuthorityOk = catalog?.semantic_authority === 'llm';
  const deterministicAuthorityOk = catalog?.deterministic_authority === 'catalog_presence_and_shape_only';
  const missing = [
    ...(!semanticAuthorityOk ? ['semantic_authority_llm'] : []),
    ...(!deterministicAuthorityOk ? ['deterministic_authority_shape_only'] : []),
    ...missingRequired.map(id => `required_skill:${id}`),
    ...malformed.map(id => `malformed_skill:${id}`)
  ];
  return {
    contract_kind: 'llm_analysis_skill_catalog_contract',
    semantic_verdict_authority: 'llm',
    deterministic_contract_scope: 'catalog presence and shape only',
    complete: missing.length === 0,
    missing,
    skill_count: skills.length,
    required_skill_count: requiredIds.length,
    skill_ids: skills.map((skill: any) => skill.id).filter(Boolean),
    summary: missing.length
      ? `Analysis skill catalog contract is incomplete: ${missing.slice(0, 8).join(', ')}.`
      : 'Analysis skill catalog contract is complete. The LLM controls skill selection and semantic application per repository.'
  };
}

function computeAnalysisDocumentQualityReview(doc: any): any {
  const review = doc?.report_quality_review || {};
  const checks = review?.checks || {};
  const traceRows = asList(doc?.requirements_trace).map((item: any, index: number) => {
    const requirement = String(item?.requirement || '').trim();
    return {
      id: normalizeRequirement(requirement) || `trace_${index + 1}`,
      requirement: requirement || `Trace item ${index + 1}`,
      status: String(item?.status || '').toLowerCase()
    };
  });
  const partialTraceRows = traceRows.filter(row => ['partial', 'open'].includes(row.status));
  const partialRationales = asList(review.partial_requirement_rationale || review.partial_requirement_rationales || review.accepted_limitations).map((item: any, index: number) => {
    const ref = String(item?.requirement_ref || item?.trace_ref || '').trim();
    const requirement = String(item?.requirement || '').trim();
    const id = normalizeRequirement(ref || requirement) || `partial_rationale_${index + 1}`;
    const rationaleText = [
      item?.decision_ready_rationale,
      item?.rationale,
      item?.reason,
      item?.accepted_limit,
      item?.summary,
      item?.description
    ].find(value => typeof value === 'string' && value.trim());
    const support = asList(item?.evidence).length > 0 || asList(item?.open_questions).length > 0 || asList(item?.follow_up || item?.follow_ups).length > 0;
    return {
      id,
      requirement_ref: ref,
      requirement,
      status: String(item?.status || '').toLowerCase(),
      rationale_present: !!rationaleText,
      support_present: support,
      evidence: asList(item?.evidence),
      open_questions: asList(item?.open_questions),
      follow_up: asList(item?.follow_up || item?.follow_ups)
    };
  });
  const rationaleIds = new Set(partialRationales.filter(item => item.rationale_present && item.support_present).map(item => item.id));
  const partialRowsWithoutRationale = partialTraceRows.filter(row => !rationaleIds.has(row.id));
  const suggested = [
    {
      id: 'repo_specific_information_architecture',
      label: 'Repository-specific information architecture'
    },
    {
      id: 'management_ready_decision_basis',
      label: 'Management-ready decision basis'
    },
    {
      id: 'whole_repo_first_understanding',
      label: 'Whole-repository understanding before deep dives'
    },
    {
      id: 'e2e_relationships_explained',
      label: 'E2E relationships and collaboration explained'
    },
    {
      id: 'functional_view_explained',
      label: 'Functional view explains what the system does'
    },
    {
      id: 'technical_view_explained',
      label: 'Technical view explains APIs, interfaces and architecture'
    },
    {
      id: 'four_level_model_covered',
      label: 'Four analysis levels are covered'
    },
    {
      id: 'improvements_and_refactoring_covered',
      label: 'Improvements, optimization and refactoring are covered'
    },
    {
      id: 'tool_positioning_covered',
      label: 'Tool/consulting alternative positioning is covered'
    },
    {
      id: 'evidence_and_uncertainty_visible',
      label: 'Evidence, confidence and uncertainty are visible'
    }
  ];
  const authoredChecks = Object.entries(checks || {})
    .filter(([key]) => !key.endsWith('_evidence'))
    .map(([key, value]) => ({
      id: key,
      label: suggested.find(item => item.id === key)?.label || String(key).replace(/_/g, ' '),
      verdict: value,
      present: value !== undefined && value !== null,
      evidence: asList((checks as any)[`${key}_evidence`] || review.evidence)
    }));
  const reviewer = String(review.reviewer || '').toLowerCase();
  const verdict = String(review.verdict || '').toLowerCase();
  const reviewerOk = reviewer === 'llm';
  const verdictKnown = ['decision_ready', 'partial', 'not_ready'].includes(verdict);
  const hasSummary = typeof review.summary === 'string' && review.summary.trim().length > 0;
  const hasStructuredJudgment = authoredChecks.length > 0 || asList(review.criteria).length > 0 || asList(review.findings).length > 0;
  const partialRequirementRationaleOk = verdict !== 'decision_ready' || partialRowsWithoutRationale.length === 0;
  return {
    complete: !!doc && reviewerOk && verdictKnown && hasSummary && hasStructuredJudgment && partialRequirementRationaleOk,
    reviewer: review.reviewer || '',
    verdict: review.verdict || '',
    reviewer_ok: reviewerOk,
    verdict_known: verdictKnown,
    verdict_is_decision_ready: verdict === 'decision_ready',
    summary_present: hasSummary,
    structured_judgment_present: hasStructuredJudgment,
    partial_requirement_rationale_required: verdict === 'decision_ready' && partialTraceRows.length > 0,
    partial_requirement_rationale_ok: partialRequirementRationaleOk,
    partial_requirement_rationale: partialRationales,
    partial_requirements: partialTraceRows,
    partial_requirements_without_rationale: partialRowsWithoutRationale,
    suggested,
    required: authoredChecks,
    authored_checks: authoredChecks,
    criteria: asList(review.criteria),
    findings: asList(review.findings),
    missing: [
      ...(!reviewerOk ? ['reviewer_llm'] : []),
      ...(!verdictKnown ? ['known_verdict'] : []),
      ...(!hasSummary ? ['summary'] : []),
      ...(!hasStructuredJudgment ? ['structured_judgment'] : []),
      ...(!partialRequirementRationaleOk ? ['partial_requirement_rationale'] : [])
    ],
    summary: review.summary || '',
    evidence: asList(review.evidence),
    open_questions: asList(review.open_questions)
  };
}

function computeSemanticAuthority(bundle: any): any {
  const presence = bundle.llm_output_presence || {};
  const quality = bundle.analysis_document_quality_review || {};
  const goal = bundle.analysis_document_requirements_trace_contract || bundle.analysis_document_goal_coverage || {};
  const goalTrace = bundle.analysis_goal_trace_alignment || {};
  const reportMode = bundle.report_mode || {};
  const componentContract = bundle.analysis_document_component_coverage || {};
  const pipelineContract = bundle.analysis_pipeline_contract || {};
  const skillCatalogContract = bundle.analysis_skill_catalog_contract || {};
  return {
    semantic_decider: 'llm',
    final_verdict_source: 'analysis_document.report_quality_review.verdict',
    final_verdict: quality.verdict || '',
    requirements_trace_source: 'analysis_document.requirements_trace',
    requirements_trace_complete: goal.complete === true,
    goal_trace_reference_source: 'analysis_document.requirements_trace[].goal_contract_refs',
    goal_trace_reference_contract_complete: goalTrace.complete === true,
    report_quality_review_structured: quality.complete === true,
    cli_semantic_quality_judge: false,
    human_report_source: reportMode.visible_report_source || '',
    llm_authored_artifacts: {
      analysis_document: !!presence.analysis_document,
      requirements_trace: !!presence['analysis_document.requirements_trace'],
      report_quality_review: !!presence['analysis_document.report_quality_review'],
      detail_agent_plan: bundle.llm_detail_agent_plan?.uses_pre_final_plan_artifact === true,
      detail_reviews: asList(bundle.source_family_detail_reviews).length
    },
    deterministic_contracts: [
      'analysis_goal_context_preservation',
      'analysis_goal_trace_reference_shape',
      'json_artifact_presence',
      'analysis_skill_catalog_shape',
      'file_line_evidence_validation',
      'source_inventory_accounting',
      'llm_analysis_pipeline_order',
      'pre_final_artifact_order',
      'detail_review_execution_and_integration',
      'renderer_component_contract',
      'mermaid_render_contract',
      'static_html_artifact_materialization'
    ],
    analysis_skill_catalog_contract_complete: skillCatalogContract.complete === true,
    analysis_pipeline_contract_complete: pipelineContract.complete === true,
    analysis_pipeline_kind: bundle.analysis_pipeline?.pipeline_kind || '',
    non_authoritative_navigation_artifacts: [
      'code-map.json',
      'source-capsules.json',
      'source-family-inventory.json',
      'interface-signals.json',
      'navigation-artifact-candidates.json',
      'important-docs.json',
      'tool-positioning-references.json'
    ],
    non_authoritative_goal_context_artifacts: [
      'analysis-goal-contract.json',
      'analysis-goal-trace-alignment.json'
    ],
    renderer_contract_complete: componentContract.complete === true,
    summary: 'Semantic completeness, documentation quality and decision readiness are authored by the LLM through requirements_trace and report_quality_review. The CLI validates deterministic contracts only.'
  };
}

function detailReviewFamilyId(value: any): string {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  return String(value.source_family || value.family || value.name || '').trim();
}

function extractLlmDetailAgentPlan(planDoc: any, doc: any, hasPreFinalPlanArtifact: boolean): any {
  const directPlan = planDoc?.detail_agent_plan && typeof planDoc.detail_agent_plan === 'object'
    ? planDoc.detail_agent_plan
    : planDoc;
  const directTasks = asList(directPlan?.tasks || directPlan?.detail_agent_tasks);
  if (directPlan && typeof directPlan === 'object' && (directTasks.length || directPlan.summary || directPlan.whole_repo_context || directPlan.planning_stage)) {
    const seen = new Set<string>();
    const tasks = directTasks
      .map((task: any) => {
        const sourceFamily = detailReviewFamilyId(task);
        if (!sourceFamily) return null;
        return {
          ...task,
          source_family: sourceFamily,
          authored_section: task?.authored_section || 'llm/detail-agent-plan.json',
          authored_block_title: task?.authored_block_title || String(directPlan.summary || 'LLM detail-agent plan').slice(0, 120)
        };
      })
      .filter(Boolean)
      .filter((task: any) => {
        if (seen.has(task.source_family)) return false;
        seen.add(task.source_family);
        return true;
      });
    return {
      ...directPlan,
      planning_source: hasPreFinalPlanArtifact ? 'llm/detail-agent-plan.json' : directPlan.planning_source || 'llm detail_agent_plan without required detail-agent-plan.json artifact',
      uses_pre_final_plan_artifact: hasPreFinalPlanArtifact,
      planning_decision_present: true,
      tasks,
      planned_count: tasks.length,
      evidence: asList(directPlan.evidence)
    };
  }

  const tasks: any[] = [];
  const evidence: any[] = [];
  for (const section of asList(doc?.sections)) {
    for (const block of asList(section?.blocks)) {
      if (block?.type !== 'agent_plan') continue;
      evidence.push(...asList(block.evidence));
      for (const task of asList(block.tasks || block.detail_agent_tasks)) {
        const sourceFamily = detailReviewFamilyId(task);
        if (!sourceFamily) continue;
        tasks.push({
          ...task,
          source_family: sourceFamily,
          authored_section: section.id || section.title || '',
          authored_block_title: block.title || ''
        });
      }
    }
  }
  const seen = new Set<string>();
  const deduped = tasks.filter(task => {
    if (seen.has(task.source_family)) return false;
    seen.add(task.source_family);
    return true;
  });
  return {
    planning_source: deduped.length ? 'analysis_document.sections[].blocks[type=agent_plan]' : 'missing_llm_agent_plan',
    uses_pre_final_plan_artifact: false,
    planning_decision_present: deduped.length > 0,
    tasks: deduped,
    planned_count: deduped.length,
    evidence
  };
}

function computeDetailReviewSynthesisStatus(doc: any, reviews: any[]): any {
  const executedFamilies = asList(reviews)
    .map((r: any) => detailReviewFamilyId(r))
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b));
  const uniqueExecuted = [...new Set(executedFamilies)];
  const synthesis = doc?.detail_review_synthesis || {};
  const integratedFamilies = asList(synthesis.integrated_detail_reviews)
    .map(detailReviewFamilyId)
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b));
  const integratedSet = new Set(integratedFamilies);
  const missing = uniqueExecuted.filter(family => !integratedSet.has(family));
  const extra = integratedFamilies.filter(family => !uniqueExecuted.includes(family));
  const hasDoc = !!doc && typeof doc === 'object' && Object.keys(doc).length > 0;
  const complete = hasDoc && missing.length === 0;
  const status = !hasDoc
    ? 'missing_analysis_document'
    : uniqueExecuted.length === 0
      ? 'no_executed_detail_reviews'
      : complete
        ? 'current'
        : 'stale';
  return {
    complete,
    status,
    executed_count: uniqueExecuted.length,
    integrated_count: uniqueExecuted.filter(family => integratedSet.has(family)).length,
    missing_integrations: missing,
    extra_integrations: extra,
    executed_detail_reviews: uniqueExecuted,
    integrated_detail_reviews: integratedFamilies,
    summary: synthesis.summary || (uniqueExecuted.length
      ? 'The final analysis document must explicitly integrate every executed source-family detail review.'
      : 'No source-family detail reviews have been executed yet.'),
    coverage_statement: synthesis.coverage_statement || '',
    evidence: asList(synthesis.evidence)
  };
}

function computeDetailReviewCoverage(plan: any, reviews: any[], synthesis: any): any {
  const planned = asList(plan?.tasks)
    .map((t: any) => detailReviewFamilyId(t))
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b));
  const plannedFamilies = [...new Set(planned)];
  const executedFamilies = [...new Set(asList(reviews)
    .map((r: any) => detailReviewFamilyId(r))
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b)))];
  const integratedFamilies = [...new Set(asList(synthesis?.integrated_detail_reviews)
    .map(detailReviewFamilyId)
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b)))];
  const executedSet = new Set(executedFamilies);
  const integratedSet = new Set(integratedFamilies);
  const pendingExecution = plannedFamilies.filter(family => !executedSet.has(family));
  const pendingIntegration = executedFamilies.filter(family => !integratedSet.has(family));
  const unexpectedReviews = executedFamilies.filter(family => !plannedFamilies.includes(family));
  const usesPreFinalPlanArtifact = plan?.uses_pre_final_plan_artifact === true;
  const noDetailReviewDecisionPresent = plannedFamilies.length > 0
    || plan?.no_detail_reviews_needed === true
    || asList(plan?.not_planned).length > 0;
  const planningDecisionPresent = usesPreFinalPlanArtifact && noDetailReviewDecisionPresent;
  const complete = usesPreFinalPlanArtifact
    && planningDecisionPresent
    && pendingExecution.length === 0
    && pendingIntegration.length === 0
    && unexpectedReviews.length === 0;
  const plannedCount = plannedFamilies.length;
  const executedCount = plannedFamilies.filter(family => executedSet.has(family)).length;
  const integratedCount = plannedFamilies.filter(family => integratedSet.has(family)).length;
  const status = !usesPreFinalPlanArtifact
    ? 'missing_pre_final_plan'
    : !planningDecisionPresent
      ? 'missing_detail_review_decision'
      : unexpectedReviews.length
        ? 'unexpected_detail_reviews'
        : plannedCount === 0
          ? 'no_detail_tasks_planned'
          : complete
            ? 'complete'
            : 'partial';
  return {
    complete,
    status,
    planned_count: plannedCount,
    executed_count: executedCount,
    integrated_count: integratedCount,
    execution_percent: plannedCount ? Number(((executedCount / plannedCount) * 100).toFixed(1)) : 100,
    integration_percent: plannedCount ? Number(((integratedCount / plannedCount) * 100).toFixed(1)) : 100,
    pending_execution: pendingExecution,
    pending_integration: pendingIntegration,
    unexpected_reviews: unexpectedReviews,
    planning_source: plan?.planning_source || 'missing_llm_agent_plan',
    uses_pre_final_plan_artifact: usesPreFinalPlanArtifact,
    planning_decision_present: planningDecisionPresent,
    no_detail_review_decision_present: noDetailReviewDecisionPresent,
    planned_detail_reviews: plannedFamilies,
    executed_detail_reviews: executedFamilies,
    integrated_detail_reviews: integratedFamilies,
    summary: plannedCount
      ? `${executedCount}/${plannedCount} planned source-family detail reviews executed; ${integratedCount}/${plannedCount} integrated into the LLM-authored report.`
      : noDetailReviewDecisionPresent
        ? 'The LLM detail-agent plan explicitly decided that no source-family detail tasks are needed for this repository.'
        : 'The LLM detail-agent plan did not choose detail tasks and did not explicitly justify skipping detail reviews.'
  };
}

function computeReportMode(doc: any, detailCoverage: any, synthesis: any, prerequisiteCoverage: any, qualityReview: any, goalTraceAlignment: any): any {
  const sections = Array.isArray(doc?.sections) ? doc.sections : [];
  const hasAuthoredSections = sections.length > 0;
  const authoringMode = String(doc?.authoring_mode || '').toLowerCase();
  const llmAuthored = hasAuthoredSections && authoringMode === 'llm';
  const synthesisStage = String(doc?.synthesis_stage || '').toLowerCase();
  const finalAfterDetailReviews = synthesisStage === 'final_after_detail_reviews';
  const prerequisitesComplete = prerequisiteCoverage?.complete === true;
  const qualityReviewComplete = qualityReview?.complete === true;
  const qualityReviewDecisionReady = qualityReviewComplete && qualityReview?.verdict_is_decision_ready === true;
  const goalTraceReferenceContractComplete = goalTraceAlignment?.complete === true;
  const preFinalPlanReady = detailCoverage?.uses_pre_final_plan_artifact === true && detailCoverage?.planning_decision_present === true;
  const detailReviewsComplete = detailCoverage?.complete === true;
  const detailSynthesisCurrent = synthesis?.complete === true;
  const finalSynthesisReady = llmAuthored && finalAfterDetailReviews && prerequisitesComplete && qualityReviewDecisionReady && goalTraceReferenceContractComplete && preFinalPlanReady && detailReviewsComplete && detailSynthesisCurrent;
  return {
    llm_authored: llmAuthored,
    final_synthesis_ready: finalSynthesisReady,
    synthesis_stage: doc?.synthesis_stage || '',
    final_after_detail_reviews: finalAfterDetailReviews,
    pre_final_building_blocks_complete: prerequisitesComplete,
    missing_pre_final_outputs: prerequisiteCoverage?.missing_outputs || [],
    report_quality_review_complete: qualityReviewComplete,
    report_quality_review_decision_ready: qualityReviewDecisionReady,
    missing_report_quality_checks: qualityReview?.missing || [],
    goal_trace_reference_contract_complete: goalTraceReferenceContractComplete,
    missing_goal_trace_refs: goalTraceAlignment?.missing_goal_refs || [],
    unknown_goal_trace_refs: goalTraceAlignment?.unknown_goal_refs || [],
    pre_final_detail_plan_ready: preFinalPlanReady,
    detail_reviews_complete: detailReviewsComplete,
    detail_synthesis_current: detailSynthesisCurrent,
    state: hasAuthoredSections
      ? finalSynthesisReady
        ? 'final_llm_authored_report'
        : 'llm_authored_report_needs_final_detail_synthesis'
      : 'awaiting_llm_authored_report',
    visible_report_source: hasAuthoredSections ? 'analysis_document.sections' : 'pending_notice',
    section_count: sections.length,
    message: finalSynthesisReady
      ? 'The visible human report is rendered from LLM-authored analysis_document.sections after pre-final extraction artifacts, planned detail reviews and LLM report-quality review were completed.'
      : hasAuthoredSections
      ? 'The visible human report exists, but final readiness waits for pre-final LLM building-block artifacts, synthesis_stage=final_after_detail_reviews, an LLM report-quality review with verdict=decision_ready, explicit LLM goal-trace references, a pre-final LLM detail-agent plan, planned detail-review execution and synthesis.'
      : 'The visible human report is not complete until an LLM-authored analysis_document with sections is provided.'
  };
}

function loadLlmOutputs(llmDir: string): any {
  const result: any = {};
  const outputPresence: Record<string, boolean> = {};
  result.__output_presence = outputPresence;
  if (!require('node:fs').existsSync(llmDir)) return result;
  const fs = require('node:fs');
  const files = fs.readdirSync(llmDir).filter((f: string) => f.endsWith('.json')).sort();
  for (const f of files) {
    const data = loadJson<any>(Path.join(llmDir, f), {});
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
    for (const key of ['capabilities','interfaces','flows','business_logic','findings','refactoring','modernization','integrations','side_effects']) {
      if (key in data) {
        markOutputPresence(outputPresence, key, data[key]);
        if (!Array.isArray(result[key])) result[key] = [];
        result[key].push(...asList(data[key]));
      }
    }
    for (const key of ['assessment','architecture','documentation','domain_model','data_model','process','quality','detail_agent_plan','analysis_document']) {
      if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
        markOutputPresence(outputPresence, key, data[key]);
        if (!result[key]) result[key] = {};
        mergeDict(result[key], data[key]);
      }
    }
    if (data.analysis_coverage && typeof data.analysis_coverage === 'object' && !Array.isArray(data.analysis_coverage)) {
      markOutputPresence(outputPresence, 'analysis_coverage', data.analysis_coverage);
      if (!result.analysis_coverage) result.analysis_coverage = {};
      mergeDict(result.analysis_coverage, data.analysis_coverage);
    }
    const docKeys = ['openapi','soap','request_response_examples','mermaid_flows','business_logic_examples','function_examples','contract_examples','use_case_examples'];
    if (docKeys.some(k => k in data)) {
      if (!result.documentation) result.documentation = {};
      for (const key of docKeys) {
        if (!(key in data)) continue;
        markOutputPresence(outputPresence, 'documentation', data[key]);
        markOutputPresence(outputPresence, `documentation.${key}`, data[key]);
        if (Array.isArray(data[key])) {
          if (!Array.isArray(result.documentation[key])) result.documentation[key] = [];
          result.documentation[key].push(...data[key]);
        } else if (data[key] && typeof data[key] === 'object') {
          if (!result.documentation[key] || typeof result.documentation[key] !== 'object' || Array.isArray(result.documentation[key])) result.documentation[key] = {};
          mergeDict(result.documentation[key], data[key]);
        } else {
          result.documentation[key] = data[key];
        }
      }
    }
    const aliases: [string, string][] = [
      ['business_capabilities', 'capabilities'], ['api_interfaces', 'interfaces'], ['api_docs', 'interfaces'], ['contracts', 'interfaces'], ['documentation_examples', 'documentation'],
      ['business_rules', 'business_logic'], ['domain', 'domain_model'], ['data', 'data_model'], ['operations', 'process'], ['readiness', 'process'], ['quality_assessment', 'quality'],
      ['risks', 'findings'], ['recommendations', 'refactoring']
    ];
    for (const [alias, target] of aliases) {
      if (!(alias in data)) continue;
      markOutputPresence(outputPresence, target, data[alias]);
      if (['documentation','domain_model','data_model','process','quality'].includes(target) && data[alias] && typeof data[alias] === 'object' && !Array.isArray(data[alias])) {
        if (!result[target]) result[target] = {};
        mergeDict(result[target], data[alias]);
      } else {
        if (!Array.isArray(result[target])) result[target] = [];
        result[target].push(...asList(data[alias]));
      }
    }
  }
  return result;
}

function hasOutputContent(value: any): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0 && value.some(hasOutputContent);
  if (typeof value === 'object') return Object.keys(value).length > 0 && Object.values(value).some(hasOutputContent);
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'boolean') return value;
  return true;
}

function markOutputPresence(out: Record<string, boolean>, key: string, value: any): void {
  if (!key || !hasOutputContent(value)) return;
  out[key] = true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  for (const [childKey, childValue] of Object.entries(value)) {
    markOutputPresence(out, `${key}.${childKey}`, childValue);
  }
}

function loadDetailOutputs(detailDir: string): any {
  const fs = require('node:fs');
  const reviews: any[] = [];
  const coverageItems: any[] = [];
  if (!fs.existsSync(detailDir)) return { reviews, coverageItems };
  const files = fs.readdirSync(detailDir).filter((f: string) => f.endsWith('.json')).sort();
  for (const f of files) {
    const data = loadJson<any>(Path.join(detailDir, f), {});
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
    if (data.source_family_detail_review) reviews.push(data.source_family_detail_review);
    if (data.analysis_coverage) coverageItems.push(data.analysis_coverage);
  }
  return { reviews, coverageItems };
}

function mergeCoverage(base: any, additions: any[]): any {
  const out = { ...(base || {}) };
  out.inspected_files = [...asList(out.inspected_files)];
  out.deferred_files = [...asList(out.deferred_files)];
  out.open_questions = [...asList(out.open_questions)];
  for (const item of additions || []) {
    out.inspected_files.push(...asList(item?.inspected_files));
    out.deferred_files.push(...asList(item?.deferred_files));
    out.open_questions.push(...asList(item?.open_questions));
  }
  return out;
}

function validateItems(repo: string, items: any[]): any[] {
  return items.map(item => validateNested(repo, item));
}

function validateNested(repo: string, value: any): any {
  if (Array.isArray(value)) return value.map(x => validateNested(repo, x));
  if (!value || typeof value !== 'object') return value;
  const out: any = {};
  for (const [key, v] of Object.entries(value)) {
    if (key === 'evidence' && Array.isArray(v)) out[key] = v.map(ev => validateEvidence(repo, ev));
    else out[key] = validateNested(repo, v);
  }
  return out;
}

function validateEvidence(repo: string, ev: any): any {
  if (!ev || typeof ev !== 'object') return { path: String(ev), line: 1, valid: false, reason: 'invalid evidence object' };
  const relativePath = String(ev.path || '');
  const line = Number(ev.line || 1);
  const full = Path.join(repo, relativePath);
  const fs = require('node:fs');
  if (!relativePath || relativePath.includes('..')) return { ...ev, line, valid: false, reason: 'invalid path' };
  if (!fs.existsSync(full)) return { ...ev, line, valid: false, reason: 'file not found' };
  const snippet = getLine(full, line);
  if (!snippet && line > 1) return { ...ev, line, valid: false, reason: 'line not found' };
  return { ...ev, line, valid: true, snippet };
}

function collectEvidence(value: any): any[] {
  const out: any[] = [];
  function walk(v: any): void {
    if (Array.isArray(v)) { for (const x of v) walk(x); return; }
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v.evidence)) out.push(...v.evidence);
    for (const [k, child] of Object.entries(v)) if (k !== 'evidence') walk(child);
  }
  walk(value);
  return out;
}

function dedupeEvidence(items: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const e of items) {
    const key = `${e.path || ''}:${e.line || 1}:${e.symbol || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out.sort((a, b) => String(a.path || '').localeCompare(String(b.path || '')) || Number(a.line || 1) - Number(b.line || 1));
}

function coveragePathsFromItems(items: any, kind: 'inspected' | 'deferred', inventoryPaths: Set<string>): any {
  const paths = new Set<string>();
  const invalid: any[] = [];
  const ignored: any[] = [];
  for (const item of asList(items)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      invalid.push({ kind, item, reason: 'coverage entry must be an object with path and reason' });
      continue;
    }
    const p = String(item.path || '').trim();
    const reason = String(item.reason || '').trim();
    if (!p) {
      invalid.push({ kind, item, reason: 'coverage entry missing path' });
      continue;
    }
    if (!reason) {
      invalid.push({ kind, path: p, reason: 'coverage entry missing reason' });
      continue;
    }
    if (/[*?]/.test(p)) {
      invalid.push({ kind, path: p, reason: 'coverage entry must use an exact included source-inventory file path, not a glob or pattern' });
      continue;
    }
    if (!inventoryPaths.has(p)) {
      ignored.push({ kind, path: p, reason: 'coverage entry path is outside the included source inventory and does not count for accounting' });
      continue;
    }
    paths.add(p);
  }
  return { paths, invalid, ignored };
}

function computeSourceCoverage(codeMap: any, evidenceIndex: any[], analysisCoverage: any): any {
  const files = asList(codeMap.files);
  const inventoryPaths = new Set(files.map((f: any) => String(f.path || '')).filter(Boolean));
  const evidencePaths = new Set((evidenceIndex || []).filter((e: any) => e?.valid !== false && e?.path).map((e: any) => String(e.path)));
  const inspectedCoverage = coveragePathsFromItems(analysisCoverage?.inspected_files, 'inspected', inventoryPaths);
  const deferredCoverage = coveragePathsFromItems(analysisCoverage?.deferred_files, 'deferred', inventoryPaths);
  const inspectedPaths = inspectedCoverage.paths;
  const deferredPaths = deferredCoverage.paths;
  const invalidCoverageItems = [...inspectedCoverage.invalid, ...deferredCoverage.invalid];
  const ignoredCoverageItems = [...inspectedCoverage.ignored, ...deferredCoverage.ignored];
  const coveredPaths = new Set<string>([...evidencePaths, ...inspectedPaths, ...deferredPaths]);

  const rows = files.map((f: any) => {
    let status = 'uncovered';
    if (evidencePaths.has(f.path)) status = 'evidence_backed';
    else if (inspectedPaths.has(f.path)) status = 'marked_inspected';
    else if (deferredPaths.has(f.path)) status = 'deferred';
    return {
      path: f.path,
      module: f.module,
      roles: f.roles || [],
      language: f.language,
      lines: f.lines,
      status
    };
  });
  const uncovered = rows.filter((r: any) => r.status === 'uncovered');
  const moduleMap: Record<string, any> = {};
  for (const row of rows) {
    const m = moduleMap[row.module] || { name: row.module, files: 0, covered_files: 0, uncovered_files: 0 };
    m.files += 1;
    if (row.status === 'uncovered') m.uncovered_files += 1;
    else m.covered_files += 1;
    moduleMap[row.module] = m;
  }
  const total = rows.length;
  const covered = total - uncovered.length;
  const contractComplete = uncovered.length === 0 && invalidCoverageItems.length === 0;
  return {
    contract_kind: 'source_inventory_accounting',
    semantic_verdict_authority: 'llm',
    accounting_status_meaning: 'Whether each included source file is accounted for by validated evidence, LLM analysis_coverage.inspected_files, or LLM analysis_coverage.deferred_files with a reason. This is not a deterministic judgment that every file is deeply understood or well documented.',
    deterministic_contract_scope: 'included inventory path reconciliation and structured analysis_coverage path/reason validation only',
    status: contractComplete ? 'complete' : 'partial',
    complete: contractComplete,
    scope: 'all included files from .analysis/data/source-inventory.json',
    total_files: total,
    accounted_files: covered,
    unaccounted_files: uncovered.length,
    covered_files: covered,
    uncovered_files: uncovered.length,
    evidence_backed_files: rows.filter((r: any) => r.status === 'evidence_backed').length,
    explicitly_inspected_files: inspectedPaths.size,
    deferred_files: deferredPaths.size,
    invalid_coverage_items: invalidCoverageItems.length,
    invalid_coverage_item_examples: invalidCoverageItems.slice(0, 80),
    ignored_out_of_scope_coverage_items: ignoredCoverageItems.length,
    ignored_out_of_scope_coverage_item_examples: ignoredCoverageItems.slice(0, 80),
    skipped_files: asList(codeMap.skipped_files).length,
    inventory_accounting_percent: total ? Math.round((covered / total) * 1000) / 10 : 100,
    coverage_percent: total ? Math.round((covered / total) * 1000) / 10 : 100,
    modules: Object.values(moduleMap).sort((a: any, b: any) => b.uncovered_files - a.uncovered_files || String(a.name).localeCompare(String(b.name))),
    uncovered: uncovered.slice(0, 500),
    skipped: asList(codeMap.skipped_files).slice(0, 200),
    rules: [
      'A file is accounted for when it has validated evidence, appears in analysis_coverage.inspected_files, or appears in analysis_coverage.deferred_files with a reason.',
      'analysis_coverage entries must be objects with exact included inventory paths and non-empty reasons; strings, globs and patterns are invalid, while exact paths outside the included source inventory are ignored for accounting.',
      'Source inventory accounting does not decide semantic completeness, documentation quality or management readiness.',
      'Source capsules and code-map rankings do not count as semantic understanding by themselves.',
      'Skipped files are reported separately because they exceeded the configured max file size before semantic extraction.'
    ]
  };
}

function hasAssessmentContent(llm: any): boolean {
  return !!(llm.assessment && Object.keys(llm.assessment).length) || !!(llm.domain_model && Object.keys(llm.domain_model).length) || !!(llm.process && Object.keys(llm.process).length);
}

function hasDocContent(doc: any): boolean {
  if (!doc || typeof doc !== 'object') return false;
  return ['openapi','soap','request_response_examples','mermaid_flows','business_logic_examples','function_examples','contract_examples'].some(k => asList(doc[k]).length > 0);
}

function fallbackAssessment(codeMap: any): any {
  return {
    executive_summary: 'Semantic extraction is pending. Run Codex with the codebase-assessment skill to populate business logic, interfaces, examples, flows, process readiness and refactoring data.',
    system_purpose: 'Pending LLM extraction.',
    assessment_scope: ['Repository profile', 'Code map', 'documentation and contract candidates'],
    key_capabilities: [], key_interfaces: [], top_risks: [],
    functional_view: {},
    technical_view: {},
    decision_basis: {},
    tool_positioning: {},
    completeness: { business_logic: 'pending', interfaces: 'pending', flows: 'pending', examples: 'pending', process_readiness: 'pending' },
    recommended_next_steps: [{ title: 'Run the main Codex skill', reason: 'Execute .analysis/llm_tasks and write JSON to .analysis/llm/.', evidence: [] }],
    open_questions: ['Business behavior has not yet been extracted by Codex.']
  };
}

function fallbackArchitecture(codeMap: any): any {
  return { summary: 'Pending LLM architecture assessment. The code map lists modules and signals as navigation hints only.', style: codeMap.profile?.repo_type || 'unknown', modules: (codeMap.modules || []).slice(0, 12), observations: [], mermaid: '' };
}

function fallbackDomainModel(codeMap: any): any {
  return { glossary: [], entities: [], state_models: [] };
}

function fallbackDataModel(codeMap: any): any {
  return { entities: [], stores: [], state_changes: [] };
}

function fallbackProcess(codeMap: any): any {
  return { summary: 'Pending process/readiness extraction.', tests: { status: (codeMap.profile?.test_files || 0) > 0 ? 'partial' : 'unknown', evidence: [], observations: [] }, ci_cd: { status: 'unknown', evidence: [], observations: [] }, release: { status: 'unknown', evidence: [], observations: [] }, observability: { status: 'unknown', evidence: [], observations: [] }, configuration: { status: 'unknown', evidence: [], observations: [] }, local_setup: { status: 'unknown', evidence: [], observations: [] }, open_questions: [] };
}

function fallbackQuality(codeMap: any): any {
  return { summary: 'Pending quality/readiness assessment.', strengths: [], risks: [], testability: [] };
}

function fallbackDocumentation(codeMap: any): any {
  return { summary: 'Pending documentation/example extraction.', openapi: [], soap: [], request_response_examples: [], mermaid_flows: [], business_logic_examples: [], function_examples: [], report_completeness_notes: [] };
}

function fallbackAnalysisCoverage(codeMap: any): any {
  return {
    summary: 'Pending whole-codebase coverage accounting.',
    inspected_files: [],
    deferred_files: [],
    open_questions: ['Codex has not yet recorded which files from the source inventory were semantically inspected or explicitly deferred.']
  };
}

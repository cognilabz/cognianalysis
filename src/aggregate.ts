import { CodeMap } from './types';
import { FS, Path, asList, cleanId, countLines, ensureDir, getLine, gitCommit, loadJson, mergeDict, sha1Short, utcNow, writeJson } from './utils';
import { computeTargetCoverage, TARGET_CAPABILITIES } from './targetCoverage';
import { reportComponentLibraryArtifact, supportedReportComponentTypes } from './reportComponents';
import { analysisPipelineArtifact, computeAnalysisPipelineContract } from './analysisPipeline';
import { analysisSkillCatalogArtifact, analysisSkillIds } from './analysisSkills';
import { computeFinalLlmReadiness } from './readiness';
import { analysisGoalContractArtifact } from './analysisGoal';
import { toolPositioningReferencesArtifact } from './toolPositioningReferences';
import { sourceTierBacklogArtifact, sourceTierModelArtifact } from './sourceTiers';
import { SKILL_WORKBENCH_VERSION } from './skillWorkbenches';

function isCodexLlmAuthority(value: any): boolean {
  const normalized = String(value || '').toLowerCase();
  return normalized === 'codex_llm' || normalized === 'llm';
}

export function prepareAnalysis(repo: string, analysisDir: string, codeMap: CodeMap): void {
  const dataDir = Path.join(analysisDir, 'data');
  ensureDir(dataDir);
  writeJson(Path.join(dataDir, 'repo-profile.json'), codeMap.profile);
  writeJson(Path.join(dataDir, 'analysis-scope.json'), normalizeAnalysisScope(codeMap.analysis_scope, codeMap));
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
  writeJson(Path.join(dataDir, 'source-tier-model.json'), sourceTierModelArtifact());
  writeJson(Path.join(dataDir, 'report-component-library.json'), reportComponentLibraryArtifact());
  writeJson(Path.join(dataDir, 'analysis-skill-catalog.json'), analysisSkillCatalogArtifact());
  writeJson(Path.join(dataDir, 'analysis-run.json'), analysisRunSeed(repo, analysisDir, codeMap.profile));
  writeJson(Path.join(dataDir, 'target-coverage.json'), TARGET_CAPABILITIES);
}

export function aggregate(repo: string, analysisDir: string): any {
  const dataDir = Path.join(analysisDir, 'data');
  const codeMap = loadJson<any>(Path.join(dataDir, 'code-map.json'), {});
  const profile = codeMap.profile || { repo_name: Path.basename(repo), root: repo };
  const analysisScope = normalizeAnalysisScope(
    loadJson<any>(Path.join(dataDir, 'analysis-scope.json'), codeMap.analysis_scope || defaultAnalysisScope(codeMap)),
    codeMap
  );
  const llm = loadLlmOutputs(Path.join(analysisDir, 'llm'));
  const llmOutputPresence = llm.__output_presence || {};
  delete llm.__output_presence;
  const analysisStrategyArtifact = loadJson<any | null>(Path.join(analysisDir, 'llm', 'analysis-strategy.json'), null);
  const detailAgentPlanArtifact = loadJson<any | null>(Path.join(analysisDir, 'llm', 'detail-agent-plan.json'), null);
  const detail = loadDetailOutputs(Path.join(analysisDir, 'detail_reviews'));
  const skillWorkbench = loadSkillWorkbenchOutputs(Path.join(analysisDir, 'skill_reviews'));
  const sourceTier = loadSourceTierOutputs(Path.join(analysisDir, 'source_tiers'));
  const sourceFamilyInventory = loadJson<any>(Path.join(dataDir, 'source-family-inventory.json'), {});
  const detailTaskManifest = loadJson<any>(Path.join(analysisDir, 'detail-task-manifest.json'), { tasks: [] });
  const skillWorkbenchTaskManifest = loadJson<any>(Path.join(analysisDir, 'skill-workbench-task-manifest.json'), { tasks: [] });
  const sourceTierTaskManifest = loadJson<any>(Path.join(analysisDir, 'source-tier-task-manifest.json'), { tasks: [] });
  const capabilityTemplateManifest = loadJson<any>(Path.join(analysisDir, 'capability-template-manifest.json'), { templates: [] });
  const productAnalysisRequest = loadJson<any | null>(Path.join(dataDir, 'product-analysis-request.json'), null);
  const analysisRun = analysisRunSeed(repo, analysisDir, profile);

  const assessment = llm.assessment || null;
  const capabilities = asList(llm.capabilities);
  const interfaces = asList(llm.interfaces);
  const flows = asList(llm.flows);
  const businessLogic = asList(llm.business_logic);
  const domainModel = llm.domain_model || null;
  const dataModel = llm.data_model || null;
  const integrations = asList(llm.integrations);
  const sideEffects = asList(llm.side_effects);
  const architecture = llm.architecture || null;
  const process = llm.process || null;
  const quality = llm.quality || null;
  const findings = asList(llm.findings);
  const refactoring = asList(llm.refactoring);
  const modernization = asList(llm.modernization);
  const documentation = llm.documentation || {};
  const analysisStrategy = analysisStrategyArtifact?.analysis_strategy || analysisStrategyArtifact || llm.analysis_strategy || null;
  const analysisDocument = llm.analysis_document || null;
  const detailAgentPlan = detailAgentPlanArtifact?.detail_agent_plan || detailAgentPlanArtifact || llm.detail_agent_plan || null;
  const hasAnalysisStrategyArtifact = !!analysisStrategyArtifact && typeof analysisStrategyArtifact === 'object' && !Array.isArray(analysisStrategyArtifact);
  const hasDetailAgentPlanArtifact = !!detailAgentPlanArtifact && typeof detailAgentPlanArtifact === 'object' && !Array.isArray(detailAgentPlanArtifact);
  const analysisCoverage = validateNested(repo, mergeCoverage(llm.analysis_coverage || pendingAnalysisCoverage(), [...skillWorkbench.coverageItems, ...detail.coverageItems]));

  const hasLlmAuthoredOutput = hasLlmAuthoredOutputPresence(llmOutputPresence, sourceTier.reviews, detail.reviews);
  const status = hasLlmAuthoredOutput
    ? { state: 'llm_extracted', message: 'Codex-authored LLM analysis artifacts are present. Semantic completeness and readiness still come only from analysis_document.requirements_trace and analysis_document.report_quality_review.' }
    : { state: 'awaiting_llm_extraction', message: 'Codex-authored LLM extraction has not been run yet. The report shows inventory-only repo map data, unscored target capability context and source capsules only. Imports, symbols, frameworks, contracts, examples, relationships and semantics must be parsed by Codex from source.' };

  const taskManifest = loadJson<any>(Path.join(analysisDir, 'task-manifest.json'), { tasks: [], capability_templates: [] });
  const manifestTasks = asList(taskManifest.tasks);
  const tasks = manifestTasks.filter(isRequiredWorkflowTask);
  const capabilityTemplates = asList(taskManifest.capability_templates || capabilityTemplateManifest.templates);
  const normalizedCapabilityTemplates = capabilityTemplates.length
    ? capabilityTemplates
    : manifestTasks.filter((task: any) => !isRequiredWorkflowTask(task)).map(legacyTaskToCapabilityTemplate);
  const analysisPipeline = analysisPipelineArtifact(tasks, normalizedCapabilityTemplates);
  const bundle: any = {
    profile,
    status,
    modules: codeMap.modules || [],
    files: (codeMap.files || []).slice(0, 1200),
    signals: (codeMap.signals || []).slice(0, 3000),
    symbols: (codeMap.symbols || []).slice(0, 5000),
    glossary_terms: codeMap.glossary_terms || [],
    capsules: codeMap.capsules || [],
    navigation_policy: codeMap.navigation_policy || {},
    extraction_policy: codeMap.extraction_policy || {},
    artifact_navigation_candidates: codeMap.artifact_navigation_candidates || codeMap.important_docs || [],
    important_docs: codeMap.important_docs || [],
    analysis_goal_contract: analysisGoalContractArtifact(),
    tool_positioning_references: toolPositioningReferencesArtifact(),
    report_component_library: reportComponentLibraryArtifact(),
    product_analysis_request: productAnalysisRequest,
    analysis_skill_catalog: analysisSkillCatalogArtifact(),
    analysis_run: analysisRun,
    analysis_scope: analysisScope,
    orchestration_execution_log: loadJson<any>(Path.join(dataDir, 'orchestration-execution-log.json'), {}),
    cache_ledger: loadJson<any>(Path.join(dataDir, 'cache-ledger.json'), {}),
    parallel_execution_proof: loadJson<any>(Path.join(dataDir, 'parallel-execution-proof.json'), {}),
    cache_reuse_proof: loadJson<any>(Path.join(dataDir, 'cache-reuse-proof.json'), {}),
    source_tier_model: sourceTierModelArtifact(),
    source_tier_task_manifest: validateNested(repo, sourceTierTaskManifest),
    source_tier_workpack_executions: sourceTier.workpackExecutions || [],
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
    llm_analysis_strategy: validateNested(repo, extractLlmAnalysisStrategy(analysisStrategy, hasAnalysisStrategyArtifact)),
    analysis_strategy: validateNested(repo, analysisStrategy),
    analysis_document: validateNested(repo, analysisDocument),
    detail_agent_plan: validateNested(repo, detailAgentPlan),
    llm_skill_workbench_plan: validateNested(repo, extractLlmSkillWorkbenchPlan(analysisStrategy, skillWorkbenchTaskManifest, hasAnalysisStrategyArtifact)),
    llm_detail_agent_plan: validateNested(repo, extractLlmDetailAgentPlan(detailAgentPlan, analysisDocument, hasDetailAgentPlanArtifact)),
    source_family_inventory: validateNested(repo, sourceFamilyInventory),
    detail_task_manifest: validateNested(repo, detailTaskManifest),
    skill_workbench_task_manifest: validateNested(repo, skillWorkbenchTaskManifest),
    capability_template_manifest: validateNested(repo, normalizeCapabilityTemplateManifest(capabilityTemplateManifest, normalizedCapabilityTemplates)),
    capability_templates: validateItems(repo, normalizedCapabilityTemplates),
    source_file_tier_reviews: validateItems(repo, sourceTier.reviews),
    skill_workbench_reviews: validateItems(repo, skillWorkbench.reviews),
    source_family_detail_reviews: validateItems(repo, detail.reviews),
    external_findings: validateItems(repo, loadExternalFindings(analysisDir)),
    analysis_coverage: analysisCoverage,
    tasks,
    tooling: computeToolingCapabilities(),
    report_artifacts: computeReportArtifacts(analysisDir)
  };
  bundle.llm_output_presence = llmOutputPresence;

  let evidence: any[] = [];
  for (const key of ['capabilities','interfaces','flows','business_logic','integrations','side_effects','findings','refactoring','modernization','external_findings']) evidence = evidence.concat(collectEvidence(bundle[key] || []));
  for (const key of ['assessment','domain_model','data_model','architecture','process','quality','documentation','analysis_strategy','detail_agent_plan','analysis_document','source_file_tier_reviews','skill_workbench_reviews','source_family_detail_reviews','analysis_coverage']) evidence = evidence.concat(collectEvidence(bundle[key] || {}));
  bundle.evidence_index = dedupeEvidence(evidence);
  bundle.source_tier_coverage = computeSourceTierCoverage(codeMap, bundle.source_file_tier_reviews, bundle.source_tier_task_manifest);
  bundle.source_tier_backlog = sourceTierBacklogArtifact(analysisDir);
  bundle.source_inventory_accounting = computeSourceCoverage(codeMap, bundle.evidence_index, bundle.analysis_coverage);
  bundle.source_coverage = bundle.source_inventory_accounting;
  bundle.analysis_document_requirements_trace_contract = computeAnalysisDocumentRequirementsTraceContract(bundle.analysis_document);
  bundle.analysis_document_goal_coverage = bundle.analysis_document_requirements_trace_contract;
  bundle.analysis_goal_trace_alignment = computeAnalysisGoalTraceAlignment(bundle.analysis_goal_contract, bundle.analysis_document);
  bundle.analysis_document_component_coverage = computeAnalysisDocumentComponentCoverage(bundle.analysis_document, bundle.profile, bundle.modules);
  bundle.analysis_document_quality_review = computeAnalysisDocumentQualityReview(bundle.analysis_document);
  bundle.analysis_document_report_lint = computeAnalysisDocumentReportLint(bundle.analysis_document);
  bundle.analysis_document_executive_decision_layer = computeAnalysisDocumentExecutiveDecisionLayer(bundle.analysis_document);
  bundle.analysis_document_consistency_review = computeAnalysisDocumentConsistencyReview(bundle.analysis_document);
  bundle.analysis_document_evidence_strength = computeAnalysisDocumentEvidenceStrength(bundle.analysis_document);
  bundle.analysis_document_semantic_lineage = computeAnalysisDocumentSemanticLineage(bundle.analysis_document, bundle);
  bundle.analysis_document_open_questions = computeAnalysisDocumentOpenQuestions(bundle.analysis_document);
  bundle.external_findings_contract = computeExternalFindingsContract(bundle.external_findings);
  bundle.analysis_staleness = computeAnalysisStaleness(repo, bundle.profile);
  bundle.llm_artifacts = computeLlmArtifactStatus(analysisDir, bundle.tasks);
  bundle.analysis_document_prerequisite_coverage = computeAnalysisDocumentPrerequisiteCoverage(bundle.llm_artifacts);
  bundle.skill_workbench_coverage = computeSkillWorkbenchCoverage(bundle.llm_skill_workbench_plan, bundle.skill_workbench_reviews, bundle.skill_workbench_task_manifest, bundle.source_tier_coverage, bundle.product_analysis_request);
  bundle.analysis_document_skill_workbench_synthesis = computeSkillWorkbenchSynthesisStatus(bundle.analysis_document, bundle.skill_workbench_reviews);
  bundle.analysis_document_detail_review_synthesis = computeDetailReviewSynthesisStatus(bundle.analysis_document, bundle.source_family_detail_reviews);
  bundle.source_family_detail_review_coverage = computeDetailReviewCoverage(bundle.llm_detail_agent_plan, bundle.source_family_detail_reviews, bundle.analysis_document_detail_review_synthesis);
  bundle.report_mode = computeReportMode(bundle.analysis_document, bundle.source_family_detail_review_coverage, bundle.analysis_document_detail_review_synthesis, bundle.analysis_document_skill_workbench_synthesis, bundle.analysis_document_prerequisite_coverage, bundle.analysis_document_quality_review, bundle.analysis_goal_trace_alignment);
  bundle.analysis_pipeline_contract = computeAnalysisPipelineContract(bundle);
  bundle.analysis_skill_catalog_contract = computeAnalysisSkillCatalogContract(bundle.analysis_skill_catalog);
  bundle.analysis_run_provenance = computeAnalysisRunProvenance(analysisDir, bundle.analysis_run);
  bundle.artifact_dependency_graph = computeArtifactDependencyGraph(analysisDir, bundle.analysis_run);
  bundle.product_analysis_request_freshness = computeProductAnalysisRequestFreshness(analysisDir);
  bundle.semantic_authority = computeSemanticAuthority(bundle);
  bundle.product_artifact_model = computeProductArtifactModel(bundle);
  bundle.simplified_harness_contract = computeSimplifiedHarnessContract(bundle);
  bundle.parallel_orchestration_contract = computeParallelOrchestrationContract(bundle);
  bundle.final_llm_readiness = computeFinalLlmReadiness(bundle);
  bundle.target_coverage = computeTargetCoverage(bundle);
  bundle.target_artifact_contract_coverage = bundle.target_coverage;

  ensureDir(dataDir);
  writeJson(Path.join(dataDir, 'analysis-goal-contract.json'), bundle.analysis_goal_contract);
  writeJson(Path.join(dataDir, 'analysis-scope.json'), bundle.analysis_scope);
  writeJson(Path.join(dataDir, 'tool-positioning-references.json'), bundle.tool_positioning_references);
  writeJson(Path.join(dataDir, 'report-component-library.json'), bundle.report_component_library);
  writeJson(Path.join(dataDir, 'analysis-skill-catalog.json'), bundle.analysis_skill_catalog);
  writeJson(Path.join(dataDir, 'analysis-run.json'), bundle.analysis_run);
  writeJson(Path.join(dataDir, 'capability-template-manifest.json'), bundle.capability_template_manifest);
  writeJson(Path.join(dataDir, 'source-tier-model.json'), bundle.source_tier_model);
  writeJson(Path.join(dataDir, 'source-tier-coverage.json'), bundle.source_tier_coverage);
  writeJson(Path.join(dataDir, 'source-tier-backlog.json'), bundle.source_tier_backlog);
  writeJson(Path.join(dataDir, 'skill-workbench-coverage.json'), bundle.skill_workbench_coverage);
  writeJson(Path.join(dataDir, 'analysis-pipeline.json'), bundle.analysis_pipeline);
  writeJson(Path.join(analysisDir, 'analysis-pipeline.json'), bundle.analysis_pipeline);
  writeJson(Path.join(dataDir, 'analysis-goal-trace-alignment.json'), bundle.analysis_goal_trace_alignment);
  writeJson(Path.join(dataDir, 'analysis-document-report-lint.json'), bundle.analysis_document_report_lint);
  writeJson(Path.join(dataDir, 'analysis-document-executive-decision-layer.json'), bundle.analysis_document_executive_decision_layer);
  writeJson(Path.join(dataDir, 'analysis-document-consistency-review.json'), bundle.analysis_document_consistency_review);
  writeJson(Path.join(dataDir, 'analysis-document-evidence-strength.json'), bundle.analysis_document_evidence_strength);
  writeJson(Path.join(dataDir, 'analysis-document-semantic-lineage.json'), bundle.analysis_document_semantic_lineage);
  writeJson(Path.join(dataDir, 'analysis-document-open-questions.json'), bundle.analysis_document_open_questions);
  writeJson(Path.join(dataDir, 'external-findings.json'), bundle.external_findings_contract);
  writeJson(Path.join(dataDir, 'analysis-run-provenance.json'), bundle.analysis_run_provenance);
  writeJson(Path.join(dataDir, 'artifact-dependency-graph.json'), bundle.artifact_dependency_graph);
  writeJson(Path.join(dataDir, 'product-analysis-request-freshness.json'), bundle.product_analysis_request_freshness);
  writeJson(Path.join(dataDir, 'product-artifact-model.json'), bundle.product_artifact_model);
  writeJson(Path.join(dataDir, 'simplified-harness-contract.json'), bundle.simplified_harness_contract);
  writeJson(Path.join(dataDir, 'parallel-orchestration-contract.json'), bundle.parallel_orchestration_contract);
  writeJson(Path.join(dataDir, 'analysis-staleness.json'), bundle.analysis_staleness);
  writeJson(Path.join(dataDir, 'bundle.json'), bundle);
  writeJson(Path.join(dataDir, 'evidence.json'), bundle.evidence_index);
  writeJson(Path.join(dataDir, 'source-inventory-accounting.json'), bundle.source_inventory_accounting);
  writeJson(Path.join(dataDir, 'target-coverage.json'), bundle.target_coverage);
  writeJson(Path.join(dataDir, 'target-artifact-contract-coverage.json'), bundle.target_artifact_contract_coverage);
  return bundle;
}

function defaultAnalysisScope(codeMap: any): any {
  return {
    mode: codeMap.profile?.analysis_scope_mode || 'complete',
    selected_files: (codeMap.files || []).length,
    deferred_files: Number(codeMap.profile?.scope_deferred_files || 0),
    confidence_impact: Number(codeMap.profile?.scope_deferred_files || 0) > 0 ? 'visible_scope_limit' : 'low',
    summary: Number(codeMap.profile?.scope_deferred_files || 0) > 0
      ? 'Scope was reconstructed from the code map profile; deferred count should be disclosed.'
      : 'Complete source inventory scope reconstructed from the code map.'
  };
}

function normalizeAnalysisScope(scope: any, codeMap: any): any {
  const fallback = defaultAnalysisScope(codeMap);
  const selected = Number(scope?.selected_files);
  const deferred = Number(scope?.deferred_files);
  const mode = String(scope?.mode || '').trim();
  return {
    ...fallback,
    ...(scope && typeof scope === 'object' && !Array.isArray(scope) ? scope : {}),
    mode: mode || fallback.mode,
    selected_files: Number.isFinite(selected) && selected > 0 ? selected : fallback.selected_files,
    deferred_files: Number.isFinite(deferred) && deferred >= 0 ? deferred : fallback.deferred_files,
    confidence_impact: String(scope?.confidence_impact || '').trim() || fallback.confidence_impact,
    summary: String(scope?.summary || '').trim() || fallback.summary
  };
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
    public_cli_commands: ['analyze', 'status', 'open', 'eval'],
    internal_cli_commands: ['dev resume', 'dev repair', 'dev init-harness', 'dev init-codex', 'dev mcp', 'dev prepare', 'dev finalize', 'dev audit-report', 'dev aggregate', 'dev coverage', 'dev render', 'dev validate', 'dev tier-status', 'dev tier-next', 'dev tier-context', 'dev run-orchestration', 'dev prove-orchestration', 'dev doctor', 'dev portfolio', 'dev run', 'dev init'],
    compatibility_cli_commands: ['resume', 'repair', 'init-harness', 'init-codex', 'mcp', 'run', 'init', 'prepare', 'finalize', 'finish', 'report', 'audit-report', 'aggregate', 'coverage', 'render', 'validate', 'tier-status', 'tier-next', 'tier-context', 'doctor', 'portfolio'],
    portfolio_mode_available: true,
    harness_portability_available: true,
    product_mode_available: true,
    report_renderer_available: true,
    summary: 'Deterministic CLI capabilities available in this Cognianalysis build.'
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

function commandSet(value: any): Set<string> {
  return new Set(asList(value).map((item: any) => String(item || '').trim()).filter(Boolean));
}

function missingCommands(actual: Set<string>, expected: string[]): string[] {
  return expected.filter(command => !actual.has(command));
}

function computeProductArtifactModel(bundle: any): any {
  const publicCommands = commandSet(bundle.tooling?.public_cli_commands);
  const requiredPublicCommands = ['analyze', 'status', 'open', 'eval'];
  const requiredArtifacts = [
    'data/product-analysis-request.json',
    'TASK.md',
    'llm/analysis-strategy.json',
    'source_tiers/*.json',
    'skill_reviews/*.json',
    'llm/detail-agent-plan.json',
    'detail_reviews/*.json',
    'llm/analysis-document.json',
    'data/bundle.json',
    'report/index.html'
  ];
  const checks = [
    { id: 'public_commands', ready: missingCommands(publicCommands, requiredPublicCommands).length === 0, evidence: [...publicCommands].join(',') },
    { id: 'product_request', ready: bundle.product_analysis_request?.entrypoint === 'analyze', evidence: String(bundle.product_analysis_request?.entrypoint || 'missing') },
    { id: 'task_guide_model', ready: asList(bundle.tasks).length > 0 && bundle.analysis_pipeline?.pipeline_kind === 'llm_driven_overview_detail_final_report', evidence: `tasks=${asList(bundle.tasks).length}` },
    { id: 'llm_artifacts', ready: bundle.llm_artifacts?.complete === true, evidence: `ready=${bundle.llm_artifacts?.ready_count || 0}/${bundle.llm_artifacts?.total_count || 0}` },
    { id: 'source_tier_artifacts', ready: bundle.source_tier_task_manifest?.task_count > 0 && bundle.source_tier_coverage?.complete === true, evidence: `tasks=${bundle.source_tier_task_manifest?.task_count || 0}, coverage=${bundle.source_tier_coverage?.complete === true}` },
    { id: 'skill_workbench_artifacts', ready: bundle.skill_workbench_coverage?.complete === true, evidence: `executed=${bundle.skill_workbench_coverage?.executed_count || 0}/${bundle.skill_workbench_coverage?.planned_count || 0}` },
    { id: 'detail_review_artifacts', ready: bundle.source_family_detail_review_coverage?.complete === true, evidence: `executed=${bundle.source_family_detail_review_coverage?.executed_count || 0}/${bundle.source_family_detail_review_coverage?.planned_count || 0}` },
    { id: 'report_artifacts', ready: bundle.report_artifacts?.index_html === true && bundle.report_artifacts?.analysis_data_json === true, evidence: `index=${bundle.report_artifacts?.index_html === true}, data=${bundle.report_artifacts?.analysis_data_json === true}` },
    { id: 'component_library', ready: bundle.report_component_library?.library_kind === 'analysis_document_component_library', evidence: String(bundle.report_component_library?.library_kind || 'missing') },
    { id: 'original_goal_contract', ready: !!bundle.analysis_goal_contract?.contract_kind, evidence: String(bundle.analysis_goal_contract?.contract_kind || 'missing') },
    { id: 'semantic_authority', ready: bundle.semantic_authority?.semantic_decider === 'codex_llm', evidence: String(bundle.semantic_authority?.semantic_decider || 'missing') }
  ];
  const missing = checks.filter(check => !check.ready).map(check => check.id);
  return {
    contract_kind: 'product_artifact_model',
    model: 'thin_llm_first_harness',
    complete: missing.length === 0,
    deterministic_contract_scope: 'Verifies the user-facing artifact model is thin and materialized: product request, one task guide, LLM-authored facts/reviews/report, deterministic bundle/evidence/report outputs and dev-only internals. It does not judge semantic report quality.',
    checks,
    public_commands: requiredPublicCommands,
    hidden_or_dev_scoped_commands: asList(bundle.tooling?.internal_cli_commands),
    compatibility_aliases: asList(bundle.tooling?.compatibility_cli_commands),
    required_artifact_families: requiredArtifacts,
    visible_report_source: 'analysis_document.sections',
    semantic_authority: bundle.semantic_authority?.semantic_decider || 'llm',
    missing,
    summary: missing.length
      ? `Thin artifact model is incomplete: ${missing.slice(0, 6).join(', ')}.`
      : 'Thin LLM-first artifact model is present: users operate analyze/status/open/eval while detailed workflow artifacts stay under the harness workspace.'
  };
}

function computeSimplifiedHarnessContract(bundle: any): any {
  const publicCommands = commandSet(bundle.tooling?.public_cli_commands);
  const internalCommands = asList(bundle.tooling?.internal_cli_commands).map((item: any) => String(item || ''));
  const compatibilityCommands = asList(bundle.tooling?.compatibility_cli_commands).map((item: any) => String(item || ''));
  const requiredPublicCommands = ['analyze', 'status', 'open', 'eval'];
  const checks = [
    {
      id: 'single_product_entrypoint',
      ready: publicCommands.has('analyze') && bundle.product_analysis_request?.entrypoint === 'analyze',
      evidence: `entrypoint=${bundle.product_analysis_request?.entrypoint || 'missing'}`
    },
    {
      id: 'small_public_surface',
      ready: requiredPublicCommands.every(command => publicCommands.has(command)) && publicCommands.size === requiredPublicCommands.length,
      evidence: `public=${[...publicCommands].join(',') || 'missing'}`
    },
    {
      id: 'dev_namespace_for_internal_flow',
      ready: internalCommands.length > 0 && internalCommands.every(command => command.startsWith('dev ')),
      evidence: `internal=${internalCommands.length}`
    },
    {
      id: 'compatibility_aliases_separated',
      ready: compatibilityCommands.length > 0 && compatibilityCommands.some(command => command === 'run'),
      evidence: `aliases=${compatibilityCommands.length}`
    },
    {
      id: 'single_harness_task_guide',
      ready: asList(bundle.tasks).length > 0 && bundle.analysis_pipeline_contract?.complete === true,
      evidence: `tasks=${asList(bundle.tasks).length}, pipeline=${bundle.analysis_pipeline_contract?.complete === true}`
    },
    {
      id: 'deterministic_layer_not_semantic_authority',
      ready: bundle.semantic_authority?.semantic_decider === 'codex_llm',
      evidence: `semantic_decider=${bundle.semantic_authority?.semantic_decider || 'missing'}`
    }
  ];
  const missing = checks.filter(check => !check.ready).map(check => check.id);
  return {
    contract_kind: 'simplified_harness_contract',
    complete: missing.length === 0,
    deterministic_contract_scope: 'Checks the product surface and workflow shape only: one public entrypoint, small public command set, dev-scoped internals, compatibility aliases kept separate and LLM semantic authority explicit.',
    checks,
    missing,
    public_loop: ['analyze', 'status', 'open', 'eval'],
    harness_work_area: '.analysis',
    summary: missing.length
      ? `Simplified harness contract is incomplete: ${missing.join(', ')}.`
      : 'Simplified harness contract is proven for the generated workspace.'
  };
}

function artifactHashSet(bundle: any): Set<string> {
  return new Set(asList(bundle.artifact_dependency_graph?.nodes)
    .map((node: any) => String(node?.content_hash || '').trim())
    .filter(Boolean));
}

function artifactHashesByPath(bundle: any): Map<string, string> {
  return new Map(asList(bundle.artifact_dependency_graph?.nodes)
    .map((node: any) => [String(node?.path || '').trim(), String(node?.content_hash || '').trim()])
    .filter((entry: string[]) => entry[0] && entry[1]) as [string, string][]);
}

function graphNodeFresh(bundle: any, id: string): boolean {
  const node = asList(bundle.artifact_dependency_graph?.nodes).find((item: any) => String(item?.id || '') === id);
  return node?.fresh === true;
}

function hasOverlappingWorkerWindows(tasks: any[]): boolean {
  const windows = tasks.map((task: any) => ({
    start: Date.parse(String(task?.started_at || '')),
    end: Date.parse(String(task?.ended_at || ''))
  })).filter(window => Number.isFinite(window.start) && Number.isFinite(window.end) && window.end > window.start);
  for (let i = 0; i < windows.length; i += 1) {
    for (let j = i + 1; j < windows.length; j += 1) {
      if (windows[i].start < windows[j].end && windows[j].start < windows[i].end) return true;
    }
  }
  return false;
}

function stableJson(value: any): string {
  if (Array.isArray(value)) return `[${value.map(item => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashStable(value: any, length = 20): string {
  return sha1Short(stableJson(value), length);
}

function sourceTierWorkpackTaskContextHash(task: any): string {
  return hashStable({
    task_id: String(task?.id || '').trim(),
    task_file: String(task?.task_file || '').trim(),
    expected_output: String(task?.expected_output || '').trim(),
    file_paths: asList(task?.file_paths).map((path: any) => String(path || '').trim()).filter(Boolean).sort()
  });
}

function validateOrchestrationExecutionLog(bundle: any): any {
  const log = bundle.orchestration_execution_log || {};
  const runnerGeneratedBy = 'cognianalysis dev run-orchestration';
  const executionMode = 'codex_authored_workpack_receipt_validation';
  const workpackExecutionKind = 'codex_in_session_source_tier_workpack';
  const hashesByPath = artifactHashesByPath(bundle);
  const sourceTierTasks = asList(bundle.source_tier_task_manifest?.tasks);
  const tasksById = new Map<string, any>(sourceTierTasks
    .map((task: any) => [String(task?.id || '').trim(), task])
    .filter((entry: any[]) => entry[0]) as [string, any][]);
  const executionsByTask = new Map<string, any>(asList(bundle.source_tier_workpack_executions)
    .map((receipt: any) => [String(receipt?.task_id || '').trim(), receipt])
    .filter((entry: any[]) => entry[0]) as [string, any][]);
  const tasks = asList(log.worker_tasks || log.tasks);
  const workerIds = new Set(tasks.map((task: any) => String(task?.worker_id || '').trim()).filter(Boolean));
  const taskIds = new Set(tasks.map((task: any) => String(task?.task_id || '').trim()).filter(Boolean));
  const missing = [
    ...(log.schemaVersion === '1.0' ? [] : ['orchestration_execution_log.schemaVersion']),
    ...(String(log.execution_kind || '') === 'source_tier_workpack_execution' ? [] : ['orchestration_execution_log.execution_kind']),
    ...(String(log.execution_mode || '') === executionMode ? [] : ['orchestration_execution_log.execution_mode']),
    ...(String(log.generated_by || '') === runnerGeneratedBy ? [] : ['orchestration_execution_log.generated_by']),
    ...(String(log.analysis_run_id || '') === String(bundle.analysis_run?.analysis_run_id || '') ? [] : ['orchestration_execution_log.analysis_run_id']),
    ...(String(log.source_commit || '') === String(bundle.analysis_run?.source_commit || '') ? [] : ['orchestration_execution_log.source_commit']),
    ...(graphNodeFresh(bundle, 'orchestration_execution_log') ? [] : ['orchestration_execution_log_node_fresh']),
    ...(tasks.length >= 2 ? [] : ['orchestration_execution_log.worker_tasks']),
    ...(workerIds.size >= 2 ? [] : ['orchestration_execution_log.distinct_workers']),
    ...(taskIds.size >= 2 ? [] : ['orchestration_execution_log.distinct_tasks']),
    ...(tasks.every((task: any) => String(task?.worker_id || '').trim() && String(task?.task_id || '').trim()) ? [] : ['orchestration_execution_log.worker_task_identity']),
    ...(tasks.every((task: any) => String(task?.execution_kind || '').trim() === workpackExecutionKind && String(task?.execution_mode || '').trim() === executionMode) ? [] : ['orchestration_execution_log.workpack_execution_kind']),
    ...(tasks.every((task: any) => String(task?.execution_receipt_hash || '').trim() && String(task?.review_hash || '').trim() && String(task?.task_context_hash || '').trim()) ? [] : ['orchestration_execution_log.workpack_execution_receipts']),
    ...(tasks.every((task: any) => Number(task?.duration_ms || 0) > 0 || (String(task?.started_at || '').trim() && String(task?.ended_at || '').trim())) ? [] : ['orchestration_execution_log.worker_task_timing']),
    ...(hasOverlappingWorkerWindows(tasks) ? [] : ['orchestration_execution_log.worker_task_concurrency'])
  ];
  if (!tasks.every((task: any) => tasksById.has(String(task?.task_id || '').trim()))) missing.push('orchestration_execution_log.source_tier_task_ids');
  const hashesMatch = tasks.every((task: any) => {
    const taskId = String(task?.task_id || '').trim();
    const path = String(task?.artifact_path || task?.path || tasksById.get(taskId)?.expected_output || '').trim();
    const expectedHash = path ? hashesByPath.get(path) : '';
    const artifactHash = String(task?.artifact_hash || task?.output_hash || '').trim();
    return !!expectedHash && artifactHash === expectedHash;
  });
  if (!hashesMatch) missing.push('orchestration_execution_log.artifact_hashes');
  const receiptsValid = tasks.every((task: any) => {
    const taskId = String(task?.task_id || '').trim();
    const receipt = executionsByTask.get(taskId);
    const manifestTask = tasksById.get(taskId);
    return receipt?.valid === true
      && String(receipt.task_context_hash || '').trim() === sourceTierWorkpackTaskContextHash(manifestTask);
  });
  if (!receiptsValid) missing.push('orchestration_execution_log.workpack_receipts_valid');
  const receiptsMatchArtifacts = tasks.every((task: any) => {
    const taskId = String(task?.task_id || '').trim();
    const receipt = executionsByTask.get(taskId);
    return receipt
      && String(task?.artifact_path || '').trim() === String(receipt.artifact_path || '').trim()
      && String(task?.execution_receipt_hash || '').trim() === String(receipt.receipt_hash || '').trim()
      && String(task?.review_hash || '').trim() === String(receipt.review_hash || '').trim()
      && String(task?.task_context_hash || '').trim() === String(receipt.task_context_hash || '').trim();
  });
  if (!receiptsMatchArtifacts) missing.push('orchestration_execution_log.workpack_receipts_match_artifacts');
  return {
    valid: missing.length === 0,
    missing,
    worker_count: workerIds.size,
    worker_tasks: tasks.length
  };
}

function validateParallelExecutionProof(bundle: any): any {
  const proof = bundle.parallel_execution_proof || {};
  const executionLogValidation = validateOrchestrationExecutionLog(bundle);
  const hashesByPath = artifactHashesByPath(bundle);
  const sourceTierTasks = asList(bundle.source_tier_task_manifest?.tasks);
  const taskEntries: [string, any][] = sourceTierTasks
    .map((task: any) => [String(task?.id || '').trim(), task] as [string, any])
    .filter((entry: [string, any]) => entry[0]);
  const tasksById = new Map<string, any>(taskEntries);
  const tasks = asList(proof.worker_tasks || proof.tasks);
  const logTasks = asList(bundle.orchestration_execution_log?.worker_tasks || bundle.orchestration_execution_log?.tasks);
  const generatedFrom = asList(proof.generated_from).map(String);
  const workerIds = new Set(tasks.map((task: any) => String(task?.worker_id || '').trim()).filter(Boolean));
  const taskIds = new Set(tasks.map((task: any) => String(task?.task_id || '').trim()).filter(Boolean));
  const missing = [
    ...(proof.schemaVersion === '1.0' ? [] : ['schemaVersion']),
    ...(proof.complete === true ? [] : ['complete']),
    ...(String(proof.analysis_run_id || '') === String(bundle.analysis_run?.analysis_run_id || '') ? [] : ['analysis_run_id']),
    ...(String(proof.source_commit || '') === String(bundle.analysis_run?.source_commit || '') ? [] : ['source_commit']),
    ...(graphNodeFresh(bundle, 'parallel_execution_proof') ? [] : ['proof_node_fresh']),
    ...(asList(proof.generated_from).length > 0 ? [] : ['generated_from']),
    ...(generatedFrom.includes('data/orchestration-execution-log.json') || generatedFrom.includes('orchestration-execution-log.json') ? [] : ['generated_from_orchestration_execution_log']),
    ...(executionLogValidation.valid ? [] : ['orchestration_execution_log']),
    ...(Number(proof.worker_count || 0) >= 2 ? [] : ['worker_count']),
    ...(tasks.length >= 2 ? [] : ['worker_tasks']),
    ...(workerIds.size >= 2 ? [] : ['distinct_workers']),
    ...(taskIds.size >= 2 ? [] : ['distinct_tasks']),
    ...(tasks.every((task: any) => String(task?.worker_id || '').trim() && String(task?.task_id || '').trim()) ? [] : ['worker_task_identity']),
    ...(tasks.every((task: any) => Number(task?.duration_ms || 0) > 0 || (String(task?.started_at || '').trim() && String(task?.ended_at || '').trim())) ? [] : ['worker_task_timing']),
    ...(hasOverlappingWorkerWindows(tasks) ? [] : ['worker_task_concurrency'])
  ];
  const taskHashes = tasks.map((task: any) => String(task?.artifact_hash || task?.output_hash || '').trim()).filter(Boolean);
  if (!tasks.every((task: any) => tasksById.has(String(task?.task_id || '').trim()))) missing.push('source_tier_task_ids');
  const taskHashesMatchOutputs = tasks.every((task: any) => {
    const taskId = String(task?.task_id || '').trim();
    const expectedOutput = String(tasksById.get(taskId)?.expected_output || '').trim();
    const expectedHash = expectedOutput ? hashesByPath.get(expectedOutput) : '';
    const proofHash = String(task?.artifact_hash || task?.output_hash || '').trim();
    return !!expectedHash && proofHash === expectedHash;
  });
  if (!taskHashes.length || !taskHashesMatchOutputs) missing.push('worker_task_artifact_hashes');
  const proofTasksMatchLog = tasks.length > 0 && tasks.every((task: any) => {
    const workerId = String(task?.worker_id || '').trim();
    const taskId = String(task?.task_id || '').trim();
    const startedAt = String(task?.started_at || '').trim();
    const endedAt = String(task?.ended_at || '').trim();
    const artifactHash = String(task?.artifact_hash || task?.output_hash || '').trim();
    return logTasks.some((row: any) =>
      String(row?.worker_id || '').trim() === workerId
      && String(row?.task_id || '').trim() === taskId
      && String(row?.started_at || '').trim() === startedAt
      && String(row?.ended_at || '').trim() === endedAt
      && String(row?.artifact_hash || row?.output_hash || '').trim() === artifactHash
      && String(row?.execution_receipt_hash || '').trim() === String(task?.execution_receipt_hash || '').trim()
    );
  });
  if (!proofTasksMatchLog) missing.push('worker_tasks_match_orchestration_execution_log');
  return {
    valid: missing.length === 0,
    missing,
    orchestration_execution_log_validation: executionLogValidation,
    worker_count: Number(proof.worker_count || 0),
    worker_tasks: tasks.length,
    artifact_hashes_checked: taskHashes.length
  };
}

function validateCacheLedger(bundle: any): any {
  const ledger = bundle.cache_ledger || {};
  const runnerGeneratedBy = 'cognianalysis dev run-orchestration';
  const hashesByPath = artifactHashesByPath(bundle);
  const entries = asList(ledger.cache_entries || ledger.entries);
  const hitEntries = entries.filter((entry: any) => entry?.hit === true || entry?.cache_hit === true);
  const requestHash = String(bundle.product_analysis_request?.request_hash || '').trim();
  const missing = [
    ...(ledger.schemaVersion === '1.0' ? [] : ['cache_ledger.schemaVersion']),
    ...(String(ledger.ledger_kind || '') === 'artifact_cache_ledger' ? [] : ['cache_ledger.ledger_kind']),
    ...(String(ledger.generated_by || '') === runnerGeneratedBy ? [] : ['cache_ledger.generated_by']),
    ...(String(ledger.analysis_run_id || '') === String(bundle.analysis_run?.analysis_run_id || '') ? [] : ['cache_ledger.analysis_run_id']),
    ...(String(ledger.source_commit || '') === String(bundle.analysis_run?.source_commit || '') ? [] : ['cache_ledger.source_commit']),
    ...(graphNodeFresh(bundle, 'cache_ledger') ? [] : ['cache_ledger_node_fresh']),
    ...(hitEntries.length > 0 ? [] : ['cache_ledger.hit_entries'])
  ];
  const hashesMatch = hitEntries.every((entry: any) => {
    const path = String(entry?.artifact_path || entry?.path || '').trim();
    const hash = String(entry?.artifact_hash || entry?.source_hash || entry?.content_hash || '').trim();
    return !!path && !!hash && hashesByPath.get(path) === hash;
  });
  if (!hashesMatch) missing.push('cache_ledger.artifact_hashes');
  const keysValid = hitEntries.every((entry: any) => {
    const key = String(entry?.cache_key || entry?.key || '').trim();
    const path = String(entry?.artifact_path || entry?.path || '').trim();
    const hash = String(entry?.artifact_hash || entry?.source_hash || entry?.content_hash || '').trim();
    return !!key && !!path && !!hash && key === sha1Short(`${bundle.analysis_run?.analysis_run_id || ''}|${bundle.analysis_run?.source_commit || ''}|${requestHash}|${path}|${hash}`, 20);
  });
  if (!keysValid) missing.push('cache_ledger.cache_keys');
  const reuseTimingValid = hitEntries.every((entry: any) => {
    const created = Date.parse(String(entry?.created_at || ''));
    const reused = Date.parse(String(entry?.reused_at || entry?.hit_at || ''));
    return Number.isFinite(created) && Number.isFinite(reused) && reused > created;
  });
  if (!reuseTimingValid) missing.push('cache_ledger.prior_cache_reuse_timing');
  return {
    valid: missing.length === 0,
    missing,
    hit_entries: hitEntries.length
  };
}

function validateCacheReuseProof(bundle: any): any {
  const proof = bundle.cache_reuse_proof || {};
  const cacheLedgerValidation = validateCacheLedger(bundle);
  const hashesByPath = artifactHashesByPath(bundle);
  const entries = asList(proof.cache_entries || proof.entries || proof.cache_keys);
  const ledgerEntries = asList(bundle.cache_ledger?.cache_entries || bundle.cache_ledger?.entries);
  const generatedFrom = asList(proof.generated_from).map(String);
  const hitEntries = entries.filter((entry: any) => entry?.hit === true || entry?.cache_hit === true);
  const requestHash = String(bundle.product_analysis_request?.request_hash || '').trim();
  const missing = [
    ...(proof.schemaVersion === '1.0' ? [] : ['schemaVersion']),
    ...(proof.complete === true ? [] : ['complete']),
    ...(String(proof.analysis_run_id || '') === String(bundle.analysis_run?.analysis_run_id || '') ? [] : ['analysis_run_id']),
    ...(String(proof.source_commit || '') === String(bundle.analysis_run?.source_commit || '') ? [] : ['source_commit']),
    ...(graphNodeFresh(bundle, 'cache_reuse_proof') ? [] : ['proof_node_fresh']),
    ...(asList(proof.generated_from).length > 0 ? [] : ['generated_from']),
    ...(generatedFrom.includes('data/cache-ledger.json') || generatedFrom.includes('cache-ledger.json') ? [] : ['generated_from_cache_ledger']),
    ...(cacheLedgerValidation.valid ? [] : ['cache_ledger']),
    ...(Number(proof.cache_hits || 0) > 0 ? [] : ['cache_hits']),
    ...(hitEntries.length > 0 ? [] : ['cache_hit_entries']),
    ...(bundle.product_analysis_request_freshness?.complete === true ? [] : ['product_request_freshness'])
  ];
  const entryHashes = hitEntries.map((entry: any) => String(entry?.artifact_hash || entry?.source_hash || entry?.content_hash || '').trim()).filter(Boolean);
  const entryPathsValid = hitEntries.every((entry: any) => {
    const path = String(entry?.artifact_path || entry?.path || '').trim();
    const hash = String(entry?.artifact_hash || entry?.source_hash || entry?.content_hash || '').trim();
    return !!path && !!hash && hashesByPath.get(path) === hash;
  });
  if (!entryHashes.length || !entryPathsValid) missing.push('cache_entry_artifact_hashes');
  const keysValid = hitEntries.every((entry: any) => {
    const key = String(entry?.cache_key || entry?.key || '').trim();
    const path = String(entry?.artifact_path || entry?.path || '').trim();
    const hash = String(entry?.artifact_hash || entry?.source_hash || entry?.content_hash || '').trim();
    return !!key && !!path && !!hash && key === sha1Short(`${bundle.analysis_run?.analysis_run_id || ''}|${bundle.analysis_run?.source_commit || ''}|${requestHash}|${path}|${hash}`, 20);
  });
  if (!keysValid) missing.push('cache_entry_keys');
  const proofEntriesMatchLedger = hitEntries.length > 0 && hitEntries.every((entry: any) => {
    const key = String(entry?.cache_key || entry?.key || '').trim();
    const path = String(entry?.artifact_path || entry?.path || '').trim();
    const hash = String(entry?.artifact_hash || entry?.source_hash || entry?.content_hash || '').trim();
    return ledgerEntries.some((row: any) =>
      (row?.hit === true || row?.cache_hit === true)
      && String(row?.cache_key || row?.key || '').trim() === key
      && String(row?.artifact_path || row?.path || '').trim() === path
      && String(row?.artifact_hash || row?.source_hash || row?.content_hash || '').trim() === hash
    );
  });
  if (!proofEntriesMatchLedger) missing.push('cache_entries_match_cache_ledger');
  return {
    valid: missing.length === 0,
    missing,
    cache_ledger_validation: cacheLedgerValidation,
    cache_hits: Number(proof.cache_hits || 0),
    hit_entries: hitEntries.length,
    artifact_hashes_checked: entryHashes.length
  };
}

function computeParallelOrchestrationContract(bundle: any): any {
  const internalCommands = commandSet(bundle.tooling?.internal_cli_commands);
  const manifest = bundle.source_tier_task_manifest || {};
  const backlog = bundle.source_tier_backlog || {};
  const graph = bundle.artifact_dependency_graph || {};
  const provenance = bundle.analysis_run_provenance || {};
  const parallelProof = bundle.parallel_execution_proof || {};
  const cacheProof = bundle.cache_reuse_proof || {};
  const parallelProofValidation = validateParallelExecutionProof(bundle);
  const cacheProofValidation = validateCacheReuseProof(bundle);
  const scaffoldChecks = [
    {
      id: 'tier_batches_exist',
      ready: Number(manifest.task_count || 0) > 0 && Number(manifest.batch_size || 0) > 0,
      evidence: `tasks=${Number(manifest.task_count || 0)}, batch_size=${Number(manifest.batch_size || 0)}`
    },
    {
      id: 'next_batch_commands_available',
      ready: internalCommands.has('dev tier-status') && internalCommands.has('dev tier-next') && internalCommands.has('dev tier-context'),
      evidence: 'dev tier-status/dev tier-next/dev tier-context'
    },
    {
      id: 'backlog_contract_available',
      ready: backlog.contract_kind === 'source_tier_execution_backlog' && typeof backlog.incomplete_tasks === 'number',
      evidence: `backlog=${backlog.contract_kind || 'missing'}`
    },
    {
      id: 'artifact_cache_keys_available',
      ready: graph.complete === true && asList(graph.nodes).some((node: any) => String(node?.content_hash || '').trim()),
      evidence: `graph=${graph.complete === true}, nodes=${asList(graph.nodes).length}`
    },
    {
      id: 'run_provenance_available',
      ready: provenance.complete === true && asList(provenance.generated_from_matrix).length > 0,
      evidence: `provenance=${provenance.complete === true}, artifacts=${asList(provenance.generated_from_matrix).length}`
    }
  ];
  const proofChecks = [
    {
      id: 'parallel_execution_proof',
      ready: parallelProofValidation.valid,
      evidence: `valid=${parallelProofValidation.valid}, workers=${Number(parallelProof.worker_count || 0)}, missing=${parallelProofValidation.missing.join('|') || 'none'}`
    },
    {
      id: 'cache_reuse_proof',
      ready: cacheProofValidation.valid,
      evidence: `valid=${cacheProofValidation.valid}, cache_hits=${Number(cacheProof.cache_hits || 0)}, missing=${cacheProofValidation.missing.join('|') || 'none'}`
    }
  ];
  const checks = [...scaffoldChecks, ...proofChecks];
  const scaffoldMissing = scaffoldChecks.filter(check => !check.ready).map(check => check.id);
  const missing = checks.filter(check => !check.ready).map(check => check.id);
  return {
    contract_kind: 'parallel_orchestration_contract',
    complete: missing.length === 0,
    scaffold_ready: scaffoldMissing.length === 0,
    deterministic_contract_scope: 'Separates orchestration scaffold from product proof. Scaffold checks verify Tier 1 batch workpacks, backlog selection and artifact hash/provenance cache keys. Complete readiness also requires real parallel execution and cache reuse proof artifacts. LLM execution remains harness-owned.',
    execution_model: 'harness_parallel_workers_over_generated_workpacks',
    caching_model: 'artifact content hashes plus generated_from provenance and product request freshness',
    batch_model: {
      task_count: Number(manifest.task_count || 0),
      batch_size: Number(manifest.batch_size || 0),
      incomplete_tasks: Number(backlog.incomplete_tasks || 0),
      complete_tasks: Number(backlog.complete_tasks || 0)
    },
    checks,
    scaffold_missing: scaffoldMissing,
    parallel_execution_proof_validation: parallelProofValidation,
    cache_reuse_proof_validation: cacheProofValidation,
    missing,
    summary: missing.length
      ? `Parallel/caching orchestration proof is incomplete: ${missing.join(', ')}.`
      : 'Parallel/caching orchestration is proven through batch workpacks, real parallel execution evidence and cache reuse evidence.'
  };
}

function artifactContentHash(file: string): string {
  try {
    return sha1Short(FS.readFileSync(file, 'utf8'), 16);
  } catch {
    return '';
  }
}

function artifactInfo(analysisDir: string, relativePath: string): any {
  const full = Path.join(analysisDir, relativePath);
  const exists = FS.existsSync(full);
  const stat = exists ? FS.statSync(full) : null;
  return {
    path: relativePath,
    exists,
    size_bytes: stat?.size || 0,
    mtime_ms: stat?.mtimeMs || 0,
    content_hash: exists ? artifactContentHash(full) : ''
  };
}

function listJsonArtifacts(analysisDir: string, relativeDir: string): string[] {
  const dir = Path.join(analysisDir, relativeDir);
  if (!FS.existsSync(dir)) return [];
  return FS.readdirSync(dir)
    .filter((name: string) => name.endsWith('.json'))
    .sort()
    .map((name: string) => `${relativeDir}/${name}`.replace(/\\/g, '/'));
}

function analysisRunSeed(repo: string, analysisDir: string, profile: any): any {
  const existing = loadJson<any>(Path.join(analysisDir, 'data', 'analysis-run.json'), {});
  const sourceCommit = profile?.commit || gitCommit(repo) || null;
  const preparedAt = existing.prepared_at || profile?.analyzed_at || utcNow();
  const scopeMode = profile?.analysis_scope_mode || 'complete';
  const analysisRunId = existing.analysis_run_id || `run-${sha1Short(`${Path.resolve(repo)}|${sourceCommit || 'no-commit'}|${preparedAt}|${scopeMode}`, 16)}`;
  return {
    contract_kind: 'analysis_run_identity',
    analysis_run_id: analysisRunId,
    prepared_at: preparedAt,
    source_commit: sourceCommit,
    repo_root: Path.resolve(repo),
    analysis_dir: Path.resolve(analysisDir),
    scope_mode: scopeMode,
    deterministic_contract_scope: 'Run identity and artifact provenance anchor only; semantic analysis remains Codex-authored.'
  };
}

function declaredRunId(data: any): string {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return '';
  const candidates = [
    data.analysis_run_id,
    data.analysis_strategy?.analysis_run_id,
    data.source_file_tier_review?.analysis_run_id,
    data.skill_workbench_review?.analysis_run_id,
    data.detail_agent_plan?.analysis_run_id,
    data.source_family_detail_review?.analysis_run_id,
    data.analysis_document?.analysis_run_id
  ];
  return String(candidates.find(value => typeof value === 'string' && value.trim()) || '').trim();
}

function provenanceRow(analysisDir: string, analysisRun: any, relativePath: string, parents: string[] = []): any {
  const info = artifactInfo(analysisDir, relativePath);
  const parsed = info.exists ? loadJson<any>(Path.join(analysisDir, relativePath), {}) : {};
  const declared = declaredRunId(parsed);
  return {
    ...info,
    artifact_id: cleanId(relativePath.replace(/\.json$/, '')),
    analysis_run_id: analysisRun.analysis_run_id,
    declared_analysis_run_id: declared || null,
    run_match: !declared || declared === analysisRun.analysis_run_id,
    source_commit: analysisRun.source_commit || null,
    generated_from: parents
  };
}

function computeAnalysisRunProvenance(analysisDir: string, analysisRun: any): any {
  const hasProductRequest = FS.existsSync(Path.join(analysisDir, 'data', 'product-analysis-request.json'));
  const productRequestParents = hasProductRequest ? ['data/product-analysis-request.json'] : [];
  const rows: any[] = [
    provenanceRow(analysisDir, analysisRun, 'data/code-map.json'),
    ...(hasProductRequest ? [provenanceRow(analysisDir, analysisRun, 'data/product-analysis-request.json', ['data/code-map.json'])] : []),
    provenanceRow(analysisDir, analysisRun, 'llm/analysis-strategy.json', ['data/code-map.json', 'data/source-inventory.json', ...productRequestParents]),
    ...listJsonArtifacts(analysisDir, 'source_tiers').map(path => provenanceRow(analysisDir, analysisRun, path, ['llm/analysis-strategy.json', 'source-tier-task-manifest.json'])),
    ...listJsonArtifacts(analysisDir, 'skill_reviews').map(path => provenanceRow(analysisDir, analysisRun, path, ['llm/analysis-strategy.json', 'skill-workbench-task-manifest.json', 'source_tiers/*.json'])),
    provenanceRow(analysisDir, analysisRun, 'llm/detail-agent-plan.json', ['llm/analysis-strategy.json', 'skill_reviews/*.json', 'source_tiers/*.json', ...productRequestParents]),
    ...listJsonArtifacts(analysisDir, 'detail_reviews').map(path => provenanceRow(analysisDir, analysisRun, path, ['llm/detail-agent-plan.json', 'detail-task-manifest.json'])),
    provenanceRow(analysisDir, analysisRun, 'llm/analysis-document.json', ['llm/analysis-strategy.json', 'llm/detail-agent-plan.json', 'source_tiers/*.json', 'skill_reviews/*.json', 'detail_reviews/*.json', ...productRequestParents])
  ];
  const existingRows = rows.filter(row => row.exists);
  const mismatches = existingRows.filter(row => row.run_match !== true);
  const missingRequired = rows
    .filter(row => ['data/code-map.json', 'llm/analysis-strategy.json', 'llm/detail-agent-plan.json', 'llm/analysis-document.json'].includes(row.path))
    .filter(row => !row.exists)
    .map(row => row.path);
  return {
    contract_kind: 'analysis_run_provenance',
    analysis_run_id: analysisRun.analysis_run_id,
    source_commit: analysisRun.source_commit || null,
    deterministic_contract_scope: 'Records artifact IDs, content hashes, generated_from parents and optional declared analysis_run_id matches. It does not judge semantic quality.',
    complete: missingRequired.length === 0 && mismatches.length === 0,
    artifact_count: existingRows.length,
    generated_from_matrix: existingRows,
    missing_required_artifacts: missingRequired,
    mismatched_run_artifacts: mismatches.map(row => ({ path: row.path, declared_analysis_run_id: row.declared_analysis_run_id, expected_analysis_run_id: row.analysis_run_id })),
    summary: mismatches.length
      ? `Analysis run provenance found ${mismatches.length} artifact run-id mismatch${mismatches.length === 1 ? '' : 'es'}.`
      : `Analysis run provenance is anchored to ${analysisRun.analysis_run_id}.`
  };
}

function nodeFreshness(analysisDir: string, node: any, nodesById: Map<string, any>): any {
  const info = artifactInfo(analysisDir, node.path);
  const parents = asList(node.depends_on).map((id: string) => nodesById.get(id)).filter(Boolean);
  const missingParents = parents.filter((parent: any) => !artifactInfo(analysisDir, parent.path).exists).map((parent: any) => parent.id);
  const staleParents = parents.filter((parent: any) => {
    const parentInfo = artifactInfo(analysisDir, parent.path);
    return info.exists && parentInfo.exists && parentInfo.mtime_ms > info.mtime_ms;
  }).map((parent: any) => parent.id);
  return {
    id: node.id,
    path: node.path,
    kind: node.kind,
    exists: info.exists,
    mtime_ms: info.mtime_ms,
    content_hash: info.content_hash,
    depends_on: asList(node.depends_on),
    missing_parents: missingParents,
    stale_from_parents: staleParents,
    fresh: info.exists && missingParents.length === 0 && staleParents.length === 0
  };
}

function computeArtifactDependencyGraph(analysisDir: string, analysisRun: any): any {
  const hasProductRequest = FS.existsSync(Path.join(analysisDir, 'data', 'product-analysis-request.json'));
  const productRequestDependency = hasProductRequest ? ['product_request'] : [];
  const sourceTierNodes = listJsonArtifacts(analysisDir, 'source_tiers').map((path, index) => ({
    id: `source_tier_${index + 1}`,
    path,
    kind: 'llm_source_file_tier_review',
    depends_on: ['analysis_strategy']
  }));
  const skillReviewNodes = listJsonArtifacts(analysisDir, 'skill_reviews').map((path, index) => ({
    id: `skill_review_${index + 1}`,
    path,
    kind: 'llm_skill_workbench_review',
    depends_on: ['analysis_strategy', ...sourceTierNodes.map(node => node.id)]
  }));
  const detailReviewNodes = listJsonArtifacts(analysisDir, 'detail_reviews').map((path, index) => ({
    id: `detail_review_${index + 1}`,
    path,
    kind: 'llm_detail_review',
    depends_on: ['detail_agent_plan']
  }));
  const optionalProofNodes: any[] = [
    FS.existsSync(Path.join(analysisDir, 'data', 'orchestration-execution-log.json'))
      ? { id: 'orchestration_execution_log', path: 'data/orchestration-execution-log.json', kind: 'orchestration_execution_log', depends_on: [...sourceTierNodes.map(node => node.id)] }
      : null,
    FS.existsSync(Path.join(analysisDir, 'data', 'cache-ledger.json'))
      ? { id: 'cache_ledger', path: 'data/cache-ledger.json', kind: 'cache_ledger', depends_on: ['orchestration_execution_log'] }
      : null,
    FS.existsSync(Path.join(analysisDir, 'data', 'parallel-execution-proof.json'))
      ? { id: 'parallel_execution_proof', path: 'data/parallel-execution-proof.json', kind: 'orchestration_proof', depends_on: ['analysis_document', 'orchestration_execution_log'] }
      : null,
    FS.existsSync(Path.join(analysisDir, 'data', 'cache-reuse-proof.json'))
      ? { id: 'cache_reuse_proof', path: 'data/cache-reuse-proof.json', kind: 'orchestration_proof', depends_on: ['parallel_execution_proof', 'cache_ledger'] }
      : null
  ].filter(Boolean);
  const nodes = [
    { id: 'code_map', path: 'data/code-map.json', kind: 'deterministic_context', depends_on: [] },
    { id: 'source_inventory', path: 'data/source-inventory.json', kind: 'deterministic_context', depends_on: ['code_map'] },
    ...(hasProductRequest ? [{ id: 'product_request', path: 'data/product-analysis-request.json', kind: 'product_request', depends_on: ['code_map'] }] : []),
    { id: 'analysis_strategy', path: 'llm/analysis-strategy.json', kind: 'llm_strategy', depends_on: ['code_map', 'source_inventory', ...productRequestDependency] },
    ...sourceTierNodes,
    { id: 'skill_workbench_manifest', path: 'skill-workbench-task-manifest.json', kind: 'deterministic_task_materialization', depends_on: ['analysis_strategy', ...sourceTierNodes.map(node => node.id)] },
    ...skillReviewNodes,
    { id: 'detail_agent_plan', path: 'llm/detail-agent-plan.json', kind: 'llm_detail_plan', depends_on: ['analysis_strategy', ...sourceTierNodes.map(node => node.id), ...skillReviewNodes.map(node => node.id), ...productRequestDependency] },
    { id: 'detail_task_manifest', path: 'detail-task-manifest.json', kind: 'deterministic_task_materialization', depends_on: ['detail_agent_plan'] },
    ...detailReviewNodes,
    { id: 'analysis_document', path: 'llm/analysis-document.json', kind: 'llm_final_report', depends_on: ['analysis_strategy', 'detail_agent_plan', ...sourceTierNodes.map(node => node.id), ...skillReviewNodes.map(node => node.id), ...detailReviewNodes.map(node => node.id), ...productRequestDependency] },
    ...optionalProofNodes
  ];
  const nodesById = new Map(nodes.map(node => [node.id, node]));
  const rows = nodes.map(node => nodeFreshness(analysisDir, node, nodesById));
  const missing = rows.filter(row => !row.exists).map(row => row.id);
  const stale = rows.filter(row => row.exists && row.stale_from_parents.length > 0).map(row => row.id);
  return {
    contract_kind: 'artifact_dependency_graph',
    analysis_run_id: analysisRun.analysis_run_id,
    deterministic_contract_scope: 'Artifact existence and dependency/freshness metadata only; mtime stale nodes are advisory because seeded harnesses may copy authored artifacts out of authoring order. Product-request hash freshness is tracked separately as a blocking readiness contract.',
    complete: missing.length === 0,
    node_count: rows.length,
    missing_nodes: missing,
    stale_nodes: stale,
    advisory_stale_nodes: stale,
    nodes: rows,
    rerun_recommendations: stale.concat(missing).map(id => {
      if (id === 'analysis_strategy') return 'Re-author llm/analysis-strategy.json, then rerun downstream source tiers, skill workbenches, detail plan and final report.';
      if (id === 'product_request') return 'Review the product analysis request and re-author downstream LLM artifacts for the new request.';
      if (id.startsWith('source_tier')) return 'Re-author stale or missing source_tiers/*.json, then rerun skill workbenches, detail plan and final report.';
      if (id.startsWith('skill_review')) return 'Re-author stale or missing skill_reviews/*.json, then rerun detail plan and final report.';
      if (id === 'detail_agent_plan') return 'Re-author llm/detail-agent-plan.json, then materialize/execute detail tasks and final report.';
      if (id.startsWith('detail_review')) return 'Re-author stale or missing detail_reviews/*.json, then rerun final report.';
      if (id === 'analysis_document') return 'Re-author llm/analysis-document.json and rerun finalize/audit.';
      return `Refresh artifact node ${id}.`;
    }),
    summary: missing.length
      ? `Artifact graph is missing required nodes: ${missing.slice(0, 8).join(', ')}.`
      : stale.length
        ? `Artifact dependency graph is complete with ${stale.length} advisory mtime stale node${stale.length === 1 ? '' : 's'}; final report currency is governed by synthesis contracts.`
        : 'Artifact dependency graph is complete for required analysis artifacts.'
  };
}

function productRequestStableHash(request: any): string {
  const { generated_at: _generatedAt, repo: _repo, request_hash: _requestHash, ...stable } = request || {};
  return sha1Short(JSON.stringify(stable), 16);
}

function computeProductAnalysisRequestFreshness(analysisDir: string): any {
  const marker = loadJson<any>(Path.join(analysisDir, 'data', 'product-analysis-request-freshness.json'), {});
  const request = artifactInfo(analysisDir, 'data/product-analysis-request.json');
  if (!request.exists) {
    return {
      contract_kind: 'product_analysis_request_freshness',
      complete: true,
      stale: false,
      current_request_hash: '',
      stale_outputs: [],
      summary: 'No product analysis request has been recorded for this workspace.'
    };
  }
  const requestBody = loadJson<any>(Path.join(analysisDir, 'data', 'product-analysis-request.json'), {});
  const currentRequestHash = productRequestStableHash(requestBody);
  const markerHashMismatch = !!marker.current_request_hash && marker.current_request_hash !== currentRequestHash;
  const requiredOutputs = ['llm/analysis-strategy.json', 'llm/detail-agent-plan.json', 'llm/analysis-document.json'];
  const mtimeStaleOutputs = requiredOutputs.filter(relativePath => {
    const info = artifactInfo(analysisDir, relativePath);
    return info.exists && info.mtime_ms < request.mtime_ms;
  });
  const markerHasFreshnessDecision = typeof marker.stale === 'boolean';
  const shouldCheckRequiredOutputs = marker.stale === true || markerHashMismatch || (!markerHasFreshnessDecision && mtimeStaleOutputs.length > 0);
  const staleOutputs = shouldCheckRequiredOutputs
    ? requiredOutputs.filter(relativePath => {
        const info = artifactInfo(analysisDir, relativePath);
        return !info.exists || (marker.stale === true || markerHashMismatch ? info.mtime_ms <= request.mtime_ms : info.mtime_ms < request.mtime_ms);
      })
    : [];
  return {
    contract_kind: 'product_analysis_request_freshness',
    deterministic_contract_scope: 'A changed product analysis request blocks final readiness until required Codex-authored LLM artifacts are newer than the request. Identical reruns preserve the request file and do not bump freshness.',
    complete: staleOutputs.length === 0,
    stale: staleOutputs.length > 0,
    current_request_hash: currentRequestHash,
    previous_request_hash: marker.previous_request_hash || null,
    marker_request_hash: marker.current_request_hash || null,
    marker_hash_mismatch: markerHashMismatch,
    request_mtime_ms: request.mtime_ms,
    stale_outputs: staleOutputs,
    summary: staleOutputs.length
      ? `Product analysis request changed; re-author downstream LLM artifacts: ${staleOutputs.join(', ')}.`
      : 'Product analysis request is current for required LLM artifacts.'
  };
}

function computeAnalysisStaleness(repo: string, profile: any): any {
  const analysisCommit = profile?.commit || null;
  const currentCommit = gitCommit(repo);
  const comparable = !!analysisCommit && !!currentCommit;
  const stale = comparable && analysisCommit !== currentCommit;
  return {
    contract_kind: 'analysis_staleness',
    deterministic_contract_scope: 'Compares the commit captured when the analysis code map was prepared with the current repository commit. Uncommitted working-tree drift is not included in this deterministic check.',
    analysis_commit: analysisCommit,
    current_commit: currentCommit,
    comparable,
    stale,
    summary: !comparable
      ? 'Analysis staleness cannot be determined because a git commit was unavailable.'
      : stale
        ? 'Repository commit changed after analysis preparation; decision readiness should be refreshed.'
        : 'Repository commit matches the prepared analysis commit.'
  };
}

const REQUIRED_WORKFLOW_OUTPUTS = new Set([
  'llm/analysis-strategy.json',
  'llm/detail-agent-plan.json',
  'llm/analysis-document.json'
]);

function isRequiredWorkflowTask(task: any): boolean {
  const output = String(task?.expected_output || task?.suggested_output || '');
  if (!REQUIRED_WORKFLOW_OUTPUTS.has(output)) return false;
  return task?.required_for_final !== false && task?.task_kind !== 'capability_template';
}

function legacyTaskToCapabilityTemplate(task: any): any {
  const expectedOutput = String(task?.expected_output || '');
  return {
    id: task?.id || cleanId(task?.title || expectedOutput),
    title: task?.title || expectedOutput,
    task_kind: 'capability_template',
    required_for_final: false,
    template_file: task?.template_file || task?.task_file || '',
    suggested_output: expectedOutput,
    status: 'available_when_llm_strategy_selects',
    compatibility_note: 'Normalized from an older task manifest where generic capability templates were listed as llm_tasks.'
  };
}

function normalizeCapabilityTemplateManifest(manifest: any, templates: any[]): any {
  if (manifest?.mode === 'optional_llm_capability_templates') return { ...manifest, templates };
  return {
    mode: 'optional_llm_capability_templates',
    semantic_authority: 'codex_llm',
    deterministic_authority: 'template_catalog_shape_only',
    summary: 'Generic capability templates are optional and do not block final readiness unless the Codex-authored LLM strategy explicitly uses their outputs.',
    templates
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
    .filter(isRequiredWorkflowTask)
    .map((task: any) => artifactStatus(analysisDir, task));
  const missing = artifacts.filter((row: any) => !row.exists || !row.valid_json || !row.has_content);
  return {
    contract_kind: 'required_llm_workflow_artifact_status',
    deterministic_contract_scope: 'required Codex LLM workflow artifacts only; optional capability template outputs do not block final readiness unless the Codex-authored final report depends on them',
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
    stage: 'required_pre_final_workflow_artifacts',
    required_before: finalOutput,
    deterministic_contract_scope: 'analysis strategy and detail plan artifact presence only; optional capability-template outputs are not a fixed final-readiness gate',
    total_count: prerequisites.length,
    ready_count: prerequisites.length - missing.length,
    missing_count: missing.length,
    ready_outputs: prerequisites.filter((row: any) => row.exists && row.valid_json && row.has_content).map((row: any) => row.expected_output),
    missing_outputs: missing.map((row: any) => row.expected_output),
    missing,
    summary: missing.length
      ? `Required final analysis document workflow prerequisites are incomplete: ${missing.map((row: any) => row.expected_output).join(', ')}.`
      : 'All required pre-final Codex LLM workflow artifacts are present before the final analysis document. Optional capability-template outputs are incorporated only when Codex chose to use them.'
  };
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
    const evidence = evidenceRefs(item);
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
    semantic_verdict_authority: 'codex_llm',
    contract_summary: 'Checks that Codex authored a structured LLM analysis_document.requirements_trace with named requirements, statuses, section links and evidence or open questions. This is not a deterministic checklist of original requirements and not a judgment that the repository is fully understood.',
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
      label: 'Visible report authored by Codex',
      intent: 'The visible human report structure and narrative come from analysis_document.sections authored by Codex.'
    },
    style_system: {
      label: 'Stable component/style library',
      intent: 'The visual system is stable while report wording, ordering and emphasis remain Codex-authored.'
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
    semantic_verdict_authority: 'codex_llm',
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
      ? 'Every original goal-contract item is explicitly referenced by at least one Codex-authored LLM requirements_trace row. The authored row statuses and report_quality_review remain the semantic verdict.'
      : 'The Codex-authored LLM requirements_trace does not explicitly reference every original goal-contract item yet. This is a reference-shape gap, not a deterministic semantic judgment.'
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

function evidenceRefs(item: any): any[] {
  const direct = asList(item?.evidence);
  return direct.length ? direct : asList(item?.evidence_refs);
}

function statementHasRenderableContent(item: any): boolean {
  return hasRenderableValue(item) || evidenceRefs(item).length > 0;
}

function blockRef(section: any, index: number, type: string): string {
  return `${section?.id || section?.title || 'section'}[${index}]:${type}`;
}

function blockHasRenderableContent(block: any): boolean {
  const type = String(block?.type || 'narrative').toLowerCase();
  if (evidenceRefs(block).length > 0) return true;

  switch (type) {
    case 'metric_grid':
      return asList(block?.metrics).some((metric: any) => hasRenderableValue(metric));
    case 'source_family_map':
      return asList(block?.families).some((family: any) => hasRenderableValue(family) || evidenceRefs(family).length > 0);
    case 'boundary_map':
      return ['entries', 'exits', 'state'].some(key => asList(block?.[key]).some(statementHasRenderableContent));
    case 'flow':
      return hasRenderableValue(block?.summary)
        || hasRenderableValue(block?.description)
        || hasRenderableValue(block?.source)
        || hasRenderableValue(block?.mermaid)
        || asList(block?.steps).some((step: any) => hasRenderableValue(step) || evidenceRefs(step).length > 0);
    case 'four_level_assessment':
      return asList(block?.levels).some((level: any) => hasRenderableValue(level) || evidenceRefs(level).length > 0);
    case 'decision_matrix':
      return asList(block?.rows).some((row: any) => hasRenderableValue(row) || evidenceRefs(row).length > 0);
    case 'roadmap':
      return asList(block?.items).some((item: any) => hasRenderableValue(item) || evidenceRefs(item).length > 0);
    case 'agent_plan':
      return hasRenderableValue(block?.summary)
        || hasRenderableValue(block?.description)
        || asList(block?.tasks || block?.detail_agent_tasks).some((task: any) => hasRenderableValue(task) || evidenceRefs(task).length > 0);
    case 'technical_drilldown':
      return asList(block?.references).some((reference: any) => hasRenderableValue(reference) || evidenceRefs(reference).length > 0);
    case 'open_questions':
      return asList(block?.items).some((item: any) => hasRenderableValue(item) || evidenceRefs(item).length > 0);
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
      label: 'Codex-authored report sections exist',
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
    semantic_verdict_authority: 'codex_llm',
    contract_summary: 'Checks only whether Codex-authored LLM report sections can be rendered by the stable component library. This is not a judgment of report quality or semantic completeness.',
    unsupported_block_types: unsupportedBlockTypes,
    blocks_without_supported_type: blocksWithoutSupportedType,
    blocks_without_renderable_content: blocksWithoutRenderableContent,
    sections_without_blocks: sectionsWithoutBlocks,
    sections_without_identity: sectionsWithoutIdentity,
    required,
    missing: missing.map(r => r.id),
    summary: missing.length
      ? `Final analysis document does not satisfy the renderer component contract: ${missing.map(r => r.label).join(', ')}.`
      : 'Final analysis document uses the supported component contract. Semantic report quality is judged by the Codex-authored LLM requirements trace and report_quality_review.'
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
  const semanticAuthorityOk = isCodexLlmAuthority(catalog?.semantic_authority);
  const deterministicAuthorityOk = catalog?.deterministic_authority === 'catalog_presence_and_shape_only';
  const missing = [
    ...(!semanticAuthorityOk ? ['semantic_authority_codex_llm'] : []),
    ...(!deterministicAuthorityOk ? ['deterministic_authority_shape_only'] : []),
    ...missingRequired.map(id => `required_skill:${id}`),
    ...malformed.map(id => `malformed_skill:${id}`)
  ];
  return {
    contract_kind: 'llm_analysis_skill_catalog_contract',
    semantic_verdict_authority: 'codex_llm',
    deterministic_contract_scope: 'catalog presence and shape only',
    complete: missing.length === 0,
    missing,
    skill_count: skills.length,
    required_skill_count: requiredIds.length,
    skill_ids: skills.map((skill: any) => skill.id).filter(Boolean),
    summary: missing.length
      ? `Analysis skill catalog contract is incomplete: ${missing.slice(0, 8).join(', ')}.`
      : 'Analysis skill catalog contract is complete. Codex controls skill selection and semantic application per repository.'
  };
}

const REPORT_QUALITY_REVIEW_CHECKS = [
  { id: 'repo_specific_information_architecture', label: 'Repository-specific information architecture' },
  { id: 'management_ready_decision_basis', label: 'Management-ready decision basis' },
  { id: 'whole_repo_first_understanding', label: 'Whole-repository understanding before deep dives' },
  { id: 'e2e_relationships_explained', label: 'E2E relationships and collaboration explained' },
  { id: 'functional_view_explained', label: 'Functional view explains what the system does' },
  { id: 'technical_view_explained', label: 'Technical view explains APIs, interfaces and architecture' },
  { id: 'four_level_model_covered', label: 'Four analysis levels are covered' },
  { id: 'improvements_and_refactoring_covered', label: 'Improvements, optimization and refactoring are covered' },
  { id: 'tool_positioning_covered', label: 'Tool/consulting alternative positioning is covered' },
  { id: 'evidence_and_uncertainty_visible', label: 'Evidence, confidence and uncertainty are visible' }
];

function hasReportSupport(item: any): boolean {
  return evidenceRefs(item).length > 0
    || asList(item?.open_questions).length > 0
    || asList(item?.uncertainty || item?.uncertainties).length > 0
    || asList(item?.limitations || item?.accepted_limitations).length > 0;
}

function hasTextField(item: any, fields: string[]): boolean {
  return fields.some(field => typeof item?.[field] === 'string' && item[field].trim().length > 0);
}

function evidenceCount(item: any): number {
  return evidenceRefs(item).length;
}

function evidenceStrength(count: number): string {
  if (count >= 3) return 'strong';
  if (count >= 2) return 'moderate';
  if (count >= 1) return 'weak';
  return 'unsupported';
}

function majorReportClaimItems(doc: any): any[] {
  const out: any[] = [];
  for (const section of asList(doc?.sections)) {
    for (const block of asList(section?.blocks)) {
      const type = String(block?.type || '').toLowerCase();
      const pushItems = (items: any[], kind: string, labelFields: string[]): void => {
        items.forEach((item: any, index: number) => {
          const ref = lintRef(section, block, index, kind);
          out.push({
            ref,
            claim_id: cleanId(item?.claim_id || item?.id || item?.title || item?.name || item?.decision || item?.recommendation || ref),
            kind,
            label: labelFields.map(field => item?.[field]).find(value => typeof value === 'string' && value.trim()) || `${kind} ${index + 1}`,
            report_section_id: section?.id || section?.title || '',
            block_type: type,
            semantic_lineage: item?.semantic_lineage || item?.lineage || item?.provenance || null,
            confidence: String(item?.confidence || '').trim(),
            evidence_count: evidenceCount(item),
            evidence: evidenceRefs(item),
            has_support: hasReportSupport(item),
            has_uncertainty: asList(item?.open_questions).length > 0 || asList(item?.uncertainty || item?.uncertainties).length > 0
          });
        });
      };
      if (type === 'statement_list') pushItems(asList(block?.items), 'finding', ['title', 'name', 'criterion']);
      if (type === 'roadmap') pushItems(asList(block?.items), 'recommendation', ['title', 'name']);
      if (type === 'decision_matrix') pushItems(asList(block?.rows), 'decision', ['decision', 'recommendation']);
      if (type === 'source_family_map') pushItems(asList(block?.families), 'source_family', ['name', 'title']);
    }
  }
  return out.map(item => ({
    ...item,
    evidence_strength: evidenceStrength(item.evidence_count)
  }));
}

function evidenceKey(ev: any): string {
  const line = ev?.line === undefined || ev?.line === null || ev?.line === '' ? 1 : Number(ev.line);
  return `${String(ev?.path || '')}:${Number.isInteger(line) && line >= 1 ? line : 'invalid'}`;
}

function evidenceLineSortValue(ev: any): number {
  if (ev?.line === undefined || ev?.line === null || ev?.line === '') return 1;
  const line = Number(ev.line);
  return Number.isFinite(line) ? line : Number.POSITIVE_INFINITY;
}

function artifactEvidenceRows(artifact: any, artifactPath: string): any[] {
  const rows: any[] = [];
  function walk(value: any): void {
    if (Array.isArray(value)) { value.forEach(walk); return; }
    if (!value || typeof value !== 'object') return;
    const evs = evidenceRefs(value);
    for (const ev of evs) {
      if (!ev?.path) continue;
      rows.push({
        artifact: artifactPath,
        evidence_key: evidenceKey(ev),
        path: ev.path,
        line: ev?.line === undefined || ev?.line === null || ev?.line === '' ? 1 : Number(ev.line)
      });
    }
    for (const [key, child] of Object.entries(value)) {
      if (key !== 'evidence' && key !== 'evidence_refs') walk(child);
    }
  }
  walk(artifact);
  return rows;
}

function allowsPathOnlyEvidenceFallback(ev: any): boolean {
  if (!ev || typeof ev !== 'object') return false;
  if (ev.line === undefined || ev.line === null || ev.line === '') return true;
  const line = Number(ev.line);
  return Number.isInteger(line) && line >= 1;
}

function supportingArtifactPathsForEvidence(bundle: any, evidence: any[]): string[] {
  const wanted = new Set(asList(evidence).map(evidenceKey));
  const wantedPaths = new Set(asList(evidence).filter(allowsPathOnlyEvidenceFallback).map((ev: any) => String(ev?.path || '')).filter(Boolean));
  if (!wanted.size && !wantedPaths.size) return [];
  const artifacts: any[] = [
    ...asList(bundle.source_file_tier_reviews).map((artifact: any) => ({ artifact, path: `source_tiers/${artifact.task_id || 'source-tier'}.json` })),
    ...asList(bundle.skill_workbench_reviews).map((artifact: any) => ({ artifact, path: `skill_reviews/${skillReviewId(artifact)}.json` })),
    ...asList(bundle.source_family_detail_reviews).map((artifact: any) => ({ artifact, path: `detail_reviews/${cleanId(detailReviewFamilyId(artifact) || 'detail-review')}.json` }))
  ];
  const matched = new Set<string>();
  for (const row of artifacts) {
    if (artifactEvidenceRows(row.artifact, row.path).some(ev => wanted.has(ev.evidence_key) || wantedPaths.has(String(ev.path || '')))) matched.add(row.path);
  }
  return [...matched].sort();
}

function normalizeLineage(value: any): any {
  const lineage = Array.isArray(value) ? value[0] : value;
  if (!lineage || typeof lineage !== 'object') return {};
  return lineage;
}

function computeAnalysisDocumentSemanticLineage(doc: any, bundle: any): any {
  const items = majorReportClaimItems(doc);
  const docLineageRows = new Map<string, any>();
  for (const row of asList(doc?.semantic_lineage || doc?.semantic_lineage_claims)) {
    const id = cleanId(row?.claim_id || row?.ref || row?.claim || row?.label || '');
    if (id) docLineageRows.set(id, row);
  }
  const rows = items.map(item => {
    const explicit = normalizeLineage(item.semantic_lineage) || {};
    const docLevel = docLineageRows.get(cleanId(item.claim_id)) || docLineageRows.get(cleanId(item.ref)) || {};
    const authored = Object.keys(explicit).length ? explicit : docLevel;
    const authoredEvidence = evidenceRefs(authored);
    const evidence = authoredEvidence.length ? authoredEvidence : item.evidence;
    const supporting = asList(authored.supporting_artifacts || authored.supporting_reviews || authored.supporting_sources);
    const inferredSupporting = supporting.length ? supporting.map(String) : supportingArtifactPathsForEvidence(bundle, evidence);
    const originArtifact = String(authored.origin_artifact || authored.origin_review || authored.origin || '').trim()
      || inferredSupporting.find(path => path.startsWith('detail_reviews/'))
      || inferredSupporting.find(path => path.startsWith('skill_reviews/'))
      || inferredSupporting.find(path => path.startsWith('source_tiers/'))
      || '';
    const missing = [
      ...(!item.claim_id ? ['claim_id'] : []),
      ...(!item.report_section_id ? ['report_section_id'] : []),
      ...(!originArtifact ? ['origin_artifact'] : []),
      ...(!inferredSupporting.length ? ['supporting_artifacts'] : []),
      ...(!asList(evidence).length ? ['evidence'] : [])
    ];
    return {
      claim_id: item.claim_id,
      claim_ref: item.ref,
      claim_kind: item.kind,
      label: item.label,
      report_section_id: item.report_section_id,
      origin_artifact: originArtifact,
      supporting_artifacts: inferredSupporting,
      evidence,
      explicit_lineage_authored: Object.keys(authored).length > 0,
      deterministic_support_mode: Object.keys(authored).length > 0 ? 'llm_authored_lineage_shape' : 'evidence_overlap_backstop',
      missing
    };
  });
  const incomplete = rows.filter(row => row.missing.length > 0);
  return {
    contract_kind: 'analysis_document_semantic_lineage',
    semantic_verdict_authority: 'codex_llm',
    deterministic_contract_scope: 'Major LLM-authored report claims must trace to report section, upstream review/source-tier artifacts and file:line evidence. Path overlap is used only as a provenance backstop, not semantic matching.',
    complete: !!doc && rows.length > 0 && incomplete.length === 0,
    claim_count: rows.length,
    complete_claim_count: rows.length - incomplete.length,
    incomplete_claims: incomplete.map(row => ({ claim_id: row.claim_id, missing: row.missing })),
    lineage: rows,
    summary: incomplete.length
      ? `Semantic lineage is incomplete for ${incomplete.length} major claim${incomplete.length === 1 ? '' : 's'}.`
      : 'Every major visible finding, recommendation, decision and source-family claim has semantic lineage to upstream artifacts and evidence.'
  };
}

function computeAnalysisDocumentEvidenceStrength(doc: any): any {
  const items = majorReportClaimItems(doc);
  const missingConfidence = items
    .filter(item => !item.confidence && !item.has_uncertainty)
    .map(item => item.ref);
  const unsupported = items
    .filter(item => !item.has_support)
    .map(item => item.ref);
  const weak = items
    .filter(item => item.evidence_strength === 'weak')
    .map(item => item.ref);
  const counts = items.reduce((acc: any, item: any) => {
    acc[item.evidence_strength] = (acc[item.evidence_strength] || 0) + 1;
    return acc;
  }, {});
  const complete = !!doc && missingConfidence.length === 0 && unsupported.length === 0;
  return {
    contract_kind: 'analysis_document_evidence_strength',
    semantic_verdict_authority: 'codex_llm',
    deterministic_contract_scope: 'Major visible claim items must carry support and confidence or explicit uncertainty. Evidence strength is a deterministic signal based on evidence-reference count, not semantic truth.',
    complete,
    item_count: items.length,
    strength_counts: counts,
    missing_confidence: missingConfidence,
    unsupported_major_claims: unsupported,
    weak_evidence_items: weak,
    items,
    summary: complete
      ? 'Major visible findings, recommendations, decisions and source-family claims have support plus confidence or uncertainty.'
      : `Major claim evidence/confidence gaps: ${missingConfidence.concat(unsupported).slice(0, 8).join(', ')}.`
  };
}

function normalizeBlocking(value: any): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'blocking', 'blocker'].includes(normalized)) return true;
    if (['false', 'no', 'non_blocking', 'non-blocking'].includes(normalized)) return false;
  }
  return null;
}

function openQuestionText(item: any): string {
  return [
    item?.question,
    item?.title,
    item?.description,
    item?.summary,
    item?.reason,
    item?.why_it_matters
  ].find(value => typeof value === 'string' && value.trim()) || '';
}

function visibleOpenQuestionRows(doc: any): any[] {
  const rows: any[] = [];
  for (const section of asList(doc?.sections)) {
    for (const block of asList(section?.blocks)) {
      if (String(block?.type || '').toLowerCase() !== 'open_questions') continue;
      asList(block?.items).forEach((item: any, index: number) => {
        rows.push({
          id: cleanId(item?.id || item?.question_id || item?.question || item?.title || `visible-open-question-${index + 1}`),
          question: openQuestionText(item),
          ref: lintRef(section, block, index, 'open_question')
        });
      });
    }
  }
  return rows;
}

function computeAnalysisDocumentOpenQuestions(doc: any): any {
  const hasTopLevel = !!doc && Array.isArray(doc.open_questions);
  const questions = hasTopLevel ? asList(doc.open_questions) : [];
  const rows = questions.map((item: any, index: number) => {
    const id = cleanId(item?.id || item?.question_id || item?.question || item?.title || `open-question-${index + 1}`);
    const question = String(item?.question || item?.title || '').trim();
    const reason = String(item?.reason || item?.why_it_matters || item?.description || item?.summary || '').trim();
    const impact = String(item?.impact || item?.decision_impact || item?.area || '').trim();
    const blocking = normalizeBlocking(item?.blocking);
    const evidence = evidenceRefs(item);
    const evidenceGap = String(item?.evidence_gap || item?.missing_evidence || item?.proof_gap || '').trim();
    const missing = [
      ...(!id ? ['id'] : []),
      ...(!question ? ['question'] : []),
      ...(!reason ? ['reason'] : []),
      ...(!impact ? ['impact'] : []),
      ...(blocking === null ? ['blocking'] : []),
      ...(!evidence.length && !evidenceGap ? ['evidence_or_evidence_gap'] : [])
    ];
    return {
      id,
      question,
      reason,
      impact,
      blocking: blocking === true,
      blocking_known: blocking !== null,
      evidence,
      evidence_gap: evidenceGap,
      missing
    };
  });
  const visible = visibleOpenQuestionRows(doc);
  const visibleIds = new Set(visible.map(row => row.id));
  const visibleQuestions = new Set(visible.map(row => row.question.trim().toLowerCase()).filter(Boolean));
  const missingVisible = rows
    .filter(row => !visibleIds.has(row.id) && !visibleQuestions.has(row.question.trim().toLowerCase()))
    .map(row => row.id);
  const malformed = rows.filter(row => row.missing.length).map(row => ({ id: row.id, missing: row.missing }));
  const complete = !!doc && hasTopLevel && malformed.length === 0 && (rows.length === 0 || missingVisible.length === 0);
  const blockingCount = rows.filter(row => row.blocking).length;
  return {
    contract_kind: 'analysis_document_open_questions',
    semantic_verdict_authority: 'codex_llm',
    deterministic_contract_scope: 'Requires top-level LLM-authored analysis_document.open_questions as structured uncertainty. Non-empty top-level questions must also be visible through an LLM-authored open_questions report block. The CLI does not infer unknowns from prose.',
    complete,
    top_level_present: hasTopLevel,
    question_count: rows.length,
    blocking_count: blockingCount,
    decision_ready_safe: complete && blockingCount === 0,
    visible_open_question_count: visible.length,
    visible_open_questions: visible,
    missing_visible_open_questions: missingVisible,
    malformed_questions: malformed,
    questions: rows,
    missing: [
      ...(!hasTopLevel ? ['analysis_document.open_questions'] : []),
      ...(malformed.length ? ['structured_question_fields'] : []),
      ...(missingVisible.length ? ['visible_open_questions_block'] : [])
    ],
    summary: !hasTopLevel
      ? 'analysis_document.open_questions is missing; uncertainty is not a first-class artifact.'
      : rows.length === 0
        ? 'The LLM explicitly reported no open questions.'
        : blockingCount
          ? `${blockingCount} blocking open question${blockingCount === 1 ? '' : 's'} remain and must prevent decision-ready status.`
          : `${rows.length} non-blocking open question${rows.length === 1 ? '' : 's'} are structured and visible.`
  };
}

function computeAnalysisDocumentConsistencyReview(doc: any): any {
  const review = doc?.analysis_document_consistency_review || doc?.consistency_review || {};
  const contradictions = asList(review?.contradictions || review?.contradiction_items);
  const rawCount = review?.contradictions_found;
  const numericCount = typeof rawCount === 'number' ? rawCount : rawCount !== undefined && rawCount !== null && rawCount !== '' ? Number(rawCount) : contradictions.length;
  const contradictionsFound = Number.isFinite(numericCount) ? Math.max(0, numericCount) : contradictions.length;
  const reviewer = String(review?.reviewer || '').toLowerCase();
  const reviewerOk = isCodexLlmAuthority(reviewer);
  const hasSummary = typeof review?.summary === 'string' && review.summary.trim().length > 0;
  const hasExplicitCount = Number.isFinite(contradictionsFound);
  const unresolved = contradictions.filter((item: any) => {
    const status = String(item?.status || item?.resolution_status || '').toLowerCase();
    return !['resolved', 'accepted', 'not_a_contradiction'].includes(status);
  });
  const complete = !!doc && reviewerOk && hasSummary && hasExplicitCount && (contradictionsFound === 0 || contradictions.length > 0);
  return {
    contract_kind: 'analysis_document_consistency_review',
    semantic_verdict_authority: 'codex_llm',
    deterministic_contract_scope: 'Requires an LLM-authored consistency review and contradiction count. The CLI does not semantically discover contradictions.',
    complete,
    reviewer: review?.reviewer || '',
    reviewer_ok: reviewerOk,
    summary_present: hasSummary,
    contradictions_found: contradictionsFound,
    decision_ready_safe: complete && contradictionsFound === 0,
    unresolved_contradictions: unresolved,
    contradictions,
    missing: [
      ...(!reviewerOk ? ['reviewer_codex_llm'] : []),
      ...(!hasSummary ? ['summary'] : []),
      ...(!hasExplicitCount ? ['contradictions_found'] : []),
      ...(contradictionsFound > 0 && !contradictions.length ? ['contradiction_details'] : [])
    ],
    summary: review?.summary || ''
  };
}

const REQUIRED_EXECUTIVE_DECISION_FIELDS = [
  'keep_system',
  'modernize_system',
  'replace_system',
  'cost',
  'biggest_risks',
  'next_actions'
];

function computeAnalysisDocumentExecutiveDecisionLayer(doc: any): any {
  const basis = doc?.executive_decision_basis || {};
  const sections = asList(doc?.sections);
  const executiveSections = sections.filter((section: any) => {
    const level = String(section?.level || '').toLowerCase();
    const role = String(section?.role || section?.section_role || '').toLowerCase();
    return level === 'executive' || role === 'executive_decision' || section?.decision_layer === true;
  });
  const questions = basis?.decision_questions && typeof basis.decision_questions === 'object' && !Array.isArray(basis.decision_questions)
    ? basis.decision_questions
    : {};
  const missingDecisionFields = REQUIRED_EXECUTIVE_DECISION_FIELDS.filter(field => !hasRenderableValue((questions as any)[field]));
  const hasTopLevelBasis = hasTextField(basis, ['summary'])
    && hasTextField(basis, ['recommendation'])
    && hasTextField(basis, ['confidence'])
    && hasReportSupport(basis);
  const hasVisibleExecutive = executiveSections.some((section: any) => asList(section?.blocks).length > 0);
  const complete = !!doc && hasTopLevelBasis && hasVisibleExecutive && missingDecisionFields.length === 0;
  return {
    contract_kind: 'analysis_document_executive_decision_layer',
    semantic_verdict_authority: 'codex_llm',
    deterministic_contract_scope: 'Requires a top-level executive_decision_basis, visible executive/decision section and explicit decision-question answers. The LLM remains responsible for semantic usefulness.',
    complete,
    top_level_basis_present: hasTopLevelBasis,
    visible_executive_section_present: hasVisibleExecutive,
    executive_sections: executiveSections.map((section: any) => section.id || section.title).filter(Boolean),
    required_decision_fields: REQUIRED_EXECUTIVE_DECISION_FIELDS,
    missing_decision_fields: missingDecisionFields,
    decision_questions: questions,
    missing: [
      ...(!hasTopLevelBasis ? ['executive_decision_basis'] : []),
      ...(!hasVisibleExecutive ? ['visible_executive_section'] : []),
      ...missingDecisionFields.map(field => `decision_questions.${field}`)
    ],
    summary: complete
      ? 'The final report contains a visible executive decision layer before technical drilldown.'
      : 'The final report is missing executive decision answers or a visible executive/decision section.'
  };
}

function lintRef(section: any, block: any, index: number, kind: string): string {
  const sectionId = section?.id || section?.title || 'section';
  const blockType = block?.type || 'block';
  return `${sectionId}:${blockType}:${kind}[${index}]`;
}

function computeAnalysisDocumentReportLint(doc: any): any {
  const sections = asList(doc?.sections);
  const review = doc?.report_quality_review || {};
  const checks = review?.checks || {};
  const missingQualityChecks = REPORT_QUALITY_REVIEW_CHECKS
    .filter(check => checks?.[check.id] === undefined || checks?.[check.id] === null)
    .map(check => check.id);
  const customQualityJudgmentPresent = asList(review.criteria).concat(asList(review.findings)).some((item: any) =>
    hasTextField(item, ['name', 'title', 'criterion', 'verdict', 'summary', 'reason'])
      && (hasReportSupport(item) || hasReportSupport(review))
  );
  const qualityDimensionContractOk = missingQualityChecks.length === 0 || customQualityJudgmentPresent;
  const qualityChecksWithoutEvidence = REPORT_QUALITY_REVIEW_CHECKS
    .filter(check => checks?.[check.id] !== undefined && checks?.[check.id] !== null)
    .filter(check => !hasEvidenceReference(checks?.[`${check.id}_evidence`]) && evidenceRefs(review).length === 0 && !asList(review.open_questions).length)
    .map(check => check.id);
  const claimSupportGaps: string[] = [];
  const roadmapActionGaps: string[] = [];
  const decisionRowGaps: string[] = [];
  const mermaidSupportGaps: string[] = [];
  const openQuestionGaps: string[] = [];
  const interfaceBoundaryGaps: string[] = [];

  sections.forEach((section: any) => {
    asList(section?.blocks).forEach((block: any) => {
      const type = String(block?.type || 'narrative').toLowerCase();
      const checkSupportedItems = (items: any[], kind: string): void => {
        items.forEach((item: any, index: number) => {
          if (!hasReportSupport(item)) claimSupportGaps.push(lintRef(section, block, index, kind));
        });
      };

      if (type === 'statement_list') checkSupportedItems(asList(block?.items), 'item');
      if (type === 'source_family_map') checkSupportedItems(asList(block?.families), 'family');
      if (type === 'four_level_assessment') checkSupportedItems(asList(block?.levels), 'level');
      if (type === 'flow') checkSupportedItems(asList(block?.steps), 'step');
      if (type === 'boundary_map') {
        for (const key of ['entries', 'exits', 'state']) {
          asList(block?.[key]).forEach((item: any, index: number) => {
            const ref = lintRef(section, block, index, key);
            if (!hasReportSupport(item)) claimSupportGaps.push(ref);
            if (!hasTextField(item, ['protocol', 'technology', 'kind', 'type']) || !hasTextField(item, ['description', 'summary', 'role'])) interfaceBoundaryGaps.push(ref);
          });
        }
      }
      if (type === 'roadmap') {
        asList(block?.items).forEach((item: any, index: number) => {
          const ref = lintRef(section, block, index, 'item');
          if (!hasReportSupport(item)) claimSupportGaps.push(ref);
          const hasActionShape = hasTextField(item, ['title'])
            && hasTextField(item, ['benefit', 'description', 'summary'])
            && hasTextField(item, ['effort'])
            && hasTextField(item, ['risk'])
            && (hasTextField(item, ['phase', 'next_action', 'recommendation']) || asList(item?.next_steps).length > 0);
          if (!hasActionShape) roadmapActionGaps.push(ref);
        });
      }
      if (type === 'decision_matrix') {
        asList(block?.rows).forEach((row: any, index: number) => {
          const ref = lintRef(section, block, index, 'row');
          if (!hasReportSupport(row)) claimSupportGaps.push(ref);
          const hasDecisionShape = hasTextField(row, ['decision'])
            && hasTextField(row, ['recommendation'])
            && hasTextField(row, ['risk'])
            && (hasTextField(row, ['confidence']) || asList(row?.options).length > 0);
          if (!hasDecisionShape) decisionRowGaps.push(ref);
        });
      }

      const mermaid = block?.mermaid || block?.source;
      if (mermaid) {
        const hasMermaidSupport = hasReportSupport(block)
          || (typeof mermaid === 'object' && hasReportSupport(mermaid))
          || asList(block?.steps).every((step: any) => hasReportSupport(step));
        if (!hasMermaidSupport) mermaidSupportGaps.push(blockRef(section, 0, type));
      }
      if (type === 'open_questions') {
        asList(block?.items).forEach((item: any, index: number) => {
          const hasQuestionShape = hasTextField(item, ['question', 'title'])
            && hasTextField(item, ['reason', 'why_it_matters', 'description', 'summary'])
            && hasTextField(item, ['impact', 'decision_impact', 'area'])
            && normalizeBlocking(item?.blocking) !== null
            && (evidenceRefs(item).length > 0 || hasTextField(item, ['evidence_gap', 'missing_evidence', 'proof_gap']));
          if (!hasQuestionShape) openQuestionGaps.push(lintRef(section, block, index, 'item'));
        });
      }
    });
  });

  const missing = [
    ...(!doc ? ['analysis_document'] : []),
    ...(!sections.length ? ['analysis_document.sections'] : []),
    ...(!qualityDimensionContractOk ? ['report_quality_review.quality_dimensions'] : []),
    ...(qualityChecksWithoutEvidence.length ? ['report_quality_review.check_evidence'] : []),
    ...(claimSupportGaps.length ? ['evidence_or_uncertainty_support'] : []),
    ...(roadmapActionGaps.length ? ['roadmap_action_fields'] : []),
    ...(decisionRowGaps.length ? ['decision_row_fields'] : []),
    ...(mermaidSupportGaps.length ? ['mermaid_evidence_support'] : []),
    ...(openQuestionGaps.length ? ['open_question_fields'] : []),
    ...(interfaceBoundaryGaps.length ? ['interface_boundary_fields'] : [])
  ];

  return {
    contract_kind: 'analysis_document_market_quality_lint',
    semantic_verdict_authority: 'codex_llm',
    deterministic_contract_scope: 'LLM-authored report shape and support fields only; no semantic matching, keyword scoring or usefulness judgment',
    complete: missing.length === 0,
    section_count: sections.length,
    required_quality_checks: REPORT_QUALITY_REVIEW_CHECKS,
    missing_quality_checks: missingQualityChecks,
    custom_quality_judgment_present: customQualityJudgmentPresent,
    quality_dimension_contract_mode: missingQualityChecks.length === 0 ? 'canonical_checks' : customQualityJudgmentPresent ? 'custom_llm_criteria' : 'incomplete',
    quality_checks_without_evidence: qualityChecksWithoutEvidence,
    unsupported_claims: claimSupportGaps,
    unsupported_claim_count: claimSupportGaps.length,
    claim_support_gaps: claimSupportGaps,
    roadmap_action_gaps: roadmapActionGaps,
    decision_row_gaps: decisionRowGaps,
    mermaid_support_gaps: mermaidSupportGaps,
    open_question_gaps: openQuestionGaps,
    interface_boundary_gaps: interfaceBoundaryGaps,
    missing,
    summary: missing.length
      ? `Analysis document report lint has structural gaps: ${missing.slice(0, 8).join(', ')}.`
      : 'Analysis document satisfies the deterministic report lint. Semantic usefulness remains the LLM-authored report_quality_review verdict.'
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
    const support = evidenceRefs(item).length > 0 || asList(item?.open_questions).length > 0 || asList(item?.follow_up || item?.follow_ups).length > 0;
    return {
      id,
      requirement_ref: ref,
      requirement,
      status: String(item?.status || '').toLowerCase(),
      rationale_present: !!rationaleText,
      support_present: support,
      evidence: evidenceRefs(item),
      open_questions: asList(item?.open_questions),
      follow_up: asList(item?.follow_up || item?.follow_ups)
    };
  });
  const rationaleIds = new Set(partialRationales.filter(item => item.rationale_present && item.support_present).map(item => item.id));
  const partialRowsWithoutRationale = partialTraceRows.filter(row => !rationaleIds.has(row.id));
  const suggested = REPORT_QUALITY_REVIEW_CHECKS;
  const authoredChecks = Object.entries(checks || {})
    .filter(([key]) => !key.endsWith('_evidence'))
    .map(([key, value]) => ({
      id: key,
      label: suggested.find(item => item.id === key)?.label || String(key).replace(/_/g, ' '),
      verdict: value,
      present: value !== undefined && value !== null,
      evidence: asList((checks as any)[`${key}_evidence`] || (checks as any)[`${key}_evidence_refs`] || review.evidence || review.evidence_refs)
    }));
  const reviewer = String(review.reviewer || '').toLowerCase();
  const verdict = String(review.verdict || '').toLowerCase();
  const reviewerOk = isCodexLlmAuthority(reviewer);
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
      ...(!reviewerOk ? ['reviewer_codex_llm'] : []),
      ...(!verdictKnown ? ['known_verdict'] : []),
      ...(!hasSummary ? ['summary'] : []),
      ...(!hasStructuredJudgment ? ['structured_judgment'] : []),
      ...(!partialRequirementRationaleOk ? ['partial_requirement_rationale'] : [])
    ],
    summary: review.summary || '',
    evidence: evidenceRefs(review),
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
  const skillWorkbenchCoverage = bundle.skill_workbench_coverage || {};
  return {
    semantic_decider: 'codex_llm',
    llm_execution_model: {
      executor: 'codex_in_session',
      execution_surface: 'current_codex_session',
      direct_llm_api_allowed: false,
      api_credentials_required: false,
      external_service_state_tracked: false,
      runtime_contract: 'codex_authors_required_artifacts_in_session',
      readiness_verdict_source: 'analysis_document.report_quality_review.verdict',
      incomplete_evidence_handling: 'codex_authors_uncertainty_open_questions_or_partial_readiness'
    },
    final_verdict_source: 'analysis_document.report_quality_review.verdict',
    final_verdict: quality.verdict || '',
    requirements_trace_source: 'analysis_document.requirements_trace',
    requirements_trace_complete: goal.complete === true,
    goal_trace_reference_source: 'analysis_document.requirements_trace[].goal_contract_refs',
    goal_trace_reference_contract_complete: goalTrace.complete === true,
    report_quality_review_structured: quality.complete === true,
    consistency_review_complete: bundle.analysis_document_consistency_review?.complete === true,
    executive_decision_layer_complete: bundle.analysis_document_executive_decision_layer?.complete === true,
    evidence_strength_complete: bundle.analysis_document_evidence_strength?.complete === true,
    semantic_lineage_complete: bundle.analysis_document_semantic_lineage?.complete === true,
    open_questions_complete: bundle.analysis_document_open_questions?.complete === true,
    analysis_run_provenance_complete: bundle.analysis_run_provenance?.complete === true,
    artifact_dependency_graph_complete: bundle.artifact_dependency_graph?.complete === true,
    external_findings_ingestion_complete: bundle.external_findings_contract?.complete === true,
    blocking_open_questions: bundle.analysis_document_open_questions?.blocking_count || 0,
    cli_semantic_quality_judge: false,
    human_report_source: reportMode.visible_report_source || '',
    llm_authored_artifacts: {
      analysis_strategy: bundle.llm_analysis_strategy?.uses_pre_analysis_strategy_artifact === true,
      analysis_document: !!presence.analysis_document,
      requirements_trace: !!presence['analysis_document.requirements_trace'],
      report_quality_review: !!presence['analysis_document.report_quality_review'],
      source_file_tier_reviews: asList(bundle.source_file_tier_reviews).length,
      skill_workbench_reviews: asList(bundle.skill_workbench_reviews).length,
      detail_agent_plan: bundle.llm_detail_agent_plan?.uses_pre_final_plan_artifact === true,
      detail_reviews: asList(bundle.source_family_detail_reviews).length
    },
    deterministic_contracts: [
      'analysis_goal_context_preservation',
      'analysis_goal_trace_reference_shape',
      'json_artifact_presence',
      'analysis_skill_catalog_shape',
      'file_line_evidence_validation',
      'source_tier_file_card_path_and_evidence_contract',
      'source_inventory_accounting',
      'llm_strategy_skill_workbench_execution',
      'llm_analysis_pipeline_order',
      'pre_final_artifact_order',
      'detail_review_execution_and_integration',
      'renderer_component_contract',
      'report_lint_support_contract',
      'semantic_lineage_artifact_evidence_contract',
      'analysis_run_provenance_hash_and_parent_contract',
      'artifact_dependency_freshness_contract',
      'external_findings_shape_and_evidence_contract',
      'mermaid_render_contract',
      'static_html_artifact_materialization'
    ],
    analysis_skill_catalog_contract_complete: skillCatalogContract.complete === true,
    skill_workbench_contract_complete: skillWorkbenchCoverage.complete === true,
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
    summary: 'Semantic completeness, documentation quality and decision readiness are authored by Codex through requirements_trace and report_quality_review. The CLI validates deterministic contracts only and does not model Codex execution as an external provider state.'
  };
}

function extractLlmAnalysisStrategy(strategyDoc: any, hasStrategyArtifact: boolean): any {
  const directStrategy = strategyDoc?.analysis_strategy && typeof strategyDoc.analysis_strategy === 'object'
    ? strategyDoc.analysis_strategy
    : strategyDoc;
  const hasStrategy = !!directStrategy && typeof directStrategy === 'object' && !Array.isArray(directStrategy);
  const summary = String(directStrategy?.summary || '').trim();
  const wholeRepoFirstPlan = String(directStrategy?.whole_repo_first_plan || directStrategy?.whole_repository_plan || '').trim();
  const candidateSlices = asList(directStrategy?.candidate_source_slices || directStrategy?.source_slices);
  const skillPlan = asList(directStrategy?.skill_application_plan || directStrategy?.skills);
  const reportIntent = directStrategy?.report_intent && typeof directStrategy.report_intent === 'object' && !Array.isArray(directStrategy.report_intent)
    ? directStrategy.report_intent
    : {};
  const strategyPresent = hasStrategy && (!!summary || !!wholeRepoFirstPlan || candidateSlices.length > 0 || skillPlan.length > 0 || Object.keys(reportIntent).length > 0);
  const missing = [
    ...(!hasStrategyArtifact ? ['llm/analysis-strategy.json'] : []),
    ...(!strategyPresent ? ['analysis_strategy'] : []),
    ...(hasStrategy && !summary ? ['summary'] : []),
    ...(hasStrategy && !wholeRepoFirstPlan ? ['whole_repo_first_plan'] : [])
  ];
  return {
    ...(hasStrategy ? directStrategy : {}),
    planning_source: hasStrategyArtifact ? 'llm/analysis-strategy.json' : directStrategy?.planning_source || 'missing_llm_analysis_strategy',
    uses_pre_analysis_strategy_artifact: hasStrategyArtifact,
    strategy_present: strategyPresent,
    deterministic_contract_scope: 'artifact presence and strategy shape only; no semantic scoring of the chosen plan',
    semantic_verdict_authority: 'codex_llm',
    missing,
    candidate_source_slice_count: candidateSlices.length,
    skill_application_count: skillPlan.length,
    evidence: asList(directStrategy?.evidence)
  };
}

function skillWorkbenchId(value: any, index = 0): string {
  if (typeof value === 'string') return cleanId(value) || `skill-workbench-${index + 1}`;
  if (!value || typeof value !== 'object') return '';
  return cleanId(value.id || value.skill_workbench_id || value.task_id || value.skill_id || value.name) || `skill-workbench-${index + 1}`;
}

function extractLlmSkillWorkbenchPlan(strategyDoc: any, manifest: any, hasStrategyArtifact: boolean): any {
  const directStrategy = strategyDoc?.analysis_strategy && typeof strategyDoc.analysis_strategy === 'object'
    ? strategyDoc.analysis_strategy
    : strategyDoc;
  const plannedRows = asList(directStrategy?.skill_application_plan || directStrategy?.skills || directStrategy?.planned_skill_workbenches);
  const tasks = plannedRows.map((row: any, index: number) => ({
    id: skillWorkbenchId(row, index),
    skill_id: row?.skill_id || row?.id || row?.name || skillWorkbenchId(row, index),
    purpose: row?.purpose || row?.why_it_matters || '',
    scope: row?.scope || row?.source_scope || '',
    focus: asList(row?.focus || row?.expected_outputs),
    evidence: asList(row?.evidence || row?.initial_evidence)
  }));
  const manifestTasks = asList(manifest?.tasks);
  const noSkillDecision = directStrategy?.no_skill_workbenches_needed === true || asList(directStrategy?.skill_workbench_not_planned || directStrategy?.not_planned).length > 0;
  return {
    contract_kind: 'llm_strategy_skill_workbench_plan',
    semantic_verdict_authority: 'codex_llm',
    deterministic_contract_scope: 'analysis_strategy.skill_application_plan shape, materialized task manifest presence and exact planned review id reconciliation only',
    planning_source: hasStrategyArtifact ? 'llm/analysis-strategy.json' : 'missing_llm_analysis_strategy',
    uses_analysis_strategy_artifact: hasStrategyArtifact,
    version: SKILL_WORKBENCH_VERSION,
    planning_decision_present: tasks.length > 0 || noSkillDecision,
    no_skill_workbenches_needed: directStrategy?.no_skill_workbenches_needed === true,
    planned_count: tasks.length,
    materialized_task_count: manifestTasks.length,
    materialized_task_manifest_present: manifest?.mode === 'llm_strategy_skill_workbenches',
    tasks,
    materialized_tasks: manifestTasks,
    not_planned: asList(directStrategy?.skill_workbench_not_planned || directStrategy?.not_planned),
    evidence: asList(directStrategy?.evidence)
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

function skillReviewId(value: any, index = 0): string {
  if (typeof value === 'string') return cleanId(value) || `skill-workbench-${index + 1}`;
  if (!value || typeof value !== 'object') return '';
  return cleanId(value.id || value.skill_workbench_id || value.task_id || value.skill_id || value.name) || `skill-workbench-${index + 1}`;
}

function computeSkillWorkbenchCoverage(plan: any, reviews: any[], manifest: any, sourceTierCoverage: any, productRequest: any): any {
  const planned = asList(plan?.tasks)
    .map((task: any, index: number) => skillReviewId(task, index))
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b));
  const plannedIds = [...new Set(planned)];
  const materializedIds = [...new Set(asList(manifest?.tasks)
    .map((task: any, index: number) => skillReviewId(task, index))
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b)))];
  const executedIds = [...new Set(asList(reviews)
    .map((review: any, index: number) => skillReviewId(review, index))
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b)))];
  const materializedSet = new Set(materializedIds);
  const executedSet = new Set(executedIds);
  const pendingMaterialization = plannedIds.filter(id => !materializedSet.has(id));
  const pendingExecution = plannedIds.filter(id => !executedSet.has(id));
  const unexpectedReviews = executedIds.filter(id => !plannedIds.includes(id));
  const usesAnalysisStrategyPlan = plan?.uses_analysis_strategy_artifact === true;
  const sourceTierComplete = sourceTierCoverage?.complete === true;
  const productMode = String(productRequest?.mode || 'brief').toLowerCase();
  const requiresCompleteTierBeforeWorkbenches = productMode === 'complete';
  const materializedTaskManifestPresent = plan?.materialized_task_manifest_present === true;
  const planningDecisionPresent = plan?.planning_decision_present === true;
  const noSkillDecision = plan?.no_skill_workbenches_needed === true;
  const complete = usesAnalysisStrategyPlan
    && (!requiresCompleteTierBeforeWorkbenches || sourceTierComplete)
    && planningDecisionPresent
    && (noSkillDecision || materializedTaskManifestPresent)
    && pendingMaterialization.length === 0
    && pendingExecution.length === 0
    && unexpectedReviews.length === 0;
  const status = !usesAnalysisStrategyPlan
    ? 'missing_analysis_strategy'
    : requiresCompleteTierBeforeWorkbenches && !sourceTierComplete
      ? 'waiting_for_tier1_file_cards'
    : !planningDecisionPresent
      ? 'missing_skill_workbench_decision'
      : unexpectedReviews.length
        ? 'unexpected_skill_reviews'
        : plannedIds.length === 0
          ? 'no_skill_workbenches_planned'
          : !materializedTaskManifestPresent
            ? 'missing_materialized_skill_tasks'
            : complete
              ? 'complete'
              : 'partial';
  return {
    contract_kind: 'llm_strategy_skill_workbench_execution',
    semantic_verdict_authority: 'codex_llm',
    deterministic_contract_scope: 'planned skill ids from analysis_strategy, materialized task ids and executed skill_reviews ids only; no semantic scoring of skill-review quality',
    complete,
    status,
    product_mode: productMode,
    requires_complete_tier_before_workbenches: requiresCompleteTierBeforeWorkbenches,
    planning_source: plan?.planning_source || 'missing_llm_analysis_strategy',
    uses_analysis_strategy_artifact: usesAnalysisStrategyPlan,
    source_tier_complete_before_skill_workbenches: sourceTierComplete,
    materialized_task_manifest_present: materializedTaskManifestPresent,
    planning_decision_present: planningDecisionPresent,
    no_skill_workbenches_needed: noSkillDecision,
    planned_count: plannedIds.length,
    materialized_count: materializedIds.length,
    executed_count: plannedIds.filter(id => executedSet.has(id)).length,
    pending_materialization: pendingMaterialization,
    pending_execution: pendingExecution,
    unexpected_reviews: unexpectedReviews,
    planned_skill_workbenches: plannedIds,
    materialized_skill_workbenches: materializedIds,
    executed_skill_workbenches: executedIds,
    summary: plannedIds.length
      ? sourceTierComplete || !requiresCompleteTierBeforeWorkbenches
        ? `${plannedIds.filter(id => executedSet.has(id)).length}/${plannedIds.length} LLM-planned skill workbenches executed.`
        : `Skill workbenches are planned but wait for Tier 1 file-card coverage: ${sourceTierCoverage?.tier1_file_cards || 0}/${sourceTierCoverage?.total_files || 0} files.`
      : planningDecisionPresent
        ? 'The LLM analysis strategy explicitly decided that no skill workbench tasks are needed.'
        : 'The LLM analysis strategy did not plan skill workbenches and did not explicitly justify skipping them.'
  };
}

function computeSkillWorkbenchSynthesisStatus(doc: any, reviews: any[]): any {
  const executedIds = asList(reviews)
    .map((review: any, index: number) => skillReviewId(review, index))
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b));
  const uniqueExecuted = [...new Set(executedIds)];
  const synthesis = doc?.skill_workbench_synthesis || {};
  const integratedIds = asList(synthesis.integrated_skill_workbenches || synthesis.integrated_reviews)
    .map((item: any, index: number) => skillReviewId(item, index))
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b));
  const integratedSet = new Set(integratedIds);
  const missing = uniqueExecuted.filter(id => !integratedSet.has(id));
  const extra = integratedIds.filter(id => !uniqueExecuted.includes(id));
  const hasDoc = !!doc && typeof doc === 'object' && Object.keys(doc).length > 0;
  const complete = hasDoc && missing.length === 0;
  const status = !hasDoc
    ? 'missing_analysis_document'
    : uniqueExecuted.length === 0
      ? 'no_executed_skill_workbenches'
      : complete
        ? 'current'
        : 'stale';
  return {
    complete,
    status,
    executed_count: uniqueExecuted.length,
    integrated_count: uniqueExecuted.filter(id => integratedSet.has(id)).length,
    missing_integrations: missing,
    extra_integrations: extra,
    executed_skill_workbenches: uniqueExecuted,
    integrated_skill_workbenches: integratedIds,
    summary: synthesis.summary || (uniqueExecuted.length
      ? 'The final analysis document must explicitly integrate every executed LLM-planned skill workbench review.'
      : 'No LLM-planned skill workbench reviews have been executed yet.'),
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

function computeReportMode(doc: any, detailCoverage: any, synthesis: any, skillSynthesis: any, prerequisiteCoverage: any, qualityReview: any, goalTraceAlignment: any): any {
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
  const skillSynthesisCurrent = skillSynthesis?.complete === true;
  const finalSynthesisReady = llmAuthored && finalAfterDetailReviews && prerequisitesComplete && qualityReviewDecisionReady && goalTraceReferenceContractComplete && preFinalPlanReady && detailReviewsComplete && detailSynthesisCurrent && skillSynthesisCurrent;
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
    skill_workbench_synthesis_current: skillSynthesisCurrent,
    state: hasAuthoredSections
      ? finalSynthesisReady
        ? 'final_llm_authored_report'
        : 'llm_authored_report_needs_final_detail_synthesis'
      : 'awaiting_llm_authored_report',
    visible_report_source: hasAuthoredSections ? 'analysis_document.sections' : 'pending_notice',
    section_count: sections.length,
    message: finalSynthesisReady
      ? 'The visible human report is rendered from LLM-authored analysis_document.sections after pre-final extraction artifacts, planned skill workbenches, planned detail reviews and LLM report-quality review were completed.'
      : hasAuthoredSections
      ? 'The visible human report exists, but final readiness waits for required workflow artifacts, synthesis_stage=final_after_detail_reviews, a Codex-authored report-quality review with verdict=decision_ready, explicit Codex-authored goal-trace references, planned skill-workbench synthesis, a pre-final Codex-authored detail-agent plan, planned detail-review execution and synthesis.'
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
    for (const key of ['assessment','architecture','documentation','domain_model','data_model','process','quality','analysis_strategy','detail_agent_plan','analysis_document']) {
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
  }
  return result;
}

function loadSkillWorkbenchOutputs(reviewDir: string): any {
  const fs = require('node:fs');
  const reviews: any[] = [];
  const coverageItems: any[] = [];
  if (!fs.existsSync(reviewDir)) return { reviews, coverageItems };
  const files = fs.readdirSync(reviewDir).filter((f: string) => f.endsWith('.json')).sort();
  for (const f of files) {
    const data = loadJson<any>(Path.join(reviewDir, f), {});
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
    if (data.skill_workbench_review) reviews.push(data.skill_workbench_review);
    if (data.analysis_coverage) coverageItems.push(data.analysis_coverage);
  }
  return { reviews, coverageItems };
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

function loadSourceTierOutputs(sourceTierDir: string): any {
  const fs = require('node:fs');
  const reviews: any[] = [];
  const workpackExecutions: any[] = [];
  if (!fs.existsSync(sourceTierDir)) return { reviews, workpackExecutions };
  const files = fs.readdirSync(sourceTierDir).filter((f: string) => f.endsWith('.json')).sort();
  for (const f of files) {
    const data = loadJson<any>(Path.join(sourceTierDir, f), {});
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
    const review = data.source_file_tier_review;
    if (review) reviews.push(review);
    const receipt = data.source_tier_workpack_execution || data.workpack_execution_receipt;
    if (review && receipt && typeof receipt === 'object' && !Array.isArray(receipt)) {
      workpackExecutions.push({
        ...receipt,
        artifact_path: receipt.artifact_path || `source_tiers/${f}`,
        task_id: receipt.task_id || review.task_id || Path.basename(f, '.json'),
        receipt_hash: hashStable(receipt),
        review_hash_computed: hashStable(review),
        valid: String(receipt.schemaVersion || '') === '1.0'
          && String(receipt.execution_kind || '') === 'codex_in_session_source_tier_workpack'
          && String(receipt.execution_mode || '') === 'codex_authored_workpack_receipt_validation'
          && String(receipt.executor || '') === 'codex-in-session'
          && String(receipt.review_hash || '') === hashStable(review)
      });
    }
  }
  return { reviews, workpackExecutions };
}

function loadExternalFindings(analysisDir: string): any[] {
  const findingsDir = Path.join(analysisDir, 'external_findings');
  if (!FS.existsSync(findingsDir)) return [];
  const rows: any[] = [];
  for (const file of FS.readdirSync(findingsDir).filter((name: string) => name.endsWith('.json')).sort()) {
    const data = loadJson<any>(Path.join(findingsDir, file), {});
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
    const sourceTool = String(data.source_tool || data.tool || data.name || Path.basename(file, '.json')).trim();
    const authority = String(data.authority || data.source_authority || 'external_tool').trim();
    for (const item of asList(data.findings || data.issues || data.results)) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      rows.push({
        ...item,
        source_tool: item.source_tool || sourceTool,
        authority: item.authority || authority,
        ingestion_file: `external_findings/${file}`
      });
    }
  }
  return rows;
}

function computeExternalFindingsContract(findings: any[]): any {
  const rows = asList(findings).map((item: any, index: number) => {
    const id = String(item?.id || item?.rule_id || item?.fingerprint || `external-finding-${index + 1}`).trim();
    const sourceTool = String(item?.source_tool || '').trim();
    const authority = String(item?.authority || '').trim();
    const type = String(item?.type || item?.category || item?.kind || '').trim();
    const severity = String(item?.severity || item?.level || '').trim();
    const message = String(item?.message || item?.summary || item?.description || '').trim();
    const evidence = evidenceRefs(item);
    const missing = [
      ...(!id ? ['id'] : []),
      ...(!sourceTool ? ['source_tool'] : []),
      ...(!authority ? ['authority'] : []),
      ...(!type ? ['type'] : []),
      ...(!severity ? ['severity'] : []),
      ...(!message ? ['message'] : []),
      ...(!evidence.length ? ['evidence'] : []),
      ...(evidence.some((ev: any) => ev?.valid === false) ? ['valid_evidence'] : [])
    ];
    return {
      id,
      source_tool: sourceTool,
      authority,
      type,
      severity,
      message,
      ingestion_file: item?.ingestion_file || '',
      evidence,
      missing
    };
  });
  const invalid = rows.filter(row => row.missing.length > 0);
  return {
    contract_kind: 'external_findings_ingestion',
    semantic_verdict_authority: 'codex_llm',
    deterministic_authority: 'external_finding_shape_and_evidence_only',
    deterministic_contract_scope: 'External scanner/tool findings are ingested as evidence inputs. The CLI validates shape and file:line evidence only; source tools retain scanner authority and Codex synthesizes decision impact.',
    complete: invalid.length === 0,
    finding_count: rows.length,
    invalid_count: invalid.length,
    findings: rows,
    invalid_findings: invalid.map(row => ({ id: row.id, missing: row.missing })),
    summary: rows.length
      ? invalid.length
        ? `External finding ingestion has ${invalid.length} invalid finding${invalid.length === 1 ? '' : 's'}.`
        : `${rows.length} external finding${rows.length === 1 ? '' : 's'} ingested as non-authoritative Cognianalysis evidence inputs.`
      : 'No external scanner findings were provided. The ingestion contract is ready and remains optional.'
  };
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
    if ((key === 'evidence' || key === 'evidence_refs') && Array.isArray(v)) out[key] = v.map(ev => validateEvidence(repo, ev));
    else out[key] = validateNested(repo, v);
  }
  return out;
}

function validateEvidence(repo: string, ev: any): any {
  if (!ev || typeof ev !== 'object') return { path: String(ev), line: 1, valid: false, reason: 'invalid evidence object' };
  const relativePath = String(ev.path || '');
  const line = ev.line === undefined || ev.line === null || ev.line === '' ? 1 : Number(ev.line);
  const repoRoot = Path.resolve(repo);
  const full = Path.resolve(repoRoot, relativePath);
  const fs = require('node:fs');
  if (!relativePath || full !== repoRoot && !full.startsWith(`${repoRoot}${Path.sep}`)) return { ...ev, line, valid: false, reason: 'invalid path' };
  if (!Number.isInteger(line) || line < 1) return { ...ev, line, valid: false, reason: 'invalid line' };
  if (!fs.existsSync(full)) return { ...ev, line, valid: false, reason: 'file not found' };
  const repoRootReal = fs.realpathSync(repoRoot);
  const fullReal = fs.realpathSync(full);
  if (fullReal !== repoRootReal && !fullReal.startsWith(`${repoRootReal}${Path.sep}`)) return { ...ev, line, valid: false, reason: 'path escapes repository' };
  const lineCount = countLines(full);
  if (line > lineCount) return { ...ev, line, valid: false, reason: 'line out of range', line_count: lineCount };
  const snippet = getLine(full, line);
  return { ...ev, line, valid: true, snippet };
}

function collectEvidence(value: any): any[] {
  const out: any[] = [];
  function walk(v: any): void {
    if (Array.isArray(v)) { for (const x of v) walk(x); return; }
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v.evidence)) out.push(...v.evidence);
    if (Array.isArray(v.evidence_refs)) out.push(...v.evidence_refs);
    for (const [k, child] of Object.entries(v)) if (k !== 'evidence' && k !== 'evidence_refs') walk(child);
  }
  walk(value);
  return out;
}

function dedupeEvidence(items: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const e of items) {
    const key = `${evidenceKey(e)}:${e.symbol || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out.sort((a, b) => String(a.path || '').localeCompare(String(b.path || '')) || evidenceLineSortValue(a) - evidenceLineSortValue(b));
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
  const coveredPaths = new Set<string>([...evidencePaths, ...inspectedPaths]);

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
  const incomplete = rows.filter((r: any) => r.status === 'uncovered' || r.status === 'deferred');
  const moduleMap: Record<string, any> = {};
  for (const row of rows) {
    const m = moduleMap[row.module] || { name: row.module, files: 0, covered_files: 0, uncovered_files: 0 };
    m.files += 1;
    if (row.status === 'uncovered' || row.status === 'deferred') m.uncovered_files += 1;
    else m.covered_files += 1;
    moduleMap[row.module] = m;
  }
  const total = rows.length;
  const covered = total - incomplete.length;
  const contractComplete = incomplete.length === 0 && invalidCoverageItems.length === 0;
  return {
    contract_kind: 'source_inventory_accounting',
    semantic_verdict_authority: 'codex_llm',
    accounting_status_meaning: 'Whether each included source file has validated evidence or appears in LLM analysis_coverage.inspected_files. Deferred files are visible but are not completed analysis and do not count as accounted.',
    deterministic_contract_scope: 'included inventory path reconciliation and structured analysis_coverage path/reason validation only',
    status: contractComplete ? 'complete' : 'partial',
    complete: contractComplete,
    scope: 'all included files from .analysis/data/source-inventory.json',
    total_files: total,
    accounted_files: covered,
    unaccounted_files: incomplete.length,
    covered_files: covered,
    uncovered_files: incomplete.length,
    evidence_backed_files: rows.filter((r: any) => r.status === 'evidence_backed').length,
    explicitly_inspected_files: inspectedPaths.size,
    deferred_files: deferredPaths.size,
    deferred_not_analyzed_files: rows.filter((r: any) => r.status === 'deferred').length,
    invalid_coverage_items: invalidCoverageItems.length,
    invalid_coverage_item_examples: invalidCoverageItems.slice(0, 80),
    ignored_out_of_scope_coverage_items: ignoredCoverageItems.length,
    ignored_out_of_scope_coverage_item_examples: ignoredCoverageItems.slice(0, 80),
    skipped_files: asList(codeMap.skipped_files).length,
    inventory_accounting_percent: total ? Math.round((covered / total) * 1000) / 10 : 100,
    coverage_percent: total ? Math.round((covered / total) * 1000) / 10 : 100,
    modules: Object.values(moduleMap).sort((a: any, b: any) => b.uncovered_files - a.uncovered_files || String(a.name).localeCompare(String(b.name))),
    uncovered: incomplete.slice(0, 500),
    skipped: asList(codeMap.skipped_files).slice(0, 200),
    rules: [
      'A file is accounted for when it has validated evidence or appears in analysis_coverage.inspected_files with a reason.',
      'A file listed only in analysis_coverage.deferred_files is not completed analysis; it remains incomplete for whole-codebase readiness.',
      'analysis_coverage entries must be objects with exact included inventory paths and non-empty reasons; strings, globs and patterns are invalid, while exact paths outside the included source inventory are ignored for accounting.',
      'Source inventory accounting does not decide semantic completeness, documentation quality or management readiness.',
      'Source capsules and code-map rankings do not count as semantic understanding by themselves.',
      'Skipped files are reported separately because they exceeded the configured max file size before semantic extraction.'
    ]
  };
}

function computeSourceTierCoverage(codeMap: any, sourceFileTierReviews: any[], manifest: any): any {
  const files = asList(codeMap.files);
  const inventoryPaths = new Set(files.map((f: any) => String(f.path || '')).filter(Boolean));
  const plannedTasks = asList(manifest?.tasks);
  const plannedTaskIds = new Set(plannedTasks.map((task: any) => String(task?.id || '')).filter(Boolean));
  const executedTaskIds = new Set<string>();
  const cards = new Map<string, any>();
  const invalid: any[] = [];
  const duplicates: any[] = [];
  const nonCompleteReviewStatusTasks: any[] = [];

  for (const review of asList(sourceFileTierReviews)) {
    const taskId = String(review?.task_id || '').trim();
    if (taskId) executedTaskIds.add(taskId);
    const status = String(review?.review_status || '').toLowerCase();
    if (status && status !== 'complete') nonCompleteReviewStatusTasks.push({ task_id: taskId, status });
    for (const card of asList(review?.files)) {
      if (!card || typeof card !== 'object' || Array.isArray(card)) {
        invalid.push({ task_id: taskId, reason: 'file card must be an object' });
        continue;
      }
      const path = String(card.path || '').trim();
      if (!path) {
        invalid.push({ task_id: taskId, reason: 'file card missing path' });
        continue;
      }
      if (!inventoryPaths.has(path)) {
        invalid.push({ task_id: taskId, path, reason: 'file card path is outside the included source inventory' });
        continue;
      }
      if (cards.has(path)) duplicates.push({ path, first_task_id: cards.get(path)?.task_id || '', duplicate_task_id: taskId });
      const summary = String(card.summary || '').trim();
      const technicalRole = String(card.technical_role || '').trim();
      const tier = String(card.tier || '').trim();
      const depth = Number(card.analysis_depth || 0);
      const evidence = asList(card.evidence);
      if (tier !== 'tier1_file_card') invalid.push({ task_id: taskId, path, reason: 'file card tier must be tier1_file_card' });
      if (depth < 1) invalid.push({ task_id: taskId, path, reason: 'file card analysis_depth must be at least 1' });
      if (!summary) invalid.push({ task_id: taskId, path, reason: 'file card missing summary' });
      if (!technicalRole) invalid.push({ task_id: taskId, path, reason: 'file card missing technical_role' });
      if (!evidence.length) invalid.push({ task_id: taskId, path, reason: 'file card missing evidence' });
      if (evidence.some((ev: any) => ev?.valid === false)) invalid.push({ task_id: taskId, path, reason: 'file card has invalid evidence' });
      cards.set(path, { ...card, task_id: taskId });
    }
  }

  const missingFiles = files
    .map((f: any) => f.path)
    .filter((path: string) => !cards.has(path));
  const missingTaskOutputs = plannedTaskIds.size
    ? [...plannedTaskIds].filter(id => !executedTaskIds.has(id))
    : [];
  const total = files.length;
  const covered = total - missingFiles.length;
  const complete = total > 0 && missingFiles.length === 0 && invalid.length === 0 && duplicates.length === 0 && nonCompleteReviewStatusTasks.length === 0 && missingTaskOutputs.length === 0;
  return {
    contract_kind: 'tiered_whole_codebase_file_analysis',
    semantic_verdict_authority: 'codex_llm',
    deterministic_contract_scope: 'exact source-inventory path reconciliation, required Tier 1 card fields, valid evidence presence, planned task execution and duplicate detection only',
    tier_model: sourceTierModelArtifact(),
    status: complete ? 'complete' : 'partial',
    complete,
    tier1_required_for_every_file: true,
    total_files: total,
    tier1_file_cards: cards.size,
    missing_tier1_files: missingFiles.length,
    invalid_file_cards: invalid.length,
    duplicate_file_cards: duplicates.length,
    non_complete_review_status_tasks: nonCompleteReviewStatusTasks.length,
    planned_task_count: plannedTaskIds.size,
    executed_task_count: executedTaskIds.size,
    missing_task_outputs: missingTaskOutputs,
    coverage_percent: total ? Math.round((covered / total) * 1000) / 10 : 100,
    missing_file_examples: missingFiles.slice(0, 200),
    invalid_file_card_examples: invalid.slice(0, 80),
    duplicate_file_card_examples: duplicates.slice(0, 80),
    non_complete_review_status_examples: nonCompleteReviewStatusTasks.slice(0, 80),
    summary: complete
      ? 'Every included source-inventory file has a valid LLM-authored Tier 1 file card.'
      : 'Tier 1 whole-codebase file-card coverage is incomplete. Final readiness must remain partial until every included file has a valid LLM-authored file card.'
  };
}

function hasLlmAuthoredOutputPresence(outputPresence: Record<string, boolean>, sourceTierReviews: any[], detailReviews: any[]): boolean {
  return Object.keys(outputPresence || {}).length > 0
    || asList(sourceTierReviews).length > 0
    || asList(detailReviews).length > 0;
}

function pendingAnalysisCoverage(): any {
  return {
    summary: 'Pending whole-codebase coverage accounting.',
    inspected_files: [],
    deferred_files: [],
    open_questions: ['Codex has not yet recorded which files from the source inventory were semantically inspected and which Tier 1 file cards still need to be authored.']
  };
}

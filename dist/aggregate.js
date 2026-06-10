"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareAnalysis = prepareAnalysis;
exports.aggregate = aggregate;
exports.loadBundle = loadBundle;
const utils_1 = require("./utils");
const targetCoverage_1 = require("./targetCoverage");
const reportComponents_1 = require("./reportComponents");
const analysisPipeline_1 = require("./analysisPipeline");
const analysisSkills_1 = require("./analysisSkills");
const readiness_1 = require("./readiness");
const analysisGoal_1 = require("./analysisGoal");
const toolPositioningReferences_1 = require("./toolPositioningReferences");
const sourceTiers_1 = require("./sourceTiers");
const skillWorkbenches_1 = require("./skillWorkbenches");
function prepareAnalysis(repo, analysisDir, codeMap) {
    const dataDir = utils_1.Path.join(analysisDir, 'data');
    (0, utils_1.ensureDir)(dataDir);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'repo-profile.json'), codeMap.profile);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'code-map.json'), codeMap);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'source-inventory.json'), {
        included_files: (codeMap.files || []).map((f) => ({
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
    (0, utils_1.writeJson)(utils_1.Path.join(analysisDir, 'source-capsules.json'), codeMap.capsules || []);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'interface-signals.json'), codeMap.signals || []);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'navigation-artifact-candidates.json'), codeMap.artifact_navigation_candidates || codeMap.important_docs || []);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'important-docs.json'), codeMap.important_docs || []);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'analysis-goal-contract.json'), (0, analysisGoal_1.analysisGoalContractArtifact)());
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'tool-positioning-references.json'), (0, toolPositioningReferences_1.toolPositioningReferencesArtifact)());
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'source-tier-model.json'), (0, sourceTiers_1.sourceTierModelArtifact)());
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'report-component-library.json'), (0, reportComponents_1.reportComponentLibraryArtifact)());
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'analysis-skill-catalog.json'), (0, analysisSkills_1.analysisSkillCatalogArtifact)());
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'target-coverage.json'), targetCoverage_1.TARGET_CAPABILITIES);
}
function aggregate(repo, analysisDir) {
    const dataDir = utils_1.Path.join(analysisDir, 'data');
    const codeMap = (0, utils_1.loadJson)(utils_1.Path.join(dataDir, 'code-map.json'), {});
    const profile = codeMap.profile || { repo_name: utils_1.Path.basename(repo), root: repo };
    const llm = loadLlmOutputs(utils_1.Path.join(analysisDir, 'llm'));
    const llmOutputPresence = llm.__output_presence || {};
    delete llm.__output_presence;
    const analysisStrategyArtifact = (0, utils_1.loadJson)(utils_1.Path.join(analysisDir, 'llm', 'analysis-strategy.json'), null);
    const detailAgentPlanArtifact = (0, utils_1.loadJson)(utils_1.Path.join(analysisDir, 'llm', 'detail-agent-plan.json'), null);
    const detail = loadDetailOutputs(utils_1.Path.join(analysisDir, 'detail_reviews'));
    const skillWorkbench = loadSkillWorkbenchOutputs(utils_1.Path.join(analysisDir, 'skill_reviews'));
    const sourceTier = loadSourceTierOutputs(utils_1.Path.join(analysisDir, 'source_tiers'));
    const sourceFamilyInventory = (0, utils_1.loadJson)(utils_1.Path.join(dataDir, 'source-family-inventory.json'), {});
    const detailTaskManifest = (0, utils_1.loadJson)(utils_1.Path.join(analysisDir, 'detail-task-manifest.json'), { tasks: [] });
    const skillWorkbenchTaskManifest = (0, utils_1.loadJson)(utils_1.Path.join(analysisDir, 'skill-workbench-task-manifest.json'), { tasks: [] });
    const sourceTierTaskManifest = (0, utils_1.loadJson)(utils_1.Path.join(analysisDir, 'source-tier-task-manifest.json'), { tasks: [] });
    const capabilityTemplateManifest = (0, utils_1.loadJson)(utils_1.Path.join(analysisDir, 'capability-template-manifest.json'), { templates: [] });
    const assessment = llm.assessment || null;
    const capabilities = (0, utils_1.asList)(llm.capabilities);
    const interfaces = (0, utils_1.asList)(llm.interfaces);
    const flows = (0, utils_1.asList)(llm.flows);
    const businessLogic = (0, utils_1.asList)(llm.business_logic);
    const domainModel = llm.domain_model || null;
    const dataModel = llm.data_model || null;
    const integrations = (0, utils_1.asList)(llm.integrations);
    const sideEffects = (0, utils_1.asList)(llm.side_effects);
    const architecture = llm.architecture || null;
    const process = llm.process || null;
    const quality = llm.quality || null;
    const findings = (0, utils_1.asList)(llm.findings);
    const refactoring = (0, utils_1.asList)(llm.refactoring);
    const modernization = (0, utils_1.asList)(llm.modernization);
    const documentation = llm.documentation || {};
    const analysisStrategy = analysisStrategyArtifact?.analysis_strategy || analysisStrategyArtifact || llm.analysis_strategy || null;
    const analysisDocument = llm.analysis_document || null;
    const detailAgentPlan = detailAgentPlanArtifact?.detail_agent_plan || detailAgentPlanArtifact || llm.detail_agent_plan || null;
    const hasAnalysisStrategyArtifact = !!analysisStrategyArtifact && typeof analysisStrategyArtifact === 'object' && !Array.isArray(analysisStrategyArtifact);
    const hasDetailAgentPlanArtifact = !!detailAgentPlanArtifact && typeof detailAgentPlanArtifact === 'object' && !Array.isArray(detailAgentPlanArtifact);
    const analysisCoverage = validateNested(repo, mergeCoverage(llm.analysis_coverage || pendingAnalysisCoverage(), [...skillWorkbench.coverageItems, ...detail.coverageItems]));
    const hasLlmAuthoredOutput = hasLlmAuthoredOutputPresence(llmOutputPresence, sourceTier.reviews, detail.reviews);
    const status = hasLlmAuthoredOutput
        ? { state: 'llm_extracted', message: 'LLM-authored analysis artifacts are present. Semantic completeness and readiness still come only from analysis_document.requirements_trace and analysis_document.report_quality_review.' }
        : { state: 'awaiting_llm_extraction', message: 'Agent harness/LLM extraction has not been run yet. The report shows inventory-only repo map data, unscored target capability context and source capsules only. Imports, symbols, frameworks, contracts, examples, relationships and semantics must be parsed by the LLM from source.' };
    const taskManifest = (0, utils_1.loadJson)(utils_1.Path.join(analysisDir, 'task-manifest.json'), { tasks: [], capability_templates: [] });
    const manifestTasks = (0, utils_1.asList)(taskManifest.tasks);
    const tasks = manifestTasks.filter(isRequiredWorkflowTask);
    const capabilityTemplates = (0, utils_1.asList)(taskManifest.capability_templates || capabilityTemplateManifest.templates);
    const normalizedCapabilityTemplates = capabilityTemplates.length
        ? capabilityTemplates
        : manifestTasks.filter((task) => !isRequiredWorkflowTask(task)).map(legacyTaskToCapabilityTemplate);
    const analysisPipeline = (0, analysisPipeline_1.analysisPipelineArtifact)(tasks, normalizedCapabilityTemplates);
    const bundle = {
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
        analysis_goal_contract: (0, analysisGoal_1.analysisGoalContractArtifact)(),
        tool_positioning_references: (0, toolPositioningReferences_1.toolPositioningReferencesArtifact)(),
        report_component_library: (0, reportComponents_1.reportComponentLibraryArtifact)(),
        analysis_skill_catalog: (0, analysisSkills_1.analysisSkillCatalogArtifact)(),
        source_tier_model: (0, sourceTiers_1.sourceTierModelArtifact)(),
        source_tier_task_manifest: validateNested(repo, sourceTierTaskManifest),
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
        analysis_coverage: analysisCoverage,
        tasks,
        tooling: computeToolingCapabilities(),
        report_artifacts: computeReportArtifacts(analysisDir)
    };
    bundle.llm_output_presence = llmOutputPresence;
    let evidence = [];
    for (const key of ['capabilities', 'interfaces', 'flows', 'business_logic', 'integrations', 'side_effects', 'findings', 'refactoring', 'modernization'])
        evidence = evidence.concat(collectEvidence(bundle[key] || []));
    for (const key of ['assessment', 'domain_model', 'data_model', 'architecture', 'process', 'quality', 'documentation', 'analysis_strategy', 'detail_agent_plan', 'analysis_document', 'source_file_tier_reviews', 'skill_workbench_reviews', 'source_family_detail_reviews', 'analysis_coverage'])
        evidence = evidence.concat(collectEvidence(bundle[key] || {}));
    bundle.evidence_index = dedupeEvidence(evidence);
    bundle.source_tier_coverage = computeSourceTierCoverage(codeMap, bundle.source_file_tier_reviews, bundle.source_tier_task_manifest);
    bundle.source_tier_backlog = (0, sourceTiers_1.sourceTierBacklogArtifact)(analysisDir);
    bundle.source_inventory_accounting = computeSourceCoverage(codeMap, bundle.evidence_index, bundle.analysis_coverage);
    bundle.source_coverage = bundle.source_inventory_accounting;
    bundle.analysis_document_requirements_trace_contract = computeAnalysisDocumentRequirementsTraceContract(bundle.analysis_document);
    bundle.analysis_document_goal_coverage = bundle.analysis_document_requirements_trace_contract;
    bundle.analysis_goal_trace_alignment = computeAnalysisGoalTraceAlignment(bundle.analysis_goal_contract, bundle.analysis_document);
    bundle.analysis_document_component_coverage = computeAnalysisDocumentComponentCoverage(bundle.analysis_document, bundle.profile, bundle.modules);
    bundle.analysis_document_quality_review = computeAnalysisDocumentQualityReview(bundle.analysis_document);
    bundle.llm_artifacts = computeLlmArtifactStatus(analysisDir, bundle.tasks);
    bundle.analysis_document_prerequisite_coverage = computeAnalysisDocumentPrerequisiteCoverage(bundle.llm_artifacts);
    bundle.skill_workbench_coverage = computeSkillWorkbenchCoverage(bundle.llm_skill_workbench_plan, bundle.skill_workbench_reviews, bundle.skill_workbench_task_manifest, bundle.source_tier_coverage);
    bundle.analysis_document_skill_workbench_synthesis = computeSkillWorkbenchSynthesisStatus(bundle.analysis_document, bundle.skill_workbench_reviews);
    bundle.analysis_document_detail_review_synthesis = computeDetailReviewSynthesisStatus(bundle.analysis_document, bundle.source_family_detail_reviews);
    bundle.source_family_detail_review_coverage = computeDetailReviewCoverage(bundle.llm_detail_agent_plan, bundle.source_family_detail_reviews, bundle.analysis_document_detail_review_synthesis);
    bundle.report_mode = computeReportMode(bundle.analysis_document, bundle.source_family_detail_review_coverage, bundle.analysis_document_detail_review_synthesis, bundle.analysis_document_skill_workbench_synthesis, bundle.analysis_document_prerequisite_coverage, bundle.analysis_document_quality_review, bundle.analysis_goal_trace_alignment);
    bundle.analysis_pipeline_contract = (0, analysisPipeline_1.computeAnalysisPipelineContract)(bundle);
    bundle.analysis_skill_catalog_contract = computeAnalysisSkillCatalogContract(bundle.analysis_skill_catalog);
    bundle.semantic_authority = computeSemanticAuthority(bundle);
    bundle.final_llm_readiness = (0, readiness_1.computeFinalLlmReadiness)(bundle);
    bundle.target_coverage = (0, targetCoverage_1.computeTargetCoverage)(bundle);
    bundle.target_artifact_contract_coverage = bundle.target_coverage;
    (0, utils_1.ensureDir)(dataDir);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'analysis-goal-contract.json'), bundle.analysis_goal_contract);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'tool-positioning-references.json'), bundle.tool_positioning_references);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'report-component-library.json'), bundle.report_component_library);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'analysis-skill-catalog.json'), bundle.analysis_skill_catalog);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'capability-template-manifest.json'), bundle.capability_template_manifest);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'source-tier-model.json'), bundle.source_tier_model);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'source-tier-coverage.json'), bundle.source_tier_coverage);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'source-tier-backlog.json'), bundle.source_tier_backlog);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'skill-workbench-coverage.json'), bundle.skill_workbench_coverage);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'analysis-pipeline.json'), bundle.analysis_pipeline);
    (0, utils_1.writeJson)(utils_1.Path.join(analysisDir, 'analysis-pipeline.json'), bundle.analysis_pipeline);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'analysis-goal-trace-alignment.json'), bundle.analysis_goal_trace_alignment);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'bundle.json'), bundle);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'evidence.json'), bundle.evidence_index);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'source-inventory-accounting.json'), bundle.source_inventory_accounting);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'target-coverage.json'), bundle.target_coverage);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'target-artifact-contract-coverage.json'), bundle.target_artifact_contract_coverage);
    return bundle;
}
function loadBundle(analysisDir) {
    const bundlePath = utils_1.Path.join(analysisDir, 'data', 'bundle.json');
    const bundle = (0, utils_1.loadJson)(bundlePath, null);
    if (bundle)
        return bundle;
    const codeMap = (0, utils_1.loadJson)(utils_1.Path.join(analysisDir, 'data', 'code-map.json'), {});
    const root = codeMap.profile?.root || process.cwd();
    return aggregate(root, analysisDir);
}
function computeToolingCapabilities() {
    return {
        cli_commands: ['prepare', 'finalize', 'audit-report', 'aggregate', 'coverage', 'render', 'validate', 'portfolio', 'mcp'],
        portfolio_mode_available: true,
        harness_portability_available: true,
        report_renderer_available: true,
        summary: 'Deterministic CLI capabilities available in this Cognianalysis build.'
    };
}
function computeReportArtifacts(analysisDir) {
    const persisted = (0, utils_1.loadJson)(utils_1.Path.join(analysisDir, 'data', 'report-artifacts.json'), {});
    const defaultIndex = utils_1.Path.join(analysisDir, 'report', 'index.html');
    const defaultData = utils_1.Path.join(analysisDir, 'report', 'analysis-data.json');
    const indexPath = persisted.index_html_path || defaultIndex;
    const dataPath = persisted.analysis_data_json_path || defaultData;
    return {
        output_dir: persisted.output_dir || utils_1.Path.join(analysisDir, 'report'),
        index_html_path: indexPath,
        analysis_data_json_path: dataPath,
        index_html: utils_1.FS.existsSync(indexPath),
        analysis_data_json: utils_1.FS.existsSync(dataPath),
        generated_at: persisted.generated_at || '',
        renderer: 'src/report.ts'
    };
}
const REQUIRED_WORKFLOW_OUTPUTS = new Set([
    'llm/analysis-strategy.json',
    'llm/detail-agent-plan.json',
    'llm/analysis-document.json'
]);
function isRequiredWorkflowTask(task) {
    const output = String(task?.expected_output || task?.suggested_output || '');
    if (!REQUIRED_WORKFLOW_OUTPUTS.has(output))
        return false;
    return task?.required_for_final !== false && task?.task_kind !== 'capability_template';
}
function legacyTaskToCapabilityTemplate(task) {
    const expectedOutput = String(task?.expected_output || '');
    return {
        id: task?.id || (0, utils_1.cleanId)(task?.title || expectedOutput),
        title: task?.title || expectedOutput,
        task_kind: 'capability_template',
        required_for_final: false,
        template_file: task?.template_file || task?.task_file || '',
        suggested_output: expectedOutput,
        status: 'available_when_llm_strategy_selects',
        compatibility_note: 'Normalized from an older task manifest where generic capability templates were listed as llm_tasks.'
    };
}
function normalizeCapabilityTemplateManifest(manifest, templates) {
    if (manifest?.mode === 'optional_llm_capability_templates')
        return { ...manifest, templates };
    return {
        mode: 'optional_llm_capability_templates',
        semantic_authority: 'llm',
        deterministic_authority: 'template_catalog_shape_only',
        summary: 'Generic capability templates are optional and do not block final readiness unless the LLM strategy explicitly uses their outputs.',
        templates
    };
}
function artifactStatus(analysisDir, task) {
    const expectedOutput = String(task?.expected_output || '');
    const full = utils_1.Path.join(analysisDir, expectedOutput);
    const row = {
        title: task?.title || expectedOutput,
        task_file: task?.task_file || '',
        expected_output: expectedOutput,
        exists: utils_1.FS.existsSync(full),
        valid_json: false,
        has_content: false,
        top_level_keys: []
    };
    if (!row.exists)
        return row;
    try {
        const parsed = JSON.parse(utils_1.FS.readFileSync(full, 'utf8'));
        row.valid_json = true;
        row.has_content = parsed !== null && (Array.isArray(parsed)
            ? parsed.length > 0
            : typeof parsed === 'object'
                ? Object.keys(parsed).length > 0
                : String(parsed).trim().length > 0);
        row.top_level_keys = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? Object.keys(parsed).sort() : [];
    }
    catch (err) {
        row.error = err?.message || String(err);
    }
    return row;
}
function computeLlmArtifactStatus(analysisDir, tasks) {
    const artifacts = (0, utils_1.asList)(tasks)
        .filter((task) => String(task?.expected_output || '').startsWith('llm/'))
        .filter(isRequiredWorkflowTask)
        .map((task) => artifactStatus(analysisDir, task));
    const missing = artifacts.filter((row) => !row.exists || !row.valid_json || !row.has_content);
    return {
        contract_kind: 'required_llm_workflow_artifact_status',
        deterministic_contract_scope: 'required LLM workflow artifacts only; optional capability template outputs do not block final readiness unless the LLM final report depends on them',
        complete: artifacts.length > 0 && missing.length === 0,
        total_count: artifacts.length,
        ready_count: artifacts.length - missing.length,
        missing_count: missing.length,
        artifacts,
        missing: missing.map((row) => ({
            title: row.title,
            expected_output: row.expected_output,
            exists: row.exists,
            valid_json: row.valid_json,
            has_content: row.has_content,
            error: row.error || ''
        }))
    };
}
function computeAnalysisDocumentPrerequisiteCoverage(llmArtifacts) {
    const artifacts = (0, utils_1.asList)(llmArtifacts?.artifacts);
    const finalOutput = 'llm/analysis-document.json';
    const prerequisites = artifacts.filter((row) => row.expected_output !== finalOutput);
    const missing = prerequisites.filter((row) => !row.exists || !row.valid_json || !row.has_content);
    return {
        complete: prerequisites.length > 0 && missing.length === 0,
        stage: 'required_pre_final_workflow_artifacts',
        required_before: finalOutput,
        deterministic_contract_scope: 'analysis strategy and detail plan artifact presence only; optional capability-template outputs are not a fixed final-readiness gate',
        total_count: prerequisites.length,
        ready_count: prerequisites.length - missing.length,
        missing_count: missing.length,
        ready_outputs: prerequisites.filter((row) => row.exists && row.valid_json && row.has_content).map((row) => row.expected_output),
        missing_outputs: missing.map((row) => row.expected_output),
        missing,
        summary: missing.length
            ? `Required final analysis document workflow prerequisites are incomplete: ${missing.map((row) => row.expected_output).join(', ')}.`
            : 'All required pre-final LLM workflow artifacts are present before the final analysis document. Optional capability-template outputs are incorporated only when the LLM chose to use them.'
    };
}
function normalizeRequirement(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}
function computeAnalysisDocumentRequirementsTraceContract(doc) {
    const trace = Array.isArray(doc?.requirements_trace) ? doc.requirements_trace : [];
    const rows = trace.map((item, index) => {
        const requirement = String(item?.requirement || '').trim();
        const id = normalizeRequirement(requirement) || `trace_${index + 1}`;
        const status = String(item?.status || '').toLowerCase();
        const statusKnown = ['covered', 'partial', 'open'].includes(status);
        const sectionRefs = (0, utils_1.asList)(item?.covered_by_sections).filter(Boolean);
        const evidence = (0, utils_1.asList)(item?.evidence);
        const openQuestions = (0, utils_1.asList)(item?.open_questions);
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
            goal_contract_refs: (0, utils_1.asList)(item?.goal_contract_refs || item?.goal_refs).map(normalizeGoalTraceRef).filter(Boolean),
            evidence,
            open_questions: openQuestions
        };
    });
    const statusCounts = rows.reduce((acc, row) => {
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
function normalizeGoalTraceRef(value) {
    if (typeof value === 'string')
        return value.trim();
    if (!value || typeof value !== 'object')
        return '';
    const direct = String(value.ref || value.goal_contract_ref || '').trim();
    if (direct)
        return direct;
    const group = String(value.group || value.category || '').trim();
    const id = String(value.id || '').trim();
    return group && id ? `${group}.${id}` : '';
}
function collectGoalContractRefs(goal) {
    const groups = [
        { key: 'required_levels', type: 'level' },
        { key: 'required_views', type: 'view' },
        { key: 'required_report_behaviors', type: 'report_behavior' }
    ];
    const outputShapeLabels = {
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
    const refs = [];
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
        for (const item of (0, utils_1.asList)(goal?.[group.key])) {
            const id = String(item?.id || '').trim();
            if (!id)
                continue;
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
function computeAnalysisGoalTraceAlignment(goal, doc) {
    const expectedRefs = collectGoalContractRefs(goal);
    const expectedSet = new Set(expectedRefs.map(item => item.ref));
    const trace = Array.isArray(doc?.requirements_trace) ? doc.requirements_trace : [];
    const rows = trace.map((item, index) => {
        const requirement = String(item?.requirement || '').trim();
        const id = normalizeRequirement(requirement) || `trace_${index + 1}`;
        const refs = [...new Set((0, utils_1.asList)(item?.goal_contract_refs || item?.goal_refs).map(normalizeGoalTraceRef).filter(Boolean))];
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
function hasRenderablePrimitive(value) {
    if (typeof value === 'string')
        return value.trim().length > 0;
    if (typeof value === 'number' || typeof value === 'boolean')
        return true;
    return false;
}
function hasRenderableValue(value) {
    if (hasRenderablePrimitive(value))
        return true;
    if (Array.isArray(value))
        return value.some(hasRenderableValue);
    if (!value || typeof value !== 'object')
        return false;
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
function hasEvidenceReference(value) {
    return (0, utils_1.asList)(value).length > 0;
}
function statementHasRenderableContent(item) {
    return hasRenderableValue(item) || hasEvidenceReference(item?.evidence);
}
function blockRef(section, index, type) {
    return `${section?.id || section?.title || 'section'}[${index}]:${type}`;
}
function blockHasRenderableContent(block) {
    const type = String(block?.type || 'narrative').toLowerCase();
    if (hasEvidenceReference(block?.evidence))
        return true;
    switch (type) {
        case 'metric_grid':
            return (0, utils_1.asList)(block?.metrics).some((metric) => hasRenderableValue(metric));
        case 'source_family_map':
            return (0, utils_1.asList)(block?.families).some((family) => hasRenderableValue(family) || hasEvidenceReference(family?.evidence));
        case 'boundary_map':
            return ['entries', 'exits', 'state'].some(key => (0, utils_1.asList)(block?.[key]).some(statementHasRenderableContent));
        case 'flow':
            return hasRenderableValue(block?.summary)
                || hasRenderableValue(block?.description)
                || hasRenderableValue(block?.source)
                || hasRenderableValue(block?.mermaid)
                || (0, utils_1.asList)(block?.steps).some((step) => hasRenderableValue(step) || hasEvidenceReference(step?.evidence));
        case 'four_level_assessment':
            return (0, utils_1.asList)(block?.levels).some((level) => hasRenderableValue(level) || hasEvidenceReference(level?.evidence));
        case 'decision_matrix':
            return (0, utils_1.asList)(block?.rows).some((row) => hasRenderableValue(row) || hasEvidenceReference(row?.evidence));
        case 'roadmap':
            return (0, utils_1.asList)(block?.items).some((item) => hasRenderableValue(item) || hasEvidenceReference(item?.evidence));
        case 'agent_plan':
            return hasRenderableValue(block?.summary)
                || hasRenderableValue(block?.description)
                || (0, utils_1.asList)(block?.tasks || block?.detail_agent_tasks).some((task) => hasRenderableValue(task) || hasEvidenceReference(task?.evidence));
        case 'technical_drilldown':
            return (0, utils_1.asList)(block?.references).some((reference) => hasRenderableValue(reference) || hasEvidenceReference(reference?.evidence));
        case 'open_questions':
            return (0, utils_1.asList)(block?.items).some((item) => hasRenderableValue(item) || hasEvidenceReference(item?.evidence));
        case 'statement_list':
            return (0, utils_1.asList)(block?.items).some(statementHasRenderableContent);
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
function computeAnalysisDocumentComponentCoverage(doc, profile, modules) {
    const sections = (0, utils_1.asList)(doc?.sections);
    const sectionLevels = [...new Set(sections.map((s) => String(s?.level || '').toLowerCase()).filter(Boolean))];
    const blockTypes = [...new Set(sections.flatMap((s) => (0, utils_1.asList)(s?.blocks).map((b) => String(b?.type || '').toLowerCase()).filter(Boolean)))];
    const supportedBlockTypes = new Set((0, reportComponents_1.supportedReportComponentTypes)());
    const unsupportedBlockTypes = blockTypes.filter(type => !supportedBlockTypes.has(type));
    const sectionsWithoutIdentity = sections
        .filter((section) => !String(section?.id || section?.title || '').trim())
        .map((section, index) => index);
    const sectionsWithoutBlocks = sections
        .filter((section) => (0, utils_1.asList)(section?.blocks).length === 0)
        .map((section, index) => section?.id || section?.title || `section[${index}]`);
    const blocksWithoutSupportedType = [];
    const blocksWithoutRenderableContent = [];
    sections.forEach((section) => {
        (0, utils_1.asList)(section?.blocks).forEach((block, index) => {
            const type = String(block?.type || 'narrative').toLowerCase();
            if (!supportedBlockTypes.has(type))
                blocksWithoutSupportedType.push(`${section?.id || section?.title || 'section'}[${index}]:${type}`);
            if (!blockHasRenderableContent(block))
                blocksWithoutRenderableContent.push(blockRef(section, index, type));
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
function computeAnalysisSkillCatalogContract(catalog) {
    const skills = (0, utils_1.asList)(catalog?.skills);
    const requiredIds = (0, analysisSkills_1.analysisSkillIds)();
    const skillIds = new Set(skills.map((skill) => String(skill?.id || '')));
    const missingRequired = requiredIds.filter(id => !skillIds.has(id));
    const malformed = skills
        .filter((skill) => !String(skill?.id || '').trim() || !String(skill?.purpose || '').trim() || !(0, utils_1.asList)(skill?.stage_ids).length || !(0, utils_1.asList)(skill?.expected_outputs).length)
        .map((skill, index) => String(skill?.id || `skill_${index + 1}`));
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
        skill_ids: skills.map((skill) => skill.id).filter(Boolean),
        summary: missing.length
            ? `Analysis skill catalog contract is incomplete: ${missing.slice(0, 8).join(', ')}.`
            : 'Analysis skill catalog contract is complete. The LLM controls skill selection and semantic application per repository.'
    };
}
function computeAnalysisDocumentQualityReview(doc) {
    const review = doc?.report_quality_review || {};
    const checks = review?.checks || {};
    const traceRows = (0, utils_1.asList)(doc?.requirements_trace).map((item, index) => {
        const requirement = String(item?.requirement || '').trim();
        return {
            id: normalizeRequirement(requirement) || `trace_${index + 1}`,
            requirement: requirement || `Trace item ${index + 1}`,
            status: String(item?.status || '').toLowerCase()
        };
    });
    const partialTraceRows = traceRows.filter(row => ['partial', 'open'].includes(row.status));
    const partialRationales = (0, utils_1.asList)(review.partial_requirement_rationale || review.partial_requirement_rationales || review.accepted_limitations).map((item, index) => {
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
        const support = (0, utils_1.asList)(item?.evidence).length > 0 || (0, utils_1.asList)(item?.open_questions).length > 0 || (0, utils_1.asList)(item?.follow_up || item?.follow_ups).length > 0;
        return {
            id,
            requirement_ref: ref,
            requirement,
            status: String(item?.status || '').toLowerCase(),
            rationale_present: !!rationaleText,
            support_present: support,
            evidence: (0, utils_1.asList)(item?.evidence),
            open_questions: (0, utils_1.asList)(item?.open_questions),
            follow_up: (0, utils_1.asList)(item?.follow_up || item?.follow_ups)
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
        evidence: (0, utils_1.asList)(checks[`${key}_evidence`] || review.evidence)
    }));
    const reviewer = String(review.reviewer || '').toLowerCase();
    const verdict = String(review.verdict || '').toLowerCase();
    const reviewerOk = reviewer === 'llm';
    const verdictKnown = ['decision_ready', 'partial', 'not_ready'].includes(verdict);
    const hasSummary = typeof review.summary === 'string' && review.summary.trim().length > 0;
    const hasStructuredJudgment = authoredChecks.length > 0 || (0, utils_1.asList)(review.criteria).length > 0 || (0, utils_1.asList)(review.findings).length > 0;
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
        criteria: (0, utils_1.asList)(review.criteria),
        findings: (0, utils_1.asList)(review.findings),
        missing: [
            ...(!reviewerOk ? ['reviewer_llm'] : []),
            ...(!verdictKnown ? ['known_verdict'] : []),
            ...(!hasSummary ? ['summary'] : []),
            ...(!hasStructuredJudgment ? ['structured_judgment'] : []),
            ...(!partialRequirementRationaleOk ? ['partial_requirement_rationale'] : [])
        ],
        summary: review.summary || '',
        evidence: (0, utils_1.asList)(review.evidence),
        open_questions: (0, utils_1.asList)(review.open_questions)
    };
}
function computeSemanticAuthority(bundle) {
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
            analysis_strategy: bundle.llm_analysis_strategy?.uses_pre_analysis_strategy_artifact === true,
            analysis_document: !!presence.analysis_document,
            requirements_trace: !!presence['analysis_document.requirements_trace'],
            report_quality_review: !!presence['analysis_document.report_quality_review'],
            source_file_tier_reviews: (0, utils_1.asList)(bundle.source_file_tier_reviews).length,
            skill_workbench_reviews: (0, utils_1.asList)(bundle.skill_workbench_reviews).length,
            detail_agent_plan: bundle.llm_detail_agent_plan?.uses_pre_final_plan_artifact === true,
            detail_reviews: (0, utils_1.asList)(bundle.source_family_detail_reviews).length
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
        summary: 'Semantic completeness, documentation quality and decision readiness are authored by the LLM through requirements_trace and report_quality_review. The CLI validates deterministic contracts only.'
    };
}
function extractLlmAnalysisStrategy(strategyDoc, hasStrategyArtifact) {
    const directStrategy = strategyDoc?.analysis_strategy && typeof strategyDoc.analysis_strategy === 'object'
        ? strategyDoc.analysis_strategy
        : strategyDoc;
    const hasStrategy = !!directStrategy && typeof directStrategy === 'object' && !Array.isArray(directStrategy);
    const summary = String(directStrategy?.summary || '').trim();
    const wholeRepoFirstPlan = String(directStrategy?.whole_repo_first_plan || directStrategy?.whole_repository_plan || '').trim();
    const candidateSlices = (0, utils_1.asList)(directStrategy?.candidate_source_slices || directStrategy?.source_slices);
    const skillPlan = (0, utils_1.asList)(directStrategy?.skill_application_plan || directStrategy?.skills);
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
        semantic_verdict_authority: 'llm',
        missing,
        candidate_source_slice_count: candidateSlices.length,
        skill_application_count: skillPlan.length,
        evidence: (0, utils_1.asList)(directStrategy?.evidence)
    };
}
function skillWorkbenchId(value, index = 0) {
    if (typeof value === 'string')
        return (0, utils_1.cleanId)(value) || `skill-workbench-${index + 1}`;
    if (!value || typeof value !== 'object')
        return '';
    return (0, utils_1.cleanId)(value.id || value.skill_workbench_id || value.task_id || value.skill_id || value.name) || `skill-workbench-${index + 1}`;
}
function extractLlmSkillWorkbenchPlan(strategyDoc, manifest, hasStrategyArtifact) {
    const directStrategy = strategyDoc?.analysis_strategy && typeof strategyDoc.analysis_strategy === 'object'
        ? strategyDoc.analysis_strategy
        : strategyDoc;
    const plannedRows = (0, utils_1.asList)(directStrategy?.skill_application_plan || directStrategy?.skills || directStrategy?.planned_skill_workbenches);
    const tasks = plannedRows.map((row, index) => ({
        id: skillWorkbenchId(row, index),
        skill_id: row?.skill_id || row?.id || row?.name || skillWorkbenchId(row, index),
        purpose: row?.purpose || row?.why_it_matters || '',
        scope: row?.scope || row?.source_scope || '',
        focus: (0, utils_1.asList)(row?.focus || row?.expected_outputs),
        evidence: (0, utils_1.asList)(row?.evidence || row?.initial_evidence)
    }));
    const manifestTasks = (0, utils_1.asList)(manifest?.tasks);
    const noSkillDecision = directStrategy?.no_skill_workbenches_needed === true || (0, utils_1.asList)(directStrategy?.skill_workbench_not_planned || directStrategy?.not_planned).length > 0;
    return {
        contract_kind: 'llm_strategy_skill_workbench_plan',
        semantic_verdict_authority: 'llm',
        deterministic_contract_scope: 'analysis_strategy.skill_application_plan shape, materialized task manifest presence and exact planned review id reconciliation only',
        planning_source: hasStrategyArtifact ? 'llm/analysis-strategy.json' : 'missing_llm_analysis_strategy',
        uses_analysis_strategy_artifact: hasStrategyArtifact,
        version: skillWorkbenches_1.SKILL_WORKBENCH_VERSION,
        planning_decision_present: tasks.length > 0 || noSkillDecision,
        no_skill_workbenches_needed: directStrategy?.no_skill_workbenches_needed === true,
        planned_count: tasks.length,
        materialized_task_count: manifestTasks.length,
        materialized_task_manifest_present: manifest?.mode === 'llm_strategy_skill_workbenches',
        tasks,
        materialized_tasks: manifestTasks,
        not_planned: (0, utils_1.asList)(directStrategy?.skill_workbench_not_planned || directStrategy?.not_planned),
        evidence: (0, utils_1.asList)(directStrategy?.evidence)
    };
}
function detailReviewFamilyId(value) {
    if (typeof value === 'string')
        return value.trim();
    if (!value || typeof value !== 'object')
        return '';
    return String(value.source_family || value.family || value.name || '').trim();
}
function extractLlmDetailAgentPlan(planDoc, doc, hasPreFinalPlanArtifact) {
    const directPlan = planDoc?.detail_agent_plan && typeof planDoc.detail_agent_plan === 'object'
        ? planDoc.detail_agent_plan
        : planDoc;
    const directTasks = (0, utils_1.asList)(directPlan?.tasks || directPlan?.detail_agent_tasks);
    if (directPlan && typeof directPlan === 'object' && (directTasks.length || directPlan.summary || directPlan.whole_repo_context || directPlan.planning_stage)) {
        const seen = new Set();
        const tasks = directTasks
            .map((task) => {
            const sourceFamily = detailReviewFamilyId(task);
            if (!sourceFamily)
                return null;
            return {
                ...task,
                source_family: sourceFamily,
                authored_section: task?.authored_section || 'llm/detail-agent-plan.json',
                authored_block_title: task?.authored_block_title || String(directPlan.summary || 'LLM detail-agent plan').slice(0, 120)
            };
        })
            .filter(Boolean)
            .filter((task) => {
            if (seen.has(task.source_family))
                return false;
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
            evidence: (0, utils_1.asList)(directPlan.evidence)
        };
    }
    const tasks = [];
    const evidence = [];
    for (const section of (0, utils_1.asList)(doc?.sections)) {
        for (const block of (0, utils_1.asList)(section?.blocks)) {
            if (block?.type !== 'agent_plan')
                continue;
            evidence.push(...(0, utils_1.asList)(block.evidence));
            for (const task of (0, utils_1.asList)(block.tasks || block.detail_agent_tasks)) {
                const sourceFamily = detailReviewFamilyId(task);
                if (!sourceFamily)
                    continue;
                tasks.push({
                    ...task,
                    source_family: sourceFamily,
                    authored_section: section.id || section.title || '',
                    authored_block_title: block.title || ''
                });
            }
        }
    }
    const seen = new Set();
    const deduped = tasks.filter(task => {
        if (seen.has(task.source_family))
            return false;
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
function computeDetailReviewSynthesisStatus(doc, reviews) {
    const executedFamilies = (0, utils_1.asList)(reviews)
        .map((r) => detailReviewFamilyId(r))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
    const uniqueExecuted = [...new Set(executedFamilies)];
    const synthesis = doc?.detail_review_synthesis || {};
    const integratedFamilies = (0, utils_1.asList)(synthesis.integrated_detail_reviews)
        .map(detailReviewFamilyId)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
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
        evidence: (0, utils_1.asList)(synthesis.evidence)
    };
}
function skillReviewId(value, index = 0) {
    if (typeof value === 'string')
        return (0, utils_1.cleanId)(value) || `skill-workbench-${index + 1}`;
    if (!value || typeof value !== 'object')
        return '';
    return (0, utils_1.cleanId)(value.id || value.skill_workbench_id || value.task_id || value.skill_id || value.name) || `skill-workbench-${index + 1}`;
}
function computeSkillWorkbenchCoverage(plan, reviews, manifest, sourceTierCoverage) {
    const planned = (0, utils_1.asList)(plan?.tasks)
        .map((task, index) => skillReviewId(task, index))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
    const plannedIds = [...new Set(planned)];
    const materializedIds = [...new Set((0, utils_1.asList)(manifest?.tasks)
            .map((task, index) => skillReviewId(task, index))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b)))];
    const executedIds = [...new Set((0, utils_1.asList)(reviews)
            .map((review, index) => skillReviewId(review, index))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b)))];
    const materializedSet = new Set(materializedIds);
    const executedSet = new Set(executedIds);
    const pendingMaterialization = plannedIds.filter(id => !materializedSet.has(id));
    const pendingExecution = plannedIds.filter(id => !executedSet.has(id));
    const unexpectedReviews = executedIds.filter(id => !plannedIds.includes(id));
    const usesAnalysisStrategyPlan = plan?.uses_analysis_strategy_artifact === true;
    const sourceTierComplete = sourceTierCoverage?.complete === true;
    const materializedTaskManifestPresent = plan?.materialized_task_manifest_present === true;
    const planningDecisionPresent = plan?.planning_decision_present === true;
    const noSkillDecision = plan?.no_skill_workbenches_needed === true;
    const complete = usesAnalysisStrategyPlan
        && sourceTierComplete
        && planningDecisionPresent
        && (noSkillDecision || materializedTaskManifestPresent)
        && pendingMaterialization.length === 0
        && pendingExecution.length === 0
        && unexpectedReviews.length === 0;
    const status = !usesAnalysisStrategyPlan
        ? 'missing_analysis_strategy'
        : !sourceTierComplete
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
        semantic_verdict_authority: 'llm',
        deterministic_contract_scope: 'planned skill ids from analysis_strategy, materialized task ids and executed skill_reviews ids only; no semantic scoring of skill-review quality',
        complete,
        status,
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
            ? sourceTierComplete
                ? `${plannedIds.filter(id => executedSet.has(id)).length}/${plannedIds.length} LLM-planned skill workbenches executed.`
                : `Skill workbenches are planned but wait for Tier 1 file-card coverage: ${sourceTierCoverage?.tier1_file_cards || 0}/${sourceTierCoverage?.total_files || 0} files.`
            : planningDecisionPresent
                ? 'The LLM analysis strategy explicitly decided that no skill workbench tasks are needed.'
                : 'The LLM analysis strategy did not plan skill workbenches and did not explicitly justify skipping them.'
    };
}
function computeSkillWorkbenchSynthesisStatus(doc, reviews) {
    const executedIds = (0, utils_1.asList)(reviews)
        .map((review, index) => skillReviewId(review, index))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
    const uniqueExecuted = [...new Set(executedIds)];
    const synthesis = doc?.skill_workbench_synthesis || {};
    const integratedIds = (0, utils_1.asList)(synthesis.integrated_skill_workbenches || synthesis.integrated_reviews)
        .map((item, index) => skillReviewId(item, index))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
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
        evidence: (0, utils_1.asList)(synthesis.evidence)
    };
}
function computeDetailReviewCoverage(plan, reviews, synthesis) {
    const planned = (0, utils_1.asList)(plan?.tasks)
        .map((t) => detailReviewFamilyId(t))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
    const plannedFamilies = [...new Set(planned)];
    const executedFamilies = [...new Set((0, utils_1.asList)(reviews)
            .map((r) => detailReviewFamilyId(r))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b)))];
    const integratedFamilies = [...new Set((0, utils_1.asList)(synthesis?.integrated_detail_reviews)
            .map(detailReviewFamilyId)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b)))];
    const executedSet = new Set(executedFamilies);
    const integratedSet = new Set(integratedFamilies);
    const pendingExecution = plannedFamilies.filter(family => !executedSet.has(family));
    const pendingIntegration = executedFamilies.filter(family => !integratedSet.has(family));
    const unexpectedReviews = executedFamilies.filter(family => !plannedFamilies.includes(family));
    const usesPreFinalPlanArtifact = plan?.uses_pre_final_plan_artifact === true;
    const noDetailReviewDecisionPresent = plannedFamilies.length > 0
        || plan?.no_detail_reviews_needed === true
        || (0, utils_1.asList)(plan?.not_planned).length > 0;
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
function computeReportMode(doc, detailCoverage, synthesis, skillSynthesis, prerequisiteCoverage, qualityReview, goalTraceAlignment) {
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
                ? 'The visible human report exists, but final readiness waits for required workflow artifacts, synthesis_stage=final_after_detail_reviews, an LLM report-quality review with verdict=decision_ready, explicit LLM goal-trace references, planned skill-workbench synthesis, a pre-final LLM detail-agent plan, planned detail-review execution and synthesis.'
                : 'The visible human report is not complete until an LLM-authored analysis_document with sections is provided.'
    };
}
function loadLlmOutputs(llmDir) {
    const result = {};
    const outputPresence = {};
    result.__output_presence = outputPresence;
    if (!require('node:fs').existsSync(llmDir))
        return result;
    const fs = require('node:fs');
    const files = fs.readdirSync(llmDir).filter((f) => f.endsWith('.json')).sort();
    for (const f of files) {
        const data = (0, utils_1.loadJson)(utils_1.Path.join(llmDir, f), {});
        if (!data || typeof data !== 'object' || Array.isArray(data))
            continue;
        for (const key of ['capabilities', 'interfaces', 'flows', 'business_logic', 'findings', 'refactoring', 'modernization', 'integrations', 'side_effects']) {
            if (key in data) {
                markOutputPresence(outputPresence, key, data[key]);
                if (!Array.isArray(result[key]))
                    result[key] = [];
                result[key].push(...(0, utils_1.asList)(data[key]));
            }
        }
        for (const key of ['assessment', 'architecture', 'documentation', 'domain_model', 'data_model', 'process', 'quality', 'analysis_strategy', 'detail_agent_plan', 'analysis_document']) {
            if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
                markOutputPresence(outputPresence, key, data[key]);
                if (!result[key])
                    result[key] = {};
                (0, utils_1.mergeDict)(result[key], data[key]);
            }
        }
        if (data.analysis_coverage && typeof data.analysis_coverage === 'object' && !Array.isArray(data.analysis_coverage)) {
            markOutputPresence(outputPresence, 'analysis_coverage', data.analysis_coverage);
            if (!result.analysis_coverage)
                result.analysis_coverage = {};
            (0, utils_1.mergeDict)(result.analysis_coverage, data.analysis_coverage);
        }
    }
    return result;
}
function loadSkillWorkbenchOutputs(reviewDir) {
    const fs = require('node:fs');
    const reviews = [];
    const coverageItems = [];
    if (!fs.existsSync(reviewDir))
        return { reviews, coverageItems };
    const files = fs.readdirSync(reviewDir).filter((f) => f.endsWith('.json')).sort();
    for (const f of files) {
        const data = (0, utils_1.loadJson)(utils_1.Path.join(reviewDir, f), {});
        if (!data || typeof data !== 'object' || Array.isArray(data))
            continue;
        if (data.skill_workbench_review)
            reviews.push(data.skill_workbench_review);
        if (data.analysis_coverage)
            coverageItems.push(data.analysis_coverage);
    }
    return { reviews, coverageItems };
}
function hasOutputContent(value) {
    if (value === undefined || value === null)
        return false;
    if (Array.isArray(value))
        return value.length > 0 && value.some(hasOutputContent);
    if (typeof value === 'object')
        return Object.keys(value).length > 0 && Object.values(value).some(hasOutputContent);
    if (typeof value === 'string')
        return value.trim().length > 0;
    if (typeof value === 'boolean')
        return value;
    return true;
}
function markOutputPresence(out, key, value) {
    if (!key || !hasOutputContent(value))
        return;
    out[key] = true;
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return;
    for (const [childKey, childValue] of Object.entries(value)) {
        markOutputPresence(out, `${key}.${childKey}`, childValue);
    }
}
function loadDetailOutputs(detailDir) {
    const fs = require('node:fs');
    const reviews = [];
    const coverageItems = [];
    if (!fs.existsSync(detailDir))
        return { reviews, coverageItems };
    const files = fs.readdirSync(detailDir).filter((f) => f.endsWith('.json')).sort();
    for (const f of files) {
        const data = (0, utils_1.loadJson)(utils_1.Path.join(detailDir, f), {});
        if (!data || typeof data !== 'object' || Array.isArray(data))
            continue;
        if (data.source_family_detail_review)
            reviews.push(data.source_family_detail_review);
        if (data.analysis_coverage)
            coverageItems.push(data.analysis_coverage);
    }
    return { reviews, coverageItems };
}
function loadSourceTierOutputs(sourceTierDir) {
    const fs = require('node:fs');
    const reviews = [];
    if (!fs.existsSync(sourceTierDir))
        return { reviews };
    const files = fs.readdirSync(sourceTierDir).filter((f) => f.endsWith('.json')).sort();
    for (const f of files) {
        const data = (0, utils_1.loadJson)(utils_1.Path.join(sourceTierDir, f), {});
        if (!data || typeof data !== 'object' || Array.isArray(data))
            continue;
        if (data.source_file_tier_review)
            reviews.push(data.source_file_tier_review);
    }
    return { reviews };
}
function mergeCoverage(base, additions) {
    const out = { ...(base || {}) };
    out.inspected_files = [...(0, utils_1.asList)(out.inspected_files)];
    out.deferred_files = [...(0, utils_1.asList)(out.deferred_files)];
    out.open_questions = [...(0, utils_1.asList)(out.open_questions)];
    for (const item of additions || []) {
        out.inspected_files.push(...(0, utils_1.asList)(item?.inspected_files));
        out.deferred_files.push(...(0, utils_1.asList)(item?.deferred_files));
        out.open_questions.push(...(0, utils_1.asList)(item?.open_questions));
    }
    return out;
}
function validateItems(repo, items) {
    return items.map(item => validateNested(repo, item));
}
function validateNested(repo, value) {
    if (Array.isArray(value))
        return value.map(x => validateNested(repo, x));
    if (!value || typeof value !== 'object')
        return value;
    const out = {};
    for (const [key, v] of Object.entries(value)) {
        if (key === 'evidence' && Array.isArray(v))
            out[key] = v.map(ev => validateEvidence(repo, ev));
        else
            out[key] = validateNested(repo, v);
    }
    return out;
}
function validateEvidence(repo, ev) {
    if (!ev || typeof ev !== 'object')
        return { path: String(ev), line: 1, valid: false, reason: 'invalid evidence object' };
    const relativePath = String(ev.path || '');
    const line = Number(ev.line || 1);
    const full = utils_1.Path.join(repo, relativePath);
    const fs = require('node:fs');
    if (!relativePath || relativePath.includes('..'))
        return { ...ev, line, valid: false, reason: 'invalid path' };
    if (!fs.existsSync(full))
        return { ...ev, line, valid: false, reason: 'file not found' };
    const snippet = (0, utils_1.getLine)(full, line);
    if (!snippet && line > 1)
        return { ...ev, line, valid: false, reason: 'line not found' };
    return { ...ev, line, valid: true, snippet };
}
function collectEvidence(value) {
    const out = [];
    function walk(v) {
        if (Array.isArray(v)) {
            for (const x of v)
                walk(x);
            return;
        }
        if (!v || typeof v !== 'object')
            return;
        if (Array.isArray(v.evidence))
            out.push(...v.evidence);
        for (const [k, child] of Object.entries(v))
            if (k !== 'evidence')
                walk(child);
    }
    walk(value);
    return out;
}
function dedupeEvidence(items) {
    const seen = new Set();
    const out = [];
    for (const e of items) {
        const key = `${e.path || ''}:${e.line || 1}:${e.symbol || ''}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(e);
    }
    return out.sort((a, b) => String(a.path || '').localeCompare(String(b.path || '')) || Number(a.line || 1) - Number(b.line || 1));
}
function coveragePathsFromItems(items, kind, inventoryPaths) {
    const paths = new Set();
    const invalid = [];
    const ignored = [];
    for (const item of (0, utils_1.asList)(items)) {
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
function computeSourceCoverage(codeMap, evidenceIndex, analysisCoverage) {
    const files = (0, utils_1.asList)(codeMap.files);
    const inventoryPaths = new Set(files.map((f) => String(f.path || '')).filter(Boolean));
    const evidencePaths = new Set((evidenceIndex || []).filter((e) => e?.valid !== false && e?.path).map((e) => String(e.path)));
    const inspectedCoverage = coveragePathsFromItems(analysisCoverage?.inspected_files, 'inspected', inventoryPaths);
    const deferredCoverage = coveragePathsFromItems(analysisCoverage?.deferred_files, 'deferred', inventoryPaths);
    const inspectedPaths = inspectedCoverage.paths;
    const deferredPaths = deferredCoverage.paths;
    const invalidCoverageItems = [...inspectedCoverage.invalid, ...deferredCoverage.invalid];
    const ignoredCoverageItems = [...inspectedCoverage.ignored, ...deferredCoverage.ignored];
    const coveredPaths = new Set([...evidencePaths, ...inspectedPaths]);
    const rows = files.map((f) => {
        let status = 'uncovered';
        if (evidencePaths.has(f.path))
            status = 'evidence_backed';
        else if (inspectedPaths.has(f.path))
            status = 'marked_inspected';
        else if (deferredPaths.has(f.path))
            status = 'deferred';
        return {
            path: f.path,
            module: f.module,
            roles: f.roles || [],
            language: f.language,
            lines: f.lines,
            status
        };
    });
    const incomplete = rows.filter((r) => r.status === 'uncovered' || r.status === 'deferred');
    const moduleMap = {};
    for (const row of rows) {
        const m = moduleMap[row.module] || { name: row.module, files: 0, covered_files: 0, uncovered_files: 0 };
        m.files += 1;
        if (row.status === 'uncovered' || row.status === 'deferred')
            m.uncovered_files += 1;
        else
            m.covered_files += 1;
        moduleMap[row.module] = m;
    }
    const total = rows.length;
    const covered = total - incomplete.length;
    const contractComplete = incomplete.length === 0 && invalidCoverageItems.length === 0;
    return {
        contract_kind: 'source_inventory_accounting',
        semantic_verdict_authority: 'llm',
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
        evidence_backed_files: rows.filter((r) => r.status === 'evidence_backed').length,
        explicitly_inspected_files: inspectedPaths.size,
        deferred_files: deferredPaths.size,
        deferred_not_analyzed_files: rows.filter((r) => r.status === 'deferred').length,
        invalid_coverage_items: invalidCoverageItems.length,
        invalid_coverage_item_examples: invalidCoverageItems.slice(0, 80),
        ignored_out_of_scope_coverage_items: ignoredCoverageItems.length,
        ignored_out_of_scope_coverage_item_examples: ignoredCoverageItems.slice(0, 80),
        skipped_files: (0, utils_1.asList)(codeMap.skipped_files).length,
        inventory_accounting_percent: total ? Math.round((covered / total) * 1000) / 10 : 100,
        coverage_percent: total ? Math.round((covered / total) * 1000) / 10 : 100,
        modules: Object.values(moduleMap).sort((a, b) => b.uncovered_files - a.uncovered_files || String(a.name).localeCompare(String(b.name))),
        uncovered: incomplete.slice(0, 500),
        skipped: (0, utils_1.asList)(codeMap.skipped_files).slice(0, 200),
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
function computeSourceTierCoverage(codeMap, sourceFileTierReviews, manifest) {
    const files = (0, utils_1.asList)(codeMap.files);
    const inventoryPaths = new Set(files.map((f) => String(f.path || '')).filter(Boolean));
    const plannedTasks = (0, utils_1.asList)(manifest?.tasks);
    const plannedTaskIds = new Set(plannedTasks.map((task) => String(task?.id || '')).filter(Boolean));
    const executedTaskIds = new Set();
    const cards = new Map();
    const invalid = [];
    const duplicates = [];
    const blockedTasks = [];
    for (const review of (0, utils_1.asList)(sourceFileTierReviews)) {
        const taskId = String(review?.task_id || '').trim();
        if (taskId)
            executedTaskIds.add(taskId);
        const status = String(review?.review_status || '').toLowerCase();
        if (status && status !== 'complete')
            blockedTasks.push({ task_id: taskId, status });
        for (const card of (0, utils_1.asList)(review?.files)) {
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
            if (cards.has(path))
                duplicates.push({ path, first_task_id: cards.get(path)?.task_id || '', duplicate_task_id: taskId });
            const summary = String(card.summary || '').trim();
            const technicalRole = String(card.technical_role || '').trim();
            const tier = String(card.tier || '').trim();
            const depth = Number(card.analysis_depth || 0);
            const evidence = (0, utils_1.asList)(card.evidence);
            if (tier !== 'tier1_file_card')
                invalid.push({ task_id: taskId, path, reason: 'file card tier must be tier1_file_card' });
            if (depth < 1)
                invalid.push({ task_id: taskId, path, reason: 'file card analysis_depth must be at least 1' });
            if (!summary)
                invalid.push({ task_id: taskId, path, reason: 'file card missing summary' });
            if (!technicalRole)
                invalid.push({ task_id: taskId, path, reason: 'file card missing technical_role' });
            if (!evidence.length)
                invalid.push({ task_id: taskId, path, reason: 'file card missing evidence' });
            if (evidence.some((ev) => ev?.valid === false))
                invalid.push({ task_id: taskId, path, reason: 'file card has invalid evidence' });
            cards.set(path, { ...card, task_id: taskId });
        }
    }
    const missingFiles = files
        .map((f) => f.path)
        .filter((path) => !cards.has(path));
    const missingTaskOutputs = plannedTaskIds.size
        ? [...plannedTaskIds].filter(id => !executedTaskIds.has(id))
        : [];
    const total = files.length;
    const covered = total - missingFiles.length;
    const complete = total > 0 && missingFiles.length === 0 && invalid.length === 0 && duplicates.length === 0 && blockedTasks.length === 0 && missingTaskOutputs.length === 0;
    return {
        contract_kind: 'tiered_whole_codebase_file_analysis',
        semantic_verdict_authority: 'llm',
        deterministic_contract_scope: 'exact source-inventory path reconciliation, required Tier 1 card fields, valid evidence presence, planned task execution and duplicate detection only',
        tier_model: (0, sourceTiers_1.sourceTierModelArtifact)(),
        status: complete ? 'complete' : 'partial',
        complete,
        tier1_required_for_every_file: true,
        total_files: total,
        tier1_file_cards: cards.size,
        missing_tier1_files: missingFiles.length,
        invalid_file_cards: invalid.length,
        duplicate_file_cards: duplicates.length,
        blocked_tasks: blockedTasks.length,
        planned_task_count: plannedTaskIds.size,
        executed_task_count: executedTaskIds.size,
        missing_task_outputs: missingTaskOutputs,
        coverage_percent: total ? Math.round((covered / total) * 1000) / 10 : 100,
        missing_file_examples: missingFiles.slice(0, 200),
        invalid_file_card_examples: invalid.slice(0, 80),
        duplicate_file_card_examples: duplicates.slice(0, 80),
        blocked_task_examples: blockedTasks.slice(0, 80),
        summary: complete
            ? 'Every included source-inventory file has a valid LLM-authored Tier 1 file card.'
            : 'Tier 1 whole-codebase file-card coverage is incomplete. Final readiness must remain partial until every included file has a valid LLM-authored file card.'
    };
}
function hasLlmAuthoredOutputPresence(outputPresence, sourceTierReviews, detailReviews) {
    return Object.keys(outputPresence || {}).length > 0
        || (0, utils_1.asList)(sourceTierReviews).length > 0
        || (0, utils_1.asList)(detailReviews).length > 0;
}
function pendingAnalysisCoverage() {
    return {
        summary: 'Pending whole-codebase coverage accounting.',
        inspected_files: [],
        deferred_files: [],
        open_questions: ['The agent harness/LLM has not yet recorded which files from the source inventory were semantically inspected and which Tier 1 file cards still need to be authored.']
    };
}

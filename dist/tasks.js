"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeLlmTasks = writeLlmTasks;
exports.writeDetailTasksFromLlmPlan = writeDetailTasksFromLlmPlan;
const utils_1 = require("./utils");
const targetCoverage_1 = require("./targetCoverage");
const utils_2 = require("./utils");
const reportComponents_1 = require("./reportComponents");
const analysisPipeline_1 = require("./analysisPipeline");
const analysisSkills_1 = require("./analysisSkills");
const analysisGoal_1 = require("./analysisGoal");
const toolPositioningReferences_1 = require("./toolPositioningReferences");
const sourceTiers_1 = require("./sourceTiers");
const WORKFLOW_TASKS = [
    { id: 'analysis_strategy', filename: '00-analysis-strategy.md', output: 'analysis-strategy.json', title: 'LLM Repository Analysis Strategy', task_kind: 'workflow_task', required_for_final: true },
    { id: 'detail_agent_plan', filename: '11-detail-agent-plan.md', output: 'detail-agent-plan.json', title: 'LLM Source-Family Detail Agent Plan', task_kind: 'workflow_task', required_for_final: true },
    { id: 'analysis_document', filename: '12-analysis-document.md', output: 'analysis-document.json', title: 'Final LLM Authored Analysis Document', task_kind: 'workflow_task', required_for_final: true }
];
const CAPABILITY_TEMPLATES = [
    { id: 'core_assessment', filename: '01-core-assessment.md', output: 'core-assessment.json', title: 'Core Assessment and Decision Summary' },
    { id: 'business_capabilities_logic', filename: '02-business-capabilities-logic.md', output: 'business-capabilities-logic.json', title: 'Business Capabilities and Business Logic' },
    { id: 'interface_contract_extraction', filename: '03-interface-contract-extraction.md', output: 'interfaces-contracts.json', title: 'Interface and Contract Extraction' },
    { id: 'request_response_examples', filename: '04-request-response-examples.md', output: 'request-response-examples.json', title: 'Request and Response Examples' },
    { id: 'openapi_soap_graphql', filename: '05-openapi-soap-graphql.md', output: 'openapi-soap-graphql.json', title: 'OpenAPI, Swagger, SOAP, WSDL, XSD and GraphQL' },
    { id: 'flows_mermaid', filename: '06-flows-mermaid.md', output: 'flows-mermaid.json', title: 'Flows, Scenarios and Mermaid Diagrams' },
    { id: 'domain_data_integrations', filename: '07-domain-data-integrations.md', output: 'domain-data-integrations.json', title: 'Domain, Data, Integrations and Side Effects' },
    { id: 'process_quality_readiness', filename: '08-process-quality-readiness.md', output: 'process-quality-readiness.json', title: 'Process, Quality and Readiness Assessment' },
    { id: 'architecture_refactoring_roadmap', filename: '09-architecture-refactoring-roadmap.md', output: 'architecture-refactoring-roadmap.json', title: 'Architecture, Refactoring and Modernization Roadmap' },
    { id: 'report_completeness_review', filename: '10-report-completeness-review.md', output: 'report-completeness-review.json', title: 'Report Completeness and Gap Review', coverage_mode: 'final_inventory_reconciliation' }
].map(task => ({ ...task, task_kind: 'capability_template', required_for_final: false }));
function writeLlmTasks(analysisDir, codeMap) {
    const tasksDir = utils_2.Path.join(analysisDir, 'llm_tasks');
    const templatesDir = utils_2.Path.join(analysisDir, 'capability_templates');
    const llmDir = utils_2.Path.join(analysisDir, 'llm');
    const dataDir = utils_2.Path.join(analysisDir, 'data');
    (0, utils_1.ensureDir)(tasksDir);
    (0, utils_1.ensureDir)(templatesDir);
    (0, utils_1.ensureDir)(llmDir);
    (0, utils_1.ensureDir)(dataDir);
    const profile = codeMap.profile || {};
    const modules = (codeMap.modules || []).slice(0, 24);
    const signals = (codeMap.signals || []).slice(0, 200);
    const capsules = (codeMap.capsules || []).slice(0, 40);
    const glossary = (codeMap.glossary_terms || []).slice(0, 120);
    const artifactCandidates = (codeMap.artifact_navigation_candidates || codeMap.important_docs || []).slice(0, 150);
    const componentLibrary = (0, reportComponents_1.reportComponentLibraryArtifact)();
    const skillCatalog = (0, analysisSkills_1.analysisSkillCatalogArtifact)();
    const goalContract = (0, analysisGoal_1.analysisGoalContractArtifact)();
    const toolPositioningReferences = (0, toolPositioningReferences_1.toolPositioningReferencesArtifact)();
    const tierManifest = (0, sourceTiers_1.writeSourceTierTasks)(analysisDir, codeMap);
    const expectedTaskFiles = new Set(WORKFLOW_TASKS.map(task => task.filename));
    for (const file of utils_1.FS.readdirSync(tasksDir).filter((name) => name.endsWith('.md'))) {
        if (!expectedTaskFiles.has(file))
            utils_1.FS.unlinkSync(utils_2.Path.join(tasksDir, file));
    }
    const expectedTemplateFiles = new Set(CAPABILITY_TEMPLATES.map(task => task.filename));
    for (const file of utils_1.FS.readdirSync(templatesDir).filter((name) => name.endsWith('.md'))) {
        if (!expectedTemplateFiles.has(file))
            utils_1.FS.unlinkSync(utils_2.Path.join(templatesDir, file));
    }
    (0, utils_1.writeText)(utils_2.Path.join(analysisDir, 'llm_instructions.md'), overview(profile, modules, signals, glossary, capsules, artifactCandidates, componentLibrary, skillCatalog, goalContract, toolPositioningReferences, tierManifest));
    (0, utils_1.writeJson)(utils_2.Path.join(dataDir, 'source-family-inventory.json'), sourceFamilyInventory(codeMap));
    (0, utils_1.writeJson)(utils_2.Path.join(dataDir, 'analysis-goal-contract.json'), goalContract);
    (0, utils_1.writeJson)(utils_2.Path.join(dataDir, 'tool-positioning-references.json'), toolPositioningReferences);
    const legacyWorkplan = utils_2.Path.join(dataDir, 'source-family-workplan.json');
    if (utils_1.FS.existsSync(legacyWorkplan))
        utils_1.FS.unlinkSync(legacyWorkplan);
    const taskDefs = [];
    for (const task of WORKFLOW_TASKS) {
        const body = taskBody(task, profile, modules, signals, capsules, glossary, artifactCandidates, componentLibrary, skillCatalog, goalContract, toolPositioningReferences, tierManifest);
        (0, utils_1.writeText)(utils_2.Path.join(tasksDir, task.filename), body);
        taskDefs.push({ id: task.id, title: task.title, task_kind: 'workflow_task', required_for_final: true, task_file: `llm_tasks/${task.filename}`, expected_output: `llm/${task.output}`, status: 'pending' });
    }
    const templateDefs = [];
    for (const task of CAPABILITY_TEMPLATES) {
        const body = taskBody(task, profile, modules, signals, capsules, glossary, artifactCandidates, componentLibrary, skillCatalog, goalContract, toolPositioningReferences, tierManifest);
        (0, utils_1.writeText)(utils_2.Path.join(templatesDir, task.filename), body);
        templateDefs.push({ id: task.id, title: task.title, task_kind: 'capability_template', required_for_final: false, template_file: `capability_templates/${task.filename}`, suggested_output: `llm/${task.output}`, status: 'available_when_llm_strategy_selects' });
    }
    const pipeline = (0, analysisPipeline_1.analysisPipelineArtifact)(taskDefs, templateDefs);
    const capabilityTemplateManifest = {
        mode: 'optional_llm_capability_templates',
        semantic_authority: 'llm',
        deterministic_authority: 'template_catalog_shape_only',
        summary: 'These generic templates are optional capability/output contracts. They are not executed as a fixed mandatory path and do not block final readiness unless the LLM strategy explicitly uses their outputs.',
        templates: templateDefs
    };
    (0, utils_1.writeJson)(utils_2.Path.join(dataDir, 'analysis-skill-catalog.json'), skillCatalog);
    (0, utils_1.writeJson)(utils_2.Path.join(analysisDir, 'analysis-pipeline.json'), pipeline);
    (0, utils_1.writeJson)(utils_2.Path.join(dataDir, 'analysis-pipeline.json'), pipeline);
    (0, utils_1.writeJson)(utils_2.Path.join(analysisDir, 'capability-template-manifest.json'), capabilityTemplateManifest);
    (0, utils_1.writeJson)(utils_2.Path.join(dataDir, 'capability-template-manifest.json'), capabilityTemplateManifest);
    (0, utils_1.writeJson)(utils_2.Path.join(analysisDir, 'task-manifest.json'), { mode: 'llm_first_workflow_tasks', implementation_language: 'TypeScript', pipeline, source_tier_tasks: tierManifest.tasks, capability_templates: templateDefs, tasks: taskDefs });
    return taskDefs;
}
function writeDetailTasksFromLlmPlan(analysisDir, plan) {
    const tasksDir = utils_2.Path.join(analysisDir, 'detail_tasks');
    const reviewsDir = utils_2.Path.join(analysisDir, 'detail_reviews');
    (0, utils_1.ensureDir)(tasksDir);
    (0, utils_1.ensureDir)(reviewsDir);
    for (const file of utils_1.FS.readdirSync(tasksDir).filter((name) => name.endsWith('.md'))) {
        utils_1.FS.unlinkSync(utils_2.Path.join(tasksDir, file));
    }
    const planTasks = plan?.tasks || [];
    const tasks = planTasks.map((task, index) => {
        const id = task.id || `detail-${String(task.source_family || `source-family-${index + 1}`).replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`;
        const filename = `${String(index + 1).padStart(3, '0')}-${id}.md`;
        const output = `detail_reviews/${id}.json`;
        (0, utils_1.writeText)(utils_2.Path.join(tasksDir, filename), detailTaskBody(task, output));
        return {
            id,
            source_family: task.source_family,
            recommended_agent: task.recommended_agent,
            task_file: `detail_tasks/${filename}`,
            expected_output: output,
            authored_section: task.authored_section,
            authored_block_title: task.authored_block_title,
            priority_score: task.priority_score,
            evidence_level_target: task.evidence_level_target,
            focus: task.focus,
            status: 'pending'
        };
    });
    (0, utils_1.writeJson)(utils_2.Path.join(analysisDir, 'detail-task-manifest.json'), {
        mode: 'llm_authored_source_family_detail_agents',
        planning_source: plan?.planning_source || 'llm/detail-agent-plan.json',
        summary: 'These focused source-family detail tasks were mechanically materialized from the LLM-authored detail-agent plan. Complete these reviews before authoring the final LLM analysis document.',
        tasks
    });
    return tasks;
}
function detailTaskBody(task, output) {
    return `# Source-Family Detail Review · ${task.source_family}

You are a focused source-family detail agent for Cognianalysis.

## Inputs

Read first:

- \`.analysis/llm_instructions.md\`
- \`.analysis/data/source-inventory.json\`
- \`.analysis/data/source-tier-model.json\`
- \`.analysis/source_tiers/*.json\`
- \`.analysis/data/analysis-goal-contract.json\`
- \`.analysis/data/code-map.json\`
- \`.analysis/data/source-family-inventory.json\`
- \`.analysis/source-capsules.json\`
- \`.analysis/llm/detail-agent-plan.json\`
- existing \`.analysis/llm/*.json\` extraction outputs
- existing \`.analysis/llm/analysis-document.json\` only when you are updating a previous final report
- the seed files listed below

This task is a semantic review, not a code-map summary. Open source files, tests, docs, contracts, schemas and configuration directly. Do not use filename, regex or word-match hints as proof of behavior.
Use Tier 1 file cards as broad context only. They help prevent blind spots, but deep review claims still need direct file:line evidence from source.

## Source family

\`\`\`json
${JSON.stringify({
        source_family: task.source_family,
        recommended_agent: task.recommended_agent,
        evidence_level_target: task.evidence_level_target,
        focus: task.focus,
        reason: task.reason,
        seed_files: task.seed_files,
        expected_outputs: task.expected_outputs
    }, null, 2)}
\`\`\`

## Write Output

Write valid JSON to \`.analysis/${output}\`.

Expected JSON:

\`\`\`json
{
  "source_family_detail_review": {
    "source_family": "${String(task.source_family || '').replace(/"/g, '\\"')}",
    "review_status": "complete, partial or blocked",
    "summary": "Human-readable purpose and role of this source family.",
    "business_view": {
      "purpose": "...",
      "capabilities": [
        {"name":"...", "description":"...", "actors":[], "evidence":[]}
      ],
      "user_or_system_flows": [
        {"name":"...", "description":"...", "evidence":[]}
      ]
    },
    "technical_view": {
      "architecture_role": "...",
      "entry_points": [
        {"name":"...", "protocol":"Repository-specific protocol/interface style, or unknown.", "path":"optional", "description":"...", "evidence":[]}
      ],
      "exits_or_integrations": [
        {"name":"...", "protocol":"...", "description":"...", "evidence":[]}
      ],
      "data_and_state": [
        {"name":"...", "kind":"Repository-specific data/state kind, or unknown.", "description":"...", "evidence":[]}
      ]
    },
    "flows": [
      {
        "title":"...",
        "summary":"...",
        "mermaid":{"diagram_type":"Mermaid diagram type chosen to fit the flow.", "source":"sequenceDiagram\\n  A->>B: ...", "evidence":[]},
        "steps":[{"order":1, "actor":"...", "description":"...", "evidence":[]}],
        "evidence":[]
      }
    ],
    "quality_and_process": {
      "findings": [
        {"title":"...", "category":"Repository-specific finding category.", "severity":"Repository-specific severity or priority.", "description":"...", "recommendation":"...", "evidence":[]}
      ],
      "test_readiness": "Repository-specific readiness statement.",
      "process_improvements": [
        {"title":"...", "description":"...", "evidence":[]}
      ]
    },
    "refactoring_and_target_architecture": {
      "recommendations": [
        {"title":"...", "benefit":"...", "risk":"Repository-specific risk statement.", "effort":"Repository-specific effort estimate.", "target_state":"...", "evidence":[]}
      ]
    },
    "open_questions": [
      {"question":"...", "why_it_matters":"...", "owner":"Repository-specific owner or unknown.", "evidence":[]}
    ],
    "evidence": []
  },
  "analysis_coverage": {
    "summary": "Which source files were inspected for this detail review.",
    "inspected_files": [
      {"path":"relative/path/File.ext", "reason":"...", "evidence":[{"path":"relative/path/File.ext", "line":1}]}
    ],
    "deferred_files": [
      {"path":"relative/path/File.ext", "reason":"Repository-specific task-local reason; deferral never counts as completed Tier 1 analysis.", "evidence":[{"path":"relative/path/File.ext", "line":1}]}
    ],
    "open_questions": []
  }
}
\`\`\`

Rules:

- Every substantive claim needs file:line evidence.
- If the source family is generated/config/test-only, say so explicitly and explain what can and cannot be inferred.
- Preserve uncertainty. Do not claim business-owner meaning unless code/tests/docs/contracts prove it.
- Include at least one open question when owner-grade semantics are not provable.
`;
}
function sourceFamilyInventory(codeMap) {
    const filesByModule = {};
    for (const file of codeMap.files || []) {
        const module = file.module || 'repository';
        filesByModule[module] || (filesByModule[module] = []);
        filesByModule[module].push(file);
    }
    const partitions = (codeMap.modules || []).map((m) => {
        const files = (filesByModule[m.name] || []).sort((a, b) => ((b.navigation_score || b.score || 0) - (a.navigation_score || a.score || 0)));
        return {
            name: m.name,
            partition_kind: 'navigation_partition',
            semantic_authority: false,
            semantic_family_name: null,
            llm_detail_plan_authority: false,
            seed_file_meaning: 'Seed files are starting points for LLM inspection only; they are not proof of behavior, priority or completeness.',
            boundary_source: m.boundary_source || 'path_partition',
            boundary_evidence: m.boundary_evidence || [],
            files: m.files || 0,
            source_files: m.source_files || 0,
            navigation_tags: m.navigation_tags || m.roles || {},
            roles: m.roles || {},
            navigation_signals: m.navigation_signals || m.signals || {},
            signals: m.signals || {},
            seed_files: files.slice(0, 12).map((f) => ({
                path: f.path,
                navigation_tags: f.navigation_tags || f.roles || [],
                roles: f.roles || [],
                navigation_score: f.navigation_score || f.score || 0,
                rank_score: f.navigation_score || f.score || 0,
                score: f.score || 0,
                signals: f.signal_count || 0,
                symbols: f.symbol_count || 0
            }))
        };
    }).sort((a, b) => (b.files || 0) - (a.files || 0) || String(a.name).localeCompare(String(b.name)));
    return {
        artifact_kind: 'navigation_partition_inventory',
        mode: 'deterministic_inventory_only',
        semantic_authority: false,
        deterministic_scope: 'filesystem path partitioning, file-format inventory tags and file-size ranking only; no project-manifest detection, no import parsing, no symbol parsing, no framework detection, no contract detection and no example detection',
        artifact_name_note: 'The legacy filename source-family-inventory.json is kept for workflow compatibility. Its contents are mechanical navigation partitions, not semantic source families.',
        forbidden_use: [
            'Do not treat partition names as semantic source-family names.',
            'Do not choose detail-review priorities from navigation rank alone.',
            'Do not use partition counts as evidence that business behavior is understood.',
            'Do not report seed files as proof of routes, interfaces, flows, quality or architecture.'
        ],
        llm_required_action: 'The LLM must author repository-specific source-family names, purposes, priorities, skipped areas and detail-review decisions in llm/detail-agent-plan.json after whole-repository extraction.',
        summary: 'This is a mechanical inventory partition for navigation. Tags, ranks and path partitions are not semantic proof and do not parse imports, symbols, frameworks, contracts or examples. The LLM must author the actual detail-agent plan in llm/detail-agent-plan.json after whole-repository overview extraction and before the final analysis document.',
        total_inventory_partitions: partitions.length,
        inventory_partitions: partitions
    };
}
function overview(profile, modules, signals, glossary, capsules, importantDocs, componentLibrary, skillCatalog, goalContract, toolPositioningReferences, tierManifest) {
    return `# Cognianalysis · LLM-first Instructions

This repository must be analyzed semantically by an agent harness/LLM. The generated code map is a navigation aid, not the source of final truth.

## Non-negotiable rules

- Treat \`code-map.json\`, \`source-capsules.json\`, \`navigation-artifact-candidates.json\` and the legacy \`important-docs.json\` as inventory/discovery aids.
	- Do **not** treat navigation hints as business facts, technical claims, interfaces, flows or entrypoints.
	- The deterministic map is intentionally inventory-only: it does not parse imports, symbols, framework names, contracts, examples, tests, entrypoints or relationships. The LLM must open source files and parse/understand those semantics itself.
	- Start with \`.analysis/llm_tasks/00-analysis-strategy.md\`. The LLM-authored \`.analysis/llm/analysis-strategy.json\` is the repository-specific analysis plan. The files under \`.analysis/capability_templates/\` are optional templates, not a fixed semantic information architecture and not a mandatory execution list.
	- Treat \`source-family-inventory.json\` as a legacy workflow filename for mechanical navigation partitions. The legacy filename does not mean the CLI has authored semantic source families; the LLM must decide whether to rename, merge, split, reject or defer partitions as repository-specific source families.
	- Do not use word matches, regex matches or filename matches as proof of behavior. Open the source and reason semantically.
- Use source files, tests, DTO/schema files, OpenAPI/Swagger, SOAP/WSDL/XSD, GraphQL schemas, event schemas, examples, CI/CD files, configuration and documentation as evidence.
- Every relevant assertion must include \`evidence: [{"path":"...", "line": 123, "symbol":"optional"}]\`.
- Extract requests, responses, contracts, examples, business logic, functions, flows, domain models, data effects, integrations, process readiness, architecture and refactoring options.
- Produce a structured decision basis: functional view, technical view, decision points, risks, recommendations, target architecture/tech-stack options and tool-positioning notes.
- If OpenAPI/Swagger, SOAP/WSDL/XSD, Postman, \`.http\`, docs or tests contain request/response examples, extract them.
- If no explicit example exists, create an inferred example only when \`example_origin\` is \`inferred\`; evidence must point to the source fields and rules used.
- Every meaningful flow must contain Mermaid source. Prefer \`sequenceDiagram\`; use \`flowchart TD\` or \`stateDiagram-v2\` when better.
- Extract business logic and function/use-case examples explicitly; do not bury them only in prose.
- Extract domain/data/integration and process-readiness views; the assessment must not stop at documentation.
- If behavior cannot be proven from code/docs, put it into \`open_questions\`.
- Semantic completeness, documentation quality and management readiness are LLM judgments. Deterministic checks may require the LLM-authored judgment to exist and be structured, but must not replace it with keyword, menu or block-presence scoring.
- Keep production code read-only unless explicitly asked otherwise.
- Use English for generated JSON text and report-facing content, while preserving original domain terms and identifiers.
- Always produce whole-repository documentation before any module or source-family deep dive.
- Execute every \`.analysis/source_tier_tasks/*.md\` task before the final analysis document. These tasks create Tier 1 LLM-authored file cards for every included file. A file that is only listed in \`analysis_coverage.deferred_files\` is not analyzed and must not count as done.
- Use the tier model explicitly: Tier 0 is CLI inventory only, Tier 1 is mandatory per-file LLM understanding, Tier 2 is module/source-family synthesis, Tier 3 is behavior/contract/flow deep dive, and Tier 4 is decision/refactoring/process analysis.
- For monorepos or multi-module repositories, summarize the complete source-family landscape: purpose, responsibility, entry points, exits/integrations, tests/examples, confidence and open questions for each relevant family.
	- Create repository-specific skill workbench tasks from the LLM-authored analysis strategy before treating any generic capability template output as useful. Capability templates are optional output contracts, not the repository-specific semantic plan and not final-readiness gates.
	- Create the LLM detail-agent plan only after the LLM-authored analysis strategy, Tier 1 file cards, LLM-planned skill workbench reviews and whole-repository extraction tasks have produced a repository-wide picture.
- Author final summaries, E2E understanding, management statements and the visible report only after all planned detail-agent reviews exist and have been synthesized. Earlier tasks may extract building blocks, but must not pretend to be the final report.
- Do not make one module the narrative center unless the source inventory proves the repository is actually single-module. A focused deep review must be labelled as a deep slice and must not replace the whole-repository view.
- If E2E flow extraction is deep only for part of the repository, state that boundary explicitly and keep the remaining source families visible as surface-reviewed or follow-up drilldown areas.
	- The final report should be authored by the LLM as a repo-specific analysis document. The renderer provides a stable component library and validation; it must not dictate a fixed one-size-fits-all information architecture.
- Tool positioning must be concrete and LLM-authored. Use the official reference facts below as market context, not as repo evidence and not as a deterministic verdict. Then state what this analysis replaces, complements or cannot safely decide for this repository, with source evidence and handoff boundaries.

## Tool-positioning reference categories

These categories are external market context for comparison, not repository evidence. They are also written to \`.analysis/data/tool-positioning-references.json\`. Use them only to frame positioning; use source evidence for claims about this repository. Preserve the distinction between official reference facts, repository evidence and LLM-authored judgment.

\`\`\`json
${JSON.stringify(toolPositioningReferences, null, 2)}
\`\`\`

## Target capabilities that must be addressed

\`\`\`json
${JSON.stringify(targetCoverage_1.TARGET_CAPABILITIES.map(c => ({ id: c.id, title: c.title, expected_outputs: c.expected_outputs })), null, 2)}
\`\`\`

## Original analysis goal contract

This preserves the original product objective for the LLM. It is context, not a deterministic checklist or readiness verdict. Final semantic status must be authored through \`analysis_document.requirements_trace\` and \`analysis_document.report_quality_review\`.

\`\`\`json
${JSON.stringify(goalContract, null, 2)}
\`\`\`

## Tiered whole-codebase analysis model

This model prevents blind spots. Source inventory alone is Tier 0 and has no semantic authority. Every included file needs a Tier 1 LLM-authored file card in \`.analysis/source_tiers/*.json\`; selected areas are then promoted to Tier 2-4 for technical drilldown, flows, risks and decisions.

\`\`\`json
${JSON.stringify({
        model: tierManifest?.model,
        task_count: tierManifest?.task_count,
        total_files: tierManifest?.total_files,
        source_tier_task_manifest: '.analysis/source-tier-task-manifest.json',
        source_tier_tasks: '.analysis/source_tier_tasks/*.md',
        source_tier_outputs: '.analysis/source_tiers/*.json'
    }, null, 2)}
	\`\`\`

## LLM analysis skill catalog

Use these as reusable analysis capabilities, not as deterministic routing rules. The LLM decides which skills matter for this repository and how deeply to apply them.

\`\`\`json
${JSON.stringify(skillCatalog, null, 2)}
\`\`\`

## Repo snapshot

\`\`\`json
${JSON.stringify(profile, null, 2)}
\`\`\`

## Top modules

\`\`\`json
${JSON.stringify(modules.slice(0, 14), null, 2)}
\`\`\`

## Navigation artifact candidates, not final facts

\`\`\`json
${JSON.stringify(importantDocs.slice(0, 100), null, 2)}
\`\`\`

## Deterministic signal list

This should be empty for inventory-only preparation. If it is non-empty, treat entries as non-authoritative debug data and re-derive meaning from source.

\`\`\`json
${JSON.stringify(signals.slice(0, 90), null, 2)}
\`\`\`

## Report component library

Use this renderer/styling contract for \`analysis_document.sections[].blocks[]\`. The component library is not a semantic-quality checklist.

\`\`\`json
${JSON.stringify(componentLibrary, null, 2)}
\`\`\`

## Top glossary terms

Domain terms must be extracted by the agent harness/LLM from source evidence, not from generated word lists.

## Context capsules

The full included file inventory is in \`.analysis/data/source-inventory.json\`. The source excerpts are in \`.analysis/source-capsules.json\`. Use capsules to decide what to open next, but inspect full source files whenever evidence is needed. Do not treat capsule coverage as whole-codebase coverage.

## Optional capability templates

Generic templates live in \`.analysis/capability_templates/*.md\`. They are reusable prompts for common output shapes only. Do not execute all templates by default. The LLM-authored analysis strategy and skill workbench findings decide whether a template output is useful for this repository.
`;
}
function taskBody(task, profile, modules, signals, capsules, glossary, importantDocs, componentLibrary, skillCatalog, goalContract, toolPositioningReferences, tierManifest) {
    const isCapabilityTemplate = task.task_kind === 'capability_template';
    const hints = {
        repo: profile,
        source_inventory: {
            file_count: profile.total_files || 0,
            source_files: profile.source_files || 0,
            skipped_files: profile.skipped_files || 0,
            inventory_file: '.analysis/data/source-inventory.json'
        },
        top_modules: modules.slice(0, 10),
        artifact_navigation_candidates: importantDocs.slice(0, 38),
        important_docs: importantDocs.slice(0, 38),
        report_component_library: componentLibrary,
        analysis_skill_catalog: skillCatalog,
        analysis_goal_contract: goalContract,
        source_tier_model: tierManifest?.model,
        source_tier_task_manifest: {
            task_count: tierManifest?.task_count,
            total_files: tierManifest?.total_files,
            manifest_file: '.analysis/source-tier-task-manifest.json',
            task_dir: '.analysis/source_tier_tasks',
            output_dir: '.analysis/source_tiers'
        },
        tool_positioning_reference: toolPositioningReferences,
        deterministic_signal_list: signals.slice(0, 60),
        top_capsules: capsules.slice(0, 18).map(c => ({ path: c.path, navigation_tags: c.navigation_tags || c.roles, roles: c.roles })),
        glossary: glossary.slice(0, 90)
    };
    return `# ${task.title}

You are running inside an agent harness as the semantic extraction step for Cognianalysis.

Task id: \`${task.id}\`
Task kind: \`${isCapabilityTemplate ? 'optional capability template' : 'required workflow task'}\`

${isCapabilityTemplate
        ? 'This file is a reusable capability template, not a mandatory repository-analysis step. Execute it only when the LLM-authored analysis strategy, a skill workbench review or the final synthesis explicitly needs this output. Do not execute all capability templates just because they exist.'
        : 'This file is part of the required LLM workflow gate for analysis strategy, detail planning or final report authoring.'}

Read these files first:

- \`.analysis/llm_instructions.md\`
- \`.analysis/data/code-map.json\`
- \`.analysis/data/source-inventory.json\`
- \`.analysis/data/source-tier-model.json\`
	- \`.analysis/source-tier-task-manifest.json\`
	- all completed \`.analysis/source_tiers/*.json\` outputs
	- \`.analysis/skill-workbench-task-manifest.json\` when it exists
	- all completed \`.analysis/skill_reviews/*.json\` outputs
- \`.analysis/capability-template-manifest.json\` only as optional template context; it is not the semantic plan
- \`.analysis/data/analysis-goal-contract.json\`
- \`.analysis/data/tool-positioning-references.json\`
- \`.analysis/data/navigation-artifact-candidates.json\` (or legacy \`.analysis/data/important-docs.json\`)
- \`.analysis/data/source-family-inventory.json\`
- \`.analysis/source-capsules.json\`

	Then open source files, tests, docs, contracts, schemas and configuration as needed. The deterministic map does not parse imports, symbols, framework names, contracts, examples, tests, entrypoints or relationships; the LLM must parse and decide those from source. The source capsules and inventory-ranked seed files are only navigation aids. The source inventory defines the full included analysis scope; do not stop at the top capsules.
		If this is not task \`analysis_strategy\`, read \`.analysis/llm/analysis-strategy.json\` first when it exists and follow its repository-specific analysis plan. If it does not exist yet, author it before treating any later task as final-ready.
		Tier 1 file cards are the broad base for whole-codebase understanding. If \`.analysis/source_tiers/*.json\` is incomplete, do not claim whole-codebase completion; execute the missing \`.analysis/source_tier_tasks/*.md\` tasks first or mark final readiness partial.
		After \`analysis_strategy\` and Tier 1 cards exist, run \`cognianalysis finalize . --allow-partial\` to materialize \`.analysis/skill_workbench_tasks/*.md\` from \`analysis_strategy.skill_application_plan[]\`. Execute those LLM-planned skill workbenches before using any generic capability-template output as a supporting building block.
		Generic capability templates are optional. Prefer repository-specific \`.analysis/skill_workbench_tasks/*.md\` and direct final synthesis. If you use a template output, explain in the JSON why this capability output was needed for this repository.
	For large repositories, use \`.analysis/data/source-family-inventory.json\` only as navigation context. The legacy filename does not mean the CLI has authored semantic source families. The actual source-family/detail-agent plan must be authored by the LLM in \`.analysis/llm/detail-agent-plan.json\`; deterministic inventory partitions are not semantic proof, not detail-review priorities and not source-family names.

Write your result to \`.analysis/llm/${task.output}\` as valid JSON.

Evidence format for every relevant claim:

\`\`\`json
{"path": "relative/path/File.ext", "line": 123, "symbol": "optionalSymbol"}
\`\`\`

General rules:

- Use English for generated descriptions. Preserve original identifiers and domain names.
- Do not include markdown in the JSON output.
- Prefer concrete evidence over speculation.
- Do not promote generated hints, word matches, regex matches or filename matches into semantic conclusions.
- Account for the source inventory without using deferral as a success path. Every output must include \`analysis_coverage.inspected_files[]\` for files you opened or semantically considered. Use \`analysis_coverage.deferred_files[]\` only for task-local scope boundaries or blocked follow-up; deferred files are not finished whole-codebase analysis. Tier 1 file-card coverage in \`.analysis/source_tiers/*.json\` is the required broad base.
- Start from the full repository scope. Summarize the whole source-family landscape before focusing on a specific module, framework, interface type or flow family.
- For multi-module repositories, include source-family statements across the repository; a deep slice is acceptable only when clearly labelled and paired with whole-repo coverage context.
- Avoid single-module bias. If one family has the strongest evidence, explain why it is strongest and which other families remain surface-reviewed or require follow-up drilldown.
- When using navigation partitions, the LLM must decide whether to rename, merge, split, reject or defer them as semantic source families. Do not copy partition names into management prose unless source evidence proves they are meaningful to the repository.
- Preserve the original target picture: automated source-code analysis that produces a structured decision basis with four levels: reverse engineering/documentation, code analysis, process analysis, and refactoring/target architecture.
- The final report is allowed to have a different structure for every repository, but it must still cover functional view, technical view, source-derived decision basis, automation boundaries, and comparison/positioning against traditional code-analysis/documentation tools.
- When writing tool positioning, use the provided reference categories: consulting/gen-AI delivery suites, structural architecture mapping, static quality/security gates and automated transformation engines. Be explicit about whether the analysis replaces discovery, complements graph/scanner/recipe tools, or should hand off to them.
	- Do not author final management summaries, E2E conclusions or visible report sections until the final analysis-document task. Use the earlier LLM-planned skill workbenches and generic capability contracts to build source-backed blocks, examples, flows, findings and the detail-agent plan.
	- The final analysis-document task must read all skill workbench reviews, all extraction outputs and all executed \`.analysis/detail_reviews/*.json\` files, then synthesize the complete picture.
- Deterministic scripts only validate JSON shape, evidence references, output presence and renderer component compatibility. They do not decide whether the report is complete, well documented or management-ready. Those semantic judgments must be authored by the LLM in \`analysis_document.requirements_trace\` and \`analysis_document.report_quality_review\`.
- Do not leave empty sections or empty component blocks for the renderer to explain. If something is unknown, author an \`open_questions\` block or a narrative limitation with evidence context; the renderer will not generate placeholder report prose for you.
- Use a clear \`confidence\` statement and \`open_questions\` when behavior is unclear.
- Do not modify production source files.

Rules for examples:

- Extract existing request/response examples from docs, OpenAPI/Swagger examples, SOAP/WSDL examples, Postman collections, \`.http\` files and tests when present.
- If examples are not present but can be inferred from DTO/schema/tests, include them with \`example_origin: "inferred"\` and evidence for every meaningful field.
- Never label inferred examples as source-provided.
- Include payload examples as JSON/XML/string objects or escaped strings. Keep them small but realistic.
- Include Mermaid diagrams as source text in a \`mermaid\` object or \`mermaid_flows\` entries.

## Navigation hints

\`\`\`json
${JSON.stringify(hints, null, 2)}
\`\`\`

${schemaForTask(task.id)}

	${coverageSchema(task)}
	`;
}
function coverageSchema(task) {
    const emphasis = task.coverage_mode === 'final_inventory_reconciliation'
        ? 'For this final pre-report completeness task, reconcile the full `.analysis/data/source-inventory.json` inventory with `.analysis/source_tiers/*.json`. A file is not complete merely because it is deferred. If Tier 1 file cards are missing, add an analysis-gap finding, keep readiness partial, and identify the missing source_tier_tasks that must run. Also review the report narrative for single-module bias: if the repository is multi-module, the final output must contain a whole-repository view and source-family coverage notes before any deep slice.'
        : 'For this task, list the files you inspected for this extraction area. Use deferred files only for this task-local extraction scope; deferral does not satisfy whole-codebase completion.';
    return `## Required Source Inventory Accounting

${emphasis}

Whole-codebase completion is checked through \`.analysis/source_tiers/*.json\` Tier 1 file-card coverage. Do not use \`deferred_files\` as a substitute for file analysis.

Include this top-level object in the JSON:

\`\`\`json
{
  "analysis_coverage": {
    "summary": "How much of the included source inventory this task covered.",
    "inspected_files": [
      {"path": "relative/path/File.ext", "reason": "Why this file was inspected for semantic extraction.", "evidence": [{"path": "relative/path/File.ext", "line": 1}]}
    ],
    "deferred_files": [
      {"path": "relative/path/File.ext", "reason": "Repository-specific task-local reason; deferral never counts as completed Tier 1 analysis.", "evidence": [{"path": "relative/path/File.ext", "line": 1}]}
    ],
    "open_questions": []
  }
}
\`\`\``;
}
function schemaForTask(taskId) {
    if (taskId === 'analysis_strategy')
        return `## Expected JSON

	This is the first semantic planning task. Do not analyze only the top capsules and do not lock the report into the generated task order. Use the source inventory, navigation partitions, component library, skill catalog and original goal contract to author a repository-specific analysis strategy that later tasks must follow.

	The strategy should answer: how should this repository be understood, which source slices look meaningful, which skill workbenches should be materialized from \`skill_application_plan[]\`, how will every file receive Tier 1 coverage, what deeper reviews may be necessary, and what kind of final report structure would be useful for humans.

The deterministic CLI will only check that this LLM-authored strategy exists and is structured. It will not judge whether the chosen strategy is semantically correct; that remains the LLM's responsibility and must be revisited in report_quality_review.

{
  "analysis_strategy": {
    "planning_stage": "pre_source_tier_pre_overview",
    "planning_source": "llm/analysis-strategy.json",
    "summary": "Repository-specific analysis approach in human language.",
    "whole_repo_first_plan": "How the full source inventory will be understood before deep dives.",
    "tier_plan": {
      "tier1": "How every included file will receive a shallow file card.",
      "tier2": "How module/source-family synthesis will be formed from Tier 1 plus source evidence.",
      "tier3": "Which behavior, interface, flow or contract areas likely need deep review.",
      "tier4": "Which decision, risk, process or refactoring questions the final report must answer."
    },
    "candidate_source_slices": [
      {"name":"Repository-specific slice name", "slice_kind":"Repository-specific slice kind in free text.", "why_it_matters":"...", "initial_evidence":[]}
    ],
	    "skill_application_plan": [
	      {"id":"stable-skill-workbench-id", "skill_id":"skill id from analysis_skill_catalog or custom", "purpose":"Why this skill matters here.", "scope":"Repository-specific scope.", "focus":["What this workbench must extract"], "evidence":[]}
	    ],
    "report_intent": {
      "audience": ["management", "architecture", "engineering"],
      "likely_sections": ["Repository-specific section idea, not a fixed menu"],
      "management_questions": ["Decision question the report should answer"],
      "technical_drilldown_questions": ["Deep technical question the report should answer"]
    },
    "known_risks_to_understanding": [
      {"risk":"...", "mitigation":"...", "evidence":[]}
    ],
    "open_questions": [
      {"question":"...", "why_it_matters":"...", "owner":"Repository-specific owner or unknown.", "evidence":[]}
    ],
    "evidence": []
  },
  "analysis_coverage": {
    "summary": "Which inventory, task/context artifacts and source files were inspected to create the strategy.",
    "inspected_files": [
      {"path":"relative/path/File.ext", "reason":"...", "evidence":[{"path":"relative/path/File.ext", "line":1}]}
    ],
    "deferred_files": [],
    "open_questions": []
  }
}`;
    if (taskId === 'detail_agent_plan')
        return `## Expected JSON

	This task happens after the LLM-authored analysis strategy, Tier 1 file-card coverage, LLM-planned skill workbench reviews, whole-repository extraction tasks and before the final report. Read \`.analysis/llm/analysis-strategy.json\`, all existing \`.analysis/skill_reviews/*.json\`, all existing \`.analysis/llm/*.json\` outputs except \`analysis-document.json\` as building blocks, plus the source inventory and source-family inventory. Then author a repository-specific plan for focused detail agents.

This is not the final report. Do not write management conclusions or final E2E synthesis here. The purpose is to decide which source families, interface areas or process routes need deeper LLM review before the final analysis document is authored.

Required planning intent:

		- Start from the complete repository picture produced by Tier 1 cards, LLM-planned skill workbench reviews and any optional capability-template outputs the LLM strategy explicitly selected.
- Use \`.analysis/data/source-family-inventory.json\` only as navigation context.
- Select detail tasks because they are important for business understanding, E2E behavior, interfaces/contracts, quality/process risk or refactoring decisions.
- Keep the plan generic: source families can be modules, bounded contexts, contract families, jobs, UI apps, data/integration areas or any repository-specific slice that makes semantic sense.
- Include seed files only as starting points; detail agents must open source directly.
- If no detail review is needed, return an empty \`tasks\` list, set \`no_detail_reviews_needed: true\`, and explain why through \`summary\`, \`not_planned[]\`, evidence or open questions. Do not leave \`tasks[]\` empty without an explicit LLM-authored skip rationale.

{
  "detail_agent_plan": {
    "planning_stage": "post_overview_pre_final_report",
    "planning_source": "llm/detail-agent-plan.json",
    "summary": "Why these focused detail reviews are needed before the final report.",
    "no_detail_reviews_needed": false,
    "whole_repo_context": "Short repository-wide picture used to choose detail slices.",
    "tasks": [
      {
        "id": "detail-source-family-id",
        "source_family": "Repository-specific family or slice name",
        "recommended_agent": "Skill id or custom agent name chosen by the LLM.",
        "priority": "Repository-specific priority rationale or label.",
        "priority_score": 0.0,
        "focus": ["What this detail review must understand"],
        "reason": "Why the final report should wait for this detail review.",
        "evidence_level_target": "Repository-specific evidence depth target.",
        "expected_outputs": ["business view", "technical view", "flows", "findings", "open questions"],
        "seed_files": ["relative/path/File.ext"],
        "evidence": []
      }
    ],
    "not_planned": [
      {"source_family":"...", "reason":"Repository-specific reason why no focused detail task is planned.", "evidence":[]}
    ],
    "evidence": []
  },
  "analysis_coverage": {
    "summary": "Which extraction outputs and source inventory areas informed the plan.",
    "inspected_files": [
      {"path":"relative/path/File.ext", "reason":"...", "evidence":[{"path":"relative/path/File.ext", "line":1}]}
    ],
    "deferred_files": [
      {"path":"relative/path/File.ext", "reason":"Repository-specific task-local reason; deferral never counts as completed Tier 1 analysis.", "evidence":[{"path":"relative/path/File.ext", "line":1}]}
    ],
    "open_questions": []
  }
}`;
    if (taskId === 'analysis_document')
        return `## Expected JSON

	This is the final synthesis task. Author it only after \`.analysis/llm/analysis-strategy.json\`, Tier 1 file-card coverage, all LLM-planned \`.analysis/skill_reviews/*.json\`, the whole-repository extraction outputs, \`.analysis/llm/detail-agent-plan.json\`, and all planned \`.analysis/detail_reviews/*.json\` outputs are present. Read all previous \`.analysis/skill_reviews/*.json\`, all previous \`.analysis/llm/*.json\` outputs, executed detail reviews, the bundle inputs, source inventory and evidence. Do not merely summarize task files. Compose a human-readable, decision-grade analysis document whose structure fits this repository.

The HTML renderer will provide the component library and styling. You decide the section order, emphasis and depth. When an \`analysis_document\` is present, \`analysis_document.sections[]\` is the complete visible report navigation and start order; generated code-map, coverage, quality-review, requirements-trace and raw-data views remain audit artifacts unless you intentionally author repository-specific sections/blocks for them.

Required report intent:

- Start with system understanding: whole-repository overview, important relationships, system entry/exit, E2E context, business need, business use and what the system appears to be for.
- Use the LLM-authored analysis strategy as the starting plan, then update or contradict it explicitly if later Tier 1/detail evidence proves a better report structure.
- Explain the tier model in the technical drilldown or evidence-governance area when it matters: Tier 1 file cards cover every included file, then Tier 2-4 deep dives cover important modules, flows, contracts, risks and refactoring decisions.
- Put the management/business narrative inside visible \`analysis_document.sections[].blocks[]\`, not only in top-level helper fields such as \`executive_decision_basis\`. Top-level fields can support automation, but the human report is the authored sections.
- Then cover the four required levels:
  - reverse_engineering_documentation: functionality, user/system flows, business capabilities
  - code_analysis: bugs, vulnerabilities, code quality, maintainability, test signals
  - process_analysis: process/readiness, delivery, observability, operational improvements
  - refactoring_target_architecture: modernization path, target architecture or new tech-stack options
- Include functional view and technical view.
- Include comparison/tool positioning: how this automated analysis compares to or complements consulting/gen-AI delivery suites, structural architecture mapping, static quality/security gates and automated transformation engines. Name the repo-specific decision value, what can be replaced, what is only complemented and the handoff boundaries. Use \`.analysis/data/tool-positioning-references.json\` as official market context only; source-code evidence remains required for repository-specific claims.
	- Include confidence, known gaps and open questions. Do not overclaim.
	- Every substantive claim must include evidence, or must be clearly listed as an open question.
	- Explicitly synthesize every executed LLM-planned skill workbench into the document. List the integrated skill workbench IDs in \`skill_workbench_synthesis.integrated_skill_workbenches\`; otherwise finalization will mark the report stale.
	- Explicitly synthesize every executed source-family detail review into the document. List the integrated source families in \`detail_review_synthesis.integrated_detail_reviews\`; otherwise finalization will mark the report stale.
- If the detail-agent plan still has unexecuted tasks, do not claim final readiness. Either wait for the reviews or mark the report partial with the missing families and open questions.
- If technical drilldown, evidence governance, quality-review, requirements-trace, coverage or raw-data explanation matters to the audience, create repository-specific sections for them inside \`analysis_document.sections\`. Do not rely on fixed appendix menu items.
- Each visible section should earn its place by explaining a business decision, business use, system relationship, risk, improvement path or technical drilldown. Avoid sections that merely enumerate classes, functions or files.
- Use \`agent_plan\` blocks only to show the already planned/executed detail-review basis or remaining follow-up. The source of executable pre-report detail tasks is \`.analysis/llm/detail-agent-plan.json\`, not the final report.
- Include \`report_quality_review\` as an LLM-authored self-audit of the final document. This is not a CLI text search. You must explicitly judge whether the authored report is management-ready, repo-specific, whole-repo-first, evidence-aware and covers the four requested service levels plus functional/technical views, improvements/refactoring and tool positioning.
- The CLI will trust this structured LLM judgment for semantic readiness. It only checks that the judgment exists, is explicit and can be rendered with evidence; it does not infer quality from keywords, class/function lists or fixed report menus.
- The CLI will also treat \`requirements_trace\` as an LLM-authored trace artifact, not as a fixed deterministic checklist. Use the original target picture below, but word and extend trace rows in the way that best fits the repository. The LLM verdict remains the semantic authority.
- For every original goal item you address, add \`goal_contract_refs\` to the relevant \`requirements_trace\` row. Use exact IDs from \`analysis_goal_contract\`: \`required_output_shape.<key>\`, \`required_levels.<id>\`, \`required_views.<id>\` and \`required_report_behaviors.<id>\`. This includes \`required_output_shape.management_drilldown\` for the visible business-need/business-use narrative with technical drilldown. The CLI checks only that these explicit references exist and are valid; it does not match trace labels by text and does not decide whether the goal is semantically satisfied.
- If any \`requirements_trace\` row is \`partial\` or \`open\` and \`report_quality_review.verdict\` is \`decision_ready\`, include \`report_quality_review.partial_requirement_rationale[]\` for every such row. This is where you explicitly explain why the remaining limit is acceptable for decision readiness, what follow-up remains, and which evidence or open question supports that judgment.
- The suggested \`checks\` are review prompts, not deterministic truth requirements. Set them honestly. If the report is useful but has known limits, use \`verdict: "partial"\` or keep \`verdict: "decision_ready"\` only when the decision basis is sufficient despite clearly stated follow-up.

Use only block types from \`report_component_library.components[].id\` in the context JSON so the renderer can keep the visual system consistent. The component library is a rendering contract, not a semantic-quality checklist.
Every authored section must contain at least one block, and every block must contain renderable fields or evidence. Do not rely on deterministic placeholder text; write the content, limitation or open question yourself.
Any block may include a \`labels\` object when the default component wording is not right for this repository. Use this to make group titles, table headers and follow-up wording repo-specific while keeping the same visual component.

{
  "analysis_document": {
    "title": "Repository-specific report title",
    "subtitle": "Short business/technical framing",
    "audience": ["management", "architecture", "engineering"],
    "authoring_mode": "llm",
    "synthesis_stage": "final_after_detail_reviews",
    "source_basis": "Short statement of which source inventory and extracted artifacts were used.",
    "requirements_trace": [
      {"requirement":"Reverse Engineering & Documentation", "goal_contract_refs":["required_levels.reverse_engineering_documentation", "required_report_behaviors.whole_repo_first", "required_report_behaviors.tiered_whole_codebase_analysis"], "covered_by_sections":["section-id"], "status":"covered, partial or open", "evidence":[]},
      {"requirement":"Code Analysis", "goal_contract_refs":["required_levels.code_analysis"], "covered_by_sections":["section-id"], "status":"covered, partial or open", "evidence":[]},
      {"requirement":"Process Analysis", "goal_contract_refs":["required_levels.process_analysis"], "covered_by_sections":["section-id"], "status":"covered, partial or open", "evidence":[]},
      {"requirement":"Refactoring / Target Architecture", "goal_contract_refs":["required_levels.refactoring_target_architecture"], "covered_by_sections":["section-id"], "status":"covered, partial or open", "evidence":[]},
      {"requirement":"Functional View", "goal_contract_refs":["required_views.functional_view", "required_report_behaviors.e2e_relationships"], "covered_by_sections":["section-id"], "status":"covered, partial or open", "evidence":[]},
      {"requirement":"Technical View", "goal_contract_refs":["required_views.technical_view"], "covered_by_sections":["section-id"], "status":"covered, partial or open", "evidence":[]},
      {"requirement":"Decision document output shape", "goal_contract_refs":["required_output_shape.deliverable", "required_output_shape.visible_report_authority", "required_output_shape.style_system", "required_output_shape.source_basis", "required_output_shape.automation_goal", "required_output_shape.management_drilldown"], "covered_by_sections":["section-id"], "status":"covered, partial or open", "evidence":[]},
      {"requirement":"Automation, evidence and tool positioning", "goal_contract_refs":["required_report_behaviors.llm_authored_report", "required_report_behaviors.detail_agents_after_overview", "required_report_behaviors.tool_positioning", "required_report_behaviors.evidence_and_uncertainty"], "covered_by_sections":["section-id"], "status":"covered, partial or open", "evidence":[]}
    ],
	    "executive_decision_basis": {
	      "summary": "Decision-grade summary.",
      "recommendation": "What stakeholders should do next.",
      "confidence": "Repository-specific confidence statement.",
      "evidence": [],
	      "open_questions": []
	    },
	    "skill_workbench_synthesis": {
	      "integrated_skill_workbenches": ["skill workbench id from .analysis/skill_reviews/*.json"],
	      "summary": "How LLM-planned skill workbench reviews shaped the final analysis document.",
	      "coverage_statement": "Which strategy-planned skill reviews are incorporated, which remain planned only, and whether the document is current.",
	      "evidence": []
	    },
	    "detail_review_synthesis": {
      "integrated_detail_reviews": ["source-family name from .analysis/detail_reviews/*.json"],
      "summary": "How executed detail-agent reviews changed or confirmed the final analysis document.",
      "coverage_statement": "Which source-family detail reviews are incorporated, which remain planned only, and whether the document is current.",
      "evidence": []
    },
    "report_quality_review": {
      "reviewer": "llm",
      "verdict": "decision_ready, partial or not_ready",
      "summary": "LLM-authored judgment of whether this is a management-ready decision document with technical drilldown.",
      "criteria": [
        {"name":"Repository-specific criterion", "verdict":"Repository-specific verdict.", "reason":"...", "evidence":[]}
      ],
      "findings": [
        {"title":"Quality review finding", "status":"Repository-specific review status.", "description":"...", "evidence":[]}
      ],
      "partial_requirement_rationale": [
        {"requirement":"Requirement name copied from requirements_trace when its status is partial/open", "status":"partial or open", "accepted_limit":"What remains incomplete.", "decision_ready_rationale":"Why the report can still be decision-ready, or use verdict partial/not_ready instead.", "follow_up":["..."], "evidence":[], "open_questions":[]}
      ],
      "checks": {
        "repo_specific_information_architecture": true,
        "management_ready_decision_basis": true,
        "whole_repo_first_understanding": true,
        "e2e_relationships_explained": true,
        "functional_view_explained": true,
        "technical_view_explained": true,
        "four_level_model_covered": true,
        "improvements_and_refactoring_covered": true,
        "tool_positioning_covered": true,
        "evidence_and_uncertainty_visible": true
      },
      "evidence": [],
      "open_questions": []
    },
    "sections": [
      {
        "id": "stable-section-id",
        "title": "Section title chosen for this repository",
        "level": "Repository-specific section level, audience or depth.",
        "intent": "Why this section exists for this repository.",
        "blocks": [
          {
            "type": "narrative",
            "title": "Optional block title",
            "text": ["Paragraph text"],
            "evidence": []
          },
          {
            "type": "statement_list",
            "title": "Optional block title",
            "items": [
              {"title":"Statement", "description":"...", "severity":"Repository-specific severity or priority.", "confidence":"Repository-specific confidence statement.", "evidence":[]}
            ]
          },
          {
            "type": "metric_grid",
            "title": "Optional block title",
            "metrics": [
              {"label":"Metric", "value":"123", "detail":"optional", "evidence":[]}
            ]
          },
          {
            "type": "source_family_map",
            "title": "Optional block title",
            "families": [
              {"name":"source family", "role":"responsibility", "business_use":"...", "technical_shape":"...", "evidence_level":"Repository-specific evidence depth statement.", "confidence":"Repository-specific confidence statement.", "evidence":[]}
            ]
          },
          {
            "type": "boundary_map",
            "title": "Optional block title",
            "labels": {"entries":"Repository-specific entry label", "exits":"Repository-specific exit/integration label", "state":"Repository-specific state/data label"},
            "entries": [{"name":"entry", "description":"...", "protocol":"...", "evidence":[]}],
            "exits": [{"name":"exit", "description":"...", "protocol":"...", "evidence":[]}],
            "state": [{"name":"state/store", "description":"...", "technology":"...", "evidence":[]}]
          },
          {
            "type": "flow",
            "title": "Optional block title",
            "summary": "...",
            "mermaid": {"diagram_type":"Mermaid diagram type chosen to fit the flow.", "source":"sequenceDiagram\\n  A->>B: ...", "evidence":[]},
            "steps": [{"order":1, "actor":"...", "description":"...", "evidence":[]}],
            "evidence": []
          },
          {
            "type": "four_level_assessment",
            "title": "Optional block title",
            "levels": [
              {"level":"Repository-specific analysis level.", "status":"Repository-specific status.", "summary":"...", "evidence":[], "next_steps":[]}
            ]
          },
          {
            "type": "decision_matrix",
            "title": "Optional block title",
            "labels": {"decision":"Decision", "options":"Options", "recommendation":"Recommendation", "risk":"Risk / Evidence"},
            "rows": [
              {"decision":"...", "options":["..."], "recommendation":"...", "risk":"...", "confidence":"Repository-specific confidence statement.", "evidence":[]}
            ]
          },
          {
            "type": "roadmap",
            "title": "Optional block title",
            "items": [
              {"title":"...", "phase":"Repository-specific phase.", "benefit":"...", "risk":"Repository-specific risk statement.", "effort":"Repository-specific effort estimate.", "evidence":[]}
            ]
          },
          {
            "type": "agent_plan",
            "title": "Optional block title",
            "labels": {"source_family":"Source Family", "priority":"Priority", "focus":"Focus", "expected_outputs":"Expected Outputs", "task_output":"Task / Output", "seed_files":"Seed Files"},
            "summary": "How detail agents should continue after the overview.",
            "tasks": [
              {"source_family":"...", "recommended_agent":"...", "priority":"Repository-specific priority rationale or label.", "focus":["..."], "expected_outputs":["..."], "seed_files":["path"], "evidence":[]}
            ]
          },
          {
            "type": "technical_drilldown",
            "title": "Optional block title",
            "references": [
              {"label":"...", "target":"Repository-specific section anchor.", "description":"..."}
            ]
          },
          {
            "type": "open_questions",
            "title": "Optional block title",
            "items": [
              {"question":"...", "why_it_matters":"...", "owner":"Repository-specific owner or unknown.", "evidence":[]}
            ]
          }
        ],
        "evidence": []
      }
    ]
  }
}`;
    if (taskId === 'core_assessment')
        return `## Expected JSON

{
  "assessment": {
    "executive_summary": "Decision-grade summary of what the repository appears to do and how complete the extraction is.",
    "repository_wide_view": {
      "summary": "Whole-repository business and technical story before any module deep dive.",
      "coverage_statement": "How the full included source inventory was considered.",
      "source_families": [
        {
          "name": "module or source-family name",
          "purpose": "Human-readable responsibility in the repository",
          "business_use": "Business or operational use visible from evidence",
          "entry_points": ["interface/path/job/topic/command if known"],
          "exits_or_integrations": ["external system/protocol/store/topic if known"],
          "evidence_level": "Repository-specific evidence depth statement.",
          "confidence": "Repository-specific confidence statement.",
          "evidence": [],
          "open_questions": []
        }
      ],
      "deep_slice_boundaries": [
        {"name":"Deeply reviewed area", "reason":"Why this area is deeper than the rest", "evidence": []}
      ],
      "e2e_coverage_statement": "Which source families have route/process-level E2E flow evidence and which remain pending."
    },
    "system_purpose": "Business purpose inferred from code/docs/tests.",
    "assessment_scope": ["What was analyzed"],
    "key_capabilities": ["Short capability names"],
    "key_interfaces": ["Main inbound/outbound interfaces"],
    "functional_view": {
      "summary": "What the system does from a business/user perspective.",
      "actors": ["actor or system role"],
      "capabilities": ["capability"],
      "user_or_system_flows": [{"name":"flow", "description":"...", "evidence": []}],
      "evidence": []
    },
    "technical_view": {
      "summary": "How the system is built and integrated.",
      "apis": ["API or interface"],
      "architecture": ["architecture component or style"],
      "data_and_integrations": ["data store, message, external system"],
      "evidence": []
    },
    "decision_basis": {
      "decision_summary": "Decision-grade conclusion for stakeholders.",
      "recommended_actions": [{"title":"action", "rationale":"...", "priority":"Repository-specific priority rationale or label.", "evidence": []}],
      "tradeoffs": [{"topic":"...", "options": [], "recommendation":"...", "evidence": []}],
      "readiness": {"status":"Repository-specific readiness status.", "rationale":"...", "evidence": []},
      "evidence": []
    },
    "tool_positioning": {
      "summary": "How this analysis output acts as an alternative or complement to existing code analysis/documentation tools.",
      "automation_level": "Repository-specific automation assessment.",
      "comparison_dimensions": [
        {"category":"Tool or service category being compared.", "positioning":"Repository-specific replace/complement/handoff assessment.", "summary":"...", "evidence":[]}
      ],
      "strengths_vs_traditional_tools": [],
      "complements": [],
      "boundaries": [],
      "recommended_use": "How stakeholders should use this report in a decision workflow.",
      "evidence": []
    },
    "top_risks": [
      {"title":"risk", "severity":"Repository-specific severity or priority.", "description":"...", "evidence": []}
    ],
    "completeness": {
      "whole_repository_view": "Repository-specific completeness assessment.",
      "source_family_coverage": "Repository-specific completeness assessment.",
      "business_logic": "Repository-specific completeness assessment.",
      "interfaces": "Repository-specific completeness assessment.",
      "flows": "Repository-specific completeness assessment.",
      "examples": "Repository-specific completeness assessment.",
      "process_readiness": "Repository-specific completeness assessment.",
      "refactoring_roadmap": "Repository-specific completeness assessment."
    },
    "recommended_next_steps": [
      {"title":"step", "reason":"...", "evidence": []}
    ],
    "open_questions": []
  }
}`;
    if (taskId === 'business_capabilities_logic')
        return `## Expected JSON

{
  "domain_model": {
    "glossary": [
      {"term":"Domain term", "meaning":"Meaning in this repository", "evidence": []}
    ],
    "entities": [
      {"name":"Entity", "description":"...", "key_fields":[{"name":"field", "meaning":"...", "evidence": []}], "states": [], "evidence": []}
    ],
    "state_models": [
      {"name":"Status model", "states": ["STATE"], "transitions": [{"from":"A", "to":"B", "condition":"...", "evidence": []}], "evidence": []}
    ]
  },
  "capabilities": [
    {
      "id": "stable-kebab-case-id",
      "name": "Business capability name",
      "description": "What the system enables from a business perspective.",
      "actors": ["user/system role"],
      "domain_terms": ["term"],
      "interfaces": ["interface-id-if-known"],
      "business_rules": [
        {"description": "rule", "rule_type":"Repository-specific business rule type.", "evidence": []}
      ],
      "business_logic": [
        {
          "name": "Decision/rule/calculation name",
          "description": "How the business decision works.",
          "logic_type": "Repository-specific business logic type.",
          "inputs": ["input field/domain value"],
          "outputs": ["status/result/error"],
          "example": {"input": {}, "output": {}, "explanation": "...", "example_origin": "source, test, doc or inferred"},
          "evidence": []
        }
      ],
      "function_examples": [
        {
          "title": "Business/function example",
          "function_or_use_case": "method/use case name",
          "input": {},
          "output": {},
          "explanation": "What this example demonstrates.",
          "example_origin": "source, test, doc or inferred",
          "evidence": []
        }
      ],
      "evidence": [],
      "confidence": "Repository-specific confidence statement.",
      "open_questions": []
    }
  ],
  "business_logic": [
    {"id":"logic-id", "title":"Reusable rule/logic", "description":"...", "examples": [], "evidence": []}
  ]
}`;
    if (taskId === 'interface_contract_extraction')
        return `## Expected JSON

{
  "interfaces": [
    {
      "id": "stable-interface-id",
      "type": "Repository-specific interface type.",
      "protocol": "Repository-specific protocol or null when not applicable.",
      "name": "Short name",
      "method": "Operation method, command, event name or null.",
      "path": "/path, topic, queue, command or SOAP operation",
      "description": "What this interface does.",
      "source_contracts": [
        {"kind": "Repository-specific contract/source kind.", "path":"...", "line":1, "operation_id":"optional", "evidence": []}
      ],
      "request": {"type": "DTO/schema name", "fields": [{"name":"field", "meaning":"business meaning", "required": true, "evidence": []}]},
      "response": {"type": "DTO/schema name", "fields": [{"name":"field", "meaning":"business meaning", "evidence": []}]},
      "examples": [
        {
          "title": "Example request/response",
          "example_origin": "openapi, soap, doc, test, postman or inferred",
          "request": {"headers": {}, "body": {}},
          "response": {"status": 200, "headers": {}, "body": {}},
          "evidence": []
        }
      ],
      "auth": {"required": true, "roles": [], "evidence": []},
      "errors": [{"condition":"...", "result":"...", "example": {}, "evidence": []}],
      "evidence": [],
      "confidence": "Repository-specific confidence statement.",
      "open_questions": []
    }
  ]
}`;
    if (taskId === 'request_response_examples')
        return `## Expected JSON

{
  "documentation": {
    "request_response_examples": [
      {
        "title": "Example title",
        "interface_id": "optional",
        "source": "Repository-specific source kind or inferred",
        "example_origin": "openapi, soap, doc, test, postman, http_file or inferred",
        "request": {"method":"POST", "path":"/example", "headers":{}, "body":{}},
        "response": {"status":200, "headers":{}, "body":{}},
        "errors": [{"status":400, "body":{}, "condition":"..."}],
        "evidence": []
      }
    ],
    "function_examples": [
      {
        "title": "Function or use-case example",
        "function_or_use_case": "name",
        "input": {},
        "output": {},
        "explanation": "...",
        "example_origin": "test, doc or inferred",
        "evidence": []
      }
    ]
  }
}`;
    if (taskId === 'openapi_soap_graphql')
        return `## Expected JSON

{
  "documentation": {
    "openapi": [
      {
        "title": "OpenAPI operation/example",
        "path": "contract path or operation path",
        "operation_id": "optional",
        "method": "POST",
        "route": "/example",
        "request_schema": "schema/component",
        "response_schema": "schema/component",
        "request_example": {},
        "response_example": {},
        "example_origin": "openapi, swagger or inferred",
        "evidence": []
      }
    ],
    "soap": [
      {
        "title": "SOAP/WSDL operation/example",
        "operation": "operation name",
        "soap_action": "optional",
        "input_message": "optional",
        "output_message": "optional",
        "faults": [],
        "request_envelope": "<soapenv:Envelope>...</soapenv:Envelope>",
        "response_envelope": "<soapenv:Envelope>...</soapenv:Envelope>",
        "example_origin": "wsdl, doc, test or inferred",
        "evidence": []
      }
    ],
    "contract_examples": [
      {"title":"Contract example", "kind":"Repository-specific contract kind.", "payload": {}, "example_origin":"doc, test or inferred", "evidence": []}
    ]
  }
}`;
    if (taskId === 'flows_mermaid')
        return `## Expected JSON

{
  "flows": [
    {
      "id": "stable-flow-id",
      "title": "Flow title",
      "capability_id": "capability-id-if-known",
      "interface_ids": ["interface-id"],
      "summary": "Short business/technical summary.",
      "mermaid": {
        "diagram_type": "Mermaid diagram type chosen to fit the flow.",
        "source": "sequenceDiagram\n  participant Client\n  Client->>API: ...",
        "evidence": []
      },
      "steps": [
        {"order": 1, "actor": "Repository-specific actor/system.", "description":"step", "kind":"Repository-specific step kind.", "request_response_ref":"optional interface/example id", "evidence": []}
      ],
      "business_logic_refs": ["capability-id#logic-name"],
      "side_effects": [{"type":"Repository-specific side effect type.", "description":"...", "evidence": []}],
      "examples": [{"title":"Flow example", "input": {}, "output": {}, "example_origin":"doc, test or inferred", "evidence": []}],
      "evidence": [],
      "confidence": "Repository-specific confidence statement.",
      "open_questions": []
    }
  ],
  "documentation": {
    "mermaid_flows": [
      {"title":"Flow title", "flow_id":"optional", "diagram_type":"Mermaid diagram type chosen to fit the flow.", "source":"sequenceDiagram\n  A->>B: ...", "evidence": []}
    ]
  }
}`;
    if (taskId === 'domain_data_integrations')
        return `## Expected JSON

{
  "data_model": {
    "entities": [
      {"name":"Entity/table/document", "kind":"Repository-specific data/domain kind.", "description":"...", "fields":[{"name":"field", "type":"optional", "meaning":"...", "evidence": []}], "evidence": []}
    ],
    "stores": [
      {"name":"store", "technology":"Repository-specific technology or unknown.", "usage":"Repository-specific usage.", "evidence": []}
    ],
    "state_changes": [
      {"entity":"Entity", "from":"optional", "to":"optional", "trigger":"...", "evidence": []}
    ]
  },
  "integrations": [
    {"id":"integration-id", "name":"External system/topic/queue/API", "direction":"Repository-specific direction.", "protocol":"Repository-specific protocol or unknown.", "purpose":"...", "messages": [], "evidence": [], "open_questions": []}
  ],
  "side_effects": [
    {"id":"side-effect-id", "type":"Repository-specific side effect type.", "description":"...", "trigger":"...", "evidence": []}
  ]
}`;
    if (taskId === 'process_quality_readiness')
        return `## Expected JSON

{
  "process": {
    "summary": "Assessment of development, delivery and operational readiness visible in the repository.",
    "tests": {"status":"Repository-specific readiness status.", "evidence": [], "observations": []},
    "ci_cd": {"status":"Repository-specific readiness status.", "evidence": [], "observations": []},
    "release": {"status":"Repository-specific readiness status.", "evidence": [], "observations": []},
    "observability": {"status":"Repository-specific readiness status.", "evidence": [], "observations": []},
    "configuration": {"status":"Repository-specific readiness status.", "evidence": [], "observations": []},
    "local_setup": {"status":"Repository-specific readiness status.", "evidence": [], "observations": []},
    "open_questions": []
  },
  "quality": {
    "summary": "Maintainability and quality assessment visible from code/docs/tests.",
    "strengths": [{"title":"...", "description":"...", "evidence": []}],
    "risks": [{"title":"...", "severity":"Repository-specific severity or priority.", "description":"...", "recommendation":"...", "evidence": []}],
    "testability": [{"title":"...", "description":"...", "evidence": []}]
  },
  "findings": [
    {"id":"finding-id", "category":"Repository-specific finding category.", "severity":"Repository-specific severity or priority.", "title":"...", "description":"...", "recommendation":"...", "evidence": []}
  ]
}`;
    if (taskId === 'architecture_refactoring_roadmap')
        return `## Expected JSON

{
    "architecture": {
    "summary": "Architecture summary",
    "style": "Repository-specific architecture style or unknown.",
    "modules": [{"name":"module", "responsibility":"...", "dependencies": [], "evidence": []}],
    "external_systems": [{"name":"system", "direction":"Repository-specific direction.", "protocol":"...", "evidence": []}],
    "data_stores": [{"name":"store", "technology":"...", "evidence": []}],
    "runtime": [{"name":"runtime/deployment/config aspect", "description":"...", "evidence": []}],
    "target_architecture": {
      "summary": "Recommended target architecture or reason no target architecture change is justified.",
      "target_style": "Repository-specific target style or unknown.",
      "tech_stack_options": [{"name":"option", "fit":"...", "tradeoffs": [], "evidence": []}],
      "migration_steps": [{"order":1, "description":"...", "risk":"Repository-specific risk statement.", "evidence": []}],
      "open_questions": []
    },
    "observations": [{"title":"observation", "description":"...", "evidence": []}],
    "mermaid": "flowchart TD\n  A[Module] --> B[Store]"
  },
  "findings": [
    {"id":"finding-id", "category":"Repository-specific finding category.", "severity":"Repository-specific severity or priority.", "title":"...", "description":"...", "recommendation":"...", "evidence": []}
  ],
  "refactoring": [
    {"id":"refactoring-id", "title":"...", "description":"...", "benefit":"...", "risk":"Repository-specific risk statement.", "effort":"Repository-specific effort estimate.", "candidate_files": [], "prerequisites": [], "evidence": []}
  ],
  "modernization": [
    {"id":"modernization-id", "title":"...", "description":"...", "target_state":"...", "benefit":"...", "risk":"Repository-specific risk statement.", "effort":"Repository-specific effort estimate.", "evidence": []}
  ]
}`;
    return `## Expected JSON

{
  "assessment": {
    "completeness": {
      "whole_repository_view": "Repository-specific completeness assessment.",
      "source_family_coverage": "Repository-specific completeness assessment.",
      "business_logic": "Repository-specific completeness assessment.",
      "interfaces": "Repository-specific completeness assessment.",
      "flows": "Repository-specific completeness assessment.",
      "examples": "Repository-specific completeness assessment.",
      "process_readiness": "Repository-specific completeness assessment.",
      "refactoring_roadmap": "Repository-specific completeness assessment."
    },
    "open_questions": []
  },
  "documentation": {
    "summary": "What examples/contracts were found or inferred and what remains missing.",
    "report_completeness_notes": [
      {"area":"Repository-specific gap or coverage area.", "status":"Repository-specific status.", "note":"...", "evidence": []}
    ]
  },
  "findings": [
    {"id":"gap-id", "category":"Repository-specific gap category.", "severity":"Repository-specific severity or priority.", "title":"...", "description":"...", "recommendation":"...", "evidence": []}
  ]
}`;
}

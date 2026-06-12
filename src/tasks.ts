import { CodeMap } from './types';
import { FS, cleanId, ensureDir, loadJson, writeJson, writeText } from './utils';
import { TARGET_CAPABILITIES } from './targetCoverage';
import { Path } from './utils';
import { reportComponentLibraryArtifact } from './reportComponents';
import { analysisPipelineArtifact } from './analysisPipeline';
import { analysisSkillCatalogArtifact } from './analysisSkills';
import { analysisGoalContractArtifact } from './analysisGoal';
import { toolPositioningReferencesArtifact } from './toolPositioningReferences';
import { writeSourceTierTasks } from './sourceTiers';

type LlmTaskId =
  | 'analysis_strategy'
  | 'core_assessment'
  | 'business_capabilities_logic'
  | 'interface_contract_extraction'
  | 'request_response_examples'
  | 'openapi_soap_graphql'
  | 'flows_mermaid'
  | 'domain_data_integrations'
  | 'process_quality_readiness'
  | 'architecture_refactoring_roadmap'
  | 'report_completeness_review'
  | 'detail_agent_plan'
  | 'analysis_document';

interface LlmTaskDefinition {
  id: LlmTaskId;
  filename: string;
  output: string;
  title: string;
  task_kind?: 'workflow_task' | 'capability_template';
  required_for_final?: boolean;
  coverage_mode?: 'task_area' | 'final_inventory_reconciliation';
}

const WORKFLOW_TASKS: LlmTaskDefinition[] = [
  { id: 'analysis_strategy', filename: '00-analysis-strategy.md', output: 'analysis-strategy.json', title: 'LLM Repository Analysis Strategy', task_kind: 'workflow_task', required_for_final: true },
  { id: 'detail_agent_plan', filename: '11-detail-agent-plan.md', output: 'detail-agent-plan.json', title: 'LLM Source-Family Detail Agent Plan', task_kind: 'workflow_task', required_for_final: true },
  { id: 'analysis_document', filename: '12-analysis-document.md', output: 'analysis-document.json', title: 'Final LLM Authored Analysis Document', task_kind: 'workflow_task', required_for_final: true }
];

const CAPABILITY_TEMPLATES: LlmTaskDefinition[] = ([
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
] as LlmTaskDefinition[]).map(task => ({ ...task, task_kind: 'capability_template' as const, required_for_final: false }));

export function writeLlmTasks(analysisDir: string, codeMap: CodeMap): any[] {
  const tasksDir = Path.join(analysisDir, 'llm_tasks');
  const templatesDir = Path.join(analysisDir, 'capability_templates');
  const llmDir = Path.join(analysisDir, 'llm');
  const dataDir = Path.join(analysisDir, 'data');
  ensureDir(tasksDir);
  ensureDir(templatesDir);
  ensureDir(llmDir);
  ensureDir(dataDir);

  const profile = codeMap.profile || {};
  const modules = (codeMap.modules || []).slice(0, 24);
  const signals = (codeMap.signals || []).slice(0, 200);
  const capsules = (codeMap.capsules || []).slice(0, 40);
  const glossary = (codeMap.glossary_terms || []).slice(0, 120);
  const artifactCandidates = (codeMap.artifact_navigation_candidates || codeMap.important_docs || []).slice(0, 150);
  const componentLibrary = reportComponentLibraryArtifact();
  const skillCatalog = analysisSkillCatalogArtifact();
  const goalContract = analysisGoalContractArtifact();
  const toolPositioningReferences = toolPositioningReferencesArtifact();
  const tierManifest = writeSourceTierTasks(analysisDir, codeMap);
  const productRequest = loadJson<any | null>(Path.join(dataDir, 'product-analysis-request.json'), null);
  const expectedTaskFiles = new Set(WORKFLOW_TASKS.map(task => task.filename));
  for (const file of FS.readdirSync(tasksDir).filter((name: string) => name.endsWith('.md'))) {
    if (!expectedTaskFiles.has(file)) FS.unlinkSync(Path.join(tasksDir, file));
  }
  const expectedTemplateFiles = new Set(CAPABILITY_TEMPLATES.map(task => task.filename));
  for (const file of FS.readdirSync(templatesDir).filter((name: string) => name.endsWith('.md'))) {
    if (!expectedTemplateFiles.has(file)) FS.unlinkSync(Path.join(templatesDir, file));
  }

  writeText(Path.join(analysisDir, 'llm_instructions.md'), overview(profile, modules, signals, glossary, capsules, artifactCandidates, componentLibrary, skillCatalog, goalContract, toolPositioningReferences, tierManifest, productRequest));
  writeJson(Path.join(dataDir, 'source-family-inventory.json'), sourceFamilyInventory(codeMap));
  writeJson(Path.join(dataDir, 'analysis-goal-contract.json'), goalContract);
  writeJson(Path.join(dataDir, 'tool-positioning-references.json'), toolPositioningReferences);
  const legacyWorkplan = Path.join(dataDir, 'source-family-workplan.json');
  if (FS.existsSync(legacyWorkplan)) FS.unlinkSync(legacyWorkplan);

  const taskDefs: any[] = [];
  for (const task of WORKFLOW_TASKS) {
    const body = taskBody(task, profile, modules, signals, capsules, glossary, artifactCandidates, componentLibrary, skillCatalog, goalContract, toolPositioningReferences, tierManifest, productRequest);
    writeText(Path.join(tasksDir, task.filename), body);
    taskDefs.push({ id: task.id, title: task.title, task_kind: 'workflow_task', required_for_final: true, task_file: `llm_tasks/${task.filename}`, expected_output: `llm/${task.output}`, status: 'pending' });
  }
  const templateDefs: any[] = [];
  for (const task of CAPABILITY_TEMPLATES) {
    const body = taskBody(task, profile, modules, signals, capsules, glossary, artifactCandidates, componentLibrary, skillCatalog, goalContract, toolPositioningReferences, tierManifest, productRequest);
    writeText(Path.join(templatesDir, task.filename), body);
    templateDefs.push({ id: task.id, title: task.title, task_kind: 'capability_template', required_for_final: false, template_file: `capability_templates/${task.filename}`, suggested_output: `llm/${task.output}`, status: 'available_when_llm_strategy_selects' });
  }
  const pipeline = analysisPipelineArtifact(taskDefs, templateDefs);
  const capabilityTemplateManifest = {
    mode: 'optional_llm_capability_templates',
    semantic_authority: 'codex_llm',
    deterministic_authority: 'template_catalog_shape_only',
    summary: 'These generic templates are optional capability/output contracts. They are not executed as a fixed mandatory path and do not block final readiness unless the Codex-authored LLM strategy explicitly uses their outputs.',
    templates: templateDefs
  };
  writeJson(Path.join(dataDir, 'analysis-skill-catalog.json'), skillCatalog);
  writeJson(Path.join(analysisDir, 'analysis-pipeline.json'), pipeline);
  writeJson(Path.join(dataDir, 'analysis-pipeline.json'), pipeline);
  writeJson(Path.join(analysisDir, 'capability-template-manifest.json'), capabilityTemplateManifest);
  writeJson(Path.join(dataDir, 'capability-template-manifest.json'), capabilityTemplateManifest);
  writeText(Path.join(analysisDir, 'TASK.md'), singleTaskGuide(profile, tierManifest, taskDefs, templateDefs, productRequest));
  writeJson(Path.join(analysisDir, 'task-manifest.json'), { mode: 'llm_first_workflow_tasks', implementation_language: 'TypeScript', single_task_file: 'TASK.md', pipeline, product_analysis_request: stableProductRequest(productRequest), source_tier_tasks: tierManifest.tasks, capability_templates: templateDefs, tasks: taskDefs });
  return taskDefs;
}

function productRequestBlock(productRequest: any): string {
  if (!productRequest) return `No product-analysis request has been recorded yet. When the user starts with \`cognianalysis analyze . --goal "..."\`, read \`.analysis/data/product-analysis-request.json\` and use its mode, goal, target and depth_policy to shape the strategy and final report.`;
  const stableRequest = stableProductRequest(productRequest);
  return `Read \`.analysis/data/product-analysis-request.json\` and use it as the user-facing product request for this run.

\`\`\`json
${JSON.stringify(stableRequest, null, 2)}
\`\`\`

The selected mode, goal, target fields and depth_policy must influence the analysis strategy, detail-agent plan and final report. Do not treat them as metadata only.`;
}

function stableProductRequest(productRequest: any): any {
  if (!productRequest) return null;
  const { generated_at: _generatedAt, repo: _repo, ...stableRequest } = productRequest;
  return stableRequest;
}

function singleTaskGuide(profile: any, tierManifest: any, taskDefs: any[], templateDefs: any[], productRequest: any): string {
  const productMode = String(productRequest?.mode || 'brief');
  const scopeMode = String(productRequest?.analysis_scope_request?.mode || profile.analysis_scope_mode || 'representative');
  const completeMode = productMode === 'complete' && scopeMode === 'complete';
  const sourceTierStep = completeMode
    ? 'Execute every `.analysis/source_tier_tasks/*.md` task and write Tier 1 file cards to `.analysis/source_tiers/*.json` before final readiness.'
    : 'Execute selected/adaptive `.analysis/source_tier_tasks/*.md` workpacks as needed for the Codex-authored strategy and report scope. Do not expand to whole-repository Tier 1 unless the run is `--mode complete-audit --scope complete`; disclose deferred files, confidence impact and follow-up deep reviews in the final report.';
  const sourceTierReadiness = completeMode
    ? 'Every included file needs a Tier 1 Codex-authored LLM card before a final report can claim whole-codebase readiness. Deferred files are visible follow-up, not completed analysis.'
    : 'Adaptive modes do not claim whole-codebase Tier 1 readiness. The final report must visibly state selected scope, deferred-file count, confidence impact and any open questions or deep backlog before claiming decision readiness.';
  return `# Cognianalysis Task

This is the single human-facing workpack for this repository. The detailed task files remain available for harnesses, batching and CI, but this file is the path a user should read first.

## Goal

Produce a Codex-authored LLM, decision-grade source-code analysis report for \`${profile.repo_name || 'this repository'}\`.

## Product Analysis Request

${productRequestBlock(productRequest)}

The TypeScript CLI prepares context, validates contracts, checks evidence references and renders HTML. Codex is the in-session LLM executor and authors all semantic understanding, report structure, findings, examples, flows, recommendations and readiness verdicts. Do not call a direct LLM API or require API credentials.

The LLM step is not an external service check and cannot be represented as unavailable by the CLI. Codex authors the required artifacts in this session; uncertainty belongs in confidence, limitations, open questions or a Codex-authored partial/not_ready report-quality verdict.

## Product-Mode Loop

1. Run \`cognianalysis analyze .\` to prepare the workspace or see the next missing artifact. For large repositories, choose scope deliberately: \`--scope complete\`, \`--scope critical-path --scope-files N\` or \`--scope representative --scope-files N\`.
2. Run \`cognianalysis resume .\` to continue an existing analysis and print completed stages as skipped.
3. Run \`cognianalysis status .\` whenever you need a product-language progress view, scope/freshness state and next action.
4. Run \`cognianalysis repair .\` if JSON is malformed, manifests/task guides are missing, outputs are stale, or an interrupted run needs recovery.
5. Author \`.analysis/llm/analysis-strategy.json\` from \`.analysis/llm_tasks/00-analysis-strategy.md\`.
6. ${sourceTierStep}
7. Run \`cognianalysis dev finalize . --allow-partial\` to materialize LLM-planned skill workbench tasks.
8. Execute every \`.analysis/skill_workbench_tasks/*.md\` task into \`.analysis/skill_reviews/*.json\`.
9. Author \`.analysis/llm/detail-agent-plan.json\` from \`.analysis/llm_tasks/11-detail-agent-plan.md\`.
10. Run \`cognianalysis dev finalize . --allow-partial\` to materialize detail tasks.
11. Execute every \`.analysis/detail_tasks/*.md\` task into \`.analysis/detail_reviews/*.json\`.
12. Author \`.analysis/llm/analysis-document.json\` from \`.analysis/llm_tasks/12-analysis-document.md\`.
13. Run \`cognianalysis analyze .\`, \`cognianalysis status .\`, then \`cognianalysis dev audit-report .\`.

## Required Workflow Artifacts

${taskDefs.map(task => `- \`${task.expected_output}\` from \`${task.task_file}\``).join('\n')}

## Source Inventory Base

- Tier 1 file-card tasks: ${tierManifest?.task_count || 0}
- Included files in Tier 1 scope: ${tierManifest?.total_files || 0}
- Manifest: \`.analysis/source-tier-task-manifest.json\`

${sourceTierReadiness}

Product mode: \`${productMode}\`. Analysis scope mode: \`${scopeMode}\`. If this is not \`--mode complete-audit --scope complete\`, the final report must visibly state the scope, deferred-file count and confidence impact.

## Optional Capability Templates

The files in \`.analysis/capability_templates/*.md\` are reusable output shapes, not mandatory workflow steps:

${templateDefs.map(task => `- \`${task.template_file}\` -> \`${task.suggested_output}\``).join('\n')}

Use a template only when the Codex-authored LLM strategy, a skill workbench review or the final synthesis explicitly needs that output.

## Final Report Quality Bar

The final \`.analysis/llm/analysis-document.json\` must include:

- \`analysis_document.sections[]\` as the complete visible report structure.
- \`analysis_document.requirements_trace[]\` with explicit \`goal_contract_refs[]\`, evidence or open questions.
- \`analysis_document.report_quality_review\` with reviewer \`codex_llm\`, verdict \`decision_ready\`, \`partial\` or \`not_ready\`, and all required quality checks.
- \`analysis_document.executive_decision_basis\` plus a visible executive/decision section that answers keep/modernize/replace/cost/risks/next actions before technical drilldown.
- \`analysis_document.consistency_review\` with reviewer \`codex_llm\`, \`contradictions_found\`, and either zero contradictions or explicit contradiction details.
- \`analysis_document.open_questions[]\` as a first-class uncertainty artifact. Use an empty array only after checking for unresolved proof gaps; blocking questions prevent decision-ready status.
- Semantic lineage for major visible findings, recommendations, decisions and source-family claims. Prefer item-level \`semantic_lineage\` or top-level \`analysis_document.semantic_lineage[]\` that links the claim to its report section, upstream source-tier/skill/detail review artifacts and file:line evidence.
- Evidence or explicit uncertainty for findings, decisions, roadmap items, flow steps, boundary/interface entries and source-family statements.
- Visible path:line evidence navigation for major claims; use \`evidence\` or \`evidence_refs\` arrays so the renderer can show clickable proof chips.
- Confidence for major visible findings, recommendations, decisions and source-family claims. The CLI computes evidence strength from evidence-reference count and reports weak support.
- If \`.analysis/external_findings/*.json\` exists, treat those scanner/tool outputs as external evidence inputs only. Preserve \`source_tool\`, \`authority\`, severity/type/message and file:line evidence; the source tool remains authority for scanner facts while Codex synthesizes decision impact.
- Request/response, OpenAPI/Swagger, SOAP/WSDL/XSD, Mermaid and business examples wherever present or defensibly inferred; inferred examples must use \`example_origin: "inferred"\`.

Do not modify production source files unless the user explicitly asks for repository code changes.
`;
}

export function writeDetailTasksFromLlmPlan(analysisDir: string, plan: any): any[] {
  const tasksDir = Path.join(analysisDir, 'detail_tasks');
  const reviewsDir = Path.join(analysisDir, 'detail_reviews');
  ensureDir(tasksDir);
  ensureDir(reviewsDir);
  for (const file of FS.readdirSync(tasksDir).filter((name: string) => name.endsWith('.md'))) {
    try {
      FS.unlinkSync(Path.join(tasksDir, file));
    } catch (err: any) {
      if (err?.code !== 'ENOENT') throw err;
    }
  }
  const planTasks = plan?.tasks || [];
  const usedIds = new Set<string>();
  const tasks = planTasks.map((task: any, index: number) => {
    const rawId = task.id || `detail-${String(task.source_family || `source-family-${index + 1}`)}`;
    const safeId = cleanId(String(rawId));
    const baseId = safeId === 'item' ? `detail-${index + 1}` : safeId;
    const id = usedIds.has(baseId) ? `${baseId}-${index + 1}` : baseId;
    usedIds.add(id);
    const filename = `${String(index + 1).padStart(3, '0')}-${id}.md`;
    const output = `detail_reviews/${id}.json`;
    writeText(Path.join(tasksDir, filename), detailTaskBody(task, output));
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
  writeJson(Path.join(analysisDir, 'detail-task-manifest.json'), {
    mode: 'llm_authored_source_family_detail_agents',
    planning_source: plan?.planning_source || 'llm/detail-agent-plan.json',
    summary: 'These focused source-family detail tasks were mechanically materialized from the LLM-authored detail-agent plan. Complete these reviews before authoring the final LLM analysis document.',
    tasks
  });
  return tasks;
}

function detailTaskBody(task: any, output: string): string {
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
    "review_status": "complete",
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

function sourceFamilyInventory(codeMap: CodeMap): any {
  const filesByModule: Record<string, any[]> = {};
  for (const file of codeMap.files || []) {
    const module = file.module || 'repository';
    filesByModule[module] ||= [];
    filesByModule[module].push(file);
  }
  const partitions = (codeMap.modules || []).map((m: any) => {
    const files = (filesByModule[m.name] || []).sort((a: any, b: any) => ((b.navigation_score || b.score || 0) - (a.navigation_score || a.score || 0)));
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
      seed_files: files.slice(0, 12).map((f: any) => ({
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
  }).sort((a: any, b: any) => (b.files || 0) - (a.files || 0) || String(a.name).localeCompare(String(b.name)));
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
    llm_required_action: 'Codex must author repository-specific source-family names, purposes, priorities, skipped areas and detail-review decisions in llm/detail-agent-plan.json after whole-repository extraction.',
    summary: 'This is a mechanical inventory partition for navigation. Tags, ranks and path partitions are not semantic proof and do not parse imports, symbols, frameworks, contracts or examples. Codex must author the actual detail-agent plan in llm/detail-agent-plan.json after whole-repository overview extraction and before the final analysis document.',
    total_inventory_partitions: partitions.length,
    inventory_partitions: partitions
  };
}

function overview(profile: any, modules: any[], signals: any[], glossary: string[], capsules: any[], importantDocs: any[], componentLibrary: any, skillCatalog: any, goalContract: any, toolPositioningReferences: any, tierManifest: any, productRequest: any): string {
  return `# Cognianalysis · LLM-first Instructions

This repository must be analyzed semantically by Codex as the in-session LLM executor. The generated code map is a navigation aid, not the source of final truth.

## Non-negotiable rules

- Treat \`code-map.json\`, \`source-capsules.json\`, \`navigation-artifact-candidates.json\` and the legacy \`important-docs.json\` as inventory/discovery aids.
	- Do **not** treat navigation hints as business facts, technical claims, interfaces, flows or entrypoints.
	- The deterministic map is intentionally inventory-only: it does not parse imports, symbols, framework names, contracts, examples, tests, entrypoints or relationships. Codex must open source files and parse/understand those semantics itself.
	- Start with \`.analysis/llm_tasks/00-analysis-strategy.md\`. The Codex-authored LLM \`.analysis/llm/analysis-strategy.json\` is the repository-specific analysis plan. The files under \`.analysis/capability_templates/\` are optional templates, not a fixed semantic information architecture and not a mandatory execution list.
	- Treat \`source-family-inventory.json\` as a legacy workflow filename for mechanical navigation partitions. The legacy filename does not mean the CLI has authored semantic source families; Codex must decide whether to rename, merge, split, reject or defer partitions as repository-specific source families.
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
- Semantic completeness, documentation quality and management readiness are Codex-authored LLM judgments. Deterministic checks may require the Codex-authored judgment to exist and be structured, but must not replace it with keyword, menu or block-presence scoring.
- Keep production code read-only unless explicitly asked otherwise.
- Use English for generated JSON text and report-facing content, while preserving original domain terms and identifiers.
- Always produce whole-repository documentation before any module or source-family deep dive.
- Execute every \`.analysis/source_tier_tasks/*.md\` task before the final analysis document. These tasks create Tier 1 Codex-authored LLM file cards for every included file. A file that is only listed in \`analysis_coverage.deferred_files\` is not analyzed and must not count as done.
- Use the tier model explicitly: Tier 0 is CLI inventory only, Tier 1 is mandatory per-file LLM understanding, Tier 2 is module/source-family synthesis, Tier 3 is behavior/contract/flow deep dive, and Tier 4 is decision/refactoring/process analysis.
- For monorepos or multi-module repositories, summarize the complete source-family landscape: purpose, responsibility, entry points, exits/integrations, tests/examples, confidence and open questions for each relevant family.
	- Create repository-specific skill workbench tasks from the Codex-authored LLM analysis strategy before treating any generic capability template output as useful. Capability templates are optional output contracts, not the repository-specific semantic plan and not final-readiness gates.
	- Create the Codex-authored LLM detail-agent plan only after the analysis strategy, Tier 1 file cards, Codex-planned skill workbench reviews and whole-repository extraction tasks have produced a repository-wide picture.
- Author final summaries, E2E understanding, management statements and the visible report only after all planned detail-agent reviews exist and have been synthesized. Earlier tasks may extract building blocks, but must not pretend to be the final report.
- Do not make one module the narrative center unless the source inventory proves the repository is actually single-module. A focused deep review must be labelled as a deep slice and must not replace the whole-repository view.
- If E2E flow extraction is deep only for part of the repository, state that boundary explicitly and keep the remaining source families visible as surface-reviewed or follow-up drilldown areas.
	- The final report should be authored by Codex as a repo-specific LLM analysis document. The renderer provides a stable component library and validation; it must not dictate a fixed one-size-fits-all information architecture.
- Tool positioning must be concrete and Codex-authored. Use the official reference facts below as market context, not as repo evidence and not as a deterministic verdict. Then state what this analysis replaces, complements or cannot safely decide for this repository, with source evidence and handoff boundaries.

## Tool-positioning reference categories

These categories are external market context for comparison, not repository evidence. They are also written to \`.analysis/data/tool-positioning-references.json\`. Use them only to frame positioning; use source evidence for claims about this repository. Preserve the distinction between official reference facts, repository evidence and Codex-authored LLM judgment.

\`\`\`json
${JSON.stringify(toolPositioningReferences, null, 2)}
\`\`\`

## Target capabilities that must be addressed

\`\`\`json
${JSON.stringify(TARGET_CAPABILITIES.map(c => ({ id: c.id, title: c.title, expected_outputs: c.expected_outputs })), null, 2)}
\`\`\`

## Original analysis goal contract

This preserves the original product objective for Codex. It is context, not a deterministic checklist or readiness verdict. Final semantic status must be authored through \`analysis_document.requirements_trace\` and \`analysis_document.report_quality_review\`.

\`\`\`json
${JSON.stringify(goalContract, null, 2)}
\`\`\`

## Product analysis request

${productRequestBlock(productRequest)}

## Tiered whole-codebase analysis model

This model prevents blind spots. Source inventory alone is Tier 0 and has no semantic authority. Every included file needs a Tier 1 Codex-authored LLM file card in \`.analysis/source_tiers/*.json\`; selected areas are then promoted to Tier 2-4 for technical drilldown, flows, risks and decisions.

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

Use these as reusable analysis capabilities, not as deterministic routing rules. Codex decides which skills matter for this repository and how deeply to apply them.

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

Domain terms must be extracted by Codex from source evidence, not from generated word lists.

## Context capsules

The full included file inventory is in \`.analysis/data/source-inventory.json\`. The source excerpts are in \`.analysis/source-capsules.json\`. Use capsules to decide what to open next, but inspect full source files whenever evidence is needed. Do not treat capsule coverage as whole-codebase coverage.

## Optional capability templates

Generic templates live in \`.analysis/capability_templates/*.md\`. They are reusable prompts for common output shapes only. Do not execute all templates by default. The Codex-authored LLM analysis strategy and skill workbench findings decide whether a template output is useful for this repository.
`;
}

function taskBody(task: LlmTaskDefinition, profile: any, modules: any[], signals: any[], capsules: any[], glossary: string[], importantDocs: any[], componentLibrary: any, skillCatalog: any, goalContract: any, toolPositioningReferences: any, tierManifest: any, productRequest: any): string {
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
    product_analysis_request: stableProductRequest(productRequest),
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
  ? 'This file is a reusable capability template, not a mandatory repository-analysis step. Execute it only when the Codex-authored LLM analysis strategy, a skill workbench review or the final synthesis explicitly needs this output. Do not execute all capability templates just because they exist.'
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
- \`.analysis/data/product-analysis-request.json\` when it exists; use mode, goal, target and depth_policy as the user-facing analysis request
- \`.analysis/data/analysis-goal-contract.json\`
- \`.analysis/data/tool-positioning-references.json\`
- \`.analysis/data/navigation-artifact-candidates.json\` (or legacy \`.analysis/data/important-docs.json\`)
- \`.analysis/data/source-family-inventory.json\`
- \`.analysis/source-capsules.json\`

	Then open source files, tests, docs, contracts, schemas and configuration as needed. The deterministic map does not parse imports, symbols, framework names, contracts, examples, tests, entrypoints or relationships; Codex must parse and decide those from source. The source capsules and inventory-ranked seed files are only navigation aids. The source inventory defines the full included analysis scope; do not stop at the top capsules.
		If this is not task \`analysis_strategy\`, read \`.analysis/llm/analysis-strategy.json\` first when it exists and follow its repository-specific analysis plan. If it does not exist yet, author it before treating any later task as final-ready.
		Tier 1 file cards are the broad base for whole-codebase understanding. If \`.analysis/source_tiers/*.json\` is incomplete, do not claim whole-codebase completion; execute the missing \`.analysis/source_tier_tasks/*.md\` tasks first or mark final readiness partial.
		After \`analysis_strategy\` and Tier 1 cards exist, run \`cognianalysis dev finalize . --allow-partial\` to materialize \`.analysis/skill_workbench_tasks/*.md\` from \`analysis_strategy.skill_application_plan[]\`. Execute those LLM-planned skill workbenches before using any generic capability-template output as a supporting building block.
		Generic capability templates are optional. Prefer repository-specific \`.analysis/skill_workbench_tasks/*.md\` and direct final synthesis. If you use a template output, explain in the JSON why this capability output was needed for this repository.
	For large repositories, use \`.analysis/data/source-family-inventory.json\` only as navigation context. The legacy filename does not mean the CLI has authored semantic source families. The actual source-family/detail-agent plan must be authored by Codex in \`.analysis/llm/detail-agent-plan.json\`; deterministic inventory partitions are not semantic proof, not detail-review priorities and not source-family names.

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
- Account for the source inventory without using deferral as a success path. Every output must include \`analysis_coverage.inspected_files[]\` for files you opened or semantically considered. Use \`analysis_coverage.deferred_files[]\` only for task-local scope boundaries or evidence-gap follow-up; deferred files are not finished whole-codebase analysis. Tier 1 file-card coverage in \`.analysis/source_tiers/*.json\` is the required broad base.
- Start from the full repository scope. Summarize the whole source-family landscape before focusing on a specific module, framework, interface type or flow family.
- For multi-module repositories, include source-family statements across the repository; a deep slice is acceptable only when clearly labelled and paired with whole-repo coverage context.
- Avoid single-module bias. If one family has the strongest evidence, explain why it is strongest and which other families remain surface-reviewed or require follow-up drilldown.
- When using navigation partitions, Codex must decide whether to rename, merge, split, reject or defer them as semantic source families. Do not copy partition names into management prose unless source evidence proves they are meaningful to the repository.
- Preserve the original target picture: automated source-code analysis that produces a structured decision basis with four levels: reverse engineering/documentation, code analysis, process analysis, and refactoring/target architecture.
- Preserve the product analysis request. The selected \`mode\`, \`goal\`, \`target\` and \`depth_policy\` from \`.analysis/data/product-analysis-request.json\` must shape the strategy, detail-agent plan and final report. If \`mode\` is \`brief\`, default to a concise decision report with a visible deep backlog. If \`mode\` is \`blueprint\`, include modernization/rebuild planning. If \`mode\` is \`deep\`, keep the review focused on the requested target or goal while still disclosing whole-repository context and boundaries. If a legacy request says \`deep-dive\`, treat it as \`deep\`.
- The final report is allowed to have a different structure for every repository, but it must still cover functional view, technical view, source-derived decision basis, automation boundaries, and comparison/positioning against traditional code-analysis/documentation tools.
- When writing tool positioning, use the provided reference categories: consulting/gen-AI delivery suites, structural architecture mapping, static quality/security gates and automated transformation engines. Be explicit about whether the analysis replaces discovery, complements graph/scanner/recipe tools, or should hand off to them.
	- Do not author final management summaries, E2E conclusions or visible report sections until the final analysis-document task. Use the earlier LLM-planned skill workbenches and generic capability contracts to build source-backed blocks, examples, flows, findings and the detail-agent plan.
	- The final analysis-document task must read all skill workbench reviews, all extraction outputs and all executed \`.analysis/detail_reviews/*.json\` files, then synthesize the complete picture.
- Deterministic scripts only validate JSON shape, evidence references, output presence and renderer component compatibility. They do not decide whether the report is complete, well documented or management-ready. Those semantic judgments must be authored by Codex in \`analysis_document.requirements_trace\` and \`analysis_document.report_quality_review\`.
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

function coverageSchema(task: LlmTaskDefinition): string {
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

function schemaForTask(taskId: LlmTaskId): string {
  if (taskId === 'analysis_strategy') return `## Expected JSON

	This is the first semantic planning task. Do not analyze only the top capsules and do not lock the report into the generated task order. Use the source inventory, navigation partitions, component library, skill catalog and original goal contract to author a repository-specific analysis strategy that later tasks must follow.

	The strategy should answer: how should this repository be understood, which source slices look meaningful, which skill workbenches should be materialized from \`skill_application_plan[]\`, how will every file receive Tier 1 coverage, what deeper reviews may be necessary, and what kind of final report structure would be useful for humans.

The deterministic CLI will only check that this Codex-authored LLM strategy exists and is structured. It will not judge whether the chosen strategy is semantically correct; that remains Codex's responsibility and must be revisited in report_quality_review.

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

  if (taskId === 'detail_agent_plan') return `## Expected JSON

	This task happens after the Codex-authored LLM analysis strategy, Tier 1 file-card coverage, Codex-planned skill workbench reviews, whole-repository extraction tasks and before the final report. Read \`.analysis/llm/analysis-strategy.json\`, all existing \`.analysis/skill_reviews/*.json\`, all existing \`.analysis/llm/*.json\` outputs except \`analysis-document.json\` as building blocks, plus the source inventory and source-family inventory. Then author a repository-specific plan for focused detail agents.

This is not the final report. Do not write management conclusions or final E2E synthesis here. The purpose is to decide which source families, interface areas or process routes need deeper LLM review before the final analysis document is authored.

Required planning intent:

		- Start from the complete repository picture produced by Tier 1 cards, Codex-planned skill workbench reviews and any optional capability-template outputs the Codex-authored strategy explicitly selected.
- Use \`.analysis/data/source-family-inventory.json\` only as navigation context.
- Select detail tasks because they are important for business understanding, E2E behavior, interfaces/contracts, quality/process risk or refactoring decisions.
- Keep the plan generic: source families can be modules, bounded contexts, contract families, jobs, UI apps, data/integration areas or any repository-specific slice that makes semantic sense.
- Include seed files only as starting points; detail agents must open source directly.
- If no detail review is needed, return an empty \`tasks\` list, set \`no_detail_reviews_needed: true\`, and explain why through \`summary\`, \`not_planned[]\`, evidence or open questions. Do not leave \`tasks[]\` empty without an explicit Codex-authored skip rationale.

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
        "recommended_agent": "Skill id or custom agent name chosen by Codex.",
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

  if (taskId === 'analysis_document') return `## Expected JSON

	This is the final synthesis task. Author it only after \`.analysis/llm/analysis-strategy.json\`, Tier 1 file-card coverage, all LLM-planned \`.analysis/skill_reviews/*.json\`, the whole-repository extraction outputs, \`.analysis/llm/detail-agent-plan.json\`, and all planned \`.analysis/detail_reviews/*.json\` outputs are present. Read all previous \`.analysis/skill_reviews/*.json\`, all previous \`.analysis/llm/*.json\` outputs, executed detail reviews, the bundle inputs, source inventory and evidence. Do not merely summarize task files. Compose a human-readable, decision-grade analysis document whose structure fits this repository.

The HTML renderer will provide the component library and styling. You decide the section order, emphasis and depth. When an \`analysis_document\` is present, \`analysis_document.sections[]\` is the complete visible report navigation and start order; generated code-map, coverage, quality-review, requirements-trace and raw-data views remain audit artifacts unless you intentionally author repository-specific sections/blocks for them.

Required report intent:

- Start with system understanding: whole-repository overview, important relationships, system entry/exit, E2E context, business need, business use and what the system appears to be for.
- Use the Codex-authored LLM analysis strategy as the starting plan, then update or contradict it explicitly if later Tier 1/detail evidence proves a better report structure.
- Use \`.analysis/data/analysis-scope.json\` as the declared scope contract. If the mode is not \`complete\`, visibly disclose selected/deferred file counts and confidence impact before making decisions from the report.
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
	- Include top-level \`analysis_document.open_questions[]\` with structured \`id\`, \`question\`, \`reason\`, \`impact\`, \`blocking\`, and \`evidence\` or \`evidence_gap\`. If any items exist, mirror them in a visible \`open_questions\` block so decision makers do not have to find uncertainty in prose.
	- Include confidence on major visible findings, recommendations, decisions and source-family claims. Use explicit uncertainty when confidence cannot be high. The CLI will compute evidence_strength from evidence-reference count and surface weak support.
	- Include semantic lineage on major visible findings, recommendations, decisions and source-family claims. Use item-level \`semantic_lineage\` or top-level \`analysis_document.semantic_lineage[]\` with \`claim_id\`, \`report_section_id\`, \`origin_artifact\`, \`supporting_artifacts\` and \`evidence\`. The CLI will also build a deterministic provenance backstop from evidence overlap, but Codex-authored lineage is preferred.
	- Include a visible executive/decision section before technical drilldown. The report must answer: should stakeholders keep the system, modernize it, replace it, what cost/effort is implied, what are the biggest risks, and what should happen next.
	- Include \`consistency_review\` as a Codex-authored LLM contradiction check across the final report. Set \`contradictions_found: 0\` only if you have checked claims for conflicts; otherwise list unresolved contradictions and use a non-ready quality verdict.
	- Read \`.analysis/data/analysis-run.json\` and preserve its \`analysis_run_id\` where practical. Finalization writes \`analysis-run-provenance.json\` and \`artifact-dependency-graph.json\` to make stale/mixed artifacts visible.
	- If \`.analysis/external_findings/*.json\` exists, explicitly decide whether and how those external findings affect risk, modernization or open questions. Do not make Cognianalysis the scanner authority.
	- Explicitly synthesize every executed LLM-planned skill workbench into the document. List the integrated skill workbench IDs in \`skill_workbench_synthesis.integrated_skill_workbenches\`; otherwise finalization will mark the report stale.
	- Explicitly synthesize every executed source-family detail review into the document. List the integrated source families in \`detail_review_synthesis.integrated_detail_reviews\`; otherwise finalization will mark the report stale.
- If the detail-agent plan still has unexecuted tasks, do not claim final readiness. Either wait for the reviews or mark the report partial with the missing families and open questions.
- If technical drilldown, evidence governance, quality-review, requirements-trace, coverage or raw-data explanation matters to the audience, create repository-specific sections for them inside \`analysis_document.sections\`. Do not rely on fixed appendix menu items.
- Each visible section should earn its place by explaining a business decision, business use, system relationship, risk, improvement path or technical drilldown. Avoid sections that merely enumerate classes, functions or files.
- Use \`agent_plan\` blocks only to show the already planned/executed detail-review basis or remaining follow-up. The source of executable pre-report detail tasks is \`.analysis/llm/detail-agent-plan.json\`, not the final report.
- Include \`report_quality_review\` as a Codex-authored LLM self-audit of the final document. This is not a CLI text search. You must explicitly judge whether the authored report is management-ready, repo-specific, whole-repo-first, evidence-aware and covers the four requested service levels plus functional/technical views, improvements/refactoring and tool positioning.
- The CLI will trust this structured Codex-authored LLM judgment for semantic readiness. It only checks that the judgment exists, is explicit and can be rendered with evidence; it does not infer quality from keywords, class/function lists or fixed report menus.
- The CLI will also treat \`requirements_trace\` as a Codex-authored LLM trace artifact, not as a fixed deterministic checklist. Use the original target picture below, but word and extend trace rows in the way that best fits the repository. The Codex LLM verdict remains the semantic authority.
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
    "analysis_run_id": "Use .analysis/data/analysis-run.json analysis_run_id when available.",
    "semantic_lineage": [
      {"claim_id":"stable-claim-id", "report_section_id":"section-id", "origin_artifact":"detail_reviews/example.json", "supporting_artifacts":["skill_reviews/example.json", "source_tiers/source-tier-0001.json"], "evidence":[]}
    ],
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
      "decision_questions": {
        "keep_system": "Should stakeholders keep this system as-is? Answer with rationale.",
        "modernize_system": "Should stakeholders modernize it? Answer with rationale.",
        "replace_system": "Should stakeholders replace it? Answer with rationale.",
        "cost": "Relative effort or cost signal for the next move.",
        "biggest_risks": ["Risk that matters most for the decision."],
        "next_actions": ["Concrete next action."]
      },
      "evidence": [],
	      "open_questions": []
	    },
	    "consistency_review": {
	      "reviewer": "codex_llm",
	      "summary": "Codex-authored LLM review of whether major report claims contradict each other.",
	      "contradictions_found": 0,
	      "contradictions": [],
	      "evidence": [],
	      "open_questions": []
	    },
	    "open_questions": [
	      {"id":"oq-stable-id", "question":"What remains unknown?", "reason":"Why source evidence is insufficient.", "impact":"Decision/risk area affected by this uncertainty.", "blocking":false, "evidence":[], "evidence_gap":"Use when absence of direct evidence is the support."}
	    ],
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
      "reviewer": "codex_llm",
      "verdict": "decision_ready, partial or not_ready",
      "summary": "Codex-authored LLM judgment of whether this is a management-ready decision document with technical drilldown.",
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
              {"id":"oq-stable-id", "question":"...", "reason":"Why this is unresolved.", "impact":"Decision/risk area affected.", "blocking":false, "owner":"Repository-specific owner or unknown.", "evidence":[], "evidence_gap":"Optional proof gap when there is no direct source line."}
            ]
          }
        ],
        "evidence": []
      }
    ]
  }
}`;

  if (taskId === 'core_assessment') return `## Expected JSON

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

  if (taskId === 'business_capabilities_logic') return `## Expected JSON

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

  if (taskId === 'interface_contract_extraction') return `## Expected JSON

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

  if (taskId === 'request_response_examples') return `## Expected JSON

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

  if (taskId === 'openapi_soap_graphql') return `## Expected JSON

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

  if (taskId === 'flows_mermaid') return `## Expected JSON

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

  if (taskId === 'domain_data_integrations') return `## Expected JSON

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

  if (taskId === 'process_quality_readiness') return `## Expected JSON

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

  if (taskId === 'architecture_refactoring_roadmap') return `## Expected JSON

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

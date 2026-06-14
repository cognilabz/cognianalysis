export interface AnalysisSkillDefinition {
  id: string;
  label: string;
  purpose: string;
  stage_ids: string[];
  expected_outputs: string[];
  guidance: string;
}

export const ANALYSIS_SKILL_CATALOG: AnalysisSkillDefinition[] = [
  {
    id: 'analysis_strategy_planning',
    label: 'Analysis Strategy Planning',
    purpose: 'Author the repository-specific analysis plan, source-slice hypotheses, skill application plan and report intent before source tiering, skill workbenches, optional templates or final synthesis are used.',
    stage_ids: ['llm_analysis_strategy'],
    expected_outputs: ['llm/analysis-strategy.json', 'analysis_strategy.whole_repo_first_plan', 'analysis_strategy.report_intent'],
    guidance: 'Use inventory only as context. Codex decides how this repository should be understood, which skills matter and where deeper review may be needed.'
  },
  {
    id: 'whole_repository_understanding',
    label: 'Whole-Repository Understanding',
    purpose: 'Build the repository-wide story, system purpose, source-family landscape and scope boundaries before deep review.',
    stage_ids: ['llm_whole_repository_building_blocks'],
    expected_outputs: ['assessment.repository_wide_view', 'analysis_coverage'],
    guidance: 'Start broad. A deep slice can support the story, but it must not become the whole-system narrative.'
  },
  {
    id: 'tiered_source_file_analysis',
    label: 'Tiered Source File Analysis',
    purpose: 'Create mandatory Tier 1 Codex-authored LLM file cards for every included file, then promote important areas to Tier 2-4 technical drilldown, behavior, risk and transformation analysis.',
    stage_ids: ['llm_source_file_tier_analysis', 'llm_whole_repository_building_blocks', 'llm_detail_reviews', 'llm_final_analysis_document'],
    expected_outputs: ['source_tiers/*.json', 'source_tier_coverage', 'analysis_document technical drilldown sections'],
    guidance: 'Do not let deferred files stand in for understanding. Tier 1 is shallow but real per-file analysis; deeper tiers explain relationships, flows, contracts and decisions.'
  },
  {
    id: 'business_extraction',
    label: 'Business Extraction',
    purpose: 'Extract business capabilities, actors, use cases, rules, decisions, validations, calculations, status transitions and examples.',
    stage_ids: ['llm_whole_repository_building_blocks', 'llm_detail_reviews'],
    expected_outputs: ['capabilities[]', 'business_logic[]', 'business_logic_examples[]', 'function_examples[]'],
    guidance: 'Use source, tests, contracts and docs as evidence. Do not infer owner-grade business meaning from names alone.'
  },
  {
    id: 'interface_contract_analysis',
    label: 'Interface and Contract Analysis',
    purpose: 'Understand APIs, SOAP/WSDL/XSD, OpenAPI/Swagger, GraphQL, events, jobs, CLI commands, UI routes and external calls.',
    stage_ids: ['llm_whole_repository_building_blocks', 'llm_detail_reviews'],
    expected_outputs: ['interfaces[]', 'contracts[]', 'openapi', 'soap', 'graphql', 'events'],
    guidance: 'Inventory seed files are only starting points. Codex must find and parse contracts from source evidence and state uncertainty.'
  },
  {
    id: 'request_response_examples',
    label: 'Request/Response Examples',
    purpose: 'Extract or infer request/response, message, fault and payload examples with source-backed field meaning.',
    stage_ids: ['llm_whole_repository_building_blocks', 'llm_detail_reviews'],
    expected_outputs: ['request_response_examples[]', 'contract_examples[]'],
    guidance: 'Mark inferred examples with example_origin="inferred" and cite the fields/rules used.'
  },
  {
    id: 'visual_explanation_analysis',
    label: 'Visual Explanation Analysis',
    purpose: 'Explain E2E relationships, processes, failure modes, data movement and integrations using the clearest repository-specific artifact: prose, steps, tables, examples, Mermaid, SVG or no diagram when a diagram would mislead.',
    stage_ids: ['llm_whole_repository_building_blocks', 'llm_detail_reviews', 'llm_final_analysis_document'],
    expected_outputs: ['flows[]', 'visual_explanations[]', 'analysis_document.sections[].blocks[type=flow|visual_explanation|layered_explanation]'],
    guidance: 'Prefer explanation artifacts that teach how functions, modules, people and systems cooperate. Mermaid is optional supporting evidence, not the report itself, and should be omitted when prose, examples or a table communicates better.'
  },
  {
    id: 'domain_data_integration_analysis',
    label: 'Domain, Data and Integration Analysis',
    purpose: 'Extract domain objects, data stores, persistence effects, state changes, integrations, topics, queues and side effects.',
    stage_ids: ['llm_whole_repository_building_blocks', 'llm_detail_reviews'],
    expected_outputs: ['domain_model', 'data_model', 'integrations[]', 'side_effects[]'],
    guidance: 'Separate proven behavior from open questions when only schemas or persistence names are visible.'
  },
  {
    id: 'process_quality_readiness',
    label: 'Process, Quality and Readiness',
    purpose: 'Assess bugs, visible vulnerabilities, maintainability, tests, observability, release/process readiness and operational risks.',
    stage_ids: ['llm_whole_repository_building_blocks', 'llm_detail_reviews', 'llm_final_analysis_document'],
    expected_outputs: ['process', 'quality', 'findings[]', 'analysis_document.report_quality_review'],
    guidance: 'LLM review can identify evidence-backed risks, but dedicated scanners remain handoff tools for formal gates.'
  },
  {
    id: 'architecture_refactoring_roadmap',
    label: 'Architecture Decision and Modernization Applicability',
    purpose: 'Describe architecture responsibilities and decide whether modernization, refactoring, stabilization, preservation or no structural change is justified.',
    stage_ids: ['llm_whole_repository_building_blocks', 'llm_final_analysis_document'],
    expected_outputs: ['architecture', 'refactoring[] when applicable', 'modernization[] when applicable', 'analysis_document decision/applicability sections'],
    guidance: 'Turn code evidence into decision options with benefit, risk, effort and handoff boundaries. Do not force a refactoring roadmap; explicitly mark refactoring or modernization not applicable when the evidence supports stabilization, preservation or contract hardening instead.'
  },
  {
    id: 'detail_agent_planning',
    label: 'Detail-Agent Planning',
    purpose: 'Select focused source-family detail reviews after whole-repository understanding exists.',
    stage_ids: ['llm_detail_agent_plan'],
    expected_outputs: ['llm/detail-agent-plan.json', 'detail_agent_plan.tasks[]'],
    guidance: 'Codex chooses detail-review priorities; deterministic inventories only provide navigation context.'
  },
  {
    id: 'final_report_authoring',
    label: 'Final Report Authoring',
    purpose: 'Compose the visible decision document from all building blocks and detail reviews through the component library.',
    stage_ids: ['llm_final_analysis_document'],
    expected_outputs: ['analysis_document.report_design', 'analysis_document.analysis_dimensions[]', 'analysis_document.authored_report.sections[]', 'analysis_document.core_capability_coverage[]', 'analysis_document.whole_file_thesis_trace', 'analysis_document.requirements_trace[]', 'analysis_document.report_quality_review.dimension_checks[]', 'analysis_document.sections[].blocks[type=api_contracts]', 'analysis_document.sections[].blocks[type=request_response_examples]', 'analysis_document.sections[].blocks[type=capability_coverage]', 'analysis_document.sections[].blocks[type=source_coverage_trace]'],
    guidance: 'Choose section order, IDs, categories and emphasis per repository. Author analysis_document.report_design first to explain why this outline fits the user goal, then author analysis_document.authored_report.sections[] as the free-flow stakeholder assessment. Use component blocks only as technical annexes for evidence, APIs, examples, diagrams and coverage. Standard categories such as Executive Overview, How It Works, Technical View, Risks, Decision Path and Scope/Method are examples, not a menu. Always make repository-specific analysis_dimensions, the four core capabilities and whole-file thesis-impact proof visible through authored prose or supporting components. The report must explain the system in human language first while preserving technical drilldown, API/interface contracts, examples and purpose-fit visual explanations. It should read like a stakeholder assessment, with code identifiers and file paths used as citations or technical detail rather than the main narrative. Every major section should answer what the thing is, why it exists, who or what depends on it, how the relevant relationship works, what can go wrong and what decision follows. Use concrete source-derived examples, implications and evidence for important claims, and explain domain terms before relying on them. Include reader_comprehension_review and dimension_checks in report_quality_review. Do not rely on fixed appendices, component checklists or raw catalogs as the human report.'
  },
  {
    id: 'tool_positioning',
    label: 'Tool Positioning',
    purpose: 'Position the source-derived analysis against consulting/gen-AI suites, architecture mapping, static quality gates and transformation engines.',
    stage_ids: ['llm_whole_repository_building_blocks', 'llm_final_analysis_document'],
    expected_outputs: ['tool_positioning', 'analysis_document decision/tool sections'],
    guidance: 'Use market references only as framing. Claims about the repository must come from source evidence.'
  },
  {
    id: 'evidence_governance',
    label: 'Evidence Governance',
    purpose: 'Keep claims source-backed, uncertainty visible and file inventory accounted for.',
    stage_ids: ['llm_whole_repository_building_blocks', 'llm_detail_reviews', 'llm_final_analysis_document'],
    expected_outputs: ['evidence[]', 'analysis_coverage', 'open_questions[]', 'analysis_document.whole_file_thesis_trace', 'analysis_document.sections[].blocks[type=source_coverage_trace]'],
    guidance: 'Every substantive claim needs file:line evidence or an explicit open question. The final report must also explain how complete Tier 1 file-card coverage influenced thesis selection and confidence.'
  }
];

export function analysisSkillCatalogArtifact(): any {
  return {
    catalog_kind: 'llm_analysis_skill_catalog',
    semantic_authority: 'codex_llm',
    deterministic_authority: 'catalog_presence_and_shape_only',
    purpose: 'Reusable Codex LLM analysis capabilities for repository understanding. The CLI exposes and validates the catalog shape; Codex decides which skills matter for a repository and how to apply them.',
    skills: ANALYSIS_SKILL_CATALOG
  };
}

export function analysisSkillIds(): string[] {
  return ANALYSIS_SKILL_CATALOG.map(skill => skill.id);
}

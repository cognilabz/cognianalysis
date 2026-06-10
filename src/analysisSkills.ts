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
    purpose: 'Author the repository-specific analysis plan, source-slice hypotheses, skill application plan and report intent before fixed workbench tasks are used.',
    stage_ids: ['llm_analysis_strategy'],
    expected_outputs: ['llm/analysis-strategy.json', 'analysis_strategy.whole_repo_first_plan', 'analysis_strategy.report_intent'],
    guidance: 'Use inventory only as context. The LLM decides how this repository should be understood, which skills matter and where deeper review may be needed.'
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
    purpose: 'Create mandatory Tier 1 LLM-authored file cards for every included file, then promote important areas to Tier 2-4 technical drilldown, behavior, risk and transformation analysis.',
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
    guidance: 'Inventory seed files are only starting points. The LLM must find and parse contracts from source evidence and state uncertainty.'
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
    id: 'flow_mermaid_analysis',
    label: 'Flow and Mermaid Analysis',
    purpose: 'Explain E2E, process, failure, data and integration flows using narrative and Mermaid where useful.',
    stage_ids: ['llm_whole_repository_building_blocks', 'llm_detail_reviews', 'llm_final_analysis_document'],
    expected_outputs: ['flows[]', 'mermaid_flows[]', 'analysis_document.sections[].blocks[type=flow]'],
    guidance: 'Prefer flows that teach how functions, modules and systems cooperate. Mermaid is supporting evidence, not the report itself.'
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
    label: 'Architecture and Refactoring Roadmap',
    purpose: 'Describe architecture responsibilities and modernization/refactoring/target-tech-stack options.',
    stage_ids: ['llm_whole_repository_building_blocks', 'llm_final_analysis_document'],
    expected_outputs: ['architecture', 'refactoring[]', 'modernization[]', 'analysis_document.sections[].blocks[type=roadmap]'],
    guidance: 'Turn code evidence into decision options with benefit, risk, effort and handoff boundaries.'
  },
  {
    id: 'detail_agent_planning',
    label: 'Detail-Agent Planning',
    purpose: 'Select focused source-family detail reviews after whole-repository understanding exists.',
    stage_ids: ['llm_detail_agent_plan'],
    expected_outputs: ['llm/detail-agent-plan.json', 'detail_agent_plan.tasks[]'],
    guidance: 'The LLM chooses detail-review priorities; deterministic inventories only provide navigation context.'
  },
  {
    id: 'final_report_authoring',
    label: 'Final Report Authoring',
    purpose: 'Compose the visible decision document from all building blocks and detail reviews through the component library.',
    stage_ids: ['llm_final_analysis_document'],
    expected_outputs: ['analysis_document.sections[]', 'analysis_document.requirements_trace[]', 'analysis_document.report_quality_review'],
    guidance: 'Choose section order and emphasis per repository. Do not rely on fixed appendices or raw catalogs as the human report.'
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
    expected_outputs: ['evidence[]', 'analysis_coverage', 'open_questions[]'],
    guidance: 'Every substantive claim needs file:line evidence or an explicit open question.'
  }
];

export function analysisSkillCatalogArtifact(): any {
  return {
    catalog_kind: 'llm_analysis_skill_catalog',
    semantic_authority: 'llm',
    deterministic_authority: 'catalog_presence_and_shape_only',
    purpose: 'Reusable LLM analysis capabilities for repository understanding. The CLI exposes and validates the catalog shape; the LLM decides which skills matter for a repository and how to apply them.',
    skills: ANALYSIS_SKILL_CATALOG
  };
}

export function analysisSkillIds(): string[] {
  return ANALYSIS_SKILL_CATALOG.map(skill => skill.id);
}

import { TargetCapability } from '../types';

export const TARGET_CAPABILITIES: TargetCapability[] = [
  {
    id: 'existing-harness-execution',
    title: 'Existing harness execution',
    description: 'Cognianalysis is launched from an existing harness through AGENTS.md, harness-native instruction files, CLI commands or optional MCP tools, not by a custom coding agent.',
    addressed_by: ['resources/AGENTS.md', 'harness-native instruction files', '.agents/skills/cognianalysis/SKILL.md', 'CLI commands', 'optional cognianalysis dev mcp'],
    expected_outputs: ['.analysis/llm_tasks/*.md', '.analysis/llm/*.json'],
    output_keys: ['tasks']
  },
  {
    id: 'llm-first-semantic-extraction',
    title: 'LLM-first semantic extraction',
    description: 'Codex, as the active in-session LLM, extracts meaning, detailed textual explanations, business processes and E2E flows. The CLI prepares context and validates evidence only.',
    addressed_by: ['Main harness workflow', 'llm_instructions.md', 'source-capsules.json'],
    expected_outputs: ['assessment', 'capabilities', 'interfaces', 'flows', 'business_processes[]', 'process.workflow_inefficiencies[]'],
    output_keys: ['assessment', 'capabilities', 'interfaces', 'flows', 'business_processes', 'process']
  },
  {
    id: 'llm-authored-analysis-strategy',
    title: 'Codex-authored LLM analysis strategy',
    description: 'The repository-specific analysis approach, source slices, skill plan and report intent are authored by Codex before source tiering, skill workbenches, optional templates and final synthesis.',
    addressed_by: ['00-analysis-strategy.md', 'llm/analysis-strategy.json', 'analysis_pipeline llm_analysis_strategy stage'],
    expected_outputs: ['llm_analysis_strategy.uses_pre_analysis_strategy_artifact=true', 'llm_analysis_strategy.strategy_present=true'],
    output_keys: ['llm_analysis_strategy.uses_pre_analysis_strategy_artifact', 'llm_analysis_strategy.strategy_present']
  },
  {
    id: 'non-authoritative-code-map',
    title: 'Non-authoritative inventory map',
    description: 'Inventory metadata helps navigation but never parses or decides imports, symbols, frameworks, contracts, examples, entrypoints or relationships.',
    addressed_by: ['code-map.json extraction_policy', 'Main skill non-goals', 'Generated task warnings'],
    expected_outputs: ['extraction_policy.deterministic_parsing_disabled=true'],
    output_keys: ['extraction_policy.deterministic_parsing_disabled']
  },
  {
    id: 'whole-codebase-source-inventory-accounting',
    title: 'Whole-codebase source inventory accounting',
    description: 'Every included repository file is accounted for by evidence or explicit Codex/in-session LLM inspection. Deferred files remain visible as incomplete follow-up and do not count as completed whole-codebase analysis.',
    addressed_by: ['source-inventory.json', 'analysis_coverage in LLM outputs', 'cognianalysis dev finalize source inventory accounting contract', 'embedded report audit data'],
    expected_outputs: ['source_inventory_accounting.complete=true', 'analysis_coverage.inspected_files[]'],
    output_keys: ['source_inventory_accounting.complete', 'analysis_coverage']
  },
  {
    id: 'tiered-whole-codebase-analysis',
    title: 'Tiered whole-codebase analysis',
    description: 'Every included file receives at least a Tier 1 Codex-authored LLM file card before repository synthesis; selected areas receive deeper Tier 2-4 technical, behavioral, quality, process and modernization-applicability analysis.',
    addressed_by: ['source-tier-task-manifest.json', 'source_tier_tasks/*.md', 'source_tiers/*.json', 'source_tier_coverage', 'analysis_document technical drilldown sections'],
    expected_outputs: ['source_tier_coverage.complete=true', 'source_file_tier_reviews[]'],
    output_keys: ['source_tier_coverage.complete', 'source_file_tier_reviews']
  },
  {
    id: 'whole-repository-documentation',
    title: 'Whole-repository documentation',
    description: 'The report starts with a complete repository narrative and source-family map before any module-specific deep review.',
    addressed_by: ['Codex-planned skill workbench reviews', 'optional capability_templates/01-core-assessment.md repository_wide_view when selected', 'source inventory accounting contract', 'Codex-authored LLM analysis document sections'],
    expected_outputs: ['assessment.repository_wide_view', 'source_inventory_accounting.complete=true'],
    output_keys: ['assessment.repository_wide_view', 'source_inventory_accounting.complete']
  },
  {
    id: 'llm-authored-analysis-document',
    title: 'Codex-authored LLM analysis document',
    description: 'The visible human report is authored by Codex as a repository-specific decision document, while the renderer supplies stable components, styling and evidence validation without deciding semantic report quality.',
    addressed_by: ['12-analysis-document.md', 'analysis_document.sections[]', 'analysis_document.requirements_trace[]', 'analysis_document.report_quality_review', 'analysis_document.synthesis_stage', 'analysis_document_prerequisite_coverage.complete', 'report_mode.llm_authored', 'report_mode.final_after_detail_reviews', 'report_mode.final_synthesis_ready', 'Report component renderer'],
    expected_outputs: ['analysis_document_prerequisite_coverage.complete=true', 'analysis_document_quality_review.complete=true', 'report_mode.llm_authored=true', 'report_mode.final_after_detail_reviews=true', 'report_mode.final_synthesis_ready=true', 'analysis_document.sections[]', 'analysis_document_component_coverage.complete=true'],
    output_keys: ['analysis_document_prerequisite_coverage.complete', 'analysis_document_quality_review.complete', 'report_mode.llm_authored', 'report_mode.final_after_detail_reviews', 'report_mode.final_synthesis_ready', 'analysis_document.sections', 'analysis_document_component_coverage.complete']
  },
  {
    id: 'management-ready-report-quality-review',
    title: 'Management-ready report quality review',
    description: 'The final Codex-authored LLM report includes its own structured quality review and Codex verdict is decision_ready.',
    addressed_by: ['12-analysis-document.md', 'analysis_document.report_quality_review', 'analysis_document_quality_review'],
    expected_outputs: ['analysis_document_quality_review.complete=true', 'report_mode.report_quality_review_decision_ready=true'],
    output_keys: ['analysis_document_quality_review.complete', 'report_mode.report_quality_review_decision_ready']
  },
  {
    id: 'four-level-analysis-model',
    title: 'Four-level analysis model',
    description: 'The Codex-authored LLM report quality review and requirements trace judge whether reverse engineering/documentation, code analysis, process analysis and modernization/refactoring applicability are covered, open or not applicable as a decision basis.',
    addressed_by: ['12-analysis-document.md', 'analysis_document.requirements_trace[]', 'analysis_document.report_quality_review'],
    expected_outputs: ['analysis_document_requirements_trace_contract.complete=true', 'analysis_document_quality_review.complete=true', 'report_mode.report_quality_review_decision_ready=true'],
    output_keys: ['analysis_document_requirements_trace_contract.complete', 'analysis_document_quality_review.complete']
  },
  {
    id: 'original-requirements-trace',
    title: 'Original requirements trace',
    description: 'The authored analysis document contains a structured Codex-authored LLM requirements trace for the user goal. Trace rows explicitly reference the preserved goal-contract IDs; the CLI verifies only reference shape while Codex-authored statuses/verdict decide readiness.',
    addressed_by: ['analysis-goal-contract.json', 'analysis_document.requirements_trace[].goal_contract_refs', 'analysis_goal_trace_alignment', 'analysis_document_requirements_trace_contract'],
    expected_outputs: ['analysis_document_requirements_trace_contract.complete=true', 'analysis_goal_trace_alignment.complete=true'],
    output_keys: ['analysis_document_requirements_trace_contract.complete', 'analysis_goal_trace_alignment.complete']
  },
  {
    id: 'source-family-detail-agent-plan',
    title: 'Source-family detail agent plan',
    description: 'Large repositories get a Codex-authored LLM overview-first plan for focused source-family detail agents after the whole-repository synthesis.',
    addressed_by: ['11-detail-agent-plan.md', 'llm/detail-agent-plan.json', 'detail_agent_plan.tasks[]', 'llm_detail_agent_plan.tasks[]'],
    expected_outputs: ['llm_detail_agent_plan.uses_pre_final_plan_artifact=true', 'llm_detail_agent_plan.planning_decision_present=true'],
    output_keys: ['llm_detail_agent_plan.uses_pre_final_plan_artifact', 'llm_detail_agent_plan.planning_decision_present']
  },
  {
    id: 'source-family-detail-task-files',
    title: 'Source-family detail task files',
    description: 'The Codex-authored LLM agent plan is mechanically materialized as executable source-family detail task files with expected JSON review outputs.',
    addressed_by: ['11-detail-agent-plan.md', 'llm/detail-agent-plan.json', 'detail_tasks/*.md', 'detail-task-manifest.json', 'detail_reviews/*.json'],
    expected_outputs: ['detail_task_manifest.tasks[]'],
    output_keys: ['detail_task_manifest.tasks']
  },
  {
    id: 'source-family-detail-review-ingestion',
    title: 'Source-family detail review ingestion',
    description: 'Executed source-family detail-agent JSON outputs are loaded into the analysis bundle and can enrich the final report.',
    addressed_by: ['detail_reviews/*.json', 'source_family_detail_reviews[]', 'analysis_coverage from detail reviews'],
    expected_outputs: ['source_family_detail_reviews[]'],
    output_keys: ['source_family_detail_reviews']
  },
  {
    id: 'source-family-detail-review-coverage',
    title: 'Source-family detail review coverage',
    description: 'Every Codex-planned source-family detail task is either executed and integrated into the Codex-authored LLM report, or the report remains partial.',
    addressed_by: ['llm_detail_agent_plan.tasks[]', 'detail_reviews/*.json', 'analysis_document.detail_review_synthesis', 'source_family_detail_review_coverage'],
    expected_outputs: ['source_family_detail_review_coverage.uses_pre_final_plan_artifact=true', 'source_family_detail_review_coverage.complete=true'],
    output_keys: ['source_family_detail_review_coverage.uses_pre_final_plan_artifact', 'source_family_detail_review_coverage.complete']
  },
  {
    id: 'detail-review-report-synthesis',
    title: 'Detail-review report synthesis',
    description: 'The Codex-authored LLM report explicitly integrates every executed source-family detail review or marks the report as stale.',
    addressed_by: ['12-analysis-document.md', 'analysis_document.detail_review_synthesis', 'analysis_document_detail_review_synthesis', 'analysis_document_prerequisite_coverage'],
    expected_outputs: ['analysis_document_prerequisite_coverage.complete=true', 'analysis_document_detail_review_synthesis.complete=true', 'report_mode.final_after_detail_reviews=true', 'report_mode.final_synthesis_ready=true'],
    output_keys: ['analysis_document_prerequisite_coverage.complete', 'analysis_document_detail_review_synthesis.complete', 'report_mode.final_after_detail_reviews', 'report_mode.final_synthesis_ready']
  },
  {
    id: 'business-capabilities',
    title: 'Business capabilities',
    description: 'Business capabilities, actors, domain terms, use cases, business processes, workflows and rules.',
    addressed_by: ['Codex-selected business extraction workbench or optional capability_templates/02-business-capabilities-logic.md', 'Codex-authored LLM capability/business sections'],
    expected_outputs: ['capabilities[]', 'business_processes[]', 'business_rules[]'],
    output_keys: ['capabilities', 'business_processes', 'business_rules']
  },
  {
    id: 'functional-view',
    title: 'Functional view',
    description: 'Decision-ready functional view of what the system does, including capabilities, actors, use cases, user/system flows, business workflows, business rules, process logic and representative E2E flows.',
    addressed_by: ['Codex-planned skill workbench reviews', 'optional functional/flow capability templates when selected', 'Codex-authored LLM functional sections'],
    expected_outputs: ['assessment.functional_view', 'functional_view.business_processes[]', 'functional_view.business_rules[]', 'functional_view.e2e_flows[]'],
    output_keys: ['assessment.functional_view']
  },
  {
    id: 'business-logic',
    title: 'Business logic',
    description: 'Validations, decisions, calculations, status transitions, authorization behavior and examples.',
    addressed_by: ['Codex-selected business extraction workbench or optional capability_templates/02-business-capabilities-logic.md', 'Codex-authored LLM business logic sections'],
    expected_outputs: ['business_logic[]', 'capabilities[].business_logic[]'],
    output_keys: ['business_logic', 'capabilities']
  },
  {
    id: 'interfaces-contracts',
    title: 'Interfaces and contracts',
    description: 'HTTP/REST, GraphQL, events, jobs, CLI commands, UI routes, SOAP, OpenAPI, database touchpoints and external calls.',
    addressed_by: ['Codex-selected interface/contract workbench or optional capability_templates/03-interface-contract-extraction.md and 05-openapi-soap-graphql.md', 'Codex-authored LLM interface/contract sections'],
    expected_outputs: ['interfaces[]'],
    output_keys: ['interfaces']
  },
  {
    id: 'request-response-examples',
    title: 'Request/response examples',
    description: 'Req/res examples from docs/tests/contracts or inferred examples clearly marked as inferred.',
    addressed_by: ['Codex-selected example extraction workbench or optional capability_templates/04-request-response-examples.md', 'Codex-authored LLM example/drilldown sections'],
    expected_outputs: ['documentation.request_response_examples[]', 'interfaces[].examples[]'],
    output_keys: ['documentation.request_response_examples', 'interfaces']
  },
  {
    id: 'openapi-swagger',
    title: 'OpenAPI / Swagger extraction',
    description: 'OpenAPI/Swagger operations, schemas and examples where present.',
    addressed_by: ['Codex-selected contract workbench or optional capability_templates/05-openapi-soap-graphql.md', 'Codex-authored LLM contract/drilldown sections'],
    expected_outputs: ['documentation.openapi[]', 'interfaces[].openapi'],
    output_keys: ['documentation.openapi', 'interfaces']
  },
  {
    id: 'soap-wsdl-xsd',
    title: 'SOAP / WSDL / XSD extraction',
    description: 'SOAP/WSDL/XSD operations, messages, faults, SOAP actions and envelope examples where present.',
    addressed_by: ['Codex-selected contract workbench or optional capability_templates/05-openapi-soap-graphql.md', 'Codex-authored LLM contract/drilldown sections'],
    expected_outputs: ['documentation.soap[]', 'interfaces[].soap'],
    output_keys: ['documentation.soap', 'interfaces']
  },
  {
    id: 'technical-view',
    title: 'Technical view',
    description: 'Decision-ready technical view covering APIs, interfaces, contracts, architecture/system landscape, data flows, dependencies, technology stack, data stores and integrations.',
    addressed_by: ['Codex-planned skill workbench reviews', 'optional technical capability templates when selected', 'Codex-authored LLM technical sections'],
    expected_outputs: ['assessment.technical_view', 'technical_view.data_flows[]', 'technical_view.dependencies[]', 'technical_view.technology_stack[]'],
    output_keys: ['assessment.technical_view']
  },
  {
    id: 'visual-explanations',
    title: 'Repository-fit visual explanations',
    description: 'Happy paths, failure paths, state changes, side effects, external calls, architecture, timelines or decision logic explained using the format the LLM judges clearest for the repository. Mermaid is allowed, but not required.',
    addressed_by: ['Codex-selected visual explanation workbench or optional capability templates', 'Codex-authored LLM narrative/flow/diagram component blocks'],
    expected_outputs: ['flows[] when useful', 'visual_explanations[] when useful', 'analysis_document.sections[].blocks[]'],
    output_keys: ['flows', 'documentation.visual_explanations', 'analysis_document.sections']
  },
  {
    id: 'domain-data-integrations',
    title: 'Domain, data and integrations',
    description: 'Domain entities, data stores, state models, integrations and side effects.',
    addressed_by: ['Codex-selected domain/data/integration workbench or optional capability_templates/07-domain-data-integrations.md', 'Codex-authored LLM domain/data/integration sections'],
    expected_outputs: ['domain_model', 'data_model', 'integrations[]', 'side_effects[]'],
    output_keys: ['domain_model', 'data_model', 'integrations', 'side_effects']
  },
  {
    id: 'architecture-assessment',
    title: 'Architecture assessment',
    description: 'Modules, responsibilities, dependencies, external systems, runtime hints and architecture observations.',
    addressed_by: ['Codex-selected architecture workbench or optional capability_templates/09-architecture-refactoring-roadmap.md', 'Codex-authored LLM architecture sections'],
    expected_outputs: ['architecture'],
    output_keys: ['architecture']
  },
  {
    id: 'process-readiness',
    title: 'Process and readiness assessment',
    description: 'Implemented business processes, workflow inefficiencies, optimization opportunities, tests, CI/CD, release, observability, configuration, local setup and operational readiness.',
    addressed_by: ['Codex-selected process/quality workbench or optional capability_templates/08-process-quality-readiness.md', 'Codex-authored LLM process/readiness sections'],
    expected_outputs: ['process', 'process.implemented_business_processes[]', 'process.workflow_inefficiencies[]', 'process.optimization_opportunities[]', 'quality'],
    output_keys: ['process', 'quality']
  },
  {
    id: 'quality-risks-findings',
    title: 'Bugs, vulnerabilities and quality findings',
    description: 'Visible bugs, weaknesses, security risks, maintainability, documentation, testability and operability findings.',
    addressed_by: ['Codex-selected quality/architecture workbenches or optional process/architecture capability templates', 'Codex-authored LLM findings/risk sections'],
    expected_outputs: ['findings[]', 'quality.risks[]', 'quality.security[]'],
    output_keys: ['findings', 'quality']
  },
  {
    id: 'structured-decision-basis',
    title: 'Structured decision basis',
    description: 'Structured analysis document that supports decisions with verdicts, trade-offs, risks, recommendations and evidence.',
    addressed_by: ['Codex-planned skill workbench reviews', 'optional capability_templates/10-report-completeness-review.md when selected', 'Codex-authored LLM decision sections'],
    expected_outputs: ['assessment.decision_basis'],
    output_keys: ['assessment.decision_basis']
  },
  {
    id: 'refactoring-modernization',
    title: 'Modernization/refactoring applicability',
    description: 'Source-backed decision path for refactor, migration, replacement, stabilization, preservation, contract hardening or no structural change; roadmap details only where justified.',
    addressed_by: ['Codex-selected architecture/refactoring workbench or optional capability_templates/09-architecture-refactoring-roadmap.md', 'Codex-authored LLM decision-path sections'],
    expected_outputs: ['modernization_refactoring_applicability', 'refactoring[] when applicable', 'modernization[] when applicable'],
    output_keys: ['modernization_refactoring_applicability', 'refactoring', 'modernization']
  },
  {
    id: 'target-architecture-tech-stack',
    title: 'Target architecture / new tech stack',
    description: 'Target architecture or new technology stack options only where evidence and decision value justify structural change.',
    addressed_by: ['Codex-selected architecture/refactoring workbench or optional capability_templates/09-architecture-refactoring-roadmap.md', 'Codex-authored LLM architecture/applicability sections'],
    expected_outputs: ['architecture.target_architecture when applicable', 'modernization[].target_state when applicable'],
    output_keys: ['architecture.target_architecture', 'modernization']
  },
  {
    id: 'tool-alternative-positioning',
    title: 'Tool alternative positioning',
    description: 'Evidence-based positioning as an alternative or complement to consulting/gen-AI delivery suites, structural architecture mapping, static quality/security gates and automated transformation engines, including automation and handoff boundaries.',
    addressed_by: ['Codex-planned skill workbench reviews', 'optional capability_templates/10-report-completeness-review.md when selected', 'Codex-authored LLM decision sections'],
    expected_outputs: ['assessment.tool_positioning'],
    output_keys: ['assessment.tool_positioning']
  },
  {
    id: 'evidence-governance',
    title: 'Evidence-first governance',
    description: 'Every claim should carry file:line evidence; invalid references are detected.',
    addressed_by: ['Main skill evidence rules', 'validate command', 'embedded evidence index and validation gates'],
    expected_outputs: ['evidence_index[]'],
    output_keys: ['evidence_index']
  },
  {
    id: 'interactive-html-report',
    title: 'Interactive static HTML report',
    description: 'Static HTML with embedded data, navigation, search and evidence drawers.',
    addressed_by: ['render command', 'report/index.html'],
    expected_outputs: ['.analysis/report/index.html', '.analysis/report/analysis-data.json'],
    output_keys: ['report_artifacts.index_html', 'report_artifacts.analysis_data_json', 'report_mode.llm_authored']
  },
  {
    id: 'harness-portability',
    title: 'Harness portability',
    description: 'Skills plus CLI are portable; optional stdio bridge exposes deterministic commands.',
    addressed_by: ['AGENTS.md', 'skills', 'cognianalysis dev mcp'],
    expected_outputs: ['skills', 'CLI tools'],
    output_keys: ['tasks']
  }
];

export function computeTargetCoverage(bundle: any): any[] {
  return TARGET_CAPABILITIES.map(cap => {
    return {
      ...cap,
      coverage_kind: 'goal_contract_context',
      artifact_contract_kind: 'llm_trace_target_context',
      semantic_verdict_authority: 'codex_llm',
      deterministic_contract_scope: 'target capability registration and expected-output hints only; no output-key presence scoring, semantic matching, quality scoring or readiness judgment',
      output_status: 'not_scored',
      output_status_meaning: 'Not scored by the CLI. The row is context for Codex-authored LLM requirements_trace/report_quality_review and must not be read as present, partial, missing or covered.',
      design_status: 'context',
      design_status_meaning: 'The target capability is preserved as original goal context for LLM traceability. This is not a claim that the capability is semantically satisfied.',
      output_ratio: null,
      output_details: cap.output_keys.map(key => ({
        key,
        deterministic_presence_scored: false,
        role: 'expected LLM artifact or renderer output hint for the authoring task'
      }))
    };
  });
}

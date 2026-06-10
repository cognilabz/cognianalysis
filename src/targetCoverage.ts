import { TargetCapability } from './types';

export const TARGET_CAPABILITIES: TargetCapability[] = [
  {
    id: 'existing-harness-execution',
    title: 'Existing harness execution',
    description: 'Cognianalysis is launched from an existing harness through AGENTS.md, harness-native instruction files, CLI commands or optional MCP tools, not by a custom coding agent.',
    addressed_by: ['resources/AGENTS.md', 'harness-native instruction files', '.agents/skills/cognianalysis/SKILL.md', 'CLI commands', 'optional cognianalysis mcp'],
    expected_outputs: ['.analysis/llm_tasks/*.md', '.analysis/llm/*.json'],
    output_keys: ['tasks']
  },
  {
    id: 'llm-first-semantic-extraction',
    title: 'LLM-first semantic extraction',
    description: 'The agent harness/LLM extracts meaning. The CLI prepares context and validates evidence only.',
    addressed_by: ['Main harness workflow', 'llm_instructions.md', 'source-capsules.json'],
    expected_outputs: ['assessment', 'capabilities', 'interfaces', 'flows'],
    output_keys: ['assessment', 'capabilities', 'interfaces', 'flows']
  },
  {
    id: 'llm-authored-analysis-strategy',
    title: 'LLM-authored analysis strategy',
    description: 'The repository-specific analysis approach, source slices, skill plan and report intent are authored by the LLM before fixed workbench tasks and final synthesis.',
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
    description: 'Every included repository file is accounted for by evidence or explicit agent harness/LLM inspection. Deferred files remain visible as incomplete follow-up and do not count as completed whole-codebase analysis.',
    addressed_by: ['source-inventory.json', 'analysis_coverage in LLM outputs', 'cognianalysis finalize source inventory accounting contract', 'embedded report audit data'],
    expected_outputs: ['source_inventory_accounting.complete=true', 'analysis_coverage.inspected_files[]'],
    output_keys: ['source_inventory_accounting.complete', 'analysis_coverage']
  },
  {
    id: 'tiered-whole-codebase-analysis',
    title: 'Tiered whole-codebase analysis',
    description: 'Every included file receives at least a Tier 1 LLM-authored file card before repository synthesis; selected areas receive deeper Tier 2-4 technical, behavioral, quality and refactoring analysis.',
    addressed_by: ['source-tier-task-manifest.json', 'source_tier_tasks/*.md', 'source_tiers/*.json', 'source_tier_coverage', 'analysis_document technical drilldown sections'],
    expected_outputs: ['source_tier_coverage.complete=true', 'source_file_tier_reviews[]'],
    output_keys: ['source_tier_coverage.complete', 'source_file_tier_reviews']
  },
  {
    id: 'whole-repository-documentation',
    title: 'Whole-repository documentation',
    description: 'The report starts with a complete repository narrative and source-family map before any module-specific deep review.',
    addressed_by: ['01-core-assessment.md repository_wide_view', 'module surface reviews', 'source inventory accounting contract', 'LLM-authored analysis document sections'],
    expected_outputs: ['assessment.repository_wide_view', 'source_inventory_accounting.complete=true'],
    output_keys: ['assessment.repository_wide_view', 'source_inventory_accounting.complete']
  },
  {
    id: 'llm-authored-analysis-document',
    title: 'LLM-authored analysis document',
    description: 'The visible human report is authored by the LLM as a repository-specific decision document, while the renderer supplies stable components, styling and evidence validation without deciding semantic report quality.',
    addressed_by: ['12-analysis-document.md', 'analysis_document.sections[]', 'analysis_document.requirements_trace[]', 'analysis_document.report_quality_review', 'analysis_document.synthesis_stage', 'analysis_document_prerequisite_coverage.complete', 'report_mode.llm_authored', 'report_mode.final_after_detail_reviews', 'report_mode.final_synthesis_ready', 'Report component renderer'],
    expected_outputs: ['analysis_document_prerequisite_coverage.complete=true', 'analysis_document_quality_review.complete=true', 'report_mode.llm_authored=true', 'report_mode.final_after_detail_reviews=true', 'report_mode.final_synthesis_ready=true', 'analysis_document.sections[]', 'analysis_document_component_coverage.complete=true'],
    output_keys: ['analysis_document_prerequisite_coverage.complete', 'analysis_document_quality_review.complete', 'report_mode.llm_authored', 'report_mode.final_after_detail_reviews', 'report_mode.final_synthesis_ready', 'analysis_document.sections', 'analysis_document_component_coverage.complete']
  },
  {
    id: 'management-ready-report-quality-review',
    title: 'Management-ready report quality review',
    description: 'The final LLM-authored report includes its own structured quality review and the LLM verdict is decision_ready.',
    addressed_by: ['12-analysis-document.md', 'analysis_document.report_quality_review', 'analysis_document_quality_review'],
    expected_outputs: ['analysis_document_quality_review.complete=true', 'report_mode.report_quality_review_decision_ready=true'],
    output_keys: ['analysis_document_quality_review.complete', 'report_mode.report_quality_review_decision_ready']
  },
  {
    id: 'four-level-analysis-model',
    title: 'Four-level analysis model',
    description: 'The LLM-authored report quality review and requirements trace judge whether reverse engineering/documentation, code analysis, process analysis and refactoring/target architecture are covered as a decision basis.',
    addressed_by: ['12-analysis-document.md', 'analysis_document.requirements_trace[]', 'analysis_document.report_quality_review'],
    expected_outputs: ['analysis_document_requirements_trace_contract.complete=true', 'analysis_document_quality_review.complete=true', 'report_mode.report_quality_review_decision_ready=true'],
    output_keys: ['analysis_document_requirements_trace_contract.complete', 'analysis_document_quality_review.complete']
  },
  {
    id: 'original-requirements-trace',
    title: 'Original requirements trace',
    description: 'The authored analysis document contains a structured LLM-authored requirements trace for the user goal. Trace rows explicitly reference the preserved goal-contract IDs; the CLI verifies only reference shape while the LLM statuses/verdict decide readiness.',
    addressed_by: ['analysis-goal-contract.json', 'analysis_document.requirements_trace[].goal_contract_refs', 'analysis_goal_trace_alignment', 'analysis_document_requirements_trace_contract'],
    expected_outputs: ['analysis_document_requirements_trace_contract.complete=true', 'analysis_goal_trace_alignment.complete=true'],
    output_keys: ['analysis_document_requirements_trace_contract.complete', 'analysis_goal_trace_alignment.complete']
  },
  {
    id: 'source-family-detail-agent-plan',
    title: 'Source-family detail agent plan',
    description: 'Large repositories get an LLM-authored overview-first plan for focused source-family detail agents after the whole-repository synthesis.',
    addressed_by: ['11-detail-agent-plan.md', 'llm/detail-agent-plan.json', 'detail_agent_plan.tasks[]', 'llm_detail_agent_plan.tasks[]'],
    expected_outputs: ['llm_detail_agent_plan.uses_pre_final_plan_artifact=true', 'llm_detail_agent_plan.planning_decision_present=true'],
    output_keys: ['llm_detail_agent_plan.uses_pre_final_plan_artifact', 'llm_detail_agent_plan.planning_decision_present']
  },
  {
    id: 'source-family-detail-task-files',
    title: 'Source-family detail task files',
    description: 'The LLM-authored agent plan is mechanically materialized as executable source-family detail task files with expected JSON review outputs.',
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
    description: 'Every LLM-planned source-family detail task is either executed and integrated into the LLM-authored report, or the report remains partial.',
    addressed_by: ['llm_detail_agent_plan.tasks[]', 'detail_reviews/*.json', 'analysis_document.detail_review_synthesis', 'source_family_detail_review_coverage'],
    expected_outputs: ['source_family_detail_review_coverage.uses_pre_final_plan_artifact=true', 'source_family_detail_review_coverage.complete=true'],
    output_keys: ['source_family_detail_review_coverage.uses_pre_final_plan_artifact', 'source_family_detail_review_coverage.complete']
  },
  {
    id: 'detail-review-report-synthesis',
    title: 'Detail-review report synthesis',
    description: 'The LLM-authored report explicitly integrates every executed source-family detail review or marks the report as stale.',
    addressed_by: ['12-analysis-document.md', 'analysis_document.detail_review_synthesis', 'analysis_document_detail_review_synthesis', 'analysis_document_prerequisite_coverage'],
    expected_outputs: ['analysis_document_prerequisite_coverage.complete=true', 'analysis_document_detail_review_synthesis.complete=true', 'report_mode.final_after_detail_reviews=true', 'report_mode.final_synthesis_ready=true'],
    output_keys: ['analysis_document_prerequisite_coverage.complete', 'analysis_document_detail_review_synthesis.complete', 'report_mode.final_after_detail_reviews', 'report_mode.final_synthesis_ready']
  },
  {
    id: 'business-capabilities',
    title: 'Business capabilities',
    description: 'Business capabilities, actors, domain terms and use cases.',
    addressed_by: ['02-business-capabilities-logic.md', 'LLM-authored capability/business sections'],
    expected_outputs: ['capabilities[]'],
    output_keys: ['capabilities']
  },
  {
    id: 'functional-view',
    title: 'Functional view',
    description: 'Decision-ready functional view of what the system does, including capabilities, actors, use cases and user/system flows.',
    addressed_by: ['01-core-assessment.md', '02-business-capabilities-logic.md', '06-flows-mermaid.md', 'LLM-authored functional sections'],
    expected_outputs: ['assessment.functional_view'],
    output_keys: ['assessment.functional_view']
  },
  {
    id: 'business-logic',
    title: 'Business logic',
    description: 'Validations, decisions, calculations, status transitions, authorization behavior and examples.',
    addressed_by: ['02-business-capabilities-logic.md', 'LLM-authored business logic sections'],
    expected_outputs: ['business_logic[]', 'capabilities[].business_logic[]'],
    output_keys: ['business_logic', 'capabilities']
  },
  {
    id: 'interfaces-contracts',
    title: 'Interfaces and contracts',
    description: 'HTTP/REST, GraphQL, events, jobs, CLI commands, UI routes, SOAP, OpenAPI, database touchpoints and external calls.',
    addressed_by: ['03-interface-contract-extraction.md', '05-openapi-soap-graphql.md', 'LLM-authored interface/contract sections'],
    expected_outputs: ['interfaces[]'],
    output_keys: ['interfaces']
  },
  {
    id: 'request-response-examples',
    title: 'Request/response examples',
    description: 'Req/res examples from docs/tests/contracts or inferred examples clearly marked as inferred.',
    addressed_by: ['04-request-response-examples.md', 'LLM-authored example/drilldown sections'],
    expected_outputs: ['documentation.request_response_examples[]', 'interfaces[].examples[]'],
    output_keys: ['documentation.request_response_examples', 'interfaces']
  },
  {
    id: 'openapi-swagger',
    title: 'OpenAPI / Swagger extraction',
    description: 'OpenAPI/Swagger operations, schemas and examples where present.',
    addressed_by: ['05-openapi-soap-graphql.md', 'LLM-authored contract/drilldown sections'],
    expected_outputs: ['documentation.openapi[]', 'interfaces[].openapi'],
    output_keys: ['documentation.openapi', 'interfaces']
  },
  {
    id: 'soap-wsdl-xsd',
    title: 'SOAP / WSDL / XSD extraction',
    description: 'SOAP/WSDL/XSD operations, messages, faults, SOAP actions and envelope examples where present.',
    addressed_by: ['05-openapi-soap-graphql.md', 'LLM-authored contract/drilldown sections'],
    expected_outputs: ['documentation.soap[]', 'interfaces[].soap'],
    output_keys: ['documentation.soap', 'interfaces']
  },
  {
    id: 'technical-view',
    title: 'Technical view',
    description: 'Decision-ready technical view covering APIs, interfaces, contracts, architecture, data stores and integrations.',
    addressed_by: ['01-core-assessment.md', '03-interface-contract-extraction.md', '07-domain-data-integrations.md', '09-architecture-refactoring-roadmap.md', 'LLM-authored technical sections'],
    expected_outputs: ['assessment.technical_view'],
    output_keys: ['assessment.technical_view']
  },
  {
    id: 'mermaid-flows',
    title: 'Flows with Mermaid',
    description: 'Happy paths, failure paths, state changes, side effects and external calls represented with Mermaid source.',
    addressed_by: ['06-flows-mermaid.md', 'LLM-authored flow component blocks'],
    expected_outputs: ['flows[].mermaid', 'documentation.mermaid_flows[]'],
    output_keys: ['flows', 'documentation.mermaid_flows']
  },
  {
    id: 'domain-data-integrations',
    title: 'Domain, data and integrations',
    description: 'Domain entities, data stores, state models, integrations and side effects.',
    addressed_by: ['07-domain-data-integrations.md', 'LLM-authored domain/data/integration sections'],
    expected_outputs: ['domain_model', 'data_model', 'integrations[]', 'side_effects[]'],
    output_keys: ['domain_model', 'data_model', 'integrations', 'side_effects']
  },
  {
    id: 'architecture-assessment',
    title: 'Architecture assessment',
    description: 'Modules, responsibilities, dependencies, external systems, runtime hints and architecture observations.',
    addressed_by: ['09-architecture-refactoring-roadmap.md', 'LLM-authored architecture sections'],
    expected_outputs: ['architecture'],
    output_keys: ['architecture']
  },
  {
    id: 'process-readiness',
    title: 'Process and readiness assessment',
    description: 'Tests, CI/CD, release, observability, configuration, local setup and operational readiness.',
    addressed_by: ['08-process-quality-readiness.md', 'LLM-authored process/readiness sections'],
    expected_outputs: ['process', 'quality'],
    output_keys: ['process', 'quality']
  },
  {
    id: 'quality-risks-findings',
    title: 'Bugs, vulnerabilities and quality findings',
    description: 'Visible bugs, weaknesses, security risks, maintainability, documentation, testability and operability findings.',
    addressed_by: ['08-process-quality-readiness.md', '09-architecture-refactoring-roadmap.md', 'LLM-authored findings/risk sections'],
    expected_outputs: ['findings[]', 'quality.risks[]', 'quality.security[]'],
    output_keys: ['findings', 'quality']
  },
  {
    id: 'structured-decision-basis',
    title: 'Structured decision basis',
    description: 'Structured analysis document that supports decisions with verdicts, trade-offs, risks, recommendations and evidence.',
    addressed_by: ['01-core-assessment.md', '10-report-completeness-review.md', 'LLM-authored decision sections'],
    expected_outputs: ['assessment.decision_basis'],
    output_keys: ['assessment.decision_basis']
  },
  {
    id: 'refactoring-modernization',
    title: 'Refactoring and modernization roadmap',
    description: 'Practical roadmap with benefit, risk, effort, candidate files and evidence.',
    addressed_by: ['09-architecture-refactoring-roadmap.md', 'LLM-authored roadmap sections'],
    expected_outputs: ['refactoring[]', 'modernization[]'],
    output_keys: ['refactoring', 'modernization']
  },
  {
    id: 'target-architecture-tech-stack',
    title: 'Target architecture / new tech stack',
    description: 'Refactoring and modernization route toward a target architecture or new technology stack where justified by evidence.',
    addressed_by: ['09-architecture-refactoring-roadmap.md', 'LLM-authored target-architecture sections'],
    expected_outputs: ['architecture.target_architecture', 'modernization[].target_state'],
    output_keys: ['architecture.target_architecture', 'modernization']
  },
  {
    id: 'tool-alternative-positioning',
    title: 'Tool alternative positioning',
    description: 'Evidence-based positioning as an alternative or complement to consulting/gen-AI delivery suites, structural architecture mapping, static quality/security gates and automated transformation engines, including automation and handoff boundaries.',
    addressed_by: ['01-core-assessment.md', '10-report-completeness-review.md', 'LLM-authored decision sections'],
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
    id: 'portfolio-mode',
    title: 'Portfolio mode',
    description: 'Prepare and render analysis workspaces for many local repositories.',
    addressed_by: ['portfolio command', 'portfolio index'],
    expected_outputs: ['portfolio-analysis/index.html'],
    output_keys: ['tooling.portfolio_mode_available']
  },
  {
    id: 'harness-portability',
    title: 'Harness portability',
    description: 'Skills plus CLI are portable; optional stdio bridge exposes deterministic commands.',
    addressed_by: ['AGENTS.md', 'skills', 'cognianalysis mcp'],
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
      semantic_verdict_authority: 'llm',
      deterministic_contract_scope: 'target capability registration and expected-output hints only; no output-key presence scoring, semantic matching, quality scoring or readiness judgment',
      output_status: 'not_scored',
      output_status_meaning: 'Not scored by the CLI. The row is context for LLM-authored requirements_trace/report_quality_review and must not be read as present, partial, missing or covered.',
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

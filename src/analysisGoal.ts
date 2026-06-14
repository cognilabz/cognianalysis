export function analysisGoalContractArtifact(): any {
  return {
    contract_kind: 'analysis_goal_context',
    deterministic_authority: 'goal_context_only',
    semantic_verdict_authority: 'codex_llm',
    semantic_status_source: [
      'analysis_document.requirements_trace',
      'analysis_document.report_quality_review'
    ],
    purpose: 'Preserve the original product objective as reusable LLM context. This artifact is not a deterministic checklist and does not decide whether a repository report is complete, well documented or management-ready.',
    objective: 'Automated source-code analysis that produces a structured decision basis as an analysis document. The whole report should be authored by an LLM through a stable component/style library, start whole-repository first, then use focused detail agents where useful, and preserve the original requirements.',
    required_output_shape: {
      deliverable: 'structured_decision_basis_analysis_document',
      visible_report_authority: 'analysis_document.authored_report and analysis_document.sections authored by LLM',
      freeform_llm_authored_report: 'The primary visible report is a free-flow LLM-authored assessment narrative; structured components support evidence, APIs, examples, diagrams and auditability but do not define the main reading path.',
      style_system: 'stable publication shell for authored report prose, technical annexes, evidence folding and optional visual explanation artifacts',
      source_basis: 'source code, tests, docs, contracts, examples and configuration',
      automation_goal: 'as automated as possible from source code',
      stakeholder_report_style: 'The visible report reads like a professional assessment for stakeholders; source paths, class names and functions are supporting citations or technical details, not the main narrative structure.',
      clear_reader_categories: 'The visible report uses clear reader-facing categories such as Executive Overview, How It Works, Technical View, Risks, Decision Path and Scope/Method instead of exposing internal analysis-stage names as the primary navigation.',
      consulting_grade_narrative: 'The report explains what the system is, why it matters, how it works, what can go wrong and what decision follows in polished assessment prose.',
      reader_comprehension_review: 'The LLM performs a section-by-section reader-comprehension self-review for readers unfamiliar with the repository.',
      concrete_examples_and_implications: 'Major flows, risks and recommendations include concrete source-derived examples or scenarios plus business/operational implications.',
      jargon_and_domain_terms_explained: 'Domain terms, acronyms, product names and internal system names are explained in context before they are relied on.',
      management_drilldown: 'textual business-need/business-use narrative for management with drilldown to technical and deep technical evidence',
      human_readable_layered_report: 'Visible plain-language explanations for readers who do not already know the repository, followed by technical drilldown and evidence.',
      detailed_textual_explanations: 'LLM-authored explanations of behavior, process, architecture, risk and modernization; not only tables, file lists or labels',
      api_contracts_and_examples: 'Visible API/interface contracts, request/response examples, error/failure modes and source/inferred example origin markers when applicable.',
      architecture_and_process_visuals: 'Visible source-backed architecture/system landscape and process/E2E flow visuals when the repository has meaningful architecture or workflow behavior; use SVG, images, diagrams, timelines, maps or explicit not-applicable rationale instead of forcing Mermaid.',
      report_images_and_diagrams: 'Report-local images, SVGs, diagrams or visual explanation artifacts that help readers understand architecture, process, UI state, data flow, runtime landscape or decision paths without reading source first.',
      whole_file_thesis_trace: 'Visible explanation of how the complete included-file corpus and Tier 1 file cards influenced the report theses, including source-family weighting and explicit gaps when any file-card coverage is missing'
    },
    required_levels: [
      {
        id: 'reverse_engineering_documentation',
        label: 'Reverse Engineering & Documentation',
        intent: 'Derive functionality, business capabilities and user/system flows from source evidence.'
      },
      {
        id: 'code_analysis',
        label: 'Code Analysis',
        intent: 'Identify visible bugs, vulnerabilities, maintainability risks, code quality issues and testability concerns.'
      },
      {
        id: 'process_analysis',
        label: 'Process Analysis',
        intent: 'Derive improvement and optimization potential for delivery, operations, readiness and process quality.'
      },
      {
        id: 'refactoring_target_architecture',
        label: 'Refactoring / Target Architecture',
        intent: 'Describe modernization, refactoring and target architecture or new technology stack options where evidence justifies them; otherwise explicitly explain why no structural refactor/modernization recommendation is applicable.'
      }
    ],
    required_views: [
      {
        id: 'functional_view',
        label: 'Functional View',
        intent: 'Explain what the system does from a business/user/system perspective, including business capabilities, user journeys, workflows, business rules and process logic.'
      },
      {
        id: 'technical_view',
        label: 'Technical View',
        intent: 'Explain APIs, interfaces, contracts, architecture, system landscape, data flows, dependencies, technology stack, data stores and integrations.'
      }
    ],
    required_report_behaviors: [
      {
        id: 'whole_repo_first',
        label: 'Whole repository first',
        intent: 'Build a repository-wide overview and relationship map before deep slices.'
      },
      {
        id: 'tiered_whole_codebase_analysis',
        label: 'Tiered whole-codebase analysis',
        intent: 'Analyze every included file at least at Tier 1 before selecting Tier 2-4 technical drilldown, behavior, risk and modernization/refactoring applicability depth.'
      },
      {
        id: 'whole_file_thesis_trace',
        label: 'Whole-file thesis trace',
        intent: 'Show in the visible report that every included file was accounted for through Tier 1 file cards and explain how those cards influenced the LLM-authored conclusions, source-family map, risks, process analysis and modernization theses.'
      },
      {
        id: 'e2e_relationships',
        label: 'E2E relationships',
        intent: 'Explain how functions, code blocks, modules and systems collaborate through representative whole E2E relationships with source-backed narrative, steps, examples, tables or diagrams chosen by the LLM.'
      },
      {
        id: 'business_process_descriptions',
        label: 'Business process descriptions',
        intent: 'Describe implemented business processes/workflows, trigger-to-outcome logic, decision points, inefficiencies and optimization potential from source evidence.'
      },
      {
        id: 'api_contracts_examples',
        label: 'API contracts and examples',
        intent: 'Show source-derived API/interface contracts, request fields, response fields, examples, errors and payload origin, while keeping the surrounding explanation readable.'
      },
      {
        id: 'visual_explanations',
        label: 'Visual explanations when useful',
        intent: 'Use the clearest source-backed explanatory artifact for the subject: prose, tables, request/response examples, timelines, dependency maps, state diagrams, sequence diagrams, architecture sketches or no diagram when a diagram would mislead.'
      },
      {
        id: 'architecture_pictures',
        label: 'Architecture pictures',
        intent: 'Make architecture/system landscape relationships visible with a source-backed architecture_visual, report_image, SVG, Mermaid, node/edge map or equivalent artifact when architecture is meaningful for the decision.'
      },
      {
        id: 'process_flow_visuals',
        label: 'Process and E2E flow visuals',
        intent: 'Make implemented workflows or representative E2E relationships visible with process_flow_visual, timeline, swimlane, state transition, sequence, SVG/image or equivalent artifact when process analysis is applicable.'
      },
      {
        id: 'llm_authored_report',
        label: 'LLM-authored report',
        intent: 'Let the LLM decide applicability, emphasis, repository-specific report structure and prose while the renderer supplies only publishing, styling, evidence folding and components.'
      },
      {
        id: 'detail_agents_after_overview',
        label: 'Detail agents after overview',
        intent: 'Plan and execute focused source-family/detail reviews only after whole-repository building blocks exist.'
      },
      {
        id: 'tool_positioning',
        label: 'Tool positioning',
        intent: 'Position the analysis as an alternative or complement to consulting/gen-AI suites, architecture mapping, static quality/security gates and automated transformation engines.'
      },
      {
        id: 'evidence_and_uncertainty',
        label: 'Evidence and uncertainty',
        intent: 'Keep claims evidence-backed and show open questions where behavior cannot be proven from source.'
      }
    ],
    llm_trace_guidance: 'The final LLM-authored requirements_trace may use repository-specific wording and additional rows, but it should add goal_contract_refs using required_output_shape.<key>, required_levels.<id>, required_views.<id> and required_report_behaviors.<id> so the LLM explicitly accounts for output shape, management/business readability, levels, views and behaviors with covered|not_applicable|partial|open statuses, evidence, rationale and open questions. Use not_applicable when forcing the requirement would mislead the reader or invent work the source does not justify.'
  };
}

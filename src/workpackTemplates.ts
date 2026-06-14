import { WorkpackDefinition } from './workpackTypes';

export const PLANNER_CONTRACT = {
  schema_version: '2.0',
  shard_kind: 'planner',
  analysis_slices: [
    {
      id: 'string',
      name: 'string',
      reason: 'string',
      priority: 'high|medium|low',
      seed_files: [],
      expected_questions: []
    }
  ],
  suspected_entrypoints: [],
  suspected_contract_sources: [],
  suspected_tests_or_examples: [],
  open_questions: []
};

export const FUNCTIONAL_CONTRACT = {
  schema_version: '2.0',
  shard_kind: 'functional',
  system_purpose: { summary: 'detailed source-derived explanation, not a one-line label', business_need: 'string', business_use: 'string', confidence: 'high|medium|low', evidence: [] },
  actors: [],
  capabilities: [
    {
      id: 'stable-capability-id',
      name: 'business capability name',
      description: 'what the system does for users/business operations',
      business_rules: [],
      source_functions_or_entrypoints: [],
      confidence: 'high|medium|low',
      evidence: []
    }
  ],
  business_processes: [
    {
      id: 'stable-process-id',
      name: 'business process or workflow name',
      trigger: 'how the process starts',
      outcome: 'business/system result',
      steps: [],
      rules_and_decisions: [],
      inefficiencies_or_constraints: [],
      evidence: []
    }
  ],
  business_rules: [
    {
      id: 'stable-rule-id',
      rule: 'source-derived rule in business language',
      enforcement_point: 'file/function/API/job where the rule is enforced',
      evidence: []
    }
  ],
  e2e_flows: [
    {
      id: 'stable-e2e-flow-id',
      title: 'whole E2E flow title',
      narrative: 'multi-paragraph explanation of the source-derived path',
      steps: [],
      visual_explanation: { artifact_type: 'narrative|steps|table|sequenceDiagram|flowchart TD|stateDiagram-v2|classDiagram|erDiagram|svg|none', rationale: 'why this format best explains the flow', source: 'optional Mermaid/SVG/table source', evidence: [] },
      evidence: []
    }
  ],
  flows: [
    {
      name: 'string',
      summary: 'detailed business and technical explanation',
      steps: [],
      visual_explanation: { artifact_type: 'narrative|steps|table|sequenceDiagram|flowchart TD|stateDiagram-v2|svg|none', rationale: 'why this format is sufficient', source: 'optional diagram/table source' },
      confidence: 'high|medium|low',
      evidence: []
    }
  ],
  open_questions: []
};

export const TECHNICAL_CONTRACT = {
  schema_version: '2.0',
  shard_kind: 'technical',
  architecture_summary: { text: 'detailed architecture and system landscape explanation', confidence: 'high|medium|low', evidence: [] },
  entrypoints: [],
  apis_and_interfaces: [],
  request_response_examples: [],
  data_and_state: [],
  data_flows: [],
  integrations: [],
  dependencies: [],
  technology_stack: [],
  deployment_runtime: [],
  technical_risks: [],
  open_questions: []
};

export const QUALITY_SECURITY_CONTRACT = {
  schema_version: '2.0',
  shard_kind: 'quality_security',
  bugs: [],
  vulnerabilities: [],
  code_quality_findings: [],
  test_readiness: { summary: 'string', confidence: 'high|medium|low', evidence: [] },
  scanner_findings_used: [],
  scanner_triage: [
    {
      source_tool: 'semgrep|codeql|sonar|snyk|other',
      scanner_finding_id: 'id from .analysis/scanner-findings.json',
      product_filter_status: 'triage_candidate|filtered_out',
      disposition: 'confirmed|false_positive|needs_review|accepted_risk|not_product_relevant',
      severity: 'critical|high|medium|low|info|unknown',
      product_impact: 'why this does or does not matter for this product and stakeholders',
      recommendation: 'fix, investigate, accept, suppress-at-source, or hand off',
      rationale: 'LLM-authored source-aware triage rationale',
      evidence: []
    }
  ],
  open_questions: []
};

export const PROCESS_CONTRACT = {
  schema_version: '2.0',
  shard_kind: 'process',
  implemented_business_processes: [
    {
      id: 'stable-process-id',
      name: 'implemented business or operational workflow',
      description: 'what the process does and how source code implements it',
      trigger: 'source-derived trigger',
      outcome: 'source-derived outcome',
      steps: [],
      decision_points: [],
      evidence: []
    }
  ],
  process_flows: [
    {
      id: 'stable-process-flow-id',
      title: 'process flow title',
      narrative: 'detailed process description for stakeholders',
      visual_explanation: { artifact_type: 'narrative|steps|table|sequenceDiagram|flowchart TD|stateDiagram-v2|svg|none', rationale: 'why this format fits the process', source: 'optional diagram/table source', evidence: [] },
      steps: [],
      evidence: []
    }
  ],
  workflow_inefficiencies: [],
  optimization_opportunities: [],
  delivery_risks: [],
  test_process: [],
  observability: [],
  documentation_gaps: [],
  process_improvements: [],
  open_questions: []
};

export const MODERNIZATION_APPLICABILITY_CONTRACT = {
  schema_version: '2.0',
  shard_kind: 'modernization_applicability',
  applicability: 'applicable|not_applicable|partial|open',
  decision_rationale: 'Explain whether refactor, migration, replacement, stabilization, preservation, contract hardening or no structural change is justified by source evidence.',
  target_architecture_options: [],
  migration_roadmap: [],
  tech_stack_options: [],
  quick_wins: [],
  risks: [],
  open_questions: []
};

export const EVIDENCE_AUDIT_CONTRACT = {
  schema_version: '2.0',
  shard_kind: 'evidence_audit',
  unsupported_claims: [],
  weakly_supported_claims: [],
  contradictions: [],
  evidence_quality_summary: { overall: 'high|medium|low', reason: 'string' },
  blocking_open_questions: []
};

export const FINAL_REPORT_CONTRACT = {
  schema_version: '2.0',
  analysis_kind: 'cognianalysis_decision_document',
  mode: 'brief|blueprint|deep|complete-audit',
  repo: { name: 'string', commit: 'string', scope_summary: 'string', analyzed_at: 'ISO-8601 string' },
  confidence: { overall: 'high|medium|low', reason: 'string', limitations: [] },
  executive_decision: { summary: 'string', recommended_action: 'string', decision_options: [], top_risks: [], next_steps: [], evidence: [] },
  report_design: {
    audience: ['repository-specific target readers'],
    outline_rationale: 'Why this report shape fits this repository and user goal.',
    section_strategy: 'How the LLM organized the report and why fixed template sections were merged, renamed, omitted or expanded.',
    repository_specific_categories: [],
    omitted_or_merged_standard_sections: [
      { label: 'Optional standard category', decision: 'used|merged|omitted|not_applicable', rationale: 'Why this choice improves reader understanding.' }
    ],
    key_reader_questions: []
  },
  analysis_dimensions: [
    {
      dimension_id: 'repository-specific dimension or core capability id',
      label: 'Reader-facing dimension label',
      status: 'covered|not_applicable|partial|open',
      summary: 'Detailed LLM-authored applicability and coverage explanation.',
      decision_value: 'How this dimension affects stakeholder decisions.',
      covered_by_sections: ['LLM-chosen visible report section id'],
      evidence: []
    }
  ],
  authored_report: {
    style: 'freeform_assessment',
    writing_model: 'LLM-authored prose is the primary report; structured components are technical annexes and evidence support only.',
    sections: [
      {
        id: 'reader-facing-section-id',
        title: 'Section title chosen for this repository',
        kicker: 'Short audience or report-intent label',
        intent: 'Why this section matters.',
        lead: ['Strong opening paragraph in assessment prose.'],
        body: ['Multi-paragraph free-flow explanation of what, why, how, risk, implication and decision.'],
        callouts: [{ title: 'Decision / Risk / Scope / Evidence', tone: 'decision', body: ['Short authored callout.'] }],
        subsections: [{ title: 'Subsection', body: ['Additional explanation.'], bullets: ['Use bullets only when they help.'] }],
        technical_blocks: [{ type: 'api_contracts', title: 'Technical annex', apis: [] }],
        evidence: []
      }
    ]
  },
  legacy_structured_views_note: 'functional_view, technical_view, code_quality_security, process_analysis and refactoring are optional structured annexes. Use them when they clarify or support automation, but do not let them dictate the visible report outline.',
  functional_view: { system_purpose: 'detailed source-derived explanation', system_purpose_evidence: [], actors: [], capabilities: [], business_processes: [], business_rules: [], user_or_system_flows: [], e2e_flows: [] },
  technical_view: { architecture_summary: 'detailed architecture and system landscape explanation', entrypoints: [], apis_and_interfaces: [], request_response_examples: [], data_and_state: [], data_flows: [], integrations: [], dependencies: [], technology_stack: [], deployment_runtime: [], evidence: [] },
  code_quality_security: { bugs: [], vulnerabilities: [], code_quality_findings: [], scanner_findings_imported: [], scanner_triage: [] },
  process_analysis: { test_readiness: 'string', test_readiness_evidence: [], implemented_business_processes: [], process_flows: [], workflow_inefficiencies: [], optimization_opportunities: [], delivery_risks: [], observability: [], documentation_gaps: [], process_improvements: [] },
  refactoring: { applicability: 'applicable|not_applicable|partial|open', decision_rationale: 'string', target_architecture_options: [], migration_roadmap: [], tech_stack_options: [], quick_wins: [] },
  core_capability_coverage: [
    {
      capability_id: 'reverse_engineering_documentation|code_analysis|process_analysis|refactoring_target_architecture',
      label: 'LLM-authored capability label',
      status: 'covered|not_applicable|partial|open',
      summary: 'Detailed explanation of how the report covers this capability from source evidence, or why it is not applicable for this repository.',
      covered_by_sections: ['LLM-chosen visible report section id'],
      thesis_impact: 'How this capability affects the report decision basis, including an explicit no-refactor/no-modernization rationale when that is the right decision.',
      evidence: []
    }
  ],
  whole_file_thesis_trace: {
    included_files: 'number',
    tier1_file_cards: 'number',
    missing_tier1_file_cards: 'number',
    source_tier_tasks: 'complete|partial|missing',
    thesis_impact_summary: 'Detailed text explaining how the complete file-card base influenced visible theses, source-family weighting, confidence and evidence gaps.',
    source_family_impacts: [
      { source_family: 'path or module family', file_count: 'number', thesis_impact: 'how this family affected functional, technical, process, risk or modernization conclusions', evidence: [] }
    ],
    covered_by_sections: ['LLM-chosen visible report section id'],
    evidence: []
  },
  whole_repository_file_accounting: {
    included_files: 'number',
    tier1_file_cards: 'number',
    missing_tier1_file_cards: 'number',
    source_tier_tasks: 'complete/partial/missing',
    thesis_impact_summary: 'text explaining how the complete file-card base influenced visible theses',
    source_family_impacts: [
      { source_family: 'path or module family', file_count: 'number', thesis_impact: 'how this family affected functional, technical, process, risk or modernization conclusions', evidence: [] }
    ],
    evidence: []
  },
  report_sections: [
    {
      id: 'LLM-chosen stable section id',
      title: 'Repository-specific stakeholder report section title',
      level: 'decision|functional|technical|process|risk|modernization|evidence_governance',
      intent: 'Why this section exists for this repository.',
      blocks: [
        { type: 'layered_explanation', title: 'Plain-Language Explanation With Technical Drilldown', plain_language: 'what a human reader should understand first', technical_detail: 'source-backed implementation detail' },
        { type: 'capability_coverage', title: 'Core Capability Coverage', capabilities: [] },
        { type: 'source_coverage_trace', title: 'Whole-File Thesis Trace', source_family_impacts: [] },
        { type: 'api_contracts', title: 'API And Interface Contracts', apis: [] },
        { type: 'request_response_examples', title: 'Request/Response Examples', examples: [] }
      ]
    }
  ],
  open_questions: [],
  evidence_index: [],
  report_quality_review: {
    verdict: 'decision_ready|partial|not_ready',
    rationale: 'string',
    strengths: [],
    limitations: [],
    blocking_gaps: [],
    recommended_followups: [],
    confidence: 'high|medium|low',
    checks: {
      stakeholder_report_style: 'covered|not_applicable|partial|open',
      clear_reader_categories: 'covered|not_applicable|partial|open',
      freeform_llm_authored_report: 'covered|not_applicable|partial|open',
      consulting_grade_narrative: 'covered|not_applicable|partial|open',
      reader_comprehension_review: 'covered|not_applicable|partial|open',
      concrete_examples_and_implications: 'covered|not_applicable|partial|open',
      jargon_and_domain_terms_explained: 'covered|not_applicable|partial|open',
      human_readable_layered_report: 'covered|not_applicable|partial|open',
      detailed_textual_explanations: 'covered|not_applicable|partial|open',
      e2e_relationships_explained: 'covered|not_applicable|partial|open',
      business_processes_explained: 'covered|not_applicable|partial|open',
      api_contracts_and_examples_visible: 'covered|not_applicable|partial|open',
      scanner_feed_triage_when_present: 'covered|not_applicable|partial|open',
      technical_drilldown_visible: 'covered|not_applicable|partial|open',
      visual_explanations_fit_purpose: 'covered|not_applicable|partial|open',
      architecture_visuals_visible: 'covered|not_applicable|partial|open',
      process_flow_visuals_visible: 'covered|not_applicable|partial|open',
      four_layers_explained: 'covered|not_applicable|partial|open',
      functional_and_technical_views_explained: 'covered|not_applicable|partial|open',
      core_capability_coverage_model: 'covered|not_applicable|partial|open',
      whole_file_coverage_reflected: 'covered|not_applicable|partial|open'
    },
    dimension_checks: [
      {
        id: 'repository-specific quality or applicability dimension',
        label: 'Reader-facing review dimension',
        status: 'covered|not_applicable|partial|open',
        rationale: 'Why the final report satisfies, omits or still leaves this dimension open.',
        affected_sections: ['visible section id'],
        evidence: []
      }
    ],
    reader_comprehension_review: [
      {
        section_id: 'visible section id',
        reader_question: 'What would a reader unfamiliar with the repository need to understand here?',
        verdict: 'clear|partial|unclear',
        reason: 'Why this section is or is not understandable.',
        improvement_made: 'How the final wording was improved, or why no rewrite was needed.'
      }
    ],
    evidence: []
  }
};

export function workpackMarkdown(def: WorkpackDefinition, mode: string, goal: string): string {
  return `# ${def.title}

## Goal

${def.goal}

Product mode: \`${mode}\`. User goal: ${goal ? `\`${goal}\`` : 'not specified'}.

## Inputs

Read these deterministic inputs as navigation and context only:

${def.read_only_inputs.map(input => `- \`${input}\``).join('\n')}

Open source files directly before making semantic claims.
${def.id === '90-final-report' ? '\nFor final synthesis, read `.analysis/synthesis-input.json` as a mechanical merge input. It is not final prose and must not replace LLM-authored judgement.\n' : ''}

## Output Path

Write exactly one output file:

\`\`\`text
${def.output_path}
\`\`\`

Do not edit another workpack's output.

## JSON Contract

\`\`\`json
${JSON.stringify(def.contract, null, 2)}
\`\`\`

## Analysis Depth Bar

- Write source-derived explanations for humans, not only labels or inventories. Prefer a few rich paragraphs with evidence over many shallow bullets.
- The visible report should read like a professional assessment document, not a source-code index. Use business/process/system nouns in section titles and paragraph leads. Put file paths, class names, methods and framework internals in evidence, technical drilldown, API details or expandable proof unless the identifier itself is the business-facing interface.
- Choose reader-facing categories from the repository story and user goal. Standard labels such as \`Executive Overview\`, \`How It Works\`, \`Technical View\`, \`Risks\`, \`Decision Path\` and \`Scope, Method & Evidence\` are examples, not a template. Rename, merge, split or omit them when another structure is clearer, and explain that choice in \`report_design\`.
- Write each major section so a reader can answer, without already knowing the codebase: what is this, why does it exist, who or what depends on it, how does the relevant relationship work, what can go wrong, and what decision follows.
- Use a \`claim -> explanation -> concrete source-derived example -> implication -> evidence\` pattern. Avoid flat statements such as "module X handles Y" unless the next sentence explains why Y matters and what changes because of it.
- Explain acronyms, product names and internal nouns on first use. If a term such as MSO, SLAPI, ESB, Genesys, Watson or Kafka is repository-specific or domain-specific, describe its role in plain language before relying on it.
- Use concrete examples before abstractions: a sample conversation turn, a representative request/response, a failure scenario, a deployment path or a realistic modernization step. Mark inferred examples with \`example_origin: "inferred"\`.
- Use the repo-report-builder report style as the communication bar: executive overview, how it works, technical view, severity-rated risks/remediation, decision path and repository/source-family dossiers when useful. The exact outline remains LLM-owned and product-specific.
- If \`.analysis/scanner-findings.json\` contains Semgrep, CodeQL, Sonar, Snyk or other scanner imports, treat them as external evidence feeds. Use \`triage_findings[]\` as the product-prioritized work queue, keep \`filtered_out_findings[]\` visible as omitted-from-triage, and let the LLM decide confirmed/false-positive/needs-review/product-impact with source evidence. Do not make Cognianalysis the scanner authority.
- The final LLM self-review must include \`report_quality_review.reader_comprehension_review[]\` and honestly judge whether each main section is understandable to a reader unfamiliar with the repository.
- The renderer is only a publication shell. Do not expect JavaScript, templates or fixed components to invent the report. The LLM-authored \`analysis_document.authored_report.sections[]\` is the primary visible report and must contain the actual free-flow explanation, conclusions, examples and interpretation. \`analysis_document.sections[].blocks[]\` should support that prose with technical annexes, evidence, APIs, examples, diagrams and coverage.
- A final report is not decision-ready if a human reader who does not already know the repository cannot understand the repository-specific purpose, operating model, risk meaning and decision path from visible prose. Use layered explanation only when it helps; equivalent free-flow prose, examples, tables or custom static HTML are valid.
- Assess the four core layers with LLM judgment: reverse engineering/documentation, code analysis, process analysis, and refactoring/modernization applicability. These layers are decision lenses, not forced report chapters. If a layer is not meaningful for this repository or decision, mark it \`not_applicable\` with source-backed rationale instead of fabricating content.
- The LLM owns the final report outline. Do not force fixed section IDs or fixed view names. Author \`report_design\`, \`analysis_dimensions[]\`, \`core_capability_coverage[]\` and \`whole_file_thesis_trace\`, then make the important parts visible through authored prose or component blocks inside LLM-chosen sections. A capability row may be \`covered\`, \`not_applicable\`, \`partial\` or \`open\`; \`not_applicable\` must explain why the category would mislead the reader.
- For complete-audit reports, reconcile \`.analysis/data/source-inventory.json\` included files against \`.analysis/source_tiers/*.json\` Tier 1 file cards. State included count, card count, missing count, task completion, and how source-family file cards influenced the visible theses.
- Do not claim every file is direct evidence for every headline. Explain how the whole file-card corpus influenced source-family weighting, confidence and thesis selection, then cite specific file:line evidence for each concrete behavior, risk, process or modernization claim.
- Functional understanding must be visible when the repository implements functional/business/user/system behavior: what the system does, capabilities, journeys/workflows, rules and process logic. If the repository is a library, infra package, generated artifact set or otherwise not process-oriented, explain the applicable functional analogue instead of forcing business-process language.
- Technical understanding must be visible in the form that fits the repository: architecture/system landscape, APIs/interfaces/integrations, data flows/dependencies, technology stack, implementation details, build/runtime model or a clear no-interface/no-runtime rationale.
- Include visible API/interface contracts and request/response examples wherever the source exposes DTOs, controllers, schemas, tests, docs, OpenAPI/Swagger, SOAP/WSDL/XSD, event schemas or defensibly inferred payload shapes. If no such interface exists, mark that dimension \`not_applicable\` with evidence. Inferred examples must set \`example_origin: "inferred"\`.
- The visible report should use the clearest explanation artifact for each important relationship: prose, steps, tables, request/response examples, timelines, architecture sketches, Mermaid, SVG or no diagram. Do not force a continuous flow or diagram when the repository is better explained through another form.
- When architecture matters, include a visible \`architecture_visual\`, \`report_image\`, SVG/image, node/edge map, bounded-context map or equivalent system-landscape artifact. The LLM chooses the shape; the renderer must not be expected to invent the architecture picture from file names.
- When process or E2E behavior matters, include a visible \`process_flow_visual\`, timeline, swimlane, state transition, sequence, SVG/image or equivalent process picture with trigger, actors, decisions, state/data changes, integrations, outputs and failure paths where the source proves them. Do not force one continuous flow if several independent workflows or lifecycle phases are clearer.
- Use local report images or inline SVGs when they make the report easier to understand. These visuals must explain source-backed relationships and include alt/caption or evidence context; decorative images do not satisfy visual depth.
- Representative E2E relationships should connect trigger, actors, entrypoints, decisions, state changes, integrations, outputs, failure/timeout paths and operational side effects when the source proves them. If the repository is better explained as contracts, lifecycle phases, states, modules or data transformations, choose that structure and state why.
- Process analysis must describe implemented business or operational workflows and improvement opportunities when they exist; otherwise explain the source-backed reason this repository has no meaningful process layer rather than inventing workflow content.
- Refactoring/modernization must never be forced. Recommend refactor, migration, replacement, stabilization, preservation, contract hardening or no structural change according to source evidence and stakeholder decision value.
- Final reports should read like structured decision-support documentation for stakeholders, with technical drilldown underneath the business explanation.
- Set \`report_quality_review.verdict\` to \`decision_ready\` only when the report's own \`dimension_checks[]\`, core-capability applicability model and reader-comprehension review show that every applicable repository-specific dimension is covered and every omitted standard dimension has a source-backed not-applicable rationale. Use \`partial\` or \`not_ready\` when any applicable dimension remains incomplete.
- Set \`report_quality_review.checks.stakeholder_report_style\` to \`covered\` only when the main reading path is understandable as a stakeholder report and code identifiers/file lists are supporting citations or technical details rather than the dominant visible content.
- Set \`report_quality_review.checks.clear_reader_categories\` to \`covered\` only when the report navigation and section introductions are clear to a reader who does not know the codebase.
- Set \`report_quality_review.checks.freeform_llm_authored_report\` to \`covered\` only when the main reading path is genuinely free-flow LLM assessment prose, not a component checklist or renderer-generated catalogue.
- Set \`report_quality_review.checks.consulting_grade_narrative\` to \`covered\` only when the prose has a clear assessment voice: it explains meaning, consequences and decisions, not just implementation facts.
- Set \`report_quality_review.checks.reader_comprehension_review\` to \`covered\` only when \`reader_comprehension_review[]\` exists and every main section is judged \`clear\` or has an explicit improvement/follow-up.
- Set \`report_quality_review.checks.concrete_examples_and_implications\` to \`covered\` only when the report uses concrete scenarios/examples and states business or operational implications.
- Set \`report_quality_review.checks.jargon_and_domain_terms_explained\` to \`covered\` only when domain terms and acronyms are defined in context instead of assumed.
- Done means \`report_quality_review.verdict: "decision_ready"\` with no blocking gaps and no blocking open questions. A \`partial\` verdict may still be useful analysis, but Cognianalysis must not present it as report-ready.
- If Mermaid is the chosen artifact, use valid conservative syntax. Prefer short participant/node IDs without punctuation, put long labels in messages or quoted node labels, and keep the source small enough to render. If a diagram is inferred, mark the surrounding explanation with confidence and evidence. If Mermaid is not the clearest artifact, do not create one only to satisfy the template.

## Evidence Rules

- Every major claim needs relative file:line evidence or an explicit \`evidence_gap\`.
- Inventory and navigation scores are not proof of behavior, architecture, APIs, business logic or quality.
- Suspected entrypoints, contracts and tests are navigation hypotheses until verified from source.
- Use \`open_questions[]\` when behavior cannot be proven.

## Open Questions Rules

Each open question should include \`id\`, \`question\`, \`reason\`, \`impact\`, \`blocking\` and evidence or an explicit evidence gap.

## Non-goals

${def.non_goals.map(item => `- ${item}`).join('\n')}
`;
}

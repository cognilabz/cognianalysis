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
      mermaid: { diagram_type: 'sequenceDiagram|flowchart TD|stateDiagram-v2', source: 'string', evidence: [] },
      evidence: []
    }
  ],
  flows: [
    {
      name: 'string',
      summary: 'detailed business and technical explanation',
      steps: [],
      mermaid: { diagram_type: 'sequenceDiagram|flowchart TD|stateDiagram-v2', source: 'string' },
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
      mermaid: { diagram_type: 'flowchart TD|sequenceDiagram|stateDiagram-v2', source: 'string', evidence: [] },
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

export const REFACTORING_CONTRACT = {
  schema_version: '2.0',
  shard_kind: 'refactoring',
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
  functional_view: { system_purpose: 'detailed source-derived explanation', actors: [], capabilities: [], business_processes: [], business_rules: [], user_or_system_flows: [], e2e_flows: [] },
  technical_view: { architecture_summary: 'detailed architecture and system landscape explanation', entrypoints: [], apis_and_interfaces: [], data_and_state: [], data_flows: [], integrations: [], dependencies: [], technology_stack: [], deployment_runtime: [], evidence: [] },
  code_quality_security: { bugs: [], vulnerabilities: [], code_quality_findings: [], scanner_findings_imported: [] },
  process_analysis: { test_readiness: 'string', implemented_business_processes: [], process_flows: [], workflow_inefficiencies: [], optimization_opportunities: [], delivery_risks: [], observability: [], documentation_gaps: [], process_improvements: [] },
  refactoring: { target_architecture_options: [], migration_roadmap: [], tech_stack_options: [], quick_wins: [] },
  core_capability_coverage: [
    {
      capability_id: 'reverse_engineering_documentation|code_analysis|process_analysis|refactoring_target_architecture',
      label: 'LLM-authored capability label',
      status: 'covered|partial|open',
      summary: 'Detailed explanation of how the report covers this capability from source evidence.',
      covered_by_sections: ['LLM-chosen visible report section id'],
      thesis_impact: 'How this capability affects the report decision basis.',
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
      title: 'Repository-specific section title',
      level: 'decision|functional|technical|process|risk|modernization|evidence_governance',
      intent: 'Why this section exists for this repository.',
      blocks: [
        { type: 'capability_coverage', title: 'Core Capability Coverage', capabilities: [] },
        { type: 'source_coverage_trace', title: 'Whole-File Thesis Trace', source_family_impacts: [] }
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
      detailed_textual_explanations: 'covered|partial|open',
      whole_e2e_flow_explained: 'covered|partial|open',
      business_processes_explained: 'covered|partial|open',
      four_layers_explained: 'covered|partial|open',
      functional_and_technical_views_explained: 'covered|partial|open',
      core_capability_coverage_model: 'covered|partial|open',
      whole_file_coverage_reflected: 'covered|partial|open'
    },
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
- Explain the four core layers when they apply: reverse engineering/documentation, code analysis, process analysis, and refactoring/modernization.
- The LLM owns the final report outline. Do not force fixed section IDs. Instead author \`core_capability_coverage[]\` for all four core capabilities and \`whole_file_thesis_trace\`, then make both visible through \`capability_coverage\`, \`source_coverage_trace\` or equally explicit component blocks inside LLM-chosen sections.
- For complete-audit reports, reconcile \`.analysis/data/source-inventory.json\` included files against \`.analysis/source_tiers/*.json\` Tier 1 file cards. State included count, card count, missing count, task completion, and how source-family file cards influenced the visible theses.
- Do not claim every file is direct evidence for every headline. Explain how the whole file-card corpus influenced source-family weighting, confidence and thesis selection, then cite specific file:line evidence for each concrete behavior, risk, process or modernization claim.
- Functional output must cover what the system does, business capabilities, user journeys/workflows, business rules and process logic.
- Technical output must cover architecture/system landscape, APIs/interfaces/integrations, data flows/dependencies, technology stack and implementation details.
- At least one representative E2E flow should connect trigger, actors, entrypoints, business rules, state changes, integrations, outputs, failure/timeout paths and operational side effects. If the source does not prove a full E2E flow, state the proof gap explicitly.
- Process analysis must describe implemented workflows and improvement opportunities, not only CI/test readiness.
- Final reports should read like structured decision-support documentation for stakeholders, with technical drilldown underneath the business explanation.
- Set \`report_quality_review.verdict\` to \`decision_ready\` only when the depth checks for detailed textual explanations, whole E2E flow, business processes, four layers, functional/technical views, the explicit core-capability coverage model and whole-file coverage reflection are honestly \`covered\`. Use \`partial\` or \`not_ready\` when any of those remain incomplete.
- Done means \`report_quality_review.verdict: "decision_ready"\` with no blocking gaps and no blocking open questions. A \`partial\` verdict may still be useful analysis, but Cognianalysis must not present it as report-ready.
- Mermaid must use valid conservative syntax. Prefer short participant/node IDs without punctuation, put long labels in messages or quoted node labels, and keep the source small enough to render. If a diagram is inferred, mark the surrounding explanation with confidence and evidence.

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

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
  system_purpose: { summary: 'string', confidence: 'high|medium|low', evidence: [] },
  actors: [],
  capabilities: [],
  flows: [
    {
      name: 'string',
      summary: 'string',
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
  architecture_summary: { text: 'string', confidence: 'high|medium|low', evidence: [] },
  entrypoints: [],
  apis_and_interfaces: [],
  data_and_state: [],
  integrations: [],
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
  functional_view: { system_purpose: 'string', actors: [], capabilities: [], user_or_system_flows: [] },
  technical_view: { architecture_summary: 'string', entrypoints: [], apis_and_interfaces: [], data_and_state: [], integrations: [], deployment_runtime: [], evidence: [] },
  code_quality_security: { bugs: [], vulnerabilities: [], code_quality_findings: [], scanner_findings_imported: [] },
  process_analysis: { test_readiness: 'string', delivery_risks: [], observability: [], documentation_gaps: [], process_improvements: [] },
  refactoring: { target_architecture_options: [], migration_roadmap: [], tech_stack_options: [], quick_wins: [] },
  report_sections: [],
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

import { FS, Path, cleanId, ensureDir, loadJson, writeJson, writeText } from './utils';
import { WorkpackDefinition, WorkpackManifestV2, WorkpackMode } from './workpackTypes';
import {
  EVIDENCE_AUDIT_CONTRACT,
  FINAL_REPORT_CONTRACT,
  FUNCTIONAL_CONTRACT,
  PLANNER_CONTRACT,
  PROCESS_CONTRACT,
  QUALITY_SECURITY_CONTRACT,
  REFACTORING_CONTRACT,
  TECHNICAL_CONTRACT,
  workpackMarkdown
} from './workpackTemplates';

function def(id: string, title: string, output: string, goal: string, contract: any, depends_on: string[] = ['00-planner'], required = true): WorkpackDefinition {
  return {
    id,
    title,
    output_path: output,
    required,
    can_run_parallel: !['00-planner', '80-evidence-audit', '90-final-report'].includes(id),
    depends_on,
    read_only_inputs: [
      '.analysis/inventory.json',
      '.analysis/run.json',
      '.analysis/workpack-manifest.json',
      ...(depends_on.includes('00-planner') ? ['.analysis/shards/planner.json'] : [])
    ],
    write_locks: [output],
    goal,
    contract,
    non_goals: [
      'Do not call a direct LLM API.',
      'Do not modify production source files.',
      'Do not use deterministic filename/path/import regex as semantic proof.',
      'Do not write final synthesis prose unless this is the final-report workpack.'
    ]
  };
}

function withDependencyInputs(workpacks: WorkpackDefinition[]): WorkpackDefinition[] {
  const outputs = new Map(workpacks.map(item => [item.id, item.output_path]));
  return workpacks.map(item => {
    const dependencyInputs = item.depends_on
      .map(id => outputs.get(id))
      .filter((path): path is string => !!path);
    const finalReportInputs = item.id === '90-final-report' ? ['.analysis/synthesis-input.json'] : [];
    return {
      ...item,
      read_only_inputs: [...new Set([...item.read_only_inputs, ...dependencyInputs, ...finalReportInputs])]
    };
  });
}

function allBlueprintWorkpacks(): WorkpackDefinition[] {
  const workpacks = [
    def('00-planner', 'Planner', '.analysis/shards/planner.json', 'Understand the repository landscape, define analysis slices and prioritize source files without writing final findings.', PLANNER_CONTRACT, [], true),
    def('10-functional', 'Functional Reverse Engineering', '.analysis/shards/functional.json', 'Extract system purpose, actors, capabilities and user/system flows from source evidence.', FUNCTIONAL_CONTRACT),
    def('20-technical', 'Technical Architecture and Interfaces', '.analysis/shards/technical.json', 'Extract architecture, entrypoints, APIs/interfaces, data/state, integrations and runtime evidence.', TECHNICAL_CONTRACT),
    def('30-quality-security', 'Quality and Security Review', '.analysis/shards/quality-security.json', 'Identify bugs, vulnerabilities, quality findings, test readiness and imported scanner findings without rebuilding scanners.', QUALITY_SECURITY_CONTRACT),
    def('40-process', 'Process Analysis', '.analysis/shards/process.json', 'Assess delivery, testing, observability, documentation and process improvement opportunities.', PROCESS_CONTRACT),
    def('50-refactoring', 'Refactoring and Target Architecture', '.analysis/shards/refactoring.json', 'Propose refactoring options, target architecture, migration roadmap, stack options and quick wins.', REFACTORING_CONTRACT),
    def('80-evidence-audit', 'Evidence Audit', '.analysis/shards/evidence-audit.json', 'Review shard claims, mark unsupported or weakly supported claims, contradictions and blocking open questions without replacing semantic judgement.', EVIDENCE_AUDIT_CONTRACT, ['10-functional', '20-technical', '30-quality-security', '40-process', '50-refactoring'], true),
    def('90-final-report', 'Final Analysis Report', '.analysis/analysis.json', 'Synthesize shards into the single LLM-authored analysis.json decision document covering reverse engineering, code analysis, process analysis and refactoring/target architecture.', FINAL_REPORT_CONTRACT, ['80-evidence-audit'], true)
  ];
  return workpacks.map(item => item.id === '30-quality-security'
    ? { ...item, read_only_inputs: [...item.read_only_inputs, '.analysis/scanner-findings.json'] }
    : item);
}

function modeWorkpacks(mode: WorkpackMode): WorkpackDefinition[] {
  const all = allBlueprintWorkpacks();
  if (mode === 'brief') {
    const selected = all
      .filter(item => ['00-planner', '10-functional', '80-evidence-audit', '90-final-report'].includes(item.id))
      .map(item => item.id === '80-evidence-audit'
        ? { ...item, depends_on: ['10-functional'] }
        : item);
    return withDependencyInputs(selected);
  }
  if (mode === 'deep') return withDependencyInputs(all.map(item => item.id === '20-technical'
    ? { ...item, title: 'Targeted Technical Deep Review', goal: 'Focus deeply on the requested goal, flow, module, API, risk or decision while preserving evidence and open questions.' }
    : item));
  return withDependencyInputs(all);
}

function normalizeMode(value: any): WorkpackMode {
  const mode = String(value || 'blueprint').toLowerCase();
  if (mode === 'deep-dive') return 'deep';
  if (mode === 'complete') return 'complete-audit';
  if (mode === 'brief' || mode === 'blueprint' || mode === 'deep' || mode === 'complete-audit') return mode;
  return 'blueprint';
}

function taskGuide(workpacks: WorkpackDefinition[], mode: WorkpackMode, goal: string): string {
  const parallel = workpacks.filter(item => item.can_run_parallel);
  return `# Cognianalysis Task

The CLI prepared deterministic inventory and harness-native workpacks. The active agent harness / LLM is the semantic executor.

## Product Request

- Mode: \`${mode}\`
- Goal: ${goal ? `\`${goal}\`` : 'not specified'}

## Product Loop

1. Read \`.analysis/inventory.json\` and \`.analysis/workpack-manifest.json\`.
2. Execute \`.analysis/workpacks/00-planner.md\` first.
3. Execute independent shard workpacks in parallel when possible.
4. Execute \`.analysis/workpacks/80-evidence-audit.md\`.
5. Execute \`.analysis/workpacks/90-final-report.md\` and write \`.analysis/analysis.json\`.
6. Rerun \`cognianalysis analyze .\`, then \`cognianalysis open .\` and \`cognianalysis eval .\`.

## Parallel Execution

After 00-planner is complete, these workpacks can run in parallel:

${parallel.map(item => `- ${item.id} -> \`${item.output_path}\``).join('\n') || '- No parallel workpacks for this mode.'}

Each workpack writes exactly one shard file. Do not edit another workpack's output.

## Workpacks

${workpacks.map(item => `- \`${item.id}\` ${item.required ? '(required)' : '(optional)'}: \`.analysis/workpacks/${item.id}.md\` -> \`${item.output_path}\``).join('\n')}

## Rules

- Do not treat inventory as semantic truth.
- Open source files directly before making claims.
- Every major claim needs file:line evidence or an explicit evidence_gap/open question.
- Do not modify production source files unless explicitly requested.
- Do not call a direct LLM API.
`;
}

export function writeWorkpacks(analysisDir: string): WorkpackDefinition[] {
  const dataDir = Path.join(analysisDir, 'data');
  const request = loadJson<any | null>(Path.join(dataDir, 'product-analysis-request.json'), null);
  const mode = normalizeMode(request?.mode);
  const goal = String(request?.goal || '').trim();
  const workpacks = modeWorkpacks(mode);
  const workpackDir = Path.join(analysisDir, 'workpacks');
  const shardsDir = Path.join(analysisDir, 'shards');
  ensureDir(workpackDir);
  ensureDir(shardsDir);
  for (const file of FS.readdirSync(workpackDir).filter((name: string) => name.endsWith('.md'))) FS.unlinkSync(Path.join(workpackDir, file));
  for (const item of workpacks) writeText(Path.join(workpackDir, `${cleanId(item.id)}.md`), workpackMarkdown(item, mode, goal));
  const manifest: WorkpackManifestV2 = {
    schema_version: '2.0',
    workpack_model: 'parallel_llm_shards',
    mode,
    semantic_authority: 'active_agent_harness_llm',
    deterministic_authority: 'task_generation_only',
    merge_order: ['planner', 'functional', 'technical', 'quality-security', 'process', 'refactoring', 'evidence-audit', 'final-report'],
    workpacks
  };
  writeJson(Path.join(analysisDir, 'workpack-manifest.json'), manifest);
  writeText(Path.join(analysisDir, 'TASK.md'), taskGuide(workpacks, mode, goal));
  return workpacks;
}

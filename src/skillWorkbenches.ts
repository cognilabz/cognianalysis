import { FS, Path, asList, cleanId, ensureDir, writeJson, writeText } from './utils';

export const SKILL_WORKBENCH_VERSION = 'skill-workbench-v1';

function directStrategy(strategyDoc: any): any {
  return strategyDoc?.analysis_strategy && typeof strategyDoc.analysis_strategy === 'object' && !Array.isArray(strategyDoc.analysis_strategy)
    ? strategyDoc.analysis_strategy
    : strategyDoc;
}

function plannedSkillRows(strategyDoc: any): any[] {
  const strategy = directStrategy(strategyDoc);
  return asList(strategy?.skill_application_plan || strategy?.skills || strategy?.planned_skill_workbenches);
}

function taskIdFor(row: any, index: number): string {
  const raw = row?.id || row?.task_id || row?.skill_workbench_id || row?.skill_id || row?.name || `skill-workbench-${index + 1}`;
  const id = cleanId(String(raw));
  return id === 'item' ? `skill-workbench-${index + 1}` : id;
}

export function writeSkillWorkbenchTasksFromLlmStrategy(analysisDir: string, strategyDoc: any): any {
  const tasksDir = Path.join(analysisDir, 'skill_workbench_tasks');
  const reviewsDir = Path.join(analysisDir, 'skill_reviews');
  ensureDir(tasksDir);
  ensureDir(reviewsDir);
  for (const file of FS.readdirSync(tasksDir).filter((name: string) => name.endsWith('.md'))) {
    FS.unlinkSync(Path.join(tasksDir, file));
  }

  const rows = plannedSkillRows(strategyDoc);
  const seen = new Set<string>();
  const tasks = rows.map((row: any, index: number) => {
    let id = taskIdFor(row, index);
    while (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    const filename = `${String(index + 1).padStart(3, '0')}-${id}.md`;
    const output = `skill_reviews/${id}.json`;
    const task = {
      id,
      skill_id: row?.skill_id || row?.id || row?.name || id,
      purpose: row?.purpose || row?.why_it_matters || '',
      scope: row?.scope || row?.source_scope || '',
      focus: row?.focus || row?.expected_outputs || [],
      evidence: asList(row?.evidence || row?.initial_evidence),
      task_file: `skill_workbench_tasks/${filename}`,
      expected_output: output,
      status: 'pending'
    };
    writeText(Path.join(tasksDir, filename), skillWorkbenchTaskBody(task, row));
    return task;
  });

  const manifest = {
    mode: 'llm_strategy_skill_workbenches',
    version: SKILL_WORKBENCH_VERSION,
    semantic_authority: 'codex_llm',
    deterministic_authority: 'task_materialization_from_analysis_strategy_only',
    planning_source: 'llm/analysis-strategy.json',
    summary: tasks.length
      ? 'These skill workbench tasks were mechanically materialized from analysis_strategy.skill_application_plan[]. Execute them before detail-agent planning and final report synthesis.'
      : 'No skill workbench tasks were materialized because the Codex-authored LLM analysis strategy did not plan skill_application_plan[] entries.',
    tasks
  };
  writeJson(Path.join(analysisDir, 'skill-workbench-task-manifest.json'), manifest);
  writeJson(Path.join(analysisDir, 'data', 'skill-workbench-task-manifest.json'), manifest);
  return manifest;
}

function skillWorkbenchTaskBody(task: any, originalRow: any): string {
  return `# LLM-Planned Skill Workbench · ${task.skill_id}

You are executing a skill workbench that was planned by the Codex-authored LLM repository analysis strategy.

This task is not selected by filename, regex, path convention or a fixed report menu. It exists only because \`.analysis/llm/analysis-strategy.json\` decided this skill matters for the current repository.

## Read First

- \`.analysis/llm_instructions.md\`
- \`.analysis/llm/analysis-strategy.json\`
- \`.analysis/data/analysis-skill-catalog.json\`
- \`.analysis/data/source-inventory.json\`
- all completed \`.analysis/source_tiers/*.json\` outputs
- existing \`.analysis/llm/*.json\` building-block outputs when present
- source files, tests, docs, contracts, schemas and configuration needed for this skill

Use Tier 1 cards to avoid blind spots, but do not treat them as proof for deep claims. Open source files directly for evidence.

## Planned Skill Workbench

\`\`\`json
${JSON.stringify({ materialized_task: task, planned_by_strategy: originalRow }, null, 2)}
\`\`\`

## Write Output

Write valid JSON to \`.analysis/${task.expected_output}\`.

Expected JSON:

\`\`\`json
{
  "skill_workbench_review": {
    "id": "${task.id}",
    "skill_id": "${task.skill_id}",
    "version": "${SKILL_WORKBENCH_VERSION}",
    "review_status": "complete",
    "summary": "Repository-specific semantic extraction result for this planned skill.",
    "scope": "What source, Tier 1 cards and previous outputs were inspected.",
    "findings": [
      {"title":"Repository-specific finding, capability, flow, contract, rule, risk or decision input.", "description":"...", "evidence":[]}
    ],
    "outputs_for_later_synthesis": [
      {"kind":"Repository-specific output kind.", "description":"How final/detail synthesis should use this result.", "evidence":[]}
    ],
    "confidence": "Repository-specific confidence statement.",
    "open_questions": [
      {"question":"...", "why_it_matters":"...", "owner":"Repository-specific owner or unknown.", "evidence":[]}
    ],
    "evidence": []
  },
  "analysis_coverage": {
    "summary": "Which files and existing outputs were inspected for this skill workbench.",
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
- Do not use filename, regex or word-match hints as proof of behavior.
- Do not produce final management conclusions here. Produce reusable semantic workbench outputs for detail-agent planning and final report synthesis.
- Codex is the LLM executor for this workbench. Do not call a direct LLM API. Codex must complete the review and put uncertainty in limitations or open questions.
- Do not model this as an LLM unavailable state. Weak source proof becomes explicit uncertainty, not an external service result.
- If the planned skill turns out not to matter or evidence is thin, set \`review_status\` to \`complete\`, explain the limitation, and provide evidence or open questions.
`;
}

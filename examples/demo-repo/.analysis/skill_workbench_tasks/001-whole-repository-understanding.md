# LLM-Planned Skill Workbench · whole_repository_understanding

You are executing a skill workbench that was planned by the Codex-authored LLM repository analysis strategy.

This task is not selected by filename, regex, path convention or a fixed report menu. It exists only because `.analysis/llm/analysis-strategy.json` decided this skill matters for the current repository.

## Read First

- `.analysis/llm_instructions.md`
- `.analysis/llm/analysis-strategy.json`
- `.analysis/data/analysis-skill-catalog.json`
- `.analysis/data/source-inventory.json`
- all completed `.analysis/source_tiers/*.json` outputs
- existing `.analysis/llm/*.json` building-block outputs when present
- source files, tests, docs, contracts, schemas and configuration needed for this skill

Use Tier 1 cards to avoid blind spots, but do not treat them as proof for deep claims. Open source files directly for evidence.

## Planned Skill Workbench

```json
{
  "materialized_task": {
    "id": "whole-repository-understanding",
    "skill_id": "whole_repository_understanding",
    "purpose": "Build the complete onboarding-system story before presenting the runtime flow as the central example.",
    "scope": "Runtime source, contracts, examples, tests and configuration.",
    "focus": [],
    "evidence": [
      {
        "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
        "line": 23,
        "valid": true,
        "snippet": "public OnboardingResult startOnboarding(OnboardingRequest request) {"
      }
    ],
    "task_file": "skill_workbench_tasks/001-whole-repository-understanding.md",
    "expected_output": "skill_reviews/whole-repository-understanding.json",
    "status": "pending"
  },
  "planned_by_strategy": {
    "skill_id": "whole_repository_understanding",
    "purpose": "Build the complete onboarding-system story before presenting the runtime flow as the central example.",
    "scope": "Runtime source, contracts, examples, tests and configuration.",
    "evidence": [
      {
        "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
        "line": 23,
        "valid": true,
        "snippet": "public OnboardingResult startOnboarding(OnboardingRequest request) {"
      }
    ]
  }
}
```

## Write Output

Write valid JSON to `.analysis/skill_reviews/whole-repository-understanding.json`.

Expected JSON:

```json
{
  "skill_workbench_review": {
    "id": "whole-repository-understanding",
    "skill_id": "whole_repository_understanding",
    "version": "skill-workbench-v1",
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
```

Rules:

- Every substantive claim needs file:line evidence.
- Do not use filename, regex or word-match hints as proof of behavior.
- Do not produce final management conclusions here. Produce reusable semantic workbench outputs for detail-agent planning and final report synthesis.
- Codex is the LLM executor for this workbench. Do not call a direct LLM API. Codex must complete the review and put uncertainty in limitations or open questions.
- Do not model this as an LLM unavailable state. Weak source proof becomes explicit uncertainty, not an external service result.
- If the planned skill turns out not to matter or evidence is thin, set `review_status` to `complete`, explain the limitation, and provide evidence or open questions.

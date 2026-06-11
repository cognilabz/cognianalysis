# Agent Instructions for Cognianalysis

This repository is configured for Cognianalysis.

Use the main workflow. In Codex, call the packaged skill:

```text
Use the cognianalysis skill.
```

In other agent harnesses, read this file as the project instruction file and execute the same workflow below.

## Rules

- Keep production source files read-only unless the user explicitly asks for changes.
- Run `cognianalysis run .` when `.analysis/llm_tasks/` or `.analysis/TASK.md` is missing; it prepares the workspace and prints the next missing LLM artifact.
- Choose scope deliberately before the first run. Use `--scope complete` for whole included source inventory, or `--scope critical-path|representative --scope-files N` only when the final report will disclose deferred files and confidence impact.
- Use `cognianalysis resume .` to continue an existing analysis and print completed stages as skipped.
- Use `cognianalysis status .` for the product-language progress view, scope/freshness state and next action. Use `cognianalysis repair .` when JSON is malformed, outputs are stale, task guides/manifests are missing, or an interrupted run needs recovery.
- Execute `.analysis/llm_tasks/00-analysis-strategy.md` first and write `.analysis/llm/analysis-strategy.json`; this LLM-authored strategy controls repo-specific slices, skill use and report intent.
- Execute every `.analysis/source_tier_tasks/*.md` task next and write valid JSON outputs to `.analysis/source_tiers/`; every included file needs a Tier 1 LLM-authored file card before repository synthesis.
- For large repos, use `cognianalysis tier-status .` to see missing/partial/invalid Tier 1 batches and `cognianalysis tier-next . --limit N --max-chars 6000` to create `.analysis/source_tier_contexts/*.json` source-excerpt packs for the next LLM work items.
- Codex itself executes the generated `.analysis/source-tier-next.md` workpack. Do not call a direct LLM API, do not require API credentials and do not replace Codex analysis with deterministic filename/path summaries.
- Do not treat the Codex LLM step as an external service state. It is executed by Codex in the current session, not by a direct API call; when evidence is thin, Codex must still write the required file card with explicit uncertainty or open questions. Tier 1 has no external LLM service state.
- Run `cognianalysis finalize . --allow-partial` after the strategy and Tier 1 cards exist to materialize `.analysis/skill_workbench_tasks/*.md` from the LLM-authored `analysis_strategy.skill_application_plan[]`.
- Execute every materialized `.analysis/skill_workbench_tasks/*.md` task and write the requested `.analysis/skill_reviews/*.json` outputs. These are the repository-specific skill workbenches.
- Treat `.analysis/capability_templates/01-*.md` through `10-*.md` as optional reusable output-shape templates. Do not execute them as a fixed mandatory path; use them only when `llm/analysis-strategy.json`, a skill review or final synthesis explicitly needs that capability output.
- Execute `11-detail-agent-plan.md` next and write `.analysis/llm/detail-agent-plan.json`.
- If the LLM plans no detail reviews, it must set `no_detail_reviews_needed: true` and explain the skip decision with evidence or open questions.
- Run `cognianalysis finalize . --allow-partial` to materialize `.analysis/detail_tasks/*.md` from the LLM-authored detail plan.
- Execute every materialized `.analysis/detail_tasks/*.md` task and write the requested `.analysis/detail_reviews/*.json` outputs.
- Do not add `.analysis/detail_reviews/*.json` outputs that were not planned by `llm/detail-agent-plan.json`.
- Only after the LLM analysis strategy, Tier 1 cards, skill workbench reviews and planned detail reviews exist, execute `12-analysis-document.md` and write `.analysis/llm/analysis-document.json` as the final LLM-authored report. Incorporate optional capability-template outputs only if the LLM deliberately produced them.
- The final analysis document must include an executive decision layer (`executive_decision_basis` plus a visible executive/decision section), `consistency_review` with a contradiction count, and confidence/support for major visible findings, recommendations, decisions and source-family claims.
- The final analysis document must include top-level `analysis_document.open_questions[]`. Use an empty array only after checking for unresolved proof gaps. Each item must have `id`, `question`, `reason`, `impact`, `blocking`, and evidence or an explicit evidence gap; non-empty questions must also be visible in an `open_questions` report block.
- Every relevant business or technical claim must include file:line evidence, and major visible report claims should expose clickable path:line evidence navigation rather than hiding proof in raw JSON.
- Deferred files are not completed analysis. Use `analysis_coverage.deferred_files[]` only for task-local scope boundaries, deliberate non-complete run scope or evidence-gap follow-up; final readiness requires Tier 1 source-file coverage for the included scope and visible disclosure of any omitted files.
- Request/response examples, OpenAPI/Swagger examples, SOAP/WSDL/XSD examples, Mermaid flows, business logic examples and function/use-case examples must be extracted wherever present or defensibly inferable.
- Inferred examples must use `example_origin: "inferred"`.
- If behavior cannot be proven, add it to `open_questions`.
- After final report JSON extraction, run `cognianalysis run .`, `cognianalysis status .` and `cognianalysis audit-report .`. Finalization aggregates, computes artifact/inventory contracts, renders the HTML report, validates evidence, checks scope/freshness, the executive decision layer, LLM consistency review, structured open questions, evidence strength and deterministic report linting. It does not judge semantic completeness, documentation quality or management readiness.

The CLI is implemented in TypeScript. It prepares context, validates evidence, checks deterministic artifact/reference contracts and renders reports. Codex, as the active in-session LLM, performs the semantic extraction, final report authoring and readiness judgment through `analysis_document.requirements_trace`, explicit `goal_contract_refs` and `analysis_document.report_quality_review`; the CLI never calls a direct LLM API for that work.

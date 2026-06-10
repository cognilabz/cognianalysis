# Agent Instructions for Cognianalysis

This repository is configured for Cognianalysis.

Use the main workflow. In Codex, call the packaged skill:

```text
Use the cognianalysis skill.
```

In other agent harnesses, read this file as the project instruction file and execute the same workflow below.

## Rules

- Keep production source files read-only unless the user explicitly asks for changes.
- Run `cognianalysis prepare .` when `.analysis/llm_tasks/` is missing.
- Execute `.analysis/llm_tasks/00-analysis-strategy.md` first and write `.analysis/llm/analysis-strategy.json`; this LLM-authored strategy controls repo-specific slices, skill use and report intent.
- Execute every `.analysis/source_tier_tasks/*.md` task next and write valid JSON outputs to `.analysis/source_tiers/`; every included file needs a Tier 1 LLM-authored file card before repository synthesis.
- Execute building-block tasks `.analysis/llm_tasks/01-*.md` through `10-*.md` after Tier 1 file-card coverage exists, guided by `llm/analysis-strategy.json`, and write valid JSON outputs to `.analysis/llm/`.
- Execute `11-detail-agent-plan.md` next and write `.analysis/llm/detail-agent-plan.json`.
- If the LLM plans no detail reviews, it must set `no_detail_reviews_needed: true` and explain the skip decision with evidence or open questions.
- Run `cognianalysis finalize . --allow-partial` to materialize `.analysis/detail_tasks/*.md` from the LLM-authored detail plan.
- Execute every materialized `.analysis/detail_tasks/*.md` task and write the requested `.analysis/detail_reviews/*.json` outputs.
- Do not add `.analysis/detail_reviews/*.json` outputs that were not planned by `llm/detail-agent-plan.json`.
- Only after the LLM analysis strategy, building blocks and planned detail reviews exist, execute `12-analysis-document.md` and write `.analysis/llm/analysis-document.json` as the final LLM-authored report.
- Every relevant business or technical claim must include file:line evidence.
- Deferred files are not completed analysis. Use `analysis_coverage.deferred_files[]` only for task-local scope boundaries or blocked follow-up; final readiness requires Tier 1 source-file coverage.
- Request/response examples, OpenAPI/Swagger examples, SOAP/WSDL/XSD examples, Mermaid flows, business logic examples and function/use-case examples must be extracted wherever present or defensibly inferable.
- Inferred examples must use `example_origin: "inferred"`.
- If behavior cannot be proven, add it to `open_questions`.
- After final report JSON extraction, run `cognianalysis finalize .` and `cognianalysis audit-report .`. Finalization aggregates, computes artifact/inventory contracts, renders the HTML report and validates evidence. It does not judge semantic completeness, documentation quality or management readiness.

The CLI is implemented in TypeScript. It prepares context, validates evidence, checks deterministic artifact/reference contracts and renders reports. The agent harness/LLM performs the semantic extraction, final report authoring and readiness judgment through `analysis_document.requirements_trace`, explicit `goal_contract_refs` and `analysis_document.report_quality_review`.

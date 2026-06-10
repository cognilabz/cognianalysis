# Agent Instructions for Codebase Analysis Pack

This repository is configured for the Codebase Analysis Pack.

Use the main skill:

```text
Use the codebase-assessment skill.
```

## Rules

- Keep production source files read-only unless the user explicitly asks for changes.
- Run `cba prepare .` when `.analysis/llm_tasks/` is missing.
- Execute building-block tasks `.analysis/llm_tasks/01-*.md` through `10-*.md` first and write valid JSON outputs to `.analysis/llm/`.
- Execute `11-detail-agent-plan.md` next and write `.analysis/llm/detail-agent-plan.json`.
- If the LLM plans no detail reviews, it must set `no_detail_reviews_needed: true` and explain the skip decision with evidence or open questions.
- Run `cba finalize . --allow-partial` to materialize `.analysis/detail_tasks/*.md` from the LLM-authored detail plan.
- Execute every materialized `.analysis/detail_tasks/*.md` task and write the requested `.analysis/detail_reviews/*.json` outputs.
- Do not add `.analysis/detail_reviews/*.json` outputs that were not planned by `llm/detail-agent-plan.json`.
- Only after the building blocks and planned detail reviews exist, execute `12-analysis-document.md` and write `.analysis/llm/analysis-document.json` as the final LLM-authored report.
- Every relevant business or technical claim must include file:line evidence.
- Request/response examples, OpenAPI/Swagger examples, SOAP/WSDL/XSD examples, Mermaid flows, business logic examples and function/use-case examples must be extracted wherever present or defensibly inferable.
- Inferred examples must use `example_origin: "inferred"`.
- If behavior cannot be proven, add it to `open_questions`.
- After final report JSON extraction, run `cba finalize .` and `cba audit-report .`. Finalization aggregates, computes artifact/inventory contracts, renders the HTML report and validates evidence. It does not judge semantic completeness, documentation quality or management readiness.

The CLI is implemented in TypeScript. It prepares context, validates evidence, checks deterministic artifact/reference contracts and renders reports. Codex/LLM performs the semantic extraction, final report authoring and readiness judgment through `analysis_document.requirements_trace`, explicit `goal_contract_refs` and `analysis_document.report_quality_review`.

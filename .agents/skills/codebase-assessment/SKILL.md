---
name: codebase-assessment
description: Main LLM-first repository assessment workflow for extracting business capabilities, business logic, contracts, request/response examples, Mermaid flows, domain/data/integration views, architecture, process readiness, refactoring options and evidence-based interactive HTML reports.
---

# Codebase Assessment Skill

## Goal

Produce a semantic, evidence-based, decision-grade codebase assessment. The TypeScript CLI builds context; Codex extracts meaning.

This is the main skill. A user should be able to say only:

```text
Use the codebase-assessment skill.
```

and Codex should still execute the full workflow below without asking the user to run post-processing commands manually.

## Workflow

1. If `.analysis/llm_tasks/` does not exist, run `cba prepare .`.
2. Read `.analysis/llm_instructions.md`.
3. Read `.analysis/data/analysis-skill-catalog.json` and treat it as the reusable LLM capability map. The catalog is not deterministic routing; use it to decide which analysis skills matter for this repository.
4. Execute the building-block task files in `.analysis/llm_tasks/` through `10-report-completeness-review.md`.
5. For each task, inspect source files, tests, docs, OpenAPI/Swagger, SOAP/WSDL/XSD, GraphQL schemas, event schemas, examples and configuration directly.
6. Use `.analysis/data/source-inventory.json` as the full included scope. Source capsules are only navigation aids; every included file must be evidence-backed, listed in `analysis_coverage.inspected_files`, or explicitly listed in `analysis_coverage.deferred_files` with a reason.
7. Produce the whole-repository view before any deep slice. For monorepos, document the complete source-family landscape and clearly label any module with deeper route/process extraction as a deep-review area, not as the whole system.
8. Use `.analysis/data/source-family-inventory.json` only as navigation context. Do not treat deterministic inventory partitions as semantic source families or detail-review priorities.
9. Execute `11-detail-agent-plan.md` and write `.analysis/llm/detail-agent-plan.json`. This plan is LLM-authored after the whole-repository overview and before the final report.
   - If no detail reviews are needed, the LLM plan must set `no_detail_reviews_needed: true` and explain the skip decision with evidence or open questions.
10. Run `cba finalize . --allow-partial` to mechanically materialize `.analysis/detail_tasks/*.md` from the LLM-authored plan.
11. Execute every task in `.analysis/detail_tasks/` and write the requested `.analysis/detail_reviews/*.json` outputs.
   - Do not add `.analysis/detail_reviews/*.json` outputs that were not planned by `llm/detail-agent-plan.json`; unexpected reviews are treated as a pipeline-contract gap.
12. Only after all pre-final `.analysis/llm/*.json` building-block outputs exist and the planned detail reviews exist, author the final report as an LLM-written `analysis_document` via `12-analysis-document.md`: choose the repository-specific section order and emphasis, incorporate executed detail reviews, list incorporated source families in `analysis_document.detail_review_synthesis.integrated_detail_reviews`, and use the supported component/block types so the renderer keeps styling and evidence behavior consistent.
   - Treat `analysis_document.sections` as the complete visible report navigation and start order. The CLI may still embed coverage/raw analysis data for validation, but the human-facing menu and narrative should be LLM-authored through the component library.
   - If the report needs technical drilldown, evidence governance or raw-data interpretation, author those as repository-specific sections instead of relying on fixed appendices.
- Do not leave empty final-report sections or component blocks for deterministic renderer prose to explain. If a point is unknown or incomplete, author an `open_questions` block, limitation or partial verdict in the LLM report.
- Use component `labels` when default table headers or group labels do not match the repository language. The renderer provides visual structure; the LLM should own the wording and emphasis.
- Include `analysis_document.report_quality_review` as an LLM-authored self-audit with `verdict: "decision_ready"` when the report is management-ready, repo-specific, whole-repo-first and covers the four analysis levels plus functional/technical views, improvement/refactoring, tool positioning, evidence and uncertainty.
- If any LLM-authored `requirements_trace` row is `partial` or `open` while `report_quality_review.verdict` is `decision_ready`, include `report_quality_review.partial_requirement_rationale[]` for every such row so the LLM explicitly explains the accepted limitation, remaining follow-up and evidence/open question.
- The CLI must not decide semantic quality by keyword, menu, component presence or target checklist counts. It validates artifact contracts, explicit `goal_contract_refs` reference shape and evidence references; the LLM controls semantic completeness, documentation quality and decision readiness through `requirements_trace` and `report_quality_review`.
- If the LLM-authored `report_quality_review.verdict` is `partial` or `not_ready`, final readiness must remain blocked by that LLM verdict until the report is improved or the verdict is changed by a later LLM review.
- The final bundle/report must expose `semantic_authority` so humans can see that semantic readiness comes from the LLM and deterministic artifacts are only navigation, evidence and renderer-contract support.
13. Write valid JSON into `.analysis/llm/` using the expected file names from the tasks.
14. Run `cba finalize .`.
15. Run `cba audit-report .` to verify the visible report is LLM-authored, final synthesis happened after the required LLM building-block artifacts and detail reviews, the LLM-authored report-quality review is decision-ready, the LLM-authored requirements trace explicitly references the original goal contract, evidence is valid, LLM-planned detail reviews are executed/synthesized and old fixed report navigation did not reappear.
16. Check the finalization and audit output for artifact/reference contracts, source inventory accounting, final prerequisite artifacts, source-family/detail-agent execution, LLM-authored report-quality review, LLM-authored report contract and evidence validation.
17. If evidence validation, source inventory accounting, artifact contract checks, or the LLM-authored `requirements_trace`/`report_quality_review` show gaps, fix invalid evidence, incomplete `analysis_coverage` references or missing whole-repo/source-family/report statements in `.analysis/llm/*.json` and rerun `cba finalize .` and `cba audit-report .`.

## Required target artifact contracts

The assessment must address all target capabilities, not only documentation generation:

- Existing-harness execution, not a custom coding agent
- LLM-first semantic extraction
- Non-authoritative code-map signals
- Whole-codebase source inventory accounting
- Semantic target artifact contracts must come from LLM/detail-review/final-document artifacts, not deterministic placeholders or inventory fallback text
- Whole-repository narrative and source-family coverage before deep slices
- Final summaries, E2E understanding, relationships and visible reports only after all pre-final LLM building-block outputs exist
- LLM-authored source-family detail-agent plan and executable detail task files after overview synthesis and before final report synthesis
- Detail-review report synthesis freshness: every executed `.analysis/detail_reviews/*.json` must be integrated into the authored report or finalization must show the report as stale
- LLM-authored analysis document rendered through a stable component/style library
- Management/business-need and business-use narrative with drilldown to technical and deep technical evidence
- LLM-authored management-ready report quality review
- Four-level analysis model: reverse engineering/documentation, code analysis, process analysis, refactoring/target architecture
- Original requirements trace contract: the authored report must include a structured LLM-authored requirements trace with requirement names, explicit `goal_contract_refs` for output shape, levels, views and report behaviors, LLM statuses, section links and evidence or open questions; the CLI must not use a fixed checklist to decide semantic completeness
- Business capability extraction
- Functional view of what the system does
- Business logic extraction
- Interface and contract extraction
- Request/response examples
- OpenAPI/Swagger extraction
- SOAP/WSDL/XSD extraction
- Technical view of APIs, interfaces and architecture
- Mermaid flow extraction
- Domain/data/integration view
- Architecture assessment
- Process/readiness assessment
- Bugs, visible vulnerabilities and quality findings
- Structured decision basis
- Refactoring and modernization roadmap
- Target architecture / new tech-stack options
- Tool alternative positioning against consulting/gen-AI delivery suites, structural architecture mapping, static quality/security gates and automated transformation engines, including handoff boundaries
- Evidence-first validation
- Interactive HTML reporting
- Portfolio-ready output shape
- Harness portability through skills, CLI and optional tool bridge

## Required extraction

Extract all of the following where present or defensibly inferable from evidence.

### Business understanding

- Business capabilities and supported use cases
- Actors, systems and roles
- Domain glossary and domain entities
- Business rules, validations, decisions, calculations, status transitions, authorization behavior and error behavior
- Business logic examples
- Function and use-case examples with input, output and explanation

### Interfaces and contracts

- HTTP, REST, OpenAPI/Swagger, SOAP/WSDL/XSD, GraphQL, events, jobs, CLI commands, UI routes, database touchpoints and external calls
- Request fields, response fields, headers, statuses, errors, faults and message payloads
- Request/response examples from docs, tests, OpenAPI/Swagger, SOAP/WSDL, Postman, `.http` files or inferred DTO/schema examples
- OpenAPI/Swagger operations, schemas and examples when present
- SOAP/WSDL/XSD operations, messages, faults, SOAP actions and SOAP envelope examples when present

### Flows and side effects

- Happy paths and failure paths
- Mermaid source for every meaningful flow
- Persistence, state changes, events, external calls, queues/topics and other side effects
- Data flow and process flow summaries

### Technical, process and modernization assessment

- Architecture modules, responsibilities and dependencies
- Data stores and integration dependencies
- Test coverage signals, testability concerns and missing tests
- CI/CD, release, configuration, observability and operational readiness
- Maintainability, quality, visible security and documentation risks where visible from the repository
- Refactoring and modernization options with benefit, risk, effort, candidate files and evidence

## Evidence rules

Every relevant business or technical claim must include evidence using this shape:

```json
{"path": "relative/path/File.ext", "line": 123, "symbol": "optionalSymbol"}
```

Prefer evidence from source files, tests, DTOs, schemas, contract files, configuration and documentation. If behavior cannot be proven, put it into `open_questions`.

## Example rules

- Extract source-provided examples exactly enough to be useful.
- If no explicit example exists, infer a small realistic example only when the fields/rules are backed by evidence.
- Inferred examples must use `example_origin: "inferred"`.
- Never label inferred examples as `source`, `openapi`, `soap`, `doc` or `test`.
- Include request/response examples, SOAP envelope examples, business logic examples and function/use-case examples wherever available.

## Non-goals

- Do not modify production code.
- Do not present code-map signals as final entrypoints.
- Do not produce prose-only analysis when JSON output is requested by a task.
- Do not hide uncertainty; use `confidence` and `open_questions`.

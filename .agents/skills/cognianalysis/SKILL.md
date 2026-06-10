---
name: cognianalysis
description: Main LLM-first repository assessment workflow for extracting business capabilities, business logic, contracts, request/response examples, Mermaid flows, domain/data/integration views, architecture, process readiness, refactoring options and evidence-based interactive HTML reports.
---

# Cognianalysis Skill

## Goal

Produce a semantic, evidence-based, decision-grade codebase assessment. The TypeScript CLI builds context; Codex extracts meaning.

This is the main skill. A user should be able to say only:

```text
Use the cognianalysis skill.
```

and Codex should still execute the full workflow below without asking the user to run post-processing commands manually.

## Workflow

1. If `.analysis/llm_tasks/` does not exist, run `cognianalysis prepare .`.
2. Read `.analysis/llm_instructions.md`.
3. Read `.analysis/data/analysis-skill-catalog.json` and treat it as the reusable LLM capability map. The catalog is not deterministic routing; use it to decide which analysis skills matter for this repository.
4. Execute `.analysis/llm_tasks/00-analysis-strategy.md` first and write `.analysis/llm/analysis-strategy.json`.
   - This is the LLM-authored repository-specific strategy: how to understand this repository, which slices and skills matter, how Tier 1 coverage will be used, what deeper reviews may be needed and what kind of final report should help humans.
   - The remaining generated task files are capability workbenches and output contracts. They are not the semantic information architecture for every repository.
5. Execute every `.analysis/source_tier_tasks/*.md` task and write the requested `.analysis/source_tiers/*.json` outputs before repository synthesis.
   - This is the Tier 1 whole-codebase base layer: every included file must get a short LLM-authored file card with purpose, technical role, business relevance or none/unknown, relationships, confidence and evidence.
   - Do not use `.analysis_coverage.deferred_files` as a substitute for Tier 1 file analysis. Deferred files are not done.
   - Tier 0 is deterministic inventory only and has no semantic authority; Tier 1 is mandatory shallow file understanding; Tier 2 is module/source-family synthesis; Tier 3 is behavior/contract/flow deep dive; Tier 4 is decision, risk, process and refactoring analysis.
6. Execute the building-block task files in `.analysis/llm_tasks/` through `10-report-completeness-review.md`, guided by `.analysis/llm/analysis-strategy.json`.
7. For each task, inspect source files, tests, docs, OpenAPI/Swagger, SOAP/WSDL/XSD, GraphQL schemas, event schemas, examples and configuration directly.
8. Use `.analysis/data/source-inventory.json` as the full included scope. Source capsules are only navigation aids; every included file must be Tier-1 analyzed, evidence-backed, or explicitly left as an open/blocked gap by the LLM. Deferral alone is not whole-codebase completion.
9. Produce the whole-repository view before any deep slice. For monorepos, document the complete source-family landscape and clearly label any module with deeper route/process extraction as a deep-review area, not as the whole system.
10. Use `.analysis/data/source-family-inventory.json` only as navigation context. Do not treat deterministic inventory partitions as semantic source families or detail-review priorities.
11. Execute `11-detail-agent-plan.md` and write `.analysis/llm/detail-agent-plan.json`. This plan is LLM-authored after the analysis strategy and whole-repository overview and before the final report.
   - If no detail reviews are needed, the LLM plan must set `no_detail_reviews_needed: true` and explain the skip decision with evidence or open questions.
12. Run `cognianalysis finalize . --allow-partial` to mechanically materialize `.analysis/detail_tasks/*.md` from the LLM-authored plan.
13. Execute every task in `.analysis/detail_tasks/` and write the requested `.analysis/detail_reviews/*.json` outputs.
   - Do not add `.analysis/detail_reviews/*.json` outputs that were not planned by `llm/detail-agent-plan.json`; unexpected reviews are treated as a pipeline-contract gap.
14. Only after `.analysis/llm/analysis-strategy.json`, all Tier 1 `.analysis/source_tiers/*.json`, all pre-final `.analysis/llm/*.json` building-block outputs and the planned detail reviews exist, author the final report as an LLM-written `analysis_document` via `12-analysis-document.md`: choose the repository-specific section order and emphasis, incorporate executed detail reviews, list incorporated source families in `analysis_document.detail_review_synthesis.integrated_detail_reviews`, and use the supported component/block types so the renderer keeps styling and evidence behavior consistent.
   - Treat `analysis_document.sections` as the complete visible report navigation and start order. The CLI may still embed coverage/raw analysis data for validation, but the human-facing menu and narrative should be LLM-authored through the component library.
   - If the report needs technical drilldown, evidence governance or raw-data interpretation, author those as repository-specific sections instead of relying on fixed appendices.
- Do not leave empty final-report sections or component blocks for deterministic renderer prose to explain. If a point is unknown or incomplete, author an `open_questions` block, limitation or partial verdict in the LLM report.
- Use component `labels` when default table headers or group labels do not match the repository language. The renderer provides visual structure; the LLM should own the wording and emphasis.
- Include `analysis_document.report_quality_review` as an LLM-authored self-audit with `verdict: "decision_ready"` when the report is management-ready, repo-specific, whole-repo-first and covers the four analysis levels plus functional/technical views, improvement/refactoring, tool positioning, evidence and uncertainty.
- If any LLM-authored `requirements_trace` row is `partial` or `open` while `report_quality_review.verdict` is `decision_ready`, include `report_quality_review.partial_requirement_rationale[]` for every such row so the LLM explicitly explains the accepted limitation, remaining follow-up and evidence/open question.
- The CLI must not decide semantic quality by keyword, menu, component presence or target checklist counts. It validates artifact contracts, explicit `goal_contract_refs` reference shape and evidence references; the LLM controls semantic completeness, documentation quality and decision readiness through `requirements_trace` and `report_quality_review`.
- If the LLM-authored `report_quality_review.verdict` is `partial` or `not_ready`, final readiness must remain blocked by that LLM verdict until the report is improved or the verdict is changed by a later LLM review.
- The final bundle/report must expose `semantic_authority` so humans can see that semantic readiness comes from the LLM and deterministic artifacts are only navigation, evidence and renderer-contract support.
15. Write valid JSON into `.analysis/llm/` using the expected file names from the tasks.
16. Run `cognianalysis finalize .`.
17. Run `cognianalysis audit-report .` to verify the visible report is LLM-authored, the LLM analysis strategy exists, Tier 1 file-card coverage is complete, final synthesis happened after the required LLM building-block artifacts and detail reviews, the LLM-authored report-quality review is decision-ready, the LLM-authored requirements trace explicitly references the original goal contract, evidence is valid, LLM-planned detail reviews are executed/synthesized and old fixed report navigation did not reappear.
18. Check the finalization and audit output for the LLM analysis strategy, Tier 1 file-card coverage, artifact/reference contracts, source inventory accounting, final prerequisite artifacts, source-family/detail-agent execution, LLM-authored report-quality review, LLM-authored report contract and evidence validation.
19. If evidence validation, LLM analysis strategy, Tier 1 file-card coverage, source inventory accounting, artifact contract checks, or the LLM-authored `requirements_trace`/`report_quality_review` show gaps, fix invalid evidence, missing `.analysis/source_tiers/*.json` file cards, incomplete `analysis_coverage` references or missing whole-repo/source-family/report statements and rerun `cognianalysis finalize .` and `cognianalysis audit-report .`.

## Companion skill map

This is the only end-to-end agent skill. Keep report finalization and HTML rendering here instead of using a separate report-writer skill.

The focused companion skills are optional workbench prompts for deeper extraction:

| Agent skill | Main analysis catalog ids |
|---|---|
| `business-extraction` | `business_extraction`, `domain_data_integration_analysis` |
| `interface-contract-analysis` | `interface_contract_analysis`, `request_response_examples` |
| `flow-mermaid-analysis` | `flow_mermaid_analysis` |

The generated `.analysis/data/analysis-skill-catalog.json` is a reusable LLM capability map, not a set of separate Codex entrypoints. The LLM may reference those catalog ids in `analysis_strategy.skill_application_plan[]`, while this main skill remains responsible for prepare, Tier 1 coverage, building blocks, detail planning, final report authoring, finalization and audit.

## Required target capability trace context

The assessment must address all target capabilities, not only documentation generation:

- Existing-harness execution, not a custom coding agent
- LLM-first semantic extraction
- LLM-authored repository analysis strategy before fixed capability workbenches
- Non-authoritative inventory-only code map
- Whole-codebase source inventory accounting
- Tiered whole-codebase analysis: every included file receives at least Tier 1 LLM-authored understanding before deeper Tier 2-4 analysis is selected
- Target capability rows are LLM trace context only; semantic satisfaction must come from LLM/detail-review/final-document artifacts, not deterministic placeholders, output-key presence scoring or inventory fallback text
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
- Do not present code-map inventory metadata as final entrypoints, interfaces, flows, relationships or framework facts.
- Do not produce prose-only analysis when JSON output is requested by a task.
- Do not hide uncertainty; use `confidence` and `open_questions`.

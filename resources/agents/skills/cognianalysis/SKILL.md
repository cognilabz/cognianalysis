---
name: cognianalysis
description: Main LLM-first repository assessment workflow for extracting business capabilities, business logic, contracts, request/response examples, Mermaid flows, domain/data/integration views, architecture, process readiness, refactoring options and evidence-based interactive HTML reports.
---

# Cognianalysis Skill

## Goal

Produce a semantic, evidence-based, decision-grade codebase assessment. The TypeScript CLI builds context; Codex, as the active in-session LLM, extracts meaning without a direct LLM API runner.

This is the main skill. A user should be able to say only:

```text
Use the cognianalysis skill.
```

and the agent should still execute the full workflow below without asking the user to run post-processing commands manually.

## Workflow

1. If `.analysis/llm_tasks/` or `.analysis/TASK.md` does not exist, run `cognianalysis analyze .`.
   - Choose scope deliberately before the first run. Use `cognianalysis analyze . --scope complete` for the whole included source inventory, or `--scope critical-path|representative --scope-files N` only when the final report will disclose deferred files and confidence impact.
   - Use `cognianalysis resume .` to continue an existing analysis and print completed stages as skipped.
   - Use `cognianalysis status .` whenever you need the product-language progress view and next action.
   - Use `cognianalysis repair .` when JSON is malformed, task guides/manifests are missing, outputs are stale or an interrupted run needs recovery.
2. Read `.analysis/llm_instructions.md`.
3. Read `.analysis/data/analysis-skill-catalog.json` and treat it as the reusable LLM capability map. The catalog is not deterministic routing; use it to decide which analysis skills matter for this repository.
4. Execute `.analysis/llm_tasks/00-analysis-strategy.md` first and write `.analysis/llm/analysis-strategy.json`.
   - This is the LLM-authored repository-specific strategy: how to understand this repository, which slices and skills matter, how Tier 1 coverage will be used, what deeper reviews may be needed and what kind of final report should help humans.
   - The capability template files are reusable output-shape contracts. They are not the semantic information architecture for every repository and are not mandatory.
5. Execute every `.analysis/source_tier_tasks/*.md` task and write the requested `.analysis/source_tiers/*.json` outputs before repository synthesis.
   - This is the Tier 1 whole-codebase base layer: every included file must get a short LLM-authored file card with purpose, technical role, business relevance or none/unknown, relationships, confidence and evidence.
   - Do not use `.analysis_coverage.deferred_files` as a substitute for Tier 1 file analysis. Deferred files are not done.
   - Tier 0 is deterministic inventory only and has no semantic authority; Tier 1 is mandatory shallow file understanding; Tier 2 is module/source-family synthesis; Tier 3 is behavior/contract/flow deep dive; Tier 4 is decision, risk, process and refactoring analysis.
   - For large repos, use `cognianalysis dev tier-status .` to see missing/partial/invalid Tier 1 batches and `cognianalysis dev tier-next . --limit N --max-chars 6000` to create `.analysis/source_tier_contexts/*.json` source-excerpt packs for the next LLM work items.
   - Codex itself executes the generated `.analysis/source-tier-next.md` workpack. Do not call a direct LLM API, do not require API credentials and do not replace Codex analysis with deterministic filename/path summaries.
   - Do not treat the Codex LLM step as an external service state. It is executed by Codex in the current session, not by a direct API call; when evidence is thin, Codex must still write the required file card with explicit uncertainty or open questions. The LLM execution itself is not modeled as an availability state; only the resulting artifact/readiness can be incomplete, partial or not decision-ready.
6. Run `cognianalysis dev finalize . --allow-partial` after the strategy and Tier 1 cards exist to mechanically materialize `.analysis/skill_workbench_tasks/*.md` from the LLM-authored `analysis_strategy.skill_application_plan[]`.
7. Execute every materialized `.analysis/skill_workbench_tasks/*.md` task and write the requested `.analysis/skill_reviews/*.json` outputs.
   - These are the repository-specific skill workbenches. They are not chosen by filename, path convention, regex or a fixed report menu.
8. Use `.analysis/capability_templates/01-*.md` through `10-*.md` only when the LLM-authored strategy, a skill review or final synthesis explicitly needs that output shape.
   - Do not execute every capability template just because it exists.
   - Optional template outputs may be written to `.analysis/llm/*.json`, but they are supporting artifacts, not the fixed repository-understanding path.
9. For each executed strategy task, skill workbench, optional template or detail review, inspect source files, tests, docs, OpenAPI/Swagger, SOAP/WSDL/XSD, GraphQL schemas, event schemas, examples and configuration directly.
10. Use `.analysis/data/source-inventory.json` as the full included scope and `.analysis/data/analysis-scope.json` as the declared scope contract for this run. Source capsules are only navigation aids; every included file must be Tier-1 analyzed with evidence-backed file cards. If behavior cannot be proven from the available excerpt, Codex must preserve uncertainty in the card or open questions instead of using deferral as completion. Deliberate non-complete scope must be visible in the report with confidence impact.
11. Produce the whole-repository view before any deep slice. For monorepos, document the complete source-family landscape and clearly label any module with deeper route/process extraction as a deep-review area, not as the whole system.
12. Use `.analysis/data/source-family-inventory.json` only as navigation context. Do not treat deterministic inventory partitions as semantic source families or detail-review priorities.
13. Execute `11-detail-agent-plan.md` and write `.analysis/llm/detail-agent-plan.json`. This plan is LLM-authored after the analysis strategy, skill workbench reviews and whole-repository overview and before the final report.
   - If no detail reviews are needed, the LLM plan must set `no_detail_reviews_needed: true` and explain the skip decision with evidence or open questions.
14. Run `cognianalysis dev finalize . --allow-partial` to mechanically materialize `.analysis/detail_tasks/*.md` from the LLM-authored plan.
15. Execute every task in `.analysis/detail_tasks/` and write the requested `.analysis/detail_reviews/*.json` outputs.
   - Do not add `.analysis/detail_reviews/*.json` outputs that were not planned by `llm/detail-agent-plan.json`; unexpected reviews are treated as a pipeline-contract gap.
16. Only after `.analysis/llm/analysis-strategy.json`, all Tier 1 `.analysis/source_tiers/*.json`, all LLM-planned `.analysis/skill_reviews/*.json` and the planned detail reviews exist, author the final report as an LLM-written `analysis_document` via `12-analysis-document.md`: choose the repository-specific section order and emphasis, incorporate executed skill workbench reviews, any deliberately produced optional capability-template outputs and detail reviews, list incorporated skill workbench IDs in `analysis_document.skill_workbench_synthesis.integrated_skill_workbenches`, list incorporated source families in `analysis_document.detail_review_synthesis.integrated_detail_reviews`, and use the supported component/block types so the renderer keeps styling and evidence behavior consistent.
   - Treat `analysis_document.sections` as the complete visible report navigation and start order. The CLI may still embed coverage/raw analysis data for validation, but the human-facing menu and narrative should be LLM-authored through the component library.
   - The LLM owns the report section order, IDs and emphasis. Do not force fixed section IDs.
   - The visible report must be understandable to a human reader who does not already know the repository. Use layered explanation blocks or equivalent prose: plain-language purpose/process first, technical drilldown second, evidence underneath.
   - Keep the technical material visible. Include API/interface contracts, request/response examples, errors/failure modes and Mermaid graphs/flows wherever source code, schemas, docs, tests or DTOs support them. Inferred examples must use `example_origin: "inferred"`.
   - Author top-level `analysis_document.core_capability_coverage[]` for all four core capabilities and make it visible through a `capability_coverage` block or equally explicit component blocks inside LLM-chosen sections.
   - Author top-level `analysis_document.whole_file_thesis_trace` and make it visible through a `source_coverage_trace` block or equally explicit component block. Reconcile included files to Tier 1 file cards and explain how the complete file-card corpus influenced thesis selection, source-family weighting, confidence and evidence gaps. Then cite specific file:line evidence for concrete behavior, risk, process and modernization claims.
   - If the report needs technical drilldown, evidence governance or raw-data interpretation, author those as repository-specific sections instead of relying on fixed appendices.
- Do not leave empty final-report sections or component blocks for deterministic renderer prose to explain. If a point is unknown or incomplete, author an `open_questions` block, limitation or partial verdict in the LLM report.
- Use component `labels` when default table headers or group labels do not match the repository language. The renderer provides visual structure; the LLM should own the wording and emphasis.
- Include `analysis_document.report_quality_review` as an LLM-authored self-audit with `verdict: "decision_ready"` when the report is management-ready, repo-specific, whole-repo-first and covers the four analysis levels plus functional/technical views, improvement/refactoring, tool positioning, evidence and uncertainty.
- Include `analysis_document.executive_decision_basis` plus a visible executive/decision section before technical drilldown. It must answer whether to keep, modernize or replace the system, what cost/effort is implied, the biggest risks and the next actions.
- Include `analysis_document.consistency_review` with reviewer `codex_llm`, a contradiction count and explicit contradiction details when contradictions remain.
- Include top-level `analysis_document.open_questions[]` as the structured uncertainty model. Use an empty array only after checking unresolved proof gaps. Each item must include `id`, `question`, `reason`, `impact`, `blocking`, and evidence or an explicit evidence gap. If any items exist, mirror them in a visible `open_questions` block.
- Include confidence on major visible findings, recommendations, decisions and source-family claims; use explicit uncertainty when confidence cannot be high.
- If any LLM-authored `requirements_trace` row is `partial` or `open` while `report_quality_review.verdict` is `decision_ready`, include `report_quality_review.partial_requirement_rationale[]` for every such row so the LLM explicitly explains the accepted limitation, remaining follow-up and evidence/open question.
- The CLI must not decide semantic quality by keyword, menu, component presence or target checklist counts. It validates artifact contracts, explicit `goal_contract_refs` reference shape and evidence references; the LLM controls semantic completeness, documentation quality and decision readiness through `requirements_trace` and `report_quality_review`.
- If the LLM-authored `report_quality_review.verdict` is `partial` or `not_ready`, final readiness must remain not-ready by that LLM verdict until the report is improved or the verdict is changed by a later LLM review.
- The final bundle/report must expose `semantic_authority` so humans can see that semantic readiness comes from the LLM and deterministic artifacts are only navigation, evidence and renderer-contract support.
17. Write valid JSON into `.analysis/llm/` for required workflow tasks and for optional capability-template outputs only when selected by the LLM strategy or synthesis.
18. Run `cognianalysis analyze .`.
19. Run `cognianalysis status .`.
20. Run `cognianalysis dev audit-report .` to verify the visible report is LLM-authored, the LLM analysis strategy exists, Tier 1 file-card coverage is complete for the declared scope, LLM-planned skill workbenches are executed and synthesized, final synthesis happened after required workflow artifacts and detail reviews, the analysis is fresh for the current commit, the LLM-authored report-quality review is decision-ready, the executive decision layer is complete, the Codex-authored consistency review has zero contradictions, structured open questions are complete with no blocking items, evidence strength/confidence checks pass, visible evidence navigation is rendered, the deterministic report lint passes, the LLM-authored requirements trace explicitly references the original goal contract, evidence is valid, LLM-planned detail reviews are executed/synthesized and old fixed report navigation did not reappear.
21. Check the finalization, status and audit output for scope/freshness, the LLM analysis strategy, Tier 1 file-card coverage, skill workbench execution/synthesis, artifact/reference contracts, source inventory accounting, final prerequisite artifacts, source-family/detail-agent execution, executive decision layer, consistency review, structured open questions, evidence strength, LLM-authored report-quality review, LLM-authored report contract and evidence validation.
22. If evidence validation, scope/freshness, LLM analysis strategy, Tier 1 file-card coverage, skill workbench execution/synthesis, source inventory accounting, artifact contract checks, report lint, executive decision layer, consistency review, structured open questions, evidence strength, or the LLM-authored `requirements_trace`/`report_quality_review` show gaps, run `cognianalysis repair .` when recovery is needed, fix invalid evidence, missing `.analysis/source_tiers/*.json` file cards, missing `.analysis/skill_reviews/*.json`, incomplete `analysis_coverage` references or missing whole-repo/source-family/report statements and rerun `cognianalysis analyze .`, `cognianalysis status .` and `cognianalysis dev audit-report .`.

## Companion skill map

This is the only end-to-end agent skill. Keep report finalization and HTML rendering here instead of using a separate report-writer skill.

The focused companion skills are optional workbench prompts for deeper extraction:

| Agent skill | Main analysis catalog ids |
|---|---|
| `business-extraction` | `business_extraction`, `domain_data_integration_analysis` |
| `interface-contract-analysis` | `interface_contract_analysis`, `request_response_examples` |
| `flow-mermaid-analysis` | `flow_mermaid_analysis` |

The generated `.analysis/data/analysis-skill-catalog.json` is a reusable LLM capability map, not deterministic routing. The LLM references catalog ids or custom skills in `analysis_strategy.skill_application_plan[]`; the CLI materializes those rows into `.analysis/skill_workbench_tasks/*.md` without choosing semantic scope. This main skill remains responsible for prepare, Tier 1 coverage, skill workbench execution, building blocks, detail planning, final report authoring, finalization and audit.

## Required target capability trace context

The assessment must address all target capabilities, not only documentation generation:

- Existing-harness execution, not a custom coding agent
- LLM-first semantic extraction
- LLM-authored repository analysis strategy before optional capability templates are considered
- LLM-planned skill workbench tasks materialized from `analysis_strategy.skill_application_plan[]`; capability templates are optional contracts, not semantic routing or final-readiness gates
- Non-authoritative inventory-only code map
- Whole-codebase source inventory accounting
- Tiered whole-codebase analysis: every included file receives at least Tier 1 LLM-authored understanding before deeper Tier 2-4 analysis is selected
- Deliberate large-repo scope strategy with `--scope complete|critical-path|representative`, persisted selected/deferred counts and visible confidence impact when the run is not complete scope
- Resume, repair and freshness UX: interrupted runs continue with `resume`, broken JSON/task guides recover with `repair`, and stale prepared commits block final readiness
- Structured open-question tracking: top-level `analysis_document.open_questions[]`, visible `open_questions` report blocks for non-empty uncertainty and readiness blocking for blocking questions
- Visible evidence navigation: report claims should show clickable path:line evidence chips that jump to validated evidence rows; `evidence` and `evidence_refs` are both acceptable evidence fields
- Target capability rows are LLM trace context only; semantic satisfaction must come from LLM/detail-review/final-document artifacts, not deterministic placeholders, output-key presence scoring or inventory fallback text
- Whole-repository narrative and source-family coverage before deep slices
- Final summaries, E2E understanding, relationships and visible reports only after Tier 1 coverage, LLM-planned skill workbenches and planned detail reviews exist
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

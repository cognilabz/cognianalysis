# Cognianalysis Task

This is the single human-facing workpack for this repository. The detailed task files remain available for harnesses, batching and CI, but this file is the path a user should read first.

## Goal

Produce a Codex-authored LLM, decision-grade source-code analysis report for `demo-repo`.

The TypeScript CLI prepares context, validates contracts, checks evidence references and renders HTML. Codex is the in-session LLM executor and authors all semantic understanding, report structure, findings, examples, flows, recommendations and readiness verdicts. Do not call a direct LLM API or require API credentials.

The LLM step is not an external service check and cannot be represented as unavailable by the CLI. Codex authors the required artifacts in this session; uncertainty belongs in confidence, limitations, open questions or a Codex-authored partial/not_ready report-quality verdict.

## Product-Mode Loop

1. Run `cognianalysis analyze .` to prepare the workspace or see the next missing artifact. For large repositories, choose scope deliberately: `--scope complete`, `--scope critical-path --scope-files N` or `--scope representative --scope-files N`.
2. Run `cognianalysis resume .` to continue an existing analysis and print completed stages as skipped.
3. Run `cognianalysis status .` whenever you need a product-language progress view, scope/freshness state and next action.
4. Run `cognianalysis repair .` if JSON is malformed, manifests/task guides are missing, outputs are stale, or an interrupted run needs recovery.
5. Author `.analysis/llm/analysis-strategy.json` from `.analysis/llm_tasks/00-analysis-strategy.md`.
6. Execute every `.analysis/source_tier_tasks/*.md` task and write Tier 1 file cards to `.analysis/source_tiers/*.json`.
7. Run `cognianalysis dev finalize . --allow-partial` to materialize LLM-planned skill workbench tasks.
8. Execute every `.analysis/skill_workbench_tasks/*.md` task into `.analysis/skill_reviews/*.json`.
9. Author `.analysis/llm/detail-agent-plan.json` from `.analysis/llm_tasks/11-detail-agent-plan.md`.
10. Run `cognianalysis dev finalize . --allow-partial` to materialize detail tasks.
11. Execute every `.analysis/detail_tasks/*.md` task into `.analysis/detail_reviews/*.json`.
12. Author `.analysis/llm/analysis-document.json` from `.analysis/llm_tasks/12-analysis-document.md`.
13. Run `cognianalysis analyze .`, `cognianalysis status .`, then `cognianalysis dev audit-report .`.

## Required Workflow Artifacts

- `llm/analysis-strategy.json` from `llm_tasks/00-analysis-strategy.md`
- `llm/detail-agent-plan.json` from `llm_tasks/11-detail-agent-plan.md`
- `llm/analysis-document.json` from `llm_tasks/12-analysis-document.md`

## Whole-Codebase Base

- Tier 1 file-card tasks: 1
- Included files in Tier 1 scope: 32
- Manifest: `.analysis/source-tier-task-manifest.json`

Every included file needs a Tier 1 Codex-authored LLM card before a final report can claim whole-codebase readiness. Deferred files are visible follow-up, not completed analysis.

Analysis scope mode: `complete`. If this is not `complete`, the final report must visibly state the scope, deferred-file count and confidence impact.

## Optional Capability Templates

The files in `.analysis/capability_templates/*.md` are reusable output shapes, not mandatory workflow steps:

- `capability_templates/01-core-assessment.md` -> `llm/core-assessment.json`
- `capability_templates/02-business-capabilities-logic.md` -> `llm/business-capabilities-logic.json`
- `capability_templates/03-interface-contract-extraction.md` -> `llm/interfaces-contracts.json`
- `capability_templates/04-request-response-examples.md` -> `llm/request-response-examples.json`
- `capability_templates/05-openapi-soap-graphql.md` -> `llm/openapi-soap-graphql.json`
- `capability_templates/06-flows-mermaid.md` -> `llm/flows-mermaid.json`
- `capability_templates/07-domain-data-integrations.md` -> `llm/domain-data-integrations.json`
- `capability_templates/08-process-quality-readiness.md` -> `llm/process-quality-readiness.json`
- `capability_templates/09-architecture-refactoring-roadmap.md` -> `llm/architecture-refactoring-roadmap.json`
- `capability_templates/10-report-completeness-review.md` -> `llm/report-completeness-review.json`

Use a template only when the Codex-authored LLM strategy, a skill workbench review or the final synthesis explicitly needs that output.

## Final Report Quality Bar

The final `.analysis/llm/analysis-document.json` must include:

- `analysis_document.sections[]` as the complete visible report structure.
- `analysis_document.requirements_trace[]` with explicit `goal_contract_refs[]`, evidence or open questions.
- `analysis_document.report_quality_review` with reviewer `codex_llm`, verdict `decision_ready`, `partial` or `not_ready`, and all required quality checks.
- `analysis_document.executive_decision_basis` plus a visible executive/decision section that answers keep/modernize/replace/cost/risks/next actions before technical drilldown.
- `analysis_document.consistency_review` with reviewer `codex_llm`, `contradictions_found`, and either zero contradictions or explicit contradiction details.
- `analysis_document.open_questions[]` as a first-class uncertainty artifact. Use an empty array only after checking for unresolved proof gaps; blocking questions prevent decision-ready status.
- Semantic lineage for major visible findings, recommendations, decisions and source-family claims. Prefer item-level `semantic_lineage` or top-level `analysis_document.semantic_lineage[]` that links the claim to its report section, upstream source-tier/skill/detail review artifacts and file:line evidence.
- Evidence or explicit uncertainty for findings, decisions, roadmap items, flow steps, boundary/interface entries and source-family statements.
- Visible path:line evidence navigation for major claims; use `evidence` or `evidence_refs` arrays so the renderer can show clickable proof chips.
- Confidence for major visible findings, recommendations, decisions and source-family claims. The CLI computes evidence strength from evidence-reference count and reports weak support.
- If `.analysis/external_findings/*.json` exists, treat those scanner/tool outputs as external evidence inputs only. Preserve `source_tool`, `authority`, severity/type/message and file:line evidence; the source tool remains authority for scanner facts while Codex synthesizes decision impact.
- Request/response, OpenAPI/Swagger, SOAP/WSDL/XSD, Mermaid and business examples wherever present or defensibly inferred; inferred examples must use `example_origin: "inferred"`.

Do not modify production source files unless the user explicitly asks for repository code changes.

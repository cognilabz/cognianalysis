# Cognianalysis

An agent-harness-compatible, **LLM-first source-code analysis library** for source-code repositories.

This package is **not a coding agent** and **not a proprietary scanner**. Codex, Claude Code, Cursor, Windsurf/Devin Desktop, GitHub Copilot, Aider or another existing agent harness performs the semantic extraction. The TypeScript/Node CLI prepares repository context, creates evidence-friendly task files, validates file:line references, writes artifact/provenance matrices and renders an interactive static HTML report.

## What changed in v0.7

The normal flow no longer requires users to run `cognianalysis aggregate`, `cognianalysis coverage`, `cognianalysis render`, `cognianalysis validate` or the staged Tier/debug commands manually. Those commands still exist for debugging and CI under `cognianalysis dev ...`, but the intended product-mode entrypoint is now:

```bash
cognianalysis analyze . --goal "Create a decision document for this repository."
cognianalysis status .
cognianalysis open .
```

`analyze` prepares the workspace when needed, records the product request in `.analysis/data/product-analysis-request.json`, points the agent harness at the single `.analysis/TASK.md` guide while required LLM artifacts are missing, and finalizes the report when `.analysis/llm/*.json` is ready. It accepts `--mode brief|blueprint|deep-dive` so the default can stay decision-oriented while deeper source review happens only when a flow, module, API, risk or rebuild decision needs it. `dev finalize` remains the explicit CI/debug command for aggregation, validation and rendering after the agent harness has written the LLM artifacts.

`analyze` and `dev prepare` also accept deliberate scope modes: `--scope complete`, `--scope critical-path` or `--scope representative`, with `--scope-files N` for the non-complete modes. The scope decision is persisted to `.analysis/data/analysis-scope.json`. `complete` is the whole included source inventory; non-complete modes are intentionally decision-limited and require the final report to disclose the selected/deferred file counts and confidence impact.

`resume` detects an existing `.analysis` workspace, prints completed product stages as skipped, and continues the same product-mode loop. `status` is the product-language progress view: repository indexed, analysis scope, current-commit freshness, analysis strategy, repository coverage, functional model, technical model, refactoring assessment, executive decision layer, consistency review, structured open questions and decision-report readiness. `repair` rebuilds task guides/manifests, detects broken JSON and writes `.analysis/data/repair-report.json` without requiring manual cleanup.

The visible report is authored through `analysis_document.sections`, `requirements_trace` and `report_quality_review` by the LLM. `analysis_document.sections[]` is the complete visible report navigation and start order. The TypeScript renderer supplies the component library, styling, Mermaid rendering and evidence validation; it does not add a fixed start page, fixed report appendices or deterministic empty-state prose. Component blocks may carry LLM-authored `labels` so repository-specific wording can drive table headers and group labels without changing the style system. Deterministic code-map, coverage, synthesis and authority artifacts remain embedded audit data, but they are not injected as fixed human-report pages or deterministic report prose. The CLI does not judge whether the prose is "good" or management-ready; it requires the LLM to make that semantic judgment explicitly in `requirements_trace` and `report_quality_review`. Empty sections or blocks are treated only as renderer-contract gaps so the LLM must author real content or an explicit open question.

The generated bundle includes a `semantic_authority` audit section. It records that the LLM is the semantic decider, that the final verdict comes from `analysis_document.report_quality_review.verdict`, and that deterministic artifacts such as `code-map.json`, source capsules and source-family inventories are navigation aids only. `source-family-inventory.json` is a legacy workflow filename for mechanical navigation partitions; the LLM must decide whether to rename, merge, split, reject or defer those partitions as real repository-specific source families. The visible report does not inject this as fixed prose; if that boundary matters to readers, the LLM should author it as a repository-specific report section.

The bundle also includes the compatibility field `final_llm_readiness`. This is a centralized Codex-authored analysis readiness contract used by the CLI and optional MCP bridge. It blocks finalization when the Codex-authored report review is `partial` or `not_ready`, when required pre-final/detail-review artifacts are stale, when the prepared analysis commit no longer matches the current repository commit, when a `decision_ready` review does not explicitly justify `partial`/`open` requirements through `report_quality_review.partial_requirement_rationale[]`, when the executive decision layer is missing, when the Codex-authored consistency review is missing or reports contradictions, when `analysis_document.open_questions[]` is missing/malformed or contains blocking questions, or when major findings/recommendations/decisions lack confidence/support. This is not an external-provider health check and it does not infer semantic quality from keywords, menus, classes, functions or component presence.

The generated workspace includes `data/analysis-goal-contract.json`. It preserves the original objective, required output shape, management/business-need narrative with technical drilldown, four analysis levels, functional/technical views, whole-repo-first behavior, detail-agent sequencing and tool-positioning requirement as LLM context. The final report must explicitly link its LLM-authored `requirements_trace[].goal_contract_refs` to those goal IDs. That reference check is shape/provenance only, not a semantic-quality gate; the final status remains LLM-authored through `requirements_trace`, `report_quality_review` and `final_llm_readiness`.

Tool comparison context is materialized in `data/tool-positioning-references.json`. It contains official public reference categories for consulting/gen-AI delivery suites, structural architecture mapping, static quality/security gates and automated transformation engines. The artifact frames LLM-authored positioning against tools such as Accenture GenWizard, CAST Imaging, SonarQube and OpenRewrite; it is not repository evidence and does not decide readiness.

## Implementation

The implementation is TypeScript, not Python.

```text
src/                         TypeScript source
  cli.ts                     cognianalysis command line interface
  repoMap.ts                 inventory-only code map and source capsules
  tasks.ts                   LLM task generation
  aggregate.ts               JSON aggregation and evidence validation
  targetCoverage.ts          target capability context for LLM traceability
  report.ts                  interactive static HTML renderer
  mcp.ts                     optional stdio-style tool bridge

dist/                        compiled JavaScript used by the cognianalysis binary
resources/                   source templates for AGENTS.md and .agents/skills assets
schemas/                     JSON schema/example assets
examples/demo-repo           runnable demo repository
```

The runtime uses Node built-ins only. TypeScript is only required when rebuilding from source.

## Harness And Skill Layout

There are three different instruction layers:

| Layer | Purpose | Source of truth |
|---|---|---|
| Harness adapters | Tool-native instruction files copied by `cognianalysis init-harness .` | `resources/AGENTS.md` plus generated adapter wrappers |
| Codex agent skills | Codex-native entrypoints and reusable runbooks copied by `cognianalysis init-harness . --harness codex` or `cognianalysis init-codex .` | `resources/agents/skills/*/SKILL.md` |
| LLM analysis skills | Fine-grained reusable capabilities used inside generated analysis tasks | `src/analysisSkills.ts` and `.analysis/data/analysis-skill-catalog.json` |

The repository tracks the reusable templates under `resources/`. A root `.agents/` directory is an installed/local harness output for a target checkout and is ignored here to avoid duplicating those templates.

The only end-to-end workflow entrypoint is `cognianalysis`. In Codex it is a skill; in other harnesses it is the instruction file/workflow they should execute. It owns prepare, Tier 1 file cards, LLM-planned skill workbenches, building-block extraction, detail planning, final report authoring, HTML rendering, finalization and audit.

The companion Codex-style skills are intentionally narrow workbench prompts:

| Skill/runbook | Internal catalog alignment |
|---|---|
| `business-extraction` | `business_extraction`, `domain_data_integration_analysis` |
| `interface-contract-analysis` | `interface_contract_analysis`, `request_response_examples` |
| `flow-mermaid-analysis` | `flow_mermaid_analysis` |

The internal catalog remains more granular because it is used for LLM planning, requirement traceability and report completeness. It is not a list of separate agent entrypoints.

## Target picture

The goal is not only documentation generation. The pack is designed to produce a **decision-grade codebase understanding** with these target capabilities:

| Target capability | How it is addressed |
|---|---|
| Existing harness execution | Harness-native instruction files + CLI, no custom coding agent |
| LLM-first semantic extraction | Codex, as the active in-session LLM, performs meaning extraction; CLI prepares context and validates output |
| LLM-authored analysis strategy | `00-analysis-strategy.md` and `llm/analysis-strategy.json` define the repo-specific source slices, skill use, Tier 1/deep-dive plan and report intent before optional capability templates are considered |
| Non-authoritative code map | Signals are broad navigation hints, never final entrypoint facts |
| Whole-codebase source inventory accounting | `source-inventory.json`, `analysis_coverage`, embedded audit data and the `cognianalysis dev finalize` inventory-accounting contract. Deferred files stay visible as gaps and do not count as completed analysis. |
| Tiered whole-codebase analysis | `.analysis/source_tier_tasks/*.md` and `.analysis/source_tiers/*.json` create mandatory Tier 1 LLM-authored file cards for every included file before Tier 2-4 module, behavior, quality and refactoring depth is selected. |
| Deliberate large-repo scope strategy | `analyze`/`dev prepare --scope complete|critical-path|representative`, `--scope-files N` and `.analysis/data/analysis-scope.json`; non-complete scope is disclosed with deferred-file count and confidence impact instead of pretending to be whole-repo complete. |
| LLM-planned skill workbenches | `analysis_strategy.skill_application_plan[]` is materialized into `.analysis/skill_workbench_tasks/*.md`; executed `.analysis/skill_reviews/*.json` are synthesized by the final report |
| Whole-repository overview first | LLM-planned skill workbenches, Tier 1 file cards, source-family inventory context and LLM-authored source-family sections |
| LLM-authored visible report | `12-analysis-document.md`, required workflow artifacts, executed skill/detail reviews, `analysis_document.sections[]`, `analysis_document.report_quality_review`, component renderer, `report_mode.llm_authored` and `report_mode.final_synthesis_ready` |
| Product status, resume and recovery | `cognianalysis status`, `cognianalysis resume`, `cognianalysis repair`, `.analysis/data/repair-report.json` and product-language next-action output |
| Freshness detection | `.analysis/data/analysis-staleness.json`, status/doctor/audit output and readiness blocking when a prepared analysis no longer matches the current commit |
| Management/business narrative with drilldown | `required_output_shape.management_drilldown`, LLM-authored visible sections with business need, business use and technical/deep technical drilldown |
| Executive decision layer | `analysis_document.executive_decision_basis`, a visible executive/decision section and explicit keep/modernize/replace/cost/risk/next-action answers |
| Management-ready report quality review | LLM-authored `report_quality_review` decides repo-specific structure, whole-repo-first understanding, E2E relationships, functional/technical views, four-level coverage, improvement/refactoring coverage, tool positioning and evidence/uncertainty handling |
| Consistency and contradiction review | LLM-authored `analysis_document.consistency_review`, deterministic presence/count contract and readiness blocking when contradictions remain |
| Structured open questions | `analysis_document.open_questions[]`, `.analysis/data/analysis-document-open-questions.json`, blocking-question readiness gates and visible `open_questions` report blocks when unresolved uncertainty remains |
| Evidence strength and confidence | Deterministic `analysis_document_evidence_strength` scoring for major visible claims plus required confidence or explicit uncertainty |
| Evidence navigation UX | Visible path:line evidence chips on report claims that jump to the validated evidence rows; `evidence` and `evidence_refs` are both supported |
| Semantic authority provenance | `semantic_authority` states that semantic readiness is LLM-authored and the CLI only validates deterministic contracts |
| Four-level analysis model | `analysis_document.requirements_trace[]` and the LLM-authored quality review judge reverse engineering/documentation, code analysis, process analysis and refactoring/target architecture |
| Original requirements trace contract | `analysis_document_requirements_trace_contract` checks only that an LLM-authored trace is structured with requirement names, LLM statuses, section links and evidence/open questions; `analysis_goal_trace_alignment` checks only explicit `goal_contract_refs` syntax against `analysis-goal-contract.json`, including output shape, levels, views and report behaviors; the LLM verdict decides semantic readiness |
| Detail-agent plan before final report | `11-detail-agent-plan.md`, `llm/detail-agent-plan.json` and materialized `.analysis/detail_tasks/*.md` |
| Detail-agent synthesis freshness | LLM-authored detail plan, `.analysis/detail_reviews/*.json`, `analysis_document.detail_review_synthesis` and `analysis_document_detail_review_synthesis.complete` |
| LLM-driven analysis pipeline | `analysis-pipeline.json` records the intended whole-repo-first, detail-agent, final-report order and the CLI/LLM authority boundary |
| Skill-based analysis | `analysis-skill-catalog.json` exposes reusable LLM analysis skills; the LLM chooses and applies them per repository through materialized skill workbench tasks |
| Business capabilities | LLM-selected business extraction skill/template output and LLM-authored capability/business sections |
| Functional view | LLM-authored functional flow sections derived from Tier 1, skill reviews, optional template outputs and source evidence |
| Business logic | Validations, decisions, calculations, authorization, state transitions and examples |
| Interfaces and contracts | LLM-selected interface/contract skill/template output and LLM-authored interface/contract sections |
| Request/response examples | LLM-selected example extraction skill/template output and examples embedded in LLM-authored sections |
| OpenAPI / Swagger | LLM-selected contract extraction output, with OpenAPI/Swagger data available to authored technical sections when present |
| SOAP / WSDL / XSD | LLM-selected contract extraction output, with SOAP envelope examples and contract metadata available to authored technical sections when present |
| Technical view | APIs, interfaces, architecture, data stores and integrations |
| Mermaid flows | LLM-selected flow analysis output and `flow` component blocks with safe Mermaid source rendering |
| Domain/data/integrations | LLM-selected domain/data/integration output and LLM-authored domain/data/integration sections |
| Architecture assessment | LLM-selected architecture/refactoring output and LLM-authored architecture sections |
| Process/readiness assessment | LLM-selected process/quality output and LLM-authored process/readiness sections |
| Bugs, vulnerabilities and quality findings | Process and architecture tasks, LLM-authored findings/risk sections |
| Structured decision basis | LLM-authored decision sections with recommendations, trade-offs and readiness |
| Refactoring/modernization roadmap | LLM-selected architecture/refactoring output and LLM-authored `roadmap` blocks |
| Target architecture / new tech stack | LLM-selected architecture/refactoring output, target architecture and modernization target state |
| Tool alternative positioning | LLM-authored positioning against consulting/gen-AI delivery suites, structural architecture mapping, static quality/security gates and automated transformation engines, with automation strengths and handoff boundaries |
| Evidence-first governance | `cognianalysis dev finalize`, embedded evidence index and validated file:line references |
| Interactive static HTML report | `cognianalysis dev finalize`, LLM-authored sections rendered through the stable component library |
| Portfolio mode | `cognianalysis dev portfolio --repos repos.txt --out portfolio-analysis` |
| Harness portability | `init-harness`, portable `AGENTS.md`, tool-native instruction files, CLI and optional `cognianalysis mcp` bridge |

The target picture is represented directly in the tool as unscored LLM trace context. `cognianalysis dev finalize .` writes the target rows into the embedded audit data so the LLM-authored `requirements_trace` can reference the original goal without the CLI deciding whether any target is satisfied.

Target rows are not scored as `present`, `partial`, `missing` or `covered` by the CLI. They preserve capability IDs, descriptions and expected-output hints for LLM authoring only. The deterministic layer checks artifact shape, explicit goal-reference shape, evidence references, prerequisite order, inventory accounting and renderer compatibility, including that LLM-authored report blocks contain renderable fields or evidence. The LLM controls completeness, documentation quality and decision readiness through `requirements_trace` and `report_quality_review`.

## Language policy

All generated tasks, skill instructions, JSON field descriptions and report UI labels are written in English. The analyzed repository can use any natural language; extracted business terms should preserve their original names when they are domain-specific.

## Installation

Use the included compiled JavaScript directly:

```bash
node dist/cli.js --help
```

Or install the CLI from the unpacked folder:

```bash
npm install -g .
cognianalysis --help
```

To rebuild from TypeScript source:

```bash
npm install
npm run build
```

## Harness Setup

Install the CLI once, then install harness instructions into each target repository.

For the broadest setup, from the target repository run:

```bash
cognianalysis init-harness . --harness all
```

For a single harness:

```bash
cognianalysis init-harness . --harness claude
cognianalysis init-harness . --harness cursor
cognianalysis init-harness . --harness windsurf
cognianalysis init-harness . --harness copilot
cognianalysis init-harness . --harness aider
cognianalysis init-harness . --harness codex
```

`init-codex` is still supported as a compatibility alias for existing Codex users:

```bash
cognianalysis init-codex .
```

The installer writes portable shared instructions first, then adds harness-native adapter files:

| Harness | Files written |
|---|---|
| Portable/default | `AGENTS.md`, `.agents/skills/*`, `COGNIANALYSIS_HARNESS.md` |
| Codex | `AGENTS.md`, `.agents/skills/*` |
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursor/rules/cognianalysis/RULE.md` |
| Windsurf/Devin Desktop | `.devin/rules/cognianalysis.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Aider | `CONVENTIONS.md`, `.aider.conf.yml` |

Existing files are kept unless `--force` is passed. Use `--no-skills` when you only want instruction files and not the `.agents/skills` runbooks.

For harnesses that support MCP, you can also configure a stdio MCP server that runs:

```bash
cognianalysis mcp
```

That bridge exposes deterministic prepare/finalize/audit/report tooling. It still does not replace the LLM extraction step.

## Recommended Harness Flow

From the target repository, install the harness assets once if the repository does not already contain them:

```bash
cognianalysis init-harness . --harness all
```

Then start your harness and use the minimal prompt. In Codex:

```text
Use the cognianalysis skill.
```

In other harnesses, ask it to follow `AGENTS.md`, `CLAUDE.md`, the Cursor/Windsurf/Copilot/Aider adapter file, or `COGNIANALYSIS_HARNESS.md`.

The main workflow is responsible for the full sequence:

1. run `cognianalysis analyze .` when `.analysis/llm_tasks/` does not exist,
2. execute `00-analysis-strategy.md` and write `llm/analysis-strategy.json` so the LLM owns the repo-specific analysis plan,
3. execute every `.analysis/source_tier_tasks/*.md` task and write `.analysis/source_tiers/*.json` so every included file has a Tier 1 LLM-authored file card,
4. run `cognianalysis dev finalize . --allow-partial` to materialize `.analysis/skill_workbench_tasks/*.md` from `analysis_strategy.skill_application_plan[]`, then execute those tasks into `.analysis/skill_reviews/*.json`,
5. optionally execute `.analysis/capability_templates/01-*.md` through `10-*.md` only when the LLM strategy, a skill review or final synthesis explicitly needs that output shape,
6. execute `11-detail-agent-plan.md`, then run `cognianalysis dev finalize . --allow-partial` to materialize `.analysis/detail_tasks/*.md`,
6. execute every materialized detail task and write `.analysis/detail_reviews/*.json`,
7. execute `12-analysis-document.md` only after the analysis strategy, Tier 1 file cards, skill reviews and detail reviews exist,
8. run `cognianalysis analyze .` and `cognianalysis dev audit-report .`,
9. fix missing strategy, missing Tier 1 file cards, invalid evidence references or LLM-authored report gaps if finalization/audit reports any.

You should not need to paste the long checklist manually. It is embedded in the installed harness instructions and in the generated task files.

Open the final report here:

```text
.analysis/report/index.html
```

## CLI-Only Flow

The CLI cannot perform the semantic LLM extraction by itself. For a manual or custom-harness flow, use the same staged flow:

In Codex, the semantic LLM executor is Codex itself in the current session. There is no direct LLM API call, API credential gate or external service state. If evidence is thin, Codex still authors the requested artifact and records uncertainty, open questions or a partial/not_ready quality verdict.

```bash
cognianalysis analyze .
# Fill .analysis/source_tiers/*.json for every .analysis/source_tier_tasks/*.md batch.
cognianalysis dev tier-status .   # show exactly which Tier 1 batches are still missing/partial/invalid.
cognianalysis dev tier-next . --limit 1 --max-chars 6000
# Codex reads the generated .analysis/source-tier-next.md workpack and
# .analysis/source_tier_contexts/*.json source excerpts, then writes the
# requested .analysis/source_tiers/*.json output directly.
# Run finalize --allow-partial after analysis-strategy + Tier 1 to materialize skill_workbench_tasks.
# Fill .analysis/skill_reviews/*.json from skill_workbench_tasks.
# Optionally fill .analysis/llm/*.json from capability_templates only when selected by the LLM strategy or synthesis.
# Fill .analysis/llm/detail-agent-plan.json.
cognianalysis dev finalize . --allow-partial
# Fill every materialized .analysis/detail_reviews/*.json.
# Then author .analysis/llm/analysis-document.json as the final synthesis
# with analysis_document.synthesis_stage="final_after_detail_reviews".
cognianalysis analyze .
cognianalysis dev audit-report .
```

`cognianalysis dev finalize .` expects complete Tier 1 source-file coverage plus an LLM-authored `analysis_document` with `synthesis_stage: "final_after_detail_reviews"`, a structured LLM-authored `requirements_trace` artifact, explicit `goal_contract_refs` to the original goal contract, and `report_quality_review.verdict: "decision_ready"` after required workflow artifacts exist, LLM-planned skill workbenches are executed/synthesized, planned detail reviews are executed, and those reviews are synthesized unless `--allow-partial` is passed. Optional capability-template outputs are incorporated when the LLM deliberately produced them; they are not a fixed readiness gate. The CLI does not use a fixed requirements checklist to decide semantic completeness. Without the LLM-authored final document, the rendered HTML is an explicit pending page rather than a generated substitute report.

`cognianalysis dev finalize .` performs the complete deterministic finishing step:

```text
aggregate .analysis/llm/*.json
validate file:line evidence
validate Tier 1 source-file card coverage
validate whole-codebase source inventory accounting
write unscored target capability context for LLM traceability
render .analysis/report/index.html
write .analysis/data/bundle.json
write .analysis/data/evidence.json
write .analysis/data/source-inventory.json
write .analysis/data/source-inventory-accounting.json
write .analysis/data/source-tier-backlog.json
write .analysis/data/target-artifact-contract-coverage.json
write .analysis/data/analysis-scope.json
write .analysis/data/analysis-staleness.json
```

## Generated LLM tasks

`cognianalysis analyze .` creates required workflow tasks and optional capability templates when the workspace has not been prepared yet:

```text
source_tier_tasks/*.md
00-analysis-strategy.md
11-detail-agent-plan.md
12-analysis-document.md
capability_templates/01-core-assessment.md
capability_templates/02-business-capabilities-logic.md
capability_templates/03-interface-contract-extraction.md
capability_templates/04-request-response-examples.md
capability_templates/05-openapi-soap-graphql.md
capability_templates/06-flows-mermaid.md
capability_templates/07-domain-data-integrations.md
capability_templates/08-process-quality-readiness.md
capability_templates/09-architecture-refactoring-roadmap.md
capability_templates/10-report-completeness-review.md
```

The tasks explicitly require Codex, as the active in-session LLM, to extract, wherever present or defensibly inferable:

- business capabilities, actors, domain terms and use cases
- business rules, validations, calculations, decisions, authorization behavior, status transitions and error behavior
- business logic examples
- function and use-case examples with input, output and explanation
- HTTP, REST, OpenAPI/Swagger, SOAP/WSDL/XSD, GraphQL, events, jobs, CLI commands, UI routes and external interfaces
- request fields, response fields, headers, statuses, errors, faults and payload examples
- OpenAPI / Swagger operations, schemas and examples when present
- SOAP / WSDL / XSD operations, messages, faults, SOAP actions and SOAP envelope examples when present
- Mermaid diagrams for every meaningful business or technical flow
- data model, data stores, persistence side effects and state changes
- external systems, integrations, queues, topics and messages
- architecture responsibilities and maintainability observations
- tests, CI/CD, release, observability and process-readiness findings
- refactoring and modernization options
- LLM-authored trace gaps and open questions
- whole-codebase source inventory accounting through `analysis_coverage.inspected_files[]`; `analysis_coverage.deferred_files[]` is visible as incomplete follow-up, not done work
- Tier 1 file cards for every included file, then Tier 2-4 technical drilldown for important source families, flows, contracts, risks and refactoring decisions
- file:line evidence for every relevant claim

If an example is inferred rather than copied from source documentation, tests or contracts, it must use:

```json
"example_origin": "inferred"
```

and include evidence for the fields, rules and behavior used to construct it.

## Generated workspace

```text
.analysis/
  data/repo-profile.json          repository profile
  data/source-inventory.json      full included file inventory and skipped large files
  data/analysis-scope.json        selected scope mode, selected/deferred file counts and confidence impact
  data/analysis-staleness.json    prepared commit vs current commit freshness contract
  data/analysis-goal-contract.json original objective preserved as LLM context, not a readiness gate
  data/analysis-goal-trace-alignment.json explicit LLM goal refs, shape-only
  data/tool-positioning-references.json official external tool context, not repo evidence
  data/code-map.json              broad navigation map; tags, scores and candidates are not semantic proof
  data/interface-signals.json     compatibility artifact; expected empty because the LLM parses interfaces/contracts from source
  data/navigation-artifact-candidates.json inventory-ranked seed files for LLM navigation only, not contract/example detection
  data/important-docs.json        legacy alias for navigation-artifact-candidates.json
  data/report-component-library.json stable renderer/style component contract for the LLM-authored report
  data/analysis-skill-catalog.json reusable LLM analysis skills and authority boundary
  data/source-tier-model.json      Tier 0-4 whole-codebase analysis model
  TASK.md                         single human-facing product-mode task guide
  source-tier-task-manifest.json   executable Tier 1 file-card task manifest
  source_tier_tasks/*.md           Tier 1 per-file LLM analysis tasks
  source_tiers/*.json              Tier 1 file-card outputs written by Codex, as the active in-session LLM
  skill_workbench_tasks/*.md       Strategy-planned skill workbench tasks
  skill_reviews/*.json             Skill workbench outputs written by Codex, as the active in-session LLM
  capability-template-manifest.json optional generic capability template manifest
  capability_templates/*.md        optional output-shape templates, not fixed mandatory tasks
  data/source-tier-coverage.json   Tier 1 file-card coverage contract
  source-capsules.json            source excerpts that help the harness decide what to open
  llm_instructions.md             repository-specific extraction rules
  analysis-pipeline.json          LLM-driven overview/detail/final-report pipeline and authority boundary
  llm_tasks/*.md                  required LLM workflow task files
  llm/*.json                      semantic extraction outputs written by Codex, as the active in-session LLM
  llm/detail-agent-plan.json      LLM-authored plan for pre-report detail reviews
  llm/analysis-document.json      final LLM-authored visible report structure
  data/source-family-inventory.json deterministic navigation partitions, not semantic source-family proof
  data/analysis-document-report-lint.json deterministic report support/shape lint, not semantic usefulness scoring
  data/analysis-document-executive-decision-layer.json executive decision contract
  data/analysis-document-consistency-review.json LLM contradiction-review contract
  data/analysis-document-evidence-strength.json confidence/support signal for major report claims
  data/analysis-document-open-questions.json structured uncertainty and blocking-question contract
  data/repair-report.json          repair/recovery diagnostics when `cognianalysis repair` is run
  detail_tasks/*.md               source-family specialist tasks materialized from the LLM detail plan
  detail_reviews/*.json           executed source-family detail reviews
  data/bundle.json                aggregated report dataset
  bundle field final_llm_readiness centralized Codex-authored analysis readiness contract in the bundle
  data/evidence.json              validated evidence index
  data/target-coverage.json       compatibility name for unscored target capability context
  data/target-artifact-contract-coverage.json unscored target capability context
  report/index.html               interactive static HTML report
  report/analysis-data.json       report data for further tooling
```

## CLI commands

Normal commands:

```bash
cognianalysis analyze .       # product-mode loop: prepare, show missing LLM artifacts, or finalize when ready
cognianalysis analyze . --goal "Assess whether this service should be rebuilt."
cognianalysis analyze . --mode brief
cognianalysis analyze . --mode blueprint --goal "Plan a Spring Boot 3 + React migration."
cognianalysis analyze . --mode deep-dive --goal "Inspect the billing flow before rebuild."
cognianalysis analyze . --scope complete
cognianalysis analyze . --scope critical-path --scope-files 1200
cognianalysis analyze . --scope representative --scope-files 400
cognianalysis resume .        # continue an existing analysis and print skipped/completed stages
cognianalysis status .        # product-language progress, readiness and next action
cognianalysis repair .        # rebuild task/manifests and report malformed or stale outputs
cognianalysis open .          # print the rendered report path and browser URL
cognianalysis init-harness .  # install AGENTS.md, .agents/skills and common harness adapter files
cognianalysis init-codex .    # compatibility alias for Codex-only assets
cognianalysis mcp             # optional stdio-style bridge for prepare/finalize/audit-report contract tools
```

Debug/CI commands:

```bash
cognianalysis dev prepare .       # build code map, source capsules and LLM task files
cognianalysis dev finalize .      # aggregate, validate contracts and render the HTML report
cognianalysis dev audit-report .  # return non-zero if the visible report is not Codex-authored/current
cognianalysis dev tier-status .   # print Tier 1 task completion/backlog and next missing batches
cognianalysis dev tier-next .     # create a Codex workpack plus source_tier_contexts/*.json for the next missing Tier 1 batches
cognianalysis dev aggregate .     # merge .analysis/llm/*.json into .analysis/data/bundle.json
cognianalysis dev coverage .      # print target context, Tier 1 coverage and source inventory accounting
cognianalysis dev render .        # render .analysis/report/index.html
cognianalysis dev validate .      # validate file:line evidence references
cognianalysis dev doctor . --market-proof --strict
cognianalysis dev portfolio --repos repos.txt --out portfolio-analysis
cognianalysis run .               # compatibility alias for the product-mode loop
cognianalysis prepare .           # compatibility alias for dev prepare
cognianalysis finalize .          # compatibility alias for dev finalize
```

The direct compatibility aliases remain available for existing automation, but new users should start with `analyze`, `status` and `open`.

For the bundled demo, the regression gate is:

```bash
npm run verify:demo
npm run verify:llm-boundary
npm run verify:golden
npm run verify:baseline
```

`verify:demo` runs the positive demo flow plus negative regressions: if `llm/detail-agent-plan.json` is removed, if a pre-final building-block output such as `llm/flows-mermaid.json` is missing, if the final Codex-authored `report_quality_review` is absent, if the Codex-authored review verdict is `partial`, if a `decision_ready` Codex-authored review omits accepted-limitation rationale for `partial`/`open` requirements, if the structured Codex-authored LLM requirements trace artifact is missing, if the executive decision layer/consistency review/evidence-strength artifacts are incomplete, or if deterministic no-seed fallbacks create scored semantic target rows, `cognianalysis dev audit-report`/verification must block readiness. A repo-specific trace vocabulary, repo-specific report-quality review vocabulary and visible business-need/business-use narrative fields must pass when the artifacts are structured and the Codex-authored quality verdict is decision-ready.

`verify:llm-boundary` is the fast guard for the LLM-first product line. It checks that runtime code still exposes inventory-only maps, unscored target context, LLM-owned semantic verdicts and deterministic artifact contracts, and that hardcoded semantic/report shortcuts do not reappear in runtime source.

`verify:golden` runs the golden benchmark protocol described in `docs/BENCHMARK.md`. It discovers `benchmarks/golden/**/*.expected.json`, scores expected fact recall, evidence precision, unsupported-claim rate, decision readiness and report completeness, and writes `benchmarks/golden/results.json`. This is proof scaffolding, not a market-superiority claim.

`verify:baseline` checks externally or manually generated baseline comparison artifacts under `benchmarks/baseline/**/*.baseline.json`. It fails until required raw-agent and scanner-style baselines are present.

## Portfolio mode

Prepare report workspaces for many local repositories:

```bash
cognianalysis dev portfolio --repos repos.txt --out portfolio-analysis
```

`repos.txt` contains one local repository path per line.

## Design principle

The CLI prepares context. Codex, as the active in-session LLM, extracts meaning. `cognianalysis dev finalize` presents and validates the result. Signals from the code map are navigation hints only; they are never final facts by themselves.

# Codebase Analysis Pack v0.6 TypeScript

A Codex-compatible, **LLM-first codebase understanding pack** for source-code repositories.

This package is **not a coding agent** and **not a proprietary scanner**. Codex or another existing agent harness performs the semantic extraction. The TypeScript/Node CLI prepares repository context, creates evidence-friendly task files, validates file:line references, writes artifact/provenance matrices and renders an interactive static HTML report.

## What changed in v0.6

The normal flow no longer requires users to run `cba aggregate`, `cba coverage`, `cba render` and `cba validate` manually. Those commands still exist for debugging and CI, but the intended end-to-end finalization command is now:

```bash
cba finalize .
```

The main Codex skill uses this command after it has written `.analysis/llm/*.json`.

The visible report is authored through `analysis_document.sections`, `requirements_trace` and `report_quality_review` by the LLM. `analysis_document.sections[]` is the complete visible report navigation and start order. The TypeScript renderer supplies the component library, styling, Mermaid rendering and evidence validation; it does not add a fixed start page, fixed report appendices or deterministic empty-state prose. Component blocks may carry LLM-authored `labels` so repository-specific wording can drive table headers and group labels without changing the style system. Deterministic code-map, coverage, synthesis and authority artifacts remain embedded audit data, but they are not injected as fixed human-report pages or deterministic report prose. The CLI does not judge whether the prose is "good" or management-ready; it requires the LLM to make that semantic judgment explicitly in `requirements_trace` and `report_quality_review`. Empty sections or blocks are treated only as renderer-contract gaps so the LLM must author real content or an explicit open question.

The generated bundle includes a `semantic_authority` audit section. It records that the LLM is the semantic decider, that the final verdict comes from `analysis_document.report_quality_review.verdict`, and that deterministic artifacts such as `code-map.json`, source capsules and source-family inventories are navigation aids only. `source-family-inventory.json` is a legacy workflow filename for mechanical navigation partitions; the LLM must decide whether to rename, merge, split, reject or defer those partitions as real repository-specific source families. The visible report does not inject this as fixed prose; if that boundary matters to readers, the LLM should author it as a repository-specific report section.

The bundle also includes `final_llm_readiness`. This is a centralized contract used by the CLI and optional MCP bridge. It blocks finalization when the LLM-authored report review is `partial` or `not_ready`, when required pre-final/detail-review artifacts are stale, or when a `decision_ready` review fails to explicitly justify `partial`/`open` requirements through `report_quality_review.partial_requirement_rationale[]`. It does not infer quality from keywords, menus, classes, functions or component presence.

The generated workspace includes `data/analysis-goal-contract.json`. It preserves the original objective, required output shape, management/business-need narrative with technical drilldown, four analysis levels, functional/technical views, whole-repo-first behavior, detail-agent sequencing and tool-positioning requirement as LLM context. The final report must explicitly link its LLM-authored `requirements_trace[].goal_contract_refs` to those goal IDs. That reference check is shape/provenance only, not a semantic-quality gate; the final status remains LLM-authored through `requirements_trace`, `report_quality_review` and `final_llm_readiness`.

Tool comparison context is materialized in `data/tool-positioning-references.json`. It contains official public reference categories for consulting/gen-AI delivery suites, structural architecture mapping, static quality/security gates and automated transformation engines. The artifact frames LLM-authored positioning against tools such as Accenture GenWizard, CAST Imaging, SonarQube and OpenRewrite; it is not repository evidence and does not decide readiness.

## Implementation

The implementation is TypeScript, not Python.

```text
src/                         TypeScript source
  cli.ts                     cba command line interface
  repoMap.ts                 broad code map and context hints
  tasks.ts                   Codex task generation
  aggregate.ts               JSON aggregation and evidence validation
  targetCoverage.ts          target artifact/contract coverage matrix
  report.ts                  interactive static HTML renderer
  mcp.ts                     optional stdio-style tool bridge

dist/                        compiled JavaScript used by the cba binary
resources/                   AGENTS.md and .agents/skills assets
schemas/                     JSON schema/example assets
examples/demo-repo           runnable demo repository
```

The runtime uses Node built-ins only. TypeScript is only required when rebuilding from source.

## Target picture

The goal is not only documentation generation. The pack is designed to produce a **decision-grade codebase understanding** with these target capabilities:

| Target capability | How it is addressed |
|---|---|
| Existing harness execution | Codex skill + CLI, no custom coding agent |
| LLM-first semantic extraction | Codex performs meaning extraction; CLI prepares context and validates output |
| Non-authoritative code map | Signals are broad navigation hints, never final entrypoint facts |
| Whole-codebase source inventory accounting | `source-inventory.json`, `analysis_coverage`, embedded audit data and the `cba finalize` inventory-accounting contract. This accounts for included files; semantic quality stays with the LLM-authored report review. |
| Whole-repository overview first | `01-core-assessment.md`, source-family inventory context and LLM-authored source-family sections |
| LLM-authored visible report | `12-analysis-document.md`, complete pre-final LLM building blocks, `analysis_document.sections[]`, `analysis_document.report_quality_review`, component renderer, `report_mode.llm_authored` and `report_mode.final_synthesis_ready` |
| Management/business narrative with drilldown | `required_output_shape.management_drilldown`, LLM-authored visible sections with business need, business use and technical/deep technical drilldown |
| Management-ready report quality review | LLM-authored `report_quality_review` decides repo-specific structure, whole-repo-first understanding, E2E relationships, functional/technical views, four-level coverage, improvement/refactoring coverage, tool positioning and evidence/uncertainty handling |
| Semantic authority provenance | `semantic_authority` states that semantic readiness is LLM-authored and the CLI only validates deterministic contracts |
| Four-level analysis model | `analysis_document.requirements_trace[]` and the LLM-authored quality review judge reverse engineering/documentation, code analysis, process analysis and refactoring/target architecture |
| Original requirements trace contract | `analysis_document_requirements_trace_contract` checks only that an LLM-authored trace is structured with requirement names, LLM statuses, section links and evidence/open questions; `analysis_goal_trace_alignment` checks only explicit `goal_contract_refs` syntax against `analysis-goal-contract.json`, including output shape, levels, views and report behaviors; the LLM verdict decides semantic readiness |
| Detail-agent plan before final report | `11-detail-agent-plan.md`, `llm/detail-agent-plan.json` and materialized `.analysis/detail_tasks/*.md` |
| Detail-agent synthesis freshness | LLM-authored detail plan, `.analysis/detail_reviews/*.json`, `analysis_document.detail_review_synthesis` and `analysis_document_detail_review_synthesis.complete` |
| LLM-driven analysis pipeline | `analysis-pipeline.json` records the intended whole-repo-first, detail-agent, final-report order and the CLI/LLM authority boundary |
| Skill-based analysis | `analysis-skill-catalog.json` exposes reusable LLM analysis skills; the LLM chooses and applies them per repository |
| Business capabilities | `02-business-capabilities-logic.md`, LLM-authored capability/business sections |
| Functional view | `01-core-assessment.md`, LLM-authored functional flow sections |
| Business logic | Validations, decisions, calculations, authorization, state transitions and examples |
| Interfaces and contracts | `03-interface-contract-extraction.md`, LLM-authored interface/contract sections |
| Request/response examples | `04-request-response-examples.md`, examples embedded in LLM-authored sections |
| OpenAPI / Swagger | `05-openapi-soap-graphql.md`, contract/example data available to authored technical sections |
| SOAP / WSDL / XSD | `05-openapi-soap-graphql.md`, SOAP envelope examples and contract metadata available to authored technical sections |
| Technical view | APIs, interfaces, architecture, data stores and integrations |
| Mermaid flows | `06-flows-mermaid.md`, `flow` component blocks with safe Mermaid source rendering |
| Domain/data/integrations | `07-domain-data-integrations.md`, LLM-authored domain/data/integration sections |
| Architecture assessment | `09-architecture-refactoring-roadmap.md`, LLM-authored architecture sections |
| Process/readiness assessment | `08-process-quality-readiness.md`, LLM-authored process/readiness sections |
| Bugs, vulnerabilities and quality findings | Process and architecture tasks, LLM-authored findings/risk sections |
| Structured decision basis | LLM-authored decision sections with recommendations, trade-offs and readiness |
| Refactoring/modernization roadmap | Architecture/refactoring task and LLM-authored `roadmap` blocks |
| Target architecture / new tech stack | Architecture/refactoring task, target architecture and modernization target state |
| Tool alternative positioning | LLM-authored positioning against consulting/gen-AI delivery suites, structural architecture mapping, static quality/security gates and automated transformation engines, with automation strengths and handoff boundaries |
| Evidence-first governance | `cba finalize`, embedded evidence index and validated file:line references |
| Interactive static HTML report | `cba finalize`, LLM-authored sections rendered through the stable component library |
| Portfolio mode | `cba portfolio --repos repos.txt --out portfolio-analysis` |
| Harness portability | Skills, CLI and optional `cba mcp` bridge |

The target picture is represented directly in the tool as a diagnostic artifact/contract matrix. `cba finalize .` prints the matrix summary and writes the full matrix into the embedded report audit data.

Target artifact/contract coverage is source-of-output aware: deterministic placeholders, fallback summaries and navigation inventories do not count as business, architecture, process or report understanding. Those target contracts become present only when the corresponding LLM extraction, detail-review or final analysis-document artifact exists. The matrix is not the semantic readiness gate: it shows artifact provenance and gaps. The deterministic layer checks artifact shape, explicit goal-reference shape, evidence references, prerequisite order, inventory accounting and renderer compatibility, including that LLM-authored report blocks contain renderable fields or evidence. The LLM controls completeness, documentation quality and decision readiness through `requirements_trace` and `report_quality_review`.

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
cba --help
```

To rebuild from TypeScript source:

```bash
npm install
npm run build
```

## Recommended Codex flow

From the target repository, install the Codex assets once if the repository does not already contain them:

```bash
cba init-codex .
```

Then start Codex and use the minimal prompt:

```text
Use the codebase-assessment skill.
```

The main skill is responsible for the full workflow:

1. run `cba prepare .` when `.analysis/llm_tasks/` does not exist,
2. execute building-block tasks `01-*` through `10-*` and write `.analysis/llm/*.json`,
3. execute `11-detail-agent-plan.md`, then run `cba finalize . --allow-partial` to materialize `.analysis/detail_tasks/*.md`,
4. execute every materialized detail task and write `.analysis/detail_reviews/*.json`,
5. execute `12-analysis-document.md` only after building blocks and detail reviews exist,
6. run `cba finalize .` and `cba audit-report .`,
7. fix invalid evidence references or LLM-authored report gaps if finalization/audit reports any.

You should not need to paste the long checklist manually. It is already embedded in the main skill and in the generated task files.

Open the final report here:

```text
.analysis/report/index.html
```

## CLI-only flow

The CLI cannot perform the semantic LLM extraction by itself. For a non-Codex/manual flow, use the same staged flow Codex uses:

```bash
cba prepare .
# Fill .analysis/llm/*.json for tasks 01-10 and llm/detail-agent-plan.json.
cba finalize . --allow-partial
# Fill every materialized .analysis/detail_reviews/*.json.
# Then author .analysis/llm/analysis-document.json as the final synthesis
# with analysis_document.synthesis_stage="final_after_detail_reviews".
cba finalize .
cba audit-report .
```

`cba finalize .` expects an LLM-authored `analysis_document` with `synthesis_stage: "final_after_detail_reviews"`, a structured LLM-authored `requirements_trace` artifact, explicit `goal_contract_refs` to the original goal contract, and `report_quality_review.verdict: "decision_ready"` after all pre-final LLM building-block outputs exist, planned detail reviews are executed, and those reviews are synthesized unless `--allow-partial` is passed. The CLI does not use a fixed requirements checklist to decide semantic completeness. Without the LLM-authored final document, the rendered HTML is an explicit pending page rather than a generated substitute report.

`cba finalize .` performs the complete deterministic finishing step:

```text
aggregate .analysis/llm/*.json
validate file:line evidence
validate whole-codebase source inventory accounting
compute the target artifact/contract matrix
render .analysis/report/index.html
write .analysis/data/bundle.json
write .analysis/data/evidence.json
write .analysis/data/source-inventory.json
write .analysis/data/source-inventory-accounting.json
write .analysis/data/target-artifact-contract-coverage.json
```

## Generated LLM tasks

`cba prepare .` creates these task files:

```text
01-core-assessment.md
02-business-capabilities-logic.md
03-interface-contract-extraction.md
04-request-response-examples.md
05-openapi-soap-graphql.md
06-flows-mermaid.md
07-domain-data-integrations.md
08-process-quality-readiness.md
09-architecture-refactoring-roadmap.md
10-report-completeness-review.md
11-detail-agent-plan.md
12-analysis-document.md
```

The tasks explicitly require Codex to extract, wherever present or defensibly inferable:

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
- target artifact/contract gaps
- whole-codebase source inventory accounting through `analysis_coverage.inspected_files[]` and `analysis_coverage.deferred_files[]`
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
  data/analysis-goal-contract.json original objective preserved as LLM context, not a readiness gate
  data/analysis-goal-trace-alignment.json explicit LLM goal refs, shape-only
  data/tool-positioning-references.json official external tool context, not repo evidence
  data/code-map.json              broad navigation map; tags, scores and candidates are not semantic proof
  data/interface-signals.json     broad interface/business/process hints, not final facts
  data/navigation-artifact-candidates.json documentation, contract and example candidates for LLM navigation only
  data/important-docs.json        legacy alias for navigation-artifact-candidates.json
  data/report-component-library.json stable renderer/style component contract for the LLM-authored report
  data/analysis-skill-catalog.json reusable LLM analysis skills and authority boundary
  source-capsules.json            source excerpts that help Codex decide what to open
  llm_instructions.md             repository-specific extraction rules
  analysis-pipeline.json          LLM-driven overview/detail/final-report pipeline and authority boundary
  llm_tasks/*.md                  Codex task files
  llm/*.json                      semantic extraction outputs written by Codex
  llm/detail-agent-plan.json      LLM-authored plan for pre-report detail reviews
  llm/analysis-document.json      final LLM-authored visible report structure
  data/source-family-inventory.json deterministic navigation partitions, not semantic source-family proof
  detail_tasks/*.md               source-family specialist tasks materialized from the LLM detail plan
  detail_reviews/*.json           executed source-family detail reviews
  data/bundle.json                aggregated report dataset
  bundle field final_llm_readiness centralized LLM-readiness contract in the bundle
  data/evidence.json              validated evidence index
  data/target-coverage.json       compatibility name for target artifact/contract coverage
  data/target-artifact-contract-coverage.json target artifact/contract coverage matrix
  report/index.html               interactive static HTML report
  report/analysis-data.json       report data for further tooling
```

## CLI commands

Normal commands:

```bash
cba prepare .       # build code map, source capsules and Codex tasks
cba finalize .      # aggregate, validate, compute coverage and render the HTML report
cba analyze .       # prepare and print the staged LLM workflow; if LLM JSON already exists, attempt finalization
cba audit-report .  # fail if the visible report is not LLM-authored/current
cba init-codex .    # install AGENTS.md and .agents/skills into the repository
cba portfolio --repos repos.txt --out portfolio-analysis
cba mcp             # optional stdio-style bridge for prepare/finalize/audit-report contract commands
```

Debug/CI commands:

```bash
cba aggregate .     # merge .analysis/llm/*.json into .analysis/data/bundle.json
cba coverage .      # print target artifact/contract coverage matrix
cba render .        # render .analysis/report/index.html
cba validate .      # validate file:line evidence references
```

For the bundled demo, the regression gate is:

```bash
npm run verify:demo
```

This runs the positive demo flow plus negative regressions: if `llm/detail-agent-plan.json` is removed, if a pre-final building-block output such as `llm/flows-mermaid.json` is missing, if the final LLM `report_quality_review` is absent, if the LLM review verdict is `partial`, if a `decision_ready` LLM review omits accepted-limitation rationale for `partial`/`open` requirements, if the structured LLM-authored requirements trace artifact is missing, or if deterministic no-seed fallbacks count as semantic target artifact contracts, `cba audit-report`/verification must fail. A repo-specific trace vocabulary, repo-specific report-quality review vocabulary and visible business-need/business-use narrative fields must pass when the artifacts are structured and the LLM quality verdict is decision-ready.

## Portfolio mode

Prepare report workspaces for many local repositories:

```bash
cba portfolio --repos repos.txt --out portfolio-analysis
```

`repos.txt` contains one local repository path per line.

## Design principle

The CLI prepares context. Codex extracts meaning. `cba finalize` presents and validates the result. Signals from the code map are navigation hints only; they are never final facts by themselves.

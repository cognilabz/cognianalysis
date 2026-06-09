# Codebase Analysis Pack v0.6 TypeScript

A Codex-compatible, **LLM-first codebase understanding pack** for source-code repositories.

This package is **not a coding agent** and **not a proprietary scanner**. Codex or another existing agent harness performs the semantic extraction. The TypeScript/Node CLI prepares repository context, creates evidence-friendly task files, validates file:line references, checks target-picture coverage and renders an interactive static HTML report.

## What changed in v0.6

The normal flow no longer requires users to run `cba aggregate`, `cba coverage`, `cba render` and `cba validate` manually. Those commands still exist for debugging and CI, but the intended end-to-end finalization command is now:

```bash
cba finalize .
```

The main Codex skill uses this command after it has written `.analysis/llm/*.json`.

## Implementation

The implementation is TypeScript, not Python.

```text
src/                         TypeScript source
  cli.ts                     cba command line interface
  repoMap.ts                 broad code map and context hints
  tasks.ts                   Codex task generation
  aggregate.ts               JSON aggregation and evidence validation
  targetCoverage.ts          target-picture coverage matrix
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
| Business capabilities | `02-business-capabilities-logic.md`, Business report section |
| Business logic | Validations, decisions, calculations, authorization, state transitions and examples |
| Interfaces and contracts | `03-interface-contract-extraction.md`, Interfaces report section |
| Request/response examples | `04-request-response-examples.md`, Examples report section |
| OpenAPI / Swagger | `05-openapi-soap-graphql.md`, Contracts and Examples sections |
| SOAP / WSDL / XSD | `05-openapi-soap-graphql.md`, SOAP envelope examples and contract metadata |
| Mermaid flows | `06-flows-mermaid.md`, Flows report section |
| Domain/data/integrations | `07-domain-data-integrations.md`, Domain/Data/Integrations section |
| Architecture assessment | `09-architecture-refactoring-roadmap.md`, Architecture section |
| Process/readiness assessment | `08-process-quality-readiness.md`, Process section |
| Quality/risk findings | Process and architecture tasks, Findings section |
| Refactoring/modernization roadmap | Architecture/refactoring task, Refactoring section |
| Evidence-first governance | `cba finalize`, Evidence report section |
| Interactive static HTML report | `cba finalize`, embedded data, search/navigation |
| Portfolio mode | `cba portfolio --repos repos.txt --out portfolio-analysis` |
| Harness portability | Skills, CLI and optional `cba mcp` bridge |

The target picture is represented directly in the tool. `cba finalize .` prints the coverage summary and writes the full matrix into the HTML report.

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
2. execute every task under `.analysis/llm_tasks/`,
3. write valid JSON outputs to `.analysis/llm/`,
4. run `cba finalize .`,
5. fix invalid evidence references if finalization reports any.

You should not need to paste the long checklist manually. It is already embedded in the main skill and in the generated task files.

Open the final report here:

```text
.analysis/report/index.html
```

## CLI-only flow

The CLI cannot perform the semantic LLM extraction by itself. For a non-Codex/manual flow, use two phases:

```bash
cba prepare .
# Fill .analysis/llm/*.json by using Codex, another harness, or a custom pipeline.
cba finalize .
```

`cba finalize .` performs the complete deterministic finishing step:

```text
aggregate .analysis/llm/*.json
validate file:line evidence
compute target-picture coverage
render .analysis/report/index.html
write .analysis/data/bundle.json
write .analysis/data/evidence.json
write .analysis/data/target-coverage.json
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
- target-picture completeness gaps
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
  data/code-map.json              broad code map, symbols, hints and candidates
  data/interface-signals.json     broad interface/business/process hints, not final facts
  data/important-docs.json        documentation, contract and example candidates
  source-capsules.json            source excerpts that help Codex decide what to open
  llm_instructions.md             repository-specific extraction rules
  llm_tasks/*.md                  Codex task files
  llm/*.json                      semantic extraction outputs written by Codex
  data/bundle.json                aggregated report dataset
  data/evidence.json              validated evidence index
  data/target-coverage.json       target-picture coverage matrix
  report/index.html               interactive static HTML report
  report/analysis-data.json       report data for further tooling
```

## CLI commands

Normal commands:

```bash
cba prepare .       # build code map, source capsules and Codex tasks
cba finalize .      # aggregate, validate, compute coverage and render the HTML report
cba analyze .       # prepare; if LLM JSON already exists, finalize automatically
cba init-codex .    # install AGENTS.md and .agents/skills into the repository
cba portfolio --repos repos.txt --out portfolio-analysis
cba mcp             # optional stdio-style bridge for deterministic commands
```

Debug/CI commands:

```bash
cba aggregate .     # merge .analysis/llm/*.json into .analysis/data/bundle.json
cba coverage .      # print target-picture coverage matrix
cba render .        # render .analysis/report/index.html
cba validate .      # validate file:line evidence references
```

## Portfolio mode

Prepare report workspaces for many local repositories:

```bash
cba portfolio --repos repos.txt --out portfolio-analysis
```

`repos.txt` contains one local repository path per line.

## Design principle

The CLI prepares context. Codex extracts meaning. `cba finalize` presents and validates the result. Signals from the code map are navigation hints only; they are never final facts by themselves.

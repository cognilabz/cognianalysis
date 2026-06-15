# Cognianalysis

Cognianalysis is a thin, LLM-first repository analysis protocol for existing agent harnesses.

The TypeScript CLI prepares source inventory, writes harness-native workpacks, validates the authored analysis contract, checks file:line evidence, normalizes optional scanner exports, and renders a static HTML report. It does not decide what a repository means. The active agent harness and LLM read the source files, make semantic judgments, and author the final `.analysis/analysis.json`.

Use it when you want a decision-grade codebase assessment with visible evidence, without turning the CLI into a proprietary coding agent, semantic analyzer, scanner, or direct LLM runtime.

## Quick Start

From this repository:

```sh
npm install
npm run build
node dist/cli.js --help
```

Against a target repository:

```sh
node dist/cli.js analyze /path/to/repo --mode blueprint --goal "Assess modernization options"
node dist/cli.js status /path/to/repo
```

Then open `/path/to/repo/.analysis/TASK.md` in Codex, Claude Code, Cursor, Windsurf, Aider, or another agent harness. The harness executes the generated workpacks, opens source files directly, writes shard JSON files, and finishes by writing:

```text
.analysis/analysis.json
```

After the LLM-authored file exists, refresh and inspect the report:

```sh
node dist/cli.js analyze /path/to/repo
node dist/cli.js eval /path/to/repo
node dist/cli.js open /path/to/repo
```

If the package is installed on your PATH, replace `node dist/cli.js` with `cognianalysis`.

## Product Boundary

Cognianalysis deterministic code may:

- inventory files, languages, sizes, hashes, line counts, and short context capsules
- rank files for LLM attention using file format and size signals
- create `.analysis/TASK.md`, workpacks, manifests, and run metadata
- persist the product request and scope selection
- validate `analysis.json` structure
- validate relative file:line evidence references
- collect unsupported major claims that have no evidence, evidence gap, or open question
- normalize scanner exports into a shape-stable evidence feed
- render `.analysis/report/index.html` and `.analysis/report/analysis-data.json`
- redact local absolute roots and obvious sensitive values from public report data

The active harness / LLM owns:

- functional understanding
- architecture and interface interpretation
- business process extraction
- quality, security, risk, and modernization judgment
- scanner false-positive and product-impact triage
- confidence, limitations, open questions, and final readiness
- the visible report narrative in `.analysis/analysis.json`

The inventory is intentionally not semantic truth. In `src/repoMap.ts` and `src/inventory.ts`, navigation tags and scores are marked as inventory-only, deterministic parsing is disabled, and `semantic_authority` is false.

## CLI Surface

The public commands are:

```sh
cognianalysis analyze [repo] [--analysis .analysis] [--mode brief|blueprint|deep|complete-audit] [--goal text] [--flow name] [--module path] [--api name] [--risk topic] [--decision topic] [--scope complete|critical-path|representative] [--scope-files N]
cognianalysis status [repo] [--analysis .analysis]
cognianalysis open [repo] [--analysis .analysis]
cognianalysis eval [repo] [--analysis .analysis] [--strict]
```

`analyze` is the main entrypoint. It writes or refreshes the product request, prepares the workspace when needed, waits for `analysis.json` in normal product modes, and renders the report once `analysis.json` is present and valid.

`status` prints the product readiness view and the next action.

`eval` prints readiness checks and missing v2 requirements. In audit-heavy contexts it also prints legacy/audit contract details.

`open` prints the generated report path and a `file://` URL. If a report is missing but authored analysis exists, it refreshes the render first.

Developer and compatibility commands exist under:

```sh
cognianalysis dev --help
```

They are not the default product path.

## Modes

| Mode | Default Scope | Source-backed behavior |
| --- | --- | --- |
| `brief` | `representative` | Planner, functional reverse engineering, evidence audit, and final report workpacks. |
| `blueprint` | `representative` | Default decision workflow: planner, functional, technical, quality/security, process, modernization applicability, evidence audit, and final report workpacks. |
| `deep` | `critical-path` | Uses the blueprint workpack set, retitles the technical workpack as a targeted deep review, and requires `--goal` or at least one target flag. |
| `complete-audit` | `complete` | Requires `--scope complete` and enters the audit-heavy path with LLM tasks, source-tier coverage, skill workbenches, detail reviews, and legacy compatibility gates. |

Legacy aliases are accepted with warnings:

- `deep-dive` maps to `deep`
- `complete` maps to `complete-audit`

Scope can be overridden with `--scope complete`, `--scope critical-path`, or `--scope representative`. For non-complete scopes, `--scope-files` controls the selected-file limit. Selection is deterministic and based on inventory navigation scores, not semantic importance.

## Generated Workspace

A normal product run prepares:

```text
.analysis/
  run.json
  inventory.json
  TASK.md
  workpack-manifest.json
  workpacks/
    00-planner.md
    10-functional.md
    20-technical.md
    30-quality-security.md
    40-process.md
    50-modernization-applicability.md
    80-evidence-audit.md
    90-final-report.md
  shards/
  data/
    analysis-run.json
    analysis-scope.json
    code-map.json
    inventory.json
    product-analysis-request.json
```

After the harness completes the workpacks, it should add:

```text
.analysis/
  shards/
    planner.json
    functional.json
    technical.json
    quality-security.json
    process.json
    modernization-applicability.json
    evidence-audit.json
  analysis.json
```

After `analyze` runs with `analysis.json` present, Cognianalysis writes:

```text
.analysis/
  report/
    index.html
    analysis-data.json
  data/
    analysis-contract.json
    analysis-evidence-validation.json
    analysis-staleness.json
    bundle.json
    evidence.json
    report-artifacts.json
```

If an LLM-authored static report exists at `.analysis/llm/static-report/index.html`, `.analysis/static-report/index.html`, or `.analysis/authored-report/index.html`, the renderer publishes that directory. Otherwise it uses the built-in HTML renderer.

## Workpack Loop

`src/workpacks.ts` defines the normal workpack loop:

1. Run `00-planner` first.
2. Run independent shard workpacks in parallel when useful.
3. Run `80-evidence-audit`.
4. Run `90-final-report`.
5. Write `.analysis/analysis.json`.
6. Rerun `cognianalysis analyze .`.
7. Use `cognianalysis open .` and `cognianalysis eval .`.

Each workpack writes exactly one output path and includes non-goals:

- do not call a direct LLM API
- do not modify production source files
- do not use deterministic filename/path/import regex as semantic proof
- do not write final synthesis prose outside the final-report workpack

## Analysis Contract

The primary authored output is `.analysis/analysis.json`.

The v2 contract is validated in `src/contracts/analysisV2.ts`. Required top-level fields include:

- `schema_version: "2.0"`
- `analysis_kind: "cognianalysis_decision_document"`
- `mode`
- `repo`
- `confidence`
- `executive_decision`
- `authored_report`
- `analysis_dimensions`
- `report_design`
- `open_questions`
- `evidence_index`
- `report_quality_review`

The renderer can adapt legacy `.analysis/llm/analysis-document.json`, but `analysis.json` is the primary product output.

## Evidence Contract

Evidence references must use relative repository paths and valid line numbers. `src/evidence.ts` rejects evidence that:

- is not an object
- uses an absolute path
- escapes the repository root
- cites a skipped file
- has an invalid or out-of-range line
- declares a snippet that does not appear on or near the cited line

Major claims are collected from the executive decision, functional view, technical view, quality/security view, process analysis, refactoring section, and open questions. A major claim is unsupported when it has no evidence, no explicit evidence gap, and is not an open question.

That check is structural. It proves that a cited file:line exists; it does not prove that the cited line semantically supports the claim.

## Scanner Imports

Cognianalysis can normalize external scanner exports from:

```text
.analysis/imports/sonar.json
.analysis/imports/codeql.sarif
.analysis/imports/semgrep.sarif
.analysis/imports/semgrep.json
.analysis/imports/snyk.json
```

The normalized output is:

```text
.analysis/scanner-findings.json
```

In complete-audit mode, a data alias is also written:

```text
.analysis/data/scanner-findings.json
```

Scanner normalization keeps the full `findings[]` list and splits it into `triage_findings[]` and `filtered_out_findings[]` using severity, category, include-path, and exclude-path filters from the product request.

The CLI does not run Semgrep, CodeQL, Sonar, Snyk, or any other scanner. It also does not decide whether a finding is real, exploitable, severe in context, or worth fixing. The LLM must triage product impact with source evidence.

Filter examples:

```sh
cognianalysis analyze . \
  --scanner-min-severity high \
  --scanner-include-category vulnerability \
  --scanner-include-category secret \
  --scanner-include-path "src/**" \
  --scanner-exclude-path "test/**"
```

## Complete Audit

Use `complete-audit` only when whole-repository audit depth is actually needed:

```sh
cognianalysis analyze . --mode complete-audit --scope complete
```

That mode switches from normal workpacks to the audit-heavy workflow. The code path checks for artifacts such as:

- `.analysis/llm_tasks`
- `.analysis/source-tier-task-manifest.json`
- `.analysis/source_tiers/*.json`
- `.analysis/skill_workbench_tasks`
- `.analysis/skill_reviews/*.json`
- `.analysis/detail_tasks`
- `.analysis/detail_reviews/*.json`
- `.analysis/llm/analysis-document.json`

The normal `brief`, `blueprint`, and `deep` modes do not require complete source-tier file cards or detail reviews.

## Report Output

`src/report.ts` publishes:

```text
.analysis/report/index.html
.analysis/report/analysis-data.json
```

The public report bundle hides the local absolute repository root and redacts obvious secret-like values in text, snippets, and sensitive file contexts. Evidence remains visible as relative file paths and line numbers.

The built-in renderer shows the LLM-authored decision document, evidence details, open questions, report quality, scanner triage, workpacks, and supporting inventory. Custom authored static HTML can replace the built-in layout when the LLM creates one in the recognized static-report directories.

## Development

Build:

```sh
npm run build
```

Smoke the public CLI:

```sh
node dist/cli.js --help
node dist/cli.js analyze examples/demo-repo --mode blueprint --goal "Assess modernization options"
node dist/cli.js status examples/demo-repo
node dist/cli.js eval examples/demo-repo
npm pack --dry-run
```

The package uses Node.js 18 or newer and TypeScript. The CLI entrypoint is `dist/cli.js`, generated from `src/cli.ts`.

## Source Map

- `src/cli.ts` - public command routing, mode handling, request persistence, status/open/eval behavior
- `src/repoMap.ts` - deterministic inventory-only code map
- `src/inventory.ts` - v2 source inventory artifact
- `src/workpacks.ts` - normal product workpack generation
- `src/workpackTemplates.ts` - shard and final report contracts embedded in workpacks
- `src/contracts/analysisV2.ts` - `analysis.json` loading, validation, and legacy adapter
- `src/evidence.ts` - file:line evidence validation and unsupported claim collection
- `src/scannerImports.ts` - scanner export normalization and product filtering
- `src/aggregate.ts` - report bundle assembly, scanner normalization, evidence validation, and derived status artifacts
- `src/productReadiness.ts` - v2 product readiness checks
- `src/report.ts` - HTML/data report publishing and public bundle redaction
- `src/audit/` - complete-audit compatibility and depth workflow

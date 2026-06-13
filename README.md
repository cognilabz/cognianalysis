# Cognianalysis

Cognianalysis is a thin, LLM-first source-code analysis protocol for existing agent harnesses.

It is not a coding agent, scanner, deterministic semantic analyzer or direct LLM runtime. The TypeScript CLI prepares source inventory, writes harness-native workpacks, validates file:line evidence, performs deterministic bookkeeping and renders a static HTML report. The active agent harness / LLM understands the repository and authors the analysis.

## Product Boundary

Deterministic code may:

- build `.analysis/inventory.json`
- generate `.analysis/workpacks/*.md`
- validate JSON shape and file:line evidence
- collect shard metadata without semantic synthesis
- render `.analysis/analysis.json` into `.analysis/report/index.html`

The LLM / harness owns:

- functional and technical understanding
- architecture, process, risk and refactoring judgement
- final report authoring
- confidence, limitations and readiness judgement

Cognianalysis intentionally does not add deterministic import graphs, symbol graphs, framework detection, business-logic heuristics, bug scanners, hidden semantic scoring or direct LLM API calls as product behavior.

See [ADR-0001](docs/adr/0001-llm-semantic-authority.md), [ADR-0002](docs/adr/0002-thin-harness-product-boundary.md), [v0.8 Thin Harness](docs/product/v08-thin-harness.md) and [Modes](docs/product/modes.md).
For human verification, use the [manual smoke suite](docs/product/manual-smoke.md).

## Public CLI

The product surface is deliberately small:

```bash
cognianalysis analyze . --mode blueprint --goal "Assess modernization options"
cognianalysis status .
cognianalysis open .
cognianalysis eval .
```

Modes:

- `brief`: fast orientation with fewer workpacks
- `blueprint`: default decision-document workflow
- `deep`: targeted depth for `--goal`, `--flow`, `--module`, `--api`, `--risk` or `--decision`
- `complete-audit`: whole-repo audit compatibility path with Source Tiers, skill workbenches and detail reviews

Legacy aliases remain during migration: `deep-dive` maps to `deep`, and `complete` maps to `complete-audit`.

## Default Workflow

1. Run `cognianalysis analyze .`.
2. Open `.analysis/TASK.md` in Codex, Claude Code, Cursor, Windsurf, Copilot, Aider or another harness.
3. The harness executes the generated workpacks and writes `.analysis/analysis.json`.
4. Run `cognianalysis analyze .` again to validate evidence and render the report.
5. Use `cognianalysis status .`, `cognianalysis eval .` and `cognianalysis open .`.

When `analysis.json` is missing, `analyze` prepares the workspace and exits successfully with the next harness action. It does not force Source Tier file cards, detail-agent plans or legacy readiness gates in `brief`, `blueprint` or `deep`.

## Default Output

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
    50-refactoring.md
    80-evidence-audit.md
    90-final-report.md
  shards/
    functional.json
    technical.json
    quality-security.json
    process.json
    refactoring.json
    evidence-audit.json
  analysis.json
  report/
    index.html
    analysis-data.json
```

The renderer is v2-first: `.analysis/analysis.json` is the primary authored report contract. Legacy `.analysis/llm/analysis-document.json` remains readable through the migration adapter.

## Evidence Rules

Every major claim in `analysis.json` needs one of these:

- valid relative file:line evidence
- an explicit `evidence_gap`
- an open question that makes the uncertainty visible

The CLI validates path existence, line bounds, optional snippets and public-report path redaction. It does not decide whether the claim is semantically true. Unsupported major claims are surfaced by `eval` and in the report.

## Complete Audit

Use complete-audit only when real whole-repo audit depth is wanted:

```bash
cognianalysis analyze . --mode complete-audit --scope complete
```

That mode enables the legacy audit layer:

- `.analysis/llm_tasks/*.md`
- `.analysis/source_tier_tasks/*.md`
- `.analysis/source_tiers/*.json`
- `.analysis/skill_workbench_tasks/*.md`
- `.analysis/skill_reviews/*.json`
- `.analysis/detail_tasks/*.md`
- `.analysis/detail_reviews/*.json`

These artifacts are not required for the default product path.

## Harness Assets

Install harness instructions into a target repository when needed:

```bash
cognianalysis dev init-harness . --harness all
```

Source templates live in:

- `resources/AGENTS.md`
- `resources/harness/*.md`
- `resources/skills/cognianalysis/SKILL.md`

The installed harness should open source files directly and write the exact shard or analysis output requested by each workpack.

## Implementation Layout

```text
src/
  cli.ts                  public CLI and dev/audit routing
  inventory.ts            v2 deterministic inventory wrapper
  repoMap.ts              legacy inventory-only code map
  workpacks.ts            v2 harness-native workpack generation
  shards.ts               shard loading and shape checks
  synthesisInputs.ts      deterministic synthesis input collection
  evidence.ts             file:line evidence validation
  productReadiness.ts     v2 product status/eval checks
  report.ts               static HTML report rendering
  audit/                  complete-audit legacy depth
```

The runtime uses Node built-ins only. `dist/` is generated by `npm run build`.

## Development Checks

Use behavior-backed checks instead of adding rigid verifier scripts:

```bash
npm run build
node dist/cli.js --help
node dist/cli.js analyze examples/demo-repo --mode blueprint
node dist/cli.js status examples/demo-repo
node dist/cli.js eval examples/demo-repo
npm pack --dry-run
```

For report behavior, create or inspect a real `.analysis/analysis.json`, rerun `analyze`, and open the generated HTML. The result is the product goal, not a green script.

## Examples

Example repositories are source fixtures plus a v0.8 demo analysis:

- `examples/demo-repo`
- `examples/fullstack-booking-repo`
- `examples/event-inventory-repo`
- `examples/legacy-billing-repo`
- `examples/soap-claims-repo`

Generated `.analysis` workspaces are intentionally not shipped except for the minimal demo decision document.

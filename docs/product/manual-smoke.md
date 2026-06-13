# Manual Smoke Suite

This is a human-run product smoke, not a verifier script. The goal is to inspect actual Cognianalysis behavior and artifacts.

## 1. Build

```bash
npm run build
```

Expected:

- TypeScript compiles.
- No new verifier or benchmark script is required.

## 2. Public CLI Surface

```bash
node dist/cli.js --help
node dist/cli.js dev --help
```

Expected:

- Public help shows only `analyze`, `status`, `open`, `eval`.
- Dev help shows migration, harness, MCP, complete-audit compatibility and low-level artifact tools.
- Public help does not expose Source Tier, orchestration, coverage, portfolio or proof commands.

## 3. Fresh Blueprint Workspace

Use a temporary copy of an example repository:

```bash
rm -rf /tmp/cognianalysis-blueprint-smoke
cp -R examples/demo-repo /tmp/cognianalysis-blueprint-smoke
rm -rf /tmp/cognianalysis-blueprint-smoke/.analysis
node dist/cli.js analyze /tmp/cognianalysis-blueprint-smoke --mode blueprint --goal "Assess modernization options"
find /tmp/cognianalysis-blueprint-smoke/.analysis -maxdepth 2 -type f | sort
```

Expected:

- `.analysis/inventory.json`
- `.analysis/run.json`
- `.analysis/TASK.md`
- `.analysis/workpack-manifest.json`
- `.analysis/workpacks/*.md`
- no `.analysis/source_tier_tasks`
- no `.analysis/llm_tasks`
- no generated report until `.analysis/analysis.json` exists

## 4. Product Status Before LLM Output

```bash
node dist/cli.js status /tmp/cognianalysis-blueprint-smoke
```

Expected:

- Inventory prepared.
- Workpacks prepared.
- `analysis.json` missing.
- One clear next action: open `.analysis/TASK.md` in the active agent harness.

## 5. Report From Real analysis.json

Place a hand-authored `.analysis/analysis.json` that follows `examples/minimal-analysis-v2.json`, then run:

```bash
node dist/cli.js analyze /tmp/cognianalysis-blueprint-smoke
node dist/cli.js eval /tmp/cognianalysis-blueprint-smoke --strict
node dist/cli.js open /tmp/cognianalysis-blueprint-smoke
```

Expected:

- `analyze` validates evidence and renders `.analysis/report/index.html`.
- `eval --strict` reports concrete schema/evidence/unsupported-claim status.
- The HTML report starts from the decision document, not from legacy workflow status.
- Invalid evidence, unsupported major claims, explicit evidence gaps and open questions are visible.
- `.analysis/report/analysis-data.json` contains no local absolute repository root.

## 6. Complete Audit Isolation

```bash
rm -rf /tmp/cognianalysis-audit-smoke
cp -R examples/demo-repo /tmp/cognianalysis-audit-smoke
rm -rf /tmp/cognianalysis-audit-smoke/.analysis
node dist/cli.js analyze /tmp/cognianalysis-audit-smoke --mode complete-audit --scope complete
find /tmp/cognianalysis-audit-smoke/.analysis -maxdepth 2 -type d | sort
```

Expected:

- complete-audit creates audit task directories such as `.analysis/source_tier_tasks` and `.analysis/llm_tasks`.
- It does not seed fake LLM outputs.
- The default blueprint path remains free of those audit directories.

## 7. Package Surface

```bash
npm pack --dry-run
```

Expected:

- Package contains runtime source, dist, schemas, resources, docs and examples.
- Package does not contain verifier scripts, benchmark fixtures, `.analysis-seed` data or generated example report bundles.

## Completion Standard

The smoke passes only if the artifacts and rendered report match the expected product behavior. A green command alone is not enough; inspect the generated workspace and report data.

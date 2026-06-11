# Cognianalysis Benchmark Protocol

This benchmark is proof scaffolding, not a market-superiority claim.

## Current Runnable Proof

Run:

```bash
npm run verify:golden
```

The script rebuilds the CLI, discovers every `benchmarks/golden/**/*.expected.json` suite, runs each target repository through `cognianalysis run`, scores the final LLM-authored report, writes each repo's `.analysis/data/golden-benchmark.json`, and writes the aggregate `benchmarks/golden/results.json`.

Baseline proof is separate:

```bash
npm run verify:baseline
```

That command reads `benchmarks/baseline/**/*.baseline.json` and fails until the required baseline kinds are present and passing. It intentionally does not invent baseline results.

## Metrics

- `fact_recall`: expected facts found in the final report.
- `evidence_precision`: found expected facts that carry evidence.
- `unsupported_claim_rate`: report-lint unsupported claims divided by extracted report facts.
- `decision_readiness`: `final_llm_readiness.state === "ready"`.
- `report_completeness`: component contract and report-lint contract pass.

The current seeded demo requires perfect recall, perfect evidence precision, zero unsupported claims, decision readiness and report completeness.

## Market Claim Boundary

Cognianalysis can claim a verified product architecture when `npm run verify:demo` and `npm run verify:golden` pass.

It must not claim "best on the market" until the same protocol covers multiple representative repositories and compares against baselines such as raw agent prompting, scanner output and manual/expert report expectations.

Use:

```bash
cognianalysis doctor . --market-proof --strict
```

Strict market proof fails until at least five golden suites pass and baseline comparison proof is present.

## Required Expansion

Before using market-superiority language, add golden suites for at least:

- REST service with OpenAPI and tests.
- SOAP/WSDL service.
- Event-driven service.
- Frontend/backend app.
- Legacy monolith.

Each suite should define expected facts for entrypoints, interfaces, flows, business rules, bugs/risks, refactoring paths and evidence references.

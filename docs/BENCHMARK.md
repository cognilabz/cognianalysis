# Cognianalysis Benchmark Protocol

This benchmark is proof scaffolding, not a market-superiority claim.

## Current Runnable Proof

Run:

```bash
npm run verify:golden
```

The script rebuilds the CLI, discovers every `benchmarks/golden/**/*.expected.json` suite, runs each target repository through the product-mode flow (`cognianalysis analyze`, with `run` kept as a compatibility alias), and scores the final LLM-authored report. Fresh result JSON is written under an ignored temp workspace by default so verification does not dirty the checkout. Set `COGNIANALYSIS_UPDATE_BENCHMARK_RESULTS=1` when intentionally refreshing each tracked repo's `.analysis/data/golden-benchmark.json` and the aggregate `benchmarks/golden/results.json` snapshot.

Baseline proof is separate:

```bash
npm run verify:baseline
```

That command reads `benchmarks/baseline/**/*.baseline.json`, writes fresh result JSON under an ignored temp workspace by default, and fails until the required baseline kinds are present, passing and shaped with required metrics, provenance and comparison target fields. Set `COGNIANALYSIS_UPDATE_BENCHMARK_RESULTS=1` only when intentionally refreshing the tracked `benchmarks/baseline/results.json` snapshot. It intentionally does not invent baseline results.

Representative proof is also separate from simple suite correctness. `benchmarks/golden/manifest.json` lists the required representative categories and maps each expected suite to exactly one category and repository. Strict market proof requires at least five verifier-passing suites across five distinct repositories and all required categories: REST/OpenAPI service, SOAP/WSDL service, event-driven service, frontend/backend app and legacy monolith. The bundled suites now cover those five categories and `npm run verify:golden` must report `market-proof-ready=true`.

## Metrics

- `fact_recall`: expected facts found in the final report.
- `evidence_precision`: found expected facts that carry evidence.
- `unsupported_claim_rate`: report-lint unsupported claims divided by extracted report facts.
- `decision_readiness`: `final_llm_readiness.state === "ready"`.
- `report_completeness`: component contract and report-lint contract pass.

The seeded golden suites require perfect recall, perfect evidence precision, zero unsupported claims, decision readiness and report completeness.

## Market Claim Boundary

Cognianalysis can claim a verified product architecture when `npm run verify:demo`, `npm run verify:golden` and `npm run verify:baseline` pass.

It must not claim "best on the market" from these fixture gates alone. The bundled baselines are provenance-bound comparison artifacts for the demo fixture; stronger market-superiority language still requires broader externally produced baselines, larger real-world repositories and repeated product-scale runs.

Use:

```bash
cognianalysis eval . --strict
cognianalysis dev doctor . --market-proof --strict
```

Strict `eval` combines market proof with the original-product readiness contract. It fails until at least five golden suites pass, baseline comparison proof is present, the decision-document outputs cover the entry-question feature set and the product has a proven thin artifact/orchestration model instead of only documentation or a single demo.

Parallel/caching readiness is proven with:

```bash
cognianalysis dev prove-orchestration .
```

That command refuses one-workpack or stale analyses, and it also refuses post-hoc completed outputs without harness evidence. It writes proof only after `.analysis/data/orchestration-execution-log.json` records at least two source-tier workpack worker executions with matching task IDs, timings and output hashes, and `.analysis/data/cache-ledger.json` records a prior cache entry that was reused later with the deterministic run/request/artifact cache key.

## Required Coverage

The golden manifest must keep verifier-passing suites for at least:

- REST service with OpenAPI and tests.
- SOAP/WSDL service.
- Event-driven service.
- Frontend/backend app.
- Legacy monolith.

Each suite should define expected facts for entrypoints, interfaces, flows, business rules, bugs/risks, refactoring paths and evidence references.

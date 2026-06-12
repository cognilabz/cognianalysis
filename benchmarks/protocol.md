# Cognianalysis v2 Benchmark Protocol

Benchmarks measure decision-document quality, not artifact count.

## Metrics

- `fact_recall`: expected facts found in the report bundle divided by expected facts.
- `evidence_precision`: found expected facts with evidence divided by found expected facts.
- `unsupported_claim_rate`: unsupported claims divided by extracted report facts.
- `decision_usefulness`: human-reviewable score for whether decisions are actionable.
- `time_to_first_report`: elapsed time from prepared workspace to first rendered report when measured by a harness.
- `human_correction_effort`: human changes needed after the report.
- `cost_or_token_budget`: optional recorded budget for agent/harness execution.
- `refactoring_usefulness`: human-reviewable score for refactoring recommendations.

Default verifiers are deterministic. Human-reviewable metrics must cite the artifact and reviewer/provenance fields; they are not LLM-scored by the CLI.

## Baselines

Compare at least:

- raw agent prompt without Cognianalysis
- Cognianalysis v2 blueprint
- scanner report alone when scanner findings are present
- v0.7 complete audit optionally

Superiority claims in public docs must reference benchmark result files and say what was actually measured.

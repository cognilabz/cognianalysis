# Baseline Comparison Inputs

Baseline files are intentionally not fabricated.

Add manually or externally generated `*.baseline.json` files here before claiming market superiority. Required baseline kinds:

- `raw_agent_prompt`
- `scanner_report`

Each file should include:

```json
{
  "schemaVersion": "1.0",
  "repo": "examples/demo-repo",
  "baseline_kind": "raw_agent_prompt",
  "source_commit": "git commit analyzed by this baseline",
  "verdict": "pass",
  "metrics": {
    "fact_recall": 0.0,
    "evidence_precision": 0.0,
    "unsupported_claim_rate": 0.0,
    "decision_usefulness": 0.0
  },
  "provenance": {
    "generated_by": "tool or human reviewer name",
    "artifact": "relative/path/to/baseline-output.md",
    "artifact_sha1": "sha1 of the referenced artifact"
  },
  "comparison": {
    "target": "benchmarks/golden/demo-repo.expected.json"
  },
  "metric_derivation": {
    "fact_rows": [
      { "id": "fact-1", "found": false, "evidence_present": false, "artifact_snippet": "text from baseline-output.md" }
    ],
    "claim_rows": [
      { "id": "claim-1", "unsupported": false, "artifact_snippet": "text from baseline-output.md" }
    ],
    "decision_rows": [
      { "id": "decision-1", "useful": false, "artifact_snippet": "text from baseline-output.md" }
    ]
  }
}
```

Run `npm run verify:baseline` after adding baseline artifacts. The command fails until required baseline kinds are present, passing and shaped with required metrics, provenance and comparison target fields.
The comparison target JSON must expose `facts[]`, `claims[]`, and `decisions[]` IDs referenced by `metric_derivation` rows.

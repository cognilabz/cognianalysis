# Cognianalysis v0.8 Thin Harness

## Product Shape

Cognianalysis v0.8 is a thin LLM-first harness protocol for evidence-backed repository analysis. It does not replace an agent harness and does not contain a proprietary semantic analyzer.

The deterministic CLI prepares:

- `.analysis/run.json`
- `.analysis/inventory.json`
- `.analysis/TASK.md`
- `.analysis/workpacks/*.md`
- `.analysis/workpack-manifest.json`
- evidence validation and report rendering outputs

The active agent harness authors:

- `.analysis/shards/*.json`
- `.analysis/analysis.json`
- final confidence, readiness, decisions, recommendations and open questions

## Default Output

```text
.analysis/
  run.json
  inventory.json
  TASK.md
  workpacks/
  shards/
  analysis.json
  report/
    index.html
    analysis-data.json
```

Legacy v0.7 artifacts under `.analysis/llm/`, `.analysis/source_tiers/`, `.analysis/skill_reviews/` and `.analysis/detail_reviews/` remain compatibility or complete-audit inputs.

## Product Path

```bash
cognianalysis analyze . --mode blueprint --goal "Understand modernization options"
cognianalysis status .
cognianalysis open .
cognianalysis eval .
```

If `.analysis/analysis.json` is missing, `analyze` should prepare the workspace and tell the user to run the generated workpacks in their agent harness. If it exists, `analyze` should validate evidence and render the report.

## Boundary

The CLI can validate whether cited evidence exists. It cannot decide that the evidence semantically proves the claim. The report must show unsupported major claims as evidence gaps or open questions instead of inventing deterministic proof.

# Cognianalysis Modes

## brief

Fast orientation. Produces a small set of workpacks and a concise decision document. Missing optional shards should not block readiness when the report clearly states limitations.

## blueprint

Default product mode. Produces planner, functional, technical, quality/security, process, refactoring, evidence-audit and final-report workpacks. It should not require source-tier file cards, skill workbenches, detail reviews or provenance proofs.

## deep

Focused depth for a named flow, module, API, risk or decision. Deep mode may add targeted workpacks, but the final report still uses the same LLM-authored analysis contract and evidence rules.

## complete-audit

Whole-repo audit depth. This is the only normal mode that may require v0.7-style source-tier file cards, skill workbenches, detail reviews, artifact dependency graphs, run provenance, cache proof or parallel execution proof.

## Legacy Aliases

`deep-dive` maps to `deep`.

`complete` maps to `complete-audit`.

Aliases should warn during the v0.8 migration window and remain compatibility surfaces only.

# ADR-0002: Thin Harness Product Boundary

## Status

Accepted for the v0.8 product direction.

## Context

Cognianalysis should remain compatible with Codex, Claude Code, Cursor, Windsurf, Copilot, Aider and similar agent harnesses. Building a proprietary agent runtime, scanner suite or hidden analysis engine would make the product heavier, harder to trust and harder to integrate.

## Decision

Cognianalysis is a skill/report protocol plus deterministic CLI support:

- `inventory` records files, sizes, languages, excerpts and commit metadata.
- `workpacks` create harness-native LLM tasks with explicit JSON output contracts.
- `shards` hold LLM-authored partial analyses written by the harness.
- `evidence` validates relative path:line references and marks unsupported claims.
- `report-kit` renders an HTML report from LLM-authored analysis JSON.
- `scanner-imports` may normalize external scanner findings, but does not run or replace scanners.
- `audit` remains an optional complete-audit path for whole-repo depth.

The default product path is `analyze`, `status`, `open` and `eval`. Developer and audit commands are compatibility or deep-audit surfaces, not the normal user path.

## Consequences

Default runs should feel like inventory plus workpacks plus evidence plus report. Source-tier file cards, skill workbenches, detail reviews, provenance graphs and parallel execution proofs remain valuable for complete-audit, but they should not be required for ordinary blueprint readiness.

Public reports must not leak local absolute paths. Rendered bundles may expose redacted roots and relative evidence references only.

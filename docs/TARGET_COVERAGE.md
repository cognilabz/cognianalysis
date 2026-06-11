# Target Capability Context

This document defines the product-level target context used by `cognianalysis dev finalize` and `cognianalysis dev coverage`.

The target rows are not semantic coverage and are not CLI-scored. They preserve the original capability picture as LLM trace context:

1. **Target context** — stable capability IDs, descriptions and expected-output hints for LLM authoring.
2. **LLM semantic judgment** — the final `analysis_document.requirements_trace` and `analysis_document.report_quality_review`.

Whole-codebase source inventory accounting is a separate structural gate: every included file from `.analysis/data/source-inventory.json` must be evidence-backed or explicitly inspected by Codex, as the active in-session LLM. Files that are only deferred remain incomplete and do not count as finished analysis. Source capsules and code-map ranking do not count as semantic coverage by themselves.

Tiered whole-codebase analysis is the semantic base layer: every included file must receive a Tier 1 LLM-authored file card in `.analysis/source_tiers/*.json`; selected areas are then promoted to Tier 2-4 module/source-family synthesis, behavior/contract/flow analysis, quality/process findings and refactoring decisions.

A repository must not show target rows as `covered`, `present`, `partial`, `missing` or `pending` from deterministic output-key checks. If a capability is semantically satisfied, that status must be authored by the LLM in the final requirements trace or quality review.

## Required capabilities

- Existing-harness execution
- LLM-first semantic extraction
- Non-authoritative code map signals
- Whole-codebase source inventory accounting
- Tiered whole-codebase analysis
- Business capability extraction
- Functional view
- Business logic extraction
- Interface and contract extraction
- Request/response examples
- OpenAPI/Swagger extraction
- SOAP/WSDL/XSD extraction
- Technical view
- Mermaid flow extraction
- Domain/data/integration view
- Architecture assessment
- Process/readiness assessment
- Bugs, vulnerabilities and quality findings
- Structured decision basis
- Refactoring and modernization roadmap
- Target architecture / new tech stack
- Tool alternative positioning
- Evidence-first validation
- Interactive HTML reporting
- Portfolio mode
- Harness portability through CLI, skills and optional stdio tools

## Evidence rule

Every relevant claim must reference source, test, documentation, contract or configuration evidence using:

```json
{"path":"relative/path/File.ext","line":123,"symbol":"optional"}
```

Invalid evidence references must be fixed before the report is considered decision-grade.

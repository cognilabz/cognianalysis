# Target Coverage

This document defines the product-level coverage matrix used by `cba finalize`, `cba coverage` and the HTML report.

The implementation intentionally separates two kinds of coverage:

1. **Design coverage** — the pack has a skill, task, schema expectation, aggregator field and report section for the capability.
2. **Output coverage** — the current repository analysis has evidence-backed extracted data for that capability.

Whole-codebase source coverage is a separate output gate: every included file from `.analysis/data/source-inventory.json` must be evidence-backed, explicitly inspected by Codex/LLM, or explicitly deferred with a reason. Source capsules and code-map ranking do not count as semantic coverage by themselves.

A repository can therefore show `covered / pending` when the workflow supports a capability but Codex has not yet written the corresponding `.analysis/llm/*.json` output.

## Required capabilities

- Existing-harness execution
- LLM-first semantic extraction
- Non-authoritative code map signals
- Whole-codebase source coverage
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

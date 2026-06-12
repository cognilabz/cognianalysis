# Agent Instructions for Cognianalysis

This repository is configured for Cognianalysis.

Use the main workflow. In Codex, call the packaged skill when it is available:

```text
Use the cognianalysis skill.
```

In other agent harnesses, read this file as the project instruction file and execute the same product workflow.

## Product Boundary

Cognianalysis is a thin, LLM-first harness protocol. Deterministic TypeScript code prepares, validates and renders. The active agent harness / LLM understands, evaluates and authors.

The CLI may perform:

- source inventory and context packaging
- workpack/task generation
- JSON/schema and artifact checks
- file:line evidence validation
- deterministic merge bookkeeping
- static report rendering

The CLI must not become semantic authority. Do not add deterministic import graphs, symbol graphs, framework detectors, business-logic heuristics, bug scanners, hidden semantic scoring or direct LLM API runtime paths as product behavior.

## Rules

- Keep production source files read-only unless the user explicitly asks for changes.
- Run `cognianalysis analyze .` to prepare or update the workspace.
- Use `cognianalysis status .` for the product-language progress view and next action.
- Use `cognianalysis open .` to open or locate the rendered report.
- Use `cognianalysis eval .` to validate schema, evidence, unsupported claims, open questions and report completeness.
- Use complete-audit/developer commands only when the requested work explicitly needs whole-repo audit depth or migration/debugging of legacy v0.7 artifacts.
- Codex or the active harness executes LLM work in-session. Do not call a direct LLM API, require provider credentials or treat missing provider state as an analysis result.
- Every relevant business or technical claim must include file:line evidence or an explicit evidence gap/open question.
- Request/response examples, OpenAPI/Swagger examples, SOAP/WSDL/XSD examples, Mermaid flows, business logic examples and function/use-case examples must be extracted wherever present or defensibly inferable.
- Inferred examples must use `example_origin: "inferred"`.
- If behavior cannot be proven, add it to `open_questions` instead of inventing certainty.

The CLI is implemented in TypeScript. It prepares context, validates evidence, checks deterministic artifact/reference contracts and renders reports. The active in-session LLM performs semantic extraction, final report authoring and readiness judgment; the CLI never calls a direct LLM API for that work.

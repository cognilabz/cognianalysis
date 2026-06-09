# Agent Instructions for Codebase Analysis Pack

This repository is configured for the Codebase Analysis Pack.

Use the main skill:

```text
Use the codebase-assessment skill.
```

## Rules

- Keep production source files read-only unless the user explicitly asks for changes.
- Run `cba prepare .` when `.analysis/llm_tasks/` is missing.
- Execute every task under `.analysis/llm_tasks/`.
- Write valid JSON outputs to `.analysis/llm/` using the file names requested by the task files.
- Every relevant business or technical claim must include file:line evidence.
- Request/response examples, OpenAPI/Swagger examples, SOAP/WSDL/XSD examples, Mermaid flows, business logic examples and function/use-case examples must be extracted wherever present or defensibly inferable.
- Inferred examples must use `example_origin: "inferred"`.
- If behavior cannot be proven, add it to `open_questions`.
- After JSON extraction, run `cba finalize .`. This single command aggregates, computes target coverage, renders the HTML report and validates evidence.

The CLI is implemented in TypeScript. It prepares context, validates evidence and renders reports. Codex performs the semantic extraction.

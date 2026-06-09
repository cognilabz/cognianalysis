---
name: codebase-assessment
description: Main LLM-first repository assessment workflow for extracting business capabilities, business logic, contracts, request/response examples, Mermaid flows, domain/data/integration views, architecture, process readiness, refactoring options and evidence-based interactive HTML reports.
---

# Codebase Assessment Skill

## Goal

Produce a semantic, evidence-based, decision-grade codebase assessment. The TypeScript CLI builds context; Codex extracts meaning.

This is the main skill. A user should be able to say only:

```text
Use the codebase-assessment skill.
```

and Codex should still execute the full workflow below without asking the user to run post-processing commands manually.

## Workflow

1. If `.analysis/llm_tasks/` does not exist, run `cba prepare .`.
2. Read `.analysis/llm_instructions.md`.
3. Execute every task file in `.analysis/llm_tasks/`.
4. For each task, inspect source files, tests, docs, OpenAPI/Swagger, SOAP/WSDL/XSD, GraphQL schemas, event schemas, examples and configuration directly.
5. Write valid JSON into `.analysis/llm/` using the expected file names from the tasks.
6. Run `cba finalize .`.
7. Check the finalization output for target coverage and evidence validation.
8. If evidence validation fails, fix invalid evidence references in `.analysis/llm/*.json` and rerun `cba finalize .`.

## Required target coverage

The assessment must address all target capabilities, not only documentation generation:

- Existing-harness execution, not a custom coding agent
- LLM-first semantic extraction
- Non-authoritative code-map signals
- Business capability extraction
- Business logic extraction
- Interface and contract extraction
- Request/response examples
- OpenAPI/Swagger extraction
- SOAP/WSDL/XSD extraction
- Mermaid flow extraction
- Domain/data/integration view
- Architecture assessment
- Process/readiness assessment
- Quality and risk findings
- Refactoring and modernization roadmap
- Evidence-first validation
- Interactive HTML reporting
- Portfolio-ready output shape
- Harness portability through skills, CLI and optional tool bridge

## Required extraction

Extract all of the following where present or defensibly inferable from evidence.

### Business understanding

- Business capabilities and supported use cases
- Actors, systems and roles
- Domain glossary and domain entities
- Business rules, validations, decisions, calculations, status transitions, authorization behavior and error behavior
- Business logic examples
- Function and use-case examples with input, output and explanation

### Interfaces and contracts

- HTTP, REST, OpenAPI/Swagger, SOAP/WSDL/XSD, GraphQL, events, jobs, CLI commands, UI routes, database touchpoints and external calls
- Request fields, response fields, headers, statuses, errors, faults and message payloads
- Request/response examples from docs, tests, OpenAPI/Swagger, SOAP/WSDL, Postman, `.http` files or inferred DTO/schema examples
- OpenAPI/Swagger operations, schemas and examples when present
- SOAP/WSDL/XSD operations, messages, faults, SOAP actions and SOAP envelope examples when present

### Flows and side effects

- Happy paths and failure paths
- Mermaid source for every meaningful flow
- Persistence, state changes, events, external calls, queues/topics and other side effects
- Data flow and process flow summaries

### Technical, process and modernization assessment

- Architecture modules, responsibilities and dependencies
- Data stores and integration dependencies
- Test coverage signals, testability concerns and missing tests
- CI/CD, release, configuration, observability and operational readiness
- Maintainability, quality, visible security and documentation risks where visible from the repository
- Refactoring and modernization options with benefit, risk, effort, candidate files and evidence

## Evidence rules

Every relevant business or technical claim must include evidence using this shape:

```json
{"path": "relative/path/File.ext", "line": 123, "symbol": "optionalSymbol"}
```

Prefer evidence from source files, tests, DTOs, schemas, contract files, configuration and documentation. If behavior cannot be proven, put it into `open_questions`.

## Example rules

- Extract source-provided examples exactly enough to be useful.
- If no explicit example exists, infer a small realistic example only when the fields/rules are backed by evidence.
- Inferred examples must use `example_origin: "inferred"`.
- Never label inferred examples as `source`, `openapi`, `soap`, `doc` or `test`.
- Include request/response examples, SOAP envelope examples, business logic examples and function/use-case examples wherever available.

## Non-goals

- Do not modify production code.
- Do not present code-map signals as final entrypoints.
- Do not produce prose-only analysis when JSON output is requested by a task.
- Do not hide uncertainty; use `confidence` and `open_questions`.

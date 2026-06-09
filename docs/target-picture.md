# Target Picture Coverage

The pack is designed around one main objective:

> Use an existing agent harness such as Codex to perform LLM-first semantic extraction from a repository, then produce a decision-grade interactive HTML report with evidence.

## Explicitly covered target capabilities

1. Existing harness execution, not a custom coding agent
2. LLM-first semantic extraction
3. Non-authoritative code-map signals
4. Business capability extraction
5. Business logic extraction
6. Interface and contract extraction
7. Request/response examples
8. OpenAPI / Swagger extraction
9. SOAP / WSDL / XSD extraction
10. Mermaid flow extraction
11. Domain/data/integration view
12. Architecture assessment
13. Process/readiness assessment
14. Quality and risk findings
15. Refactoring and modernization roadmap
16. Evidence-first validation
17. Interactive static HTML report
18. Portfolio mode
19. Harness portability through skills, CLI and optional bridge

## Validation mechanism

- Design coverage is defined in `src/targetCoverage.ts`.
- Runtime output coverage is computed by `cba finalize .` and rendered in the HTML report; `cba coverage .` is a diagnostic view.
- Semantic content must come from `.analysis/llm/*.json`, produced by Codex from `.analysis/llm_tasks/*.md`.
- Code-map signals are never authoritative facts.

## Remaining non-goals

- The pack does not replace SAST/security scanners.
- The pack does not implement a custom coding agent.
- The pack does not autonomously modify production code.
- The pack does not claim final business facts without source evidence.

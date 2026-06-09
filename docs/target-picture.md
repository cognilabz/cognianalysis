# Target Picture Coverage

The pack is designed around one main objective:

> Use an existing agent harness such as Codex to perform LLM-first semantic extraction from a repository, then produce a decision-grade interactive HTML report with evidence.

## Explicitly covered target capabilities

1. Existing harness execution, not a custom coding agent
2. LLM-first semantic extraction
3. Non-authoritative code-map signals
4. Whole-codebase source coverage
5. Business capability extraction
6. Functional view of what the system does
7. Business logic extraction
8. Interface and contract extraction
9. Request/response examples
10. OpenAPI / Swagger extraction
11. SOAP / WSDL / XSD extraction
12. Technical view of APIs, interfaces and architecture
13. Mermaid flow extraction
14. Domain/data/integration view
15. Architecture assessment
16. Process/readiness assessment
17. Bugs, vulnerabilities and quality findings
18. Structured decision basis
19. Refactoring and modernization roadmap
20. Target architecture / new tech stack options
21. Tool alternative positioning
22. Evidence-first validation
23. Interactive static HTML report
24. Portfolio mode
25. Harness portability through skills, CLI and optional bridge

## Validation mechanism

- Design coverage is defined in `src/targetCoverage.ts`.
- Runtime output coverage is computed by `cba finalize .` and rendered in the HTML report; `cba coverage .` is a diagnostic view.
- Whole-codebase source coverage is computed from `.analysis/data/source-inventory.json`, validated evidence paths and LLM-provided `analysis_coverage` accounting.
- Semantic content must come from `.analysis/llm/*.json`, produced by Codex from `.analysis/llm_tasks/*.md`.
- Code-map signals are never authoritative facts.

## Remaining non-goals

- The pack does not replace SAST/security scanners.
- The pack can surface visible security risks from source evidence, but specialized vulnerability scanning remains a complementary control.
- The pack does not implement a custom coding agent.
- The pack does not autonomously modify production code.
- The pack does not claim final business facts without source evidence.

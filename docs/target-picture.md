# Target Picture Context

The pack is designed around one main objective:

> Use an existing agent harness to perform LLM-first semantic extraction from a repository, then produce a decision-grade interactive HTML report with evidence.

## Target capabilities preserved for LLM traceability

1. Existing harness execution, not a custom coding agent
2. LLM-first semantic extraction
3. Non-authoritative code-map signals
4. Whole-codebase source inventory accounting
5. Tiered whole-codebase analysis: Tier 1 file cards for every included file, followed by Tier 2-4 drilldown
6. Business capability extraction
7. Functional view of what the system does
8. Business logic extraction
9. Interface and contract extraction
10. Request/response examples
11. OpenAPI / Swagger extraction
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

- Target capability context is defined in `src/targetCoverage.ts` and is not CLI-scored.
- `cognianalysis dev finalize .` preserves target rows as unscored LLM trace context; `cognianalysis dev coverage .` prints that context plus Tier 1 file-card coverage and source inventory accounting.
- Whole-codebase source inventory accounting is computed from `.analysis/data/source-inventory.json`, validated evidence paths and LLM-provided `analysis_coverage` accounting. Deferred files remain incomplete.
- Tiered whole-codebase analysis is computed from `.analysis/source_tiers/*.json`; every included file needs a Tier 1 LLM-authored file card before the final report can be ready.
- Semantic content must come from `.analysis/llm/*.json`, produced by Codex, as the active in-session LLM, from `.analysis/llm_tasks/*.md`.
- Semantic completeness and decision readiness must be authored in `analysis_document.requirements_trace` and `analysis_document.report_quality_review`.
- Code-map signals are never authoritative facts.

## Remaining non-goals

- The pack does not replace SAST/security scanners.
- The pack can surface visible security risks from source evidence, but specialized vulnerability scanning remains a complementary control.
- The pack does not implement a custom coding agent.
- The pack does not autonomously modify production code.
- The pack does not claim final business facts without source evidence.

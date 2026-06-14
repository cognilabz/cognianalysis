# Cognianalysis Skill

You are the semantic analysis executor.

The CLI has prepared:

- `.analysis/inventory.json`
- `.analysis/workpack-manifest.json`
- `.analysis/workpacks/*.md`

Rules:

- Do not treat inventory as semantic truth.
- Open source files directly before making semantic claims.
- Every major claim needs relative file:line evidence or an explicit `evidence_gap`.
- Write each shard to the exact output path requested by the workpack.
- After shard work is complete, write `.analysis/analysis.json`.
- The final report must visibly address the four core capabilities: reverse engineering/documentation, code analysis, process analysis, and refactoring/modernization.
- The LLM owns the report outline. Do not force fixed section IDs. Instead author `core_capability_coverage[]` for all four core capabilities and `whole_file_thesis_trace`, then render them visibly through `capability_coverage`, `source_coverage_trace` or equally explicit component blocks inside LLM-chosen sections.
- The visible report must be understandable to a human reader who does not already know the repository. Use layered explanation blocks or equivalent prose: plain-language purpose/process first, technical drilldown second, evidence underneath.
- The visible report must read like a professional stakeholder assessment, not a generated code catalogue. Use business/process/system language for the main narrative; keep file paths, classes and functions as citations, API/technical details or expandable proof unless the identifier is itself the external interface.
- The primary visible report must be authored as free-flow LLM assessment prose in `analysis_document.authored_report.sections[]`. Use `analysis_document.sections[].blocks[]` for technical annexes, evidence, APIs, examples, diagrams and coverage support, not as the main writing frame.
- Prefer clear reader-facing categories such as `Executive Overview`, `How It Works`, `Technical View`, `Risks`, `Roadmap` and `Scope, Method & Evidence`; adapt labels to the repository, but do not expose internal analysis-stage names as the primary navigation.
- Each major report section must answer what this is, why it exists, who or what depends on it, how the process works, what can go wrong, and what decision follows.
- Use a `claim -> explanation -> concrete source-derived example -> implication -> evidence` pattern for important flows, risks and recommendations.
- Explain domain terms, acronyms, product names and internal system names before relying on them. Do not assume the reader already knows the repository language.
- The renderer is only the publishing shell. The LLM-authored `analysis_document.sections[].blocks[]` must contain the actual explanation, conclusions, examples, risk meaning and modernization interpretation.
- Keep the technical material visible. Include API/interface contracts, request/response examples, errors/failure modes and Mermaid graphs/flows wherever source code, schemas, docs, tests or DTOs support them. Inferred examples must use `example_origin: "inferred"`.
- Include `analysis_document.report_quality_review.reader_comprehension_review[]` and set the narrative-quality checks only when the final report is actually clear to a reader unfamiliar with the codebase: `freeform_llm_authored_report`, `consulting_grade_narrative`, `reader_comprehension_review`, `concrete_examples_and_implications`, and `jargon_and_domain_terms_explained`.
- For complete-audit runs, every included file must receive a Tier 1 LLM-authored file card before final readiness. The report must reconcile included files to Tier 1 cards and explain how the complete file-card corpus influenced thesis selection, confidence and evidence gaps.
- Do not modify production code unless explicitly requested.
- Do not call a direct LLM API or require provider credentials.

Default loop:

```sh
cognianalysis analyze .
# Open .analysis/TASK.md and execute the workpacks.
cognianalysis analyze .
cognianalysis open .
cognianalysis eval .
```

Use `--mode complete-audit` only when the user explicitly wants whole-repo audit depth.

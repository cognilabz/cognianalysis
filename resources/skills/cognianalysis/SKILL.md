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
- The final report must visibly assess the four core capabilities: reverse engineering/documentation, code analysis, process analysis, and refactoring/modernization applicability. Assessment is not the same as forcing content: if a capability is not meaningful for the repository or decision, mark it `not_applicable` with source-backed rationale instead of inventing a section.
- The LLM owns the report outline. Do not force fixed section IDs, fixed view names or a fixed chapter menu. Author `report_design`, `analysis_dimensions[]`, `core_capability_coverage[]` for all four core capabilities and `whole_file_thesis_trace`, then render the important parts visibly through free-flow prose or component blocks inside LLM-chosen sections. Capability/dimension status may be `covered`, `not_applicable`, `partial` or `open`.
- The visible report must be understandable to a human reader who does not already know the repository. Use free-flow prose, concrete examples, layered explanation blocks, tables or other clear artifacts as the repository demands; plain-language meaning must come before technical drilldown.
- The visible report must read like a professional stakeholder assessment, not a generated code catalogue. Use business/process/system language for the main narrative; keep file paths, classes and functions as citations, API/technical details or expandable proof unless the identifier is itself the external interface.
- Use the repo-report-builder style as the communication benchmark: business-readable overview, how the system works, technical view, severity-rated risks/remediation, decision path and repository/source-family dossiers when useful. These are report-writing patterns, not mandatory section names. Cognianalysis adds product request, scope, evidence, scanner-feed filtering and readiness contracts around that style.
- The primary visible report must be authored as free-flow LLM assessment prose in `analysis_document.authored_report.sections[]`. Use `analysis_document.sections[].blocks[]` for technical annexes, evidence, APIs, examples, diagrams and coverage support, not as the main writing frame.
- When report quality matters, create a fully custom static report in `.analysis/llm/static-report/` with `index.html` plus local CSS/JS/assets. `cognianalysis analyze` publishes that directory directly. Do not force the report through the generic renderer when a custom report would communicate better.
- Choose reader-facing categories from the repository story and user goal. Standard labels such as `Executive Overview`, `How It Works`, `Technical View`, `Risks`, `Decision Path` and `Scope, Method & Evidence` are examples, not a template; rename, merge, split or omit them when another structure is clearer and explain that choice in `report_design`.
- Each major report section must answer what this is, why it exists, who or what depends on it, how the relevant relationship works, what can go wrong, and what decision follows.
- Use a `claim -> explanation -> concrete source-derived example -> implication -> evidence` pattern for important flows, risks and recommendations.
- Explain domain terms, acronyms, product names and internal system names before relying on them. Do not assume the reader already knows the repository language.
- The renderer is only the publishing shell. The LLM-authored `analysis_document.sections[].blocks[]` must contain the actual explanation, conclusions, examples, risk meaning and modernization interpretation.
- Keep the technical material visible. Include API/interface contracts, request/response examples, errors/failure modes and purpose-fit visual explanation artifacts wherever source code, schemas, docs, tests or DTOs support them. Use Mermaid only when it clarifies the explanation; prose, tables, examples, local SVG/images, architecture maps, process timelines or no diagram are valid choices when better. Inferred examples must use `example_origin: "inferred"`.
- When architecture matters, include a visible `architecture_visual`, `report_image`, SVG/image, node/edge map, bounded-context map or equivalent system-landscape artifact. The LLM chooses the form; do not depend on the renderer to invent an architecture picture.
- When process or E2E behavior matters, include a visible `process_flow_visual`, timeline, swimlane, state transition, sequence, SVG/image or equivalent process picture with trigger, actors, decisions, state/data changes, integrations, outputs and failure paths where source evidence proves them.
- If `.analysis/scanner-findings.json` exists, use it as an external scanner evidence feed. Prioritize `triage_findings[]`, explain `filtered_out_findings[]` when relevant, and let the LLM decide false positives, exploitability, product impact and recommended action with source evidence. Semgrep is the preferred imported security scanner when available, but Cognianalysis must not become the scanner authority.
- Include `analysis_document.report_quality_review.reader_comprehension_review[]` and `analysis_document.report_quality_review.dimension_checks[]`. The dimension checks are the LLM-authored quality/applicability model for this repository; legacy fixed `checks` may be included for compatibility but must not drive the report outline.
- Refactoring/modernization must never be forced. Recommend refactor, migration, replacement, stabilization, preservation, contract hardening or no structural change according to source evidence and stakeholder decision value.
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

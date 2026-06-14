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

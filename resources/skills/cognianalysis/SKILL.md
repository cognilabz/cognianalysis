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

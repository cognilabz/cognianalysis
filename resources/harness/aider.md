# Aider Harness

Use Aider for the analysis artifacts, not for production source edits, unless the user explicitly asks for code changes.

Run `cognianalysis analyze .`, read `.analysis/TASK.md`, write the requested shard JSON files, and finish with `.analysis/analysis.json`.

Rerun:

```sh
cognianalysis analyze .
cognianalysis open .
cognianalysis eval .
```

# Claude Code Harness

Run:

```sh
cognianalysis analyze .
```

Then read `.analysis/TASK.md` and execute the generated workpacks. Treat `.analysis/inventory.json` as navigation only. Open source files directly and cite relative file:line evidence for major claims.

When workpacks are complete, write `.analysis/analysis.json`, rerun `cognianalysis analyze .`, then use `cognianalysis open .` and `cognianalysis eval .`.

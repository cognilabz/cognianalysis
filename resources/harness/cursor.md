# Cursor Harness

Use Cognianalysis as a workspace protocol:

```sh
cognianalysis analyze .
```

Follow `.analysis/TASK.md`. Each workpack writes exactly one shard. Do not edit another workpack's output. Do not modify production code unless the user requests implementation work.

The final semantic output is `.analysis/analysis.json`; the CLI only validates and renders it.

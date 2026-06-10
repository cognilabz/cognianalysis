---
name: html-report-writer
description: Render and validate the interactive static HTML report for Cognianalysis outputs.
---

# HTML Report Writer Skill

Use this skill after `.analysis/llm/*.json` files have been written.

## Workflow

1. Run `cognianalysis finalize .`.
2. If finalization reports invalid evidence, fix `.analysis/llm/*.json` and rerun `cognianalysis finalize .`.
3. Open or reference `.analysis/report/index.html`.

The report must remain static and self-contained with embedded data. Do not introduce local `fetch()` calls that break when opened from the file system.

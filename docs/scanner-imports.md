# Scanner Imports

Cognianalysis does not run or replace scanners. It can import existing scanner exports so the active agent harness can triage them inside the LLM-authored decision report.

## Input Paths

Place files under `.analysis/imports/` before running `cognianalysis analyze .`:

- `.analysis/imports/sonar.json`
- `.analysis/imports/codeql.sarif`
- `.analysis/imports/semgrep.sarif`
- `.analysis/imports/snyk.json`

Missing files are fine. The CLI never shells out to Sonar, CodeQL, Semgrep, Snyk or any other scanner.

## Normalized Output

The CLI writes:

```text
.analysis/scanner-findings.json
.analysis/data/scanner-findings.json
```

Contract:

```json
{
  "schema_version": "2.0",
  "kind": "normalized_scanner_findings",
  "sources": [
    {
      "tool": "sonar|codeql|semgrep|snyk|other",
      "input_path": ".analysis/imports/codeql.sarif",
      "finding_count": 0
    }
  ],
  "findings": [
    {
      "id": "string",
      "tool": "string",
      "title": "string",
      "severity": "critical|high|medium|low|info|unknown",
      "category": "bug|vulnerability|code_smell|secret|dependency|license|other",
      "path": "relative/path/File.ts",
      "line": 1,
      "message": "scanner-authored message",
      "raw_ref": ".analysis/imports/codeql.sarif#1"
    }
  ]
}
```

## Authority Boundary

The normalized file is only a shape-stable evidence input. The deterministic importer does not decide whether a finding is real, exploitable, severe in context, or worth fixing. The `30-quality-security` workpack reads `.analysis/scanner-findings.json`; the active agent harness may prioritize, downgrade or mark a finding as false positive only with rationale and evidence in the authored shard/report.

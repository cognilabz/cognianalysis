# Scanner Imports

Cognianalysis does not run or replace scanners. It can import existing scanner exports so the active agent harness can triage them inside the LLM-authored decision report.

## Input Paths

Place files under `.analysis/imports/` before running `cognianalysis analyze .`:

- `.analysis/imports/sonar.json`
- `.analysis/imports/codeql.sarif`
- `.analysis/imports/semgrep.sarif`
- `.analysis/imports/semgrep.json`
- `.analysis/imports/snyk.json`

Missing files are fine. The CLI never shells out to Sonar, CodeQL, Semgrep, Snyk or any other scanner.

Semgrep is the preferred lightweight imported security scanner feed when available. Example commands you may run yourself or in CI before `cognianalysis analyze .`:

```sh
mkdir -p .analysis/imports
semgrep scan --sarif --output .analysis/imports/semgrep.sarif .
# or
semgrep scan --json --output .analysis/imports/semgrep.json .
```

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
  "product_filter": {
    "min_severity": "medium",
    "include_categories": ["bug", "vulnerability", "code_smell", "secret", "dependency", "license", "other"],
    "exclude_paths": ["node_modules/**", ".git/**", "dist/**", "build/**", ".next/**", "coverage/**", ".analysis/**"],
    "include_paths": [],
    "report_strategy": "Use scanner findings as external evidence inputs..."
  },
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
      "raw_ref": ".analysis/imports/codeql.sarif#1",
      "product_filter_status": "triage_candidate|filtered_out",
      "product_filter_reasons": ["matches_product_filter"]
    }
  ],
  "triage_findings": [],
  "filtered_out_findings": []
}
```

## Authority Boundary

The normalized file is only a shape-stable evidence input. The deterministic importer does not decide whether a finding is real, exploitable, severe in context, or worth fixing. The `30-quality-security` workpack reads `.analysis/scanner-findings.json`; the active agent harness may prioritize, downgrade or mark a finding as false positive only with rationale and evidence in the authored shard/report.

Product filtering is a pre-triage convenience only. `findings[]` always contains the full normalized list. `triage_findings[]` is the severity/category/path-prioritized work queue. `filtered_out_findings[]` remains available so the LLM can explain why those findings were not product-prioritized when needed.

You can tune filtering on the product request:

```sh
cognianalysis analyze . \
  --scanner-min-severity high \
  --scanner-include-category vulnerability \
  --scanner-include-category secret \
  --scanner-include-path "src/**" \
  --scanner-exclude-path "test/**"
```

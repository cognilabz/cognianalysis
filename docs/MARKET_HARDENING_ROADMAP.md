# Cognianalysis Market Hardening Roadmap

Date: 2026-06-10

This roadmap translates the shared ChatGPT review thread and official market scan into product work. The v1 workflow is functionally complete; best-on-market work now means enterprise reliability, semantic provenance and disciplined positioning.

## Product Boundary

Cognianalysis should remain an LLM-first repository analysis and modernization decision engine.

The CLI may prepare source inventory, context packs, task files, schemas, evidence validation, freshness checks, artifact contracts and static HTML rendering. It must not decide business meaning, architecture semantics, security truth, refactoring priority or report completeness through filename, path, regex, keyword or section-presence matching.

The LLM or agent harness owns semantic extraction and judgment through `analysis-strategy.json`, Tier 1 file cards, skill reviews, detail reviews, `analysis-document.json`, `requirements_trace`, `report_quality_review`, consistency review, open questions and decision-readiness verdicts.

## Market Map

CAST and CAST Imaging are strongest at architecture maps, dependencies, transaction paths and impact analysis. Cognianalysis should not rebuild that graph engine. The better response is evidence-backed LLM-authored transaction narratives, execution-path explanations, dependency risk stories and handoff boundaries for external graph tools.

SonarQube, CodeQL and similar scanners are strongest at static quality, SAST, rule findings and taint-style analysis. Cognianalysis should ingest those findings as external evidence, preserve scanner authority for scanner facts, and let the LLM synthesize decision impact, remediation priority and modernization implications.

OpenRewrite and Moderne are strongest at automated migrations and refactoring recipes. Cognianalysis should generate migration strategy, recipe candidates and sequencing rationale, not silently rewrite code as an analysis side effect.

Accenture GenWizard is closest in positioning because it sells gen-AI reverse engineering and modernization planning. Cognianalysis should compete on local, evidence-first, harness-portable analysis with explicit open questions and transparent provenance.

GitHub Copilot agents, Sourcegraph Cody, Cursor and Rovo Dev are strongest at coding, codebase context and review workflows. Cognianalysis should integrate with these harnesses instead of becoming another coding agent.

## Implement Now

### WP1 - Semantic Lineage

Add first-class lineage for major report claims:

```json
{
  "claim_id": "finding-auth-session-expiry",
  "report_section_id": "security-and-session-management",
  "origin_artifact": "detail_reviews/session-security.json",
  "supporting_artifacts": [
    "skill_reviews/interface-contract-analysis.json",
    "source_tiers/src-main-auth-session-json.json"
  ],
  "evidence": [
    { "path": "src/auth/session.ts", "line": 42 }
  ]
}
```

Readiness should verify that major findings, recommendations, decisions and source-family claims have lineage or an explicit open question.

### WP2 - Analysis Run Provenance

Introduce one `analysis_run_id` and a generated-from matrix for strategy, source tiers, skill reviews, detail reviews and final report. Artifacts should record their parent run, parent artifact IDs and source commit. Final readiness should fail when a final report mixes artifacts from incompatible runs.

### WP3 - Artifact Dependency Graph

Add an artifact DAG that explains which outputs are stale and which downstream steps need rerun. `status`, `repair` and `resume` should use this graph to avoid all-or-nothing regeneration while preserving the LLM-authored sequence.

### WP4 - External Finding Ingestion

Add an `external_findings/` contract for Sonar, CodeQL, SAST, architecture tools and migration scanners:

```json
{
  "source_tool": "sonarqube",
  "authority": "external_scanner",
  "findings": [
    {
      "id": "S001",
      "type": "security",
      "severity": "high",
      "path": "src/auth/session.ts",
      "line": 42,
      "message": "scanner-authored finding"
    }
  ]
}
```

The LLM may synthesize these into risk and decision sections, but scanner outputs remain external evidence and must not become deterministic Cognianalysis verdicts.

### WP5 - Boundary CI

Keep `npm run verify:llm-boundary` as a dedicated, fast guard. It should block readiness if runtime code reintroduces hardcoded source layouts, title-based routing, fixed semantic labels, deterministic target scoring, semantic report shortcuts or non-Codex LLM readiness verdicts.

## Later Market Expansion

- Interactive semantic-lineage explorer in the report.
- Portfolio dashboard over many repositories with cross-repo open questions and modernization themes.
- PDF/DOCX export from the existing evidence-backed report.
- Pull request and diff analysis as separate commands.
- Tool adapters for Sonar, CodeQL, OpenRewrite/Moderne outputs, CAST exports and issue trackers.
- Team workflow polish: review states, assignment, signed-off decisions and audit trails.

## Do Not Add

- Business-domain detectors such as auth, billing, order, flow or API classifiers in deterministic runtime code.
- Deterministic architecture inference that claims service maps, domain maps or dependency semantics from path/import shape.
- Keyword-based completeness scoring such as "API section exists, therefore API analysis is complete".
- A custom SAST, quality-rule engine, graph extractor or migration engine.
- Auto-remediation as part of analysis finalization.

The winning position is deterministic governance around LLM-authored semantic analysis: strong contracts, strong evidence, strong provenance, and explicit boundaries where external scanners or transformation tools remain the authority.

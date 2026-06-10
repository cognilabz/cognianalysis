# Source-Family Detail Review · src/main

You are a focused source-family detail agent for Codebase Analysis Pack.

## Inputs

Read first:

- `.analysis/llm_instructions.md`
- `.analysis/data/source-inventory.json`
- `.analysis/data/analysis-goal-contract.json`
- `.analysis/data/code-map.json`
- `.analysis/data/source-family-inventory.json`
- `.analysis/source-capsules.json`
- `.analysis/llm/detail-agent-plan.json`
- existing `.analysis/llm/*.json` extraction outputs
- existing `.analysis/llm/analysis-document.json` only when you are updating a previous final report
- the seed files listed below

This task is a semantic review, not a code-map summary. Open source files, tests, docs, contracts, schemas and configuration directly. Do not use filename, regex or word-match hints as proof of behavior.

## Source family

```json
{
  "source_family": "src/main",
  "recommended_agent": "interface-contract-analysis",
  "evidence_level_target": "deep",
  "focus": [
    "OpenAPI/runtime parity",
    "SOAP/KYC contract semantics",
    "configuration-driven decisions"
  ],
  "reason": "The final analysis document needs one deep review that ties the REST contract, SOAP contract, service behavior and configuration-driven routing together before making management-level statements.",
  "seed_files": [
    "src/main/resources/openapi.yaml",
    "src/main/resources/wsdl/kyc-status.wsdl",
    "src/main/java/com/acme/onboarding/OnboardingController.java",
    "src/main/java/com/acme/onboarding/OnboardingService.java"
  ],
  "expected_outputs": [
    "contract examples",
    "parity findings",
    "field-level open questions"
  ]
}
```

## Write Output

Write valid JSON to `.analysis/detail_reviews/detail-src-main.json`.

Expected JSON:

```json
{
  "source_family_detail_review": {
    "source_family": "src/main",
    "review_status": "complete|partial|blocked",
    "summary": "Human-readable purpose and role of this source family.",
    "business_view": {
      "purpose": "...",
      "capabilities": [
        {"name":"...", "description":"...", "actors":[], "evidence":[]}
      ],
      "user_or_system_flows": [
        {"name":"...", "description":"...", "evidence":[]}
      ]
    },
    "technical_view": {
      "architecture_role": "...",
      "entry_points": [
        {"name":"...", "protocol":"REST|SOAP|event|job|cli|ui|db|internal|unknown", "path":"optional", "description":"...", "evidence":[]}
      ],
      "exits_or_integrations": [
        {"name":"...", "protocol":"...", "description":"...", "evidence":[]}
      ],
      "data_and_state": [
        {"name":"...", "kind":"entity|table|store|message|state|unknown", "description":"...", "evidence":[]}
      ]
    },
    "flows": [
      {
        "title":"...",
        "summary":"...",
        "mermaid":{"diagram_type":"sequenceDiagram|flowchart TD|stateDiagram-v2", "source":"sequenceDiagram\n  A->>B: ...", "evidence":[]},
        "steps":[{"order":1, "actor":"...", "description":"...", "evidence":[]}],
        "evidence":[]
      }
    ],
    "quality_and_process": {
      "findings": [
        {"title":"...", "category":"bug|security|quality|process|testability|maintainability|documentation|operability", "severity":"low|medium|high|critical", "description":"...", "recommendation":"...", "evidence":[]}
      ],
      "test_readiness": "none|partial|good|strong|unknown",
      "process_improvements": [
        {"title":"...", "description":"...", "evidence":[]}
      ]
    },
    "refactoring_and_target_architecture": {
      "recommendations": [
        {"title":"...", "benefit":"...", "risk":"low|medium|high", "effort":"S|M|L|XL", "target_state":"...", "evidence":[]}
      ]
    },
    "open_questions": [
      {"question":"...", "why_it_matters":"...", "owner":"business|architecture|engineering|operations|unknown", "evidence":[]}
    ],
    "evidence": []
  },
  "analysis_coverage": {
    "summary": "Which source files were inspected for this detail review.",
    "inspected_files": [
      {"path":"relative/path/File.ext", "reason":"...", "evidence":[{"path":"relative/path/File.ext", "line":1}]}
    ],
    "deferred_files": [
      {"path":"relative/path/File.ext", "reason":"generated|duplicate|not_relevant_to_task|superseded_by_contract|too_large|open_question", "evidence":[{"path":"relative/path/File.ext", "line":1}]}
    ],
    "open_questions": []
  }
}
```

Rules:

- Every substantive claim needs file:line evidence.
- If the source family is generated/config/test-only, say so explicitly and explain what can and cannot be inferred.
- Preserve uncertainty. Do not claim business-owner meaning unless code/tests/docs/contracts prove it.
- Include at least one open question when owner-grade semantics are not provable.

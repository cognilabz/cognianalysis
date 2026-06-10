# Tier 1 Whole-Codebase File Cards · source-tier-0001

You are a Cognianalysis Tier 1 source-file analyst.

This task exists because whole-repository documentation is not complete when most files are only deferred. Your job is to author a shallow but real file card for every listed file. This is not the E2E flow review yet; it is the broad base that later technical drilldown and detail agents use.

## Read First

- `.analysis/llm_instructions.md`
- `.analysis/data/source-inventory.json`
- `.analysis/data/source-tier-model.json`
- the exact source files listed below

## Rules

- Open each listed file, or use an already-opened exact source excerpt, before writing its card.
- Do not infer meaning only from file name, path, extension, framework words, regex matches or navigation tags.
- Keep the card short. Use `unknown` or `none` where business meaning is not proven.
- Every file listed below must appear exactly once in `source_file_tier_review.files[]`.
- Every card needs at least one exact evidence reference to the same file.
- Do not use `analysis_coverage.deferred_files` as a substitute for a file card.

## Files For This Batch

```json
[
  {
    "path": "src/main/java/com/acme/onboarding/Customer.java",
    "module": "src/main",
    "language": "Java",
    "lines": 43,
    "bytes": 1357,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
    "module": "src/main",
    "language": "Java",
    "lines": 32,
    "bytes": 1260,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
    "module": "src/main",
    "language": "Java",
    "lines": 46,
    "bytes": 2120,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "docs/examples/customer-verification-soap.xml",
    "module": "docs/examples",
    "language": "XML",
    "lines": 21,
    "bytes": 753,
    "navigation_tags": [
      "structured_file"
    ]
  },
  {
    "path": "docs/openapi.yml",
    "module": "docs",
    "language": "YAML",
    "lines": 78,
    "bytes": 2346,
    "navigation_tags": [
      "structured_file"
    ]
  },
  {
    "path": "docs/soap-kyc.wsdl",
    "module": "docs",
    "language": "WSDL",
    "lines": 29,
    "bytes": 1115,
    "navigation_tags": [
      "structured_file"
    ]
  },
  {
    "path": "src/main/resources/onboarding.wsdl",
    "module": "src/main",
    "language": "WSDL",
    "lines": 38,
    "bytes": 1674,
    "navigation_tags": [
      "structured_file"
    ]
  },
  {
    "path": "src/main/resources/openapi.yaml",
    "module": "src/main",
    "language": "YAML",
    "lines": 77,
    "bytes": 2311,
    "navigation_tags": [
      "structured_file"
    ]
  },
  {
    "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
    "module": "src/main",
    "language": "YAML",
    "lines": 103,
    "bytes": 2793,
    "navigation_tags": [
      "structured_file"
    ]
  },
  {
    "path": "src/main/resources/wsdl/customer-verification.wsdl",
    "module": "src/main",
    "language": "WSDL",
    "lines": 54,
    "bytes": 2161,
    "navigation_tags": [
      "structured_file"
    ]
  },
  {
    "path": "src/main/resources/wsdl/kyc-status.wsdl",
    "module": "src/main",
    "language": "WSDL",
    "lines": 43,
    "bytes": 1767,
    "navigation_tags": [
      "structured_file"
    ]
  },
  {
    "path": "docs/api-examples.md",
    "module": "docs",
    "language": "Markdown",
    "lines": 53,
    "bytes": 1029,
    "navigation_tags": [
      "text_document"
    ]
  },
  {
    "path": "docs/business-examples.md",
    "module": "docs",
    "language": "Markdown",
    "lines": 22,
    "bytes": 428,
    "navigation_tags": [
      "text_document"
    ]
  },
  {
    "path": "docs/business-flows.md",
    "module": "docs",
    "language": "Markdown",
    "lines": 51,
    "bytes": 1175,
    "navigation_tags": [
      "text_document"
    ]
  },
  {
    "path": "src/main/java/com/acme/onboarding/CustomerNotFoundException.java",
    "module": "src/main",
    "language": "Java",
    "lines": 8,
    "bytes": 214,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "src/main/java/com/acme/onboarding/CustomerRepository.java",
    "module": "src/main",
    "language": "Java",
    "lines": 10,
    "bytes": 293,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "src/main/java/com/acme/onboarding/CustomerStatus.java",
    "module": "src/main",
    "language": "Java",
    "lines": 8,
    "bytes": 104,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "src/main/java/com/acme/onboarding/DuplicateCustomerException.java",
    "module": "src/main",
    "language": "Java",
    "lines": 8,
    "bytes": 211,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "src/main/java/com/acme/onboarding/KycClient.java",
    "module": "src/main",
    "language": "Java",
    "lines": 16,
    "bytes": 547,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "src/main/java/com/acme/onboarding/KycRequest.java",
    "module": "src/main",
    "language": "Java",
    "lines": 6,
    "bytes": 143,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "src/main/java/com/acme/onboarding/KycResult.java",
    "module": "src/main",
    "language": "Java",
    "lines": 4,
    "bytes": 93,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "src/main/java/com/acme/onboarding/OnboardingEventPublisher.java",
    "module": "src/main",
    "language": "Java",
    "lines": 19,
    "bytes": 679,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "src/main/java/com/acme/onboarding/OnboardingRequest.java",
    "module": "src/main",
    "language": "Java",
    "lines": 15,
    "bytes": 393,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "src/main/java/com/acme/onboarding/OnboardingResponse.java",
    "module": "src/main",
    "language": "Java",
    "lines": 8,
    "bytes": 340,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "src/main/java/com/acme/onboarding/OnboardingResult.java",
    "module": "src/main",
    "language": "Java",
    "lines": 4,
    "bytes": 142,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "src/main/java/com/acme/onboarding/OnboardingStartedEvent.java",
    "module": "src/main",
    "language": "Java",
    "lines": 4,
    "bytes": 104,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "src/main/java/com/acme/onboarding/OnboardingStatusResponse.java",
    "module": "src/main",
    "language": "Java",
    "lines": 4,
    "bytes": 135,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "src/main/java/com/acme/onboarding/RiskScoringService.java",
    "module": "src/main",
    "language": "Java",
    "lines": 18,
    "bytes": 432,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "src/test/java/com/acme/onboarding/OnboardingServiceTest.java",
    "module": "src/test",
    "language": "Java",
    "lines": 8,
    "bytes": 201,
    "navigation_tags": [
      "source_file"
    ]
  },
  {
    "path": "pom.xml",
    "module": "pom.xml",
    "language": "XML",
    "lines": 12,
    "bytes": 580,
    "navigation_tags": [
      "structured_file"
    ]
  },
  {
    "path": "src/main/resources/application.yml",
    "module": "src/main",
    "language": "YAML",
    "lines": 8,
    "bytes": 129,
    "navigation_tags": [
      "structured_file"
    ]
  },
  {
    "path": "README.md",
    "module": "README.md",
    "language": "Markdown",
    "lines": 4,
    "bytes": 352,
    "navigation_tags": [
      "text_document"
    ]
  }
]
```

## Write Output

Write valid JSON to `.analysis/source_tiers/source-tier-0001.json`.

Expected shape:

```json
{
  "source_file_tier_review": {
    "task_id": "source-tier-0001",
    "tier_model_version": "source-tier-v1",
    "review_status": "complete, partial or blocked",
    "files": [
      {
        "path": "relative/path/File.ext",
        "tier": "tier1_file_card",
        "analysis_depth": 1,
        "summary": "What this file does in human language.",
        "technical_role": "Repository-specific technical role in free text; use unknown when not proven.",
        "business_relevance": "Short proven business relevance, none, or unknown.",
        "relationships": [
          {"target": "relative/path-or-system", "kind": "Repository-specific relationship kind in free text, or unknown.", "description": "..."}
        ],
        "confidence": "Repository-specific confidence statement.",
        "evidence": [{"path":"relative/path/File.ext", "line":1}]
      }
    ],
    "open_questions": []
  },
  "analysis_coverage": {
    "inspected_files": [
      {"path":"relative/path/File.ext", "reason":"Tier 1 file card authored.", "evidence":[{"path":"relative/path/File.ext", "line":1}]}
    ],
    "deferred_files": [],
    "open_questions": []
  }
}
```

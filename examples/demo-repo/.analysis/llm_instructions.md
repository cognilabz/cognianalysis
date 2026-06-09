# Codebase Analysis Pack · LLM-first Instructions

This repository must be analyzed semantically by Codex/LLM. The generated code map is a navigation aid, not the source of final truth.

## Non-negotiable rules

- Treat `code-map.json`, `source-capsules.json` and `important-docs.json` as discovery aids.
- Do **not** treat navigation hints as business facts, technical claims, interfaces, flows or entrypoints.
- Do not use word matches, regex matches or filename matches as proof of behavior. Open the source and reason semantically.
- Use source files, tests, DTO/schema files, OpenAPI/Swagger, SOAP/WSDL/XSD, GraphQL schemas, event schemas, examples, CI/CD files, configuration and documentation as evidence.
- Every relevant assertion must include `evidence: [{"path":"...", "line": 123, "symbol":"optional"}]`.
- Extract requests, responses, contracts, examples, business logic, functions, flows, domain models, data effects, integrations, process readiness, architecture and refactoring options.
- Produce a structured decision basis: functional view, technical view, decision points, risks, recommendations, target architecture/tech-stack options and tool-positioning notes.
- If OpenAPI/Swagger, SOAP/WSDL/XSD, Postman, `.http`, docs or tests contain request/response examples, extract them.
- If no explicit example exists, create an inferred example only when `example_origin` is `inferred`; evidence must point to the source fields and rules used.
- Every meaningful flow must contain Mermaid source. Prefer `sequenceDiagram`; use `flowchart TD` or `stateDiagram-v2` when better.
- Extract business logic and function/use-case examples explicitly; do not bury them only in prose.
- Extract domain/data/integration and process-readiness views; the assessment must not stop at documentation.
- If behavior cannot be proven from code/docs, put it into `open_questions`.
- Keep production code read-only unless explicitly asked otherwise.
- Use English for generated JSON text and report-facing content, while preserving original domain terms and identifiers.

## Target capabilities that must be addressed

```json
[
  {
    "id": "existing-harness-execution",
    "title": "Existing harness execution",
    "expected_outputs": [
      ".analysis/llm_tasks/*.md",
      ".analysis/llm/*.json"
    ]
  },
  {
    "id": "llm-first-semantic-extraction",
    "title": "LLM-first semantic extraction",
    "expected_outputs": [
      "assessment",
      "capabilities",
      "interfaces",
      "flows"
    ]
  },
  {
    "id": "non-authoritative-code-map",
    "title": "Non-authoritative code map signals",
    "expected_outputs": [
      "code_map.extraction_policy.signals_are_authoritative=false"
    ]
  },
  {
    "id": "whole-codebase-source-coverage",
    "title": "Whole-codebase source coverage",
    "expected_outputs": [
      "source_coverage.complete=true",
      "analysis_coverage.inspected_files[]"
    ]
  },
  {
    "id": "business-capabilities",
    "title": "Business capabilities",
    "expected_outputs": [
      "capabilities[]"
    ]
  },
  {
    "id": "functional-view",
    "title": "Functional view",
    "expected_outputs": [
      "assessment.functional_view"
    ]
  },
  {
    "id": "business-logic",
    "title": "Business logic",
    "expected_outputs": [
      "business_logic[]",
      "capabilities[].business_logic[]"
    ]
  },
  {
    "id": "interfaces-contracts",
    "title": "Interfaces and contracts",
    "expected_outputs": [
      "interfaces[]"
    ]
  },
  {
    "id": "request-response-examples",
    "title": "Request/response examples",
    "expected_outputs": [
      "documentation.request_response_examples[]",
      "interfaces[].examples[]"
    ]
  },
  {
    "id": "openapi-swagger",
    "title": "OpenAPI / Swagger extraction",
    "expected_outputs": [
      "documentation.openapi[]",
      "interfaces[].openapi"
    ]
  },
  {
    "id": "soap-wsdl-xsd",
    "title": "SOAP / WSDL / XSD extraction",
    "expected_outputs": [
      "documentation.soap[]",
      "interfaces[].soap"
    ]
  },
  {
    "id": "technical-view",
    "title": "Technical view",
    "expected_outputs": [
      "assessment.technical_view"
    ]
  },
  {
    "id": "mermaid-flows",
    "title": "Flows with Mermaid",
    "expected_outputs": [
      "flows[].mermaid",
      "documentation.mermaid_flows[]"
    ]
  },
  {
    "id": "domain-data-integrations",
    "title": "Domain, data and integrations",
    "expected_outputs": [
      "domain_model",
      "data_model",
      "integrations[]",
      "side_effects[]"
    ]
  },
  {
    "id": "architecture-assessment",
    "title": "Architecture assessment",
    "expected_outputs": [
      "architecture"
    ]
  },
  {
    "id": "process-readiness",
    "title": "Process and readiness assessment",
    "expected_outputs": [
      "process",
      "quality"
    ]
  },
  {
    "id": "quality-risks-findings",
    "title": "Bugs, vulnerabilities and quality findings",
    "expected_outputs": [
      "findings[]",
      "quality.risks[]",
      "quality.security[]"
    ]
  },
  {
    "id": "structured-decision-basis",
    "title": "Structured decision basis",
    "expected_outputs": [
      "assessment.decision_basis"
    ]
  },
  {
    "id": "refactoring-modernization",
    "title": "Refactoring and modernization roadmap",
    "expected_outputs": [
      "refactoring[]",
      "modernization[]"
    ]
  },
  {
    "id": "target-architecture-tech-stack",
    "title": "Target architecture / new tech stack",
    "expected_outputs": [
      "architecture.target_architecture",
      "modernization[].target_state"
    ]
  },
  {
    "id": "tool-alternative-positioning",
    "title": "Tool alternative positioning",
    "expected_outputs": [
      "assessment.tool_positioning"
    ]
  },
  {
    "id": "evidence-governance",
    "title": "Evidence-first governance",
    "expected_outputs": [
      "evidence_index[]"
    ]
  },
  {
    "id": "interactive-html-report",
    "title": "Interactive static HTML report",
    "expected_outputs": [
      ".analysis/report/index.html",
      ".analysis/report/analysis-data.json"
    ]
  },
  {
    "id": "portfolio-mode",
    "title": "Portfolio mode",
    "expected_outputs": [
      "portfolio-analysis/index.html"
    ]
  },
  {
    "id": "harness-portability",
    "title": "Harness portability",
    "expected_outputs": [
      "skills",
      "CLI tools"
    ]
  }
]
```

## Repo snapshot

```json
{
  "repo_name": "demo-repo",
  "root": "/Users/michaelhubeny/homespace/cognianalysis/examples/demo-repo",
  "analyzed_at": "2026-06-09T11:07:11Z",
  "commit": "dc18fff5d4fea61aea020bd2329af031fbbf7a5f",
  "repo_type": "library/application",
  "languages": {
    "Java": 261
  },
  "language_files": {
    "Java": 18
  },
  "frameworks": [],
  "build_tools": [
    "Maven"
  ],
  "package_managers": [
    "Maven"
  ],
  "important_files": [
    "README.md",
    "docs/openapi.yml",
    "pom.xml",
    "src/main/resources/application.yml",
    "src/main/resources/openapi.yaml"
  ],
  "contract_files": [
    "docs/examples/customer-verification-soap.xml",
    "docs/openapi.yml",
    "src/main/resources/openapi.yaml",
    "docs/soap-kyc.wsdl",
    "src/main/resources/wsdl/customer-verification.wsdl",
    "src/main/resources/openapi/customer-onboarding.openapi.yaml",
    "src/main/resources/wsdl/kyc-status.wsdl",
    "src/main/resources/onboarding.wsdl"
  ],
  "example_files": [
    "docs/examples/customer-verification-soap.xml",
    "docs/api-examples.md",
    "docs/business-examples.md"
  ],
  "test_files": 1,
  "source_files": 18,
  "total_files": 32,
  "total_lines": 854,
  "skipped_files": 0
}
```

## Top modules

```json
[
  {
    "id": "com-acme-onboarding-onboardingservice-java",
    "name": "com/acme/onboarding/OnboardingService.java",
    "files": 1,
    "source_files": 1,
    "lines": 46,
    "roles": {
      "source": 1
    },
    "languages": {
      "Java": 46
    },
    "signals": {},
    "top_files": [
      {
        "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
        "score": 58,
        "roles": [
          "source"
        ],
        "signals": 0,
        "symbols": 3
      }
    ]
  },
  {
    "id": "com-acme-onboarding-customer-java",
    "name": "com/acme/onboarding/Customer.java",
    "files": 1,
    "source_files": 1,
    "lines": 43,
    "roles": {
      "source": 1
    },
    "languages": {
      "Java": 43
    },
    "signals": {},
    "top_files": [
      {
        "path": "src/main/java/com/acme/onboarding/Customer.java",
        "score": 66,
        "roles": [
          "source"
        ],
        "signals": 0,
        "symbols": 7
      }
    ]
  },
  {
    "id": "com-acme-onboarding-onboardingcontroller-java",
    "name": "com/acme/onboarding/OnboardingController.java",
    "files": 1,
    "source_files": 1,
    "lines": 32,
    "roles": {
      "source": 1
    },
    "languages": {
      "Java": 32
    },
    "signals": {},
    "top_files": [
      {
        "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
        "score": 58,
        "roles": [
          "source"
        ],
        "signals": 0,
        "symbols": 3
      }
    ]
  },
  {
    "id": "com-acme-onboarding-onboardingeventpublisher-java",
    "name": "com/acme/onboarding/OnboardingEventPublisher.java",
    "files": 1,
    "source_files": 1,
    "lines": 19,
    "roles": {
      "source": 1
    },
    "languages": {
      "Java": 19
    },
    "signals": {},
    "top_files": [
      {
        "path": "src/main/java/com/acme/onboarding/OnboardingEventPublisher.java",
        "score": 46,
        "roles": [
          "source"
        ],
        "signals": 0,
        "symbols": 2
      }
    ]
  },
  {
    "id": "com-acme-onboarding-riskscoringservice-java",
    "name": "com/acme/onboarding/RiskScoringService.java",
    "files": 1,
    "source_files": 1,
    "lines": 18,
    "roles": {
      "source": 1
    },
    "languages": {
      "Java": 18
    },
    "signals": {},
    "top_files": [
      {
        "path": "src/main/java/com/acme/onboarding/RiskScoringService.java",
        "score": 46,
        "roles": [
          "source"
        ],
        "signals": 0,
        "symbols": 2
      }
    ]
  },
  {
    "id": "com-acme-onboarding-kycclient-java",
    "name": "com/acme/onboarding/KycClient.java",
    "files": 1,
    "source_files": 1,
    "lines": 16,
    "roles": {
      "source": 1
    },
    "languages": {
      "Java": 16
    },
    "signals": {},
    "top_files": [
      {
        "path": "src/main/java/com/acme/onboarding/KycClient.java",
        "score": 46,
        "roles": [
          "source"
        ],
        "signals": 0,
        "symbols": 2
      }
    ]
  },
  {
    "id": "com-acme-onboarding-onboardingrequest-java",
    "name": "com/acme/onboarding/OnboardingRequest.java",
    "files": 1,
    "source_files": 1,
    "lines": 15,
    "roles": {
      "source": 1
    },
    "languages": {
      "Java": 15
    },
    "signals": {},
    "top_files": [
      {
        "path": "src/main/java/com/acme/onboarding/OnboardingRequest.java",
        "score": 46,
        "roles": [
          "source"
        ],
        "signals": 0,
        "symbols": 2
      }
    ]
  },
  {
    "id": "com-acme-onboarding-customerrepository-java",
    "name": "com/acme/onboarding/CustomerRepository.java",
    "files": 1,
    "source_files": 1,
    "lines": 10,
    "roles": {
      "source": 1
    },
    "languages": {
      "Java": 10
    },
    "signals": {},
    "top_files": [
      {
        "path": "src/main/java/com/acme/onboarding/CustomerRepository.java",
        "score": 46,
        "roles": [
          "source"
        ],
        "signals": 0,
        "symbols": 2
      }
    ]
  },
  {
    "id": "src-test-java-com",
    "name": "src/test/java/com",
    "files": 1,
    "source_files": 1,
    "lines": 8,
    "roles": {
      "source": 1,
      "test": 1
    },
    "languages": {
      "Java": 8
    },
    "signals": {},
    "top_files": [
      {
        "path": "src/test/java/com/acme/onboarding/OnboardingServiceTest.java",
        "score": 74,
        "roles": [
          "source",
          "test"
        ],
        "signals": 0,
        "symbols": 1
      }
    ]
  },
  {
    "id": "com-acme-onboarding-onboardingresponse-java",
    "name": "com/acme/onboarding/OnboardingResponse.java",
    "files": 1,
    "source_files": 1,
    "lines": 8,
    "roles": {
      "source": 1
    },
    "languages": {
      "Java": 8
    },
    "signals": {},
    "top_files": [
      {
        "path": "src/main/java/com/acme/onboarding/OnboardingResponse.java",
        "score": 48,
        "roles": [
          "source"
        ],
        "signals": 0,
        "symbols": 3
      }
    ]
  },
  {
    "id": "com-acme-onboarding-customerstatus-java",
    "name": "com/acme/onboarding/CustomerStatus.java",
    "files": 1,
    "source_files": 1,
    "lines": 8,
    "roles": {
      "source": 1
    },
    "languages": {
      "Java": 8
    },
    "signals": {},
    "top_files": [
      {
        "path": "src/main/java/com/acme/onboarding/CustomerStatus.java",
        "score": 46,
        "roles": [
          "source"
        ],
        "signals": 0,
        "symbols": 2
      }
    ]
  },
  {
    "id": "com-acme-onboarding-customernotfoundexception-java",
    "name": "com/acme/onboarding/CustomerNotFoundException.java",
    "files": 1,
    "source_files": 1,
    "lines": 8,
    "roles": {
      "source": 1
    },
    "languages": {
      "Java": 8
    },
    "signals": {},
    "top_files": [
      {
        "path": "src/main/java/com/acme/onboarding/CustomerNotFoundException.java",
        "score": 44,
        "roles": [
          "source"
        ],
        "signals": 0,
        "symbols": 1
      }
    ]
  },
  {
    "id": "com-acme-onboarding-duplicatecustomerexception-java",
    "name": "com/acme/onboarding/DuplicateCustomerException.java",
    "files": 1,
    "source_files": 1,
    "lines": 8,
    "roles": {
      "source": 1
    },
    "languages": {
      "Java": 8
    },
    "signals": {},
    "top_files": [
      {
        "path": "src/main/java/com/acme/onboarding/DuplicateCustomerException.java",
        "score": 44,
        "roles": [
          "source"
        ],
        "signals": 0,
        "symbols": 1
      }
    ]
  },
  {
    "id": "com-acme-onboarding-kycrequest-java",
    "name": "com/acme/onboarding/KycRequest.java",
    "files": 1,
    "source_files": 1,
    "lines": 6,
    "roles": {
      "source": 1
    },
    "languages": {
      "Java": 6
    },
    "signals": {},
    "top_files": [
      {
        "path": "src/main/java/com/acme/onboarding/KycRequest.java",
        "score": 46,
        "roles": [
          "source"
        ],
        "signals": 0,
        "symbols": 2
      }
    ]
  }
]
```

## Important docs / contracts / example candidates

```json
[
  {
    "path": "docs/examples/customer-verification-soap.xml",
    "language": "XML",
    "roles": [
      "documentation",
      "example",
      "soap_contract"
    ],
    "signals": [],
    "score": 439,
    "lines": 21
  },
  {
    "path": "docs/openapi.yml",
    "language": "YAML",
    "roles": [
      "api_contract",
      "config",
      "documentation"
    ],
    "signals": [
      {
        "type": "api_contract_candidate",
        "label": "OpenAPI/Swagger artifact candidate",
        "path": "docs/openapi.yml",
        "line": 1,
        "confidence": "navigation"
      }
    ],
    "score": 391,
    "lines": 78
  },
  {
    "path": "docs/soap-kyc.wsdl",
    "language": "WSDL",
    "roles": [
      "documentation",
      "soap_contract"
    ],
    "signals": [
      {
        "type": "soap_contract_candidate",
        "label": "SOAP/WSDL/XSD artifact candidate",
        "path": "docs/soap-kyc.wsdl",
        "line": 1,
        "confidence": "navigation"
      }
    ],
    "score": 346,
    "lines": 29
  },
  {
    "path": "src/main/resources/openapi.yaml",
    "language": "YAML",
    "roles": [
      "api_contract",
      "config"
    ],
    "signals": [
      {
        "type": "api_contract_candidate",
        "label": "OpenAPI/Swagger artifact candidate",
        "path": "src/main/resources/openapi.yaml",
        "line": 1,
        "confidence": "navigation"
      }
    ],
    "score": 312,
    "lines": 77
  },
  {
    "path": "src/main/resources/wsdl/customer-verification.wsdl",
    "language": "WSDL",
    "roles": [
      "soap_contract"
    ],
    "signals": [
      {
        "type": "soap_contract_candidate",
        "label": "SOAP/WSDL/XSD artifact candidate",
        "path": "src/main/resources/wsdl/customer-verification.wsdl",
        "line": 1,
        "confidence": "navigation"
      }
    ],
    "score": 279,
    "lines": 54
  },
  {
    "path": "docs/api-examples.md",
    "language": "Markdown",
    "roles": [
      "documentation",
      "example"
    ],
    "signals": [
      {
        "type": "documentation_candidate",
        "label": "Documentation artifact candidate",
        "path": "docs/api-examples.md",
        "line": 1,
        "confidence": "navigation"
      }
    ],
    "score": 278,
    "lines": 53
  },
  {
    "path": "docs/business-examples.md",
    "language": "Markdown",
    "roles": [
      "documentation",
      "example"
    ],
    "signals": [
      {
        "type": "documentation_candidate",
        "label": "Documentation artifact candidate",
        "path": "docs/business-examples.md",
        "line": 1,
        "confidence": "navigation"
      }
    ],
    "score": 278,
    "lines": 22
  },
  {
    "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
    "language": "YAML",
    "roles": [
      "api_contract",
      "config"
    ],
    "signals": [
      {
        "type": "api_contract_candidate",
        "label": "OpenAPI/Swagger artifact candidate",
        "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
        "line": 1,
        "confidence": "navigation"
      }
    ],
    "score": 277,
    "lines": 103
  },
  {
    "path": "src/main/resources/wsdl/kyc-status.wsdl",
    "language": "WSDL",
    "roles": [
      "soap_contract"
    ],
    "signals": [
      {
        "type": "soap_contract_candidate",
        "label": "SOAP/WSDL/XSD artifact candidate",
        "path": "src/main/resources/wsdl/kyc-status.wsdl",
        "line": 1,
        "confidence": "navigation"
      }
    ],
    "score": 277,
    "lines": 43
  },
  {
    "path": "src/main/resources/onboarding.wsdl",
    "language": "WSDL",
    "roles": [
      "soap_contract"
    ],
    "signals": [
      {
        "type": "soap_contract_candidate",
        "label": "SOAP/WSDL/XSD artifact candidate",
        "path": "src/main/resources/onboarding.wsdl",
        "line": 1,
        "confidence": "navigation"
      }
    ],
    "score": 267,
    "lines": 38
  },
  {
    "path": "README.md",
    "language": "Markdown",
    "roles": [
      "documentation"
    ],
    "signals": [
      {
        "type": "documentation_candidate",
        "label": "Documentation artifact candidate",
        "path": "README.md",
        "line": 1,
        "confidence": "navigation"
      }
    ],
    "score": 158,
    "lines": 4
  },
  {
    "path": "docs/business-flows.md",
    "language": "Markdown",
    "roles": [
      "documentation"
    ],
    "signals": [
      {
        "type": "documentation_candidate",
        "label": "Documentation artifact candidate",
        "path": "docs/business-flows.md",
        "line": 1,
        "confidence": "navigation"
      }
    ],
    "score": 133,
    "lines": 51
  },
  {
    "path": "src/test/java/com/acme/onboarding/OnboardingServiceTest.java",
    "language": "Java",
    "roles": [
      "source",
      "test"
    ],
    "signals": [],
    "score": 74,
    "lines": 8
  },
  {
    "path": "src/main/resources/application.yml",
    "language": "YAML",
    "roles": [
      "config"
    ],
    "signals": [],
    "score": 53,
    "lines": 8
  },
  {
    "path": "pom.xml",
    "language": "XML",
    "roles": [
      "build"
    ],
    "signals": [],
    "score": 45,
    "lines": 12
  }
]
```

## Artifact navigation hints, not final facts

```json
[
  {
    "type": "documentation_candidate",
    "label": "Documentation artifact candidate",
    "path": "docs/api-examples.md",
    "line": 1,
    "confidence": "navigation"
  },
  {
    "type": "documentation_candidate",
    "label": "Documentation artifact candidate",
    "path": "docs/business-examples.md",
    "line": 1,
    "confidence": "navigation"
  },
  {
    "type": "documentation_candidate",
    "label": "Documentation artifact candidate",
    "path": "docs/business-flows.md",
    "line": 1,
    "confidence": "navigation"
  },
  {
    "type": "api_contract_candidate",
    "label": "OpenAPI/Swagger artifact candidate",
    "path": "docs/openapi.yml",
    "line": 1,
    "confidence": "navigation"
  },
  {
    "type": "soap_contract_candidate",
    "label": "SOAP/WSDL/XSD artifact candidate",
    "path": "docs/soap-kyc.wsdl",
    "line": 1,
    "confidence": "navigation"
  },
  {
    "type": "documentation_candidate",
    "label": "Documentation artifact candidate",
    "path": "README.md",
    "line": 1,
    "confidence": "navigation"
  },
  {
    "type": "soap_contract_candidate",
    "label": "SOAP/WSDL/XSD artifact candidate",
    "path": "src/main/resources/onboarding.wsdl",
    "line": 1,
    "confidence": "navigation"
  },
  {
    "type": "api_contract_candidate",
    "label": "OpenAPI/Swagger artifact candidate",
    "path": "src/main/resources/openapi.yaml",
    "line": 1,
    "confidence": "navigation"
  },
  {
    "type": "api_contract_candidate",
    "label": "OpenAPI/Swagger artifact candidate",
    "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
    "line": 1,
    "confidence": "navigation"
  },
  {
    "type": "soap_contract_candidate",
    "label": "SOAP/WSDL/XSD artifact candidate",
    "path": "src/main/resources/wsdl/customer-verification.wsdl",
    "line": 1,
    "confidence": "navigation"
  },
  {
    "type": "soap_contract_candidate",
    "label": "SOAP/WSDL/XSD artifact candidate",
    "path": "src/main/resources/wsdl/kyc-status.wsdl",
    "line": 1,
    "confidence": "navigation"
  }
]
```

## Top glossary terms

Domain terms must be extracted by Codex/LLM from source evidence, not from generated word lists.

## Context capsules

The full included file inventory is in `.analysis/data/source-inventory.json`. The source excerpts are in `.analysis/source-capsules.json`. Use capsules to decide what to open next, but inspect full source files whenever evidence is needed. Do not treat capsule coverage as whole-codebase coverage.

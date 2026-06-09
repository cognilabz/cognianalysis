# Core Assessment and Decision Summary

You are running inside Codex as the semantic extraction step for Codebase Analysis Pack.

Read these files first:

- `.analysis/llm_instructions.md`
- `.analysis/data/code-map.json`
- `.analysis/data/source-inventory.json`
- `.analysis/data/important-docs.json`
- `.analysis/source-capsules.json`

Then open source files, tests, docs, contracts, schemas and configuration as needed. The source capsules and artifact hints are only navigation aids. The source inventory defines the full included analysis scope; do not stop at the top capsules.

Write your result to `.analysis/llm/core-assessment.json` as valid JSON.

Evidence format for every relevant claim:

```json
{"path": "relative/path/File.ext", "line": 123, "symbol": "optionalSymbol"}
```

General rules:

- Use English for generated descriptions. Preserve original identifiers and domain names.
- Do not include markdown in the JSON output.
- Prefer concrete evidence over speculation.
- Do not promote generated hints, word matches, regex matches or filename matches into semantic conclusions.
- Account for source coverage. Every output must include `analysis_coverage.inspected_files[]` for files you opened or semantically considered, and `analysis_coverage.deferred_files[]` for inventory files intentionally not relevant to this task. The final completeness task must reconcile the full inventory.
- Use `confidence: "high|medium|low"` and `open_questions` when behavior is unclear.
- Do not modify production source files.

Rules for examples:

- Extract existing request/response examples from docs, OpenAPI/Swagger examples, SOAP/WSDL examples, Postman collections, `.http` files and tests when present.
- If examples are not present but can be inferred from DTO/schema/tests, include them with `example_origin: "inferred"` and evidence for every meaningful field.
- Never label inferred examples as source-provided.
- Include payload examples as JSON/XML/string objects or escaped strings. Keep them small but realistic.
- Include Mermaid diagrams as source text in a `mermaid` object or `mermaid_flows` entries.

## Navigation hints

```json
{
  "repo": {
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
  },
  "source_inventory": {
    "file_count": 32,
    "source_files": 18,
    "skipped_files": 0,
    "inventory_file": ".analysis/data/source-inventory.json"
  },
  "top_modules": [
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
    }
  ],
  "important_docs": [
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
  ],
  "artifact_navigation_hints": [
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
  ],
  "top_capsules": [
    {
      "path": "docs/examples/customer-verification-soap.xml",
      "roles": [
        "documentation",
        "example",
        "soap_contract"
      ],
      "signals": [],
      "symbols": []
    },
    {
      "path": "docs/openapi.yml",
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
      "symbols": []
    },
    {
      "path": "src/main/resources/openapi.yaml",
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
      "symbols": []
    },
    {
      "path": "docs/soap-kyc.wsdl",
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
      "symbols": [
        {
          "type": "xml_element",
          "name": "VerifyIdentityRequest",
          "path": "docs/soap-kyc.wsdl",
          "line": 7
        },
        {
          "type": "xml_element",
          "name": "VerifyIdentityResponse",
          "path": "docs/soap-kyc.wsdl",
          "line": 12
        },
        {
          "type": "xml_element",
          "name": "VerifyIdentity",
          "path": "docs/soap-kyc.wsdl",
          "line": 17
        },
        {
          "type": "xml_element",
          "name": "VerifyIdentity",
          "path": "docs/soap-kyc.wsdl",
          "line": 24
        }
      ]
    },
    {
      "path": "docs/api-examples.md",
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
      "symbols": []
    },
    {
      "path": "docs/business-examples.md",
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
      "symbols": []
    },
    {
      "path": "src/main/resources/wsdl/customer-verification.wsdl",
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
      "symbols": [
        {
          "type": "xml_element",
          "name": "VerifyCustomerRequest",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 10
        },
        {
          "type": "xml_element",
          "name": "customerId",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 13
        },
        {
          "type": "xml_element",
          "name": "birthDate",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 14
        },
        {
          "type": "xml_element",
          "name": "VerifyCustomerResponse",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 18
        },
        {
          "type": "xml_element",
          "name": "approved",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 21
        },
        {
          "type": "xml_element",
          "name": "reference",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 22
        },
        {
          "type": "xml_element",
          "name": "VerifyCustomerInput",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 28
        },
        {
          "type": "xml_element",
          "name": "VerifyCustomerOutput",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 31
        }
      ]
    },
    {
      "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
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
      "symbols": []
    },
    {
      "path": "src/main/resources/wsdl/kyc-status.wsdl",
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
      "symbols": [
        {
          "type": "xml_element",
          "name": "GetKycStatusRequest",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 9
        },
        {
          "type": "xml_element",
          "name": "kycReference",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 12
        },
        {
          "type": "xml_element",
          "name": "GetKycStatusResponse",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 16
        },
        {
          "type": "xml_element",
          "name": "approved",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 19
        },
        {
          "type": "xml_element",
          "name": "reference",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 20
        },
        {
          "type": "xml_element",
          "name": "GetKycStatusInput",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 26
        },
        {
          "type": "xml_element",
          "name": "GetKycStatusOutput",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 27
        },
        {
          "type": "xml_element",
          "name": "GetKycStatus",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 29
        }
      ]
    },
    {
      "path": "src/main/resources/onboarding.wsdl",
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
      "symbols": [
        {
          "type": "xml_element",
          "name": "StartOnboardingRequest",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 8
        },
        {
          "type": "xml_element",
          "name": "StartOnboardingResponse",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 14
        },
        {
          "type": "xml_element",
          "name": "StartOnboarding",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 19
        },
        {
          "type": "xml_element",
          "name": "StartOnboarding",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 26
        }
      ]
    },
    {
      "path": "README.md",
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
      "symbols": []
    },
    {
      "path": "src/test/java/com/acme/onboarding/OnboardingServiceTest.java",
      "roles": [
        "source",
        "test"
      ],
      "signals": [],
      "symbols": [
        {
          "type": "class",
          "name": "OnboardingServiceTest",
          "path": "src/test/java/com/acme/onboarding/OnboardingServiceTest.java",
          "line": 3
        }
      ]
    },
    {
      "path": "src/main/java/com/acme/onboarding/Customer.java",
      "roles": [
        "source"
      ],
      "signals": [],
      "symbols": [
        {
          "type": "class",
          "name": "Customer",
          "path": "src/main/java/com/acme/onboarding/Customer.java",
          "line": 5
        },
        {
          "type": "method",
          "name": "pending",
          "path": "src/main/java/com/acme/onboarding/Customer.java",
          "line": 16
        },
        {
          "type": "method",
          "name": "markManualReview",
          "path": "src/main/java/com/acme/onboarding/Customer.java",
          "line": 26
        },
        {
          "type": "method",
          "name": "activate",
          "path": "src/main/java/com/acme/onboarding/Customer.java",
          "line": 33
        },
        {
          "type": "method",
          "name": "id",
          "path": "src/main/java/com/acme/onboarding/Customer.java",
          "line": 39
        },
        {
          "type": "method",
          "name": "status",
          "path": "src/main/java/com/acme/onboarding/Customer.java",
          "line": 40
        },
        {
          "type": "method",
          "name": "reviewReason",
          "path": "src/main/java/com/acme/onboarding/Customer.java",
          "line": 41
        }
      ]
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
      "roles": [
        "source"
      ],
      "signals": [],
      "symbols": [
        {
          "type": "class",
          "name": "OnboardingController",
          "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
          "line": 14
        },
        {
          "type": "method",
          "name": "onboard",
          "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
          "line": 22
        },
        {
          "type": "method",
          "name": "status",
          "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
          "line": 28
        }
      ]
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
      "roles": [
        "source"
      ],
      "signals": [],
      "symbols": [
        {
          "type": "class",
          "name": "OnboardingService",
          "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
          "line": 8
        },
        {
          "type": "method",
          "name": "startOnboarding",
          "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
          "line": 23
        },
        {
          "type": "method",
          "name": "getStatus",
          "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
          "line": 40
        }
      ]
    },
    {
      "path": "docs/business-flows.md",
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
      "symbols": []
    },
    {
      "path": "src/main/resources/application.yml",
      "roles": [
        "config"
      ],
      "signals": [],
      "symbols": []
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingResponse.java",
      "roles": [
        "source"
      ],
      "signals": [],
      "symbols": [
        {
          "type": "class",
          "name": "OnboardingResponse",
          "path": "src/main/java/com/acme/onboarding/OnboardingResponse.java",
          "line": 3
        },
        {
          "type": "method",
          "name": "OnboardingResponse",
          "path": "src/main/java/com/acme/onboarding/OnboardingResponse.java",
          "line": 3
        },
        {
          "type": "method",
          "name": "from",
          "path": "src/main/java/com/acme/onboarding/OnboardingResponse.java",
          "line": 4
        }
      ]
    }
  ],
  "glossary": []
}
```

## Expected JSON

{
  "assessment": {
    "executive_summary": "Decision-grade summary of what the repository appears to do and how complete the extraction is.",
    "system_purpose": "Business purpose inferred from code/docs/tests.",
    "assessment_scope": ["What was analyzed"],
    "key_capabilities": ["Short capability names"],
    "key_interfaces": ["Main inbound/outbound interfaces"],
    "functional_view": {
      "summary": "What the system does from a business/user perspective.",
      "actors": ["actor or system role"],
      "capabilities": ["capability"],
      "user_or_system_flows": [{"name":"flow", "description":"...", "evidence": []}],
      "evidence": []
    },
    "technical_view": {
      "summary": "How the system is built and integrated.",
      "apis": ["API or interface"],
      "architecture": ["architecture component or style"],
      "data_and_integrations": ["data store, message, external system"],
      "evidence": []
    },
    "decision_basis": {
      "decision_summary": "Decision-grade conclusion for stakeholders.",
      "recommended_actions": [{"title":"action", "rationale":"...", "priority":"low|medium|high", "evidence": []}],
      "tradeoffs": [{"topic":"...", "options": [], "recommendation":"...", "evidence": []}],
      "readiness": {"status":"not_ready|partially_ready|ready", "rationale":"...", "evidence": []},
      "evidence": []
    },
    "tool_positioning": {
      "summary": "How this analysis output acts as an alternative or complement to existing code analysis/documentation tools.",
      "automation_level": "manual|assisted|mostly_automated|fully_automated",
      "strengths_vs_traditional_tools": [],
      "boundaries": [],
      "evidence": []
    },
    "top_risks": [
      {"title":"risk", "severity":"low|medium|high|critical", "description":"...", "evidence": []}
    ],
    "completeness": {
      "business_logic": "none|partial|good|strong",
      "interfaces": "none|partial|good|strong",
      "flows": "none|partial|good|strong",
      "examples": "none|partial|good|strong",
      "process_readiness": "none|partial|good|strong",
      "refactoring_roadmap": "none|partial|good|strong"
    },
    "recommended_next_steps": [
      {"title":"step", "reason":"...", "evidence": []}
    ],
    "open_questions": []
  }
}

## Required Source Coverage Accounting

For this task, list the files you inspected for this extraction area and the files from the inventory that you intentionally deferred for this extraction area.

Include this top-level object in the JSON:

```json
{
  "analysis_coverage": {
    "summary": "How much of the included source inventory this task covered.",
    "inspected_files": [
      {"path": "relative/path/File.ext", "reason": "Why this file was inspected for semantic extraction.", "evidence": [{"path": "relative/path/File.ext", "line": 1}]}
    ],
    "deferred_files": [
      {"path": "relative/path/File.ext", "reason": "generated|duplicate|not_relevant_to_task|superseded_by_contract|too_large|open_question", "evidence": [{"path": "relative/path/File.ext", "line": 1}]}
    ],
    "open_questions": []
  }
}
```

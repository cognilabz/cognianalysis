# Business Capabilities and Business Logic

You are running inside Codex as the semantic extraction step for Codebase Analysis Pack.

Read these files first:

- `.analysis/llm_instructions.md`
- `.analysis/data/code-map.json`
- `.analysis/data/important-docs.json`
- `.analysis/source-capsules.json`

Then open source files, tests, docs, contracts, schemas and configuration as needed. The source capsules and signals are only navigation hints.

Write your result to `.analysis/llm/business-capabilities-logic.json` as valid JSON.

Evidence format for every relevant claim:

```json
{"path": "relative/path/File.ext", "line": 123, "symbol": "optionalSymbol"}
```

General rules:

- Use English for generated descriptions. Preserve original identifiers and domain names.
- Do not include markdown in the JSON output.
- Prefer concrete evidence over speculation.
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
    "root": "/mnt/data/cba_v06_work/examples/demo-repo",
    "analyzed_at": "2026-06-09T07:15:02Z",
    "commit": null,
    "repo_type": "service/api",
    "languages": {
      "Java": 261
    },
    "language_files": {
      "Java": 18
    },
    "frameworks": [
      "Echo",
      "Spring Boot"
    ],
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
      "docs/openapi.yml",
      "src/main/resources/openapi.yaml",
      "src/main/resources/wsdl/customer-verification.wsdl",
      "src/main/resources/openapi/customer-onboarding.openapi.yaml",
      "src/main/resources/onboarding.wsdl",
      "src/main/resources/wsdl/kyc-status.wsdl",
      "docs/examples/customer-verification-soap.xml",
      "docs/soap-kyc.wsdl"
    ],
    "example_files": [
      "docs/openapi.yml",
      "src/main/resources/openapi.yaml",
      "src/main/resources/wsdl/customer-verification.wsdl",
      "src/main/resources/openapi/customer-onboarding.openapi.yaml",
      "src/main/resources/onboarding.wsdl",
      "src/main/resources/wsdl/kyc-status.wsdl",
      "docs/api-examples.md",
      "docs/examples/customer-verification-soap.xml",
      ".analysis-seed/llm/documentation-examples.json",
      "docs/soap-kyc.wsdl",
      ".analysis-seed/llm/business-domain-logic.json",
      "docs/business-examples.md",
      ".analysis-seed/llm/data-integrations.json",
      "docs/business-flows.md",
      ".analysis-seed/llm/flows.json",
      "src/main/resources/application.yml",
      ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "src/main/java/com/acme/onboarding/OnboardingController.java",
      ".analysis-seed/llm/goal-coverage-review.json",
      "src/main/java/com/acme/onboarding/OnboardingService.java",
      "src/main/java/com/acme/onboarding/RiskScoringService.java",
      ".analysis-seed/llm/interfaces.json",
      "src/main/java/com/acme/onboarding/KycClient.java"
    ],
    "test_files": 1,
    "source_files": 18,
    "total_files": 41,
    "total_lines": 3471
  },
  "top_modules": [
    {
      "id": "com-acme-onboarding-onboardingservice-java",
      "name": "com/acme/onboarding/OnboardingService.java",
      "files": 1,
      "source_files": 1,
      "lines": 46,
      "roles": {
        "service": 1
      },
      "languages": {
        "Java": 46
      },
      "signals": {
        "request_response_doc": 1,
        "database_touchpoint_hint": 1,
        "validation_or_business_rule_hint": 3
      },
      "top_files": [
        {
          "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
          "score": 116,
          "roles": [
            "service"
          ],
          "signals": 5,
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
      "roles": {},
      "languages": {
        "Java": 43
      },
      "signals": {
        "validation_or_business_rule_hint": 6
      },
      "top_files": [
        {
          "path": "src/main/java/com/acme/onboarding/Customer.java",
          "score": 78,
          "roles": [],
          "signals": 6,
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
        "controller": 1
      },
      "languages": {
        "Java": 32
      },
      "signals": {
        "request_response_doc": 1,
        "http_route_hint": 3,
        "validation_or_business_rule_hint": 2
      },
      "top_files": [
        {
          "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
          "score": 130,
          "roles": [
            "controller"
          ],
          "signals": 6,
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
        "integration": 1
      },
      "languages": {
        "Java": 19
      },
      "signals": {
        "event_or_message_hint": 2,
        "validation_or_business_rule_hint": 2,
        "external_call_hint": 1,
        "ui_route_hint": 2
      },
      "top_files": [
        {
          "path": "src/main/java/com/acme/onboarding/OnboardingEventPublisher.java",
          "score": 109,
          "roles": [
            "integration"
          ],
          "signals": 7,
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
        "service": 1
      },
      "languages": {
        "Java": 18
      },
      "signals": {
        "request_response_doc": 1,
        "validation_or_business_rule_hint": 4
      },
      "top_files": [
        {
          "path": "src/main/java/com/acme/onboarding/RiskScoringService.java",
          "score": 104,
          "roles": [
            "service"
          ],
          "signals": 5,
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
        "integration": 1
      },
      "languages": {
        "Java": 16
      },
      "signals": {
        "request_response_doc": 1,
        "external_call_hint": 3,
        "ui_route_hint": 2
      },
      "top_files": [
        {
          "path": "src/main/java/com/acme/onboarding/KycClient.java",
          "score": 100,
          "roles": [
            "integration"
          ],
          "signals": 6,
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
        "domain": 1
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
            "domain"
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
        "persistence": 1
      },
      "languages": {
        "Java": 10
      },
      "signals": {
        "database_touchpoint_hint": 1
      },
      "top_files": [
        {
          "path": "src/main/java/com/acme/onboarding/CustomerRepository.java",
          "score": 49,
          "roles": [
            "persistence"
          ],
          "signals": 1,
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
        "service": 1,
        "test": 1
      },
      "languages": {
        "Java": 8
      },
      "signals": {},
      "top_files": [
        {
          "path": "src/test/java/com/acme/onboarding/OnboardingServiceTest.java",
          "score": 87,
          "roles": [
            "service",
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
        "domain": 1
      },
      "languages": {
        "Java": 8
      },
      "signals": {
        "validation_or_business_rule_hint": 2
      },
      "top_files": [
        {
          "path": "src/main/java/com/acme/onboarding/OnboardingResponse.java",
          "score": 66,
          "roles": [
            "domain"
          ],
          "signals": 2,
          "symbols": 3
        }
      ]
    }
  ],
  "important_docs": [
    {
      "path": "docs/openapi.yml",
      "language": "YAML",
      "roles": [
        "api_contract",
        "controller",
        "documentation"
      ],
      "signals": [
        {
          "type": "api_contract",
          "label": "OpenAPI/Swagger candidate",
          "path": "docs/openapi.yml",
          "line": 1,
          "confidence": "hint"
        },
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "docs/openapi.yml",
          "line": 20,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required: true",
          "path": "docs/openapi.yml",
          "line": 11,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk customer with referral code",
          "path": "docs/openapi.yml",
          "line": 18,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status: ACTIVE",
          "path": "docs/openapi.yml",
          "line": 36,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status:",
          "path": "docs/openapi.yml",
          "line": 39,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required: true",
          "path": "docs/openapi.yml",
          "line": 46,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status",
          "path": "docs/openapi.yml",
          "line": 51,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status: MANUAL_REVIEW",
          "path": "docs/openapi.yml",
          "line": 58,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required: [email, firstName, lastName, birthDate]",
          "path": "docs/openapi.yml",
          "line": 64,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status: { type: string, enum: [PENDING, ACTIVE, MANUAL_REVIEW] }",
          "path": "docs/openapi.yml",
          "line": 75,
          "confidence": "hint"
        },
        {
          "type": "ui_route_hint",
          "label": "path",
          "path": "docs/openapi.yml",
          "line": 45,
          "confidence": "hint"
        }
      ],
      "score": 559,
      "lines": 78
    },
    {
      "path": "docs/examples/customer-verification-soap.xml",
      "language": "XML",
      "roles": [
        "documentation",
        "example",
        "soap_contract"
      ],
      "signals": [
        {
          "type": "soap_contract",
          "label": "SOAP/WSDL/XSD candidate",
          "path": "docs/examples/customer-verification-soap.xml",
          "line": 1,
          "confidence": "hint"
        },
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "docs/examples/customer-verification-soap.xml",
          "line": 1,
          "confidence": "hint"
        }
      ],
      "score": 537,
      "lines": 21
    },
    {
      "path": "src/main/resources/openapi.yaml",
      "language": "YAML",
      "roles": [
        "api_contract",
        "controller"
      ],
      "signals": [
        {
          "type": "api_contract",
          "label": "OpenAPI/Swagger candidate",
          "path": "src/main/resources/openapi.yaml",
          "line": 1,
          "confidence": "hint"
        },
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "src/main/resources/openapi.yaml",
          "line": 19,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required: true",
          "path": "src/main/resources/openapi.yaml",
          "line": 11,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status: ACTIVE",
          "path": "src/main/resources/openapi.yaml",
          "line": 35,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status:",
          "path": "src/main/resources/openapi.yaml",
          "line": 38,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status",
          "path": "src/main/resources/openapi.yaml",
          "line": 41,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required: true",
          "path": "src/main/resources/openapi.yaml",
          "line": 45,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status",
          "path": "src/main/resources/openapi.yaml",
          "line": 50,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status: MANUAL_REVIEW",
          "path": "src/main/resources/openapi.yaml",
          "line": 57,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk score too high",
          "path": "src/main/resources/openapi.yaml",
          "line": 58,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required: [email, firstName, lastName, birthDate]",
          "path": "src/main/resources/openapi.yaml",
          "line": 63,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status: { type: string, enum: [PENDING, ACTIVE, MANUAL_REVIEW] }",
          "path": "src/main/resources/openapi.yaml",
          "line": 74,
          "confidence": "hint"
        }
      ],
      "score": 480,
      "lines": 77
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
          "type": "soap_contract",
          "label": "SOAP/WSDL/XSD candidate",
          "path": "docs/soap-kyc.wsdl",
          "line": 4,
          "confidence": "hint"
        },
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "docs/soap-kyc.wsdl",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message name=\"VerifyIdentityRequest\">",
          "path": "docs/soap-kyc.wsdl",
          "line": 7,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message>",
          "path": "docs/soap-kyc.wsdl",
          "line": 11,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message name=\"VerifyIdentityResponse\">",
          "path": "docs/soap-kyc.wsdl",
          "line": 12,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message>",
          "path": "docs/soap-kyc.wsdl",
          "line": 15,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message=\"tns:VerifyIdentityRequest\" />",
          "path": "docs/soap-kyc.wsdl",
          "line": 18,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message=\"tns:VerifyIdentityResponse\" />",
          "path": "docs/soap-kyc.wsdl",
          "line": 19,
          "confidence": "hint"
        }
      ],
      "score": 454,
      "lines": 29
    },
    {
      "path": "src/main/resources/wsdl/customer-verification.wsdl",
      "language": "WSDL",
      "roles": [
        "controller",
        "soap_contract"
      ],
      "signals": [
        {
          "type": "soap_contract",
          "label": "SOAP/WSDL/XSD candidate",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 4,
          "confidence": "hint"
        },
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message name=\"VerifyCustomerInput\">",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 28,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message>",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 30,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message name=\"VerifyCustomerOutput\">",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 31,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message>",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 33,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message=\"tns:VerifyCustomerInput\"/>",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 36,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message=\"tns:VerifyCustomerOutput\"/>",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 37,
          "confidence": "hint"
        }
      ],
      "score": 447,
      "lines": 54
    },
    {
      "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
      "language": "YAML",
      "roles": [
        "api_contract",
        "controller"
      ],
      "signals": [
        {
          "type": "api_contract",
          "label": "OpenAPI/Swagger candidate",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 1,
          "confidence": "hint"
        },
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 20,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required: true",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 11,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status: ACTIVE",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 36,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status:",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 41,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status for a customer",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 44,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required: true",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 48,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 53,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status: MANUAL_REVIEW",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 62,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk score above threshold",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 63,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required: [email, firstName, lastName, birthDate]",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 68,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status:",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 87,
          "confidence": "hint"
        }
      ],
      "score": 445,
      "lines": 103
    },
    {
      "path": "src/main/resources/onboarding.wsdl",
      "language": "WSDL",
      "roles": [
        "controller",
        "soap_contract"
      ],
      "signals": [
        {
          "type": "soap_contract",
          "label": "SOAP/WSDL/XSD candidate",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 2,
          "confidence": "hint"
        },
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message name=\"StartOnboardingRequest\">",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 8,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message>",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 13,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message name=\"StartOnboardingResponse\">",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 14,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message>",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 17,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message=\"tns:StartOnboardingRequest\"/>",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 20,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message=\"tns:StartOnboardingResponse\"/>",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 21,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\" type=\"xsd:string\"/>",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 16,
          "confidence": "hint"
        }
      ],
      "score": 444,
      "lines": 38
    },
    {
      "path": "src/main/resources/wsdl/kyc-status.wsdl",
      "language": "WSDL",
      "roles": [
        "controller",
        "soap_contract"
      ],
      "signals": [
        {
          "type": "soap_contract",
          "label": "SOAP/WSDL/XSD candidate",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 2,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message name=\"GetKycStatusInput\"><part name=\"payload\" element=\"tns:GetKycStatusRequest\"/></message>",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 26,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message name=\"GetKycStatusOutput\"><part name=\"payload\" element=\"tns:GetKycStatusResponse\"/></message>",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 27,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message=\"tns:GetKycStatusInput\"/>",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 30,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message=\"tns:GetKycStatusOutput\"/>",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 31,
          "confidence": "hint"
        }
      ],
      "score": 427,
      "lines": 43
    },
    {
      "path": "docs/api-examples.md",
      "language": "Markdown",
      "roles": [
        "controller",
        "documentation",
        "example"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "docs/api-examples.md",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "mermaid_diagram",
          "label": "Mermaid diagram candidate",
          "path": "docs/api-examples.md",
          "line": 41,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "save(customer)",
          "path": "docs/api-examples.md",
          "line": 50,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"ACTIVE\",",
          "path": "docs/api-examples.md",
          "line": 20,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status request",
          "path": "docs/api-examples.md",
          "line": 26,
          "confidence": "hint"
        }
      ],
      "score": 419,
      "lines": 53
    },
    {
      "path": ".analysis-seed/llm/documentation-examples.json",
      "language": "JSON",
      "roles": [
        "example",
        "persistence"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "mermaid_diagram",
          "label": "Mermaid diagram candidate",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 141,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "publish customer.onboarding.started\\n  Service-->>API: OnboardingResult\\n  API-->>Client: 202 OnboardingRes",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 142,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository contains OpenAPI request/response examples, SOAP/WSDL operations, Markdown payload examples, Mermaid flow source, busin",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "save(customer)\\n  Service->>Kafka: publish customer.onboarding.started\\n  Service-->>API: OnboardingResult\\n  API-->>Client:",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 142,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository.\",",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 210,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "rule examples and inferred function examples backed by code evidence.\",",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"ACTIVE\",",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 22,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\",",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 43,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\",",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 47,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"MANUAL_REVIEW\",",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 55,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk score too high\"",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 56,
          "confidence": "hint"
        }
      ],
      "score": 361,
      "lines": 215
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
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "docs/business-examples.md",
          "line": 5,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk onboarding",
          "path": "docs/business-examples.md",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk score is at most 70.",
          "path": "docs/business-examples.md",
          "line": 17,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk score is above 70.",
          "path": "docs/business-examples.md",
          "line": 21,
          "confidence": "hint"
        }
      ],
      "score": 350,
      "lines": 22
    },
    {
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "language": "JSON",
      "roles": [
        "domain",
        "persistence"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 142,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event.\",",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 200,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event-customer-onboarding-started\"",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 214,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "entity that receives an onboarding status and KYC reference.\",",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 6,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository.\"",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 402,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status and KYC reference.\",",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 6,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "Risk Score\",",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 29,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "score used together with KYC approval to determine final onboarding status.\",",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 30,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "Status for cases where KYC is rejected or the risk score exceeds the threshold.\",",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 44,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status, review reason, risk score and KYC reference.\",",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 61,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\",",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 79,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk score stored with the customer.\",",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 96,
          "confidence": "hint"
        }
      ],
      "score": 258,
      "lines": 517
    },
    {
      "path": "docs/business-flows.md",
      "language": "Markdown",
      "roles": [
        "documentation"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "docs/business-flows.md",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "mermaid_diagram",
          "label": "Mermaid diagram candidate",
          "path": "docs/business-flows.md",
          "line": 31,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "publish customer.onboarding.started",
          "path": "docs/business-flows.md",
          "line": 43,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "save(customer)",
          "path": "docs/business-flows.md",
          "line": 42,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"ACTIVE\",",
          "path": "docs/business-flows.md",
          "line": 22,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "calculate risk score",
          "path": "docs/business-flows.md",
          "line": 41,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "rule example",
          "path": "docs/business-flows.md",
          "line": 48,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk score is above 70, the customer is marked for manual review. Otherwise the customer is activated.",
          "path": "docs/business-flows.md",
          "line": 50,
          "confidence": "hint"
        }
      ],
      "score": 241,
      "lines": 51
    },
    {
      "path": ".analysis-seed/llm/data-integrations.json",
      "language": "JSON",
      "roles": [
        "integration",
        "persistence"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 53,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 52,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event payload created after a customer is saved.\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 53,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "topic\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 162,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "publish-onboarding-started\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 219,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event is published after save.\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 221,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository.\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 7,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 87,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "entity\": \"Customer\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 103,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "entity\": \"Customer\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 119,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository.\"",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 158,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 32,
          "confidence": "hint"
        }
      ],
      "score": 213,
      "lines": 251
    },
    {
      "path": ".analysis-seed/llm/flows.json",
      "language": "JSON",
      "roles": [],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": ".analysis-seed/llm/flows.json",
          "line": 11,
          "confidence": "hint"
        },
        {
          "type": "mermaid_diagram",
          "label": "Mermaid diagram candidate",
          "path": ".analysis-seed/llm/flows.json",
          "line": 13,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event-customer-onboarding-started\"",
          "path": ".analysis-seed/llm/flows.json",
          "line": 9,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event.\",",
          "path": ".analysis-seed/llm/flows.json",
          "line": 11,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event is published.\",",
          "path": ".analysis-seed/llm/flows.json",
          "line": 127,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event\",",
          "path": ".analysis-seed/llm/flows.json",
          "line": 128,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "save(customer)\\n  Service->>Kafka: customer.onboarding.started\\n  API-->>Client: 202 OnboardingResponse\",",
          "path": ".analysis-seed/llm/flows.json",
          "line": 14,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status, saved and published as a Kafka event.\",",
          "path": ".analysis-seed/llm/flows.json",
          "line": 11,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "Risk as RiskScoringService\\n  participant DB as CustomerRepository\\n  participant Kafka as OnboardingEventPublisher\\n  Client->>API: POST /custo",
          "path": ".analysis-seed/llm/flows.json",
          "line": 14,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "Risk: calculateScore(request, kyc)\\n  Service->>Service: decide ACTIVE or MANUAL_REVIEW\\n  Service->>DB: save(customer)\\n  Service->>Kafka: cust",
          "path": ".analysis-seed/llm/flows.json",
          "line": 14,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "Risk\",",
          "path": ".analysis-seed/llm/flows.json",
          "line": 86,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "Risk score is calculated from KYC result and referral code.\",",
          "path": ".analysis-seed/llm/flows.json",
          "line": 87,
          "confidence": "hint"
        }
      ],
      "score": 180,
      "lines": 325
    },
    {
      "path": "src/main/resources/application.yml",
      "language": "YAML",
      "roles": [
        "config",
        "controller"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "src/main/resources/application.yml",
          "line": 5,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk:",
          "path": "src/main/resources/application.yml",
          "line": 6,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "threshold: 70",
          "path": "src/main/resources/application.yml",
          "line": 7,
          "confidence": "hint"
        }
      ],
      "score": 175,
      "lines": 8
    },
    {
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "language": "JSON",
      "roles": [
        "persistence"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "mermaid_diagram",
          "label": "Mermaid diagram candidate",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 141,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event publishing and contract/example documentation.\",",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event publishing.\",",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 25,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "publish Kafka events.\",",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 60,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "Topic[(customer.onboarding.started)]\"",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 141,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository layering, a KYC HTTP integration, a risk-scoring service, JPA repository persistence, Kafka event publishing and contra",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk-scoring service, JPA repository persistence, Kafka event publishing and contract/example documentation.\",",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status REST endpoints.\",",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 8,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk scoring, status decision, persistence and event publishing.\",",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 25,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "Risk[RiskScoringService]\\n  Service --> Kafka[OnboardingEventPublisher]\\n  Repo --> DB[(Customer DB)]\\n  KYC --> ExternalKYC[External KYC Provid",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 141,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk-policy\",",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 161,
          "confidence": "hint"
        }
      ],
      "score": 171,
      "lines": 234
    },
    {
      "path": "README.md",
      "language": "Markdown",
      "roles": [
        "documentation",
        "persistence"
      ],
      "signals": [
        {
          "type": "database_touchpoint_hint",
          "label": "Repository",
          "path": "README.md",
          "line": 1,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository contains a small Spring-style customer onboarding service. It is intentionally compact but includes REST endpoints, Ope",
          "path": "README.md",
          "line": 3,
          "confidence": "hint"
        }
      ],
      "score": 168,
      "lines": 4
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
      "language": "Java",
      "roles": [
        "controller"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
          "line": 22,
          "confidence": "hint"
        },
        {
          "type": "http_route_hint",
          "label": "Spring RequestMapping",
          "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
          "line": 13,
          "confidence": "hint"
        },
        {
          "type": "http_route_hint",
          "label": "Spring PostMapping",
          "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
          "line": 21,
          "confidence": "hint"
        },
        {
          "type": "http_route_hint",
          "label": "Spring GetMapping",
          "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
          "line": 27,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\")",
          "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
          "line": 27,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status(@PathVariable String customerId) {",
          "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
          "line": 28,
          "confidence": "hint"
        }
      ],
      "score": 165,
      "lines": 32
    },
    {
      "path": ".analysis-seed/llm/goal-coverage-review.json",
      "language": "JSON",
      "roles": [
        "frontend"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": ".analysis-seed/llm/goal-coverage-review.json",
          "line": 27,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"covered\",",
          "path": ".analysis-seed/llm/goal-coverage-review.json",
          "line": 5,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status capabilities with actors, domain terms and evidence.\",",
          "path": ".analysis-seed/llm/goal-coverage-review.json",
          "line": 6,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"covered\",",
          "path": ".analysis-seed/llm/goal-coverage-review.json",
          "line": 12,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk scoring and manual-review decisions are documented with examples.\",",
          "path": ".analysis-seed/llm/goal-coverage-review.json",
          "line": 13,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"covered\",",
          "path": ".analysis-seed/llm/goal-coverage-review.json",
          "line": 19,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"covered\",",
          "path": ".analysis-seed/llm/goal-coverage-review.json",
          "line": 26,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"covered\",",
          "path": ".analysis-seed/llm/goal-coverage-review.json",
          "line": 33,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"covered\",",
          "path": ".analysis-seed/llm/goal-coverage-review.json",
          "line": 40,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"covered\",",
          "path": ".analysis-seed/llm/goal-coverage-review.json",
          "line": 47,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"covered\",",
          "path": ".analysis-seed/llm/goal-coverage-review.json",
          "line": 54,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"covered\",",
          "path": ".analysis-seed/llm/goal-coverage-review.json",
          "line": 61,
          "confidence": "hint"
        }
      ],
      "score": 161,
      "lines": 70
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
      "language": "Java",
      "roles": [
        "service"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
          "line": 23,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "save(customer);",
          "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
          "line": 35,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status());",
          "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
          "line": 36,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status(), riskScore, kyc.reference());",
          "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
          "line": 37,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status(), customer.reviewReason());",
          "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
          "line": 43,
          "confidence": "hint"
        }
      ],
      "score": 151,
      "lines": 46
    },
    {
      "path": "src/main/java/com/acme/onboarding/RiskScoringService.java",
      "language": "Java",
      "roles": [
        "service"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "src/main/java/com/acme/onboarding/RiskScoringService.java",
          "line": 7,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "score = 20;",
          "path": "src/main/java/com/acme/onboarding/RiskScoringService.java",
          "line": 8,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "score += 60;",
          "path": "src/main/java/com/acme/onboarding/RiskScoringService.java",
          "line": 10,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "score += 15;",
          "path": "src/main/java/com/acme/onboarding/RiskScoringService.java",
          "line": 13,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "score;",
          "path": "src/main/java/com/acme/onboarding/RiskScoringService.java",
          "line": 15,
          "confidence": "hint"
        }
      ],
      "score": 139,
      "lines": 18
    },
    {
      "path": ".analysis-seed/llm/process-quality-readiness.json",
      "language": "JSON",
      "roles": [
        "persistence"
      ],
      "signals": [
        {
          "type": "event_or_message_hint",
          "label": "subscribe to customer.onboarding.started?\"",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 126,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository shows build metadata, placeholder tests and application configuration, but does not show CI/CD, deployment or observabi",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository analysis scope.\",",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 33,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository.\",",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 67,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository, integration client and publisher responsibilities are separated.\",",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 134,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository/KYC/publisher dependencies.\",",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 237,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"partial\",",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 5,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"none\",",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 29,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"partial\",",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 39,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"none\",",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 63,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"partial\",",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 73,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk threshold are configured, but the service still hard-codes the threshold.\",",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 86,
          "confidence": "hint"
        }
      ],
      "score": 136,
      "lines": 250
    },
    {
      "path": ".analysis-seed/llm/core-assessment.json",
      "language": "JSON",
      "roles": [
        "persistence"
      ],
      "signals": [
        {
          "type": "event_or_message_hint",
          "label": "event.\",",
          "path": ".analysis-seed/llm/core-assessment.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "Publish onboarding-started event\"",
          "path": ".analysis-seed/llm/core-assessment.json",
          "line": 17,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository implements a compact customer onboarding service. It accepts onboarding requests, validates customer data, prevents dup",
          "path": ".analysis-seed/llm/core-assessment.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository.\",",
          "path": ".analysis-seed/llm/core-assessment.json",
          "line": 46,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository already names important test scenarios but the methods are empty.\",",
          "path": ".analysis-seed/llm/core-assessment.json",
          "line": 79,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository does not show authentication or authorization requirements for the onboarding endpoints.\"",
          "path": ".analysis-seed/llm/core-assessment.json",
          "line": 93,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk score, activates low-risk customers or routes risky cases to manual review, persists the customer and publishes an onboarding event.\",",
          "path": ".analysis-seed/llm/core-assessment.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk assessment and customer status management.\",",
          "path": ".analysis-seed/llm/core-assessment.json",
          "line": 4,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\",",
          "path": ".analysis-seed/llm/core-assessment.json",
          "line": 15,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "Calculate risk score\",",
          "path": ".analysis-seed/llm/core-assessment.json",
          "line": 16,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\",",
          "path": ".analysis-seed/llm/core-assessment.json",
          "line": 21,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "Risk threshold is duplicated\",",
          "path": ".analysis-seed/llm/core-assessment.json",
          "line": 28,
          "confidence": "hint"
        }
      ],
      "score": 136,
      "lines": 96
    },
    {
      "path": ".analysis-seed/llm/interfaces.json",
      "language": "JSON",
      "roles": [],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": ".analysis-seed/llm/interfaces.json",
          "line": 10,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message\": \"Customer already exists: max.mustermann@example.com\"",
          "path": ".analysis-seed/llm/interfaces.json",
          "line": 251,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message\": \"Customer not found: cus_missing\"",
          "path": ".analysis-seed/llm/interfaces.json",
          "line": 429,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event-customer-onboarding-started\",",
          "path": ".analysis-seed/llm/interfaces.json",
          "line": 457,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event\",",
          "path": ".analysis-seed/llm/interfaces.json",
          "line": 458,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "Event published after the customer has been saved.\",",
          "path": ".analysis-seed/llm/interfaces.json",
          "line": 462,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event payload\",",
          "path": ".analysis-seed/llm/interfaces.json",
          "line": 503,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "topic\": \"customer.onboarding.started\",",
          "path": ".analysis-seed/llm/interfaces.json",
          "line": 506,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status, risk score and KYC reference.\",",
          "path": ".analysis-seed/llm/interfaces.json",
          "line": 10,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required and must be a valid email address.\",",
          "path": ".analysis-seed/llm/interfaces.json",
          "line": 72,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required\": true,",
          "path": ".analysis-seed/llm/interfaces.json",
          "line": 73,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required\": true,",
          "path": ".analysis-seed/llm/interfaces.json",
          "line": 84,
          "confidence": "hint"
        }
      ],
      "score": 135,
      "lines": 659
    },
    {
      "path": "src/main/java/com/acme/onboarding/KycClient.java",
      "language": "Java",
      "roles": [
        "integration"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "src/main/java/com/acme/onboarding/KycClient.java",
          "line": 12,
          "confidence": "hint"
        },
        {
          "type": "external_call_hint",
          "label": "RestTemplate;",
          "path": "src/main/java/com/acme/onboarding/KycClient.java",
          "line": 5,
          "confidence": "hint"
        },
        {
          "type": "external_call_hint",
          "label": "RestTemplate restTemplate = new RestTemplate();",
          "path": "src/main/java/com/acme/onboarding/KycClient.java",
          "line": 9,
          "confidence": "hint"
        },
        {
          "type": "external_call_hint",
          "label": "restTemplate.postForObject(\"https://kyc.example.local/verify\", request, KycResult.class);",
          "path": "src/main/java/com/acme/onboarding/KycClient.java",
          "line": 13,
          "confidence": "hint"
        },
        {
          "type": "ui_route_hint",
          "label": "Component;",
          "path": "src/main/java/com/acme/onboarding/KycClient.java",
          "line": 4,
          "confidence": "hint"
        },
        {
          "type": "ui_route_hint",
          "label": "Component",
          "path": "src/main/java/com/acme/onboarding/KycClient.java",
          "line": 7,
          "confidence": "hint"
        }
      ],
      "score": 135,
      "lines": 16
    },
    {
      "path": "src/test/java/com/acme/onboarding/OnboardingServiceTest.java",
      "language": "Java",
      "roles": [
        "service",
        "test"
      ],
      "signals": [],
      "score": 87,
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
  "top_signals": [
    {
      "type": "request_response_doc",
      "label": "Request/response/example candidate",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 3,
      "confidence": "hint"
    },
    {
      "type": "event_or_message_hint",
      "label": "event publishing and contract/example documentation.\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 3,
      "confidence": "hint"
    },
    {
      "type": "database_touchpoint_hint",
      "label": "repository layering, a KYC HTTP integration, a risk-scoring service, JPA repository persistence, Kafka event publishing and contra",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 3,
      "confidence": "hint"
    },
    {
      "type": "validation_or_business_rule_hint",
      "label": "risk-scoring service, JPA repository persistence, Kafka event publishing and contract/example documentation.\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 3,
      "confidence": "hint"
    },
    {
      "type": "validation_or_business_rule_hint",
      "label": "status REST endpoints.\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 8,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/OnboardingController.java\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 14,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/OnboardingController.java\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 18,
      "confidence": "hint"
    },
    {
      "type": "event_or_message_hint",
      "label": "event publishing.\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 25,
      "confidence": "hint"
    },
    {
      "type": "validation_or_business_rule_hint",
      "label": "risk scoring, status decision, persistence and event publishing.\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 25,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/OnboardingService.java\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 34,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/OnboardingService.java\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 38,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/Customer.java\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 49,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/CustomerStatus.java\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 53,
      "confidence": "hint"
    },
    {
      "type": "event_or_message_hint",
      "label": "publish Kafka events.\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 60,
      "confidence": "hint"
    },
    {
      "type": "external_call_hint",
      "label": "Call KYC provider and publish Kafka events.\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 60,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/KycClient.java\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 67,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/OnboardingEventPublisher.java\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 71,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/KycClient.java\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 84,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/OnboardingEventPublisher.java\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 95,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/CustomerRepository.java\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 107,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/resources/application.yml\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 119,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/resources/application.yml\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 123,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/OnboardingService.java\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 135,
      "confidence": "hint"
    },
    {
      "type": "mermaid_diagram",
      "label": "Mermaid diagram candidate",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 141,
      "confidence": "hint"
    },
    {
      "type": "event_or_message_hint",
      "label": "Topic[(customer.onboarding.started)]\"",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 141,
      "confidence": "hint"
    },
    {
      "type": "validation_or_business_rule_hint",
      "label": "Risk[RiskScoringService]\\n  Service --> Kafka[OnboardingEventPublisher]\\n  Repo --> DB[(Customer DB)]\\n  KYC --> ExternalKYC[External KYC Provid",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 141,
      "confidence": "hint"
    },
    {
      "type": "external_call_hint",
      "label": "resttemplate\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 145,
      "confidence": "hint"
    },
    {
      "type": "external_call_hint",
      "label": "RestTemplate internally\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 148,
      "confidence": "hint"
    },
    {
      "type": "external_call_hint",
      "label": "RestTemplate directly, which makes configuration and testing less explicit.\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 149,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/KycClient.java\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 153,
      "confidence": "hint"
    },
    {
      "type": "validation_or_business_rule_hint",
      "label": "risk-policy\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 161,
      "confidence": "hint"
    },
    {
      "type": "validation_or_business_rule_hint",
      "label": "threshold into a dedicated policy object or configuration-driven service.\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 163,
      "confidence": "hint"
    },
    {
      "type": "validation_or_business_rule_hint",
      "label": "risk\": \"low\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 165,
      "confidence": "hint"
    },
    {
      "type": "validation_or_business_rule_hint",
      "label": "risk score boundary values\"",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 173,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/OnboardingService.java\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 177,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/resources/application.yml\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 181,
      "confidence": "hint"
    },
    {
      "type": "external_call_hint",
      "label": "RestTemplate or a typed client instead of constructing it inside KycClient.\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 189,
      "confidence": "hint"
    },
    {
      "type": "validation_or_business_rule_hint",
      "label": "risk\": \"low\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 191,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/KycClient.java\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 199,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/KycClient.java\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 203,
      "confidence": "hint"
    },
    {
      "type": "validation_or_business_rule_hint",
      "label": "risk\": \"medium\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 216,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/resources/openapi.yaml\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 220,
      "confidence": "hint"
    },
    {
      "type": "validation_or_business_rule_hint",
      "label": "status.wsdl\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 224,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/resources/wsdl/kyc-status.wsdl\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 224,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"docs/api-examples.md\",",
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "line": 228,
      "confidence": "hint"
    },
    {
      "type": "database_touchpoint_hint",
      "label": "entity that receives an onboarding status and KYC reference.\",",
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "line": 6,
      "confidence": "hint"
    },
    {
      "type": "validation_or_business_rule_hint",
      "label": "status and KYC reference.\",",
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "line": 6,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/Customer.java\",",
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "line": 9,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/KycClient.java\",",
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "line": 19,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/KycResult.java\",",
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "line": 23,
      "confidence": "hint"
    },
    {
      "type": "validation_or_business_rule_hint",
      "label": "Risk Score\",",
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "line": 29,
      "confidence": "hint"
    },
    {
      "type": "validation_or_business_rule_hint",
      "label": "score used together with KYC approval to determine final onboarding status.\",",
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "line": 30,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/RiskScoringService.java\",",
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "line": 33,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/OnboardingService.java\",",
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "line": 37,
      "confidence": "hint"
    },
    {
      "type": "validation_or_business_rule_hint",
      "label": "Status for cases where KYC is rejected or the risk score exceeds the threshold.\",",
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "line": 44,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/CustomerStatus.java\",",
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "line": 47,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/Customer.java\",",
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "line": 51,
      "confidence": "hint"
    },
    {
      "type": "validation_or_business_rule_hint",
      "label": "status, review reason, risk score and KYC reference.\",",
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "line": 61,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/Customer.java\",",
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "line": 69,
      "confidence": "hint"
    },
    {
      "type": "ui_route_hint",
      "label": "path\": \"src/main/java/com/acme/onboarding/CustomerRepository.java\",",
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "line": 73,
      "confidence": "hint"
    }
  ],
  "top_capsules": [
    {
      "path": "docs/openapi.yml",
      "roles": [
        "api_contract",
        "controller",
        "documentation"
      ],
      "signals": [
        {
          "type": "api_contract",
          "label": "OpenAPI/Swagger candidate",
          "path": "docs/openapi.yml",
          "line": 1,
          "confidence": "hint"
        },
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "docs/openapi.yml",
          "line": 20,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required: true",
          "path": "docs/openapi.yml",
          "line": 11,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk customer with referral code",
          "path": "docs/openapi.yml",
          "line": 18,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status: ACTIVE",
          "path": "docs/openapi.yml",
          "line": 36,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status:",
          "path": "docs/openapi.yml",
          "line": 39,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required: true",
          "path": "docs/openapi.yml",
          "line": 46,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status",
          "path": "docs/openapi.yml",
          "line": 51,
          "confidence": "hint"
        }
      ],
      "symbols": []
    },
    {
      "path": "src/main/resources/openapi.yaml",
      "roles": [
        "api_contract",
        "controller"
      ],
      "signals": [
        {
          "type": "api_contract",
          "label": "OpenAPI/Swagger candidate",
          "path": "src/main/resources/openapi.yaml",
          "line": 1,
          "confidence": "hint"
        },
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "src/main/resources/openapi.yaml",
          "line": 19,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required: true",
          "path": "src/main/resources/openapi.yaml",
          "line": 11,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status: ACTIVE",
          "path": "src/main/resources/openapi.yaml",
          "line": 35,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status:",
          "path": "src/main/resources/openapi.yaml",
          "line": 38,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status",
          "path": "src/main/resources/openapi.yaml",
          "line": 41,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required: true",
          "path": "src/main/resources/openapi.yaml",
          "line": 45,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status",
          "path": "src/main/resources/openapi.yaml",
          "line": 50,
          "confidence": "hint"
        }
      ],
      "symbols": []
    },
    {
      "path": "src/main/resources/wsdl/customer-verification.wsdl",
      "roles": [
        "controller",
        "soap_contract"
      ],
      "signals": [
        {
          "type": "soap_contract",
          "label": "SOAP/WSDL/XSD candidate",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 4,
          "confidence": "hint"
        },
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message name=\"VerifyCustomerInput\">",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 28,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message>",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 30,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message name=\"VerifyCustomerOutput\">",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 31,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message>",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 33,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message=\"tns:VerifyCustomerInput\"/>",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 36,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message=\"tns:VerifyCustomerOutput\"/>",
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "line": 37,
          "confidence": "hint"
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
        "controller"
      ],
      "signals": [
        {
          "type": "api_contract",
          "label": "OpenAPI/Swagger candidate",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 1,
          "confidence": "hint"
        },
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 20,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required: true",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 11,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status: ACTIVE",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 36,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status:",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 41,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status for a customer",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 44,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "required: true",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 48,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status",
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "line": 53,
          "confidence": "hint"
        }
      ],
      "symbols": []
    },
    {
      "path": "src/main/resources/onboarding.wsdl",
      "roles": [
        "controller",
        "soap_contract"
      ],
      "signals": [
        {
          "type": "soap_contract",
          "label": "SOAP/WSDL/XSD candidate",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 2,
          "confidence": "hint"
        },
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message name=\"StartOnboardingRequest\">",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 8,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message>",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 13,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message name=\"StartOnboardingResponse\">",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 14,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message>",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 17,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message=\"tns:StartOnboardingRequest\"/>",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 20,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message=\"tns:StartOnboardingResponse\"/>",
          "path": "src/main/resources/onboarding.wsdl",
          "line": 21,
          "confidence": "hint"
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
      "path": "src/main/resources/wsdl/kyc-status.wsdl",
      "roles": [
        "controller",
        "soap_contract"
      ],
      "signals": [
        {
          "type": "soap_contract",
          "label": "SOAP/WSDL/XSD candidate",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 2,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message name=\"GetKycStatusInput\"><part name=\"payload\" element=\"tns:GetKycStatusRequest\"/></message>",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 26,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message name=\"GetKycStatusOutput\"><part name=\"payload\" element=\"tns:GetKycStatusResponse\"/></message>",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 27,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message=\"tns:GetKycStatusInput\"/>",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 30,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message=\"tns:GetKycStatusOutput\"/>",
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "line": 31,
          "confidence": "hint"
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
      "path": "docs/api-examples.md",
      "roles": [
        "controller",
        "documentation",
        "example"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "docs/api-examples.md",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "mermaid_diagram",
          "label": "Mermaid diagram candidate",
          "path": "docs/api-examples.md",
          "line": 41,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "save(customer)",
          "path": "docs/api-examples.md",
          "line": 50,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"ACTIVE\",",
          "path": "docs/api-examples.md",
          "line": 20,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status request",
          "path": "docs/api-examples.md",
          "line": 26,
          "confidence": "hint"
        }
      ],
      "symbols": []
    },
    {
      "path": "docs/examples/customer-verification-soap.xml",
      "roles": [
        "documentation",
        "example",
        "soap_contract"
      ],
      "signals": [
        {
          "type": "soap_contract",
          "label": "SOAP/WSDL/XSD candidate",
          "path": "docs/examples/customer-verification-soap.xml",
          "line": 1,
          "confidence": "hint"
        },
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "docs/examples/customer-verification-soap.xml",
          "line": 1,
          "confidence": "hint"
        }
      ],
      "symbols": []
    },
    {
      "path": ".analysis-seed/llm/documentation-examples.json",
      "roles": [
        "example",
        "persistence"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "mermaid_diagram",
          "label": "Mermaid diagram candidate",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 141,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "publish customer.onboarding.started\\n  Service-->>API: OnboardingResult\\n  API-->>Client: 202 OnboardingRes",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 142,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository contains OpenAPI request/response examples, SOAP/WSDL operations, Markdown payload examples, Mermaid flow source, busin",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "save(customer)\\n  Service->>Kafka: publish customer.onboarding.started\\n  Service-->>API: OnboardingResult\\n  API-->>Client:",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 142,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository.\",",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 210,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "rule examples and inferred function examples backed by code evidence.\",",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"ACTIVE\",",
          "path": ".analysis-seed/llm/documentation-examples.json",
          "line": 22,
          "confidence": "hint"
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
          "type": "soap_contract",
          "label": "SOAP/WSDL/XSD candidate",
          "path": "docs/soap-kyc.wsdl",
          "line": 4,
          "confidence": "hint"
        },
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "docs/soap-kyc.wsdl",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message name=\"VerifyIdentityRequest\">",
          "path": "docs/soap-kyc.wsdl",
          "line": 7,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message>",
          "path": "docs/soap-kyc.wsdl",
          "line": 11,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message name=\"VerifyIdentityResponse\">",
          "path": "docs/soap-kyc.wsdl",
          "line": 12,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message>",
          "path": "docs/soap-kyc.wsdl",
          "line": 15,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message=\"tns:VerifyIdentityRequest\" />",
          "path": "docs/soap-kyc.wsdl",
          "line": 18,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message=\"tns:VerifyIdentityResponse\" />",
          "path": "docs/soap-kyc.wsdl",
          "line": 19,
          "confidence": "hint"
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
      "path": ".analysis-seed/llm/business-domain-logic.json",
      "roles": [
        "domain",
        "persistence"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 142,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event.\",",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 200,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event-customer-onboarding-started\"",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 214,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "entity that receives an onboarding status and KYC reference.\",",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 6,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository.\"",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 402,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status and KYC reference.\",",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 6,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "Risk Score\",",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 29,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "score used together with KYC approval to determine final onboarding status.\",",
          "path": ".analysis-seed/llm/business-domain-logic.json",
          "line": 30,
          "confidence": "hint"
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
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "docs/business-examples.md",
          "line": 5,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk onboarding",
          "path": "docs/business-examples.md",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk score is at most 70.",
          "path": "docs/business-examples.md",
          "line": 17,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk score is above 70.",
          "path": "docs/business-examples.md",
          "line": 21,
          "confidence": "hint"
        }
      ],
      "symbols": []
    },
    {
      "path": ".analysis-seed/llm/data-integrations.json",
      "roles": [
        "integration",
        "persistence"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 53,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "message\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 52,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event payload created after a customer is saved.\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 53,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "topic\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 162,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "publish-onboarding-started\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 219,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event is published after save.\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 221,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository.\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 7,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository\",",
          "path": ".analysis-seed/llm/data-integrations.json",
          "line": 87,
          "confidence": "hint"
        }
      ],
      "symbols": []
    },
    {
      "path": "docs/business-flows.md",
      "roles": [
        "documentation"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "docs/business-flows.md",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "mermaid_diagram",
          "label": "Mermaid diagram candidate",
          "path": "docs/business-flows.md",
          "line": 31,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "publish customer.onboarding.started",
          "path": "docs/business-flows.md",
          "line": 43,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "save(customer)",
          "path": "docs/business-flows.md",
          "line": 42,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"ACTIVE\",",
          "path": "docs/business-flows.md",
          "line": 22,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "calculate risk score",
          "path": "docs/business-flows.md",
          "line": 41,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "rule example",
          "path": "docs/business-flows.md",
          "line": 48,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk score is above 70, the customer is marked for manual review. Otherwise the customer is activated.",
          "path": "docs/business-flows.md",
          "line": 50,
          "confidence": "hint"
        }
      ],
      "symbols": []
    },
    {
      "path": ".analysis-seed/llm/flows.json",
      "roles": [],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": ".analysis-seed/llm/flows.json",
          "line": 11,
          "confidence": "hint"
        },
        {
          "type": "mermaid_diagram",
          "label": "Mermaid diagram candidate",
          "path": ".analysis-seed/llm/flows.json",
          "line": 13,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event-customer-onboarding-started\"",
          "path": ".analysis-seed/llm/flows.json",
          "line": 9,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event.\",",
          "path": ".analysis-seed/llm/flows.json",
          "line": 11,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event is published.\",",
          "path": ".analysis-seed/llm/flows.json",
          "line": 127,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event\",",
          "path": ".analysis-seed/llm/flows.json",
          "line": 128,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "save(customer)\\n  Service->>Kafka: customer.onboarding.started\\n  API-->>Client: 202 OnboardingResponse\",",
          "path": ".analysis-seed/llm/flows.json",
          "line": 14,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status, saved and published as a Kafka event.\",",
          "path": ".analysis-seed/llm/flows.json",
          "line": 11,
          "confidence": "hint"
        }
      ],
      "symbols": []
    },
    {
      "path": "src/main/resources/application.yml",
      "roles": [
        "config",
        "controller"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": "src/main/resources/application.yml",
          "line": 5,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk:",
          "path": "src/main/resources/application.yml",
          "line": 6,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "threshold: 70",
          "path": "src/main/resources/application.yml",
          "line": 7,
          "confidence": "hint"
        }
      ],
      "symbols": []
    },
    {
      "path": ".analysis-seed/llm/process-quality-readiness.json",
      "roles": [
        "persistence"
      ],
      "signals": [
        {
          "type": "event_or_message_hint",
          "label": "subscribe to customer.onboarding.started?\"",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 126,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository shows build metadata, placeholder tests and application configuration, but does not show CI/CD, deployment or observabi",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository analysis scope.\",",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 33,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository.\",",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 67,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository, integration client and publisher responsibilities are separated.\",",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 134,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository/KYC/publisher dependencies.\",",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 237,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"partial\",",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 5,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "status\": \"none\",",
          "path": ".analysis-seed/llm/process-quality-readiness.json",
          "line": 29,
          "confidence": "hint"
        }
      ],
      "symbols": []
    },
    {
      "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
      "roles": [
        "persistence"
      ],
      "signals": [
        {
          "type": "request_response_doc",
          "label": "Request/response/example candidate",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "mermaid_diagram",
          "label": "Mermaid diagram candidate",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 141,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event publishing and contract/example documentation.\",",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "event publishing.\",",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 25,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "publish Kafka events.\",",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 60,
          "confidence": "hint"
        },
        {
          "type": "event_or_message_hint",
          "label": "Topic[(customer.onboarding.started)]\"",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 141,
          "confidence": "hint"
        },
        {
          "type": "database_touchpoint_hint",
          "label": "repository layering, a KYC HTTP integration, a risk-scoring service, JPA repository persistence, Kafka event publishing and contra",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 3,
          "confidence": "hint"
        },
        {
          "type": "validation_or_business_rule_hint",
          "label": "risk-scoring service, JPA repository persistence, Kafka event publishing and contract/example documentation.\",",
          "path": ".analysis-seed/llm/architecture-refactoring-roadmap.json",
          "line": 3,
          "confidence": "hint"
        }
      ],
      "symbols": []
    }
  ],
  "glossary": [
    "onboarding",
    "customer",
    "status",
    "verify",
    "acme",
    "identity",
    "result",
    "start",
    "analysis",
    "seed",
    "json",
    "service",
    "event",
    "started",
    "docs",
    "wsdl",
    "exception",
    "resources",
    "reference",
    "review",
    "repository",
    "examples",
    "openapi",
    "approved",
    "input",
    "output",
    "business",
    "found",
    "duplicate",
    "client",
    "controller",
    "publisher",
    "risk",
    "scoring",
    "flows",
    "verification",
    "soap",
    "pending",
    "mark",
    "manual",
    "activate",
    "reason",
    "onboard",
    "publish",
    "calculate",
    "score",
    "yaml",
    "birth",
    "date",
    "architecture",
    "refactoring",
    "roadmap",
    "domain",
    "logic",
    "core",
    "assessment",
    "data",
    "integrations",
    "documentation",
    "goal",
    "coverage",
    "interfaces",
    "process",
    "quality",
    "readiness",
    "readme",
    "application"
  ]
}
```

## Expected JSON

{
  "domain_model": {
    "glossary": [
      {"term":"Domain term", "meaning":"Meaning in this repository", "evidence": []}
    ],
    "entities": [
      {"name":"Entity", "description":"...", "key_fields":[{"name":"field", "meaning":"...", "evidence": []}], "states": [], "evidence": []}
    ],
    "state_models": [
      {"name":"Status model", "states": ["STATE"], "transitions": [{"from":"A", "to":"B", "condition":"...", "evidence": []}], "evidence": []}
    ]
  },
  "capabilities": [
    {
      "id": "stable-kebab-case-id",
      "name": "Business capability name",
      "description": "What the system enables from a business perspective.",
      "actors": ["user/system role"],
      "domain_terms": ["term"],
      "interfaces": ["interface-id-if-known"],
      "business_rules": [
        {"description": "rule", "rule_type":"validation|decision|calculation|authorization|state_transition|error_rule", "evidence": []}
      ],
      "business_logic": [
        {
          "name": "Decision/rule/calculation name",
          "description": "How the business decision works.",
          "logic_type": "validation|calculation|decision|state_transition|authorization|error_rule",
          "inputs": ["input field/domain value"],
          "outputs": ["status/result/error"],
          "example": {"input": {}, "output": {}, "explanation": "...", "example_origin": "source|test|doc|inferred"},
          "evidence": []
        }
      ],
      "function_examples": [
        {
          "title": "Business/function example",
          "function_or_use_case": "method/use case name",
          "input": {},
          "output": {},
          "explanation": "What this example demonstrates.",
          "example_origin": "source|test|doc|inferred",
          "evidence": []
        }
      ],
      "evidence": [],
      "confidence": "high|medium|low",
      "open_questions": []
    }
  ],
  "business_logic": [
    {"id":"logic-id", "title":"Reusable rule/logic", "description":"...", "examples": [], "evidence": []}
  ]
}

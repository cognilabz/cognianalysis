# Domain, Data, Integrations and Side Effects

You are running inside Codex as the semantic extraction step for Codebase Analysis Pack.

Task id: `domain_data_integrations`

Read these files first:

- `.analysis/llm_instructions.md`
- `.analysis/data/code-map.json`
- `.analysis/data/source-inventory.json`
- `.analysis/data/analysis-goal-contract.json`
- `.analysis/data/tool-positioning-references.json`
- `.analysis/data/navigation-artifact-candidates.json` (or legacy `.analysis/data/important-docs.json`)
- `.analysis/data/source-family-inventory.json`
- `.analysis/source-capsules.json`

Then open source files, tests, docs, contracts, schemas and configuration as needed. The source capsules and artifact hints are only navigation aids. The source inventory defines the full included analysis scope; do not stop at the top capsules.
For large repositories, use `.analysis/data/source-family-inventory.json` only as navigation context. The legacy filename does not mean the CLI has authored semantic source families. The actual source-family/detail-agent plan must be authored by the LLM in `.analysis/llm/detail-agent-plan.json`; deterministic inventory partitions are not semantic proof, not detail-review priorities and not source-family names.

Write your result to `.analysis/llm/domain-data-integrations.json` as valid JSON.

Evidence format for every relevant claim:

```json
{"path": "relative/path/File.ext", "line": 123, "symbol": "optionalSymbol"}
```

General rules:

- Use English for generated descriptions. Preserve original identifiers and domain names.
- Do not include markdown in the JSON output.
- Prefer concrete evidence over speculation.
- Do not promote generated hints, word matches, regex matches or filename matches into semantic conclusions.
- Account for the source inventory. Every output must include `analysis_coverage.inspected_files[]` for files you opened or semantically considered, and `analysis_coverage.deferred_files[]` for inventory files intentionally not relevant to this task. The final completeness task must reconcile the full inventory. This is source-inventory accounting, not a deterministic semantic-quality verdict.
- Start from the full repository scope. Summarize the whole source-family landscape before focusing on a specific module, framework, interface type or flow family.
- For multi-module repositories, include source-family statements across the repository; a deep slice is acceptable only when clearly labelled and paired with whole-repo coverage context.
- Avoid single-module bias. If one family has the strongest evidence, explain why it is strongest and which other families remain surface-reviewed or require follow-up drilldown.
- When using navigation partitions, the LLM must decide whether to rename, merge, split, reject or defer them as semantic source families. Do not copy partition names into management prose unless source evidence proves they are meaningful to the repository.
- Preserve the original target picture: automated source-code analysis that produces a structured decision basis with four levels: reverse engineering/documentation, code analysis, process analysis, and refactoring/target architecture.
- The final report is allowed to have a different structure for every repository, but it must still cover functional view, technical view, source-derived decision basis, automation boundaries, and comparison/positioning against traditional code-analysis/documentation tools.
- When writing tool positioning, use the provided reference categories: consulting/gen-AI delivery suites, structural architecture mapping, static quality/security gates and automated transformation engines. Be explicit about whether the analysis replaces discovery, complements graph/scanner/recipe tools, or should hand off to them.
- Do not author final management summaries, E2E conclusions or visible report sections until the final analysis-document task. Use the earlier tasks to build source-backed blocks, examples, flows, findings and the detail-agent plan.
- The final analysis-document task must read all extraction outputs and all executed `.analysis/detail_reviews/*.json` files, then synthesize the complete picture.
- Deterministic scripts only validate JSON shape, evidence references, output presence and renderer component compatibility. They do not decide whether the report is complete, well documented or management-ready. Those semantic judgments must be authored by the LLM in `analysis_document.requirements_trace` and `analysis_document.report_quality_review`.
- Do not leave empty sections or empty component blocks for the renderer to explain. If something is unknown, author an `open_questions` block or a narrative limitation with evidence context; the renderer will not generate placeholder report prose for you.
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
    "analyzed_at": "2026-06-09T20:48:59Z",
    "commit": "2d36455096f3c607f2fef54e0ebf548c358e450f",
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
      "id": "src-main",
      "name": "src/main",
      "files": 23,
      "source_files": 17,
      "lines": 576,
      "roles": {
        "api_contract": 2,
        "config": 3,
        "soap_contract": 3,
        "source": 17
      },
      "languages": {
        "YAML": 188,
        "WSDL": 135,
        "Java": 253
      },
      "signals": {
        "api_contract_candidate": 2,
        "soap_contract_candidate": 3
      },
      "top_files": [
        {
          "path": "src/main/resources/openapi.yaml",
          "navigation_score": 147,
          "score": 147,
          "navigation_tags": [
            "api_contract",
            "config"
          ],
          "roles": [
            "api_contract",
            "config"
          ],
          "signals": 1,
          "symbols": 0
        },
        {
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "navigation_score": 114,
          "score": 114,
          "navigation_tags": [
            "soap_contract"
          ],
          "roles": [
            "soap_contract"
          ],
          "signals": 1,
          "symbols": 10
        },
        {
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "navigation_score": 112,
          "score": 112,
          "navigation_tags": [
            "api_contract",
            "config"
          ],
          "roles": [
            "api_contract",
            "config"
          ],
          "signals": 1,
          "symbols": 0
        },
        {
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "navigation_score": 112,
          "score": 112,
          "navigation_tags": [
            "soap_contract"
          ],
          "roles": [
            "soap_contract"
          ],
          "signals": 1,
          "symbols": 9
        },
        {
          "path": "src/main/resources/onboarding.wsdl",
          "navigation_score": 102,
          "score": 102,
          "navigation_tags": [
            "soap_contract"
          ],
          "roles": [
            "soap_contract"
          ],
          "signals": 1,
          "symbols": 4
        },
        {
          "path": "src/main/java/com/acme/onboarding/Customer.java",
          "navigation_score": 66,
          "score": 66,
          "navigation_tags": [
            "source"
          ],
          "roles": [
            "source"
          ],
          "signals": 0,
          "symbols": 7
        },
        {
          "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
          "navigation_score": 58,
          "score": 58,
          "navigation_tags": [
            "source"
          ],
          "roles": [
            "source"
          ],
          "signals": 0,
          "symbols": 3
        },
        {
          "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
          "navigation_score": 58,
          "score": 58,
          "navigation_tags": [
            "source"
          ],
          "roles": [
            "source"
          ],
          "signals": 0,
          "symbols": 3
        },
        {
          "path": "src/main/resources/application.yml",
          "navigation_score": 53,
          "score": 53,
          "navigation_tags": [
            "config"
          ],
          "roles": [
            "config"
          ],
          "signals": 0,
          "symbols": 0
        },
        {
          "path": "src/main/java/com/acme/onboarding/OnboardingResponse.java",
          "navigation_score": 48,
          "score": 48,
          "navigation_tags": [
            "source"
          ],
          "roles": [
            "source"
          ],
          "signals": 0,
          "symbols": 3
        }
      ],
      "boundary_source": "path_partition",
      "boundary_evidence": [],
      "navigation_tags": {
        "api_contract": 2,
        "config": 3,
        "soap_contract": 3,
        "source": 17
      },
      "navigation_signals": {
        "api_contract_candidate": 2,
        "soap_contract_candidate": 3
      }
    },
    {
      "id": "src-test",
      "name": "src/test",
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
          "navigation_score": 74,
          "score": 74,
          "navigation_tags": [
            "source",
            "test"
          ],
          "roles": [
            "source",
            "test"
          ],
          "signals": 0,
          "symbols": 1
        }
      ],
      "boundary_source": "path_partition",
      "boundary_evidence": [],
      "navigation_tags": {
        "source": 1,
        "test": 1
      },
      "navigation_signals": {}
    },
    {
      "id": "docs",
      "name": "docs",
      "files": 5,
      "source_files": 0,
      "lines": 233,
      "roles": {
        "api_contract": 1,
        "config": 1,
        "documentation": 5,
        "soap_contract": 1,
        "example": 2
      },
      "languages": {
        "YAML": 78,
        "WSDL": 29,
        "Markdown": 126
      },
      "signals": {
        "api_contract_candidate": 1,
        "soap_contract_candidate": 1,
        "documentation_candidate": 3
      },
      "top_files": [
        {
          "path": "docs/openapi.yml",
          "navigation_score": 181,
          "score": 181,
          "navigation_tags": [
            "api_contract",
            "config",
            "documentation"
          ],
          "roles": [
            "api_contract",
            "config",
            "documentation"
          ],
          "signals": 1,
          "symbols": 0
        },
        {
          "path": "docs/soap-kyc.wsdl",
          "navigation_score": 136,
          "score": 136,
          "navigation_tags": [
            "documentation",
            "soap_contract"
          ],
          "roles": [
            "documentation",
            "soap_contract"
          ],
          "signals": 1,
          "symbols": 4
        },
        {
          "path": "docs/api-examples.md",
          "navigation_score": 118,
          "score": 118,
          "navigation_tags": [
            "documentation",
            "example"
          ],
          "roles": [
            "documentation",
            "example"
          ],
          "signals": 1,
          "symbols": 0
        },
        {
          "path": "docs/business-examples.md",
          "navigation_score": 118,
          "score": 118,
          "navigation_tags": [
            "documentation",
            "example"
          ],
          "roles": [
            "documentation",
            "example"
          ],
          "signals": 1,
          "symbols": 0
        },
        {
          "path": "docs/business-flows.md",
          "navigation_score": 53,
          "score": 53,
          "navigation_tags": [
            "documentation"
          ],
          "roles": [
            "documentation"
          ],
          "signals": 1,
          "symbols": 0
        }
      ],
      "boundary_source": "path_partition",
      "boundary_evidence": [],
      "navigation_tags": {
        "api_contract": 1,
        "config": 1,
        "documentation": 5,
        "soap_contract": 1,
        "example": 2
      },
      "navigation_signals": {
        "api_contract_candidate": 1,
        "soap_contract_candidate": 1,
        "documentation_candidate": 3
      }
    },
    {
      "id": "docs-examples",
      "name": "docs/examples",
      "files": 1,
      "source_files": 0,
      "lines": 21,
      "roles": {
        "documentation": 1,
        "example": 1,
        "soap_contract": 1
      },
      "languages": {
        "XML": 21
      },
      "signals": {},
      "top_files": [
        {
          "path": "docs/examples/customer-verification-soap.xml",
          "navigation_score": 184,
          "score": 184,
          "navigation_tags": [
            "documentation",
            "example",
            "soap_contract"
          ],
          "roles": [
            "documentation",
            "example",
            "soap_contract"
          ],
          "signals": 0,
          "symbols": 0
        }
      ],
      "boundary_source": "path_partition",
      "boundary_evidence": [],
      "navigation_tags": {
        "documentation": 1,
        "example": 1,
        "soap_contract": 1
      },
      "navigation_signals": {}
    },
    {
      "id": "pom-xml",
      "name": "pom.xml",
      "files": 1,
      "source_files": 0,
      "lines": 12,
      "roles": {
        "build": 1
      },
      "languages": {
        "XML": 12
      },
      "signals": {},
      "top_files": [
        {
          "path": "pom.xml",
          "navigation_score": 45,
          "score": 45,
          "navigation_tags": [
            "build"
          ],
          "roles": [
            "build"
          ],
          "signals": 0,
          "symbols": 0
        }
      ],
      "boundary_source": "path_partition",
      "boundary_evidence": [],
      "navigation_tags": {
        "build": 1
      },
      "navigation_signals": {}
    },
    {
      "id": "readme-md",
      "name": "README.md",
      "files": 1,
      "source_files": 0,
      "lines": 4,
      "roles": {
        "documentation": 1
      },
      "languages": {
        "Markdown": 4
      },
      "signals": {
        "documentation_candidate": 1
      },
      "top_files": [
        {
          "path": "README.md",
          "navigation_score": 78,
          "score": 78,
          "navigation_tags": [
            "documentation"
          ],
          "roles": [
            "documentation"
          ],
          "signals": 1,
          "symbols": 0
        }
      ],
      "boundary_source": "path_partition",
      "boundary_evidence": [],
      "navigation_tags": {
        "documentation": 1
      },
      "navigation_signals": {
        "documentation_candidate": 1
      }
    }
  ],
  "artifact_navigation_candidates": [
    {
      "path": "docs/examples/customer-verification-soap.xml",
      "language": "XML",
      "navigation_tags": [
        "documentation",
        "example",
        "soap_contract"
      ],
      "roles": [
        "documentation",
        "example",
        "soap_contract"
      ],
      "signals": [],
      "navigation_score": 439,
      "score": 439,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 21
    },
    {
      "path": "docs/openapi.yml",
      "language": "YAML",
      "navigation_tags": [
        "api_contract",
        "config",
        "documentation"
      ],
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
      "navigation_score": 391,
      "score": 391,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 78
    },
    {
      "path": "docs/soap-kyc.wsdl",
      "language": "WSDL",
      "navigation_tags": [
        "documentation",
        "soap_contract"
      ],
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
      "navigation_score": 346,
      "score": 346,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 29
    },
    {
      "path": "src/main/resources/openapi.yaml",
      "language": "YAML",
      "navigation_tags": [
        "api_contract",
        "config"
      ],
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
      "navigation_score": 312,
      "score": 312,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 77
    },
    {
      "path": "src/main/resources/wsdl/customer-verification.wsdl",
      "language": "WSDL",
      "navigation_tags": [
        "soap_contract"
      ],
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
      "navigation_score": 279,
      "score": 279,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 54
    },
    {
      "path": "docs/api-examples.md",
      "language": "Markdown",
      "navigation_tags": [
        "documentation",
        "example"
      ],
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
      "navigation_score": 278,
      "score": 278,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 53
    },
    {
      "path": "docs/business-examples.md",
      "language": "Markdown",
      "navigation_tags": [
        "documentation",
        "example"
      ],
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
      "navigation_score": 278,
      "score": 278,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 22
    },
    {
      "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
      "language": "YAML",
      "navigation_tags": [
        "api_contract",
        "config"
      ],
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
      "navigation_score": 277,
      "score": 277,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 103
    },
    {
      "path": "src/main/resources/wsdl/kyc-status.wsdl",
      "language": "WSDL",
      "navigation_tags": [
        "soap_contract"
      ],
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
      "navigation_score": 277,
      "score": 277,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 43
    },
    {
      "path": "src/main/resources/onboarding.wsdl",
      "language": "WSDL",
      "navigation_tags": [
        "soap_contract"
      ],
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
      "navigation_score": 267,
      "score": 267,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 38
    },
    {
      "path": "README.md",
      "language": "Markdown",
      "navigation_tags": [
        "documentation"
      ],
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
      "navigation_score": 158,
      "score": 158,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 4
    },
    {
      "path": "docs/business-flows.md",
      "language": "Markdown",
      "navigation_tags": [
        "documentation"
      ],
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
      "navigation_score": 133,
      "score": 133,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 51
    },
    {
      "path": "src/test/java/com/acme/onboarding/OnboardingServiceTest.java",
      "language": "Java",
      "navigation_tags": [
        "source",
        "test"
      ],
      "roles": [
        "source",
        "test"
      ],
      "signals": [],
      "navigation_score": 74,
      "score": 74,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 8
    },
    {
      "path": "src/main/resources/application.yml",
      "language": "YAML",
      "navigation_tags": [
        "config"
      ],
      "roles": [
        "config"
      ],
      "signals": [],
      "navigation_score": 53,
      "score": 53,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 8
    },
    {
      "path": "pom.xml",
      "language": "XML",
      "navigation_tags": [
        "build"
      ],
      "roles": [
        "build"
      ],
      "signals": [],
      "navigation_score": 45,
      "score": 45,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 12
    }
  ],
  "important_docs": [
    {
      "path": "docs/examples/customer-verification-soap.xml",
      "language": "XML",
      "navigation_tags": [
        "documentation",
        "example",
        "soap_contract"
      ],
      "roles": [
        "documentation",
        "example",
        "soap_contract"
      ],
      "signals": [],
      "navigation_score": 439,
      "score": 439,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 21
    },
    {
      "path": "docs/openapi.yml",
      "language": "YAML",
      "navigation_tags": [
        "api_contract",
        "config",
        "documentation"
      ],
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
      "navigation_score": 391,
      "score": 391,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 78
    },
    {
      "path": "docs/soap-kyc.wsdl",
      "language": "WSDL",
      "navigation_tags": [
        "documentation",
        "soap_contract"
      ],
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
      "navigation_score": 346,
      "score": 346,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 29
    },
    {
      "path": "src/main/resources/openapi.yaml",
      "language": "YAML",
      "navigation_tags": [
        "api_contract",
        "config"
      ],
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
      "navigation_score": 312,
      "score": 312,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 77
    },
    {
      "path": "src/main/resources/wsdl/customer-verification.wsdl",
      "language": "WSDL",
      "navigation_tags": [
        "soap_contract"
      ],
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
      "navigation_score": 279,
      "score": 279,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 54
    },
    {
      "path": "docs/api-examples.md",
      "language": "Markdown",
      "navigation_tags": [
        "documentation",
        "example"
      ],
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
      "navigation_score": 278,
      "score": 278,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 53
    },
    {
      "path": "docs/business-examples.md",
      "language": "Markdown",
      "navigation_tags": [
        "documentation",
        "example"
      ],
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
      "navigation_score": 278,
      "score": 278,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 22
    },
    {
      "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
      "language": "YAML",
      "navigation_tags": [
        "api_contract",
        "config"
      ],
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
      "navigation_score": 277,
      "score": 277,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 103
    },
    {
      "path": "src/main/resources/wsdl/kyc-status.wsdl",
      "language": "WSDL",
      "navigation_tags": [
        "soap_contract"
      ],
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
      "navigation_score": 277,
      "score": 277,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 43
    },
    {
      "path": "src/main/resources/onboarding.wsdl",
      "language": "WSDL",
      "navigation_tags": [
        "soap_contract"
      ],
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
      "navigation_score": 267,
      "score": 267,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 38
    },
    {
      "path": "README.md",
      "language": "Markdown",
      "navigation_tags": [
        "documentation"
      ],
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
      "navigation_score": 158,
      "score": 158,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 4
    },
    {
      "path": "docs/business-flows.md",
      "language": "Markdown",
      "navigation_tags": [
        "documentation"
      ],
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
      "navigation_score": 133,
      "score": 133,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 51
    },
    {
      "path": "src/test/java/com/acme/onboarding/OnboardingServiceTest.java",
      "language": "Java",
      "navigation_tags": [
        "source",
        "test"
      ],
      "roles": [
        "source",
        "test"
      ],
      "signals": [],
      "navigation_score": 74,
      "score": 74,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 8
    },
    {
      "path": "src/main/resources/application.yml",
      "language": "YAML",
      "navigation_tags": [
        "config"
      ],
      "roles": [
        "config"
      ],
      "signals": [],
      "navigation_score": 53,
      "score": 53,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 8
    },
    {
      "path": "pom.xml",
      "language": "XML",
      "navigation_tags": [
        "build"
      ],
      "roles": [
        "build"
      ],
      "signals": [],
      "navigation_score": 45,
      "score": 45,
      "score_meaning": "Non-authoritative navigation ranking for LLM attention only.",
      "lines": 12
    }
  ],
  "report_component_library": {
    "library_kind": "analysis_document_component_library",
    "semantic_authority": false,
    "purpose": "Stable renderer and styling contract for LLM-authored analysis_document.sections. It does not decide report quality or semantic completeness; empty sections or blocks are structural renderer gaps and must be rewritten by the LLM instead of filled by deterministic placeholder prose. Blocks may include labels to let the LLM control repository-specific wording inside stable visual components.",
    "components": [
      {
        "id": "narrative",
        "label": "Narrative",
        "purpose": "Human-readable paragraphs for management/business meaning and technical explanation.",
        "expected_fields": [
          "type",
          "title?",
          "labels?",
          "text|paragraphs|summary|description",
          "business_need?",
          "business_use?",
          "technical_drilldown?",
          "evidence?"
        ],
        "guidance": "Use for authored prose that explains business need, business use, system meaning or technical drilldown. Do not use it as a dumping ground for class/function lists."
      },
      {
        "id": "statement_list",
        "label": "Statement List",
        "purpose": "Evidence-backed claims, findings, risks, recommendations or decisions.",
        "expected_fields": [
          "type",
          "title?",
          "labels?",
          "items[]",
          "items[].title|name|criterion|verdict|id",
          "items[].description|summary|reason|recommendation",
          "items[].evidence?"
        ],
        "guidance": "Use when each statement should stand alone with confidence, severity or evidence."
      },
      {
        "id": "metric_grid",
        "label": "Metric Grid",
        "purpose": "Compact facts that orient the reader without replacing analysis.",
        "expected_fields": [
          "type",
          "title?",
          "labels?",
          "metrics[]",
          "metrics[].label",
          "metrics[].value",
          "metrics[].detail?"
        ],
        "guidance": "Use sparingly for source inventory accounting, counts and status facts. Metrics are not semantic proof."
      },
      {
        "id": "source_family_map",
        "label": "Source Family Map",
        "purpose": "Whole-repository family/module responsibilities before deep drilldown.",
        "expected_fields": [
          "type",
          "title?",
          "labels?",
          "families[]",
          "families[].name",
          "families[].role|business_use|technical_shape",
          "families[].confidence?",
          "families[].evidence?"
        ],
        "guidance": "Use for LLM-authored source-family understanding. Deterministic inventory partitions remain navigation aids only."
      },
      {
        "id": "boundary_map",
        "label": "Boundary Map",
        "purpose": "System entry, system exit/integration and state/data boundaries.",
        "expected_fields": [
          "type",
          "title?",
          "labels.entries?",
          "labels.exits?",
          "labels.state?",
          "entries[]",
          "exits[]",
          "state[]",
          "evidence?"
        ],
        "guidance": "Use when explaining how the system is entered, what it calls or emits, and where state changes. Set labels when repository terminology differs from the default entry/exit/state wording."
      },
      {
        "id": "flow",
        "label": "Flow",
        "purpose": "E2E, process, request/response or failure flow with optional Mermaid.",
        "expected_fields": [
          "type",
          "title?",
          "labels?",
          "summary|description?",
          "mermaid?|source?",
          "steps[]?",
          "evidence?"
        ],
        "guidance": "Use for human understanding of collaboration across functions, modules, interfaces and systems."
      },
      {
        "id": "four_level_assessment",
        "label": "Four-Level Assessment",
        "purpose": "The four requested analysis levels in one structured view.",
        "expected_fields": [
          "type",
          "title?",
          "labels.next_steps?",
          "levels[]",
          "levels[].level",
          "levels[].status",
          "levels[].summary",
          "levels[].next_steps?",
          "levels[].evidence?"
        ],
        "guidance": "Use for reverse engineering/documentation, code analysis, process analysis and refactoring/target architecture."
      },
      {
        "id": "decision_matrix",
        "label": "Decision Matrix",
        "purpose": "Options, trade-offs, recommendations, confidence and risks.",
        "expected_fields": [
          "type",
          "title?",
          "labels.decision?",
          "labels.options?",
          "labels.recommendation?",
          "labels.risk?",
          "rows[]",
          "rows[].decision",
          "rows[].options?",
          "rows[].recommendation?",
          "rows[].risk?",
          "rows[].confidence?",
          "rows[].evidence?"
        ],
        "guidance": "Use when the report needs to become a decision basis rather than only documentation. Set labels when the repository-specific decision vocabulary should drive table wording."
      },
      {
        "id": "roadmap",
        "label": "Roadmap",
        "purpose": "Modernization, refactoring, process or quality improvement path.",
        "expected_fields": [
          "type",
          "title?",
          "labels?",
          "items[]",
          "items[].title",
          "items[].phase?",
          "items[].benefit?",
          "items[].description?",
          "items[].effort?",
          "items[].risk?",
          "items[].evidence?"
        ],
        "guidance": "Use for target architecture or migration/optimization recommendations."
      },
      {
        "id": "agent_plan",
        "label": "Agent Plan",
        "purpose": "Planned/executed detail reviews and remaining follow-up.",
        "expected_fields": [
          "type",
          "title?",
          "labels.source_family?",
          "labels.priority?",
          "labels.focus?",
          "labels.expected_outputs?",
          "labels.task_output?",
          "labels.seed_files?",
          "summary?",
          "tasks[]|detail_agent_tasks[]",
          "tasks[].source_family",
          "tasks[].focus?",
          "tasks[].expected_outputs?",
          "tasks[].seed_files?"
        ],
        "guidance": "Use only to show detail-review basis or follow-up. Executable pre-report tasks come from llm/detail-agent-plan.json. Set labels when the report needs repository-specific follow-up wording."
      },
      {
        "id": "technical_drilldown",
        "label": "Technical Drilldown",
        "purpose": "Links into technical catalogues, contracts, evidence or deeper sections.",
        "expected_fields": [
          "type",
          "title?",
          "labels?",
          "references[]",
          "references[].label",
          "references[].target?",
          "references[].description?"
        ],
        "guidance": "Use to keep the main narrative readable while preserving deep technical access."
      },
      {
        "id": "open_questions",
        "label": "Open Questions",
        "purpose": "Missing proof, owner questions and follow-up analysis.",
        "expected_fields": [
          "type",
          "title?",
          "labels.question?",
          "items[]",
          "items[].question|title",
          "items[].why_it_matters|description?",
          "items[].owner?",
          "items[].evidence?"
        ],
        "guidance": "Use when code evidence cannot support a stronger claim."
      }
    ]
  },
  "analysis_skill_catalog": {
    "catalog_kind": "llm_analysis_skill_catalog",
    "semantic_authority": "llm",
    "deterministic_authority": "catalog_presence_and_shape_only",
    "purpose": "Reusable LLM analysis capabilities for repository understanding. The CLI exposes and validates the catalog shape; the LLM decides which skills matter for a repository and how to apply them.",
    "skills": [
      {
        "id": "whole_repository_understanding",
        "label": "Whole-Repository Understanding",
        "purpose": "Build the repository-wide story, system purpose, source-family landscape and scope boundaries before deep review.",
        "stage_ids": [
          "llm_whole_repository_building_blocks"
        ],
        "expected_outputs": [
          "assessment.repository_wide_view",
          "analysis_coverage"
        ],
        "guidance": "Start broad. A deep slice can support the story, but it must not become the whole-system narrative."
      },
      {
        "id": "business_extraction",
        "label": "Business Extraction",
        "purpose": "Extract business capabilities, actors, use cases, rules, decisions, validations, calculations, status transitions and examples.",
        "stage_ids": [
          "llm_whole_repository_building_blocks",
          "llm_detail_reviews"
        ],
        "expected_outputs": [
          "capabilities[]",
          "business_logic[]",
          "business_logic_examples[]",
          "function_examples[]"
        ],
        "guidance": "Use source, tests, contracts and docs as evidence. Do not infer owner-grade business meaning from names alone."
      },
      {
        "id": "interface_contract_analysis",
        "label": "Interface and Contract Analysis",
        "purpose": "Understand APIs, SOAP/WSDL/XSD, OpenAPI/Swagger, GraphQL, events, jobs, CLI commands, UI routes and external calls.",
        "stage_ids": [
          "llm_whole_repository_building_blocks",
          "llm_detail_reviews"
        ],
        "expected_outputs": [
          "interfaces[]",
          "contracts[]",
          "openapi",
          "soap",
          "graphql",
          "events"
        ],
        "guidance": "Navigation candidates can point to likely contracts, but the LLM must read evidence and state uncertainty."
      },
      {
        "id": "request_response_examples",
        "label": "Request/Response Examples",
        "purpose": "Extract or infer request/response, message, fault and payload examples with source-backed field meaning.",
        "stage_ids": [
          "llm_whole_repository_building_blocks",
          "llm_detail_reviews"
        ],
        "expected_outputs": [
          "request_response_examples[]",
          "contract_examples[]"
        ],
        "guidance": "Mark inferred examples with example_origin=\"inferred\" and cite the fields/rules used."
      },
      {
        "id": "flow_mermaid_analysis",
        "label": "Flow and Mermaid Analysis",
        "purpose": "Explain E2E, process, failure, data and integration flows using narrative and Mermaid where useful.",
        "stage_ids": [
          "llm_whole_repository_building_blocks",
          "llm_detail_reviews",
          "llm_final_analysis_document"
        ],
        "expected_outputs": [
          "flows[]",
          "mermaid_flows[]",
          "analysis_document.sections[].blocks[type=flow]"
        ],
        "guidance": "Prefer flows that teach how functions, modules and systems cooperate. Mermaid is supporting evidence, not the report itself."
      },
      {
        "id": "domain_data_integration_analysis",
        "label": "Domain, Data and Integration Analysis",
        "purpose": "Extract domain objects, data stores, persistence effects, state changes, integrations, topics, queues and side effects.",
        "stage_ids": [
          "llm_whole_repository_building_blocks",
          "llm_detail_reviews"
        ],
        "expected_outputs": [
          "domain_model",
          "data_model",
          "integrations[]",
          "side_effects[]"
        ],
        "guidance": "Separate proven behavior from open questions when only schemas or persistence names are visible."
      },
      {
        "id": "process_quality_readiness",
        "label": "Process, Quality and Readiness",
        "purpose": "Assess bugs, visible vulnerabilities, maintainability, tests, observability, release/process readiness and operational risks.",
        "stage_ids": [
          "llm_whole_repository_building_blocks",
          "llm_detail_reviews",
          "llm_final_analysis_document"
        ],
        "expected_outputs": [
          "process",
          "quality",
          "findings[]",
          "analysis_document.report_quality_review"
        ],
        "guidance": "LLM review can identify evidence-backed risks, but dedicated scanners remain handoff tools for formal gates."
      },
      {
        "id": "architecture_refactoring_roadmap",
        "label": "Architecture and Refactoring Roadmap",
        "purpose": "Describe architecture responsibilities and modernization/refactoring/target-tech-stack options.",
        "stage_ids": [
          "llm_whole_repository_building_blocks",
          "llm_final_analysis_document"
        ],
        "expected_outputs": [
          "architecture",
          "refactoring[]",
          "modernization[]",
          "analysis_document.sections[].blocks[type=roadmap]"
        ],
        "guidance": "Turn code evidence into decision options with benefit, risk, effort and handoff boundaries."
      },
      {
        "id": "detail_agent_planning",
        "label": "Detail-Agent Planning",
        "purpose": "Select focused source-family detail reviews after whole-repository understanding exists.",
        "stage_ids": [
          "llm_detail_agent_plan"
        ],
        "expected_outputs": [
          "llm/detail-agent-plan.json",
          "detail_agent_plan.tasks[]"
        ],
        "guidance": "The LLM chooses detail-review priorities; deterministic inventories only provide navigation context."
      },
      {
        "id": "final_report_authoring",
        "label": "Final Report Authoring",
        "purpose": "Compose the visible decision document from all building blocks and detail reviews through the component library.",
        "stage_ids": [
          "llm_final_analysis_document"
        ],
        "expected_outputs": [
          "analysis_document.sections[]",
          "analysis_document.requirements_trace[]",
          "analysis_document.report_quality_review"
        ],
        "guidance": "Choose section order and emphasis per repository. Do not rely on fixed appendices or raw catalogs as the human report."
      },
      {
        "id": "tool_positioning",
        "label": "Tool Positioning",
        "purpose": "Position the source-derived analysis against consulting/gen-AI suites, architecture mapping, static quality gates and transformation engines.",
        "stage_ids": [
          "llm_whole_repository_building_blocks",
          "llm_final_analysis_document"
        ],
        "expected_outputs": [
          "tool_positioning",
          "analysis_document decision/tool sections"
        ],
        "guidance": "Use market references only as framing. Claims about the repository must come from source evidence."
      },
      {
        "id": "evidence_governance",
        "label": "Evidence Governance",
        "purpose": "Keep claims source-backed, uncertainty visible and file inventory accounted for.",
        "stage_ids": [
          "llm_whole_repository_building_blocks",
          "llm_detail_reviews",
          "llm_final_analysis_document"
        ],
        "expected_outputs": [
          "evidence[]",
          "analysis_coverage",
          "open_questions[]"
        ],
        "guidance": "Every substantive claim needs file:line evidence or an explicit open question."
      }
    ]
  },
  "analysis_goal_contract": {
    "contract_kind": "analysis_goal_context",
    "deterministic_authority": "goal_context_only",
    "semantic_verdict_authority": "llm",
    "semantic_status_source": [
      "analysis_document.requirements_trace",
      "analysis_document.report_quality_review"
    ],
    "purpose": "Preserve the original product objective as reusable LLM context. This artifact is not a deterministic checklist and does not decide whether a repository report is complete, well documented or management-ready.",
    "objective": "Automated source-code analysis that produces a structured decision basis as an analysis document. The whole report should be authored by an LLM through a stable component/style library, start whole-repository first, then use focused detail agents where useful, and preserve the original requirements.",
    "required_output_shape": {
      "deliverable": "structured_decision_basis_analysis_document",
      "visible_report_authority": "analysis_document.sections authored by LLM",
      "style_system": "stable report component library",
      "source_basis": "source code, tests, docs, contracts, examples and configuration",
      "automation_goal": "as automated as possible from source code",
      "management_drilldown": "textual business-need/business-use narrative for management with drilldown to technical and deep technical evidence"
    },
    "required_levels": [
      {
        "id": "reverse_engineering_documentation",
        "label": "Reverse Engineering & Documentation",
        "intent": "Derive functionality, business capabilities and user/system flows from source evidence."
      },
      {
        "id": "code_analysis",
        "label": "Code Analysis",
        "intent": "Identify visible bugs, vulnerabilities, maintainability risks, code quality issues and testability concerns."
      },
      {
        "id": "process_analysis",
        "label": "Process Analysis",
        "intent": "Derive improvement and optimization potential for delivery, operations, readiness and process quality."
      },
      {
        "id": "refactoring_target_architecture",
        "label": "Refactoring / Target Architecture",
        "intent": "Describe modernization, refactoring and target architecture or new technology stack options where evidence justifies them."
      }
    ],
    "required_views": [
      {
        "id": "functional_view",
        "label": "Functional View",
        "intent": "Explain what the system does from a business/user/system perspective."
      },
      {
        "id": "technical_view",
        "label": "Technical View",
        "intent": "Explain APIs, interfaces, contracts, architecture, data stores and integrations."
      }
    ],
    "required_report_behaviors": [
      {
        "id": "whole_repo_first",
        "label": "Whole repository first",
        "intent": "Build a repository-wide overview and relationship map before deep slices."
      },
      {
        "id": "e2e_relationships",
        "label": "E2E relationships",
        "intent": "Explain how functions, code blocks, modules and systems collaborate through representative flows."
      },
      {
        "id": "llm_authored_report",
        "label": "LLM-authored report",
        "intent": "Let the LLM decide the repository-specific report structure while the renderer supplies styling and components."
      },
      {
        "id": "detail_agents_after_overview",
        "label": "Detail agents after overview",
        "intent": "Plan and execute focused source-family/detail reviews only after whole-repository building blocks exist."
      },
      {
        "id": "tool_positioning",
        "label": "Tool positioning",
        "intent": "Position the analysis as an alternative or complement to consulting/gen-AI suites, architecture mapping, static quality/security gates and automated transformation engines."
      },
      {
        "id": "evidence_and_uncertainty",
        "label": "Evidence and uncertainty",
        "intent": "Keep claims evidence-backed and show open questions where behavior cannot be proven from source."
      }
    ],
    "llm_trace_guidance": "The final LLM-authored requirements_trace may use repository-specific wording and additional rows, but it should add goal_contract_refs using required_output_shape.<key>, required_levels.<id>, required_views.<id> and required_report_behaviors.<id> so the LLM explicitly accounts for output shape, management/business readability, levels, views and behaviors with covered|partial|open statuses, evidence and open questions."
  },
  "tool_positioning_reference": {
    "reference_kind": "external_tool_positioning_context",
    "semantic_authority": false,
    "deterministic_authority": "reference_context_only",
    "last_verified_on": "2026-06-09",
    "verification_basis": "Official public vendor or project documentation checked for category framing. The LLM must still decide repository-specific positioning from source evidence.",
    "purpose": "Official public tool-market context for LLM-authored positioning. These references frame comparison categories; they are not repository evidence, do not decide report readiness and must not be used as deterministic replacement/complement verdicts.",
    "llm_positioning_rubric": {
      "semantic_authority": "llm",
      "deterministic_scope": "reference categories, source URLs and source support notes only",
      "required_judgment_dimensions": [
        "repo_specific_decision_value",
        "what_this_analysis_can_replace",
        "what_this_analysis_only_complements",
        "handoff_boundary",
        "evidence_strength",
        "remaining_owner_or_specialist_follow_up"
      ],
      "instruction": "Use the official references as market context, then author repository-specific replace/complement/handoff statements from analyzed source evidence. If the source analysis cannot justify a claim, mark the positioning partial or open in the LLM-authored requirements trace/report quality review."
    },
    "references": [
      {
        "category": "consulting_or_genai_delivery_suite",
        "examples": [
          "Accenture GenWizard"
        ],
        "public_reference_url": "https://www.accenture.com/us-en/services/cloud/application-transformation/genwizard",
        "source_type": "official_vendor_page",
        "source_support": [
          {
            "claim": "GenWizard is positioned as a full-suite generative AI platform for technology delivery.",
            "source_url": "https://www.accenture.com/us-en/services/cloud/application-transformation/genwizard",
            "source_basis": "Official Accenture GenWizard page, verified 2026-06-09"
          },
          {
            "claim": "The page lists reverse engineering, migration/modernization, modern engineering and enterprise rationalization modules.",
            "source_url": "https://www.accenture.com/us-en/services/cloud/application-transformation/genwizard",
            "source_basis": "Official Accenture GenWizard page, verified 2026-06-09"
          }
        ],
        "current_public_positioning": "Generative-AI technology delivery suite spanning application and infrastructure management, application/data modernization, reverse engineering, software/platform delivery acceleration and scaled transformation execution.",
        "typical_focus": [
          "reverse engineering and living knowledge base creation",
          "application and infrastructure management",
          "application and data modernization",
          "software and platform delivery acceleration",
          "scaled delivery governance"
        ],
        "handoff_boundary": "Use Codebase Analysis Pack to create source-derived decision documents; use consulting/gen-AI delivery suites for scaled delivery programs, transformation governance and execution capacity.",
        "report_question": "Where does this source-derived analysis provide a decision document that can complement or replace consulting-style discovery work, and where does it still need owner or specialist follow-up?"
      },
      {
        "category": "structural_architecture_mapping",
        "examples": [
          "CAST Imaging"
        ],
        "public_reference_url": "https://www.castsoftware.com/imaging",
        "source_type": "official_vendor_page",
        "source_support": [
          {
            "claim": "CAST Imaging is positioned around deterministic maps across architecture, dependencies, data access and technical debt.",
            "source_url": "https://www.castsoftware.com/imaging",
            "source_basis": "Official CAST Imaging page, verified 2026-06-09"
          },
          {
            "claim": "The page emphasizes transaction paths, data access graphs, change impact and AI-agent context.",
            "source_url": "https://www.castsoftware.com/imaging",
            "source_basis": "Official CAST Imaging page, verified 2026-06-09"
          }
        ],
        "current_public_positioning": "Deterministic system mapping for architecture, dependencies, data access and technical debt to help humans and AI understand brownfield systems.",
        "typical_focus": [
          "deterministic dependency and transaction maps",
          "architecture and data-access visualization",
          "impact analysis for brownfield changes",
          "agent context for architecture reasoning"
        ],
        "handoff_boundary": "Use Codebase Analysis Pack for LLM-authored narrative, business/technical decision framing and evidence-backed drilldown; use structural graph tooling when exhaustive dependency graphs, transaction maps or data lineage need deterministic graph proof.",
        "report_question": "Which relationships are proven from source evidence, which are representative, and where would deterministic graph tooling add confidence?"
      },
      {
        "category": "static_quality_security_gate",
        "examples": [
          "SonarQube"
        ],
        "public_reference_url": "https://docs.sonarsource.com/sonarqube-server/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates",
        "source_type": "official_documentation",
        "source_support": [
          {
            "claim": "A quality gate consists of conditions measured during analysis and gives pass/fail status.",
            "source_url": "https://docs.sonarsource.com/sonarqube-server/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates",
            "source_basis": "Official SonarQube Server documentation, verified 2026-06-09"
          },
          {
            "claim": "Quality gate status can be used in pull requests and CI pipelines to block or fail changes.",
            "source_url": "https://docs.sonarsource.com/sonarqube-server/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates",
            "source_basis": "Official SonarQube Server documentation, verified 2026-06-09"
          }
        ],
        "current_public_positioning": "Quality gates use configured analysis conditions to determine pass/fail status for code quality and security governance.",
        "typical_focus": [
          "bugs and vulnerabilities",
          "security hotspots",
          "code smells and maintainability thresholds",
          "CI/CD quality gates"
        ],
        "handoff_boundary": "Use Codebase Analysis Pack to explain visible source risks in business and architecture context; use static analysis gates for repeatable issue detection, thresholds and CI enforcement.",
        "report_question": "Which quality and security risks are visible in the source review, and which findings require a dedicated static-analysis/security scan before decisions?"
      },
      {
        "category": "automated_transformation_engine",
        "examples": [
          "OpenRewrite"
        ],
        "public_reference_url": "https://docs.openrewrite.org/",
        "source_type": "official_documentation",
        "source_support": [
          {
            "claim": "OpenRewrite is described as an open-source automated refactoring ecosystem for source code.",
            "source_url": "https://docs.openrewrite.org/",
            "source_basis": "Official OpenRewrite documentation, verified 2026-06-09"
          },
          {
            "claim": "OpenRewrite runs recipes for framework migrations, security fixes, stylistic consistency and lossless semantic tree transformations.",
            "source_url": "https://docs.openrewrite.org/",
            "source_basis": "Official OpenRewrite documentation, verified 2026-06-09"
          }
        ],
        "current_public_positioning": "Open-source automated refactoring ecosystem for source code and repeatable technical-debt reduction.",
        "typical_focus": [
          "repeatable refactoring recipes",
          "framework and language migrations",
          "safe mechanical code transformations",
          "large-scale modernization execution"
        ],
        "handoff_boundary": "Use Codebase Analysis Pack to decide and prioritize modernization options; use automated transformation engines when recommendations can be encoded as repeatable recipes or migration tasks.",
        "report_question": "Which modernization steps are analysis recommendations only, and which could become repeatable automated recipes or migration tasks?"
      }
    ]
  },
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
      "navigation_tags": [
        "documentation",
        "example",
        "soap_contract"
      ],
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
      "navigation_tags": [
        "api_contract",
        "config",
        "documentation"
      ],
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
      "navigation_tags": [
        "api_contract",
        "config"
      ],
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
      "navigation_tags": [
        "documentation",
        "soap_contract"
      ],
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
      "navigation_tags": [
        "documentation",
        "example"
      ],
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
      "navigation_tags": [
        "documentation",
        "example"
      ],
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
      "navigation_tags": [
        "soap_contract"
      ],
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
      "navigation_tags": [
        "api_contract",
        "config"
      ],
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
      "navigation_tags": [
        "soap_contract"
      ],
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
      "navigation_tags": [
        "soap_contract"
      ],
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
      "navigation_tags": [
        "documentation"
      ],
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
      "navigation_tags": [
        "source",
        "test"
      ],
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
      "navigation_tags": [
        "source"
      ],
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
      "navigation_tags": [
        "source"
      ],
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
      "navigation_tags": [
        "source"
      ],
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
      "navigation_tags": [
        "documentation"
      ],
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
      "navigation_tags": [
        "config"
      ],
      "roles": [
        "config"
      ],
      "signals": [],
      "symbols": []
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingResponse.java",
      "navigation_tags": [
        "source"
      ],
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
  "data_model": {
    "entities": [
      {"name":"Entity/table/document", "kind":"domain_entity|table|collection|dto|message", "description":"...", "fields":[{"name":"field", "type":"optional", "meaning":"...", "evidence": []}], "evidence": []}
    ],
    "stores": [
      {"name":"store", "technology":"SQL|Mongo|Redis|file|unknown", "usage":"read|write|read_write", "evidence": []}
    ],
    "state_changes": [
      {"entity":"Entity", "from":"optional", "to":"optional", "trigger":"...", "evidence": []}
    ]
  },
  "integrations": [
    {"id":"integration-id", "name":"External system/topic/queue/API", "direction":"inbound|outbound|both", "protocol":"HTTP|SOAP|Kafka|AMQP|DB|file|unknown", "purpose":"...", "messages": [], "evidence": [], "open_questions": []}
  ],
  "side_effects": [
    {"id":"side-effect-id", "type":"database_read|database_write|event_publish|external_call|file_write|state_change|notification", "description":"...", "trigger":"...", "evidence": []}
  ]
}

## Required Source Inventory Accounting

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

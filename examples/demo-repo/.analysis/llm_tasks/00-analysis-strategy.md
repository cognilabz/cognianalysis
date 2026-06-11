# LLM Repository Analysis Strategy

You are running inside an agent harness as the semantic extraction step for Cognianalysis.

Task id: `analysis_strategy`
Task kind: `required workflow task`

This file is part of the required LLM workflow gate for analysis strategy, detail planning or final report authoring.

Read these files first:

- `.analysis/llm_instructions.md`
- `.analysis/data/code-map.json`
- `.analysis/data/source-inventory.json`
- `.analysis/data/source-tier-model.json`
	- `.analysis/source-tier-task-manifest.json`
	- all completed `.analysis/source_tiers/*.json` outputs
	- `.analysis/skill-workbench-task-manifest.json` when it exists
	- all completed `.analysis/skill_reviews/*.json` outputs
- `.analysis/capability-template-manifest.json` only as optional template context; it is not the semantic plan
- `.analysis/data/analysis-goal-contract.json`
- `.analysis/data/tool-positioning-references.json`
- `.analysis/data/navigation-artifact-candidates.json` (or legacy `.analysis/data/important-docs.json`)
- `.analysis/data/source-family-inventory.json`
- `.analysis/source-capsules.json`

	Then open source files, tests, docs, contracts, schemas and configuration as needed. The deterministic map does not parse imports, symbols, framework names, contracts, examples, tests, entrypoints or relationships; Codex must parse and decide those from source. The source capsules and inventory-ranked seed files are only navigation aids. The source inventory defines the full included analysis scope; do not stop at the top capsules.
		If this is not task `analysis_strategy`, read `.analysis/llm/analysis-strategy.json` first when it exists and follow its repository-specific analysis plan. If it does not exist yet, author it before treating any later task as final-ready.
		Tier 1 file cards are the broad base for whole-codebase understanding. If `.analysis/source_tiers/*.json` is incomplete, do not claim whole-codebase completion; execute the missing `.analysis/source_tier_tasks/*.md` tasks first or mark final readiness partial.
		After `analysis_strategy` and Tier 1 cards exist, run `cognianalysis dev finalize . --allow-partial` to materialize `.analysis/skill_workbench_tasks/*.md` from `analysis_strategy.skill_application_plan[]`. Execute those LLM-planned skill workbenches before using any generic capability-template output as a supporting building block.
		Generic capability templates are optional. Prefer repository-specific `.analysis/skill_workbench_tasks/*.md` and direct final synthesis. If you use a template output, explain in the JSON why this capability output was needed for this repository.
	For large repositories, use `.analysis/data/source-family-inventory.json` only as navigation context. The legacy filename does not mean the CLI has authored semantic source families. The actual source-family/detail-agent plan must be authored by Codex in `.analysis/llm/detail-agent-plan.json`; deterministic inventory partitions are not semantic proof, not detail-review priorities and not source-family names.

Write your result to `.analysis/llm/analysis-strategy.json` as valid JSON.

Evidence format for every relevant claim:

```json
{"path": "relative/path/File.ext", "line": 123, "symbol": "optionalSymbol"}
```

General rules:

- Use English for generated descriptions. Preserve original identifiers and domain names.
- Do not include markdown in the JSON output.
- Prefer concrete evidence over speculation.
- Do not promote generated hints, word matches, regex matches or filename matches into semantic conclusions.
- Account for the source inventory without using deferral as a success path. Every output must include `analysis_coverage.inspected_files[]` for files you opened or semantically considered. Use `analysis_coverage.deferred_files[]` only for task-local scope boundaries or evidence-gap follow-up; deferred files are not finished whole-codebase analysis. Tier 1 file-card coverage in `.analysis/source_tiers/*.json` is the required broad base.
- Start from the full repository scope. Summarize the whole source-family landscape before focusing on a specific module, framework, interface type or flow family.
- For multi-module repositories, include source-family statements across the repository; a deep slice is acceptable only when clearly labelled and paired with whole-repo coverage context.
- Avoid single-module bias. If one family has the strongest evidence, explain why it is strongest and which other families remain surface-reviewed or require follow-up drilldown.
- When using navigation partitions, Codex must decide whether to rename, merge, split, reject or defer them as semantic source families. Do not copy partition names into management prose unless source evidence proves they are meaningful to the repository.
- Preserve the original target picture: automated source-code analysis that produces a structured decision basis with four levels: reverse engineering/documentation, code analysis, process analysis, and refactoring/target architecture.
- The final report is allowed to have a different structure for every repository, but it must still cover functional view, technical view, source-derived decision basis, automation boundaries, and comparison/positioning against traditional code-analysis/documentation tools.
- When writing tool positioning, use the provided reference categories: consulting/gen-AI delivery suites, structural architecture mapping, static quality/security gates and automated transformation engines. Be explicit about whether the analysis replaces discovery, complements graph/scanner/recipe tools, or should hand off to them.
	- Do not author final management summaries, E2E conclusions or visible report sections until the final analysis-document task. Use the earlier LLM-planned skill workbenches and generic capability contracts to build source-backed blocks, examples, flows, findings and the detail-agent plan.
	- The final analysis-document task must read all skill workbench reviews, all extraction outputs and all executed `.analysis/detail_reviews/*.json` files, then synthesize the complete picture.
- Deterministic scripts only validate JSON shape, evidence references, output presence and renderer component compatibility. They do not decide whether the report is complete, well documented or management-ready. Those semantic judgments must be authored by Codex in `analysis_document.requirements_trace` and `analysis_document.report_quality_review`.
- Do not leave empty sections or empty component blocks for the renderer to explain. If something is unknown, author an `open_questions` block or a narrative limitation with evidence context; the renderer will not generate placeholder report prose for you.
- Use a clear `confidence` statement and `open_questions` when behavior is unclear.
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
    "analyzed_at": "2026-06-11T06:59:49Z",
    "commit": "cf48e69aeacde11c4a357272dca853c43a274ca7",
    "repo_type": "source-inventory",
    "languages": {
      "Java": 261
    },
    "language_files": {
      "Java": 18
    },
    "frameworks": [],
    "build_tools": [],
    "package_managers": [],
    "important_files": [],
    "contract_files": [],
    "example_files": [],
    "test_files": 0,
    "source_files": 18,
    "total_files": 32,
    "total_lines": 854,
    "skipped_files": 0,
    "analysis_scope_mode": "complete",
    "scope_total_files_before_scope": 32,
    "scope_deferred_files": 0
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
        "source_file": 17,
        "structured_file": 6
      },
      "languages": {
        "Java": 253,
        "WSDL": 135,
        "YAML": 188
      },
      "signals": {},
      "top_files": [
        {
          "path": "src/main/java/com/acme/onboarding/Customer.java",
          "navigation_score": 28,
          "score": 28,
          "navigation_tags": [
            "source_file"
          ],
          "roles": [
            "source_file"
          ],
          "signals": 0,
          "symbols": 0
        },
        {
          "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
          "navigation_score": 28,
          "score": 28,
          "navigation_tags": [
            "source_file"
          ],
          "roles": [
            "source_file"
          ],
          "signals": 0,
          "symbols": 0
        },
        {
          "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
          "navigation_score": 28,
          "score": 28,
          "navigation_tags": [
            "source_file"
          ],
          "roles": [
            "source_file"
          ],
          "signals": 0,
          "symbols": 0
        },
        {
          "path": "src/main/resources/onboarding.wsdl",
          "navigation_score": 26,
          "score": 26,
          "navigation_tags": [
            "structured_file"
          ],
          "roles": [
            "structured_file"
          ],
          "signals": 0,
          "symbols": 0
        },
        {
          "path": "src/main/resources/openapi.yaml",
          "navigation_score": 26,
          "score": 26,
          "navigation_tags": [
            "structured_file"
          ],
          "roles": [
            "structured_file"
          ],
          "signals": 0,
          "symbols": 0
        },
        {
          "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
          "navigation_score": 26,
          "score": 26,
          "navigation_tags": [
            "structured_file"
          ],
          "roles": [
            "structured_file"
          ],
          "signals": 0,
          "symbols": 0
        },
        {
          "path": "src/main/resources/wsdl/customer-verification.wsdl",
          "navigation_score": 26,
          "score": 26,
          "navigation_tags": [
            "structured_file"
          ],
          "roles": [
            "structured_file"
          ],
          "signals": 0,
          "symbols": 0
        },
        {
          "path": "src/main/resources/wsdl/kyc-status.wsdl",
          "navigation_score": 26,
          "score": 26,
          "navigation_tags": [
            "structured_file"
          ],
          "roles": [
            "structured_file"
          ],
          "signals": 0,
          "symbols": 0
        },
        {
          "path": "src/main/java/com/acme/onboarding/CustomerNotFoundException.java",
          "navigation_score": 20,
          "score": 20,
          "navigation_tags": [
            "source_file"
          ],
          "roles": [
            "source_file"
          ],
          "signals": 0,
          "symbols": 0
        },
        {
          "path": "src/main/java/com/acme/onboarding/CustomerRepository.java",
          "navigation_score": 20,
          "score": 20,
          "navigation_tags": [
            "source_file"
          ],
          "roles": [
            "source_file"
          ],
          "signals": 0,
          "symbols": 0
        }
      ],
      "boundary_source": "path_partition",
      "boundary_evidence": [],
      "navigation_tags": {
        "source_file": 17,
        "structured_file": 6
      },
      "navigation_signals": {}
    },
    {
      "id": "src-test",
      "name": "src/test",
      "files": 1,
      "source_files": 1,
      "lines": 8,
      "roles": {
        "source_file": 1
      },
      "languages": {
        "Java": 8
      },
      "signals": {},
      "top_files": [
        {
          "path": "src/test/java/com/acme/onboarding/OnboardingServiceTest.java",
          "navigation_score": 20,
          "score": 20,
          "navigation_tags": [
            "source_file"
          ],
          "roles": [
            "source_file"
          ],
          "signals": 0,
          "symbols": 0
        }
      ],
      "boundary_source": "path_partition",
      "boundary_evidence": [],
      "navigation_tags": {
        "source_file": 1
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
        "structured_file": 2,
        "text_document": 3
      },
      "languages": {
        "YAML": 78,
        "WSDL": 29,
        "Markdown": 126
      },
      "signals": {},
      "top_files": [
        {
          "path": "docs/openapi.yml",
          "navigation_score": 26,
          "score": 26,
          "navigation_tags": [
            "structured_file"
          ],
          "roles": [
            "structured_file"
          ],
          "signals": 0,
          "symbols": 0
        },
        {
          "path": "docs/soap-kyc.wsdl",
          "navigation_score": 26,
          "score": 26,
          "navigation_tags": [
            "structured_file"
          ],
          "roles": [
            "structured_file"
          ],
          "signals": 0,
          "symbols": 0
        },
        {
          "path": "docs/api-examples.md",
          "navigation_score": 24,
          "score": 24,
          "navigation_tags": [
            "text_document"
          ],
          "roles": [
            "text_document"
          ],
          "signals": 0,
          "symbols": 0
        },
        {
          "path": "docs/business-examples.md",
          "navigation_score": 24,
          "score": 24,
          "navigation_tags": [
            "text_document"
          ],
          "roles": [
            "text_document"
          ],
          "signals": 0,
          "symbols": 0
        },
        {
          "path": "docs/business-flows.md",
          "navigation_score": 24,
          "score": 24,
          "navigation_tags": [
            "text_document"
          ],
          "roles": [
            "text_document"
          ],
          "signals": 0,
          "symbols": 0
        }
      ],
      "boundary_source": "path_partition",
      "boundary_evidence": [],
      "navigation_tags": {
        "structured_file": 2,
        "text_document": 3
      },
      "navigation_signals": {}
    },
    {
      "id": "docs-examples",
      "name": "docs/examples",
      "files": 1,
      "source_files": 0,
      "lines": 21,
      "roles": {
        "structured_file": 1
      },
      "languages": {
        "XML": 21
      },
      "signals": {},
      "top_files": [
        {
          "path": "docs/examples/customer-verification-soap.xml",
          "navigation_score": 26,
          "score": 26,
          "navigation_tags": [
            "structured_file"
          ],
          "roles": [
            "structured_file"
          ],
          "signals": 0,
          "symbols": 0
        }
      ],
      "boundary_source": "path_partition",
      "boundary_evidence": [],
      "navigation_tags": {
        "structured_file": 1
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
        "structured_file": 1
      },
      "languages": {
        "XML": 12
      },
      "signals": {},
      "top_files": [
        {
          "path": "pom.xml",
          "navigation_score": 18,
          "score": 18,
          "navigation_tags": [
            "structured_file"
          ],
          "roles": [
            "structured_file"
          ],
          "signals": 0,
          "symbols": 0
        }
      ],
      "boundary_source": "path_partition",
      "boundary_evidence": [],
      "navigation_tags": {
        "structured_file": 1
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
        "text_document": 1
      },
      "languages": {
        "Markdown": 4
      },
      "signals": {},
      "top_files": [
        {
          "path": "README.md",
          "navigation_score": 16,
          "score": 16,
          "navigation_tags": [
            "text_document"
          ],
          "roles": [
            "text_document"
          ],
          "signals": 0,
          "symbols": 0
        }
      ],
      "boundary_source": "path_partition",
      "boundary_evidence": [],
      "navigation_tags": {
        "text_document": 1
      },
      "navigation_signals": {}
    }
  ],
  "artifact_navigation_candidates": [
    {
      "path": "src/main/java/com/acme/onboarding/Customer.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 28,
      "score": 28,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 43
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 28,
      "score": 28,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 32
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 28,
      "score": 28,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 46
    },
    {
      "path": "docs/examples/customer-verification-soap.xml",
      "language": "XML",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 26,
      "score": 26,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 21
    },
    {
      "path": "docs/openapi.yml",
      "language": "YAML",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 26,
      "score": 26,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 78
    },
    {
      "path": "docs/soap-kyc.wsdl",
      "language": "WSDL",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 26,
      "score": 26,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 29
    },
    {
      "path": "src/main/resources/onboarding.wsdl",
      "language": "WSDL",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 26,
      "score": 26,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 38
    },
    {
      "path": "src/main/resources/openapi.yaml",
      "language": "YAML",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 26,
      "score": 26,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 77
    },
    {
      "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
      "language": "YAML",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 26,
      "score": 26,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 103
    },
    {
      "path": "src/main/resources/wsdl/customer-verification.wsdl",
      "language": "WSDL",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 26,
      "score": 26,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 54
    },
    {
      "path": "src/main/resources/wsdl/kyc-status.wsdl",
      "language": "WSDL",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 26,
      "score": 26,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 43
    },
    {
      "path": "docs/api-examples.md",
      "language": "Markdown",
      "navigation_tags": [
        "text_document"
      ],
      "roles": [
        "text_document"
      ],
      "signals": [],
      "navigation_score": 24,
      "score": 24,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 53
    },
    {
      "path": "docs/business-examples.md",
      "language": "Markdown",
      "navigation_tags": [
        "text_document"
      ],
      "roles": [
        "text_document"
      ],
      "signals": [],
      "navigation_score": 24,
      "score": 24,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 22
    },
    {
      "path": "docs/business-flows.md",
      "language": "Markdown",
      "navigation_tags": [
        "text_document"
      ],
      "roles": [
        "text_document"
      ],
      "signals": [],
      "navigation_score": 24,
      "score": 24,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 51
    },
    {
      "path": "src/main/java/com/acme/onboarding/CustomerNotFoundException.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 8
    },
    {
      "path": "src/main/java/com/acme/onboarding/CustomerRepository.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 10
    },
    {
      "path": "src/main/java/com/acme/onboarding/CustomerStatus.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 8
    },
    {
      "path": "src/main/java/com/acme/onboarding/DuplicateCustomerException.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 8
    },
    {
      "path": "src/main/java/com/acme/onboarding/KycClient.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 16
    },
    {
      "path": "src/main/java/com/acme/onboarding/KycRequest.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 6
    },
    {
      "path": "src/main/java/com/acme/onboarding/KycResult.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 4
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingEventPublisher.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 19
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingRequest.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 15
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingResponse.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 8
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingResult.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 4
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingStartedEvent.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 4
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingStatusResponse.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 4
    },
    {
      "path": "src/main/java/com/acme/onboarding/RiskScoringService.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 18
    },
    {
      "path": "src/test/java/com/acme/onboarding/OnboardingServiceTest.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 8
    },
    {
      "path": "pom.xml",
      "language": "XML",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 18,
      "score": 18,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 12
    },
    {
      "path": "src/main/resources/application.yml",
      "language": "YAML",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 18,
      "score": 18,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 8
    },
    {
      "path": "README.md",
      "language": "Markdown",
      "navigation_tags": [
        "text_document"
      ],
      "roles": [
        "text_document"
      ],
      "signals": [],
      "navigation_score": 16,
      "score": 16,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 4
    }
  ],
  "important_docs": [
    {
      "path": "src/main/java/com/acme/onboarding/Customer.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 28,
      "score": 28,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 43
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 28,
      "score": 28,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 32
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 28,
      "score": 28,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 46
    },
    {
      "path": "docs/examples/customer-verification-soap.xml",
      "language": "XML",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 26,
      "score": 26,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 21
    },
    {
      "path": "docs/openapi.yml",
      "language": "YAML",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 26,
      "score": 26,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 78
    },
    {
      "path": "docs/soap-kyc.wsdl",
      "language": "WSDL",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 26,
      "score": 26,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 29
    },
    {
      "path": "src/main/resources/onboarding.wsdl",
      "language": "WSDL",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 26,
      "score": 26,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 38
    },
    {
      "path": "src/main/resources/openapi.yaml",
      "language": "YAML",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 26,
      "score": 26,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 77
    },
    {
      "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
      "language": "YAML",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 26,
      "score": 26,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 103
    },
    {
      "path": "src/main/resources/wsdl/customer-verification.wsdl",
      "language": "WSDL",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 26,
      "score": 26,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 54
    },
    {
      "path": "src/main/resources/wsdl/kyc-status.wsdl",
      "language": "WSDL",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 26,
      "score": 26,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 43
    },
    {
      "path": "docs/api-examples.md",
      "language": "Markdown",
      "navigation_tags": [
        "text_document"
      ],
      "roles": [
        "text_document"
      ],
      "signals": [],
      "navigation_score": 24,
      "score": 24,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 53
    },
    {
      "path": "docs/business-examples.md",
      "language": "Markdown",
      "navigation_tags": [
        "text_document"
      ],
      "roles": [
        "text_document"
      ],
      "signals": [],
      "navigation_score": 24,
      "score": 24,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 22
    },
    {
      "path": "docs/business-flows.md",
      "language": "Markdown",
      "navigation_tags": [
        "text_document"
      ],
      "roles": [
        "text_document"
      ],
      "signals": [],
      "navigation_score": 24,
      "score": 24,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 51
    },
    {
      "path": "src/main/java/com/acme/onboarding/CustomerNotFoundException.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 8
    },
    {
      "path": "src/main/java/com/acme/onboarding/CustomerRepository.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 10
    },
    {
      "path": "src/main/java/com/acme/onboarding/CustomerStatus.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 8
    },
    {
      "path": "src/main/java/com/acme/onboarding/DuplicateCustomerException.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 8
    },
    {
      "path": "src/main/java/com/acme/onboarding/KycClient.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 16
    },
    {
      "path": "src/main/java/com/acme/onboarding/KycRequest.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 6
    },
    {
      "path": "src/main/java/com/acme/onboarding/KycResult.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 4
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingEventPublisher.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 19
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingRequest.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 15
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingResponse.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 8
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingResult.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 4
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingStartedEvent.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 4
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingStatusResponse.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 4
    },
    {
      "path": "src/main/java/com/acme/onboarding/RiskScoringService.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 18
    },
    {
      "path": "src/test/java/com/acme/onboarding/OnboardingServiceTest.java",
      "language": "Java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ],
      "signals": [],
      "navigation_score": 20,
      "score": 20,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 8
    },
    {
      "path": "pom.xml",
      "language": "XML",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 18,
      "score": 18,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 12
    },
    {
      "path": "src/main/resources/application.yml",
      "language": "YAML",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ],
      "signals": [],
      "navigation_score": 18,
      "score": 18,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 8
    },
    {
      "path": "README.md",
      "language": "Markdown",
      "navigation_tags": [
        "text_document"
      ],
      "roles": [
        "text_document"
      ],
      "signals": [],
      "navigation_score": 16,
      "score": 16,
      "score_meaning": "Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.",
      "lines": 4
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
          "evidence?|evidence_refs?"
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
          "items[].confidence?",
          "items[].evidence?|items[].evidence_refs?"
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
          "families[].confidence",
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
          "rows[].confidence",
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
          "items[].confidence?",
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
          "items[].id",
          "items[].question|title",
          "items[].reason|why_it_matters|description",
          "items[].impact",
          "items[].blocking",
          "items[].evidence?|items[].evidence_refs?|items[].evidence_gap?"
        ],
        "guidance": "Use when code evidence cannot support a stronger claim. Mirror any top-level analysis_document.open_questions entries here when unresolved uncertainty should be visible to report readers."
      }
    ]
  },
  "analysis_skill_catalog": {
    "catalog_kind": "llm_analysis_skill_catalog",
    "semantic_authority": "codex_llm",
    "deterministic_authority": "catalog_presence_and_shape_only",
    "purpose": "Reusable Codex LLM analysis capabilities for repository understanding. The CLI exposes and validates the catalog shape; Codex decides which skills matter for a repository and how to apply them.",
    "skills": [
      {
        "id": "analysis_strategy_planning",
        "label": "Analysis Strategy Planning",
        "purpose": "Author the repository-specific analysis plan, source-slice hypotheses, skill application plan and report intent before source tiering, skill workbenches, optional templates or final synthesis are used.",
        "stage_ids": [
          "llm_analysis_strategy"
        ],
        "expected_outputs": [
          "llm/analysis-strategy.json",
          "analysis_strategy.whole_repo_first_plan",
          "analysis_strategy.report_intent"
        ],
        "guidance": "Use inventory only as context. Codex decides how this repository should be understood, which skills matter and where deeper review may be needed."
      },
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
        "id": "tiered_source_file_analysis",
        "label": "Tiered Source File Analysis",
        "purpose": "Create mandatory Tier 1 Codex-authored LLM file cards for every included file, then promote important areas to Tier 2-4 technical drilldown, behavior, risk and transformation analysis.",
        "stage_ids": [
          "llm_source_file_tier_analysis",
          "llm_whole_repository_building_blocks",
          "llm_detail_reviews",
          "llm_final_analysis_document"
        ],
        "expected_outputs": [
          "source_tiers/*.json",
          "source_tier_coverage",
          "analysis_document technical drilldown sections"
        ],
        "guidance": "Do not let deferred files stand in for understanding. Tier 1 is shallow but real per-file analysis; deeper tiers explain relationships, flows, contracts and decisions."
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
        "guidance": "Inventory seed files are only starting points. Codex must find and parse contracts from source evidence and state uncertainty."
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
        "guidance": "Codex chooses detail-review priorities; deterministic inventories only provide navigation context."
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
    "semantic_verdict_authority": "codex_llm",
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
        "id": "tiered_whole_codebase_analysis",
        "label": "Tiered whole-codebase analysis",
        "intent": "Analyze every included file at least at Tier 1 before selecting Tier 2-4 technical drilldown, behavior, risk and refactoring depth."
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
  "source_tier_model": {
    "model_kind": "tiered_whole_codebase_analysis",
    "version": "source-tier-v1",
    "semantic_authority": "codex_llm",
    "deterministic_authority": "task_materialization_and_path_contract_only",
    "llm_execution_model": {
      "executor": "codex_in_session",
      "execution_surface": "current_codex_session",
      "direct_llm_api_allowed": false,
      "api_credentials_required": false,
      "external_service_state_tracked": false,
      "runtime_contract": "codex_authors_required_artifacts_in_session",
      "incomplete_evidence_handling": "codex_authors_uncertainty_open_questions_or_partial_readiness"
    },
    "purpose": "Make whole-codebase understanding explicit. Every included file receives at least a Tier 1 Codex-authored LLM file card before final synthesis; selected areas then receive deeper Tier 2-4 reviews.",
    "tiers": [
      {
        "id": "tier0_inventory",
        "depth": 0,
        "owner": "cli",
        "meaning": "Deterministic inventory only: path, size, language/format and navigation partition. This is never semantic understanding."
      },
      {
        "id": "tier1_file_card",
        "depth": 1,
        "owner": "codex_llm",
        "required_for_every_included_file": true,
        "meaning": "A short Codex-authored LLM per-file understanding card: purpose, technical role, business relevance or none/unknown, relationships visible from the file, confidence and evidence."
      },
      {
        "id": "tier2_module_or_source_family",
        "depth": 2,
        "owner": "codex_llm",
        "meaning": "Module/source-family synthesis built from Tier 1 cards and direct source inspection: responsibilities, internal relationships, technical drilldown and uncertainty."
      },
      {
        "id": "tier3_behavior_contract_flow",
        "depth": 3,
        "owner": "codex_llm",
        "meaning": "Deep behavior review for important flows, interfaces, contracts, state changes, examples, failure paths and side effects."
      },
      {
        "id": "tier4_decision_transformation",
        "depth": 4,
        "owner": "codex_llm",
        "meaning": "Decision-level findings, risks, process improvements, refactoring and target-architecture options."
      }
    ],
    "completion_rule": "Final readiness requires Tier 1 file-card coverage for every included source-inventory file. Deferred files are not completed analysis; they remain gaps until a Tier 1 card exists.",
    "llm_rules": [
      "Codex is the LLM executor for generated workpacks; the CLI must not call a direct LLM API or require API credentials.",
      "The Codex LLM step is not an external service state. Codex is already the active in-session executor, so only artifact/readiness contracts can be incomplete or partial.",
      "Do not summarize files from path names alone.",
      "Open each listed file or use an already-opened exact source excerpt before authoring its Tier 1 card.",
      "Use unknown/none when business relevance cannot be proven.",
      "The Codex-authored Tier 1 step is mandatory for every included file; Codex must write the card and place thin evidence in uncertainty or open questions.",
      "Keep evidence exact with file:line references.",
      "Use Tier 1 to prevent blind spots; use Tier 2-4 to explain interactions and decision implications."
    ]
  },
  "source_tier_task_manifest": {
    "task_count": 1,
    "total_files": 32,
    "manifest_file": ".analysis/source-tier-task-manifest.json",
    "task_dir": ".analysis/source_tier_tasks",
    "output_dir": ".analysis/source_tiers"
  },
  "tool_positioning_reference": {
    "reference_kind": "external_tool_positioning_context",
    "semantic_authority": false,
    "deterministic_authority": "reference_context_only",
    "last_verified_on": "2026-06-09",
    "verification_basis": "Official public vendor or project documentation checked for category framing. The LLM must still decide repository-specific positioning from source evidence.",
    "purpose": "Official public tool-market context for LLM-authored positioning. These references frame comparison categories; they are not repository evidence, do not decide report readiness and must not be used as deterministic replacement/complement verdicts.",
    "llm_positioning_rubric": {
      "semantic_authority": "codex_llm",
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
        "handoff_boundary": "Use Cognianalysis to create source-derived decision documents; use consulting/gen-AI delivery suites for scaled delivery programs, transformation governance and execution capacity.",
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
        "handoff_boundary": "Use Cognianalysis for LLM-authored narrative, business/technical decision framing and evidence-backed drilldown; use structural graph tooling when exhaustive dependency graphs, transaction maps or data lineage need deterministic graph proof.",
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
        "handoff_boundary": "Use Cognianalysis to explain visible source risks in business and architecture context; use static analysis gates for repeatable issue detection, thresholds and CI enforcement.",
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
        "handoff_boundary": "Use Cognianalysis to decide and prioritize modernization options; use automated transformation engines when recommendations can be encoded as repeatable recipes or migration tasks.",
        "report_question": "Which modernization steps are analysis recommendations only, and which could become repeatable automated recipes or migration tasks?"
      }
    ]
  },
  "deterministic_signal_list": [],
  "top_capsules": [
    {
      "path": "src/main/java/com/acme/onboarding/Customer.java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ]
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingController.java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ]
    },
    {
      "path": "src/main/java/com/acme/onboarding/OnboardingService.java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ]
    },
    {
      "path": "docs/examples/customer-verification-soap.xml",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ]
    },
    {
      "path": "docs/openapi.yml",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ]
    },
    {
      "path": "docs/soap-kyc.wsdl",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ]
    },
    {
      "path": "src/main/resources/onboarding.wsdl",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ]
    },
    {
      "path": "src/main/resources/openapi.yaml",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ]
    },
    {
      "path": "src/main/resources/openapi/customer-onboarding.openapi.yaml",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ]
    },
    {
      "path": "src/main/resources/wsdl/customer-verification.wsdl",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ]
    },
    {
      "path": "src/main/resources/wsdl/kyc-status.wsdl",
      "navigation_tags": [
        "structured_file"
      ],
      "roles": [
        "structured_file"
      ]
    },
    {
      "path": "docs/api-examples.md",
      "navigation_tags": [
        "text_document"
      ],
      "roles": [
        "text_document"
      ]
    },
    {
      "path": "docs/business-examples.md",
      "navigation_tags": [
        "text_document"
      ],
      "roles": [
        "text_document"
      ]
    },
    {
      "path": "docs/business-flows.md",
      "navigation_tags": [
        "text_document"
      ],
      "roles": [
        "text_document"
      ]
    },
    {
      "path": "src/main/java/com/acme/onboarding/CustomerNotFoundException.java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ]
    },
    {
      "path": "src/main/java/com/acme/onboarding/CustomerRepository.java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ]
    },
    {
      "path": "src/main/java/com/acme/onboarding/CustomerStatus.java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ]
    },
    {
      "path": "src/main/java/com/acme/onboarding/DuplicateCustomerException.java",
      "navigation_tags": [
        "source_file"
      ],
      "roles": [
        "source_file"
      ]
    }
  ],
  "glossary": []
}
```

## Expected JSON

	This is the first semantic planning task. Do not analyze only the top capsules and do not lock the report into the generated task order. Use the source inventory, navigation partitions, component library, skill catalog and original goal contract to author a repository-specific analysis strategy that later tasks must follow.

	The strategy should answer: how should this repository be understood, which source slices look meaningful, which skill workbenches should be materialized from `skill_application_plan[]`, how will every file receive Tier 1 coverage, what deeper reviews may be necessary, and what kind of final report structure would be useful for humans.

The deterministic CLI will only check that this Codex-authored LLM strategy exists and is structured. It will not judge whether the chosen strategy is semantically correct; that remains Codex's responsibility and must be revisited in report_quality_review.

{
  "analysis_strategy": {
    "planning_stage": "pre_source_tier_pre_overview",
    "planning_source": "llm/analysis-strategy.json",
    "summary": "Repository-specific analysis approach in human language.",
    "whole_repo_first_plan": "How the full source inventory will be understood before deep dives.",
    "tier_plan": {
      "tier1": "How every included file will receive a shallow file card.",
      "tier2": "How module/source-family synthesis will be formed from Tier 1 plus source evidence.",
      "tier3": "Which behavior, interface, flow or contract areas likely need deep review.",
      "tier4": "Which decision, risk, process or refactoring questions the final report must answer."
    },
    "candidate_source_slices": [
      {"name":"Repository-specific slice name", "slice_kind":"Repository-specific slice kind in free text.", "why_it_matters":"...", "initial_evidence":[]}
    ],
	    "skill_application_plan": [
	      {"id":"stable-skill-workbench-id", "skill_id":"skill id from analysis_skill_catalog or custom", "purpose":"Why this skill matters here.", "scope":"Repository-specific scope.", "focus":["What this workbench must extract"], "evidence":[]}
	    ],
    "report_intent": {
      "audience": ["management", "architecture", "engineering"],
      "likely_sections": ["Repository-specific section idea, not a fixed menu"],
      "management_questions": ["Decision question the report should answer"],
      "technical_drilldown_questions": ["Deep technical question the report should answer"]
    },
    "known_risks_to_understanding": [
      {"risk":"...", "mitigation":"...", "evidence":[]}
    ],
    "open_questions": [
      {"question":"...", "why_it_matters":"...", "owner":"Repository-specific owner or unknown.", "evidence":[]}
    ],
    "evidence": []
  },
  "analysis_coverage": {
    "summary": "Which inventory, task/context artifacts and source files were inspected to create the strategy.",
    "inspected_files": [
      {"path":"relative/path/File.ext", "reason":"...", "evidence":[{"path":"relative/path/File.ext", "line":1}]}
    ],
    "deferred_files": [],
    "open_questions": []
  }
}

	## Required Source Inventory Accounting

For this task, list the files you inspected for this extraction area. Use deferred files only for this task-local extraction scope; deferral does not satisfy whole-codebase completion.

Whole-codebase completion is checked through `.analysis/source_tiers/*.json` Tier 1 file-card coverage. Do not use `deferred_files` as a substitute for file analysis.

Include this top-level object in the JSON:

```json
{
  "analysis_coverage": {
    "summary": "How much of the included source inventory this task covered.",
    "inspected_files": [
      {"path": "relative/path/File.ext", "reason": "Why this file was inspected for semantic extraction.", "evidence": [{"path": "relative/path/File.ext", "line": 1}]}
    ],
    "deferred_files": [
      {"path": "relative/path/File.ext", "reason": "Repository-specific task-local reason; deferral never counts as completed Tier 1 analysis.", "evidence": [{"path": "relative/path/File.ext", "line": 1}]}
    ],
    "open_questions": []
  }
}
```
	
# Cognianalysis · LLM-first Instructions

This repository must be analyzed semantically by Codex/LLM. The generated code map is a navigation aid, not the source of final truth.

## Non-negotiable rules

- Treat `code-map.json`, `source-capsules.json`, `navigation-artifact-candidates.json` and the legacy `important-docs.json` as inventory/discovery aids.
	- Do **not** treat navigation hints as business facts, technical claims, interfaces, flows or entrypoints.
	- The deterministic map is intentionally inventory-only: it does not parse imports, symbols, framework names, contracts, examples, tests, entrypoints or relationships. The LLM must open source files and parse/understand those semantics itself.
	- Start with `.analysis/llm_tasks/00-analysis-strategy.md`. The LLM-authored `.analysis/llm/analysis-strategy.json` is the repository-specific analysis plan; the remaining task files are capability workbenches and renderer contracts, not a fixed semantic information architecture.
	- Treat `source-family-inventory.json` as a legacy workflow filename for mechanical navigation partitions. The legacy filename does not mean the CLI has authored semantic source families; the LLM must decide whether to rename, merge, split, reject or defer partitions as repository-specific source families.
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
- Semantic completeness, documentation quality and management readiness are LLM judgments. Deterministic checks may require the LLM-authored judgment to exist and be structured, but must not replace it with keyword, menu or block-presence scoring.
- Keep production code read-only unless explicitly asked otherwise.
- Use English for generated JSON text and report-facing content, while preserving original domain terms and identifiers.
- Always produce whole-repository documentation before any module or source-family deep dive.
- Execute every `.analysis/source_tier_tasks/*.md` task before the final analysis document. These tasks create Tier 1 LLM-authored file cards for every included file. A file that is only listed in `analysis_coverage.deferred_files` is not analyzed and must not count as done.
- Use the tier model explicitly: Tier 0 is CLI inventory only, Tier 1 is mandatory per-file LLM understanding, Tier 2 is module/source-family synthesis, Tier 3 is behavior/contract/flow deep dive, and Tier 4 is decision/refactoring/process analysis.
- For monorepos or multi-module repositories, summarize the complete source-family landscape: purpose, responsibility, entry points, exits/integrations, tests/examples, confidence and open questions for each relevant family.
	- Create the LLM detail-agent plan only after the LLM-authored analysis strategy and whole-repository extraction tasks have produced a repository-wide picture.
- Author final summaries, E2E understanding, management statements and the visible report only after all planned detail-agent reviews exist and have been synthesized. Earlier tasks may extract building blocks, but must not pretend to be the final report.
- Do not make one module the narrative center unless the source inventory proves the repository is actually single-module. A focused deep review must be labelled as a deep slice and must not replace the whole-repository view.
- If E2E flow extraction is deep only for part of the repository, state that boundary explicitly and keep the remaining source families visible as surface-reviewed or follow-up drilldown areas.
	- The final report should be authored by the LLM as a repo-specific analysis document. The renderer provides a stable component library and validation; it must not dictate a fixed one-size-fits-all information architecture.
- Tool positioning must be concrete and LLM-authored. Use the official reference facts below as market context, not as repo evidence and not as a deterministic verdict. Then state what this analysis replaces, complements or cannot safely decide for this repository, with source evidence and handoff boundaries.

## Tool-positioning reference categories

These categories are external market context for comparison, not repository evidence. They are also written to `.analysis/data/tool-positioning-references.json`. Use them only to frame positioning; use source evidence for claims about this repository. Preserve the distinction between official reference facts, repository evidence and LLM-authored judgment.

```json
{
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
}
```

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
    "id": "llm-authored-analysis-strategy",
    "title": "LLM-authored analysis strategy",
    "expected_outputs": [
      "llm_analysis_strategy.uses_pre_analysis_strategy_artifact=true",
      "llm_analysis_strategy.strategy_present=true"
    ]
  },
  {
    "id": "non-authoritative-code-map",
    "title": "Non-authoritative inventory map",
    "expected_outputs": [
      "extraction_policy.deterministic_parsing_disabled=true"
    ]
  },
  {
    "id": "whole-codebase-source-inventory-accounting",
    "title": "Whole-codebase source inventory accounting",
    "expected_outputs": [
      "source_inventory_accounting.complete=true",
      "analysis_coverage.inspected_files[]"
    ]
  },
  {
    "id": "tiered-whole-codebase-analysis",
    "title": "Tiered whole-codebase analysis",
    "expected_outputs": [
      "source_tier_coverage.complete=true",
      "source_file_tier_reviews[]"
    ]
  },
  {
    "id": "whole-repository-documentation",
    "title": "Whole-repository documentation",
    "expected_outputs": [
      "assessment.repository_wide_view",
      "source_inventory_accounting.complete=true"
    ]
  },
  {
    "id": "llm-authored-analysis-document",
    "title": "LLM-authored analysis document",
    "expected_outputs": [
      "analysis_document_prerequisite_coverage.complete=true",
      "analysis_document_quality_review.complete=true",
      "report_mode.llm_authored=true",
      "report_mode.final_after_detail_reviews=true",
      "report_mode.final_synthesis_ready=true",
      "analysis_document.sections[]",
      "analysis_document_component_coverage.complete=true"
    ]
  },
  {
    "id": "management-ready-report-quality-review",
    "title": "Management-ready report quality review",
    "expected_outputs": [
      "analysis_document_quality_review.complete=true",
      "report_mode.report_quality_review_decision_ready=true"
    ]
  },
  {
    "id": "four-level-analysis-model",
    "title": "Four-level analysis model",
    "expected_outputs": [
      "analysis_document_requirements_trace_contract.complete=true",
      "analysis_document_quality_review.complete=true",
      "report_mode.report_quality_review_decision_ready=true"
    ]
  },
  {
    "id": "original-requirements-trace",
    "title": "Original requirements trace",
    "expected_outputs": [
      "analysis_document_requirements_trace_contract.complete=true",
      "analysis_goal_trace_alignment.complete=true"
    ]
  },
  {
    "id": "source-family-detail-agent-plan",
    "title": "Source-family detail agent plan",
    "expected_outputs": [
      "llm_detail_agent_plan.uses_pre_final_plan_artifact=true",
      "llm_detail_agent_plan.planning_decision_present=true"
    ]
  },
  {
    "id": "source-family-detail-task-files",
    "title": "Source-family detail task files",
    "expected_outputs": [
      "detail_task_manifest.tasks[]"
    ]
  },
  {
    "id": "source-family-detail-review-ingestion",
    "title": "Source-family detail review ingestion",
    "expected_outputs": [
      "source_family_detail_reviews[]"
    ]
  },
  {
    "id": "source-family-detail-review-coverage",
    "title": "Source-family detail review coverage",
    "expected_outputs": [
      "source_family_detail_review_coverage.uses_pre_final_plan_artifact=true",
      "source_family_detail_review_coverage.complete=true"
    ]
  },
  {
    "id": "detail-review-report-synthesis",
    "title": "Detail-review report synthesis",
    "expected_outputs": [
      "analysis_document_prerequisite_coverage.complete=true",
      "analysis_document_detail_review_synthesis.complete=true",
      "report_mode.final_after_detail_reviews=true",
      "report_mode.final_synthesis_ready=true"
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

## Original analysis goal contract

This preserves the original product objective for the LLM. It is context, not a deterministic checklist or readiness verdict. Final semantic status must be authored through `analysis_document.requirements_trace` and `analysis_document.report_quality_review`.

```json
{
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
}
```

## Tiered whole-codebase analysis model

This model prevents blind spots. Source inventory alone is Tier 0 and has no semantic authority. Every included file needs a Tier 1 LLM-authored file card in `.analysis/source_tiers/*.json`; selected areas are then promoted to Tier 2-4 for technical drilldown, flows, risks and decisions.

```json
{
  "model": {
    "model_kind": "tiered_whole_codebase_analysis",
    "version": "source-tier-v1",
    "semantic_authority": "llm",
    "deterministic_authority": "task_materialization_and_path_contract_only",
    "purpose": "Make whole-codebase understanding explicit. Every included file receives at least a Tier 1 LLM-authored file card before final synthesis; selected areas then receive deeper Tier 2-4 reviews.",
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
        "owner": "llm",
        "required_for_every_included_file": true,
        "meaning": "A short LLM-authored per-file understanding card: purpose, technical role, business relevance or none/unknown, relationships visible from the file, confidence and evidence."
      },
      {
        "id": "tier2_module_or_source_family",
        "depth": 2,
        "owner": "llm",
        "meaning": "Module/source-family synthesis built from Tier 1 cards and direct source inspection: responsibilities, internal relationships, technical drilldown and uncertainty."
      },
      {
        "id": "tier3_behavior_contract_flow",
        "depth": 3,
        "owner": "llm",
        "meaning": "Deep behavior review for important flows, interfaces, contracts, state changes, examples, failure paths and side effects."
      },
      {
        "id": "tier4_decision_transformation",
        "depth": 4,
        "owner": "llm",
        "meaning": "Decision-level findings, risks, process improvements, refactoring and target-architecture options."
      }
    ],
    "completion_rule": "Final readiness requires Tier 1 file-card coverage for every included source-inventory file. Deferred files are not completed analysis; they remain gaps until a Tier 1 card exists.",
    "llm_rules": [
      "Do not summarize files from path names alone.",
      "Open each listed file or use an already-opened exact source excerpt before authoring its Tier 1 card.",
      "Use unknown/none when business relevance cannot be proven.",
      "Keep evidence exact with file:line references.",
      "Use Tier 1 to prevent blind spots; use Tier 2-4 to explain interactions and decision implications."
    ]
  },
  "task_count": 1,
  "total_files": 32,
  "source_tier_task_manifest": ".analysis/source-tier-task-manifest.json",
  "source_tier_tasks": ".analysis/source_tier_tasks/*.md",
  "source_tier_outputs": ".analysis/source_tiers/*.json"
}
```

## LLM analysis skill catalog

Use these as reusable analysis capabilities, not as deterministic routing rules. The LLM decides which skills matter for this repository and how deeply to apply them.

```json
{
  "catalog_kind": "llm_analysis_skill_catalog",
  "semantic_authority": "llm",
  "deterministic_authority": "catalog_presence_and_shape_only",
  "purpose": "Reusable LLM analysis capabilities for repository understanding. The CLI exposes and validates the catalog shape; the LLM decides which skills matter for a repository and how to apply them.",
  "skills": [
    {
      "id": "analysis_strategy_planning",
      "label": "Analysis Strategy Planning",
      "purpose": "Author the repository-specific analysis plan, source-slice hypotheses, skill application plan and report intent before fixed workbench tasks are used.",
      "stage_ids": [
        "llm_analysis_strategy"
      ],
      "expected_outputs": [
        "llm/analysis-strategy.json",
        "analysis_strategy.whole_repo_first_plan",
        "analysis_strategy.report_intent"
      ],
      "guidance": "Use inventory only as context. The LLM decides how this repository should be understood, which skills matter and where deeper review may be needed."
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
      "purpose": "Create mandatory Tier 1 LLM-authored file cards for every included file, then promote important areas to Tier 2-4 technical drilldown, behavior, risk and transformation analysis.",
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
      "guidance": "Inventory seed files are only starting points. The LLM must find and parse contracts from source evidence and state uncertainty."
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
}
```

## Repo snapshot

```json
{
  "repo_name": "demo-repo",
  "root": "/Users/michaelhubeny/homespace/cognianalysis/examples/demo-repo",
  "analyzed_at": "2026-06-10T12:14:00Z",
  "commit": "f975972ef58cd244659331e3613f0df369cc2314",
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
  "skipped_files": 0
}
```

## Top modules

```json
[
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
]
```

## Navigation artifact candidates, not final facts

```json
[
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
]
```

## Deterministic signal list

This should be empty for inventory-only preparation. If it is non-empty, treat entries as non-authoritative debug data and re-derive meaning from source.

```json
[]
```

## Report component library

Use this renderer/styling contract for `analysis_document.sections[].blocks[]`. The component library is not a semantic-quality checklist.

```json
{
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
}
```

## Top glossary terms

Domain terms must be extracted by Codex/LLM from source evidence, not from generated word lists.

## Context capsules

The full included file inventory is in `.analysis/data/source-inventory.json`. The source excerpts are in `.analysis/source-capsules.json`. Use capsules to decide what to open next, but inspect full source files whenever evidence is needed. Do not treat capsule coverage as whole-codebase coverage.

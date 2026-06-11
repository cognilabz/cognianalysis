"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisGoalContractArtifact = analysisGoalContractArtifact;
function analysisGoalContractArtifact() {
    return {
        contract_kind: 'analysis_goal_context',
        deterministic_authority: 'goal_context_only',
        semantic_verdict_authority: 'codex_llm',
        semantic_status_source: [
            'analysis_document.requirements_trace',
            'analysis_document.report_quality_review'
        ],
        purpose: 'Preserve the original product objective as reusable LLM context. This artifact is not a deterministic checklist and does not decide whether a repository report is complete, well documented or management-ready.',
        objective: 'Automated source-code analysis that produces a structured decision basis as an analysis document. The whole report should be authored by an LLM through a stable component/style library, start whole-repository first, then use focused detail agents where useful, and preserve the original requirements.',
        required_output_shape: {
            deliverable: 'structured_decision_basis_analysis_document',
            visible_report_authority: 'analysis_document.sections authored by LLM',
            style_system: 'stable report component library',
            source_basis: 'source code, tests, docs, contracts, examples and configuration',
            automation_goal: 'as automated as possible from source code',
            management_drilldown: 'textual business-need/business-use narrative for management with drilldown to technical and deep technical evidence'
        },
        required_levels: [
            {
                id: 'reverse_engineering_documentation',
                label: 'Reverse Engineering & Documentation',
                intent: 'Derive functionality, business capabilities and user/system flows from source evidence.'
            },
            {
                id: 'code_analysis',
                label: 'Code Analysis',
                intent: 'Identify visible bugs, vulnerabilities, maintainability risks, code quality issues and testability concerns.'
            },
            {
                id: 'process_analysis',
                label: 'Process Analysis',
                intent: 'Derive improvement and optimization potential for delivery, operations, readiness and process quality.'
            },
            {
                id: 'refactoring_target_architecture',
                label: 'Refactoring / Target Architecture',
                intent: 'Describe modernization, refactoring and target architecture or new technology stack options where evidence justifies them.'
            }
        ],
        required_views: [
            {
                id: 'functional_view',
                label: 'Functional View',
                intent: 'Explain what the system does from a business/user/system perspective.'
            },
            {
                id: 'technical_view',
                label: 'Technical View',
                intent: 'Explain APIs, interfaces, contracts, architecture, data stores and integrations.'
            }
        ],
        required_report_behaviors: [
            {
                id: 'whole_repo_first',
                label: 'Whole repository first',
                intent: 'Build a repository-wide overview and relationship map before deep slices.'
            },
            {
                id: 'tiered_whole_codebase_analysis',
                label: 'Tiered whole-codebase analysis',
                intent: 'Analyze every included file at least at Tier 1 before selecting Tier 2-4 technical drilldown, behavior, risk and refactoring depth.'
            },
            {
                id: 'e2e_relationships',
                label: 'E2E relationships',
                intent: 'Explain how functions, code blocks, modules and systems collaborate through representative flows.'
            },
            {
                id: 'llm_authored_report',
                label: 'LLM-authored report',
                intent: 'Let the LLM decide the repository-specific report structure while the renderer supplies styling and components.'
            },
            {
                id: 'detail_agents_after_overview',
                label: 'Detail agents after overview',
                intent: 'Plan and execute focused source-family/detail reviews only after whole-repository building blocks exist.'
            },
            {
                id: 'tool_positioning',
                label: 'Tool positioning',
                intent: 'Position the analysis as an alternative or complement to consulting/gen-AI suites, architecture mapping, static quality/security gates and automated transformation engines.'
            },
            {
                id: 'evidence_and_uncertainty',
                label: 'Evidence and uncertainty',
                intent: 'Keep claims evidence-backed and show open questions where behavior cannot be proven from source.'
            }
        ],
        llm_trace_guidance: 'The final LLM-authored requirements_trace may use repository-specific wording and additional rows, but it should add goal_contract_refs using required_output_shape.<key>, required_levels.<id>, required_views.<id> and required_report_behaviors.<id> so the LLM explicitly accounts for output shape, management/business readability, levels, views and behaviors with covered|partial|open statuses, evidence and open questions.'
    };
}

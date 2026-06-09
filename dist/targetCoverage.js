"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TARGET_CAPABILITIES = void 0;
exports.computeTargetCoverage = computeTargetCoverage;
const utils_1 = require("./utils");
exports.TARGET_CAPABILITIES = [
    {
        id: 'existing-harness-execution',
        title: 'Existing harness execution',
        description: 'The pack is launched from Codex or another harness through skills/CLI, not by a custom coding agent.',
        addressed_by: ['resources/AGENTS.md', '.agents/skills/codebase-assessment/SKILL.md', 'CLI commands', 'optional cba mcp'],
        expected_outputs: ['.analysis/llm_tasks/*.md', '.analysis/llm/*.json'],
        output_keys: ['tasks']
    },
    {
        id: 'llm-first-semantic-extraction',
        title: 'LLM-first semantic extraction',
        description: 'Codex extracts meaning. The CLI prepares context and validates evidence only.',
        addressed_by: ['Main skill workflow', 'llm_instructions.md', 'source-capsules.json'],
        expected_outputs: ['assessment', 'capabilities', 'interfaces', 'flows'],
        output_keys: ['assessment', 'capabilities', 'interfaces', 'flows']
    },
    {
        id: 'non-authoritative-code-map',
        title: 'Non-authoritative code map signals',
        description: 'Broad signals help navigation but are never final entrypoint facts.',
        addressed_by: ['code-map.json extraction_policy', 'Main skill non-goals', 'Generated task warnings'],
        expected_outputs: ['code_map.extraction_policy.signals_are_authoritative=false'],
        output_keys: ['signals']
    },
    {
        id: 'whole-codebase-source-coverage',
        title: 'Whole-codebase source coverage',
        description: 'Every included repository file is either evidence-backed, explicitly inspected by Codex/LLM, or explicitly deferred with a reason.',
        addressed_by: ['source-inventory.json', 'analysis_coverage in LLM outputs', 'cba finalize source coverage gate', 'Source Coverage report section'],
        expected_outputs: ['source_coverage.complete=true', 'analysis_coverage.inspected_files[]'],
        output_keys: ['source_coverage.complete', 'analysis_coverage']
    },
    {
        id: 'business-capabilities',
        title: 'Business capabilities',
        description: 'Business capabilities, actors, domain terms and use cases.',
        addressed_by: ['02-business-capabilities-logic.md', 'Capabilities report section'],
        expected_outputs: ['capabilities[]'],
        output_keys: ['capabilities']
    },
    {
        id: 'functional-view',
        title: 'Functional view',
        description: 'Decision-ready functional view of what the system does, including capabilities, actors, use cases and user/system flows.',
        addressed_by: ['01-core-assessment.md', '02-business-capabilities-logic.md', '06-flows-mermaid.md', 'Functional report section'],
        expected_outputs: ['assessment.functional_view'],
        output_keys: ['assessment.functional_view']
    },
    {
        id: 'business-logic',
        title: 'Business logic',
        description: 'Validations, decisions, calculations, status transitions, authorization behavior and examples.',
        addressed_by: ['02-business-capabilities-logic.md', 'Business logic report section'],
        expected_outputs: ['business_logic[]', 'capabilities[].business_logic[]'],
        output_keys: ['business_logic', 'capabilities']
    },
    {
        id: 'interfaces-contracts',
        title: 'Interfaces and contracts',
        description: 'HTTP/REST, GraphQL, events, jobs, CLI commands, UI routes, SOAP, OpenAPI, database touchpoints and external calls.',
        addressed_by: ['03-interface-contract-extraction.md', '05-openapi-soap-graphql.md', 'Interfaces report section'],
        expected_outputs: ['interfaces[]'],
        output_keys: ['interfaces']
    },
    {
        id: 'request-response-examples',
        title: 'Request/response examples',
        description: 'Req/res examples from docs/tests/contracts or inferred examples clearly marked as inferred.',
        addressed_by: ['04-request-response-examples.md', 'Examples report section'],
        expected_outputs: ['documentation.request_response_examples[]', 'interfaces[].examples[]'],
        output_keys: ['documentation.request_response_examples', 'interfaces']
    },
    {
        id: 'openapi-swagger',
        title: 'OpenAPI / Swagger extraction',
        description: 'OpenAPI/Swagger operations, schemas and examples where present.',
        addressed_by: ['05-openapi-soap-graphql.md', 'Contracts report section'],
        expected_outputs: ['documentation.openapi[]', 'interfaces[].openapi'],
        output_keys: ['documentation.openapi', 'interfaces']
    },
    {
        id: 'soap-wsdl-xsd',
        title: 'SOAP / WSDL / XSD extraction',
        description: 'SOAP/WSDL/XSD operations, messages, faults, SOAP actions and envelope examples where present.',
        addressed_by: ['05-openapi-soap-graphql.md', 'Contracts report section'],
        expected_outputs: ['documentation.soap[]', 'interfaces[].soap'],
        output_keys: ['documentation.soap', 'interfaces']
    },
    {
        id: 'technical-view',
        title: 'Technical view',
        description: 'Decision-ready technical view covering APIs, interfaces, contracts, architecture, data stores and integrations.',
        addressed_by: ['01-core-assessment.md', '03-interface-contract-extraction.md', '07-domain-data-integrations.md', '09-architecture-refactoring-roadmap.md', 'Technical report section'],
        expected_outputs: ['assessment.technical_view'],
        output_keys: ['assessment.technical_view']
    },
    {
        id: 'mermaid-flows',
        title: 'Flows with Mermaid',
        description: 'Happy paths, failure paths, state changes, side effects and external calls represented with Mermaid source.',
        addressed_by: ['06-flows-mermaid.md', 'Flows report section'],
        expected_outputs: ['flows[].mermaid', 'documentation.mermaid_flows[]'],
        output_keys: ['flows', 'documentation.mermaid_flows']
    },
    {
        id: 'domain-data-integrations',
        title: 'Domain, data and integrations',
        description: 'Domain entities, data stores, state models, integrations and side effects.',
        addressed_by: ['07-domain-data-integrations.md', 'Domain/Data/Integrations report section'],
        expected_outputs: ['domain_model', 'data_model', 'integrations[]', 'side_effects[]'],
        output_keys: ['domain_model', 'data_model', 'integrations', 'side_effects']
    },
    {
        id: 'architecture-assessment',
        title: 'Architecture assessment',
        description: 'Modules, responsibilities, dependencies, external systems, runtime hints and architecture observations.',
        addressed_by: ['09-architecture-refactoring-roadmap.md', 'Architecture report section'],
        expected_outputs: ['architecture'],
        output_keys: ['architecture']
    },
    {
        id: 'process-readiness',
        title: 'Process and readiness assessment',
        description: 'Tests, CI/CD, release, observability, configuration, local setup and operational readiness.',
        addressed_by: ['08-process-quality-readiness.md', 'Process report section'],
        expected_outputs: ['process', 'quality'],
        output_keys: ['process', 'quality']
    },
    {
        id: 'quality-risks-findings',
        title: 'Bugs, vulnerabilities and quality findings',
        description: 'Visible bugs, weaknesses, security risks, maintainability, documentation, testability and operability findings.',
        addressed_by: ['08-process-quality-readiness.md', '09-architecture-refactoring-roadmap.md', 'Findings report section'],
        expected_outputs: ['findings[]', 'quality.risks[]', 'quality.security[]'],
        output_keys: ['findings', 'quality']
    },
    {
        id: 'structured-decision-basis',
        title: 'Structured decision basis',
        description: 'Structured analysis document that supports decisions with verdicts, trade-offs, risks, recommendations and evidence.',
        addressed_by: ['01-core-assessment.md', '10-report-completeness-review.md', 'Decision Basis report section'],
        expected_outputs: ['assessment.decision_basis'],
        output_keys: ['assessment.decision_basis']
    },
    {
        id: 'refactoring-modernization',
        title: 'Refactoring and modernization roadmap',
        description: 'Practical roadmap with benefit, risk, effort, candidate files and evidence.',
        addressed_by: ['09-architecture-refactoring-roadmap.md', 'Refactoring report section'],
        expected_outputs: ['refactoring[]', 'modernization[]'],
        output_keys: ['refactoring', 'modernization']
    },
    {
        id: 'target-architecture-tech-stack',
        title: 'Target architecture / new tech stack',
        description: 'Refactoring and modernization route toward a target architecture or new technology stack where justified by evidence.',
        addressed_by: ['09-architecture-refactoring-roadmap.md', 'Refactoring report section'],
        expected_outputs: ['architecture.target_architecture', 'modernization[].target_state'],
        output_keys: ['architecture.target_architecture', 'modernization']
    },
    {
        id: 'tool-alternative-positioning',
        title: 'Tool alternative positioning',
        description: 'Evidence-based positioning as an alternative or complement to existing analysis tools, including automation boundaries.',
        addressed_by: ['01-core-assessment.md', '10-report-completeness-review.md', 'Decision Basis report section'],
        expected_outputs: ['assessment.tool_positioning'],
        output_keys: ['assessment.tool_positioning']
    },
    {
        id: 'evidence-governance',
        title: 'Evidence-first governance',
        description: 'Every claim should carry file:line evidence; invalid references are detected.',
        addressed_by: ['Main skill evidence rules', 'validate command', 'Evidence report section'],
        expected_outputs: ['evidence_index[]'],
        output_keys: ['evidence_index']
    },
    {
        id: 'interactive-html-report',
        title: 'Interactive static HTML report',
        description: 'Static HTML with embedded data, navigation, search and evidence drawers.',
        addressed_by: ['render command', 'report/index.html'],
        expected_outputs: ['.analysis/report/index.html', '.analysis/report/analysis-data.json'],
        output_keys: ['report']
    },
    {
        id: 'portfolio-mode',
        title: 'Portfolio mode',
        description: 'Prepare and render analysis workspaces for many local repositories.',
        addressed_by: ['portfolio command', 'portfolio index'],
        expected_outputs: ['portfolio-analysis/index.html'],
        output_keys: ['portfolio']
    },
    {
        id: 'harness-portability',
        title: 'Harness portability',
        description: 'Skills plus CLI are portable; optional stdio bridge exposes deterministic commands.',
        addressed_by: ['AGENTS.md', 'skills', 'cba mcp'],
        expected_outputs: ['skills', 'CLI tools'],
        output_keys: ['tasks']
    }
];
function getByPath(root, key) {
    const parts = key.split('.');
    let cur = root;
    for (const part of parts) {
        if (cur === undefined || cur === null)
            return undefined;
        if (Array.isArray(cur)) {
            cur = cur.flatMap(x => x && typeof x === 'object' ? (0, utils_1.asList)(x[part]) : []);
        }
        else {
            cur = cur[part];
        }
    }
    return cur;
}
function hasContent(value) {
    if (value === undefined || value === null)
        return false;
    if (Array.isArray(value))
        return value.length > 0 && value.some(hasContent);
    if (typeof value === 'object')
        return Object.keys(value).length > 0 && Object.values(value).some(hasContent);
    if (typeof value === 'string')
        return value.trim().length > 0;
    return true;
}
function computeTargetCoverage(bundle) {
    return exports.TARGET_CAPABILITIES.map(cap => {
        let hits = 0;
        const details = [];
        for (const key of cap.output_keys) {
            let present = false;
            if (key === 'report')
                present = true;
            else if (key === 'portfolio')
                present = true;
            else if (key === 'tasks')
                present = Array.isArray(bundle.tasks) && bundle.tasks.length > 0;
            else if (key === 'signals')
                present = !!(bundle.profile || bundle.signals || bundle.extraction_policy);
            else if (key === 'source_coverage.complete')
                present = bundle.source_coverage?.complete === true;
            else
                present = hasContent(getByPath(bundle, key));
            if (present)
                hits++;
            details.push({ key, present });
        }
        const ratio = cap.output_keys.length ? hits / cap.output_keys.length : 1;
        const output_status = ratio >= 0.999 ? 'present' : ratio > 0 ? 'partial' : (bundle.status?.state === 'awaiting_llm_extraction' ? 'pending' : 'missing');
        return {
            ...cap,
            design_status: 'covered',
            output_status,
            output_ratio: ratio,
            output_details: details
        };
    });
}

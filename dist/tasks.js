"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeLlmTasks = writeLlmTasks;
const utils_1 = require("./utils");
const targetCoverage_1 = require("./targetCoverage");
const utils_2 = require("./utils");
const TASKS = [
    ['01-core-assessment.md', 'core-assessment.json', 'Core Assessment and Decision Summary'],
    ['02-business-capabilities-logic.md', 'business-capabilities-logic.json', 'Business Capabilities and Business Logic'],
    ['03-interface-contract-extraction.md', 'interfaces-contracts.json', 'Interface and Contract Extraction'],
    ['04-request-response-examples.md', 'request-response-examples.json', 'Request and Response Examples'],
    ['05-openapi-soap-graphql.md', 'openapi-soap-graphql.json', 'OpenAPI, Swagger, SOAP, WSDL, XSD and GraphQL'],
    ['06-flows-mermaid.md', 'flows-mermaid.json', 'Flows, Scenarios and Mermaid Diagrams'],
    ['07-domain-data-integrations.md', 'domain-data-integrations.json', 'Domain, Data, Integrations and Side Effects'],
    ['08-process-quality-readiness.md', 'process-quality-readiness.json', 'Process, Quality and Readiness Assessment'],
    ['09-architecture-refactoring-roadmap.md', 'architecture-refactoring-roadmap.json', 'Architecture, Refactoring and Modernization Roadmap'],
    ['10-report-completeness-review.md', 'report-completeness-review.json', 'Report Completeness and Gap Review']
];
function writeLlmTasks(analysisDir, codeMap) {
    const tasksDir = utils_2.Path.join(analysisDir, 'llm_tasks');
    const llmDir = utils_2.Path.join(analysisDir, 'llm');
    (0, utils_1.ensureDir)(tasksDir);
    (0, utils_1.ensureDir)(llmDir);
    const profile = codeMap.profile || {};
    const modules = (codeMap.modules || []).slice(0, 24);
    const signals = (codeMap.signals || []).slice(0, 200);
    const capsules = (codeMap.capsules || []).slice(0, 40);
    const glossary = (codeMap.glossary_terms || []).slice(0, 120);
    const importantDocs = (codeMap.important_docs || []).slice(0, 150);
    (0, utils_1.writeText)(utils_2.Path.join(analysisDir, 'llm_instructions.md'), overview(profile, modules, signals, glossary, capsules, importantDocs));
    const taskDefs = [];
    for (const [filename, output, title] of TASKS) {
        const body = taskBody(title, output, profile, modules, signals, capsules, glossary, importantDocs);
        (0, utils_1.writeText)(utils_2.Path.join(tasksDir, filename), body);
        taskDefs.push({ title, task_file: `llm_tasks/${filename}`, expected_output: `llm/${output}`, status: 'pending' });
    }
    (0, utils_1.writeJson)(utils_2.Path.join(analysisDir, 'task-manifest.json'), { mode: 'llm_first', implementation_language: 'TypeScript', tasks: taskDefs });
    return taskDefs;
}
function overview(profile, modules, signals, glossary, capsules, importantDocs) {
    return `# Codebase Analysis Pack · LLM-first Instructions

This repository must be analyzed semantically by Codex/LLM. The generated code map is a navigation aid, not the source of final truth.

## Non-negotiable rules

- Treat \`code-map.json\`, \`source-capsules.json\` and \`important-docs.json\` as discovery aids.
- Do **not** treat \`signals\` as final entrypoints. Signals are broad hints only.
- Use source files, tests, DTO/schema files, OpenAPI/Swagger, SOAP/WSDL/XSD, GraphQL schemas, event schemas, examples, CI/CD files, configuration and documentation as evidence.
- Every relevant assertion must include \`evidence: [{"path":"...", "line": 123, "symbol":"optional"}]\`.
- Extract requests, responses, contracts, examples, business logic, functions, flows, domain models, data effects, integrations, process readiness, architecture and refactoring options.
- If OpenAPI/Swagger, SOAP/WSDL/XSD, Postman, \`.http\`, docs or tests contain request/response examples, extract them.
- If no explicit example exists, create an inferred example only when \`example_origin\` is \`inferred\`; evidence must point to the source fields and rules used.
- Every meaningful flow must contain Mermaid source. Prefer \`sequenceDiagram\`; use \`flowchart TD\` or \`stateDiagram-v2\` when better.
- Extract business logic and function/use-case examples explicitly; do not bury them only in prose.
- Extract domain/data/integration and process-readiness views; the assessment must not stop at documentation.
- If behavior cannot be proven from code/docs, put it into \`open_questions\`.
- Keep production code read-only unless explicitly asked otherwise.
- Use English for generated JSON text and report-facing content, while preserving original domain terms and identifiers.

## Target capabilities that must be addressed

\`\`\`json
${JSON.stringify(targetCoverage_1.TARGET_CAPABILITIES.map(c => ({ id: c.id, title: c.title, expected_outputs: c.expected_outputs })), null, 2)}
\`\`\`

## Repo snapshot

\`\`\`json
${JSON.stringify(profile, null, 2)}
\`\`\`

## Top modules

\`\`\`json
${JSON.stringify(modules.slice(0, 14), null, 2)}
\`\`\`

## Important docs / contracts / example candidates

\`\`\`json
${JSON.stringify(importantDocs.slice(0, 100), null, 2)}
\`\`\`

## Broad tool signals, not final facts

\`\`\`json
${JSON.stringify(signals.slice(0, 90), null, 2)}
\`\`\`

## Top glossary terms

${glossary.slice(0, 120).join(', ')}

## Context capsules

The source excerpts are in \`.analysis/source-capsules.json\`. Use them to decide what to open next, but inspect full source files whenever evidence is needed.
`;
}
function taskBody(title, outputFile, profile, modules, signals, capsules, glossary, importantDocs) {
    const hints = {
        repo: profile,
        top_modules: modules.slice(0, 10),
        important_docs: importantDocs.slice(0, 38),
        top_signals: signals.slice(0, 60),
        top_capsules: capsules.slice(0, 18).map(c => ({ path: c.path, roles: c.roles, signals: (c.signals || []).slice(0, 8), symbols: (c.symbols || []).slice(0, 8) })),
        glossary: glossary.slice(0, 90)
    };
    return `# ${title}

You are running inside Codex as the semantic extraction step for Codebase Analysis Pack.

Read these files first:

- \`.analysis/llm_instructions.md\`
- \`.analysis/data/code-map.json\`
- \`.analysis/data/important-docs.json\`
- \`.analysis/source-capsules.json\`

Then open source files, tests, docs, contracts, schemas and configuration as needed. The source capsules and signals are only navigation hints.

Write your result to \`.analysis/llm/${outputFile}\` as valid JSON.

Evidence format for every relevant claim:

\`\`\`json
{"path": "relative/path/File.ext", "line": 123, "symbol": "optionalSymbol"}
\`\`\`

General rules:

- Use English for generated descriptions. Preserve original identifiers and domain names.
- Do not include markdown in the JSON output.
- Prefer concrete evidence over speculation.
- Use \`confidence: "high|medium|low"\` and \`open_questions\` when behavior is unclear.
- Do not modify production source files.

Rules for examples:

- Extract existing request/response examples from docs, OpenAPI/Swagger examples, SOAP/WSDL examples, Postman collections, \`.http\` files and tests when present.
- If examples are not present but can be inferred from DTO/schema/tests, include them with \`example_origin: "inferred"\` and evidence for every meaningful field.
- Never label inferred examples as source-provided.
- Include payload examples as JSON/XML/string objects or escaped strings. Keep them small but realistic.
- Include Mermaid diagrams as source text in a \`mermaid\` object or \`mermaid_flows\` entries.

## Navigation hints

\`\`\`json
${JSON.stringify(hints, null, 2)}
\`\`\`

${schemaForTitle(title)}
`;
}
function schemaForTitle(title) {
    if (title.includes('Core Assessment'))
        return `## Expected JSON

{
  "assessment": {
    "executive_summary": "Decision-grade summary of what the repository appears to do and how complete the extraction is.",
    "system_purpose": "Business purpose inferred from code/docs/tests.",
    "assessment_scope": ["What was analyzed"],
    "key_capabilities": ["Short capability names"],
    "key_interfaces": ["Main inbound/outbound interfaces"],
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
}`;
    if (title.includes('Business Capabilities'))
        return `## Expected JSON

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
}`;
    if (title.includes('Interface and Contract'))
        return `## Expected JSON

{
  "interfaces": [
    {
      "id": "stable-interface-id",
      "type": "http|graphql|event|job|cli|ui|database|external|soap",
      "protocol": "REST|OpenAPI|SOAP|GraphQL|Kafka|AMQP|CLI|internal|null",
      "name": "Short name",
      "method": "GET|POST|... or null",
      "path": "/path, topic, queue, command or SOAP operation",
      "description": "What this interface does.",
      "source_contracts": [
        {"kind": "openapi|swagger|soap|wsdl|xsd|postman|doc|test", "path":"...", "line":1, "operation_id":"optional", "evidence": []}
      ],
      "request": {"type": "DTO/schema name", "fields": [{"name":"field", "meaning":"business meaning", "required": true, "evidence": []}]},
      "response": {"type": "DTO/schema name", "fields": [{"name":"field", "meaning":"business meaning", "evidence": []}]},
      "examples": [
        {
          "title": "Example request/response",
          "example_origin": "openapi|soap|doc|test|postman|inferred",
          "request": {"headers": {}, "body": {}},
          "response": {"status": 200, "headers": {}, "body": {}},
          "evidence": []
        }
      ],
      "auth": {"required": true, "roles": [], "evidence": []},
      "errors": [{"condition":"...", "result":"...", "example": {}, "evidence": []}],
      "evidence": [],
      "confidence": "high|medium|low",
      "open_questions": []
    }
  ]
}`;
    if (title.includes('Request and Response'))
        return `## Expected JSON

{
  "documentation": {
    "request_response_examples": [
      {
        "title": "Example title",
        "interface_id": "optional",
        "source": "openapi|soap|doc|test|postman|http_file|inferred",
        "example_origin": "openapi|soap|doc|test|postman|http_file|inferred",
        "request": {"method":"POST", "path":"/example", "headers":{}, "body":{}},
        "response": {"status":200, "headers":{}, "body":{}},
        "errors": [{"status":400, "body":{}, "condition":"..."}],
        "evidence": []
      }
    ],
    "function_examples": [
      {
        "title": "Function or use-case example",
        "function_or_use_case": "name",
        "input": {},
        "output": {},
        "explanation": "...",
        "example_origin": "test|doc|inferred",
        "evidence": []
      }
    ]
  }
}`;
    if (title.includes('OpenAPI'))
        return `## Expected JSON

{
  "documentation": {
    "openapi": [
      {
        "title": "OpenAPI operation/example",
        "path": "contract path or operation path",
        "operation_id": "optional",
        "method": "POST",
        "route": "/example",
        "request_schema": "schema/component",
        "response_schema": "schema/component",
        "request_example": {},
        "response_example": {},
        "example_origin": "openapi|swagger|inferred",
        "evidence": []
      }
    ],
    "soap": [
      {
        "title": "SOAP/WSDL operation/example",
        "operation": "operation name",
        "soap_action": "optional",
        "input_message": "optional",
        "output_message": "optional",
        "faults": [],
        "request_envelope": "<soapenv:Envelope>...</soapenv:Envelope>",
        "response_envelope": "<soapenv:Envelope>...</soapenv:Envelope>",
        "example_origin": "wsdl|doc|test|inferred",
        "evidence": []
      }
    ],
    "contract_examples": [
      {"title":"Contract example", "kind":"graphql|event|asyncapi|proto|other", "payload": {}, "example_origin":"doc|test|inferred", "evidence": []}
    ]
  }
}`;
    if (title.includes('Flows'))
        return `## Expected JSON

{
  "flows": [
    {
      "id": "stable-flow-id",
      "title": "Flow title",
      "capability_id": "capability-id-if-known",
      "interface_ids": ["interface-id"],
      "summary": "Short business/technical summary.",
      "mermaid": {
        "diagram_type": "sequenceDiagram|flowchart TD|stateDiagram-v2",
        "source": "sequenceDiagram\n  participant Client\n  Client->>API: ...",
        "evidence": []
      },
      "steps": [
        {"order": 1, "actor": "client/system/db/external", "description":"step", "kind":"request|validation|business_rule|persistence|external_call|event|response|error|state_change", "request_response_ref":"optional interface/example id", "evidence": []}
      ],
      "business_logic_refs": ["capability-id#logic-name"],
      "side_effects": [{"type":"database_write|event_publish|external_call|state_change", "description":"...", "evidence": []}],
      "examples": [{"title":"Flow example", "input": {}, "output": {}, "example_origin":"doc|test|inferred", "evidence": []}],
      "evidence": [],
      "confidence": "high|medium|low",
      "open_questions": []
    }
  ],
  "documentation": {
    "mermaid_flows": [
      {"title":"Flow title", "flow_id":"optional", "diagram_type":"sequenceDiagram|flowchart TD|stateDiagram-v2", "source":"sequenceDiagram\n  A->>B: ...", "evidence": []}
    ]
  }
}`;
    if (title.includes('Domain, Data'))
        return `## Expected JSON

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
}`;
    if (title.includes('Process'))
        return `## Expected JSON

{
  "process": {
    "summary": "Assessment of development, delivery and operational readiness visible in the repository.",
    "tests": {"status":"none|partial|good|unknown", "evidence": [], "observations": []},
    "ci_cd": {"status":"none|partial|good|unknown", "evidence": [], "observations": []},
    "release": {"status":"none|partial|good|unknown", "evidence": [], "observations": []},
    "observability": {"status":"none|partial|good|unknown", "evidence": [], "observations": []},
    "configuration": {"status":"none|partial|good|unknown", "evidence": [], "observations": []},
    "local_setup": {"status":"none|partial|good|unknown", "evidence": [], "observations": []},
    "open_questions": []
  },
  "quality": {
    "summary": "Maintainability and quality assessment visible from code/docs/tests.",
    "strengths": [{"title":"...", "description":"...", "evidence": []}],
    "risks": [{"title":"...", "severity":"low|medium|high|critical", "description":"...", "recommendation":"...", "evidence": []}],
    "testability": [{"title":"...", "description":"...", "evidence": []}]
  },
  "findings": [
    {"id":"finding-id", "category":"risk|quality|security|process|maintainability|documentation|testability|operability", "severity":"low|medium|high|critical", "title":"...", "description":"...", "recommendation":"...", "evidence": []}
  ]
}`;
    if (title.includes('Architecture'))
        return `## Expected JSON

{
  "architecture": {
    "summary": "Architecture summary",
    "style": "monolith|modular_monolith|microservice|library|frontend|infra|unknown",
    "modules": [{"name":"module", "responsibility":"...", "dependencies": [], "evidence": []}],
    "external_systems": [{"name":"system", "direction":"inbound|outbound|both", "protocol":"...", "evidence": []}],
    "data_stores": [{"name":"store", "technology":"...", "evidence": []}],
    "runtime": [{"name":"runtime/deployment/config aspect", "description":"...", "evidence": []}],
    "observations": [{"title":"observation", "description":"...", "evidence": []}],
    "mermaid": "flowchart TD\n  A[Module] --> B[Store]"
  },
  "findings": [
    {"id":"finding-id", "category":"risk|quality|security|process|maintainability|documentation|architecture", "severity":"low|medium|high|critical", "title":"...", "description":"...", "recommendation":"...", "evidence": []}
  ],
  "refactoring": [
    {"id":"refactoring-id", "title":"...", "description":"...", "benefit":"...", "risk":"low|medium|high", "effort":"S|M|L|XL", "candidate_files": [], "prerequisites": [], "evidence": []}
  ],
  "modernization": [
    {"id":"modernization-id", "title":"...", "description":"...", "target_state":"...", "benefit":"...", "risk":"low|medium|high", "effort":"S|M|L|XL", "evidence": []}
  ]
}`;
    return `## Expected JSON

{
  "assessment": {
    "completeness": {
      "business_logic": "none|partial|good|strong",
      "interfaces": "none|partial|good|strong",
      "flows": "none|partial|good|strong",
      "examples": "none|partial|good|strong",
      "process_readiness": "none|partial|good|strong",
      "refactoring_roadmap": "none|partial|good|strong"
    },
    "open_questions": []
  },
  "documentation": {
    "summary": "What examples/contracts were found or inferred and what remains missing.",
    "report_completeness_notes": [
      {"area":"interfaces|flows|business_logic|process|data|examples|refactoring", "status":"missing|partial|good", "note":"...", "evidence": []}
    ]
  },
  "findings": [
    {"id":"gap-id", "category":"documentation|process|analysis_gap", "severity":"low|medium|high", "title":"...", "description":"...", "recommendation":"...", "evidence": []}
  ]
}`;
}

export interface ReportComponentDefinition {
  id: string;
  label: string;
  purpose: string;
  expected_fields: string[];
  guidance: string;
}

export const REPORT_COMPONENT_LIBRARY: ReportComponentDefinition[] = [
  {
    id: 'narrative',
    label: 'Narrative',
    purpose: 'Human-readable paragraphs for management/business meaning and technical explanation.',
    expected_fields: ['type', 'title?', 'labels?', 'text|paragraphs|summary|description', 'business_need?', 'business_use?', 'technical_drilldown?', 'evidence?|evidence_refs?'],
    guidance: 'Use for authored prose that explains business need, business use, system meaning, process behavior, risk rationale or technical drilldown. Prefer real explanatory paragraphs over terse labels. Do not use it as a dumping ground for class/function/file lists; keep those as citations or technical drilldown.'
  },
  {
    id: 'layered_explanation',
    label: 'Layered Explanation',
    purpose: 'Plain-language explanation for non-specialists with technical drilldown kept in the same visible block.',
    expected_fields: ['type', 'title?', 'plain_language|summary|what_happens', 'business_context?|why_it_matters?', 'technical_detail|technical_drilldown', 'operational_impact?', 'example?|scenario?', 'evidence?|evidence_refs?'],
    guidance: 'Use when a section must be understandable without prior repository knowledge while still preserving exact technical detail. The prose should answer what this is, why it exists, how it works, what can go wrong or change, and what decision follows. Include a concrete source-derived scenario or example when useful. Code identifiers should support the explanation, not lead it.'
  },
  {
    id: 'statement_list',
    label: 'Statement List',
    purpose: 'Evidence-backed claims, findings, risks, recommendations or decisions.',
    expected_fields: ['type', 'title?', 'labels?', 'items[]', 'items[].title|name|criterion|verdict|id', 'items[].description|summary|reason|recommendation', 'items[].confidence?', 'items[].evidence?|items[].evidence_refs?'],
    guidance: 'Use when each statement should stand alone with confidence, severity or evidence.'
  },
  {
    id: 'metric_grid',
    label: 'Metric Grid',
    purpose: 'Compact facts that orient the reader without replacing analysis.',
    expected_fields: ['type', 'title?', 'labels?', 'metrics[]', 'metrics[].label', 'metrics[].value', 'metrics[].detail?'],
    guidance: 'Use sparingly for source inventory accounting, counts and status facts. Metrics are not semantic proof.'
  },
  {
    id: 'source_family_map',
    label: 'Source Family Map',
    purpose: 'Whole-repository family/module responsibilities before deep drilldown.',
    expected_fields: ['type', 'title?', 'labels?', 'families[]', 'families[].name', 'families[].role|business_use|technical_shape', 'families[].confidence', 'families[].evidence?'],
    guidance: 'Use for LLM-authored source-family understanding. Deterministic inventory partitions remain navigation aids only.'
  },
  {
    id: 'boundary_map',
    label: 'Boundary Map',
    purpose: 'System entry, system exit/integration and state/data boundaries.',
    expected_fields: ['type', 'title?', 'labels.entries?', 'labels.exits?', 'labels.state?', 'entries[]', 'exits[]', 'state[]', 'evidence?'],
    guidance: 'Use when explaining how the system is entered, what it calls or emits, and where state changes. Set labels when repository terminology differs from the default entry/exit/state wording.'
  },
  {
    id: 'api_contracts',
    label: 'API Contracts',
    purpose: 'Human-readable API/interface catalogue with methods, paths, request/response contracts, errors and evidence.',
    expected_fields: ['type', 'title?', 'summary?', 'apis[]|items[]|contracts[]', 'apis[].name', 'apis[].protocol?', 'apis[].method?', 'apis[].path|endpoint?', 'apis[].purpose|description?', 'apis[].request_fields?', 'apis[].response_fields?', 'apis[].errors?', 'apis[].evidence?'],
    guidance: 'Use for REST, WebSocket, Kafka, SOAP, GraphQL, service-client or internal interface surfaces. If examples are inferred rather than source-provided, mark example_origin on the example block.'
  },
  {
    id: 'request_response_examples',
    label: 'Request/Response Examples',
    purpose: 'Concrete source-provided or defensibly inferred payload examples for APIs, events, service calls or functions.',
    expected_fields: ['type', 'title?', 'summary?', 'examples[]|items[]', 'examples[].title|name', 'examples[].example_origin', 'examples[].request?', 'examples[].response?', 'examples[].notes?|description?', 'examples[].evidence?'],
    guidance: 'Use when stakeholders need to see payload shape. Preserve source examples when present; inferred examples must set example_origin: "inferred" and include evidence for the DTO/controller/schema that justifies the shape.'
  },
  {
    id: 'flow',
    label: 'Flow',
    purpose: 'E2E, process, request/response or failure relationship with optional visual explanation artifacts such as prose, steps, tables, Mermaid or SVG.',
    expected_fields: ['type', 'title?', 'labels?', 'summary|description?', 'visual_explanation?', 'mermaid?|source?', 'steps[]?', 'evidence?'],
    guidance: 'Use for human understanding of collaboration across functions, modules, interfaces and systems. A strong flow reads like a scenario: trigger, actor, user/business intent, entrypoint, decision rule, state change, integration call, output, failure path and operational side effect when the source proves them. Use Mermaid only when it clarifies; prose, steps, examples or a no-diagram rationale are valid.'
  },
  {
    id: 'visual_explanation',
    label: 'Visual Explanation',
    purpose: 'Repository-fit explanatory artifact for a relationship, lifecycle, data movement, architecture slice or decision logic.',
    expected_fields: ['type', 'title?', 'summary|description?', 'visual_explanation.artifact_type', 'visual_explanation.rationale', 'visual_explanation.source?', 'steps[]?', 'evidence?'],
    guidance: 'Use when the LLM decides a subject is best explained as narrative, steps, table, timeline, dependency map, state diagram, sequence diagram, architecture sketch, SVG or no diagram. The artifact type must fit the source-backed claim, not a fixed template.'
  },
  {
    id: 'architecture_visual',
    label: 'Architecture Visual',
    purpose: 'A visible architecture picture or system landscape, rendered from LLM-authored nodes, layers, edges, SVG, Mermaid or an image asset.',
    expected_fields: ['type', 'title?', 'summary|description?', 'nodes[]|layers[]', 'nodes[].id|name|label', 'nodes[].role|description?', 'edges[]?', 'edges[].from', 'edges[].to', 'edges[].label|description?', 'svg?|image?|src?|mermaid?', 'evidence?'],
    guidance: 'Use for the report-level architecture picture: systems, apps, services, stores, actors, queues, files, integrations or bounded contexts. It should be understandable as a visual map before the reader opens evidence details. Prefer LLM-authored nodes/layers/edges or inline SVG when Mermaid would be brittle. Every important node or edge should have evidence or an explicit evidence gap.'
  },
  {
    id: 'process_flow_visual',
    label: 'Process Flow Visual',
    purpose: 'A visible process-flow picture for business workflows, operational workflows, request lifecycles, state transitions or release/validation processes.',
    expected_fields: ['type', 'title?', 'summary|description?', 'trigger?', 'outcome?', 'lanes[]?', 'steps[]|phases[]', 'steps[].actor?', 'steps[].description', 'steps[].decision?|state_change?|integration?|failure_path?', 'svg?|image?|src?|mermaid?', 'evidence?'],
    guidance: 'Use for process and E2E explanations that need more than prose. The flow should connect trigger, actors, entrypoints, decisions, state/data changes, integrations, outputs, failure paths and side effects where source evidence proves them. Prefer a readable timeline/swimlane/SVG over one dense Mermaid diagram.'
  },
  {
    id: 'report_image',
    label: 'Report Image',
    purpose: 'A report-local image, SVG illustration, screenshot, generated conceptual visual or architecture/process asset with caption, alt text and evidence context.',
    expected_fields: ['type', 'title?', 'src|image|svg', 'alt', 'caption|summary|description?', 'kind?', 'evidence?'],
    guidance: 'Use when a visual asset helps the reader inspect the system, architecture, process, UI state or decision. Keep assets local to the report when possible. Do not use decorative images as a substitute for source-backed explanation.'
  },
  {
    id: 'four_level_assessment',
    label: 'Four-Level Assessment',
    purpose: 'The four requested analysis levels in one structured view.',
    expected_fields: ['type', 'title?', 'labels.next_steps?', 'levels[]', 'levels[].level', 'levels[].status', 'levels[].summary', 'levels[].next_steps?', 'levels[].evidence?'],
    guidance: 'Use for reverse engineering/documentation, code analysis, process analysis and refactoring/target architecture applicability. Each level should contain a narrative assessment and source-backed next steps or a clear not_applicable rationale, not just a status word.'
  },
  {
    id: 'capability_coverage',
    label: 'Capability Coverage',
    purpose: 'LLM-authored coverage and applicability of the four core Cognianalysis capabilities, independent of the report section outline.',
    expected_fields: ['type', 'title?', 'labels?', 'capabilities[]|items[]|levels[]', 'capabilities[].capability_id', 'capabilities[].label?', 'capabilities[].status', 'capabilities[].summary', 'capabilities[].covered_by_sections?', 'capabilities[].thesis_impact?', 'capabilities[].next_steps?', 'capabilities[].evidence?'],
    guidance: 'Use when the report must show that reverse engineering/documentation, code analysis, process analysis and refactoring/modernization were each assessed. The LLM chooses the section structure; this component renders the explicit coverage/applicability model, including not_applicable when forcing a capability would mislead.'
  },
  {
    id: 'source_coverage_trace',
    label: 'Source Coverage Trace',
    purpose: 'Visible whole-repository file accounting and explanation of how the complete file-card corpus affected the report theses.',
    expected_fields: ['type', 'title?', 'labels?', 'included_files?', 'tier1_file_cards?', 'missing_tier1_file_cards?', 'source_tier_tasks?', 'summary|thesis_impact_summary?', 'source_family_impacts[]|families[]', 'source_family_impacts[].source_family|name', 'source_family_impacts[].file_count?', 'source_family_impacts[].thesis_impact|summary', 'source_family_impacts[].evidence?'],
    guidance: 'Use for complete-audit reports to show source inventory reconciliation and thesis impact. Counts prove coverage mechanics; prose explains how file families affected confidence, conclusions and evidence gaps.'
  },
  {
    id: 'decision_matrix',
    label: 'Decision Matrix',
    purpose: 'Options, trade-offs, recommendations, confidence and risks.',
    expected_fields: ['type', 'title?', 'labels.decision?', 'labels.options?', 'labels.recommendation?', 'labels.risk?', 'rows[]', 'rows[].decision', 'rows[].options?', 'rows[].recommendation?', 'rows[].risk?', 'rows[].confidence', 'rows[].evidence?'],
    guidance: 'Use when the report needs to become a decision basis rather than only documentation. Set labels when the repository-specific decision vocabulary should drive table wording.'
  },
  {
    id: 'roadmap',
    label: 'Roadmap',
    purpose: 'Optional modernization, refactoring, process, migration, stabilization or quality improvement path.',
    expected_fields: ['type', 'title?', 'labels?', 'items[]', 'items[].title', 'items[].phase?', 'items[].benefit?', 'items[].description?', 'items[].effort?', 'items[].risk?', 'items[].confidence?', 'items[].evidence?'],
    guidance: 'Use for target architecture, migration, stabilization or optimization recommendations when they are evidence-backed. Do not use this component just to satisfy a fixed roadmap requirement.'
  },
  {
    id: 'agent_plan',
    label: 'Agent Plan',
    purpose: 'Planned/executed detail reviews and remaining follow-up.',
    expected_fields: ['type', 'title?', 'labels.source_family?', 'labels.priority?', 'labels.focus?', 'labels.expected_outputs?', 'labels.task_output?', 'labels.seed_files?', 'summary?', 'tasks[]|detail_agent_tasks[]', 'tasks[].source_family', 'tasks[].focus?', 'tasks[].expected_outputs?', 'tasks[].seed_files?'],
    guidance: 'Use only to show detail-review basis or follow-up. Executable pre-report tasks come from llm/detail-agent-plan.json. Keep this out of the main executive reading path unless the audit method itself is a decision-relevant point.'
  },
  {
    id: 'technical_drilldown',
    label: 'Technical Drilldown',
    purpose: 'Links into technical catalogues, contracts, evidence or deeper sections.',
    expected_fields: ['type', 'title?', 'labels?', 'references[]', 'references[].label', 'references[].target?', 'references[].description?'],
    guidance: 'Use to keep the main narrative readable while preserving deep technical access.'
  },
  {
    id: 'open_questions',
    label: 'Open Questions',
    purpose: 'Missing proof, owner questions and follow-up analysis.',
    expected_fields: ['type', 'title?', 'summary?|description?', 'labels.question?', 'items[]', 'items[].id', 'items[].question|title', 'items[].reason|why_it_matters|description', 'items[].impact', 'items[].blocking', 'items[].evidence?|items[].evidence_refs?|items[].evidence_gap?'],
    guidance: 'Use when code evidence cannot support a stronger claim. Mirror any top-level analysis_document.open_questions entries here when unresolved uncertainty should be visible to report readers. If there are no open questions, include an explicit LLM-authored summary instead of an empty block.'
  },
  {
    id: 'evidence_index',
    label: 'Evidence Index',
    purpose: 'Visible but subordinate file:line evidence references that support the LLM-authored report.',
    expected_fields: ['type', 'title?', 'items[]|evidence[]|evidence_refs[]', 'items[].path', 'items[].line?', 'items[].snippet?', 'items[].claim_id?', 'items[].valid?'],
    guidance: 'Use when the final report needs a compact trace of source-backed proof. Evidence indexes are navigation and support surfaces; they do not replace authored explanation and should usually appear after the decision, functional, technical, process and modernization narrative.'
  }
];

export function supportedReportComponentTypes(): string[] {
  return REPORT_COMPONENT_LIBRARY.map(component => component.id);
}

export function reportComponentLibraryArtifact(): any {
  return {
    library_kind: 'analysis_document_component_library',
    semantic_authority: false,
    purpose: 'Stable renderer and styling contract for LLM-authored analysis_document.sections. It does not decide report quality or semantic completeness; empty sections or blocks are structural renderer gaps and must be rewritten by the LLM instead of filled by deterministic placeholder prose. Blocks may include labels to let the LLM control repository-specific wording inside stable visual components. The main report should read as stakeholder documentation, with file paths/classes/functions treated as citations or technical details rather than as the report structure.',
    components: REPORT_COMPONENT_LIBRARY
  };
}

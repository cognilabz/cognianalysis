import { AnalysisEvidenceRef, evidenceRefs } from './evidence';
import { AnalysisReportSection } from './reportBlocks';
import { FS, Path, asList, cleanId, loadJson, utcNow } from '../utils';

export type AnalysisModeV2 = 'brief' | 'blueprint' | 'deep' | 'complete-audit';
export type AnalysisConfidence = 'high' | 'medium' | 'low';

export interface AnalysisV2 {
  schema_version: '2.0';
  analysis_kind: 'cognianalysis_decision_document';
  mode: AnalysisModeV2;
  repo: {
    name: string;
    commit?: string;
    scope_summary: string;
    analyzed_at: string;
  };
  confidence: {
    overall: AnalysisConfidence;
    reason: string;
    limitations: any[];
  };
  executive_decision: {
    summary: string;
    recommended_action: string;
    decision_options: any[];
    top_risks: any[];
    next_steps: any[];
    evidence: AnalysisEvidenceRef[];
  };
  functional_view: {
    system_purpose: string;
    actors: any[];
    capabilities: any[];
    user_or_system_flows: any[];
  };
  technical_view: {
    architecture_summary: string;
    entrypoints: any[];
    apis_and_interfaces: any[];
    data_and_state: any[];
    integrations: any[];
    deployment_runtime: any[];
    evidence: AnalysisEvidenceRef[];
  };
  code_quality_security: {
    bugs: any[];
    vulnerabilities: any[];
    code_quality_findings: any[];
    scanner_findings_imported: any[];
  };
  process_analysis: {
    test_readiness: string;
    delivery_risks: any[];
    observability: any[];
    documentation_gaps: any[];
    process_improvements: any[];
  };
  refactoring: {
    target_architecture_options: any[];
    migration_roadmap: any[];
    tech_stack_options: any[];
    quick_wins: any[];
  };
  report_sections: AnalysisReportSection[];
  open_questions: any[];
  evidence_index: AnalysisEvidenceRef[];
  report_quality_review?: any;
}

export interface LoadedAnalysisDocument {
  source: 'analysis-v2' | 'legacy-analysis-document' | 'missing';
  path?: string;
  analysis: AnalysisV2 | null;
  analysis_document: any | null;
  validation: {
    valid: boolean;
    missing: string[];
    warnings: string[];
  };
}

function nonEmptyString(value: any): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function confidence(value: any): AnalysisConfidence {
  const normalized = String(value || '').toLowerCase();
  return normalized === 'high' || normalized === 'medium' || normalized === 'low' ? normalized as AnalysisConfidence : 'low';
}

function mode(value: any): AnalysisModeV2 {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'complete') return 'complete-audit';
  if (normalized === 'deep-dive') return 'deep';
  if (normalized === 'brief' || normalized === 'blueprint' || normalized === 'deep' || normalized === 'complete-audit') return normalized as AnalysisModeV2;
  return 'blueprint';
}

function list(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function statement(value: any, fallback = 'Statement'): any {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') return { title: fallback, summary: value };
  return { title: fallback, summary: String(value ?? '') };
}

function withEvidence(item: any, inherited: any[] = []): any {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return statement(item);
  if (evidenceRefs(item).length || !inherited.length) return item;
  return { ...item, evidence: inherited };
}

function narrativeBlock(title: string, text: any, evidence: any[] = []): any {
  return {
    type: 'narrative',
    title,
    text: Array.isArray(text) ? text : String(text || ''),
    evidence
  };
}

function statementBlock(title: string, items: any, evidence: any[] = []): any {
  const normalized = list(items).map(item => withEvidence(statement(item), evidence));
  return {
    type: 'statement_list',
    title,
    items: normalized,
    evidence
  };
}

function hasContent(value: any): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return false;
}

function cleanBlocks(blocks: any[]): any[] {
  return blocks.filter(block => {
    if (!block || typeof block !== 'object') return false;
    return ['text', 'paragraphs', 'summary', 'description', 'items', 'rows', 'metrics', 'mermaid', 'steps', 'evidence', 'evidence_refs']
      .some(key => hasContent(block[key]));
  });
}

function section(id: string, title: string, level: string, intent: string, blocks: any[], evidence: any[] = []): any {
  return {
    id,
    title,
    level,
    intent,
    blocks: cleanBlocks(blocks),
    evidence
  };
}

function normalizeCustomSections(sections: any[]): any[] {
  return sections
    .filter(item => item && typeof item === 'object' && !Array.isArray(item))
    .map((item, index) => ({
      id: item.id || cleanId(item.title || `section-${index + 1}`),
      title: item.title || item.id || `Section ${index + 1}`,
      level: item.level || 'analysis',
      intent: item.intent || item.summary || '',
      blocks: Array.isArray(item.blocks) ? item.blocks : [],
      evidence: evidenceRefs(item)
    }))
    .filter(item => item.blocks.length || item.intent || item.evidence.length);
}

export function analysisV2ToReportSections(analysis: AnalysisV2): any[] {
  const custom = normalizeCustomSections(analysis.report_sections || []);
  if (custom.length) return custom;

  const executiveEvidence = evidenceRefs(analysis.executive_decision);
  const technicalEvidence = evidenceRefs(analysis.technical_view);
  const sections = [
    section('executive-decision', 'Executive Decision', 'decision', 'Decision basis and recommended action.', [
      narrativeBlock('Summary', analysis.executive_decision?.summary, executiveEvidence),
      statementBlock('Recommended Action', [{ title: 'Recommended action', summary: analysis.executive_decision?.recommended_action, evidence: executiveEvidence }]),
      statementBlock('Decision Options', analysis.executive_decision?.decision_options, executiveEvidence),
      statementBlock('Top Risks', analysis.executive_decision?.top_risks, executiveEvidence),
      statementBlock('Next Steps', analysis.executive_decision?.next_steps, executiveEvidence)
    ], executiveEvidence),
    section('functional-view', 'Functional View', 'reverse_engineering', 'System purpose, actors, capabilities and user/system flows.', [
      narrativeBlock('System Purpose', analysis.functional_view?.system_purpose, []),
      statementBlock('Actors', analysis.functional_view?.actors),
      statementBlock('Capabilities', analysis.functional_view?.capabilities),
      ...(list(analysis.functional_view?.user_or_system_flows).map((flow: any) => ({
        type: 'flow',
        title: flow.name || flow.title || 'Flow',
        summary: flow.summary || flow.description || '',
        steps: flow.steps || [],
        mermaid: flow.mermaid || '',
        evidence: evidenceRefs(flow)
      })))
    ]),
    section('technical-view', 'Technical View', 'technical', 'Architecture, entrypoints, interfaces, data/state, integrations and runtime.', [
      narrativeBlock('Architecture Summary', analysis.technical_view?.architecture_summary, technicalEvidence),
      statementBlock('Entrypoints', analysis.technical_view?.entrypoints, technicalEvidence),
      statementBlock('APIs and Interfaces', analysis.technical_view?.apis_and_interfaces, technicalEvidence),
      statementBlock('Data and State', analysis.technical_view?.data_and_state, technicalEvidence),
      statementBlock('Integrations', analysis.technical_view?.integrations, technicalEvidence),
      statementBlock('Deployment Runtime', analysis.technical_view?.deployment_runtime, technicalEvidence)
    ], technicalEvidence),
    section('risks-quality-security', 'Risks & Quality', 'code_analysis', 'Bugs, vulnerabilities, quality findings and imported scanner findings.', [
      statementBlock('Bugs', analysis.code_quality_security?.bugs),
      statementBlock('Vulnerabilities', analysis.code_quality_security?.vulnerabilities),
      statementBlock('Code Quality Findings', analysis.code_quality_security?.code_quality_findings),
      statementBlock('Imported Scanner Findings', analysis.code_quality_security?.scanner_findings_imported)
    ]),
    section('process-improvements', 'Process Improvements', 'process', 'Test readiness, delivery risks, observability and documentation/process gaps.', [
      narrativeBlock('Test Readiness', analysis.process_analysis?.test_readiness),
      statementBlock('Delivery Risks', analysis.process_analysis?.delivery_risks),
      statementBlock('Observability', analysis.process_analysis?.observability),
      statementBlock('Documentation Gaps', analysis.process_analysis?.documentation_gaps),
      statementBlock('Process Improvements', analysis.process_analysis?.process_improvements)
    ]),
    section('refactoring-roadmap', 'Refactoring Roadmap', 'refactoring', 'Target architecture options, migration roadmap, stack options and quick wins.', [
      statementBlock('Target Architecture Options', analysis.refactoring?.target_architecture_options),
      { type: 'roadmap', title: 'Migration Roadmap', items: list(analysis.refactoring?.migration_roadmap) },
      statementBlock('Tech Stack Options', analysis.refactoring?.tech_stack_options),
      { type: 'roadmap', title: 'Quick Wins', items: list(analysis.refactoring?.quick_wins) }
    ]),
    section('evidence-open-questions', 'Evidence & Open Questions', 'evidence', 'Evidence index, limitations and unresolved questions.', [
      {
        type: 'open_questions',
        title: 'Open Questions',
        items: list(analysis.open_questions)
      },
      statementBlock('Confidence Limitations', analysis.confidence?.limitations),
      {
        type: 'evidence_index',
        title: 'Evidence Index',
        items: list(analysis.evidence_index)
      }
    ], evidenceRefs(analysis.evidence_index))
  ];
  return sections.filter(item => item.blocks.length || item.evidence.length);
}

export function analysisV2ToLegacyAnalysisDocument(analysis: AnalysisV2): any {
  return {
    schema_version: '1.0-adapted-from-analysis-v2',
    document_kind: 'analysis_document',
    title: `Cognianalysis Decision Report · ${analysis.repo?.name || 'Repository'}`,
    subtitle: `Mode: ${analysis.mode || 'blueprint'} · Confidence: ${analysis.confidence?.overall || 'low'}`,
    audience: ['executive', 'engineering'],
    synthesis_stage: analysis.mode === 'complete-audit' ? 'final_after_detail_reviews' : 'final_after_analysis_json',
    v2_source: '.analysis/analysis.json',
    executive_decision_basis: {
      summary: analysis.executive_decision?.summary || '',
      recommended_action: analysis.executive_decision?.recommended_action || '',
      decision_options: list(analysis.executive_decision?.decision_options),
      top_risks: list(analysis.executive_decision?.top_risks),
      next_steps: list(analysis.executive_decision?.next_steps),
      evidence: evidenceRefs(analysis.executive_decision)
    },
    sections: analysisV2ToReportSections(analysis),
    open_questions: list(analysis.open_questions),
    consistency_review: {
      contradiction_count: 0,
      contradictions: [],
      summary: 'No contradiction review was provided in analysis.json v2; use evidence-audit shard or report_quality_review for authored findings.'
    },
    report_quality_review: analysis.report_quality_review || {
      verdict: 'partial',
      rationale: 'analysis.json v2 did not include report_quality_review.',
      strengths: [],
      limitations: ['Missing report_quality_review in analysis.json v2.'],
      blocking_gaps: [],
      recommended_followups: [],
      confidence: analysis.confidence?.overall || 'low',
      evidence: []
    },
    requirements_trace: []
  };
}

export function legacyAnalysisDocumentToV2(legacy: any, repo: string, analysisDir: string, profile: any = {}, modeValue = 'blueprint'): AnalysisV2 {
  const basis = legacy?.executive_decision_basis || {};
  const sections = Array.isArray(legacy?.sections) ? legacy.sections : [];
  return {
    schema_version: '2.0',
    analysis_kind: 'cognianalysis_decision_document',
    mode: mode(modeValue),
    repo: {
      name: profile.repo_name || Path.basename(repo),
      commit: profile.commit || '',
      scope_summary: profile.analysis_scope_mode || 'legacy analysis-document adapter',
      analyzed_at: profile.analyzed_at || utcNow()
    },
    confidence: {
      overall: confidence(legacy?.report_quality_review?.confidence || 'low'),
      reason: legacy?.report_quality_review?.rationale || 'Adapted from legacy .analysis/llm/analysis-document.json.',
      limitations: []
    },
    executive_decision: {
      summary: basis.summary || legacy?.summary || '',
      recommended_action: basis.recommended_action || basis.recommendation || '',
      decision_options: list(basis.decision_options || basis.options),
      top_risks: list(basis.top_risks || basis.risks),
      next_steps: list(basis.next_steps),
      evidence: evidenceRefs(basis)
    },
    functional_view: { system_purpose: '', actors: [], capabilities: [], user_or_system_flows: [] },
    technical_view: { architecture_summary: '', entrypoints: [], apis_and_interfaces: [], data_and_state: [], integrations: [], deployment_runtime: [], evidence: [] },
    code_quality_security: { bugs: [], vulnerabilities: [], code_quality_findings: [], scanner_findings_imported: [] },
    process_analysis: { test_readiness: '', delivery_risks: [], observability: [], documentation_gaps: [], process_improvements: [] },
    refactoring: { target_architecture_options: [], migration_roadmap: [], tech_stack_options: [], quick_wins: [] },
    report_sections: sections,
    open_questions: list(legacy?.open_questions),
    evidence_index: evidenceRefs(legacy),
    report_quality_review: legacy?.report_quality_review
  };
}

export function validateAnalysisV2(value: any): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, missing: ['analysis_json_object'], warnings };
  }
  if (value.schema_version !== '2.0') missing.push('schema_version');
  if (value.analysis_kind !== 'cognianalysis_decision_document') missing.push('analysis_kind');
  if (!['brief', 'blueprint', 'deep', 'complete-audit'].includes(String(value.mode || ''))) missing.push('mode');
  if (!nonEmptyString(value.repo?.name)) missing.push('repo.name');
  if (!nonEmptyString(value.repo?.scope_summary)) missing.push('repo.scope_summary');
  if (!nonEmptyString(value.repo?.analyzed_at)) missing.push('repo.analyzed_at');
  if (!['high', 'medium', 'low'].includes(String(value.confidence?.overall || ''))) missing.push('confidence.overall');
  if (!nonEmptyString(value.confidence?.reason)) missing.push('confidence.reason');
  if (!nonEmptyString(value.executive_decision?.summary)) missing.push('executive_decision.summary');
  if (!nonEmptyString(value.executive_decision?.recommended_action)) missing.push('executive_decision.recommended_action');
  if (!value.functional_view || typeof value.functional_view !== 'object') missing.push('functional_view');
  if (!value.technical_view || typeof value.technical_view !== 'object') missing.push('technical_view');
  if (!value.code_quality_security || typeof value.code_quality_security !== 'object') missing.push('code_quality_security');
  if (!value.process_analysis || typeof value.process_analysis !== 'object') missing.push('process_analysis');
  if (!value.refactoring || typeof value.refactoring !== 'object') missing.push('refactoring');
  if (!Array.isArray(value.report_sections)) missing.push('report_sections');
  if (!Array.isArray(value.open_questions)) missing.push('open_questions');
  if (!Array.isArray(value.evidence_index)) missing.push('evidence_index');
  if (!value.report_sections?.length) warnings.push('report_sections_empty_top_level_views_will_render_default_sections');
  if (!value.report_quality_review) warnings.push('report_quality_review_missing');
  return { valid: missing.length === 0, missing, warnings };
}

export function loadAnalysisDocument(repo: string, analysisDir: string, legacyDocument: any | null, profile: any = {}, modeValue = 'blueprint'): LoadedAnalysisDocument {
  const v2Path = Path.join(analysisDir, 'analysis.json');
  if (FS.existsSync(v2Path)) {
    const analysis = loadJson<any | null>(v2Path, null);
    const validation = validateAnalysisV2(analysis);
    if (analysis && typeof analysis === 'object' && !Array.isArray(analysis)) {
      return {
        source: 'analysis-v2',
        path: v2Path,
        analysis: analysis as AnalysisV2,
        analysis_document: analysisV2ToLegacyAnalysisDocument(analysis as AnalysisV2),
        validation
      };
    }
    return {
      source: 'analysis-v2',
      path: v2Path,
      analysis: null,
      analysis_document: null,
      validation
    };
  }
  if (legacyDocument && typeof legacyDocument === 'object' && !Array.isArray(legacyDocument)) {
    const adapted = legacyAnalysisDocumentToV2(legacyDocument, repo, analysisDir, profile, modeValue);
    return {
      source: 'legacy-analysis-document',
      path: Path.join(analysisDir, 'llm', 'analysis-document.json'),
      analysis: adapted,
      analysis_document: legacyDocument,
      validation: { valid: true, missing: [], warnings: ['adapted_from_legacy_analysis_document'] }
    };
  }
  return {
    source: 'missing',
    analysis: null,
    analysis_document: null,
    validation: { valid: false, missing: ['analysis.json'], warnings: [] }
  };
}

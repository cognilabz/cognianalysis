import { EvidenceReference, EvidenceValidationResult, MajorClaim } from './evidenceTypes';
import { FS, Path, asList, countLines, getLine, readText } from './utils';

export function validateEvidenceReference(repo: string, ev: any, skippedPaths: Set<string> = new Set()): EvidenceReference {
  if (!ev || typeof ev !== 'object' || Array.isArray(ev)) return { path: String(ev || ''), line: 1, valid: false, reason: 'invalid evidence object' };
  const relativePath = String(ev.path || '').trim();
  const line = ev.line === undefined || ev.line === null || ev.line === '' ? 1 : Number(ev.line);
  const repoRoot = Path.resolve(repo);
  const full = Path.resolve(repoRoot, relativePath);
  if (!relativePath || Path.isAbsolute(relativePath) || (full !== repoRoot && !full.startsWith(`${repoRoot}${Path.sep}`))) return { ...ev, line, valid: false, reason: 'path must be relative and stay inside repository' };
  if (skippedPaths.has(relativePath)) return { ...ev, line, valid: false, reason: 'file is skipped from inventory' };
  if (!Number.isInteger(line) || line < 1) return { ...ev, line, valid: false, reason: 'invalid line' };
  if (!FS.existsSync(full)) return { ...ev, line, valid: false, reason: 'file not found' };
  const repoReal = FS.realpathSync(repoRoot);
  const fullReal = FS.realpathSync(full);
  if (fullReal !== repoReal && !fullReal.startsWith(`${repoReal}${Path.sep}`)) return { ...ev, line, valid: false, reason: 'path escapes repository' };
  const lineCount = countLines(full);
  if (lineCount === 0 && line === 1) return { ...ev, line, valid: true, path_only: true, line_count: 0, snippet: '' };
  if (line > lineCount) return { ...ev, line, valid: false, reason: 'line out of range', line_count: lineCount };
  const actualLine = getLine(full, line);
  const declaredSnippet = String(ev.snippet || '').trim();
  if (declaredSnippet) {
    const text = readText(full, 5_000_000).split(/\r?\n/).slice(Math.max(0, line - 3), line + 2).join('\n');
    if (!text.includes(declaredSnippet) && !actualLine.includes(declaredSnippet)) return { ...ev, line, valid: false, reason: 'snippet does not match cited line or nearby context', actual_snippet: actualLine };
  }
  return { ...ev, line, valid: true, snippet: declaredSnippet || actualLine };
}

function evidenceRefs(value: any): EvidenceReference[] {
  return [
    ...asList(value?.evidence),
    ...asList(value?.evidence_refs)
  ].filter((item: any) => item && typeof item === 'object') as EvidenceReference[];
}

function text(value: any, fields: string[]): string {
  for (const field of fields) {
    const candidate = value?.[field];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return '';
}

function claim(idPrefix: string, category: string, item: any, index: number, inheritedEvidence: EvidenceReference[] = [], inheritedGap = ''): MajorClaim | null {
  if (typeof item === 'string' && item.trim()) {
    return {
      id: `${idPrefix}-${index + 1}`,
      category,
      title: item.trim().slice(0, 120),
      summary: item.trim(),
      evidence: inheritedEvidence,
      evidence_gap: inheritedGap,
      open_question: category === 'open_question'
    };
  }
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const title = text(item, ['title', 'name', 'id', 'question', 'recommended_action']) || `${category} ${index + 1}`;
  const summary = text(item, ['summary', 'description', 'rationale', 'recommendation', 'reason', 'impact', 'text']);
  const evidence = evidenceRefs(item).length ? evidenceRefs(item) : inheritedEvidence;
  const evidenceGap = text(item, ['evidence_gap', 'missing_evidence', 'proof_gap']) || inheritedGap;
  const openQuestion = item.blocking !== undefined || !!item.question || category === 'open_question';
  if (!title && !summary && !evidence.length && !evidenceGap) return null;
  return {
    id: String(item.claim_id || item.id || `${idPrefix}-${index + 1}`),
    category,
    title,
    summary,
    evidence,
    evidence_gap: evidenceGap,
    open_question: openQuestion
  };
}

export function collectMajorClaims(analysis: any): MajorClaim[] {
  if (!analysis || typeof analysis !== 'object') return [];
  const claims: MajorClaim[] = [];
  const add = (category: string, items: any, prefix: string, inheritedEvidence: EvidenceReference[] = [], inheritedGap = '') => {
    asList(items).forEach((item, index) => {
      const row = claim(prefix, category, item, index, inheritedEvidence, inheritedGap);
      if (row) claims.push(row);
    });
  };
  const executiveEvidence = evidenceRefs(analysis.executive_decision || {});
  const executiveGap = text(analysis.executive_decision, ['evidence_gap', 'missing_evidence', 'proof_gap']);
  add('executive_recommendation', [{ title: 'Executive summary', summary: analysis.executive_decision?.summary, evidence: executiveEvidence, evidence_gap: executiveGap }], 'executive-summary');
  add('executive_recommendation', [{ title: 'Recommended action', summary: analysis.executive_decision?.recommended_action, evidence: executiveEvidence, evidence_gap: executiveGap }], 'recommended-action');
  add('executive_recommendation', analysis.executive_decision?.decision_options, 'decision-option', executiveEvidence, executiveGap);
  add('process_risk', analysis.executive_decision?.top_risks, 'executive-risk', executiveEvidence, executiveGap);
  add('process_risk', analysis.executive_decision?.next_steps, 'executive-next-step', executiveEvidence, executiveGap);
  const functionalGap = text(analysis.functional_view, ['evidence_gap', 'missing_evidence', 'proof_gap']);
  add('capability_statement', [{ title: 'System purpose', summary: analysis.functional_view?.system_purpose, evidence: evidenceRefs(analysis.functional_view || {}), evidence_gap: functionalGap }], 'system-purpose');
  const technicalGap = text(analysis.technical_view, ['evidence_gap', 'missing_evidence', 'proof_gap']);
  add('architecture_statement', [{ title: 'Architecture summary', summary: analysis.technical_view?.architecture_summary, evidence: evidenceRefs(analysis.technical_view || {}), evidence_gap: technicalGap }], 'architecture-summary');
  add('capability_statement', analysis.functional_view?.actors, 'actor', evidenceRefs(analysis.functional_view || {}), functionalGap);
  add('capability_statement', analysis.functional_view?.capabilities, 'capability', evidenceRefs(analysis.functional_view || {}), functionalGap);
  add('capability_statement', analysis.functional_view?.user_or_system_flows, 'flow', evidenceRefs(analysis.functional_view || {}), functionalGap);
  add('business_process_statement', analysis.functional_view?.business_processes, 'business-process', evidenceRefs(analysis.functional_view || {}), functionalGap);
  add('business_rule_statement', analysis.functional_view?.business_rules, 'business-rule', evidenceRefs(analysis.functional_view || {}), functionalGap);
  add('capability_statement', analysis.functional_view?.e2e_flows, 'e2e-flow', evidenceRefs(analysis.functional_view || {}), functionalGap);
  add('api_interface_statement', analysis.technical_view?.entrypoints, 'entrypoint', evidenceRefs(analysis.technical_view || {}), technicalGap);
  add('api_interface_statement', analysis.technical_view?.apis_and_interfaces, 'interface', evidenceRefs(analysis.technical_view || {}), technicalGap);
  add('api_interface_statement', analysis.technical_view?.request_response_examples, 'request-response-example', evidenceRefs(analysis.technical_view || {}), technicalGap);
  add('architecture_statement', analysis.technical_view?.data_and_state, 'data-state', evidenceRefs(analysis.technical_view || {}), technicalGap);
  add('architecture_statement', analysis.technical_view?.integrations, 'integration', evidenceRefs(analysis.technical_view || {}), technicalGap);
  add('architecture_statement', analysis.technical_view?.deployment_runtime, 'deployment-runtime', evidenceRefs(analysis.technical_view || {}), technicalGap);
  add('architecture_statement', analysis.technical_view?.data_flows, 'data-flow', evidenceRefs(analysis.technical_view || {}), technicalGap);
  add('architecture_statement', analysis.technical_view?.dependencies, 'dependency', evidenceRefs(analysis.technical_view || {}), technicalGap);
  add('architecture_statement', analysis.technical_view?.technology_stack, 'technology-stack', evidenceRefs(analysis.technical_view || {}), technicalGap);
  const qualityGap = text(analysis.code_quality_security, ['evidence_gap', 'missing_evidence', 'proof_gap']);
  add('bug_statement', analysis.code_quality_security?.bugs, 'bug', evidenceRefs(analysis.code_quality_security || {}), qualityGap);
  add('vulnerability_statement', analysis.code_quality_security?.vulnerabilities, 'vulnerability', evidenceRefs(analysis.code_quality_security || {}), qualityGap);
  add('quality_statement', analysis.code_quality_security?.code_quality_findings, 'quality', evidenceRefs(analysis.code_quality_security || {}), qualityGap);
  const processGap = text(analysis.process_analysis, ['evidence_gap', 'missing_evidence', 'proof_gap']);
  add('process_risk', [{ title: 'Test readiness', summary: analysis.process_analysis?.test_readiness, evidence: evidenceRefs(analysis.process_analysis || {}), evidence_gap: processGap }], 'test-readiness');
  add('process_risk', analysis.process_analysis?.delivery_risks, 'delivery-risk', evidenceRefs(analysis.process_analysis || {}), processGap);
  add('process_risk', analysis.process_analysis?.observability, 'observability', evidenceRefs(analysis.process_analysis || {}), processGap);
  add('process_risk', analysis.process_analysis?.documentation_gaps, 'documentation-gap', evidenceRefs(analysis.process_analysis || {}), processGap);
  add('process_risk', analysis.process_analysis?.process_improvements, 'process-improvement', evidenceRefs(analysis.process_analysis || {}), processGap);
  add('business_process_statement', analysis.process_analysis?.implemented_business_processes, 'implemented-business-process', evidenceRefs(analysis.process_analysis || {}), processGap);
  add('business_process_statement', analysis.process_analysis?.process_flows, 'process-flow', evidenceRefs(analysis.process_analysis || {}), processGap);
  add('process_risk', analysis.process_analysis?.workflow_inefficiencies, 'workflow-inefficiency', evidenceRefs(analysis.process_analysis || {}), processGap);
  add('process_risk', analysis.process_analysis?.optimization_opportunities, 'optimization-opportunity', evidenceRefs(analysis.process_analysis || {}), processGap);
  const refactoringGap = text(analysis.refactoring, ['evidence_gap', 'missing_evidence', 'proof_gap']);
  add('refactoring_recommendation', analysis.refactoring?.target_architecture_options, 'target-architecture', evidenceRefs(analysis.refactoring || {}), refactoringGap);
  add('refactoring_recommendation', analysis.refactoring?.migration_roadmap, 'migration-roadmap', evidenceRefs(analysis.refactoring || {}), refactoringGap);
  add('refactoring_recommendation', analysis.refactoring?.tech_stack_options, 'tech-stack', evidenceRefs(analysis.refactoring || {}), refactoringGap);
  add('refactoring_recommendation', analysis.refactoring?.quick_wins, 'quick-win', evidenceRefs(analysis.refactoring || {}), refactoringGap);
  add('open_question', analysis.open_questions, 'open-question');
  return claims;
}

function walkEvidence(value: any, out: EvidenceReference[]): void {
  if (Array.isArray(value)) {
    for (const item of value) walkEvidence(item, out);
    return;
  }
  if (!value || typeof value !== 'object') return;
  out.push(...evidenceRefs(value));
  for (const [key, child] of Object.entries(value)) {
    if (key !== 'evidence' && key !== 'evidence_refs') walkEvidence(child, out);
  }
}

function dedupeEvidence(items: EvidenceReference[]): EvidenceReference[] {
  const seen = new Set<string>();
  const out: EvidenceReference[] = [];
  for (const item of items) {
    const key = `${item.path || ''}:${item.line || 1}:${item.symbol || ''}:${item.claim_id || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function validateEvidenceTree(repo: string, analysis: any, skippedPaths: Set<string> = new Set()): EvidenceValidationResult {
  const evidence: EvidenceReference[] = [];
  walkEvidence(analysis, evidence);
  if (Array.isArray(analysis?.evidence_index)) {
    evidence.push(...analysis.evidence_index.filter((item: any) => item && typeof item === 'object'));
  }
  const validated = dedupeEvidence(evidence).map(item => validateEvidenceReference(repo, item, skippedPaths));
  const claims = collectMajorClaims(analysis);
  const unsupported = claims.filter(item => !item.evidence.length && !item.evidence_gap && !item.open_question);
  return {
    valid: validated.every(item => item.valid !== false) && unsupported.length === 0,
    evidence: validated,
    invalid_evidence: validated.filter(item => item.valid === false),
    major_claims: claims,
    unsupported_claims: unsupported
  };
}

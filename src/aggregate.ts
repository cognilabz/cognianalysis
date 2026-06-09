import { CodeMap } from './types';
import { Path, asList, ensureDir, getLine, loadJson, mergeDict, writeJson } from './utils';
import { computeTargetCoverage, TARGET_CAPABILITIES } from './targetCoverage';

export function prepareAnalysis(repo: string, analysisDir: string, codeMap: CodeMap): void {
  const dataDir = Path.join(analysisDir, 'data');
  ensureDir(dataDir);
  writeJson(Path.join(dataDir, 'repo-profile.json'), codeMap.profile);
  writeJson(Path.join(dataDir, 'code-map.json'), codeMap);
  writeJson(Path.join(analysisDir, 'source-capsules.json'), codeMap.capsules || []);
  writeJson(Path.join(dataDir, 'interface-signals.json'), codeMap.signals || []);
  writeJson(Path.join(dataDir, 'important-docs.json'), codeMap.important_docs || []);
  writeJson(Path.join(dataDir, 'target-coverage.json'), TARGET_CAPABILITIES);
}

export function aggregate(repo: string, analysisDir: string): any {
  const dataDir = Path.join(analysisDir, 'data');
  const codeMap = loadJson<any>(Path.join(dataDir, 'code-map.json'), {});
  const profile = codeMap.profile || { repo_name: Path.basename(repo), root: repo };
  const llm = loadLlmOutputs(Path.join(analysisDir, 'llm'));

  const assessment = llm.assessment || fallbackAssessment(codeMap);
  const capabilities = asList(llm.capabilities);
  const interfaces = asList(llm.interfaces);
  const flows = asList(llm.flows);
  const businessLogic = asList(llm.business_logic);
  const domainModel = llm.domain_model || fallbackDomainModel(codeMap);
  const dataModel = llm.data_model || fallbackDataModel(codeMap);
  const integrations = asList(llm.integrations);
  const sideEffects = asList(llm.side_effects);
  const architecture = llm.architecture || fallbackArchitecture(codeMap);
  const process = llm.process || fallbackProcess(codeMap);
  const quality = llm.quality || fallbackQuality(codeMap);
  const findings = asList(llm.findings);
  const refactoring = asList(llm.refactoring);
  const modernization = asList(llm.modernization);
  const documentation = llm.documentation || fallbackDocumentation(codeMap);

  const hasSemanticOutput = hasAssessmentContent(llm) || capabilities.length || interfaces.length || flows.length || hasDocContent(documentation) || businessLogic.length || integrations.length || refactoring.length;
  const status = hasSemanticOutput
    ? { state: 'llm_extracted', message: 'Report contains Codex/LLM-extracted semantic data merged with the code map, examples and evidence.' }
    : { state: 'awaiting_llm_extraction', message: 'Codex/LLM extraction has not been run yet. The report shows repo map, target coverage, source capsules, documentation candidates and broad signals only.' };

  const bundle: any = {
    profile,
    status,
    extraction_policy: codeMap.extraction_policy,
    modules: codeMap.modules || [],
    files: (codeMap.files || []).slice(0, 1200),
    signals: (codeMap.signals || []).slice(0, 3000),
    symbols: (codeMap.symbols || []).slice(0, 5000),
    glossary_terms: codeMap.glossary_terms || [],
    capsules: codeMap.capsules || [],
    important_docs: codeMap.important_docs || [],
    assessment: validateNested(repo, assessment),
    capabilities: validateItems(repo, capabilities),
    interfaces: validateItems(repo, interfaces),
    flows: validateItems(repo, flows),
    business_logic: validateItems(repo, businessLogic),
    domain_model: validateNested(repo, domainModel),
    data_model: validateNested(repo, dataModel),
    integrations: validateItems(repo, integrations),
    side_effects: validateItems(repo, sideEffects),
    architecture: validateNested(repo, architecture),
    process: validateNested(repo, process),
    quality: validateNested(repo, quality),
    findings: validateItems(repo, findings),
    refactoring: validateItems(repo, refactoring),
    modernization: validateItems(repo, modernization),
    documentation: validateNested(repo, documentation),
    tasks: loadJson<any>(Path.join(analysisDir, 'task-manifest.json'), { tasks: [] }).tasks || []
  };

  let evidence: any[] = [];
  for (const key of ['capabilities','interfaces','flows','business_logic','integrations','side_effects','findings','refactoring','modernization']) evidence = evidence.concat(collectEvidence(bundle[key] || []));
  for (const key of ['assessment','domain_model','data_model','architecture','process','quality','documentation']) evidence = evidence.concat(collectEvidence(bundle[key] || {}));
  bundle.evidence_index = dedupeEvidence(evidence);
  bundle.target_coverage = computeTargetCoverage(bundle);

  ensureDir(dataDir);
  writeJson(Path.join(dataDir, 'bundle.json'), bundle);
  writeJson(Path.join(dataDir, 'evidence.json'), bundle.evidence_index);
  writeJson(Path.join(dataDir, 'target-coverage.json'), bundle.target_coverage);
  return bundle;
}

export function loadBundle(analysisDir: string): any {
  const bundlePath = Path.join(analysisDir, 'data', 'bundle.json');
  const bundle = loadJson<any | null>(bundlePath, null);
  if (bundle) return bundle;
  const codeMap = loadJson<any>(Path.join(analysisDir, 'data', 'code-map.json'), {});
  const root = codeMap.profile?.root || process.cwd();
  return aggregate(root, analysisDir);
}

function loadLlmOutputs(llmDir: string): any {
  const result: any = {};
  if (!require('node:fs').existsSync(llmDir)) return result;
  const fs = require('node:fs');
  const files = fs.readdirSync(llmDir).filter((f: string) => f.endsWith('.json')).sort();
  for (const f of files) {
    const data = loadJson<any>(Path.join(llmDir, f), {});
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
    for (const key of ['capabilities','interfaces','flows','business_logic','findings','refactoring','modernization','integrations','side_effects']) {
      if (key in data) {
        if (!Array.isArray(result[key])) result[key] = [];
        result[key].push(...asList(data[key]));
      }
    }
    for (const key of ['assessment','architecture','documentation','domain_model','data_model','process','quality']) {
      if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
        if (!result[key]) result[key] = {};
        mergeDict(result[key], data[key]);
      }
    }
    const docKeys = ['openapi','soap','request_response_examples','mermaid_flows','business_logic_examples','function_examples','contract_examples','use_case_examples'];
    if (docKeys.some(k => k in data)) {
      if (!result.documentation) result.documentation = {};
      for (const key of docKeys) {
        if (!(key in data)) continue;
        if (Array.isArray(data[key])) {
          if (!Array.isArray(result.documentation[key])) result.documentation[key] = [];
          result.documentation[key].push(...data[key]);
        } else if (data[key] && typeof data[key] === 'object') {
          if (!result.documentation[key] || typeof result.documentation[key] !== 'object' || Array.isArray(result.documentation[key])) result.documentation[key] = {};
          mergeDict(result.documentation[key], data[key]);
        } else {
          result.documentation[key] = data[key];
        }
      }
    }
    const aliases: [string, string][] = [
      ['business_capabilities', 'capabilities'], ['api_interfaces', 'interfaces'], ['api_docs', 'interfaces'], ['contracts', 'interfaces'], ['documentation_examples', 'documentation'],
      ['business_rules', 'business_logic'], ['domain', 'domain_model'], ['data', 'data_model'], ['operations', 'process'], ['readiness', 'process'], ['quality_assessment', 'quality'],
      ['risks', 'findings'], ['recommendations', 'refactoring']
    ];
    for (const [alias, target] of aliases) {
      if (!(alias in data)) continue;
      if (['documentation','domain_model','data_model','process','quality'].includes(target) && data[alias] && typeof data[alias] === 'object' && !Array.isArray(data[alias])) {
        if (!result[target]) result[target] = {};
        mergeDict(result[target], data[alias]);
      } else {
        if (!Array.isArray(result[target])) result[target] = [];
        result[target].push(...asList(data[alias]));
      }
    }
  }
  return result;
}

function validateItems(repo: string, items: any[]): any[] {
  return items.map(item => validateNested(repo, item));
}

function validateNested(repo: string, value: any): any {
  if (Array.isArray(value)) return value.map(x => validateNested(repo, x));
  if (!value || typeof value !== 'object') return value;
  const out: any = {};
  for (const [key, v] of Object.entries(value)) {
    if (key === 'evidence' && Array.isArray(v)) out[key] = v.map(ev => validateEvidence(repo, ev));
    else out[key] = validateNested(repo, v);
  }
  return out;
}

function validateEvidence(repo: string, ev: any): any {
  if (!ev || typeof ev !== 'object') return { path: String(ev), line: 1, valid: false, reason: 'invalid evidence object' };
  const relativePath = String(ev.path || '');
  const line = Number(ev.line || 1);
  const full = Path.join(repo, relativePath);
  const fs = require('node:fs');
  if (!relativePath || relativePath.includes('..')) return { ...ev, line, valid: false, reason: 'invalid path' };
  if (!fs.existsSync(full)) return { ...ev, line, valid: false, reason: 'file not found' };
  const snippet = getLine(full, line);
  if (!snippet && line > 1) return { ...ev, line, valid: false, reason: 'line not found' };
  return { ...ev, line, valid: true, snippet };
}

function collectEvidence(value: any): any[] {
  const out: any[] = [];
  function walk(v: any): void {
    if (Array.isArray(v)) { for (const x of v) walk(x); return; }
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v.evidence)) out.push(...v.evidence);
    for (const [k, child] of Object.entries(v)) if (k !== 'evidence') walk(child);
  }
  walk(value);
  return out;
}

function dedupeEvidence(items: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const e of items) {
    const key = `${e.path || ''}:${e.line || 1}:${e.symbol || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out.sort((a, b) => String(a.path || '').localeCompare(String(b.path || '')) || Number(a.line || 1) - Number(b.line || 1));
}

function hasAssessmentContent(llm: any): boolean {
  return !!(llm.assessment && Object.keys(llm.assessment).length) || !!(llm.domain_model && Object.keys(llm.domain_model).length) || !!(llm.process && Object.keys(llm.process).length);
}

function hasDocContent(doc: any): boolean {
  if (!doc || typeof doc !== 'object') return false;
  return ['openapi','soap','request_response_examples','mermaid_flows','business_logic_examples','function_examples','contract_examples'].some(k => asList(doc[k]).length > 0);
}

function fallbackAssessment(codeMap: any): any {
  return {
    executive_summary: 'Semantic extraction is pending. Run Codex with the codebase-assessment skill to populate business logic, interfaces, examples, flows, process readiness and refactoring data.',
    system_purpose: 'Pending LLM extraction.',
    assessment_scope: ['Repository profile', 'Code map', 'documentation and contract candidates'],
    key_capabilities: [], key_interfaces: [], top_risks: [],
    completeness: { business_logic: 'pending', interfaces: 'pending', flows: 'pending', examples: 'pending', process_readiness: 'pending' },
    recommended_next_steps: [{ title: 'Run the main Codex skill', reason: 'Execute .analysis/llm_tasks and write JSON to .analysis/llm/.', evidence: [] }],
    open_questions: ['Business behavior has not yet been extracted by Codex.']
  };
}

function fallbackArchitecture(codeMap: any): any {
  return { summary: 'Pending LLM architecture assessment. The code map lists modules and signals as navigation hints only.', style: codeMap.profile?.repo_type || 'unknown', modules: (codeMap.modules || []).slice(0, 12), observations: [], mermaid: '' };
}

function fallbackDomainModel(codeMap: any): any {
  return { glossary: (codeMap.glossary_terms || []).slice(0, 40).map((term: string) => ({ term, meaning: 'Candidate domain term. Meaning pending LLM extraction.', evidence: [] })), entities: [], state_models: [] };
}

function fallbackDataModel(codeMap: any): any {
  return { entities: [], stores: [], state_changes: [] };
}

function fallbackProcess(codeMap: any): any {
  return { summary: 'Pending process/readiness extraction.', tests: { status: (codeMap.profile?.test_files || 0) > 0 ? 'partial' : 'unknown', evidence: [], observations: [] }, ci_cd: { status: 'unknown', evidence: [], observations: [] }, release: { status: 'unknown', evidence: [], observations: [] }, observability: { status: 'unknown', evidence: [], observations: [] }, configuration: { status: 'unknown', evidence: [], observations: [] }, local_setup: { status: 'unknown', evidence: [], observations: [] }, open_questions: [] };
}

function fallbackQuality(codeMap: any): any {
  return { summary: 'Pending quality/readiness assessment.', strengths: [], risks: [], testability: [] };
}

function fallbackDocumentation(codeMap: any): any {
  return { summary: 'Pending documentation/example extraction.', openapi: [], soap: [], request_response_examples: [], mermaid_flows: [], business_logic_examples: [], function_examples: [], report_completeness_notes: [] };
}

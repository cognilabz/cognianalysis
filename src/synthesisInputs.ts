import { loadShards } from './shards';
import { validateEvidenceTree } from './evidence';
import { FS, Path, asList, loadJson, writeJson } from './utils';

export interface SynthesisInputOptions {
  writeDataAlias?: boolean;
}

function evidenceRefs(value: any): any[] {
  const out: any[] = [];
  function walk(item: any): void {
    if (Array.isArray(item)) {
      for (const child of item) walk(child);
      return;
    }
    if (!item || typeof item !== 'object') return;
    if (Array.isArray(item.evidence)) out.push(...item.evidence);
    if (Array.isArray(item.evidence_refs)) out.push(...item.evidence_refs);
    for (const [key, child] of Object.entries(item)) {
      if (key !== 'evidence' && key !== 'evidence_refs') walk(child);
    }
  }
  walk(value);
  return out;
}

function openQuestions(value: any): any[] {
  const out: any[] = [];
  function walk(item: any): void {
    if (Array.isArray(item)) {
      for (const child of item) walk(child);
      return;
    }
    if (!item || typeof item !== 'object') return;
    if (Array.isArray(item.open_questions)) out.push(...item.open_questions);
    for (const [key, child] of Object.entries(item)) {
      if (key !== 'open_questions') walk(child);
    }
  }
  walk(value);
  return out;
}

function claimsById(value: any): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  function walk(item: any): void {
    if (Array.isArray(item)) {
      for (const child of item) walk(child);
      return;
    }
    if (!item || typeof item !== 'object') return;
    const id = String(item.claim_id || item.id || '').trim();
    const verdict = String(item.verdict || item.status || item.recommendation || '').trim();
    if (id && verdict) {
      if (!map.has(id)) map.set(id, new Set());
      map.get(id)!.add(verdict);
    }
    for (const child of Object.values(item)) walk(child);
  }
  walk(value);
  return map;
}

export function buildSynthesisInput(repo: string, analysisDir: string, inventorySummary: any = {}, options: SynthesisInputOptions = {}): any {
  const manifest = loadJson<any>(Path.join(analysisDir, 'workpack-manifest.json'), { workpacks: [] });
  const requiredOutputs = asList(manifest.workpacks).filter((item: any) => item.required !== false).map((item: any) => String(item.output_path || '').replace(/^\.analysis\//, ''));
  const shards = loadShards(analysisDir);
  const presentPaths = new Set(shards.map(item => item.path));
  const scannerFindings = loadJson<any>(Path.join(analysisDir, 'scanner-findings.json'), loadJson<any>(Path.join(analysisDir, 'data', 'scanner-findings.json'), null));
  const shardEvidence = shards.flatMap(item => evidenceRefs(item.data));
  const shardOpenQuestions = shards.flatMap(item => openQuestions(item.data));
  const validation = validateEvidenceTree(repo, { shards: shards.map(item => item.data) });
  const claimMap = claimsById(shards.map(item => item.data));
  const contradictionCandidates = Array.from(claimMap.entries())
    .filter(([, verdicts]) => verdicts.size > 1)
    .map(([claim_id, verdicts]) => ({ claim_id, verdicts: Array.from(verdicts).sort() }));
  const synthesis = {
    schema_version: '2.0',
    kind: 'synthesis_input',
    shards_present: shards.map(item => ({ path: item.path, shard_kind: item.shard_kind, valid: item.errors.length === 0, errors: item.errors })),
    shards_missing: requiredOutputs.filter(path => path.startsWith('shards/') && !presentPaths.has(path)),
    evidence_index: shardEvidence,
    unsupported_claim_candidates: validation.unsupported_claims,
    contradiction_candidates: contradictionCandidates,
    open_questions: shardOpenQuestions,
    scanner_findings: scannerFindings?.findings || [],
    scanner_product_filter: scannerFindings?.product_filter || null,
    scanner_triage_findings: scannerFindings?.triage_findings || [],
    scanner_filtered_out_findings: scannerFindings?.filtered_out_findings || [],
    inventory_summary: inventorySummary
  };
  writeJson(Path.join(analysisDir, 'synthesis-input.json'), synthesis);
  if (options.writeDataAlias === true) writeJson(Path.join(analysisDir, 'data', 'synthesis-input.json'), synthesis);
  return synthesis;
}

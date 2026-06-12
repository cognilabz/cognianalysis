export interface AnalysisEvidenceRef {
  path: string;
  line?: number;
  symbol?: string;
  snippet?: string;
  claim_id?: string;
  valid?: boolean;
  reason?: string;
}

export interface EvidenceGap {
  reason: string;
  impact?: string;
  follow_up?: string;
}

export function evidenceRefs(value: any): AnalysisEvidenceRef[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object') as AnalysisEvidenceRef[];
  if (Array.isArray(value.evidence)) return evidenceRefs(value.evidence);
  if (Array.isArray(value.evidence_refs)) return evidenceRefs(value.evidence_refs);
  return [];
}

export interface EvidenceReference {
  path: string;
  line?: number;
  symbol?: string;
  snippet?: string;
  claim_id?: string;
  valid?: boolean;
  reason?: string;
}

export interface MajorClaim {
  id: string;
  category: string;
  title: string;
  summary: string;
  evidence: EvidenceReference[];
  evidence_gap?: string;
  open_question?: boolean;
}

export interface EvidenceValidationResult {
  valid: boolean;
  evidence: EvidenceReference[];
  invalid_evidence: EvidenceReference[];
  major_claims: MajorClaim[];
  unsupported_claims: MajorClaim[];
}

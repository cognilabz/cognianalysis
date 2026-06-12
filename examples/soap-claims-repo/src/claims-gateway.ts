export type ClaimDecision = 'APPROVE' | 'REFER' | 'REJECT';

export class ClaimsGateway {
  submitClaimCase(request: { claimId: string; policyId: string; amount: number }): ClaimDecision {
    if (request.amount > 25000) return 'REFER';
    if (!request.policyId) return 'REJECT';
    return 'APPROVE';
  }
}

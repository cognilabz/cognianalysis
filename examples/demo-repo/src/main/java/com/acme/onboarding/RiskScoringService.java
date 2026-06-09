package com.acme.onboarding;

import org.springframework.stereotype.Service;

@Service
public class RiskScoringService {
    public int calculateScore(OnboardingRequest request, KycResult kyc) {
        int score = 20;
        if (!kyc.approved()) {
            score += 60;
        }
        if (request.referralCode() == null || request.referralCode().isBlank()) {
            score += 15;
        }
        return score;
    }
}

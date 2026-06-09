package com.acme.onboarding;

public record OnboardingResponse(String customerId, CustomerStatus status, int riskScore, String kycReference) {
    public static OnboardingResponse from(OnboardingResult result) {
        return new OnboardingResponse(result.customerId(), result.status(), result.riskScore(), result.kycReference());
    }
}

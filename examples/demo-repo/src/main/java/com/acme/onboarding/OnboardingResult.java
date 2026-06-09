package com.acme.onboarding;

public record OnboardingResult(String customerId, CustomerStatus status, int riskScore, String kycReference) {}

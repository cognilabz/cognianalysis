package com.acme.onboarding;

public record OnboardingStatusResponse(String customerId, CustomerStatus status, String reviewReason) {}

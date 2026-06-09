package com.acme.onboarding;

import java.time.LocalDate;

public record KycRequest(String firstName, String lastName, LocalDate birthDate) {}

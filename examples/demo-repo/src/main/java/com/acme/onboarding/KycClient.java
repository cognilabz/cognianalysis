package com.acme.onboarding;

import java.time.LocalDate;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class KycClient {
    private final RestTemplate restTemplate = new RestTemplate();

    public KycResult verifyIdentity(String firstName, String lastName, LocalDate birthDate) {
        KycRequest request = new KycRequest(firstName, lastName, birthDate);
        return restTemplate.postForObject("https://kyc.example.local/verify", request, KycResult.class);
    }
}

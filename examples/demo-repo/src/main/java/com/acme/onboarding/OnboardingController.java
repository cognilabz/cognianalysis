package com.acme.onboarding;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/customers")
public class OnboardingController {
    private final OnboardingService onboardingService;

    public OnboardingController(OnboardingService onboardingService) {
        this.onboardingService = onboardingService;
    }

    @PostMapping("/onboard")
    public ResponseEntity<OnboardingResponse> onboard(@Valid @RequestBody OnboardingRequest request) {
        OnboardingResult result = onboardingService.startOnboarding(request);
        return ResponseEntity.accepted().body(OnboardingResponse.from(result));
    }

    @GetMapping("/{customerId}/status")
    public ResponseEntity<OnboardingStatusResponse> status(@PathVariable String customerId) {
        return ResponseEntity.ok(onboardingService.getStatus(customerId));
    }
}

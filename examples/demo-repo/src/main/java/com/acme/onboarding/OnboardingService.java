package com.acme.onboarding;

import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OnboardingService {
    private final CustomerRepository customerRepository;
    private final KycClient kycClient;
    private final RiskScoringService riskScoringService;
    private final OnboardingEventPublisher eventPublisher;

    public OnboardingService(CustomerRepository customerRepository, KycClient kycClient,
                             RiskScoringService riskScoringService, OnboardingEventPublisher eventPublisher) {
        this.customerRepository = customerRepository;
        this.kycClient = kycClient;
        this.riskScoringService = riskScoringService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public OnboardingResult startOnboarding(OnboardingRequest request) {
        if (customerRepository.existsByEmail(request.email())) {
            throw new DuplicateCustomerException(request.email());
        }
        KycResult kyc = kycClient.verifyIdentity(request.firstName(), request.lastName(), request.birthDate());
        int riskScore = riskScoringService.calculateScore(request, kyc);
        Customer customer = Customer.pending(request.email(), request.firstName(), request.lastName(), Instant.now());
        if (!kyc.approved() || riskScore > 70) {
            customer.markManualReview(riskScore, kyc.reference());
        } else {
            customer.activate(riskScore, kyc.reference());
        }
        Customer saved = customerRepository.save(customer);
        eventPublisher.publishOnboardingStarted(saved.id(), saved.status());
        return new OnboardingResult(saved.id(), saved.status(), riskScore, kyc.reference());
    }

    public OnboardingStatusResponse getStatus(String customerId) {
        Customer customer = customerRepository.findById(customerId)
            .orElseThrow(() -> new CustomerNotFoundException(customerId));
        return new OnboardingStatusResponse(customer.id(), customer.status(), customer.reviewReason());
    }
}

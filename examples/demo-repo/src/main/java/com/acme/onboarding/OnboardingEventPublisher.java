package com.acme.onboarding;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class OnboardingEventPublisher {
    private final KafkaTemplate<String, OnboardingStartedEvent> kafkaTemplate;

    public OnboardingEventPublisher(KafkaTemplate<String, OnboardingStartedEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishOnboardingStarted(String customerId, CustomerStatus status) {
        OnboardingStartedEvent event = new OnboardingStartedEvent(customerId, status.name());
        kafkaTemplate.send("customer.onboarding.started", customerId, event);
    }
}

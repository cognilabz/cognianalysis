package com.acme.onboarding;

import java.time.Instant;

public class Customer {
    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private CustomerStatus status;
    private String reviewReason;
    private int riskScore;
    private String kycReference;
    private Instant createdAt;

    public static Customer pending(String email, String firstName, String lastName, Instant createdAt) {
        Customer customer = new Customer();
        customer.email = email;
        customer.firstName = firstName;
        customer.lastName = lastName;
        customer.status = CustomerStatus.PENDING;
        customer.createdAt = createdAt;
        return customer;
    }

    public void markManualReview(int riskScore, String kycReference) {
        this.status = CustomerStatus.MANUAL_REVIEW;
        this.reviewReason = "KYC rejected or risk score above threshold";
        this.riskScore = riskScore;
        this.kycReference = kycReference;
    }

    public void activate(int riskScore, String kycReference) {
        this.status = CustomerStatus.ACTIVE;
        this.riskScore = riskScore;
        this.kycReference = kycReference;
    }

    public String id() { return id; }
    public CustomerStatus status() { return status; }
    public String reviewReason() { return reviewReason; }
}

package com.acme.onboarding;

public class DuplicateCustomerException extends RuntimeException {
    public DuplicateCustomerException(String email) {
        super("Customer already exists: " + email);
    }
}

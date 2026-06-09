# Customer Onboarding Flows

## REST onboarding example

Example request:

```json
{
  "email": "ada.lovelace@example.com",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "birthDate": "1815-12-10",
  "referralCode": "FRIEND-42"
}
```

Example response:

```json
{
  "customerId": "cst_123",
  "status": "ACTIVE",
  "riskScore": 20,
  "kycReference": "kyc_789"
}
```

## Mermaid sequence

```mermaid
sequenceDiagram
  participant Client
  participant API as OnboardingController
  participant Service as OnboardingService
  participant KYC as KycClient
  participant Repo as CustomerRepository
  participant Kafka as OnboardingEventPublisher
  Client->>API: POST /customers/onboard
  API->>Service: startOnboarding(request)
  Service->>KYC: verifyIdentity(firstName,lastName,birthDate)
  Service->>Service: calculate risk score
  Service->>Repo: save(customer)
  Service->>Kafka: publish customer.onboarding.started
  Service-->>API: OnboardingResult
  API-->>Client: 202 OnboardingResponse
```

## Business rule example

If the KYC provider rejects the identity or the risk score is above 70, the customer is marked for manual review. Otherwise the customer is activated.

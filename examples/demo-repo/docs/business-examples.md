# Business examples

## Low risk onboarding

Request:

```json
{
  "email": "ada@example.com",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "birthDate": "1990-01-20",
  "referralCode": "FRIEND"
}
```

Expected result: customer is activated when KYC is approved and risk score is at most 70.

## Manual review onboarding

Expected result: customer is marked for manual review when KYC is rejected or risk score is above 70.

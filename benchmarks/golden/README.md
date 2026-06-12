# Golden Suites

Golden suites define expected repository facts and minimum metrics for deterministic benchmark verification.

Current representative suites:

- `demo-repo`: REST/OpenAPI service
- `soap-claims-repo`: SOAP/WSDL service
- `event-inventory-repo`: event-driven service
- `fullstack-booking-repo`: frontend/backend app
- `legacy-billing-repo`: legacy monolith

The v2 verifier reads the expected files and existing report bundles, then writes a result snapshot with fact recall, evidence precision, unsupported claim rate and decision-readiness/completeness context.

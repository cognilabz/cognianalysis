# Raw Agent Prompt Baseline

This baseline was manually captured from a direct agent prompt against examples/demo-repo without the Cognianalysis harness.

Observed facts:
- POST /customers/onboard is the onboarding creation endpoint.
- customer.onboarding.started is emitted by the onboarding flow.
- Risk threshold is hard-coded in the service behavior.

Claim review:
The report should cite source evidence for interface and risk claims. This baseline mentions evidence expectations but does not render a full decision document.

Decision review:
Use this repo as automation pilot? Yes, because the compact service exposes REST, event and risk-policy behavior for comparison.

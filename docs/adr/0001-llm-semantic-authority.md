# ADR-0001: LLM Semantic Authority

## Status

Accepted for the v0.8 product direction.

## Context

Cognianalysis is useful when it helps an existing agent harness produce evidence-backed codebase understanding. The product loses that shape if deterministic code starts pretending that filenames, imports, symbols, framework hints or keyword matches are proof of behavior.

The current implementation already keeps `repoMap.ts` inventory-only and records that deterministic parsing is disabled. This ADR makes that boundary a product decision.

## Decision

Cognianalysis does not semantically analyze code through deterministic parsers.

The CLI only performs:

- source inventory
- context packaging
- workpack generation
- JSON/schema checks
- file:line evidence validation
- deterministic merge bookkeeping
- report rendering

The active agent harness / LLM performs:

- functional understanding
- technical interpretation
- architecture reasoning
- business-flow extraction
- bug/security/process/refactoring judgement
- final report authoring
- confidence and readiness judgement

## Non-goals

- no import graph as semantic truth
- no symbol graph as semantic truth
- no framework detection as semantic truth
- no deterministic bug scanner
- no direct LLM API runtime
- no hidden semantic scoring

## Consequences

Deterministic artifacts may guide navigation, verify contracts and expose evidence gaps. They must not decide whether a repository has a capability, architecture, vulnerability, business rule, readiness level or recommended migration path.

When evidence is weak, the LLM-authored report must show uncertainty, limitations or open questions. Deterministic code must not fill the gap with generated certainty.

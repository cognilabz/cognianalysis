import assert from 'node:assert/strict';
import { computeProductReadiness } from '../dist/productReadiness.js';

const ev = { path: 'src/example.ts', line: 1 };
const marketProof = {
  goldenExpected: ['api', 'ui', 'cli', 'infra', 'library'],
  passedGoldenRepos: 5,
  totalGoldenRepos: 5,
  baselineAggregate: { verdict: 'pass' },
  strictReady: true,
  strictFailures: []
};

function trace(label, status = 'covered', evidence = [ev]) {
  return { label, status, evidence };
}

function baseBundle() {
  return {
    final_llm_readiness: { state: 'ready' },
    analysis_document_requirements_trace_contract: {
      complete: true,
      requirements: [
        trace('Functional View'),
        trace('Technical View'),
        trace('Code Analysis'),
        trace('Process Analysis'),
        trace('Refactoring / Target Architecture')
      ]
    },
    analysis_goal_trace_alignment: { complete: true },
    documentation: {
      request_response_examples: [{ title: 'Example', evidence: [ev] }]
    },
    process: {
      tests: { status: 'partial', evidence: [ev] }
    },
    quality: {
      risks: [{ title: 'Authentication is not visible', evidence: [ev] }]
    },
    findings: [
      { category: 'security', title: 'Authentication gap', evidence: [ev] }
    ],
    refactoring: [{ title: 'Extract boundary', evidence: [ev] }],
    analysis_document: {
      sections: [
        { id: 'functional', blocks: [{ type: 'flow', evidence: [ev] }] },
        { id: 'technical', blocks: [{ type: 'boundary_map', evidence: [ev] }] },
        { id: 'quality', intent: 'Security and quality findings', blocks: [{ type: 'statement_list', items: [{ title: 'Authentication gap', evidence: [ev] }] }] },
        { id: 'roadmap', blocks: [{ type: 'roadmap', evidence: [ev] }] }
      ]
    },
    analysis_document_executive_decision_layer: { complete: true },
    analysis_document_quality_review: { complete: true },
    analysis_document_evidence_strength: {
      complete: true,
      unsupported_major_claims: []
    },
    analysis_document_report_lint: {
      complete: true,
      unsupported_claim_count: 0
    },
    evidence_index: [{ ...ev, valid: true }],
    product_artifact_model: {
      model: 'thin_llm_first_harness',
      complete: true
    },
    simplified_harness_contract: { complete: true },
    parallel_orchestration_contract: { complete: true }
  };
}

function readiness(bundle) {
  return computeProductReadiness('/repo', '/repo/.analysis', bundle, marketProof);
}

function missingIds(result) {
  return result.missing.map(item => item.id);
}

{
  const result = readiness(baseBundle());
  assert.equal(result.ready, true, 'complete synthetic bundle should satisfy product readiness');
  assert.equal(result.verdict, 'PRODUCT_READY');
}

{
  const bundle = baseBundle();
  bundle.documentation = {};
  bundle.interfaces = [{ id: 'http-api', evidence: [ev] }];
  const result = readiness(bundle);
  assert(missingIds(result).includes('examples_view'), 'interface evidence without example artifacts must not satisfy examples_view');
}

{
  const bundle = baseBundle();
  bundle.process = {};
  bundle.analysis_document_requirements_trace_contract.requirements = bundle.analysis_document_requirements_trace_contract.requirements
    .filter(item => item.label !== 'Process Analysis')
    .concat(trace('Process Analysis', 'open', []));
  const result = readiness(bundle);
  assert(missingIds(result).includes('process_view'), 'empty process object must not satisfy process_view');
}

{
  const bundle = baseBundle();
  bundle.quality = { risks: [{ title: 'Maintainability issue', evidence: [ev] }] };
  bundle.findings = [{ category: 'maintainability', title: 'Duplication risk', evidence: [ev] }];
  bundle.analysis_document.sections = bundle.analysis_document.sections.filter(section => section.id !== 'quality');
  const result = readiness(bundle);
  assert(missingIds(result).includes('quality_security_view'), 'quality evidence without explicit security coverage must not satisfy quality_security_view');
}

{
  const bundle = baseBundle();
  bundle.analysis_document_evidence_strength = {
    complete: false,
    unsupported_major_claims: ['decision#unsupported']
  };
  const result = readiness(bundle);
  assert(missingIds(result).includes('evidence_backed'), 'unsupported major claims must fail evidence_backed');
  const evidenceCheck = result.checks.find(item => item.id === 'evidence_backed');
  assert(evidenceCheck.evidence.includes('unsupported_major=1'), 'evidence_backed diagnostic must count unsupported major claims');
}

console.log('verify-product-readiness: synthetic readiness false-positive checks passed');

import assert from 'node:assert/strict';
import { computeProductReadiness } from '../dist/productReadiness.js';

const ev = { path: 'src/example.ts', line: 1 };
const evRef = 'src/example.ts:1';
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

function traceRef(label, status = 'covered', evidence_refs = [evRef]) {
  return { label, status, evidence_refs };
}

function baseBundle() {
  return {
    final_llm_readiness: { state: 'ready' },
    analysis_document_requirements_trace_contract: {
      complete: true,
      requirements: [
        trace('Reverse Engineering & Documentation'),
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
  delete bundle.process;
  bundle.analysis_document_requirements_trace_contract.requirements = bundle.analysis_document_requirements_trace_contract.requirements
    .filter(item => item.label !== 'Process Analysis')
    .concat(trace('Process Analysis', 'covered', [ev]));
  const result = readiness(bundle);
  assert(!missingIds(result).includes('process_view'), 'evidence-backed process trace must satisfy process_view even without a process object');
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
  bundle.quality = { risks: [{ title: 'Maintainability issue', evidence: [ev] }] };
  bundle.findings = [{ category: 'maintainability', title: 'Duplication risk', evidence: [ev] }];
  bundle.analysis_document.sections = [
    { id: 'quality', intent: 'Security and quality findings', blocks: [{ type: 'statement_list', items: [{ title: 'Duplication risk', evidence: [ev] }] }] }
  ];
  const result = readiness(bundle);
  assert(missingIds(result).includes('quality_security_view'), 'parent section security wording with only nested maintainability evidence must not satisfy quality_security_view');
}

{
  const bundle = baseBundle();
  bundle.analysis_document_requirements_trace_contract.requirements = bundle.analysis_document_requirements_trace_contract.requirements
    .filter(item => item.label !== 'Functional View')
    .concat(trace('Functional View', 'open', []));
  bundle.analysis_document.sections = [{ id: 'functional', blocks: [{ type: 'flow' }] }];
  const result = readiness(bundle);
  assert(missingIds(result).includes('functional_reverse_engineering'), 'flow block without evidence must not satisfy functional_reverse_engineering');
}

{
  const bundle = baseBundle();
  bundle.analysis_document_requirements_trace_contract.requirements = bundle.analysis_document_requirements_trace_contract.requirements
    .filter(item => item.label !== 'Reverse Engineering & Documentation')
    .concat(trace('Reverse Engineering & Documentation', 'open', []));
  const result = readiness(bundle);
  assert(missingIds(result).includes('reverse_engineering_documentation'), 'functional evidence must not satisfy missing reverse-engineering/documentation coverage');
}

{
  const bundle = baseBundle();
  bundle.analysis_document_requirements_trace_contract.requirements = bundle.analysis_document_requirements_trace_contract.requirements
    .filter(item => item.label !== 'Functional View')
    .concat(trace('Non-functional Quality', 'covered', [ev]));
  bundle.analysis_document.sections = bundle.analysis_document.sections.filter(section => section.id !== 'functional');
  const result = readiness(bundle);
  assert(missingIds(result).includes('functional_reverse_engineering'), 'non-functional trace must not satisfy functional_reverse_engineering');
}

{
  const bundle = baseBundle();
  bundle.analysis_document_requirements_trace_contract.requirements = bundle.analysis_document_requirements_trace_contract.requirements
    .filter(item => item.label !== 'Technical View')
    .concat(trace('Technical View', 'open', []));
  bundle.analysis_document.sections = [{ id: 'technical', blocks: [{ type: 'boundary_map' }] }];
  const result = readiness(bundle);
  assert(missingIds(result).includes('technical_architecture_view'), 'boundary_map block without evidence must not satisfy technical_architecture_view');
}

{
  const bundle = baseBundle();
  bundle.analysis_document_requirements_trace_contract.requirements = bundle.analysis_document_requirements_trace_contract.requirements
    .filter(item => item.label !== 'Refactoring / Target Architecture')
    .concat(trace('Refactoring / Target Architecture', 'open', []));
  bundle.refactoring = [];
  bundle.modernization = [];
  bundle.analysis_document.sections = [{ id: 'roadmap', blocks: [{ type: 'roadmap' }] }];
  const result = readiness(bundle);
  assert(missingIds(result).includes('refactoring_modernization'), 'roadmap block without evidence must not satisfy refactoring_modernization');
}

{
  const bundle = baseBundle();
  bundle.analysis_document_requirements_trace_contract.requirements = bundle.analysis_document_requirements_trace_contract.requirements
    .filter(item => item.label !== 'Refactoring / Target Architecture')
    .concat(trace('Refactoring / Target Architecture', 'covered', []));
  bundle.refactoring = [];
  bundle.modernization = [];
  bundle.analysis_document.sections = bundle.analysis_document.sections.filter(section => section.id !== 'roadmap');
  const result = readiness(bundle);
  assert(missingIds(result).includes('refactoring_modernization'), 'covered refactoring trace without evidence must not satisfy refactoring_modernization');
}

{
  const bundle = baseBundle();
  bundle.analysis_document_requirements_trace_contract.requirements = [
    traceRef('Reverse Engineering & Documentation'),
    traceRef('Functional View'),
    traceRef('Technical View'),
    traceRef('Code Analysis'),
    traceRef('Process Analysis'),
    traceRef('Refactoring / Target Architecture')
  ];
  bundle.documentation = {
    request_response_examples: [{ title: 'Example by reference', evidence_refs: [evRef] }]
  };
  bundle.process = {
    tests: { status: 'partial', evidence_refs: [evRef] }
  };
  bundle.quality = {
    risks: [{ title: 'Authentication gap', evidence_refs: [evRef] }]
  };
  bundle.findings = [
    { category: 'security', title: 'Authentication gap', evidence_refs: [evRef] }
  ];
  bundle.refactoring = [{ title: 'Extract boundary', evidence_refs: [evRef] }];
  bundle.analysis_document.sections = [
    { id: 'functional', blocks: [{ type: 'flow', evidence_refs: [evRef] }] },
    { id: 'technical', blocks: [{ type: 'boundary_map', evidence_refs: [evRef] }] },
    { id: 'quality', blocks: [{ type: 'statement_list', items: [{ title: 'Authentication gap', evidence_refs: [evRef] }] }] },
    { id: 'roadmap', blocks: [{ type: 'roadmap', evidence_refs: [evRef] }] }
  ];
  const result = readiness(bundle);
  assert.equal(result.ready, true, 'evidence_refs-only bundle should satisfy product readiness');
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

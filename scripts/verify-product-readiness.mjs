import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { computeProductReadiness } from '../dist/productReadiness.js';
import { marketProofStatusForRoot } from '../dist/marketProof.js';

const ev = { path: 'src/example.ts', line: 1 };
const evRef = 'src/example.ts:1';
const marketProof = {
  goldenExpected: ['api', 'ui', 'cli', 'infra', 'library'],
  passedGoldenRepos: 5,
  totalGoldenRepos: 5,
  baselineAggregate: { verdict: 'pass' },
  goldenProofReady: true,
  baselineProofReady: true,
  strictReady: true,
  strictFailures: []
};

function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function writeFixture(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function sha1(value) {
  return createHash('sha1').update(value).digest('hex');
}

function perfectMetricDerivation() {
  return {
    fact_rows: [{ id: 'fact', found: true, evidence_present: true, artifact_snippet: 'baseline output' }],
    claim_rows: [{ id: 'claim-1', unsupported: false, artifact_snippet: 'baseline output' }],
    decision_rows: [{ id: 'decision-1', useful: true, artifact_snippet: 'baseline output' }]
  };
}

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
  const forgedMarketProof = {
    goldenExpected: ['api', 'ui', 'cli', 'infra', 'library'],
    passedGoldenRepos: 5,
    totalGoldenRepos: 5,
    baselineAggregate: { verdict: 'pass' },
    goldenProofReady: false,
    baselineProofReady: false,
    strictReady: false,
    strictFailures: ['forged aggregate']
  };
  const result = computeProductReadiness('/repo', '/repo/.analysis', baseBundle(), forgedMarketProof);
  assert(missingIds(result).includes('multi_repo_benchmark'), 'golden aggregate counts without validated proof must not satisfy multi_repo_benchmark');
  assert(missingIds(result).includes('baseline_comparison'), 'baseline aggregate pass without validated artifacts must not satisfy baseline_comparison');
}

{
  const root = mkdtempSync(join(tmpdir(), 'cognianalysis-market-proof-'));
  try {
    const analysis = join(root, 'repo', '.analysis');
    mkdirSync(join(root, 'docs'), { recursive: true });
    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(join(root, 'docs', 'BENCHMARK.md'), 'benchmark protocol\n');
    writeFileSync(join(root, 'scripts', 'verify-golden.mjs'), '');
    writeFileSync(join(root, 'scripts', 'verify-baseline.mjs'), '');
    writeJson(join(root, 'benchmarks', 'baseline', 'results.json'), {
      schemaVersion: '1.0',
      benchmark: 'baseline-comparison',
      generated_by: 'scripts/verify-baseline.mjs',
      total_baselines: 0,
      required_baseline_kinds: ['raw_agent_prompt', 'scanner_report'],
      present_baseline_kinds: ['raw_agent_prompt', 'scanner_report'],
      missing_baseline_kinds: [],
      failed_baselines: [],
      verdict: 'pass',
      baselines: []
    });
    const status = marketProofStatusForRoot(root, analysis);
    assert.equal(status.baselineProofReady, false, 'forged passing baseline aggregate without baseline artifacts must not be proof-ready');
    assert(status.strictFailures.some(item => item.includes('missing validated baseline artifact for raw_agent_prompt')), 'strict failures must name missing raw-agent baseline artifact');
    assert(status.strictFailures.some(item => item.includes('missing validated baseline artifact for scanner_report')), 'strict failures must name missing scanner baseline artifact');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = mkdtempSync(join(tmpdir(), 'cognianalysis-golden-proof-'));
  try {
    const analysis = join(root, 'repo', '.analysis');
    mkdirSync(join(root, 'docs'), { recursive: true });
    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(join(root, 'docs', 'BENCHMARK.md'), 'benchmark protocol\n');
    writeFileSync(join(root, 'scripts', 'verify-golden.mjs'), '');
    writeFileSync(join(root, 'scripts', 'verify-baseline.mjs'), '');
    const results = [];
    for (let i = 1; i <= 5; i += 1) {
      const expectedFile = `benchmarks/golden/repo-${i}.expected.json`;
      writeJson(join(root, expectedFile), {
        benchmark: `repo-${i}`,
        repo: `fixtures/repo-${i}`,
        facts: [{ id: 'fact', expected: 'fact', evidence_required: true }],
      claims: [{ id: 'claim-1', expected: 'supported claim' }],
      decisions: [{ id: 'decision-1', expected: 'useful decision' }],
      minimums: { fact_recall: 1 }
      });
      results.push({
        benchmark: `repo-${i}`,
        repo: `fixtures/repo-${i}`,
        expected_file: expectedFile,
        verdict: 'pass',
        metrics: {
          fact_recall: 1,
          evidence_precision: 1,
          unsupported_claim_rate: 0,
          decision_readiness: 1,
          report_completeness: 1,
          invalid_evidence: 0
        },
        failures: []
      });
    }
    writeJson(join(root, 'benchmarks', 'golden', 'results.json'), {
      schemaVersion: '1.0',
      benchmark: 'golden-suite',
      generated_by: 'scripts/verify-golden.mjs',
      total_repos: 5,
      passed_repos: 5,
      failed_repos: 0,
      minimum_market_proof_repos: 5,
      market_proof_ready: true,
      verdict: 'pass',
      results
    });
    const status = marketProofStatusForRoot(root, analysis);
    assert.equal(status.goldenProofReady, false, 'forged golden aggregate without per-suite verifier artifacts must not be proof-ready');
    assert.equal(status.passedGoldenRepos, 0, 'validated passing golden count must come from per-suite result artifacts');
    assert(status.strictFailures.some(item => item.includes('missing verifier result artifact')), 'strict failures must name missing per-suite golden artifacts');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = mkdtempSync(join(tmpdir(), 'cognianalysis-stale-golden-proof-'));
  try {
    const analysis = join(root, 'repo', '.analysis');
    mkdirSync(join(root, 'docs'), { recursive: true });
    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(join(root, 'docs', 'BENCHMARK.md'), 'benchmark protocol\n');
    writeFileSync(join(root, 'scripts', 'verify-golden.mjs'), '');
    writeFileSync(join(root, 'scripts', 'verify-baseline.mjs'), '');
    const results = [];
    for (let i = 1; i <= 5; i += 1) {
      const repo = `fixtures/repo-${i}`;
      const expectedFile = `benchmarks/golden/repo-${i}.expected.json`;
      const result = {
        schemaVersion: '1.0',
        benchmark: `repo-${i}`,
        generated_by: 'scripts/verify-golden.mjs',
        source_commit: 'old-commit',
        expected_file: expectedFile,
        repo,
        verdict: 'pass',
        metrics: {
          fact_recall: 1,
          evidence_precision: 1,
          unsupported_claim_rate: 0,
          decision_readiness: 1,
          report_completeness: 1,
          invalid_evidence: 0
        },
        failures: []
      };
      writeJson(join(root, expectedFile), {
        benchmark: `repo-${i}`,
        repo,
        facts: [{ id: 'fact', expected: 'fact', evidence_required: true }],
      claims: [{ id: 'claim-1', expected: 'supported claim' }],
      decisions: [{ id: 'decision-1', expected: 'useful decision' }],
      minimums: { fact_recall: 1 }
      });
      writeJson(join(root, repo, '.analysis', 'data', 'golden-benchmark.json'), result);
      results.push({
        benchmark: result.benchmark,
        repo,
        expected_file: expectedFile,
        verdict: 'pass',
        metrics: result.metrics,
        failures: []
      });
    }
    writeJson(join(root, 'benchmarks', 'golden', 'results.json'), {
      schemaVersion: '1.0',
      benchmark: 'golden-suite',
      generated_by: 'scripts/verify-golden.mjs',
      source_commit: 'old-commit',
      total_repos: 5,
      passed_repos: 5,
      failed_repos: 0,
      minimum_market_proof_repos: 5,
      market_proof_ready: true,
      verdict: 'pass',
      results
    });
    const status = marketProofStatusForRoot(root, analysis, 'current-commit');
    assert.equal(status.goldenProofReady, false, 'otherwise-valid stale golden proof must not be proof-ready');
    assert(status.strictFailures.some(item => item.includes('golden aggregate source_commit must match current HEAD current-commit')), 'strict failures must reject stale golden aggregate source_commit');
    assert(status.strictFailures.some(item => item.includes('source_commit must match current HEAD current-commit')), 'strict failures must reject stale per-suite golden source_commit');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = mkdtempSync(join(tmpdir(), 'cognianalysis-stale-baseline-proof-'));
  try {
    const analysis = join(root, 'repo', '.analysis');
    mkdirSync(join(root, 'docs'), { recursive: true });
    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(join(root, 'docs', 'BENCHMARK.md'), 'benchmark protocol\n');
    writeFileSync(join(root, 'scripts', 'verify-golden.mjs'), '');
    writeFileSync(join(root, 'scripts', 'verify-baseline.mjs'), '');
    writeJson(join(root, 'benchmarks', 'golden', 'repo-1.expected.json'), {
      benchmark: 'repo-1',
      repo: 'fixtures/repo-1',
      facts: [{ id: 'fact', expected: 'fact', evidence_required: true }],
      claims: [{ id: 'claim-1', expected: 'supported claim' }],
      decisions: [{ id: 'decision-1', expected: 'useful decision' }],
      minimums: { fact_recall: 1 }
    });
    for (const kind of ['raw_agent_prompt', 'scanner_report']) {
      const artifactText = `${kind} baseline output\n`;
      writeFixture(join(root, 'artifacts', `${kind}.md`), artifactText);
      writeJson(join(root, 'benchmarks', 'baseline', `${kind}.baseline.json`), {
        schemaVersion: '1.0',
        repo: 'fixtures/repo-1',
        baseline_kind: kind,
        source_commit: 'old-commit',
        verdict: 'pass',
        metrics: {
          fact_recall: 1,
          evidence_precision: 1,
          unsupported_claim_rate: 0,
          decision_usefulness: 1
        },
        provenance: {
          generated_by: kind,
          artifact: `artifacts/${kind}.md`,
          artifact_sha1: sha1(artifactText)
        },
        comparison: {
          target: 'benchmarks/golden/repo-1.expected.json'
        },
        metric_derivation: perfectMetricDerivation()
      });
    }
    writeJson(join(root, 'benchmarks', 'baseline', 'results.json'), {
      schemaVersion: '1.0',
      benchmark: 'baseline-comparison',
      generated_by: 'scripts/verify-baseline.mjs',
      source_commit: 'old-commit',
      total_baselines: 2,
      required_baseline_kinds: ['raw_agent_prompt', 'scanner_report'],
      present_baseline_kinds: ['raw_agent_prompt', 'scanner_report'],
      missing_baseline_kinds: [],
      failed_baselines: [],
      verdict: 'pass',
      baselines: []
    });
    const status = marketProofStatusForRoot(root, analysis, 'current-commit');
    assert.equal(status.baselineProofReady, false, 'otherwise-valid stale baseline aggregate must not be proof-ready');
    assert(status.strictFailures.some(item => item.includes('baseline aggregate source_commit must match current HEAD current-commit')), 'strict failures must reject stale baseline aggregate source_commit');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = mkdtempSync(join(tmpdir(), 'cognianalysis-stale-baseline-artifacts-'));
  try {
    const analysis = join(root, 'repo', '.analysis');
    mkdirSync(join(root, 'docs'), { recursive: true });
    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(join(root, 'docs', 'BENCHMARK.md'), 'benchmark protocol\n');
    writeFileSync(join(root, 'scripts', 'verify-golden.mjs'), '');
    writeFileSync(join(root, 'scripts', 'verify-baseline.mjs'), '');
    writeJson(join(root, 'benchmarks', 'golden', 'repo-1.expected.json'), {
      benchmark: 'repo-1',
      repo: 'fixtures/repo-1',
      facts: [{ id: 'fact', expected: 'fact', evidence_required: true }],
      claims: [{ id: 'claim-1', expected: 'supported claim' }],
      decisions: [{ id: 'decision-1', expected: 'useful decision' }],
      minimums: { fact_recall: 1 }
    });
    for (const kind of ['raw_agent_prompt', 'scanner_report']) {
      const artifactText = `${kind} baseline output\n`;
      writeFixture(join(root, 'artifacts', `${kind}.md`), artifactText);
      writeJson(join(root, 'benchmarks', 'baseline', `${kind}.baseline.json`), {
        schemaVersion: '1.0',
        repo: 'fixtures/repo-1',
        baseline_kind: kind,
        source_commit: 'old-commit',
        verdict: 'pass',
        metrics: {
          fact_recall: 1,
          evidence_precision: 1,
          unsupported_claim_rate: 0,
          decision_usefulness: 1
        },
        provenance: {
          generated_by: kind,
          artifact: `artifacts/${kind}.md`,
          artifact_sha1: sha1(artifactText)
        },
        comparison: {
          target: 'benchmarks/golden/repo-1.expected.json'
        },
        metric_derivation: perfectMetricDerivation()
      });
    }
    writeJson(join(root, 'benchmarks', 'baseline', 'results.json'), {
      schemaVersion: '1.0',
      benchmark: 'baseline-comparison',
      generated_by: 'scripts/verify-baseline.mjs',
      source_commit: 'current-commit',
      total_baselines: 2,
      required_baseline_kinds: ['raw_agent_prompt', 'scanner_report'],
      present_baseline_kinds: ['raw_agent_prompt', 'scanner_report'],
      missing_baseline_kinds: [],
      failed_baselines: [],
      verdict: 'pass',
      baselines: []
    });
    const status = marketProofStatusForRoot(root, analysis, 'current-commit');
    assert.equal(status.baselineProofReady, false, 'current aggregate with stale baseline artifacts must not be proof-ready');
    assert(status.strictFailures.some(item => item.includes('source_commit must match current HEAD current-commit')), 'strict failures must reject stale baseline artifact source_commit');
    assert(status.strictFailures.some(item => item.includes('source_commit must match baseline aggregate source_commit')), 'strict failures must reject baseline artifact/aggregate source mismatch');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = mkdtempSync(join(tmpdir(), 'cognianalysis-missing-baseline-provenance-'));
  try {
    const analysis = join(root, 'repo', '.analysis');
    mkdirSync(join(root, 'docs'), { recursive: true });
    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(join(root, 'docs', 'BENCHMARK.md'), 'benchmark protocol\n');
    writeFileSync(join(root, 'scripts', 'verify-golden.mjs'), '');
    writeFileSync(join(root, 'scripts', 'verify-baseline.mjs'), '');
    writeJson(join(root, 'benchmarks', 'golden', 'repo-1.expected.json'), {
      benchmark: 'repo-1',
      repo: 'fixtures/repo-1',
      facts: [{ id: 'fact', expected: 'fact', evidence_required: true }],
      claims: [{ id: 'claim-1', expected: 'supported claim' }],
      decisions: [{ id: 'decision-1', expected: 'useful decision' }],
      minimums: { fact_recall: 1 }
    });
    for (const kind of ['raw_agent_prompt', 'scanner_report']) {
      writeJson(join(root, 'benchmarks', 'baseline', `${kind}.baseline.json`), {
        schemaVersion: '1.0',
        repo: 'fixtures/repo-1',
        baseline_kind: kind,
        source_commit: 'current-commit',
        verdict: 'pass',
        metrics: {
          fact_recall: 1,
          evidence_precision: 1,
          unsupported_claim_rate: 0,
          decision_usefulness: 1
        },
        provenance: {
          generated_by: kind,
          artifact: `artifacts/missing-${kind}.md`,
          artifact_sha1: sha1(`${kind} missing artifact\n`)
        },
        comparison: {
          target: 'benchmarks/golden/repo-1.expected.json'
        },
        metric_derivation: perfectMetricDerivation()
      });
    }
    writeJson(join(root, 'benchmarks', 'baseline', 'results.json'), {
      schemaVersion: '1.0',
      benchmark: 'baseline-comparison',
      generated_by: 'scripts/verify-baseline.mjs',
      source_commit: 'current-commit',
      total_baselines: 2,
      required_baseline_kinds: ['raw_agent_prompt', 'scanner_report'],
      present_baseline_kinds: ['raw_agent_prompt', 'scanner_report'],
      missing_baseline_kinds: [],
      failed_baselines: [],
      verdict: 'pass',
      baselines: []
    });
    const status = marketProofStatusForRoot(root, analysis, 'current-commit');
    assert.equal(status.baselineProofReady, false, 'baseline artifacts with missing provenance output must not be proof-ready');
    assert(status.strictFailures.some(item => item.includes('provenance artifact does not exist')), 'strict failures must reject missing baseline provenance artifacts');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = mkdtempSync(join(tmpdir(), 'cognianalysis-missing-baseline-derivation-'));
  try {
    const analysis = join(root, 'repo', '.analysis');
    mkdirSync(join(root, 'docs'), { recursive: true });
    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(join(root, 'docs', 'BENCHMARK.md'), 'benchmark protocol\n');
    writeFileSync(join(root, 'scripts', 'verify-golden.mjs'), '');
    writeFileSync(join(root, 'scripts', 'verify-baseline.mjs'), '');
    writeJson(join(root, 'benchmarks', 'golden', 'repo-1.expected.json'), {
      benchmark: 'repo-1',
      repo: 'fixtures/repo-1',
      facts: [{ id: 'fact', expected: 'fact', evidence_required: true }],
      claims: [{ id: 'claim-1', expected: 'supported claim' }],
      decisions: [{ id: 'decision-1', expected: 'useful decision' }],
      minimums: { fact_recall: 1 }
    });
    for (const kind of ['raw_agent_prompt', 'scanner_report']) {
      const artifactText = `${kind} baseline output\n`;
      writeFixture(join(root, 'artifacts', `${kind}.md`), artifactText);
      writeJson(join(root, 'benchmarks', 'baseline', `${kind}.baseline.json`), {
        schemaVersion: '1.0',
        repo: 'fixtures/repo-1',
        baseline_kind: kind,
        source_commit: 'current-commit',
        verdict: 'pass',
        metrics: {
          fact_recall: 1,
          evidence_precision: 1,
          unsupported_claim_rate: 0,
          decision_usefulness: 1
        },
        provenance: {
          generated_by: kind,
          artifact: `artifacts/${kind}.md`,
          artifact_sha1: sha1(artifactText)
        },
        comparison: {
          target: 'benchmarks/golden/repo-1.expected.json'
        }
      });
    }
    writeJson(join(root, 'benchmarks', 'baseline', 'results.json'), {
      schemaVersion: '1.0',
      benchmark: 'baseline-comparison',
      generated_by: 'scripts/verify-baseline.mjs',
      source_commit: 'current-commit',
      total_baselines: 2,
      required_baseline_kinds: ['raw_agent_prompt', 'scanner_report'],
      present_baseline_kinds: ['raw_agent_prompt', 'scanner_report'],
      missing_baseline_kinds: [],
      failed_baselines: [],
      verdict: 'pass',
      baselines: []
    });
    const status = marketProofStatusForRoot(root, analysis, 'current-commit');
    assert.equal(status.baselineProofReady, false, 'baseline artifacts without metric derivation rows must not be proof-ready');
    assert(status.strictFailures.some(item => item.includes('metric_derivation fact rows are required')), 'strict failures must reject missing baseline fact derivation rows');
    assert(status.strictFailures.some(item => item.includes('metric_derivation claim rows are required')), 'strict failures must reject missing baseline claim derivation rows');
    assert(status.strictFailures.some(item => item.includes('metric_derivation decision rows are required')), 'strict failures must reject missing baseline decision derivation rows');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const root = mkdtempSync(join(tmpdir(), 'cognianalysis-unbound-baseline-derivation-'));
  try {
    const analysis = join(root, 'repo', '.analysis');
    mkdirSync(join(root, 'docs'), { recursive: true });
    mkdirSync(join(root, 'scripts'), { recursive: true });
    writeFileSync(join(root, 'docs', 'BENCHMARK.md'), 'benchmark protocol\n');
    writeFileSync(join(root, 'scripts', 'verify-golden.mjs'), '');
    writeFileSync(join(root, 'scripts', 'verify-baseline.mjs'), '');
    writeJson(join(root, 'benchmarks', 'golden', 'repo-1.expected.json'), {
      benchmark: 'repo-1',
      repo: 'fixtures/repo-1',
      facts: [{ id: 'fact', expected: 'fact', evidence_required: true }],
      claims: [{ id: 'claim-1', expected: 'supported claim' }],
      decisions: [{ id: 'decision-1', expected: 'useful decision' }],
      minimums: { fact_recall: 1 }
    });
    for (const kind of ['raw_agent_prompt', 'scanner_report']) {
      const artifactText = `${kind} baseline output\n`;
      writeFixture(join(root, 'artifacts', `${kind}.md`), artifactText);
      writeJson(join(root, 'benchmarks', 'baseline', `${kind}.baseline.json`), {
        schemaVersion: '1.0',
        repo: 'fixtures/repo-1',
        baseline_kind: kind,
        source_commit: 'current-commit',
        verdict: 'pass',
        metrics: {
          fact_recall: 1,
          evidence_precision: 1,
          unsupported_claim_rate: 0,
          decision_usefulness: 1
        },
        provenance: {
          generated_by: kind,
          artifact: `artifacts/${kind}.md`,
          artifact_sha1: sha1(artifactText)
        },
        comparison: {
          target: 'benchmarks/golden/repo-1.expected.json'
        },
        metric_derivation: {
          fact_rows: [{ id: 'fact', found: true, evidence_present: true, artifact_snippet: 'baseline output' }],
          claim_rows: [{ id: 'missing-claim', unsupported: false, artifact_snippet: 'baseline output' }],
          decision_rows: [{ id: 'missing-decision', useful: true, artifact_snippet: 'baseline output' }]
        }
      });
    }
    writeJson(join(root, 'benchmarks', 'baseline', 'results.json'), {
      schemaVersion: '1.0',
      benchmark: 'baseline-comparison',
      generated_by: 'scripts/verify-baseline.mjs',
      source_commit: 'current-commit',
      total_baselines: 2,
      required_baseline_kinds: ['raw_agent_prompt', 'scanner_report'],
      present_baseline_kinds: ['raw_agent_prompt', 'scanner_report'],
      missing_baseline_kinds: [],
      failed_baselines: [],
      verdict: 'pass',
      baselines: []
    });
    const status = marketProofStatusForRoot(root, analysis, 'current-commit');
    assert.equal(status.baselineProofReady, false, 'baseline claim/decision derivation rows not bound to target IDs must not be proof-ready');
    assert(status.strictFailures.some(item => item.includes('is not present in comparison target claims')), 'strict failures must reject claim rows absent from comparison target claims');
    assert(status.strictFailures.some(item => item.includes('is not present in comparison target decisions')), 'strict failures must reject decision rows absent from comparison target decisions');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const bundle = baseBundle();
  bundle.product_artifact_model = { model: 'expanded_debug_harness', complete: true };
  const result = readiness(bundle);
  assert(missingIds(result).includes('thin_artifact_model'), 'non-thin artifact model must not satisfy thin_artifact_model');
}

{
  const bundle = baseBundle();
  bundle.product_artifact_model = {
    model: 'thin_llm_first_harness',
    complete: false,
    missing: ['llm_artifacts', 'report_artifacts']
  };
  const result = readiness(bundle);
  assert(missingIds(result).includes('thin_artifact_model'), 'declared thin model with missing artifacts must not satisfy thin_artifact_model');
}

{
  const bundle = baseBundle();
  bundle.simplified_harness_contract = { complete: false, missing: ['single_product_entrypoint'] };
  const result = readiness(bundle);
  assert(missingIds(result).includes('simplified_harness_contract'), 'incomplete simplified harness contract must not satisfy simplification readiness');
}

{
  const bundle = baseBundle();
  bundle.parallel_orchestration_contract = { complete: false, missing: ['artifact_cache_keys_available'] };
  const result = readiness(bundle);
  assert(missingIds(result).includes('parallel_orchestration'), 'incomplete orchestration contract must not satisfy parallel_orchestration readiness');
}

{
  const bundle = baseBundle();
  bundle.parallel_orchestration_contract = {
    complete: false,
    scaffold_ready: true,
    missing: ['parallel_execution_proof', 'cache_reuse_proof']
  };
  const result = readiness(bundle);
  assert(missingIds(result).includes('parallel_orchestration'), 'scaffold-only orchestration must not satisfy parallel_orchestration readiness');
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
  bundle.quality = { flows: [{ category: 'flow', title: 'Authentication flow', evidence: [ev] }] };
  bundle.findings = [{ category: 'maintainability', title: 'Authorization middleware is shared', evidence: [ev] }];
  bundle.analysis_document.sections = [
    { id: 'quality', blocks: [{ type: 'statement_list', items: [{ category: 'flow', title: 'Authentication flow', evidence: [ev] }] }] }
  ];
  const result = readiness(bundle);
  assert(missingIds(result).includes('quality_security_view'), 'auth feature evidence without security/risk framing must not satisfy quality_security_view');
}

{
  const bundle = baseBundle();
  bundle.quality = { security_assessment: { category: 'security', status: 'no_findings', title: 'No reviewed-slice security findings', evidence: [ev] } };
  bundle.findings = [];
  bundle.analysis_document.sections = [
    { id: 'quality', blocks: [{ type: 'statement_list', items: [{ category: 'security', status: 'no_findings', title: 'No reviewed-slice security findings', evidence: [ev] }] }] }
  ];
  const result = readiness(bundle);
  assert(!missingIds(result).includes('quality_security_view'), 'explicit security no-finding statement must satisfy quality_security_view');
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
    .filter(item => item.label !== 'Functional View')
    .concat(trace('Functional View', 'open', []));
  bundle.analysis_document.sections = [{ id: 'functional', blocks: [{ type: 'flow', open_questions: [{ question: 'Which route?', evidence: [ev] }] }] }];
  const result = readiness(bundle);
  assert(missingIds(result).includes('functional_reverse_engineering'), 'open-question evidence inside a flow block must not satisfy functional_reverse_engineering');
}

{
  const bundle = baseBundle();
  bundle.analysis_document_requirements_trace_contract.requirements = bundle.analysis_document_requirements_trace_contract.requirements
    .filter(item => item.label !== 'Functional View')
    .concat(trace('Functional View', 'open', []));
  bundle.analysis_document.sections = [{ id: 'functional', blocks: [{ type: 'flow', steps: [{ order: 1, description: 'Supported flow step', evidence: [ev] }] }] }];
  const result = readiness(bundle);
  assert(!missingIds(result).includes('functional_reverse_engineering'), 'normal nested flow step evidence must satisfy functional_reverse_engineering');
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
    .filter(item => item.label !== 'Reverse Engineering & Documentation')
    .concat({
      label: 'Reverse Engineering & Documentation',
      status: 'covered',
      open_questions: [{ question: 'Which flow is authoritative?', evidence: [ev] }]
    });
  const result = readiness(bundle);
  assert(missingIds(result).includes('reverse_engineering_documentation'), 'nested open-question evidence must not satisfy trace-row coverage evidence');
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

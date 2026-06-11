"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BASELINE_VERIFIER_ID = exports.GOLDEN_VERIFIER_ID = void 0;
exports.baselineProofStatus = baselineProofStatus;
exports.goldenProofStatus = goldenProofStatus;
exports.marketProofStatusForRoot = marketProofStatusForRoot;
const utils_1 = require("./utils");
const Crypto = require('node:crypto');
exports.GOLDEN_VERIFIER_ID = 'scripts/verify-golden.mjs';
exports.BASELINE_VERIFIER_ID = 'scripts/verify-baseline.mjs';
const REQUIRED_BASELINE_KINDS = ['raw_agent_prompt', 'scanner_report'];
const REQUIRED_BASELINE_METRICS = ['fact_recall', 'evidence_precision', 'unsupported_claim_rate', 'decision_usefulness'];
const REQUIRED_GOLDEN_METRICS = ['fact_recall', 'evidence_precision', 'unsupported_claim_rate', 'decision_readiness', 'report_completeness', 'invalid_evidence'];
function asList(value) {
    if (value === null || value === undefined)
        return [];
    return Array.isArray(value) ? value : [value];
}
function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}
function posixRelative(root, file) {
    return utils_1.Path.relative(root, file).replace(/\\/g, '/');
}
function listFilesRecursive(dir, predicate) {
    const out = [];
    if (!utils_1.FS.existsSync(dir))
        return out;
    for (const entry of utils_1.FS.readdirSync(dir, { withFileTypes: true })) {
        const full = utils_1.Path.join(dir, entry.name);
        if (entry.isDirectory())
            out.push(...listFilesRecursive(full, predicate));
        else if (entry.isFile() && predicate(full))
            out.push(full);
    }
    return out.sort();
}
function sameMetrics(left, right, keys) {
    return keys.every(key => left?.[key] === right?.[key]);
}
function numbersEqual(left, right) {
    return typeof left === 'number' && typeof right === 'number' && Math.abs(left - right) < 1e-9;
}
function fileSha1(file) {
    return Crypto.createHash('sha1').update(utils_1.FS.readFileSync(file)).digest('hex');
}
function resolveInsideRoot(root, relativePath) {
    const resolved = utils_1.Path.resolve(root, relativePath);
    const normalizedRoot = utils_1.Path.resolve(root);
    return resolved === normalizedRoot || resolved.startsWith(`${normalizedRoot}${utils_1.Path.sep}`) ? resolved : '';
}
function readJsonObject(file) {
    try {
        return JSON.parse(utils_1.FS.readFileSync(file, 'utf8'));
    }
    catch {
        return {};
    }
}
function rowSnippet(row) {
    return String(row?.artifact_snippet || row?.snippet || row?.evidence_text || row?.matched_text || '').trim();
}
function validateRowsBoundToArtifact(rows, artifactText, label) {
    const errors = [];
    rows.forEach((row, index) => {
        if (!String(row?.id || '').trim())
            errors.push(`metric_derivation ${label} row ${index + 1} id is required`);
        const snippet = rowSnippet(row);
        if (!snippet)
            errors.push(`metric_derivation ${label} row ${row?.id || index + 1} artifact_snippet is required`);
        else if (!artifactText.includes(snippet))
            errors.push(`metric_derivation ${label} row ${row?.id || index + 1} artifact_snippet is absent from provenance artifact`);
    });
    return errors;
}
function validateBaselineMetricDerivation(parsed, comparisonTargetFile, artifactFile) {
    const errors = [];
    const metrics = parsed?.metrics || {};
    const derivation = parsed?.metric_derivation || parsed?.metricDerivation || {};
    const comparison = parsed?.comparison || parsed?.compared_to || {};
    const factRows = asList(derivation.fact_rows || derivation.facts || comparison.fact_rows || comparison.facts || parsed?.facts || parsed?.scored_facts);
    const claimRows = asList(derivation.claim_rows || derivation.claims || comparison.claim_rows || comparison.claims || parsed?.claims);
    const decisionRows = asList(derivation.decision_rows || derivation.decisions || comparison.decision_rows || comparison.decisions || parsed?.decisions);
    if (factRows.length === 0)
        errors.push('metric_derivation fact rows are required');
    if (claimRows.length === 0)
        errors.push('metric_derivation claim rows are required');
    if (decisionRows.length === 0)
        errors.push('metric_derivation decision rows are required');
    const artifactText = artifactFile && utils_1.FS.existsSync(artifactFile) ? utils_1.FS.readFileSync(artifactFile, 'utf8') : '';
    errors.push(...validateRowsBoundToArtifact(factRows, artifactText, 'fact'));
    errors.push(...validateRowsBoundToArtifact(claimRows, artifactText, 'claim'));
    errors.push(...validateRowsBoundToArtifact(decisionRows, artifactText, 'decision'));
    if (comparisonTargetFile && utils_1.FS.existsSync(comparisonTargetFile)) {
        const target = readJsonObject(comparisonTargetFile);
        const expectedFactIds = new Set(asList(target?.facts).map((fact) => String(fact?.id || '').trim()).filter(Boolean));
        if (expectedFactIds.size > 0) {
            for (const row of factRows) {
                const id = String(row?.id || '').trim();
                if (id && !expectedFactIds.has(id))
                    errors.push(`metric_derivation fact row ${id} is not present in comparison target facts`);
            }
        }
    }
    if (factRows.length > 0) {
        const foundRows = factRows.filter((row) => row?.found === true);
        const evidenceRows = foundRows.filter((row) => row?.evidence_present === true || row?.has_evidence === true);
        const factRecall = foundRows.length / factRows.length;
        const evidencePrecision = foundRows.length ? evidenceRows.length / foundRows.length : 0;
        if (!numbersEqual(metrics.fact_recall, factRecall))
            errors.push('metrics.fact_recall must match metric_derivation fact rows');
        if (!numbersEqual(metrics.evidence_precision, evidencePrecision))
            errors.push('metrics.evidence_precision must match metric_derivation fact rows');
    }
    if (claimRows.length > 0) {
        const unsupported = claimRows.filter((row) => row?.unsupported === true || row?.supported === false).length;
        const unsupportedRate = unsupported / claimRows.length;
        if (!numbersEqual(metrics.unsupported_claim_rate, unsupportedRate))
            errors.push('metrics.unsupported_claim_rate must match metric_derivation claim rows');
    }
    if (decisionRows.length > 0) {
        const useful = decisionRows.filter((row) => row?.useful === true || row?.decision_useful === true).length;
        const decisionUsefulness = useful / decisionRows.length;
        if (!numbersEqual(metrics.decision_usefulness, decisionUsefulness))
            errors.push('metrics.decision_usefulness must match metric_derivation decision rows');
    }
    return errors;
}
function validateBaselineArtifact(parsed, root, expectedSourceCommit, aggregateSourceCommit) {
    const errors = [];
    const metrics = parsed?.metrics || {};
    if (parsed?.schemaVersion !== '1.0')
        errors.push('schemaVersion must be 1.0');
    if (!String(parsed?.repo || '').trim())
        errors.push('repo is required');
    if (!String(parsed?.baseline_kind || parsed?.kind || '').trim())
        errors.push('baseline_kind is required');
    if (parsed?.verdict !== 'pass')
        errors.push('verdict must be pass');
    const provenance = parsed?.provenance || parsed?.baseline_provenance || {};
    const sourceCommit = String(parsed?.source_commit || provenance.source_commit || provenance.sourceCommit || '').trim();
    if (!expectedSourceCommit)
        errors.push('current source commit is unavailable for baseline artifact freshness validation');
    if (!sourceCommit)
        errors.push('source_commit is required');
    if (expectedSourceCommit && sourceCommit !== expectedSourceCommit)
        errors.push(`source_commit must match current HEAD ${expectedSourceCommit}`);
    if (aggregateSourceCommit && sourceCommit !== aggregateSourceCommit)
        errors.push('source_commit must match baseline aggregate source_commit');
    const artifactPath = String(provenance.artifact || provenance.artifact_path || provenance.source || '').trim();
    const artifactHash = String(provenance.artifact_sha1 || provenance.artifact_hash || provenance.content_hash || provenance.sha1 || '').trim();
    if (!artifactPath)
        errors.push('provenance artifact path is required');
    const resolvedArtifact = artifactPath ? resolveInsideRoot(root, artifactPath) : '';
    if (artifactPath && !resolvedArtifact)
        errors.push('provenance artifact path must stay inside repository root');
    if (resolvedArtifact && !utils_1.FS.existsSync(resolvedArtifact))
        errors.push(`provenance artifact does not exist: ${artifactPath}`);
    if (!artifactHash)
        errors.push('provenance artifact sha1/hash is required');
    if (resolvedArtifact && utils_1.FS.existsSync(resolvedArtifact) && artifactHash && fileSha1(resolvedArtifact) !== artifactHash)
        errors.push('provenance artifact hash does not match');
    for (const metric of REQUIRED_BASELINE_METRICS) {
        if (!finiteNumber(metrics[metric]))
            errors.push(`metrics.${metric} must be a finite number`);
    }
    for (const metric of ['fact_recall', 'evidence_precision', 'decision_usefulness']) {
        if (finiteNumber(metrics[metric]) && (metrics[metric] < 0 || metrics[metric] > 1))
            errors.push(`metrics.${metric} must be between 0 and 1`);
    }
    if (finiteNumber(metrics.unsupported_claim_rate) && metrics.unsupported_claim_rate < 0)
        errors.push('metrics.unsupported_claim_rate must be >= 0');
    if (!String(provenance.generated_by || provenance.tool || '').trim())
        errors.push('provenance.generated_by or provenance.tool is required');
    const comparison = parsed?.comparison || parsed?.compared_to || {};
    const comparisonTarget = String(comparison.target || comparison.golden_benchmark || comparison.report || '').trim();
    if (!comparisonTarget)
        errors.push('comparison target/golden_benchmark/report is required');
    const resolvedComparison = comparisonTarget ? resolveInsideRoot(root, comparisonTarget) : '';
    if (comparisonTarget && !resolvedComparison)
        errors.push('comparison target must stay inside repository root');
    if (resolvedComparison && !utils_1.FS.existsSync(resolvedComparison))
        errors.push(`comparison target does not exist: ${comparisonTarget}`);
    errors.push(...validateBaselineMetricDerivation(parsed, resolvedComparison, resolvedArtifact));
    return errors;
}
function baselineProofStatus(root, expectedSourceCommit = (0, utils_1.gitCommit)(root)) {
    const baselineRoot = utils_1.Path.join(root, 'benchmarks', 'baseline');
    const aggregate = (0, utils_1.loadJson)(utils_1.Path.join(baselineRoot, 'results.json'), null);
    const aggregateSourceCommit = String(aggregate?.source_commit || '').trim();
    const files = listFilesRecursive(baselineRoot, file => file.endsWith('.baseline.json'));
    const baselines = files.map(file => {
        const parsed = (0, utils_1.loadJson)(file, {});
        const validation_errors = validateBaselineArtifact(parsed, root, expectedSourceCommit, aggregateSourceCommit);
        return {
            file: posixRelative(root, file),
            repo: parsed.repo || '',
            baseline_kind: parsed.baseline_kind || parsed.kind || '',
            verdict: parsed.verdict || 'unknown',
            metrics: parsed.metrics || {},
            validation_errors
        };
    });
    const presentKinds = new Set(baselines.filter(item => item.verdict === 'pass' && item.validation_errors.length === 0).map(item => item.baseline_kind));
    const missingKinds = REQUIRED_BASELINE_KINDS.filter(kind => !presentKinds.has(kind));
    const failed = baselines.filter(item => item.verdict !== 'pass' || item.validation_errors.length > 0);
    const aggregateErrors = [];
    if (!aggregate)
        aggregateErrors.push('missing baseline aggregate results.json');
    else {
        if (aggregate.schemaVersion !== '1.0')
            aggregateErrors.push('baseline aggregate schemaVersion must be 1.0');
        if (aggregate.benchmark !== 'baseline-comparison')
            aggregateErrors.push('baseline aggregate benchmark must be baseline-comparison');
        if (aggregate.generated_by !== exports.BASELINE_VERIFIER_ID)
            aggregateErrors.push(`baseline aggregate generated_by must be ${exports.BASELINE_VERIFIER_ID}`);
        if (aggregate.verdict !== 'pass')
            aggregateErrors.push('baseline aggregate verdict must be pass');
        if (!expectedSourceCommit)
            aggregateErrors.push('current source commit is unavailable for baseline freshness validation');
        if (!String(aggregate.source_commit || '').trim())
            aggregateErrors.push('baseline aggregate source_commit is required');
        if (expectedSourceCommit && aggregate.source_commit !== expectedSourceCommit)
            aggregateErrors.push(`baseline aggregate source_commit must match current HEAD ${expectedSourceCommit}`);
        if (Number(aggregate.total_baselines) !== baselines.length)
            aggregateErrors.push('baseline aggregate total_baselines must match baseline artifacts');
        for (const kind of REQUIRED_BASELINE_KINDS) {
            if (!asList(aggregate.required_baseline_kinds).includes(kind))
                aggregateErrors.push(`baseline aggregate missing required kind ${kind}`);
            if (!asList(aggregate.present_baseline_kinds).includes(kind))
                aggregateErrors.push(`baseline aggregate present kinds missing ${kind}`);
        }
        if (asList(aggregate.missing_baseline_kinds).length > 0)
            aggregateErrors.push('baseline aggregate must have no missing_baseline_kinds');
        if (asList(aggregate.failed_baselines).length > 0)
            aggregateErrors.push('baseline aggregate must have no failed_baselines');
    }
    const failures = [
        ...aggregateErrors,
        ...missingKinds.map(kind => `missing validated baseline artifact for ${kind}`),
        ...failed.map(item => `invalid baseline artifact ${item.file}: ${item.validation_errors.join('; ') || item.verdict}`)
    ];
    return {
        aggregate,
        files: files.map(file => posixRelative(root, file)),
        baselines,
        requiredKinds: REQUIRED_BASELINE_KINDS,
        presentKinds: [...presentKinds],
        missingKinds,
        failed,
        ready: failures.length === 0,
        failures
    };
}
function validateGoldenResultArtifact(parsed, expected, expectedFile, expectedSourceCommit, aggregateSourceCommit) {
    const errors = [];
    const metrics = parsed?.metrics || {};
    if (parsed?.schemaVersion !== '1.0')
        errors.push('schemaVersion must be 1.0');
    if (parsed?.generated_by !== exports.GOLDEN_VERIFIER_ID)
        errors.push(`generated_by must be ${exports.GOLDEN_VERIFIER_ID}`);
    if (!expectedSourceCommit)
        errors.push('current source commit is unavailable for golden freshness validation');
    if (!String(parsed?.source_commit || '').trim())
        errors.push('source_commit is required');
    if (expectedSourceCommit && parsed?.source_commit !== expectedSourceCommit)
        errors.push(`source_commit must match current HEAD ${expectedSourceCommit}`);
    if (aggregateSourceCommit && parsed?.source_commit !== aggregateSourceCommit)
        errors.push('source_commit must match golden aggregate source_commit');
    if (parsed?.expected_file !== expectedFile)
        errors.push(`expected_file must be ${expectedFile}`);
    if (parsed?.repo !== expected.repo)
        errors.push(`repo must be ${expected.repo}`);
    if (parsed?.verdict !== 'pass')
        errors.push('verdict must be pass');
    for (const metric of REQUIRED_GOLDEN_METRICS) {
        if (!finiteNumber(metrics[metric]))
            errors.push(`metrics.${metric} must be a finite number`);
    }
    for (const metric of ['fact_recall', 'evidence_precision', 'decision_readiness', 'report_completeness']) {
        if (finiteNumber(metrics[metric]) && (metrics[metric] < 0 || metrics[metric] > 1))
            errors.push(`metrics.${metric} must be between 0 and 1`);
    }
    if (finiteNumber(metrics.unsupported_claim_rate) && metrics.unsupported_claim_rate < 0)
        errors.push('metrics.unsupported_claim_rate must be >= 0');
    if (finiteNumber(metrics.invalid_evidence) && metrics.invalid_evidence !== 0)
        errors.push('metrics.invalid_evidence must be 0');
    if (asList(parsed?.failures).length > 0)
        errors.push('failures must be empty');
    return errors;
}
function goldenProofStatus(root, analysis, expectedSourceCommit = (0, utils_1.gitCommit)(root)) {
    const goldenDir = utils_1.Path.join(root, 'benchmarks', 'golden');
    const expectedFiles = listFilesRecursive(goldenDir, file => file.endsWith('.expected.json'));
    const aggregate = (0, utils_1.loadJson)(utils_1.Path.join(goldenDir, 'results.json'), null);
    const currentRepoResult = (0, utils_1.loadJson)(utils_1.Path.join(analysis, 'data', 'golden-benchmark.json'), null);
    const expected = expectedFiles.map(file => {
        const parsed = (0, utils_1.loadJson)(file, {});
        const expected_file = posixRelative(root, file);
        const resultPath = parsed.repo ? utils_1.Path.join(root, parsed.repo, '.analysis', 'data', 'golden-benchmark.json') : '';
        const result = resultPath ? (0, utils_1.loadJson)(resultPath, null) : null;
        const validation_errors = [
            ...(!String(parsed.repo || '').trim() ? ['expected repo is required'] : []),
            ...(!Array.isArray(parsed.facts) || parsed.facts.length === 0 ? ['expected facts are required'] : []),
            ...(!parsed.minimums || typeof parsed.minimums !== 'object' ? ['expected minimums are required'] : []),
            ...(!result ? [`missing verifier result artifact ${parsed.repo || '<missing repo>'}/.analysis/data/golden-benchmark.json`] : validateGoldenResultArtifact(result, parsed, expected_file, expectedSourceCommit, String(aggregate?.source_commit || '')))
        ];
        const aggregateRow = asList(aggregate?.results).find((item) => item?.expected_file === expected_file);
        if (!aggregateRow)
            validation_errors.push('missing matching aggregate result row');
        else if (result) {
            if (aggregateRow.verdict !== result.verdict)
                validation_errors.push('aggregate row verdict does not match result artifact');
            if (!sameMetrics(aggregateRow.metrics || {}, result.metrics || {}, REQUIRED_GOLDEN_METRICS))
                validation_errors.push('aggregate row metrics do not match result artifact');
            if (asList(aggregateRow.failures).length !== asList(result.failures).length)
                validation_errors.push('aggregate row failures do not match result artifact');
        }
        return {
            expected_file,
            repo: parsed.repo || '',
            result_path: resultPath ? posixRelative(root, resultPath) : '',
            result,
            aggregate_row: aggregateRow || null,
            validation_errors,
            valid: validation_errors.length === 0
        };
    });
    const aggregateErrors = [];
    if (!aggregate)
        aggregateErrors.push('missing golden aggregate results.json');
    else {
        if (aggregate.schemaVersion !== '1.0')
            aggregateErrors.push('golden aggregate schemaVersion must be 1.0');
        if (aggregate.benchmark !== 'golden-suite')
            aggregateErrors.push('golden aggregate benchmark must be golden-suite');
        if (aggregate.generated_by !== exports.GOLDEN_VERIFIER_ID)
            aggregateErrors.push(`golden aggregate generated_by must be ${exports.GOLDEN_VERIFIER_ID}`);
        if (!expectedSourceCommit)
            aggregateErrors.push('current source commit is unavailable for golden freshness validation');
        if (!String(aggregate.source_commit || '').trim())
            aggregateErrors.push('golden aggregate source_commit is required');
        if (expectedSourceCommit && aggregate.source_commit !== expectedSourceCommit)
            aggregateErrors.push(`golden aggregate source_commit must match current HEAD ${expectedSourceCommit}`);
        if (aggregate.verdict !== 'pass')
            aggregateErrors.push('golden aggregate verdict must be pass');
        if (Number(aggregate.total_repos) !== expectedFiles.length)
            aggregateErrors.push('golden aggregate total_repos must match expected suites');
        if (Number(aggregate.passed_repos) !== expected.filter(item => item.valid).length)
            aggregateErrors.push('golden aggregate passed_repos must match validated result artifacts');
        if (Number(aggregate.failed_repos || 0) !== expected.filter(item => !item.valid).length)
            aggregateErrors.push('golden aggregate failed_repos must match invalid result artifacts');
        if (Number(aggregate.minimum_market_proof_repos || 0) < 5)
            aggregateErrors.push('golden aggregate minimum_market_proof_repos must be at least 5');
        if (aggregate.market_proof_ready !== (expectedFiles.length >= 5 && expected.every(item => item.valid)))
            aggregateErrors.push('golden aggregate market_proof_ready must reflect validated artifacts');
    }
    const passed = expected.filter(item => item.valid).length;
    const failures = [
        ...aggregateErrors,
        ...(expectedFiles.length < 5 ? [`need at least 5 golden repos, found ${expectedFiles.length}`] : []),
        ...(passed < 5 ? [`need at least 5 validated passing golden repos, found ${passed}`] : []),
        ...expected.filter(item => !item.valid).flatMap(item => item.validation_errors.map((error) => `${item.expected_file}: ${error}`))
    ];
    return {
        dir: goldenDir,
        expectedFiles,
        expected: expected.map(item => item.expected_file),
        aggregate,
        result: currentRepoResult,
        suites: expected,
        total: expectedFiles.length,
        passed,
        ready: failures.length === 0,
        failures
    };
}
function marketProofStatusForRoot(root, analysis, currentSourceCommit = (0, utils_1.gitCommit)(root)) {
    const benchmarkDoc = utils_1.Path.join(root, 'docs', 'BENCHMARK.md');
    const goldenScript = utils_1.Path.join(root, exports.GOLDEN_VERIFIER_ID);
    const baselineScript = utils_1.Path.join(root, exports.BASELINE_VERIFIER_ID);
    const golden = goldenProofStatus(root, analysis, currentSourceCommit);
    const baseline = baselineProofStatus(root, currentSourceCommit);
    const strictFailures = [
        ...(!utils_1.FS.existsSync(benchmarkDoc) ? ['missing benchmark protocol doc'] : []),
        ...(!utils_1.FS.existsSync(goldenScript) ? ['missing golden verifier'] : []),
        ...golden.failures,
        ...(!utils_1.FS.existsSync(baselineScript) ? ['missing baseline verifier'] : []),
        ...baseline.failures
    ];
    return {
        benchmarkDoc,
        goldenDir: golden.dir,
        goldenExpected: golden.expected,
        goldenScript,
        goldenAggregate: golden.aggregate,
        goldenProofReady: golden.ready,
        goldenProofFailures: golden.failures,
        result: golden.result,
        baselineScript,
        baselineAggregate: baseline.aggregate,
        baselineProofReady: baseline.ready,
        baselineProofFailures: baseline.failures,
        baselineArtifacts: baseline.baselines,
        currentSourceCommit,
        totalGoldenRepos: golden.total,
        passedGoldenRepos: golden.passed,
        strictReady: strictFailures.length === 0,
        strictFailures
    };
}

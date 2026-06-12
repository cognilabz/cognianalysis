"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BASELINE_VERIFIER_ID = exports.GOLDEN_VERIFIER_ID = void 0;
exports.baselineProofStatus = baselineProofStatus;
exports.goldenProofStatus = goldenProofStatus;
exports.marketProofStatusForRoot = marketProofStatusForRoot;
const utils_1 = require("./utils");
const Crypto = require('node:crypto');
const ChildProcess = require('node:child_process');
exports.GOLDEN_VERIFIER_ID = 'scripts/verify-golden.mjs';
exports.BASELINE_VERIFIER_ID = 'scripts/verify-baseline.mjs';
const REQUIRED_BASELINE_KINDS = ['raw_agent_prompt', 'scanner_report'];
const REQUIRED_BASELINE_METRICS = ['fact_recall', 'evidence_precision', 'unsupported_claim_rate', 'decision_usefulness'];
const REQUIRED_GOLDEN_METRICS = ['fact_recall', 'evidence_precision', 'unsupported_claim_rate', 'decision_readiness', 'report_completeness', 'invalid_evidence'];
const DEFAULT_REQUIRED_GOLDEN_CATEGORIES = ['rest_openapi_service', 'soap_wsdl_service', 'event_driven_service', 'frontend_backend_app', 'legacy_monolith'];
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
function changedBaselineSubjectPathsSince(root, sourceCommit, currentCommit, relativePaths) {
    if (!sourceCommit || !currentCommit || sourceCommit === currentCommit)
        return [];
    const ancestor = ChildProcess.spawnSync('git', ['merge-base', '--is-ancestor', sourceCommit, currentCommit], {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe'
    });
    if (ancestor.status !== 0)
        return [`source_commit ${sourceCommit} is not an ancestor of current HEAD ${currentCommit}`];
    const paths = relativePaths.map(String).filter(Boolean);
    if (!paths.length)
        return [];
    const diff = ChildProcess.spawnSync('git', ['diff', '--name-only', `${sourceCommit}..${currentCommit}`, '--', ...paths], {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe'
    });
    if (diff.status !== 0)
        return [`could not compare baseline subject freshness from ${sourceCommit} to ${currentCommit}`];
    return String(diff.stdout || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}
function readJsonObject(file) {
    try {
        return JSON.parse(utils_1.FS.readFileSync(file, 'utf8'));
    }
    catch {
        return {};
    }
}
function goldenHasEvidence(item) {
    return asList(item?.evidence).length > 0 || asList(item?.evidence_refs).length > 0;
}
function addGoldenReportFact(out, text, item, source) {
    const value = String(text || '').trim();
    if (!value)
        return;
    out.push({ text: value, source, has_evidence: goldenHasEvidence(item) });
}
function goldenReportFacts(bundle) {
    const out = [];
    for (const section of asList(bundle?.analysis_document?.sections)) {
        for (const block of asList(section?.blocks)) {
            const type = String(block?.type || 'narrative').toLowerCase();
            for (const item of asList(block?.entries))
                addGoldenReportFact(out, item.name || item.title, item, `${section.id || section.title}:${type}:entry`);
            for (const item of asList(block?.exits))
                addGoldenReportFact(out, item.name || item.title, item, `${section.id || section.title}:${type}:exit`);
            for (const item of asList(block?.state))
                addGoldenReportFact(out, item.name || item.title, item, `${section.id || section.title}:${type}:state`);
            for (const item of asList(block?.steps))
                addGoldenReportFact(out, item.description || item.title, item, `${section.id || section.title}:${type}:step`);
            for (const item of asList(block?.items))
                addGoldenReportFact(out, item.title || item.name || item.description, item, `${section.id || section.title}:${type}:item`);
            for (const item of asList(block?.rows)) {
                addGoldenReportFact(out, item.decision, item, `${section.id || section.title}:${type}:decision`);
                addGoldenReportFact(out, item.recommendation, item, `${section.id || section.title}:${type}:recommendation`);
            }
            for (const item of asList(block?.levels))
                addGoldenReportFact(out, item.level || item.title, item, `${section.id || section.title}:${type}:level`);
            for (const item of asList(block?.families))
                addGoldenReportFact(out, item.name || item.title, item, `${section.id || section.title}:${type}:family`);
        }
    }
    return out;
}
function goldenRepresentativeCoverage(root, expectedFiles, suiteRows) {
    const manifestFile = utils_1.Path.join(root, 'benchmarks', 'golden', 'manifest.json');
    const manifest = (0, utils_1.loadJson)(manifestFile, null);
    const expectedByFile = new Map(expectedFiles.map(file => {
        const expectedFile = posixRelative(root, file);
        return [expectedFile, (0, utils_1.loadJson)(file, {})];
    }));
    const suiteByExpectedFile = new Map(suiteRows.map((suite) => [String(suite.expected_file || ''), suite]));
    const errors = [];
    if (!manifest) {
        return {
            manifest_file: posixRelative(root, manifestFile),
            valid_manifest: false,
            ready: false,
            minimum_representative_suites: 5,
            required_categories: DEFAULT_REQUIRED_GOLDEN_CATEGORIES,
            covered_categories: [],
            missing_categories: DEFAULT_REQUIRED_GOLDEN_CATEGORIES,
            distinct_repositories: 0,
            suites: [],
            errors: ['missing golden representative manifest']
        };
    }
    const minimumRepresentativeSuites = Number(manifest.minimum_representative_suites || 0);
    const requiredCategories = asList(manifest.required_categories).map(String).filter(Boolean);
    if (manifest.schemaVersion !== '1.0')
        errors.push('manifest schemaVersion must be 1.0');
    if (!Number.isFinite(minimumRepresentativeSuites) || minimumRepresentativeSuites < 5)
        errors.push('manifest minimum_representative_suites must be at least 5');
    if (requiredCategories.length < 5)
        errors.push('manifest required_categories must include at least 5 categories');
    for (const category of DEFAULT_REQUIRED_GOLDEN_CATEGORIES) {
        if (!requiredCategories.includes(category))
            errors.push(`manifest required_categories missing ${category}`);
    }
    const seenExpectedFiles = new Set();
    const seenRepos = new Set();
    const duplicateRepos = new Set();
    const rows = asList(manifest.suites).map((row, index) => {
        const expected_file = String(row?.expected_file || '').trim();
        const repo = String(row?.repo || '').trim();
        const category = String(row?.category || '').trim();
        const rationale = String(row?.rationale || '').trim();
        const rowErrors = [];
        if (!expected_file)
            rowErrors.push('expected_file is required');
        if (expected_file && !expectedByFile.has(expected_file))
            rowErrors.push('expected_file does not match a discovered golden expected file');
        if (expected_file && seenExpectedFiles.has(expected_file))
            rowErrors.push('expected_file is duplicated in manifest');
        if (expected_file)
            seenExpectedFiles.add(expected_file);
        const expected = expectedByFile.get(expected_file) || {};
        if (!repo)
            rowErrors.push('repo is required');
        if (repo && expected.repo && repo !== expected.repo)
            rowErrors.push(`repo must match expected repo ${expected.repo}`);
        if (repo && seenRepos.has(repo))
            duplicateRepos.add(repo);
        if (repo)
            seenRepos.add(repo);
        if (!category)
            rowErrors.push('category is required');
        if (category && !requiredCategories.includes(category))
            rowErrors.push('category must be listed in required_categories');
        if (!rationale)
            rowErrors.push('rationale is required');
        if (rowErrors.length)
            errors.push(`manifest suite ${expected_file || index + 1}: ${rowErrors.join('; ')}`);
        const suite = suiteByExpectedFile.get(expected_file);
        return {
            expected_file,
            repo,
            category,
            verdict: suite?.valid ? 'pass' : suite?.result?.verdict || 'missing',
            valid: rowErrors.length === 0 && suite?.valid === true
        };
    });
    for (const expectedFile of expectedByFile.keys()) {
        if (!seenExpectedFiles.has(expectedFile))
            errors.push(`manifest missing discovered expected file ${expectedFile}`);
    }
    for (const repo of duplicateRepos)
        errors.push(`manifest repo is duplicated: ${repo}`);
    const coveredCategories = [...new Set(rows.filter(row => row.valid).map(row => row.category))].sort();
    const missingCategories = requiredCategories.filter(category => !coveredCategories.includes(category));
    const distinctRepositories = new Set(rows.filter(row => row.valid).map(row => row.repo).filter(Boolean)).size;
    const validSuites = rows.filter(row => row.valid).length;
    return {
        manifest_file: posixRelative(root, manifestFile),
        valid_manifest: errors.length === 0,
        ready: errors.length === 0
            && validSuites >= minimumRepresentativeSuites
            && distinctRepositories >= minimumRepresentativeSuites
            && missingCategories.length === 0,
        minimum_representative_suites: minimumRepresentativeSuites,
        required_categories: requiredCategories,
        covered_categories: coveredCategories,
        missing_categories: missingCategories,
        distinct_repositories: distinctRepositories,
        suites: rows,
        errors
    };
}
function rowSnippet(row) {
    return String(row?.artifact_snippet || row?.snippet || row?.evidence_text || row?.matched_text || '').trim();
}
function rowOutcomeSnippet(row) {
    return String(row?.support_snippet || row?.justification_snippet || row?.outcome_snippet || row?.support_text || '').trim();
}
function idSetFrom(value) {
    return new Set(asList(value).map((item) => String(item?.id || '').trim()).filter(Boolean));
}
function textByIdFrom(value) {
    const out = new Map();
    for (const item of asList(value)) {
        const id = String(item?.id || '').trim();
        const text = String(item?.expected || item?.text || item?.title || item?.description || item?.decision || '').trim();
        if (id && text)
            out.set(id, text);
    }
    return out;
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
function validatePositiveOutcomeProof(rows, artifactText, label) {
    const errors = [];
    rows.forEach((row) => {
        const positive = (label === 'fact' && (row?.found === true || row?.evidence_present === true || row?.has_evidence === true))
            || (label === 'claim' && (row?.unsupported === false || row?.supported === true))
            || (label === 'decision' && (row?.useful === true || row?.decision_useful === true));
        if (!positive)
            return;
        const id = String(row?.id || '').trim() || 'unknown';
        if (!String(row?.scored_by || row?.reviewer || row?.judge || '').trim())
            errors.push(`metric_derivation ${label} row ${id} scorer/reviewer is required`);
        const snippet = rowOutcomeSnippet(row);
        if (!snippet)
            errors.push(`metric_derivation ${label} row ${id} support_snippet is required`);
        else if (!artifactText.includes(snippet))
            errors.push(`metric_derivation ${label} row ${id} support_snippet is absent from provenance artifact`);
    });
    return errors;
}
function validateRowIdCoverage(rows, expectedIds, label) {
    const errors = [];
    if (expectedIds.size === 0)
        return errors;
    const seen = new Set();
    for (const row of rows) {
        const id = String(row?.id || '').trim();
        if (!id)
            continue;
        if (seen.has(id))
            errors.push(`metric_derivation ${label} row ${id} is duplicated`);
        seen.add(id);
    }
    for (const id of expectedIds) {
        if (!seen.has(id))
            errors.push(`metric_derivation ${label} row ${id} is missing`);
    }
    return errors;
}
function validateRowTextBinding(rows, expectedText, label) {
    const errors = [];
    for (const row of rows) {
        const id = String(row?.id || '').trim();
        const expected = expectedText.get(id);
        const snippet = rowSnippet(row);
        if (id && expected && snippet && !snippet.includes(expected)) {
            errors.push(`metric_derivation ${label} row ${id} artifact_snippet must include comparison target text`);
        }
    }
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
    errors.push(...validatePositiveOutcomeProof(factRows, artifactText, 'fact'));
    errors.push(...validatePositiveOutcomeProof(claimRows, artifactText, 'claim'));
    errors.push(...validatePositiveOutcomeProof(decisionRows, artifactText, 'decision'));
    if (comparisonTargetFile && utils_1.FS.existsSync(comparisonTargetFile)) {
        const target = readJsonObject(comparisonTargetFile);
        const expectedFactIds = idSetFrom(target?.facts || target?.expected_facts);
        const expectedClaimIds = idSetFrom(target?.claims || target?.expected_claims);
        const expectedDecisionIds = idSetFrom(target?.decisions || target?.expected_decisions);
        const expectedFactText = textByIdFrom(target?.facts || target?.expected_facts);
        const expectedClaimText = textByIdFrom(target?.claims || target?.expected_claims);
        const expectedDecisionText = textByIdFrom(target?.decisions || target?.expected_decisions);
        if (factRows.length > 0 && expectedFactIds.size === 0)
            errors.push('comparison target fact expectations are required for baseline fact derivation');
        if (claimRows.length > 0 && expectedClaimIds.size === 0)
            errors.push('comparison target claim expectations are required for baseline claim derivation');
        if (decisionRows.length > 0 && expectedDecisionIds.size === 0)
            errors.push('comparison target decision expectations are required for baseline decision derivation');
        for (const row of factRows) {
            const id = String(row?.id || '').trim();
            if (id && expectedFactIds.size > 0 && !expectedFactIds.has(id))
                errors.push(`metric_derivation fact row ${id} is not present in comparison target facts`);
        }
        errors.push(...validateRowIdCoverage(factRows, expectedFactIds, 'fact'));
        errors.push(...validateRowTextBinding(factRows, expectedFactText, 'fact'));
        for (const row of claimRows) {
            const id = String(row?.id || '').trim();
            if (id && expectedClaimIds.size > 0 && !expectedClaimIds.has(id))
                errors.push(`metric_derivation claim row ${id} is not present in comparison target claims`);
        }
        errors.push(...validateRowIdCoverage(claimRows, expectedClaimIds, 'claim'));
        errors.push(...validateRowTextBinding(claimRows, expectedClaimText, 'claim'));
        for (const row of decisionRows) {
            const id = String(row?.id || '').trim();
            if (id && expectedDecisionIds.size > 0 && !expectedDecisionIds.has(id))
                errors.push(`metric_derivation decision row ${id} is not present in comparison target decisions`);
        }
        errors.push(...validateRowIdCoverage(decisionRows, expectedDecisionIds, 'decision'));
        errors.push(...validateRowTextBinding(decisionRows, expectedDecisionText, 'decision'));
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
    if (sourceCommit && expectedSourceCommit && sourceCommit !== expectedSourceCommit) {
        const changed = changedBaselineSubjectPathsSince(root, sourceCommit, expectedSourceCommit, [parsed?.repo, artifactPath, comparisonTarget]);
        if (changed.length)
            errors.push(`baseline subject changed since source_commit: ${changed.slice(0, 8).join(', ')}`);
    }
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
function validateGoldenResultArtifact(root, parsed, expected, expectedFile, expectedSourceCommit, aggregateSourceCommit) {
    const errors = [];
    const metrics = parsed?.metrics || {};
    errors.push(...validateGoldenMetricDerivation(root, parsed, expected));
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
function validateGoldenMetricDerivation(root, parsed, expected) {
    const errors = [];
    const metrics = parsed?.metrics || {};
    const derivation = parsed?.metric_derivation || parsed?.metricDerivation || {};
    const expectedFacts = asList(expected?.facts);
    const rows = asList(parsed?.facts);
    if (expectedFacts.length === 0)
        errors.push('expected facts are required for golden metric derivation');
    if (rows.length === 0)
        errors.push('golden fact rows are required for metric derivation');
    const expectedById = new Map();
    for (const fact of expectedFacts) {
        const id = String(fact?.id || '').trim();
        if (!id)
            errors.push('expected fact id is required for golden metric derivation');
        else
            expectedById.set(id, fact);
    }
    const seen = new Set();
    for (const row of rows) {
        const id = String(row?.id || '').trim();
        if (!id) {
            errors.push('golden fact row id is required');
            continue;
        }
        if (seen.has(id))
            errors.push(`golden fact row ${id} is duplicated`);
        seen.add(id);
        const expectedFact = expectedById.get(id);
        if (!expectedFact) {
            errors.push(`golden fact row ${id} is not present in expected facts`);
            continue;
        }
        const expectedText = String(expectedFact.expected || '').trim();
        if (String(row?.expected || '').trim() !== expectedText)
            errors.push(`golden fact row ${id} expected text must match expected fact`);
        if (row?.found === true) {
            const matched = String(row?.matched_text || '').trim();
            if (!matched)
                errors.push(`golden fact row ${id} matched_text is required when found`);
            else if (expectedText && !matched.includes(expectedText))
                errors.push(`golden fact row ${id} matched_text must include expected fact text`);
            if (!String(row?.source || '').trim())
                errors.push(`golden fact row ${id} source is required when found`);
            if (expectedFact.evidence_required === true && row?.evidence_present !== true)
                errors.push(`golden fact row ${id} evidence_present is required`);
        }
    }
    for (const id of expectedById.keys()) {
        if (!seen.has(id))
            errors.push(`golden fact row ${id} is missing`);
    }
    const requiredCounts = [
        'expected_fact_count',
        'found_fact_count',
        'evidence_backed_found_fact_count',
        'report_fact_count',
        'unsupported_claim_count',
        'invalid_evidence_count'
    ];
    for (const key of requiredCounts) {
        if (!finiteNumber(derivation[key]))
            errors.push(`metric_derivation.${key} must be a finite number`);
        else if (derivation[key] < 0 || Math.floor(derivation[key]) !== derivation[key])
            errors.push(`metric_derivation.${key} must be a non-negative integer`);
    }
    const foundRows = rows.filter((row) => row?.found === true);
    const evidenceRows = foundRows.filter((row) => row?.evidence_present === true);
    const unsupportedClaimCount = asList(parsed?.unsupported_claims).length;
    const reportFactCount = Number(derivation.report_fact_count);
    if (finiteNumber(derivation.expected_fact_count) && derivation.expected_fact_count !== expectedFacts.length)
        errors.push('metric_derivation.expected_fact_count must match expected facts');
    if (finiteNumber(derivation.found_fact_count) && derivation.found_fact_count !== foundRows.length)
        errors.push('metric_derivation.found_fact_count must match golden fact rows');
    if (finiteNumber(derivation.evidence_backed_found_fact_count) && derivation.evidence_backed_found_fact_count !== evidenceRows.length)
        errors.push('metric_derivation.evidence_backed_found_fact_count must match golden fact rows');
    if (finiteNumber(derivation.unsupported_claim_count) && derivation.unsupported_claim_count !== unsupportedClaimCount)
        errors.push('metric_derivation.unsupported_claim_count must match unsupported_claims');
    if (finiteNumber(derivation.invalid_evidence_count) && !numbersEqual(metrics.invalid_evidence, derivation.invalid_evidence_count))
        errors.push('metrics.invalid_evidence must match metric_derivation.invalid_evidence_count');
    if (finiteNumber(derivation.report_fact_count) && reportFactCount <= 0)
        errors.push('metric_derivation.report_fact_count must be greater than 0');
    const readinessState = String(derivation.final_llm_readiness_state || '').trim();
    if (!readinessState)
        errors.push('metric_derivation.final_llm_readiness_state is required');
    const reportLintComplete = derivation.report_lint_complete;
    const componentCoverageComplete = derivation.component_coverage_complete;
    if (typeof reportLintComplete !== 'boolean')
        errors.push('metric_derivation.report_lint_complete must be boolean');
    if (typeof componentCoverageComplete !== 'boolean')
        errors.push('metric_derivation.component_coverage_complete must be boolean');
    const repo = String(expected?.repo || parsed?.repo || '').trim();
    const suiteAnalysis = repo ? utils_1.Path.join(root, repo, '.analysis') : '';
    const bundleFile = suiteAnalysis ? utils_1.Path.join(suiteAnalysis, 'data', 'bundle.json') : '';
    const reportLintFile = suiteAnalysis ? utils_1.Path.join(suiteAnalysis, 'data', 'analysis-document-report-lint.json') : '';
    const bundle = bundleFile && utils_1.FS.existsSync(bundleFile) ? readJsonObject(bundleFile) : null;
    const reportLint = reportLintFile && utils_1.FS.existsSync(reportLintFile) ? readJsonObject(reportLintFile) : null;
    if (!repo)
        errors.push('golden suite repo is required for readiness derivation binding');
    if (!bundle)
        errors.push('golden suite bundle.json is required for readiness derivation binding');
    if (!reportLint)
        errors.push('golden suite analysis-document-report-lint.json is required for report completeness binding');
    if (bundle) {
        const bundleReadinessState = String(bundle.final_llm_readiness?.state || '').trim();
        if (!bundleReadinessState)
            errors.push('golden suite bundle final_llm_readiness.state is required');
        else if (readinessState && readinessState !== bundleReadinessState)
            errors.push('metric_derivation.final_llm_readiness_state must match suite bundle final_llm_readiness.state');
        if (bundle.analysis_document_component_coverage?.complete !== true && bundle.analysis_document_component_coverage?.complete !== false)
            errors.push('golden suite bundle analysis_document_component_coverage.complete is required');
        else if (typeof componentCoverageComplete === 'boolean' && componentCoverageComplete !== bundle.analysis_document_component_coverage.complete)
            errors.push('metric_derivation.component_coverage_complete must match suite bundle analysis_document_component_coverage.complete');
    }
    if (reportLint) {
        if (reportLint.complete !== true && reportLint.complete !== false)
            errors.push('golden suite report-lint complete is required');
        else if (typeof reportLintComplete === 'boolean' && reportLintComplete !== reportLint.complete)
            errors.push('metric_derivation.report_lint_complete must match suite analysis-document-report-lint.json complete');
    }
    const bundleFacts = bundle ? goldenReportFacts(bundle) : [];
    if (expectedFacts.length > 0) {
        const factRecall = foundRows.length / expectedFacts.length;
        if (!numbersEqual(metrics.fact_recall, factRecall))
            errors.push('metrics.fact_recall must match golden fact rows');
    }
    if (foundRows.length > 0) {
        const evidencePrecision = evidenceRows.length / foundRows.length;
        if (!numbersEqual(metrics.evidence_precision, evidencePrecision))
            errors.push('metrics.evidence_precision must match golden fact rows');
    }
    else if (!numbersEqual(metrics.evidence_precision, 0)) {
        errors.push('metrics.evidence_precision must be 0 when no golden facts are found');
    }
    if (reportFactCount > 0) {
        const unsupportedClaimRate = unsupportedClaimCount / reportFactCount;
        if (!numbersEqual(metrics.unsupported_claim_rate, unsupportedClaimRate))
            errors.push('metrics.unsupported_claim_rate must match metric_derivation report facts and unsupported_claims');
    }
    if (readinessState) {
        const decisionReadiness = readinessState === 'ready' ? 1 : 0;
        if (!numbersEqual(metrics.decision_readiness, decisionReadiness))
            errors.push('metrics.decision_readiness must match metric_derivation.final_llm_readiness_state');
    }
    if (typeof reportLintComplete === 'boolean' && typeof componentCoverageComplete === 'boolean') {
        const reportCompleteness = reportLintComplete === true && componentCoverageComplete === true ? 1 : 0;
        if (!numbersEqual(metrics.report_completeness, reportCompleteness))
            errors.push('metrics.report_completeness must match metric_derivation report_lint/component_coverage completeness');
    }
    if (bundle) {
        for (const row of foundRows) {
            const id = String(row?.id || '').trim() || 'unknown';
            const matched = String(row?.matched_text || '').trim();
            const source = String(row?.source || '').trim();
            const hit = bundleFacts.find((fact) => fact.text === matched && fact.source === source);
            if (!hit)
                errors.push(`golden fact row ${id} matched_text/source must be present in suite bundle analysis_document`);
            else if (Boolean(hit.has_evidence) !== Boolean(row?.evidence_present))
                errors.push(`golden fact row ${id} evidence_present must match suite bundle evidence`);
        }
    }
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
            ...(!result ? [`missing verifier result artifact ${parsed.repo || '<missing repo>'}/.analysis/data/golden-benchmark.json`] : validateGoldenResultArtifact(root, result, parsed, expected_file, expectedSourceCommit, String(aggregate?.source_commit || '')))
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
    const representative = goldenRepresentativeCoverage(root, expectedFiles, expected);
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
        const aggregateCoverage = aggregate.representative_coverage || {};
        if (aggregateCoverage.ready !== representative.ready)
            aggregateErrors.push('golden aggregate representative_coverage.ready must reflect validated manifest coverage');
        if (Number(aggregateCoverage.distinct_repositories || 0) !== representative.distinct_repositories)
            aggregateErrors.push('golden aggregate representative_coverage.distinct_repositories must match validated manifest coverage');
        if (asList(aggregateCoverage.missing_categories).join('|') !== representative.missing_categories.join('|'))
            aggregateErrors.push('golden aggregate representative_coverage.missing_categories must match validated manifest coverage');
        if (aggregate.market_proof_ready !== (expectedFiles.length >= 5 && expected.every(item => item.valid) && representative.ready === true))
            aggregateErrors.push('golden aggregate market_proof_ready must reflect validated artifacts and representative coverage');
    }
    const passed = expected.filter(item => item.valid).length;
    const failures = [
        ...aggregateErrors,
        ...(expectedFiles.length < 5 ? [`need at least 5 golden repos, found ${expectedFiles.length}`] : []),
        ...(passed < 5 ? [`need at least 5 validated passing golden repos, found ${passed}`] : []),
        ...(representative.ready ? [] : [
            ...representative.errors.map((error) => `golden representative manifest: ${error}`),
            ...(representative.missing_categories.length ? [`need representative golden categories: ${representative.missing_categories.join(', ')}`] : []),
            ...(representative.distinct_repositories < Number(representative.minimum_representative_suites || 5) ? [`need ${representative.minimum_representative_suites || 5} distinct representative golden repositories, found ${representative.distinct_repositories}`] : [])
        ]),
        ...expected.filter(item => !item.valid).flatMap(item => item.validation_errors.map((error) => `${item.expected_file}: ${error}`))
    ];
    return {
        dir: goldenDir,
        expectedFiles,
        expected: expected.map(item => item.expected_file),
        aggregate,
        representativeCoverage: representative,
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
        goldenRepresentativeCoverage: golden.representativeCoverage,
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

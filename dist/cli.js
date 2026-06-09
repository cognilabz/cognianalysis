#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const aggregate_1 = require("./aggregate");
const report_1 = require("./report");
const repoMap_1 = require("./repoMap");
const tasks_1 = require("./tasks");
const utils_1 = require("./utils");
const mcp_1 = require("./mcp");
const VERSION = '0.6.0';
function analysisPath(repo, value) {
    if (value)
        return utils_1.Path.resolve(value);
    return utils_1.Path.join(repo, '.analysis');
}
function usage() {
    console.log(`Codebase Analysis Pack v${VERSION} · TypeScript

Usage:
  cba prepare [repo] [--analysis .analysis] [--capsules 44]
  cba analyze [repo] [--analysis .analysis] [--no-html]
  cba finalize [repo] [--analysis .analysis] [--out report-dir] [--title title] [--allow-invalid] [--allow-partial]
  cba finish [repo]   # alias for finalize
  cba report [repo]   # alias for finalize
  cba aggregate [repo] [--analysis .analysis]
  cba render [repo] [--analysis .analysis] [--out report-dir] [--title title]
  cba validate [repo] [--analysis .analysis]
  cba coverage [repo] [--analysis .analysis]
  cba init-codex [target] [--force]
  cba portfolio --repos repos.txt --out portfolio-analysis
  cba mcp
`);
}
function repoArg(args, fallback = '.') {
    const first = args.find(a => !a.startsWith('--'));
    return utils_1.Path.resolve(first || fallback);
}
function cmdPrepare(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const codeMap = (0, repoMap_1.buildRepoMap)(repo, {
        maxFileSize: (0, utils_1.numericArg)(args, '--max-file-size', 1250000),
        capsuleLimit: (0, utils_1.numericArg)(args, '--capsules', 44),
        capsuleChars: (0, utils_1.numericArg)(args, '--capsule-chars', 10000)
    });
    (0, aggregate_1.prepareAnalysis)(repo, analysis, codeMap);
    const tasks = (0, tasks_1.writeLlmTasks)(analysis, codeMap);
    const seedDir = utils_1.Path.join(repo, '.analysis-seed', 'llm');
    if (utils_1.FS.existsSync(seedDir) && !(0, utils_1.hasFlag)(args, '--no-seed')) {
        (0, utils_1.copyRecursive)(seedDir, utils_1.Path.join(analysis, 'llm'), false);
    }
    console.log(`Prepared LLM-first analysis workspace: ${analysis}`);
    console.log(`Code map: ${utils_1.Path.join(analysis, 'data', 'code-map.json')}`);
    console.log(`Source capsules: ${utils_1.Path.join(analysis, 'source-capsules.json')}`);
    console.log(`Codex tasks: ${utils_1.Path.join(analysis, 'llm_tasks')} (${tasks.length} tasks)`);
    console.log('Important: code-map signals are hints only; Codex/LLM extracts final interfaces, flows and business logic.');
    return 0;
}
function hasLlmJson(analysis) {
    const llmDir = utils_1.Path.join(analysis, 'llm');
    if (!utils_1.FS.existsSync(llmDir))
        return false;
    return utils_1.FS.readdirSync(llmDir).some((f) => f.endsWith('.json'));
}
function cmdAnalyze(args) {
    const rc = cmdPrepare(args);
    if (rc !== 0)
        return rc;
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    if (hasLlmJson(analysis)) {
        console.log('LLM output detected. Finalizing report.');
        return cmdFinalize(args);
    }
    const bundle = (0, aggregate_1.aggregate)(repo, analysis);
    if (!(0, utils_1.hasFlag)(args, '--no-html'))
        console.log(`Report: ${(0, report_1.renderReport)(analysis, undefined, (0, utils_1.argValue)(args, '--title'))}`);
    console.log(`Status: ${bundle.status?.state}`);
    console.log('Next step for an agent harness: execute .analysis/llm_tasks/*.md, write .analysis/llm/*.json, then run cba finalize .');
    return 0;
}
function cmdAggregate(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const bundle = (0, aggregate_1.aggregate)(repo, analysis);
    console.log(`Aggregated bundle: ${utils_1.Path.join(analysis, 'data', 'bundle.json')}`);
    console.log(`Capabilities: ${(bundle.capabilities || []).length} · Interfaces: ${(bundle.interfaces || []).length} · Flows: ${(bundle.flows || []).length}`);
    return 0;
}
function cmdRender(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const out = (0, utils_1.argValue)(args, '--out');
    console.log((0, report_1.renderReport)(analysis, out ? utils_1.Path.resolve(out) : undefined, (0, utils_1.argValue)(args, '--title')));
    return 0;
}
function cmdValidate(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const bundle = (0, aggregate_1.aggregate)(repo, analysis);
    const invalid = (bundle.evidence_index || []).filter((e) => e.valid === false);
    console.log(`Evidence: ${(bundle.evidence_index || []).length} total · ${invalid.length} invalid`);
    for (const e of invalid.slice(0, 30))
        console.log(`INVALID ${e.path}:${e.line} ${e.reason || ''}`);
    return invalid.length ? 1 : 0;
}
function cmdCoverage(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const bundle = (0, aggregate_1.aggregate)(repo, analysis);
    const rows = bundle.target_coverage || [];
    const sc = bundle.source_coverage || {};
    console.log('Target coverage:');
    for (const row of rows)
        console.log(`${row.design_status.padEnd(7)} ${String(row.output_status).padEnd(8)} ${row.title}`);
    const missing = rows.filter((r) => ['missing', 'pending'].includes(r.output_status));
    console.log(`\n${rows.length - missing.length}/${rows.length} capabilities have current output; design coverage is complete by construction.`);
    console.log(`Source coverage: ${sc.covered_files || 0}/${sc.total_files || 0} files · ${sc.uncovered_files || 0} uncovered · ${sc.coverage_percent ?? 0}%`);
    return 0;
}
function cmdFinalize(args) {
    const repo = repoArg(args);
    const analysis = analysisPath(repo, (0, utils_1.argValue)(args, '--analysis'));
    const out = (0, utils_1.argValue)(args, '--out');
    const title = (0, utils_1.argValue)(args, '--title');
    const bundle = (0, aggregate_1.aggregate)(repo, analysis);
    const rows = bundle.target_coverage || [];
    const missing = rows.filter((r) => ['missing', 'pending'].includes(r.output_status));
    const invalid = (bundle.evidence_index || []).filter((e) => e.valid === false);
    const sourceCoverage = bundle.source_coverage || {};
    const uncovered = sourceCoverage.uncovered || [];
    const report = (0, utils_1.hasFlag)(args, '--no-html') ? '' : (0, report_1.renderReport)(analysis, out ? utils_1.Path.resolve(out) : undefined, title);
    console.log(`Finalized analysis workspace: ${analysis}`);
    console.log(`Status: ${bundle.status?.state}`);
    console.log(`Target coverage: ${rows.length - missing.length}/${rows.length} present`);
    if (missing.length)
        console.log(`Pending outputs: ${missing.map((r) => r.title).slice(0, 8).join(', ')}${missing.length > 8 ? ' …' : ''}`);
    console.log(`Source coverage: ${sourceCoverage.covered_files || 0}/${sourceCoverage.total_files || 0} files · ${sourceCoverage.uncovered_files || 0} uncovered · ${sourceCoverage.coverage_percent ?? 0}%`);
    console.log(`Evidence: ${(bundle.evidence_index || []).length} total · ${invalid.length} invalid`);
    if (report)
        console.log(`Report: ${report}`);
    for (const e of invalid.slice(0, 30))
        console.log(`INVALID ${e.path}:${e.line} ${e.reason || ''}`);
    for (const f of uncovered.slice(0, 30))
        console.log(`UNCOVERED ${f.path}`);
    if (invalid.length && !(0, utils_1.hasFlag)(args, '--allow-invalid'))
        return 1;
    if (bundle.status?.state === 'llm_extracted' && sourceCoverage.complete !== true && !(0, utils_1.hasFlag)(args, '--allow-partial'))
        return 1;
    return 0;
}
function resourceRoot() {
    return utils_1.Path.resolve(__dirname, '..', 'resources');
}
function cmdInitCodex(args) {
    const target = repoArg(args);
    const force = (0, utils_1.hasFlag)(args, '--force');
    (0, utils_1.ensureDir)(target);
    const root = resourceRoot();
    (0, utils_1.copyRecursive)(utils_1.Path.join(root, 'AGENTS.md'), utils_1.Path.join(target, 'AGENTS.md'), force);
    (0, utils_1.copyRecursive)(utils_1.Path.join(root, 'agents'), utils_1.Path.join(target, '.agents'), force);
    console.log(`Installed Codex assets into ${target}`);
    console.log(`- ${utils_1.Path.join(target, 'AGENTS.md')}`);
    console.log(`- ${utils_1.Path.join(target, '.agents')}`);
    return 0;
}
function cmdPortfolio(args) {
    const reposFile = (0, utils_1.argValue)(args, '--repos');
    const out = utils_1.Path.resolve((0, utils_1.argValue)(args, '--out', 'portfolio-analysis') || 'portfolio-analysis');
    if (!reposFile)
        throw new Error('Missing --repos repos.txt');
    (0, utils_1.ensureDir)(out);
    const rows = [];
    const lines = utils_1.FS.readFileSync(utils_1.Path.resolve(reposFile), 'utf8').split(/\r?\n/).map((x) => x.trim()).filter((x) => x && !x.startsWith('#'));
    for (const line of lines) {
        const repo = utils_1.Path.resolve(line);
        const row = { repo: utils_1.Path.basename(repo), path: repo };
        if (!utils_1.FS.existsSync(repo)) {
            row.error = 'not_found';
            rows.push(row);
            continue;
        }
        const analysis = utils_1.Path.join(out, 'repos', utils_1.Path.basename(repo));
        try {
            const codeMap = (0, repoMap_1.buildRepoMap)(repo, { capsuleLimit: (0, utils_1.numericArg)(args, '--capsules', 44), maxFileSize: (0, utils_1.numericArg)(args, '--max-file-size', 1250000) });
            (0, aggregate_1.prepareAnalysis)(repo, analysis, codeMap);
            (0, tasks_1.writeLlmTasks)(analysis, codeMap);
            const bundle = (0, aggregate_1.aggregate)(repo, analysis);
            const report = (0, report_1.renderReport)(analysis);
            row.report = report;
            row.repo_type = bundle.profile?.repo_type;
            row.source_files = bundle.profile?.source_files;
            row.signals = (bundle.signals || []).length;
            row.status = bundle.status?.state;
        }
        catch (err) {
            row.error = err?.message || String(err);
        }
        rows.push(row);
    }
    (0, utils_1.writeJson)(utils_1.Path.join(out, 'portfolio-summary.json'), rows);
    (0, utils_1.writeText)(utils_1.Path.join(out, 'index.html'), portfolioHtml(rows));
    console.log(utils_1.Path.join(out, 'index.html'));
    return 0;
}
function portfolioHtml(rows) {
    const trs = rows.map(r => `<tr><td>${esc(r.repo)}</td><td>${esc(r.repo_type || '')}</td><td>${esc(r.source_files || '')}</td><td>${esc(r.signals || '')}</td><td>${esc(r.status || '')}</td><td>${esc(r.error || '')}</td><td>${r.report ? `<a href="${esc(r.report)}">Report</a>` : ''}</td></tr>`).join('');
    return `<!doctype html><meta charset='utf-8'><title>Portfolio Analysis</title><style>body{font-family:system-ui;margin:30px;background:#f5f7fb}table{border-collapse:collapse;width:100%;background:white}td,th{border:1px solid #e0e6f0;padding:10px;text-align:left}</style><h1>Portfolio Analysis</h1><table><thead><tr><th>Repo</th><th>Type</th><th>Source Files</th><th>Signals</th><th>Status</th><th>Error</th><th>Report</th></tr></thead><tbody>${trs}</tbody></table>`;
}
function esc(v) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function main(argv = process.argv.slice(2)) {
    const command = argv[0];
    const args = argv.slice(1);
    try {
        if (!command || command === 'help' || command === '--help' || command === '-h') {
            usage();
            return 0;
        }
        if (command === '--version' || command === '-v') {
            console.log(VERSION);
            return 0;
        }
        if (command === 'prepare')
            return cmdPrepare(args);
        if (command === 'analyze')
            return cmdAnalyze(args);
        if (command === 'finalize' || command === 'finish' || command === 'report')
            return cmdFinalize(args);
        if (command === 'aggregate')
            return cmdAggregate(args);
        if (command === 'render')
            return cmdRender(args);
        if (command === 'validate')
            return cmdValidate(args);
        if (command === 'coverage')
            return cmdCoverage(args);
        if (command === 'init-codex')
            return cmdInitCodex(args);
        if (command === 'portfolio')
            return cmdPortfolio(args);
        if (command === 'mcp') {
            (0, mcp_1.startMcpLikeServer)();
            return 0;
        }
        usage();
        return 1;
    }
    catch (err) {
        console.error(`Error: ${err?.message || String(err)}`);
        return 1;
    }
}
if (require.main === module) {
    if (process.argv[2] === 'mcp')
        (0, mcp_1.startMcpLikeServer)();
    else
        process.exit(main());
}

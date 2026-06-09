#!/usr/bin/env node
import { aggregate, prepareAnalysis } from './aggregate';
import { renderReport } from './report';
import { buildRepoMap } from './repoMap';
import { writeLlmTasks } from './tasks';
import { FS, Path, argValue, copyRecursive, ensureDir, hasFlag, numericArg, writeJson, writeText } from './utils';
import { startMcpLikeServer } from './mcp';

const VERSION = '0.6.0';

function analysisPath(repo: string, value?: string): string {
  if (value) return Path.resolve(value);
  return Path.join(repo, '.analysis');
}

function usage(): void {
  console.log(`Codebase Analysis Pack v${VERSION} · TypeScript

Usage:
  cba prepare [repo] [--analysis .analysis] [--capsules 44]
  cba analyze [repo] [--analysis .analysis] [--no-html]
  cba finalize [repo] [--analysis .analysis] [--out report-dir] [--title title] [--allow-invalid]
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

function repoArg(args: string[], fallback = '.'): string {
  const first = args.find(a => !a.startsWith('--'));
  return Path.resolve(first || fallback);
}

function cmdPrepare(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const codeMap = buildRepoMap(repo, {
    maxFileSize: numericArg(args, '--max-file-size', 1_250_000),
    capsuleLimit: numericArg(args, '--capsules', 44),
    capsuleChars: numericArg(args, '--capsule-chars', 10_000)
  });
  prepareAnalysis(repo, analysis, codeMap);
  const tasks = writeLlmTasks(analysis, codeMap);
  const seedDir = Path.join(repo, '.analysis-seed', 'llm');
  if (FS.existsSync(seedDir) && !hasFlag(args, '--no-seed')) {
    copyRecursive(seedDir, Path.join(analysis, 'llm'), false);
  }
  console.log(`Prepared LLM-first analysis workspace: ${analysis}`);
  console.log(`Code map: ${Path.join(analysis, 'data', 'code-map.json')}`);
  console.log(`Source capsules: ${Path.join(analysis, 'source-capsules.json')}`);
  console.log(`Codex tasks: ${Path.join(analysis, 'llm_tasks')} (${tasks.length} tasks)`);
  console.log('Important: code-map signals are hints only; Codex/LLM extracts final interfaces, flows and business logic.');
  return 0;
}

function hasLlmJson(analysis: string): boolean {
  const llmDir = Path.join(analysis, 'llm');
  if (!FS.existsSync(llmDir)) return false;
  return FS.readdirSync(llmDir).some((f: string) => f.endsWith('.json'));
}

function cmdAnalyze(args: string[]): number {
  const rc = cmdPrepare(args);
  if (rc !== 0) return rc;
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  if (hasLlmJson(analysis)) {
    console.log('LLM output detected. Finalizing report.');
    return cmdFinalize(args);
  }
  const bundle = aggregate(repo, analysis);
  if (!hasFlag(args, '--no-html')) console.log(`Report: ${renderReport(analysis, undefined, argValue(args, '--title'))}`);
  console.log(`Status: ${bundle.status?.state}`);
  console.log('Next step for an agent harness: execute .analysis/llm_tasks/*.md, write .analysis/llm/*.json, then run cba finalize .');
  return 0;
}

function cmdAggregate(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const bundle = aggregate(repo, analysis);
  console.log(`Aggregated bundle: ${Path.join(analysis, 'data', 'bundle.json')}`);
  console.log(`Capabilities: ${(bundle.capabilities || []).length} · Interfaces: ${(bundle.interfaces || []).length} · Flows: ${(bundle.flows || []).length}`);
  return 0;
}

function cmdRender(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const out = argValue(args, '--out');
  console.log(renderReport(analysis, out ? Path.resolve(out) : undefined, argValue(args, '--title')));
  return 0;
}

function cmdValidate(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const bundle = aggregate(repo, analysis);
  const invalid = (bundle.evidence_index || []).filter((e: any) => e.valid === false);
  console.log(`Evidence: ${(bundle.evidence_index || []).length} total · ${invalid.length} invalid`);
  for (const e of invalid.slice(0, 30)) console.log(`INVALID ${e.path}:${e.line} ${e.reason || ''}`);
  return invalid.length ? 1 : 0;
}

function cmdCoverage(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const bundle = aggregate(repo, analysis);
  const rows = bundle.target_coverage || [];
  console.log('Target coverage:');
  for (const row of rows) console.log(`${row.design_status.padEnd(7)} ${String(row.output_status).padEnd(8)} ${row.title}`);
  const missing = rows.filter((r: any) => ['missing','pending'].includes(r.output_status));
  console.log(`\n${rows.length - missing.length}/${rows.length} capabilities have current output; design coverage is complete by construction.`);
  return 0;
}

function cmdFinalize(args: string[]): number {
  const repo = repoArg(args);
  const analysis = analysisPath(repo, argValue(args, '--analysis'));
  const out = argValue(args, '--out');
  const title = argValue(args, '--title');

  const bundle = aggregate(repo, analysis);
  const rows = bundle.target_coverage || [];
  const missing = rows.filter((r: any) => ['missing', 'pending'].includes(r.output_status));
  const invalid = (bundle.evidence_index || []).filter((e: any) => e.valid === false);
  const report = hasFlag(args, '--no-html') ? '' : renderReport(analysis, out ? Path.resolve(out) : undefined, title);

  console.log(`Finalized analysis workspace: ${analysis}`);
  console.log(`Status: ${bundle.status?.state}`);
  console.log(`Target coverage: ${rows.length - missing.length}/${rows.length} present`);
  if (missing.length) console.log(`Pending outputs: ${missing.map((r: any) => r.title).slice(0, 8).join(', ')}${missing.length > 8 ? ' …' : ''}`);
  console.log(`Evidence: ${(bundle.evidence_index || []).length} total · ${invalid.length} invalid`);
  if (report) console.log(`Report: ${report}`);

  for (const e of invalid.slice(0, 30)) console.log(`INVALID ${e.path}:${e.line} ${e.reason || ''}`);
  if (invalid.length && !hasFlag(args, '--allow-invalid')) return 1;
  return 0;
}

function resourceRoot(): string {
  return Path.resolve(__dirname, '..', 'resources');
}

function cmdInitCodex(args: string[]): number {
  const target = repoArg(args);
  const force = hasFlag(args, '--force');
  ensureDir(target);
  const root = resourceRoot();
  copyRecursive(Path.join(root, 'AGENTS.md'), Path.join(target, 'AGENTS.md'), force);
  copyRecursive(Path.join(root, 'agents'), Path.join(target, '.agents'), force);
  console.log(`Installed Codex assets into ${target}`);
  console.log(`- ${Path.join(target, 'AGENTS.md')}`);
  console.log(`- ${Path.join(target, '.agents')}`);
  return 0;
}

function cmdPortfolio(args: string[]): number {
  const reposFile = argValue(args, '--repos');
  const out = Path.resolve(argValue(args, '--out', 'portfolio-analysis') || 'portfolio-analysis');
  if (!reposFile) throw new Error('Missing --repos repos.txt');
  ensureDir(out);
  const rows: any[] = [];
  const lines = FS.readFileSync(Path.resolve(reposFile), 'utf8').split(/\r?\n/).map((x: string) => x.trim()).filter((x: string) => x && !x.startsWith('#'));
  for (const line of lines) {
    const repo = Path.resolve(line);
    const row: any = { repo: Path.basename(repo), path: repo };
    if (!FS.existsSync(repo)) { row.error = 'not_found'; rows.push(row); continue; }
    const analysis = Path.join(out, 'repos', Path.basename(repo));
    try {
      const codeMap = buildRepoMap(repo, { capsuleLimit: numericArg(args, '--capsules', 44), maxFileSize: numericArg(args, '--max-file-size', 1_250_000) });
      prepareAnalysis(repo, analysis, codeMap);
      writeLlmTasks(analysis, codeMap);
      const bundle = aggregate(repo, analysis);
      const report = renderReport(analysis);
      row.report = report;
      row.repo_type = bundle.profile?.repo_type;
      row.source_files = bundle.profile?.source_files;
      row.signals = (bundle.signals || []).length;
      row.status = bundle.status?.state;
    } catch (err: any) {
      row.error = err?.message || String(err);
    }
    rows.push(row);
  }
  writeJson(Path.join(out, 'portfolio-summary.json'), rows);
  writeText(Path.join(out, 'index.html'), portfolioHtml(rows));
  console.log(Path.join(out, 'index.html'));
  return 0;
}

function portfolioHtml(rows: any[]): string {
  const trs = rows.map(r => `<tr><td>${esc(r.repo)}</td><td>${esc(r.repo_type || '')}</td><td>${esc(r.source_files || '')}</td><td>${esc(r.signals || '')}</td><td>${esc(r.status || '')}</td><td>${esc(r.error || '')}</td><td>${r.report ? `<a href="${esc(r.report)}">Report</a>` : ''}</td></tr>`).join('');
  return `<!doctype html><meta charset='utf-8'><title>Portfolio Analysis</title><style>body{font-family:system-ui;margin:30px;background:#f5f7fb}table{border-collapse:collapse;width:100%;background:white}td,th{border:1px solid #e0e6f0;padding:10px;text-align:left}</style><h1>Portfolio Analysis</h1><table><thead><tr><th>Repo</th><th>Type</th><th>Source Files</th><th>Signals</th><th>Status</th><th>Error</th><th>Report</th></tr></thead><tbody>${trs}</tbody></table>`;
}

function esc(v: any): string { return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

export function main(argv = process.argv.slice(2)): number {
  const command = argv[0];
  const args = argv.slice(1);
  try {
    if (!command || command === 'help' || command === '--help' || command === '-h') { usage(); return 0; }
    if (command === '--version' || command === '-v') { console.log(VERSION); return 0; }
    if (command === 'prepare') return cmdPrepare(args);
    if (command === 'analyze') return cmdAnalyze(args);
    if (command === 'finalize' || command === 'finish' || command === 'report') return cmdFinalize(args);
    if (command === 'aggregate') return cmdAggregate(args);
    if (command === 'render') return cmdRender(args);
    if (command === 'validate') return cmdValidate(args);
    if (command === 'coverage') return cmdCoverage(args);
    if (command === 'init-codex') return cmdInitCodex(args);
    if (command === 'portfolio') return cmdPortfolio(args);
    if (command === 'mcp') { startMcpLikeServer(); return 0; }
    usage();
    return 1;
  } catch (err: any) {
    console.error(`Error: ${err?.message || String(err)}`);
    return 1;
  }
}

if (require.main === module) {
  if (process.argv[2] === 'mcp') startMcpLikeServer();
  else process.exit(main());
}

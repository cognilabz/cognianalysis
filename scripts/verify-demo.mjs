import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const demoFixture = join(root, 'examples', 'demo-repo');
const verifyRoot = mkdtempSync(join(root, '.verify-tmp-demo-'));
const demo = join(verifyRoot, 'demo-repo');
const cli = join(root, 'dist', 'cli.js');
cpSync(demoFixture, demo, { recursive: true });
process.on('exit', () => rmSync(verifyRoot, { recursive: true, force: true }));

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit'
  });
  if (options.expectFailure) {
    if (result.status === 0) {
      throw new Error(`Expected command to fail: cognianalysis ${args.join(' ')}`);
    }
    return result;
  }
  if (result.status !== 0) {
    throw new Error(`Command failed with exit ${result.status}: cognianalysis ${args.join(' ')}`);
  }
  return result;
}

function callMcpTool(name, args = {}) {
  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name, arguments: args }
  };
  const result = spawnSync(process.execPath, [cli, 'mcp'], {
    cwd: root,
    encoding: 'utf8',
    input: `${JSON.stringify(payload)}\n`,
    stdio: 'pipe',
    timeout: 10000
  });
  if (result.status !== 0) {
    throw new Error(`MCP tool failed with exit ${result.status}: ${result.stderr || result.stdout}`);
  }
  const lines = String(result.stdout || '').trim().split(/\r?\n/).filter(Boolean);
  const response = JSON.parse(lines.at(-1));
  if (response.error) throw new Error(`MCP error: ${response.error.message}`);
  const text = response.result?.content?.[0]?.text || '{}';
  return JSON.parse(text);
}

function callMcpToolExpectError(name, args = {}) {
  try {
    callMcpTool(name, args);
  } catch (err) {
    return String(err?.message || err);
  }
  throw new Error(`Expected MCP tool to fail: ${name}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runtimeSourceFiles(dir) {
  return readdirSync(dir)
    .flatMap(name => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return runtimeSourceFiles(full);
      return (full.endsWith('.ts') && !full.endsWith('.d.ts')) || full.endsWith('.js') ? [full] : [];
    });
}

rmSync(join(demo, '.analysis'), { recursive: true, force: true });
const analyzeReadyOutput = run(['analyze', demo, '--goal', 'Create a decision report for the demo onboarding service.'], { capture: true }).stdout || '';
assert(analyzeReadyOutput.includes('Product mode complete.'), 'Analyze must be the positive product-mode entrypoint for a ready seeded workspace');
run(['dev', 'audit-report', demo]);
const runOutput = run(['run', demo], { capture: true }).stdout || '';
assert(runOutput.includes('Product mode complete.'), 'Compatibility run alias must still finalize a ready analysis workspace');
const openOutput = run(['open', demo], { capture: true }).stdout || '';
assert(openOutput.includes('report/index.html'), 'open command must print the rendered report path');
const statusOutput = run(['status', demo], { capture: true }).stdout || '';
assert(statusOutput.includes('Repository Analysis Status'), 'status command must expose product-language status');
assert(statusOutput.includes('Analysis scope declared'), 'status command must include declared analysis scope');
assert(statusOutput.includes('Analysis matches current commit'), 'status command must include current-commit freshness');
assert(statusOutput.includes('Executive decision layer complete'), 'status command must include executive decision layer state');
assert(statusOutput.includes('Consistency review complete'), 'status command must include consistency review state');
assert(statusOutput.includes('Open questions structured'), 'status command must include structured open-question state');
assert(statusOutput.includes('Next action:'), 'status command must print a next action');
assert(!statusOutput.includes('cognianalysis run'), 'Product status must not recommend the run compatibility alias');
assert(!statusOutput.includes('cognianalysis tier-next'), 'Product status must not recommend bare tier-next outside the dev namespace');
assert(!statusOutput.includes('cognianalysis audit-report'), 'Product status must not recommend bare audit-report outside the dev namespace');
const repairOutput = run(['repair', demo], { capture: true }).stdout || '';
assert(repairOutput.includes('Repair report:'), 'repair command must write a repair report');
assert(repairOutput.includes('Broken JSON: 0'), 'repair command must report broken JSON count');
const resumeOutput = run(['resume', demo], { capture: true }).stdout || '';
assert(resumeOutput.includes('Detected existing analysis.'), 'resume command must detect an existing analysis');
assert(resumeOutput.includes('Skipping: ✓ Repository indexed'), 'resume command must print completed product stages');
const doctorOutput = run(['dev', 'doctor', demo], { capture: true }).stdout || '';
assert(doctorOutput.includes('Report lint:'), 'doctor command must expose report lint state');
assert(doctorOutput.includes('Analysis scope:'), 'doctor command must expose scope state');
assert(doctorOutput.includes('Analysis freshness:'), 'doctor command must expose staleness state');
assert(doctorOutput.includes('Executive decision layer:'), 'doctor command must expose executive decision layer state');
assert(doctorOutput.includes('Consistency review:'), 'doctor command must expose consistency review state');
assert(doctorOutput.includes('Evidence strength:'), 'doctor command must expose evidence-strength state');
assert(doctorOutput.includes('Open questions:'), 'doctor command must expose open-question state');
const doctorMarketOutput = run(['dev', 'doctor', demo, '--market-proof'], { capture: true }).stdout || '';
assert(doctorMarketOutput.includes('Market proof:'), 'doctor --market-proof must expose benchmark proof state');
const doctorMarketStrict = run(['dev', 'doctor', demo, '--market-proof', '--strict'], { capture: true, expectFailure: true });
const doctorMarketStrictOutput = `${doctorMarketStrict.stdout || ''}\n${doctorMarketStrict.stderr || ''}`;
assert(doctorMarketStrictOutput.includes('Strict market proof: not_ready'), 'doctor --market-proof --strict must fail until multi-repo/baseline proof exists');
assert(doctorMarketStrictOutput.includes('STRICT-MISSING'), 'strict market proof must explain missing proof dimensions');
const auditOutput = run(['dev', 'audit-report', demo], { capture: true }).stdout || '';
assert(auditOutput.includes('Source inventory:'), 'Audit output must use source inventory accounting wording');
assert(auditOutput.includes('Report quality lint: passed'), 'Audit output must expose deterministic report quality lint');
assert(auditOutput.includes('Open questions: structured'), 'Audit output must expose structured open-question state');
assert(!auditOutput.includes('Source coverage:'), 'Audit output must not expose source coverage as a visible verdict label');
const coverageOutput = run(['dev', 'coverage', demo], { capture: true }).stdout || '';
assert(coverageOutput.includes('Source inventory accounting:'), 'Coverage output must expose source inventory accounting wording');
assert(coverageOutput.includes('Tier 1 task backlog:'), 'Coverage output must expose Tier 1 task backlog wording');
assert(!coverageOutput.includes('Source coverage:'), 'Coverage output must not expose source coverage as a visible verdict label');
assert(coverageOutput.includes('target capabilities are registered as Codex-authored trace context'), 'Coverage output must describe target rows as unscored Codex-authored trace context');
assert(!coverageOutput.includes('tracked linked'), 'Coverage output must not describe target rows as linked/present artifacts');
assert(!coverageOutput.includes('covered present'), 'Coverage output must not use covered as the target design status');
assert(!coverageOutput.includes('target capability rows are present'), 'Coverage output must not sound like a semantic all-present verdict');

const bundlePath = join(demo, '.analysis', 'data', 'bundle.json');
const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
const demoHtml = readFileSync(join(demo, '.analysis', 'report', 'index.html'), 'utf8');
assert(demoHtml.includes('class="evidence-quick"'), 'Rendered report must expose visible evidence navigation chips');
assert(demoHtml.includes('data-evidence-target='), 'Rendered report evidence chips must jump to detailed evidence rows');
assert(!demoHtml.includes('https://cdn.jsdelivr.net'), 'Rendered report must not load external CDN assets by default');
assert(!demoHtml.includes(demo), 'Rendered report must not expose the local absolute repository path');
const demoReportData = readFileSync(join(demo, '.analysis', 'report', 'analysis-data.json'), 'utf8');
assert(!demoReportData.includes(demo), 'Rendered report data must not expose the local absolute repository path');
const demoCodeMap = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'code-map.json'), 'utf8'));
const demoSourceFamilyInventory = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'source-family-inventory.json'), 'utf8'));
const demoGoalContract = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'analysis-goal-contract.json'), 'utf8'));
const demoToolPositioningReferences = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'tool-positioning-references.json'), 'utf8'));
const demoComponentLibrary = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'report-component-library.json'), 'utf8'));
const demoSourceTierModel = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'source-tier-model.json'), 'utf8'));
const demoSourceTierBacklog = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'source-tier-backlog.json'), 'utf8'));
const demoSkillCatalog = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'analysis-skill-catalog.json'), 'utf8'));
const demoReportLint = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'analysis-document-report-lint.json'), 'utf8'));
const demoExecutiveDecisionLayer = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'analysis-document-executive-decision-layer.json'), 'utf8'));
const demoConsistencyReview = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'analysis-document-consistency-review.json'), 'utf8'));
const demoEvidenceStrength = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'analysis-document-evidence-strength.json'), 'utf8'));
const demoSemanticLineage = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'analysis-document-semantic-lineage.json'), 'utf8'));
const demoOpenQuestions = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'analysis-document-open-questions.json'), 'utf8'));
const demoExternalFindings = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'external-findings.json'), 'utf8'));
const demoAnalysisRun = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'analysis-run.json'), 'utf8'));
const demoAnalysisRunProvenance = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'analysis-run-provenance.json'), 'utf8'));
const demoArtifactDependencyGraph = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'artifact-dependency-graph.json'), 'utf8'));
const demoAnalysisScope = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'analysis-scope.json'), 'utf8'));
const demoAnalysisStaleness = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'analysis-staleness.json'), 'utf8'));
const demoRepairReport = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'repair-report.json'), 'utf8'));
const demoPipeline = JSON.parse(readFileSync(join(demo, '.analysis', 'analysis-pipeline.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const demoTaskManifest = JSON.parse(readFileSync(join(demo, '.analysis', 'task-manifest.json'), 'utf8'));
const demoCapabilityTemplateManifest = JSON.parse(readFileSync(join(demo, '.analysis', 'capability-template-manifest.json'), 'utf8'));
const instructions = readFileSync(join(demo, '.analysis', 'llm_instructions.md'), 'utf8');
const singleTask = readFileSync(join(demo, '.analysis', 'TASK.md'), 'utf8');
const finalReportTask = readFileSync(join(demo, '.analysis', 'llm_tasks', '12-analysis-document.md'), 'utf8');
const strategyTask = readFileSync(join(demo, '.analysis', 'llm_tasks', '00-analysis-strategy.md'), 'utf8');
const rootAgents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
const resourceAgents = readFileSync(join(root, 'resources', 'AGENTS.md'), 'utf8');
const readme = readFileSync(join(root, 'README.md'), 'utf8');

const symlinkTargetRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-evidence-escape-'));
const symlinkRepoRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-symlink-repo-'));
try {
  const symlinkRepo = join(symlinkRepoRoot, 'demo-repo');
  cpSync(demo, symlinkRepo, { recursive: true });
  writeFileSync(join(symlinkTargetRoot, 'outside.txt'), 'outside repo\n', 'utf8');
  symlinkSync(join(symlinkTargetRoot, 'outside.txt'), join(symlinkRepo, 'outside-link.txt'));
  const docPath = join(symlinkRepo, '.analysis', 'llm', 'analysis-document.json');
  const doc = JSON.parse(readFileSync(docPath, 'utf8'));
  doc.analysis_document.sections[0].blocks[0].evidence.push({ path: 'outside-link.txt', line: 1 });
  writeFileSync(docPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  const symlinkValidate = run(['dev', 'validate', symlinkRepo], { capture: true, expectFailure: true });
  assert((symlinkValidate.stdout || '').includes('path escapes repository'), 'Evidence validation must reject symlinks that resolve outside the repository');
} finally {
  rmSync(symlinkTargetRoot, { recursive: true, force: true });
  rmSync(symlinkRepoRoot, { recursive: true, force: true });
}

const helpOutput = run(['--help'], { capture: true }).stdout || '';
assert(helpOutput.includes('analyze [repo]'), 'CLI help must expose product-mode analyze');
assert(helpOutput.includes('--mode brief|blueprint|deep-dive'), 'CLI help must expose product analysis modes');
assert(helpOutput.includes('--goal text'), 'CLI help must expose goal-first product input');
assert(helpOutput.includes('--flow name') && helpOutput.includes('--module path') && helpOutput.includes('--api name'), 'CLI help must expose deep-dive target flags');
assert(helpOutput.includes('resume [repo]'), 'CLI help must expose product-mode resume');
assert(helpOutput.includes('dev prepare [repo]'), 'CLI help must expose internal prepare under dev namespace');
assert(helpOutput.includes('--scope complete|critical-path|representative'), 'CLI help must expose deliberate scope modes');
assert(helpOutput.includes('--scope-files N'), 'CLI help must expose non-complete scope sizing');
assert(helpOutput.includes('status [repo]'), 'CLI help must expose product-mode status');
assert(helpOutput.includes('repair [repo]'), 'CLI help must expose product-mode repair');
assert(helpOutput.includes('open [repo]'), 'CLI help must expose product-mode open');
assert(helpOutput.includes('init-harness'), 'CLI help must expose the generic harness installer');
assert(helpOutput.includes('init-codex'), 'CLI help must keep the Codex compatibility installer');
const scopedTarget = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-scope-'));
const scopedRepo = join(scopedTarget, 'demo-repo');
cpSync(demo, scopedRepo, { recursive: true });
rmSync(join(scopedRepo, '.analysis'), { recursive: true, force: true });
run(['analyze', scopedRepo, '--scope', 'representative', '--scope-files', '5', '--no-seed', '--no-html']);
const scopedAnalysisScope = JSON.parse(readFileSync(join(scopedRepo, '.analysis', 'data', 'analysis-scope.json'), 'utf8'));
assert(scopedAnalysisScope.mode === 'representative', `Scoped prepare must persist representative mode, got ${scopedAnalysisScope.mode}`);
assert(scopedAnalysisScope.selected_files === 5, `Scoped prepare must select requested file count, got ${scopedAnalysisScope.selected_files}`);
assert(scopedAnalysisScope.deferred_files > 0, 'Scoped prepare must expose deferred files');
const tempHarnessRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-harness-install-'));
try {
  const harnessTarget = join(tempHarnessRoot, 'target');
  run(['init-harness', harnessTarget, '--harness', 'all'], { capture: true });
  const expectedHarnessFiles = [
    'AGENTS.md',
    '.agents/skills/cognianalysis/SKILL.md',
    'CLAUDE.md',
    '.cursor/rules/cognianalysis/RULE.md',
    '.devin/rules/cognianalysis.md',
    '.github/copilot-instructions.md',
    'CONVENTIONS.md',
    '.aider.conf.yml',
    'COGNIANALYSIS_HARNESS.md'
  ];
  for (const file of expectedHarnessFiles) {
    assert(existsSync(join(harnessTarget, file)), `init-harness --harness all must write ${file}`);
  }
  const claudeHarness = readFileSync(join(harnessTarget, 'CLAUDE.md'), 'utf8');
  const cursorHarness = readFileSync(join(harnessTarget, '.cursor/rules/cognianalysis/RULE.md'), 'utf8');
  const windsurfHarness = readFileSync(join(harnessTarget, '.devin/rules/cognianalysis.md'), 'utf8');
  const copilotHarness = readFileSync(join(harnessTarget, '.github/copilot-instructions.md'), 'utf8');
  const aiderHarness = readFileSync(join(harnessTarget, 'CONVENTIONS.md'), 'utf8');
  const genericHarness = readFileSync(join(harnessTarget, 'COGNIANALYSIS_HARNESS.md'), 'utf8');
  assert(claudeHarness.includes('Claude Code, as the active in-session LLM, performs the semantic extraction'), 'Claude adapter must use Claude Code as the in-session LLM executor');
  for (const [name, text] of [['CLAUDE.md', claudeHarness], ['Cursor rule', cursorHarness], ['Windsurf rule', windsurfHarness], ['Copilot instructions', copilotHarness], ['Aider conventions', aiderHarness], ['Generic harness', genericHarness]]) {
    assert(!text.includes('Codex itself executes'), `${name} must not claim Codex executes non-Codex workpacks`);
  }
  assert(readFileSync(join(harnessTarget, '.cursor/rules/cognianalysis/RULE.md'), 'utf8').includes('alwaysApply: true'), 'Cursor adapter must be an always-on project rule');
  assert(readFileSync(join(harnessTarget, '.devin/rules/cognianalysis.md'), 'utf8').includes('trigger: always_on'), 'Windsurf adapter must be an always-on workspace rule');
  assert(readFileSync(join(harnessTarget, '.github/copilot-instructions.md'), 'utf8').includes('Cognianalysis for GitHub Copilot'), 'Copilot adapter must be repository instructions');
  assert(readFileSync(join(harnessTarget, '.aider.conf.yml'), 'utf8').includes('read: CONVENTIONS.md'), 'Aider adapter must configure the conventions file as readable context');

  const codexOnlyTarget = join(tempHarnessRoot, 'codex-only');
  run(['init-codex', codexOnlyTarget], { capture: true });
  assert(existsSync(join(codexOnlyTarget, 'AGENTS.md')), 'init-codex must still write AGENTS.md');
  assert(existsSync(join(codexOnlyTarget, '.agents/skills/cognianalysis/SKILL.md')), 'init-codex must still write Codex skills');
  assert(!existsSync(join(codexOnlyTarget, 'CLAUDE.md')), 'init-codex must stay Codex-only and not write Claude adapter files');

  const noSkillsTarget = join(tempHarnessRoot, 'no-skills');
  run(['init-harness', noSkillsTarget, '--harness', 'claude', '--no-skills'], { capture: true });
  assert(existsSync(join(noSkillsTarget, 'AGENTS.md')), 'init-harness --no-skills must still write AGENTS.md');
  assert(existsSync(join(noSkillsTarget, 'CLAUDE.md')), 'init-harness --harness claude must write CLAUDE.md');
  assert(!existsSync(join(noSkillsTarget, '.agents')), 'init-harness --no-skills must not copy .agents skills');
} finally {
  rmSync(tempHarnessRoot, { recursive: true, force: true });
}
for (const marker of ['Accenture GenWizard', 'CAST Imaging', 'SonarQube', 'OpenRewrite']) {
  assert(instructions.includes(marker), `Generated LLM instructions are missing tool-positioning reference marker: ${marker}`);
}
assert(bundle.llm_detail_agent_plan?.planning_source === 'llm/detail-agent-plan.json', 'Demo plan must come from llm/detail-agent-plan.json');
assert(bundle.llm_analysis_strategy?.planning_source === 'llm/analysis-strategy.json', 'Demo strategy must come from llm/analysis-strategy.json');
assert(bundle.llm_analysis_strategy?.uses_pre_analysis_strategy_artifact === true, 'Demo must use the pre-analysis LLM strategy artifact');
assert(bundle.llm_analysis_strategy?.strategy_present === true, 'Demo LLM strategy artifact must be structured and present');
assert(bundle.llm_detail_agent_plan?.uses_pre_final_plan_artifact === true, 'Demo must use the pre-final detail-agent plan artifact');
assert(bundle.llm_output_presence?.['assessment.repository_wide_view'] === true, 'Demo whole-repository view must be a concrete LLM-authored assessment.repository_wide_view field');
const demoWholeRepoRow = (bundle.target_artifact_contract_coverage || bundle.target_coverage || []).find(row => row.id === 'whole-repository-documentation');
assert(demoWholeRepoRow?.output_status === 'not_scored', 'Demo whole-repository target row must not be CLI presence-scored');
assert(demoWholeRepoRow?.design_status === 'context', 'Demo target matrix design status must be context, not covered/tracked');
assert(demoWholeRepoRow?.design_status_meaning?.includes('not a claim'), 'Demo target matrix must clarify design status is not semantic satisfaction');
assert(demoWholeRepoRow?.output_details?.some(row => row.key === 'assessment.repository_wide_view' && row.deterministic_presence_scored === false), 'Demo whole-repository row must expose expected output keys as unscored authoring hints');
const demoTargetRows = bundle.target_artifact_contract_coverage || bundle.target_coverage || [];
assert(demoTargetRows.length > 0, 'Demo target capability context rows must be present');
assert(demoTargetRows.every(row => row.coverage_kind === 'goal_contract_context'), 'Every target row must be goal context, not semantic coverage');
assert(demoTargetRows.every(row => row.semantic_verdict_authority === 'codex_llm'), 'Every target row must assign semantic verdict authority to Codex as the in-session LLM');
assert(demoTargetRows.every(row => row.design_status === 'context'), 'Every target row must use context design status instead of covered/tracked');
assert(demoTargetRows.every(row => row.output_status === 'not_scored'), 'No target row may be deterministically present/partial/missing scored');
assert(demoTargetRows.every(row => row.output_status_meaning?.includes('Not scored by the CLI')), 'Every target row must clarify output status is not CLI-scored');
assert(demoTargetRows.every(row => row.design_status_meaning?.includes('not a claim')), 'Every target row must clarify design status is not semantic satisfaction');
assert(bundle.analysis_document_prerequisite_coverage?.complete === true, `Demo final synthesis prerequisites incomplete: ${(bundle.analysis_document_prerequisite_coverage?.missing_outputs || []).join(', ')}`);
assert(bundle.analysis_document_prerequisite_coverage?.deterministic_contract_scope?.includes('optional capability-template outputs are not a fixed final-readiness gate'), 'Demo prerequisite coverage must not make optional capability templates a fixed gate');
assert(!(bundle.analysis_document_prerequisite_coverage?.missing_outputs || []).includes('llm/flows-mermaid.json'), 'Optional flow template output must not be a required final prerequisite');
assert(bundle.analysis_document_requirements_trace_contract?.complete === true, `Demo original requirement trace contract incomplete: ${(bundle.analysis_document_requirements_trace_contract?.missing || []).join(', ')} ${(bundle.analysis_document_requirements_trace_contract?.weak || []).join(', ')}`);
assert(bundle.analysis_document_requirements_trace_contract?.contract_kind === 'llm_authored_requirements_trace', 'Demo requirements trace must be marked as an LLM-authored trace contract');
assert(bundle.analysis_goal_trace_alignment?.complete === true, `Demo LLM goal trace references incomplete: ${(bundle.analysis_goal_trace_alignment?.missing_goal_refs || []).map(item => item.ref || item).join(', ')}`);
assert(bundle.analysis_goal_trace_alignment?.deterministic_contract_scope?.includes('no semantic matching'), 'Demo goal trace alignment must forbid deterministic semantic matching');
assert(bundle.analysis_goal_trace_alignment?.expected_goal_refs?.length === 19, 'Demo goal trace alignment must include all original goal contract refs, including output shape refs and tiered analysis');
assert(bundle.analysis_goal_trace_alignment?.expected_goal_refs?.some(item => item.ref === 'required_output_shape.deliverable'), 'Demo goal trace alignment must include the structured decision-document output shape ref');
assert(bundle.analysis_goal_trace_alignment?.expected_goal_refs?.some(item => item.ref === 'required_output_shape.management_drilldown'), 'Demo goal trace alignment must include the management/business drilldown output shape ref');
assert(bundle.analysis_goal_trace_alignment?.expected_goal_refs?.some(item => item.ref === 'required_report_behaviors.tiered_whole_codebase_analysis'), 'Demo goal trace alignment must include the tiered whole-codebase analysis behavior ref');
assert(bundle.analysis_goal_trace_alignment?.referenced_goal_refs?.some(item => item.ref === 'required_output_shape.style_system'), 'Demo LLM requirements trace must explicitly reference the stable component/style output shape');
assert(bundle.analysis_goal_trace_alignment?.referenced_goal_refs?.some(item => item.ref === 'required_output_shape.management_drilldown'), 'Demo LLM requirements trace must explicitly reference the management/business drilldown output shape');
assert(bundle.analysis_goal_trace_alignment?.referenced_goal_refs?.some(item => item.ref === 'required_report_behaviors.tiered_whole_codebase_analysis'), 'Demo LLM requirements trace must explicitly reference tiered whole-codebase analysis');
assert(bundle.report_mode?.final_after_detail_reviews === true, 'Demo final report must declare synthesis_stage=final_after_detail_reviews');
assert(bundle.report_mode?.pre_final_building_blocks_complete === true, 'Demo report mode must require complete pre-final building blocks');
assert(bundle.analysis_pipeline_contract?.complete === true, `Demo analysis pipeline contract incomplete: ${(bundle.analysis_pipeline_contract?.missing || []).join(', ')}`);
assert(bundle.analysis_pipeline?.pipeline_kind === 'llm_driven_overview_detail_final_report', 'Demo analysis pipeline must describe overview-detail-final LLM flow');
assert(bundle.analysis_pipeline?.stages?.some(stage => stage.id === 'llm_analysis_strategy' && stage.semantic_authority === true), 'Demo pipeline must include an LLM-authored analysis strategy stage');
assert(bundle.analysis_pipeline?.stages?.some(stage => stage.id === 'llm_skill_workbench_reviews' && stage.semantic_authority === true), 'Demo pipeline must include LLM-planned skill workbench reviews');
assert(bundle.semantic_authority?.analysis_pipeline_contract_complete === true, 'Demo semantic authority must expose the completed analysis pipeline contract');
for (const command of ['analyze', 'status', 'open', 'resume', 'repair', 'init-harness', 'init-codex', 'mcp']) {
  assert(bundle.tooling?.public_cli_commands?.includes(command), `Demo tooling contract must expose public product command: ${command}`);
}
for (const command of ['dev prepare', 'dev finalize', 'dev audit-report', 'dev aggregate', 'dev coverage', 'dev render', 'dev validate', 'dev tier-status', 'dev tier-next', 'dev tier-context', 'dev doctor', 'dev portfolio', 'dev run', 'dev init']) {
  assert(bundle.tooling?.internal_cli_commands?.includes(command), `Demo tooling contract must expose internal dev command: ${command}`);
}
for (const command of ['run', 'init', 'prepare', 'finalize', 'finish', 'report', 'audit-report', 'aggregate', 'coverage', 'render', 'validate', 'tier-status', 'tier-next', 'tier-context', 'doctor', 'portfolio']) {
  assert(bundle.tooling?.compatibility_cli_commands?.includes(command), `Demo tooling contract must preserve compatibility command: ${command}`);
}
assert(bundle.tooling?.product_mode_available === true, 'Demo tooling contract must expose product mode availability');
assert(bundle.skill_workbench_coverage?.complete === true, `Demo LLM-planned skill workbench coverage incomplete: ${bundle.skill_workbench_coverage?.status || 'unknown'}`);
assert(bundle.skill_workbench_coverage?.executed_count === 3, 'Demo must execute all three LLM-planned skill workbenches from analysis_strategy.skill_application_plan');
assert(bundle.analysis_document_skill_workbench_synthesis?.complete === true, `Demo skill-workbench synthesis incomplete: ${bundle.analysis_document_skill_workbench_synthesis?.status || 'unknown'}`);
assert(bundle.analysis_document_skill_workbench_synthesis?.integrated_count === 3, 'Demo final report must synthesize all executed skill workbench reviews');
assert(bundle.source_family_detail_review_coverage?.complete === true, `Demo LLM-planned detail review coverage incomplete: ${bundle.source_family_detail_review_coverage?.status || 'unknown'}`);
assert(bundle.source_family_detail_review_coverage?.no_detail_review_decision_present === true, 'Demo detail-agent plan must include an LLM-authored detail/no-detail decision');
assert((bundle.source_family_detail_review_coverage?.unexpected_reviews || []).length === 0, 'Demo must not execute detail reviews outside the LLM-authored detail-agent plan');
for (const [name, text] of [['AGENTS.md', rootAgents], ['resources/AGENTS.md', resourceAgents], ['README.md', readme]]) {
  assert(!text.includes('Execute every task under `.analysis/llm_tasks/`'), `${name} must not describe the old flat LLM task execution flow`);
  assert(text.includes('00-analysis-strategy.md') || text.includes('analysis-strategy.json'), `${name} must document the LLM analysis strategy step`);
  assert(text.includes('11-detail-agent-plan.md'), `${name} must document the LLM detail-agent plan step`);
  assert(text.includes('12-analysis-document.md'), `${name} must document final report authoring after detail reviews`);
  assert(text.includes('cognianalysis resume .') || text.includes('`cognianalysis resume .`'), `${name} must document product-mode resume`);
  assert(text.includes('--scope complete') && text.includes('critical-path') && text.includes('representative'), `${name} must document deliberate scope modes`);
  assert(text.includes('analysis-staleness') || text.includes('freshness'), `${name} must document stale-analysis freshness checks`);
  assert(text.includes('analysis_document.open_questions'), `${name} must document structured open questions`);
  assert(text.includes('evidence') && (text.includes('path:line') || text.includes('file:line')), `${name} must document visible evidence references`);
}
assert(strategyTask.includes('pre_source_tier_pre_overview'), 'Generated strategy task must require the pre-source-tier LLM strategy stage');
assert(finalReportTask.includes('analysis-strategy.json'), 'Final report task must require reading the LLM analysis strategy');
assert(demoTaskManifest.tasks?.every(task => typeof task.id === 'string' && task.id.length > 0), 'Demo task manifest must expose stable task ids');
assert(demoTaskManifest.single_task_file === 'TASK.md', 'Demo task manifest must expose the single product-mode task guide');
assert(demoTaskManifest.tasks?.length === 3, 'Demo task manifest must contain only required workflow tasks');
assert(demoTaskManifest.tasks?.every(task => task.task_kind === 'workflow_task' && task.required_for_final === true), 'Required task manifest entries must be workflow gates');
assert(demoTaskManifest.capability_templates?.length === 10, 'Demo task manifest must expose optional capability templates separately');
assert(singleTask.includes('Product-Mode Loop'), 'Generated TASK.md must expose the product-mode loop');
assert(singleTask.includes('cognianalysis analyze .'), 'Generated TASK.md must make analyze the normal entrypoint');
assert(singleTask.includes('cognianalysis resume .'), 'Generated TASK.md must expose resume for interrupted runs');
assert(singleTask.includes('--scope critical-path --scope-files N'), 'Generated TASK.md must expose scoped large-repo runs');
assert(singleTask.includes('analysis_document.open_questions'), 'Generated TASK.md must expose the structured open-question contract');
assert(demoCapabilityTemplateManifest.mode === 'optional_llm_capability_templates', 'Capability template manifest must mark templates as optional');
assert(demoCapabilityTemplateManifest.templates?.every(template => template.required_for_final === false), 'Capability templates must not be final-readiness gates');
assert(!existsSync(join(demo, '.analysis', 'llm_tasks', '01-core-assessment.md')), 'Generic capability templates must not be generated as required llm_tasks');
assert(existsSync(join(demo, '.analysis', 'capability_templates', '01-core-assessment.md')), 'Generic capability templates must live under capability_templates');
assert(readFileSync(join(root, 'src', 'tasks.ts'), 'utf8').includes('schemaForTask(task.id)'), 'Task schema selection must use explicit task ids');
assert(!readFileSync(join(root, 'src', 'tasks.ts'), 'utf8').includes('schemaForTitle'), 'Task schema selection must not depend on title string matching');
assert(!readFileSync(join(root, 'src', 'tasks.ts'), 'utf8').includes('title.includes'), 'Task routing must not use title.includes string matching');
assert(packageJson.name === 'cognianalysis', 'Package name must be cognianalysis');
assert(packageJson.bin?.cognianalysis === 'dist/cli.js', 'Package must expose the cognianalysis CLI');
assert(packageJson.scripts?.['verify:golden'] === 'npm run build && node scripts/verify-golden.mjs', 'Package must expose the golden benchmark verifier');
assert(packageJson.scripts?.['verify:baseline'] === 'npm run build && node scripts/verify-baseline.mjs', 'Package must expose the baseline benchmark verifier');
assert(packageJson.files?.includes('benchmarks'), 'Package must publish benchmark fixtures');
assert(packageJson.files?.includes('scripts'), 'Package must publish benchmark verification scripts');
assert(!Object.prototype.hasOwnProperty.call(packageJson.bin || {}, 'cba'), 'Package must not expose the legacy cba CLI alias');
assert(!packageJson.files?.includes('examples'), 'Package must not publish generated demo .analysis artifacts through the broad examples folder');
assert(packageJson.files?.includes('examples/demo-repo/.analysis-seed'), 'Package must publish reusable demo seed data');
const semanticRuntimeSources = ['src', 'dist']
  .flatMap(dir => {
    const full = join(root, dir);
    return existsSync(full) ? runtimeSourceFiles(full) : [];
  })
  .map(file => [file.slice(root.length + 1), readFileSync(file, 'utf8')]);
const forbiddenSemanticRuntimeSnippets = [
  'prefixKey',
  'rom-pl',
  "'src/main/java'",
  "'src/test/java'",
  "'src/main/kotlin'",
  "'src/test/kotlin'",
  "'src/main/scala'",
  "'src/test/scala'",
  'fixedLabels',
  'fixedShellLabels',
  'Syntax error in text',
  'mermaid version',
  'ev?.line || 1',
  'schemaForTitle',
  'title.includes'
];
const forbiddenSemanticRuntimeSourceLayouts = [
  ['src', 'main', 'java'],
  ['src', 'test', 'java'],
  ['src', 'main', 'kotlin'],
  ['src', 'test', 'kotlin'],
  ['src', 'main', 'scala'],
  ['src', 'test', 'scala']
].map(parts => parts.join('/'));
for (const [file, source] of semanticRuntimeSources) {
  for (const snippet of forbiddenSemanticRuntimeSnippets) {
    assert(!source.includes(snippet), `${file} must not reintroduce forbidden deterministic semantic/report shortcut: ${snippet}`);
  }
  for (const layout of forbiddenSemanticRuntimeSourceLayouts) {
    assert(!source.includes(layout), `${file} must not hardcode source layout path: ${layout}`);
  }
}
assert(bundle.analysis_skill_catalog_contract?.complete === true, `Demo analysis skill catalog contract incomplete: ${(bundle.analysis_skill_catalog_contract?.missing || []).join(', ')}`);
assert(bundle.analysis_skill_catalog?.catalog_kind === 'llm_analysis_skill_catalog', 'Demo bundle must expose the LLM analysis skill catalog');
assert(bundle.semantic_authority?.analysis_skill_catalog_contract_complete === true, 'Demo semantic authority must expose the completed analysis skill catalog contract');
assert(demoSkillCatalog?.catalog_kind === 'llm_analysis_skill_catalog', 'Demo must write analysis-skill-catalog.json');
assert(demoSkillCatalog?.semantic_authority === 'codex_llm', 'Demo analysis skill catalog must give semantic authority to Codex as the in-session LLM');
assert(demoSkillCatalog?.deterministic_authority === 'catalog_presence_and_shape_only', 'Demo analysis skill catalog deterministic authority must be shape-only');
assert(demoSkillCatalog?.skills?.some(skill => skill.id === 'whole_repository_understanding'), 'Demo analysis skill catalog must include whole-repository understanding');
assert(demoSkillCatalog?.skills?.some(skill => skill.id === 'final_report_authoring'), 'Demo analysis skill catalog must include final report authoring');
assert(demoPipeline?.pipeline_kind === 'llm_driven_overview_detail_final_report', 'Demo must write analysis-pipeline.json');
assert(demoPipeline.stages?.some(stage => stage.id === 'llm_final_analysis_document' && stage.semantic_authority === true), 'Demo pipeline final report stage must be LLM-authoritative');
assert(demoPipeline.stages?.some(stage => stage.id === 'deterministic_finalization_and_rendering' && stage.semantic_authority === false), 'Demo pipeline finalization stage must be deterministic contract only');
assert(bundle.analysis_document_quality_review?.complete === true, `Demo LLM report quality review incomplete: ${(bundle.analysis_document_quality_review?.missing || []).join(', ')}`);
assert(bundle.analysis_document_report_lint?.complete === true, `Demo report lint incomplete: ${(bundle.analysis_document_report_lint?.missing || []).join(', ')}`);
assert(demoReportLint.complete === true, `Demo report lint artifact incomplete: ${(demoReportLint.missing || []).join(', ')}`);
assert(demoReportLint.required_quality_checks?.length === 10, 'Report lint must require all ten management/market quality checks');
assert(demoReportLint.unsupported_claim_count === 0, 'Demo report lint must expose zero unsupported claims');
assert((demoReportLint.claim_support_gaps || []).length === 0, 'Demo report lint must not find unsupported structured claims');
assert(bundle.analysis_document_executive_decision_layer?.complete === true, `Demo executive decision layer incomplete: ${(bundle.analysis_document_executive_decision_layer?.missing || []).join(', ')}`);
assert(demoExecutiveDecisionLayer.complete === true, `Demo executive decision artifact incomplete: ${(demoExecutiveDecisionLayer.missing || []).join(', ')}`);
assert(demoExecutiveDecisionLayer.visible_executive_section_present === true, 'Demo must expose a visible executive decision section');
assert(bundle.analysis_document_consistency_review?.complete === true, `Demo consistency review incomplete: ${(bundle.analysis_document_consistency_review?.missing || []).join(', ')}`);
assert(demoConsistencyReview.contradictions_found === 0, 'Demo consistency review must expose zero contradictions');
assert(bundle.analysis_document_evidence_strength?.complete === true, `Demo evidence strength incomplete: ${(bundle.analysis_document_evidence_strength?.missing_confidence || []).join(', ')}`);
assert(demoEvidenceStrength.item_count > 0, 'Demo evidence strength artifact must score major report claims');
assert((demoEvidenceStrength.missing_confidence || []).length === 0, 'Demo evidence strength must not find missing confidence');
assert(bundle.analysis_document_semantic_lineage?.complete === true, `Demo semantic lineage incomplete: ${(bundle.analysis_document_semantic_lineage?.incomplete_claims || []).map(item => item.claim_id || item).join(', ')}`);
assert(demoSemanticLineage.complete === true, `Demo semantic-lineage artifact incomplete: ${(demoSemanticLineage.incomplete_claims || []).map(item => item.claim_id || item).join(', ')}`);
assert(demoSemanticLineage.claim_count > 0, 'Demo semantic-lineage artifact must trace major visible claims');
assert(demoSemanticLineage.lineage?.every(row => row.origin_artifact && row.supporting_artifacts?.length && row.evidence?.length), 'Every demo semantic-lineage row must connect claim, upstream artifacts and evidence');
assert(bundle.semantic_authority?.semantic_lineage_complete === true, 'Semantic authority must expose completed semantic-lineage contract');
assert(bundle.analysis_run?.analysis_run_id && bundle.analysis_run.analysis_run_id === demoAnalysisRun.analysis_run_id, 'Bundle and analysis-run artifact must share analysis_run_id');
assert(demoAnalysisRunProvenance.complete === true, `Demo analysis-run provenance incomplete: ${(demoAnalysisRunProvenance.missing_required_artifacts || []).join(', ')}`);
assert(demoAnalysisRunProvenance.generated_from_matrix?.some(row => row.path === 'llm/analysis-document.json'), 'Analysis-run provenance must include the final analysis document');
assert(bundle.semantic_authority?.analysis_run_provenance_complete === true, 'Semantic authority must expose completed analysis-run provenance');
assert(demoArtifactDependencyGraph.complete === true, `Demo artifact dependency graph incomplete: ${(demoArtifactDependencyGraph.missing_nodes || []).join(', ')}`);
assert(demoArtifactDependencyGraph.nodes?.some(row => row.id === 'analysis_document' && row.depends_on?.includes('detail_agent_plan')), 'Artifact dependency graph must link final report to detail-agent plan');
assert(bundle.semantic_authority?.artifact_dependency_graph_complete === true, 'Semantic authority must expose completed artifact dependency graph');
assert(demoExternalFindings.complete === true, `Demo external findings contract incomplete: ${(demoExternalFindings.invalid_findings || []).map(item => item.id || item).join(', ')}`);
assert(demoExternalFindings.deterministic_authority === 'external_finding_shape_and_evidence_only', 'External findings contract must remain shape/evidence only');
assert(bundle.semantic_authority?.external_findings_ingestion_complete === true, 'Semantic authority must expose completed external-findings ingestion contract');
assert(bundle.analysis_document_open_questions?.complete === true, `Demo bundle open-question contract incomplete: ${(bundle.analysis_document_open_questions?.missing || []).join(', ')}`);
assert(bundle.analysis_document_open_questions?.blocking_count === 0, 'Demo bundle must expose zero blocking open questions');
assert(bundle.semantic_authority?.open_questions_complete === true, 'Semantic authority must expose the completed open-question contract');
assert(demoAnalysisScope.mode === 'complete', `Demo default analysis scope must be complete, got ${demoAnalysisScope.mode}`);
assert(demoAnalysisStaleness.stale === false, 'Demo analysis staleness artifact must report current analysis');
assert(demoOpenQuestions.complete === true, `Demo open-question artifact incomplete: ${(demoOpenQuestions.missing || []).join(', ')}`);
assert(demoOpenQuestions.question_count === 0, 'Demo must explicitly report no top-level open questions');
assert(demoOpenQuestions.blocking_count === 0, 'Demo must not have blocking open questions');
assert(demoRepairReport.json_problems?.length === 0, 'Demo repair report must show no broken JSON after repair');
assert(bundle.analysis_document_quality_review?.partial_requirement_rationale_required === true, 'Demo must require LLM rationale for partial/open trace rows when the final verdict is decision_ready');
assert(bundle.analysis_document_quality_review?.partial_requirement_rationale_ok === true, 'Demo LLM quality review must include accepted-limitation rationale for every partial/open trace row');
assert((bundle.analysis_document_quality_review?.partial_requirements_without_rationale || []).length === 0, 'Demo must not have partial/open trace rows without LLM-authored rationale');
assert(bundle.report_mode?.report_quality_review_complete === true, 'Demo report mode must require complete LLM report quality review');
assert(bundle.analysis_document_component_coverage?.complete === true, `Demo analysis document component coverage incomplete: ${(bundle.analysis_document_component_coverage?.missing || []).join(', ')}`);
assert(bundle.analysis_document_component_coverage?.component_library_kind === 'analysis_document_component_library', 'Demo component contract must come from the report component library');
assert(bundle.analysis_document_component_coverage?.contract_summary?.includes('not a judgment of report quality'), 'Demo component contract must clarify it is not a semantic-quality verdict');
assert(demoComponentLibrary?.library_kind === 'analysis_document_component_library', 'Demo must write the report component library artifact');
assert(demoComponentLibrary?.semantic_authority === false, 'Demo report component library must not be semantic authority');
assert(demoComponentLibrary?.components?.some(component => component.id === 'flow'), 'Demo report component library must include the flow component');
assert(demoComponentLibrary?.components?.find(component => component.id === 'open_questions')?.expected_fields?.includes('items[].blocking'), 'Open questions component must expose blocking state');
assert(demoComponentLibrary?.components?.find(component => component.id === 'narrative')?.expected_fields?.includes('business_need?'), 'Narrative component must expose business-need wording fields');
assert(demoComponentLibrary?.components?.find(component => component.id === 'narrative')?.expected_fields?.includes('technical_drilldown?'), 'Narrative component must expose technical-drilldown wording fields');
assert(demoComponentLibrary?.purpose?.includes('Blocks may include labels'), 'Demo component library must expose LLM-authored component labels');
assert(demoComponentLibrary?.components?.find(component => component.id === 'boundary_map')?.expected_fields?.includes('labels.entries?'), 'Boundary component must expose LLM-authored group labels');
assert(demoComponentLibrary?.components?.find(component => component.id === 'decision_matrix')?.expected_fields?.includes('labels.decision?'), 'Decision matrix must expose LLM-authored table labels');
assert(bundle.report_component_library?.components?.some(component => component.id === 'decision_matrix'), 'Demo bundle must include the report component library');
assert(instructions.includes('Report component library'), 'Generated instructions must expose the report component library');
assert(instructions.includes('LLM analysis skill catalog'), 'Generated instructions must expose the LLM analysis skill catalog');
assert(instructions.includes('Original analysis goal contract'), 'Generated instructions must expose the original analysis goal contract');
assert(finalReportTask.includes('business need, business use'), 'Generated final-report task must require visible business-need/business-use narrative');
assert(finalReportTask.includes('analysis_document.open_questions'), 'Generated final-report task must require top-level structured open questions');
assert(finalReportTask.includes('semantic_lineage'), 'Generated final-report task must require semantic lineage for major claims');
assert(finalReportTask.includes('analysis-run.json'), 'Generated final-report task must mention analysis-run provenance');
assert(finalReportTask.includes('external_findings'), 'Generated final-report task must mention external finding ingestion');
assert(finalReportTask.includes('visible `open_questions` block'), 'Generated final-report task must require visible open questions when uncertainty remains');
assert(finalReportTask.includes('required_output_shape.management_drilldown'), 'Generated final-report task must require management-drilldown goal refs');
assert(instructions.includes('tool-positioning-references.json'), 'Generated tasks must point the LLM to the tool-positioning reference artifact');
assert(demoGoalContract?.contract_kind === 'analysis_goal_context', 'Demo must write analysis-goal-contract.json as goal context');
assert(demoGoalContract?.deterministic_authority === 'goal_context_only', 'Demo goal contract must be deterministic context only');
assert(demoGoalContract?.semantic_verdict_authority === 'codex_llm', 'Demo goal contract must give semantic verdict authority to Codex as the in-session LLM');
assert(demoGoalContract?.required_levels?.length === 4, 'Demo goal contract must preserve the four requested analysis levels');
assert(demoGoalContract?.required_output_shape?.management_drilldown, 'Demo goal contract must preserve the management/business drilldown output shape');
assert(demoGoalContract?.llm_trace_guidance?.includes('required_output_shape.<key>'), 'Demo goal contract must tell the LLM to trace required output shape refs');
assert(bundle.analysis_goal_contract?.contract_kind === 'analysis_goal_context', 'Demo bundle must expose the analysis goal contract');
assert(bundle.semantic_authority?.non_authoritative_goal_context_artifacts?.includes('analysis-goal-contract.json'), 'Semantic authority must list the goal contract as non-authoritative context');
assert(demoToolPositioningReferences?.reference_kind === 'external_tool_positioning_context', 'Demo must write tool-positioning-references.json');
assert(demoToolPositioningReferences?.semantic_authority === false, 'Tool positioning references must not be semantic authority');
assert(demoToolPositioningReferences?.deterministic_authority === 'reference_context_only', 'Tool positioning references must remain reference context only');
assert(demoToolPositioningReferences?.llm_positioning_rubric?.semantic_authority === 'codex_llm', 'Tool positioning rubric must give repository-specific positioning authority to Codex as the in-session LLM');
assert(demoToolPositioningReferences?.llm_positioning_rubric?.required_judgment_dimensions?.includes('what_this_analysis_can_replace'), 'Tool positioning rubric must require replace/complement/handoff judgment dimensions');
assert(demoToolPositioningReferences?.references?.some(item => item.examples?.includes('Accenture GenWizard')), 'Tool positioning references must include Accenture GenWizard context');
assert(demoToolPositioningReferences?.references?.every(item => item.semantic_authority !== true && item.public_reference_url && Array.isArray(item.source_support) && item.source_support.length > 0), 'Every tool positioning reference must include official source support without semantic authority');
assert(demoToolPositioningReferences?.references?.some(item => item.examples?.includes('Accenture GenWizard') && item.source_support?.some(source => source.source_url?.includes('accenture.com'))), 'Accenture GenWizard positioning must include official source support');
assert(instructions.includes('Preserve the distinction between official reference facts, repository evidence and Codex-authored LLM judgment'), 'Generated LLM instructions must separate reference facts from repository evidence and Codex-authored LLM judgment');
assert(finalReportTask.includes('what can be replaced, what is only complemented and the handoff boundaries'), 'Final report task must require repo-specific replace/complement/handoff positioning');
assert(bundle.tool_positioning_references?.references?.some(item => item.examples?.includes('CAST Imaging')), 'Bundle must expose official tool-positioning references');
assert(bundle.semantic_authority?.non_authoritative_navigation_artifacts?.includes('tool-positioning-references.json'), 'Semantic authority must list tool-positioning references as non-authoritative context');
assert(bundle.source_inventory_accounting?.contract_kind === 'source_inventory_accounting', 'Demo source accounting contract must use the primary source_inventory_accounting key');
assert(bundle.source_inventory_accounting?.semantic_verdict_authority === 'codex_llm', 'Demo source accounting contract must point semantic verdict authority to Codex as the in-session LLM');
assert(bundle.source_inventory_accounting?.accounting_status_meaning?.includes('Deferred files') && bundle.source_inventory_accounting?.accounting_status_meaning?.includes('do not count'), 'Demo source accounting contract must clarify deferred files are not completed analysis');
assert(bundle.source_inventory_accounting?.deterministic_contract_scope?.includes('structured analysis_coverage'), 'Demo source accounting must expose structured analysis_coverage path/reason validation scope');
assert(bundle.source_inventory_accounting?.invalid_coverage_items === 0, 'Demo source accounting must not contain invalid analysis_coverage items');
assert(bundle.source_inventory_accounting?.ignored_out_of_scope_coverage_items === 0, 'Demo source accounting must not contain ignored out-of-scope coverage items');
assert(bundle.source_inventory_accounting?.rules?.some(rule => rule.includes('strings, globs and patterns are invalid')), 'Demo source accounting rules must reject weak coverage entries');
assert(demoSourceTierModel?.model_kind === 'tiered_whole_codebase_analysis', 'Demo must write the tiered whole-codebase analysis model');
assert(demoSourceTierModel?.semantic_authority === 'codex_llm', 'Source tier model must keep semantic authority with Codex as the in-session LLM');
assert(bundle.source_tier_coverage?.contract_kind === 'tiered_whole_codebase_file_analysis', 'Demo must expose Tier 1 source-file coverage');
assert(bundle.source_tier_coverage?.complete === true, `Demo Tier 1 file-card coverage incomplete: ${bundle.source_tier_coverage?.tier1_file_cards}/${bundle.source_tier_coverage?.total_files}`);
assert(bundle.source_tier_coverage?.tier1_file_cards === bundle.source_tier_coverage?.total_files, 'Every included demo file must have a Tier 1 file card');
assert(bundle.source_tier_coverage?.missing_tier1_files === 0, 'Demo must not miss Tier 1 file cards');
assert(bundle.source_tier_coverage?.invalid_file_cards === 0, 'Demo Tier 1 file cards must be structurally valid');
assert(bundle.source_tier_backlog?.complete === true, 'Demo bundle must expose complete Tier 1 task backlog');
assert(demoSourceTierBacklog.complete === true, 'Demo must write complete source-tier-backlog.json');
const tierStatusOutput = run(['dev', 'tier-status', demo, '--limit', '2'], { capture: true }).stdout || '';
assert(tierStatusOutput.includes('Tier 1 execution backlog: complete'), 'tier-status must report complete backlog for demo');
const tierNextOutput = run(['dev', 'tier-next', demo, '--limit', '1', '--max-chars', '200'], { capture: true }).stdout || '';
assert(tierNextOutput.includes('Prepared 0 Tier 1 source contexts'), 'tier-next must not select tasks when demo Tier 1 backlog is complete');
const cliSource = readFileSync(join(root, 'src', 'cli.ts'), 'utf8');
assert(!cliSource.includes('tier-run-openai'), 'Cognianalysis must not expose a direct LLM API runner; Codex executes Tier 1 workpacks');
assert(demoCodeMap.navigation_policy?.semantic_authority === false, 'Demo code map must declare navigation policy as non-semantic');
assert(demoCodeMap.extraction_policy?.navigation_scores_are_authoritative === false, 'Demo code map navigation scores must not be authoritative');
assert(demoCodeMap.extraction_policy?.mode === 'llm_first_inventory_only', 'Demo code map must run in inventory-only LLM-first mode');
assert(demoCodeMap.extraction_policy?.deterministic_parsing_disabled === true, 'Demo code map must disable deterministic parsing');
assert(demoCodeMap.extraction_policy?.deterministic_import_parsing === false, 'Demo code map must not parse imports deterministically');
assert(demoCodeMap.extraction_policy?.deterministic_symbol_parsing === false, 'Demo code map must not parse symbols deterministically');
assert(demoCodeMap.extraction_policy?.deterministic_framework_detection === false, 'Demo code map must not detect frameworks deterministically');
assert(demoCodeMap.extraction_policy?.deterministic_build_tool_detection === false, 'Demo code map must not detect build tools deterministically');
assert(demoCodeMap.extraction_policy?.deterministic_contract_detection === false, 'Demo code map must not detect contracts deterministically');
assert((demoCodeMap.profile?.build_tools || []).length === 0, 'Demo profile must not list deterministic build-tool conclusions');
assert((demoCodeMap.profile?.package_managers || []).length === 0, 'Demo profile must not list deterministic package-manager conclusions');
assert((demoCodeMap.signals || []).length === 0, 'Demo code map deterministic semantic signals must be empty');
assert((demoCodeMap.symbols || []).length === 0, 'Demo code map deterministic symbol list must be empty');
assert(demoCodeMap.files?.every(file => (file.imports || []).length === 0 && (file.symbols || []).length === 0 && (file.signals || []).length === 0), 'Demo files must not contain deterministic imports, symbols or semantic signals');
assert(demoCodeMap.files?.some(file => Array.isArray(file.navigation_tags)), 'Demo code map files must expose navigation_tags as the primary tag field');
assert(demoCodeMap.files?.some(file => typeof file.navigation_score === 'number'), 'Demo code map files must expose navigation_score as the primary ranking field');
assert(Array.isArray(demoCodeMap.artifact_navigation_candidates), 'Demo code map must expose artifact_navigation_candidates');
assert(existsSync(join(demo, '.analysis', 'data', 'navigation-artifact-candidates.json')), 'Demo prepare must write navigation-artifact-candidates.json');
assert(demoSourceFamilyInventory?.artifact_kind === 'navigation_partition_inventory', 'Source-family inventory must be explicitly marked as navigation partition inventory');
assert(demoSourceFamilyInventory?.artifact_name_note?.includes('legacy filename'), 'Source-family inventory must explain that its filename is workflow compatibility, not semantic authority');
assert(demoSourceFamilyInventory?.deterministic_scope?.includes('file-format inventory tags'), 'Source-family inventory must expose inventory-only deterministic scope');
assert(demoSourceFamilyInventory?.deterministic_scope?.includes('no project-manifest detection'), 'Source-family inventory must not infer source families from project manifests');
assert(demoSourceFamilyInventory?.deterministic_scope?.includes('no import parsing'), 'Source-family inventory must explicitly forbid deterministic import parsing');
assert(demoSourceFamilyInventory?.forbidden_use?.some(text => text.includes('Do not treat partition names as semantic source-family names')), 'Source-family inventory must forbid treating partition names as semantic families');
assert(demoSourceFamilyInventory?.inventory_partitions?.every(partition => partition.semantic_authority === false && partition.llm_detail_plan_authority === false && partition.semantic_family_name === null), 'Every source-family inventory partition must be non-semantic and non-authoritative for detail planning');
assert(bundle.source_family_inventory?.artifact_kind === 'navigation_partition_inventory', 'Bundle must expose source-family inventory as navigation partition inventory');
assert(instructions.includes('The legacy filename does not mean the CLI has authored semantic source families'), 'Generated LLM instructions must warn that source-family inventory is not semantic family authoring');
assert(finalReportTask.includes('rename, merge, split, reject or defer'), 'Final report task must require the LLM to decide how to treat navigation partitions');
assert(bundle.semantic_authority?.semantic_decider === 'codex_llm', 'Demo semantic authority must name Codex as the in-session LLM semantic decider');
assert(bundle.semantic_authority?.cli_semantic_quality_judge === false, 'Demo CLI must not be marked as semantic quality judge');
assert(bundle.semantic_authority?.final_verdict_source === 'analysis_document.report_quality_review.verdict', 'Demo final verdict source must be the LLM-authored report quality review');
assert(bundle.semantic_authority?.goal_trace_reference_contract_complete === true, 'Demo semantic authority must expose completed explicit LLM goal-trace references');
assert(bundle.semantic_authority?.llm_authored_artifacts?.analysis_document === true, 'Demo semantic authority must see the LLM-authored analysis document');
assert(bundle.final_llm_readiness?.semantic_verdict_authority === 'codex_llm', 'Demo final readiness must name Codex as the in-session LLM verdict authority');
assert(bundle.final_llm_readiness?.state === 'ready', `Demo final readiness must be ready, got ${bundle.final_llm_readiness?.state}`);
assert(bundle.final_llm_readiness?.final_verdict_source === 'analysis_document.report_quality_review.verdict', 'Demo final readiness must use the LLM report-quality verdict source');
assert(!demoHtml.includes('<strong>Semantic authority</strong>'), 'Visible report must not inject deterministic semantic-authority prose outside the LLM-authored document');
assert(!demoHtml.includes('<strong>Detail-review coverage and synthesis</strong>'), 'Visible report must not inject deterministic detail-review synthesis prose outside the LLM-authored document');
assert(!demoHtml.includes('<strong>LLM report-quality review</strong>'), 'Visible report must not inject deterministic report-quality review panels outside the LLM-authored sections');
assert(!demoHtml.includes('<div class="metric-label">Structured checks</div>'), 'Visible report must not render deterministic quality-review metrics as report content');
assert(!demoHtml.includes('data-section="analysis-document"'), 'Final visible report must not inject a fixed Analysis Document start page before LLM-authored sections');
assert(demoHtml.includes('data-section="system-understanding"'), 'Final visible report must use LLM-authored section ids for navigation');
assert(!demoHtml.includes('Architecture Report'), 'Final visible report shell must not inject a fixed report product title');
assert(!demoHtml.includes('business first · technical drilldown'), 'Final visible report shell must not inject fixed positioning copy');
assert(!demoHtml.includes('Source-Derived Management Report'), 'Final visible report shell must not inject a fixed hero category');
assert(demoHtml.includes('Customer Onboarding Service Analysis'), 'Final visible report shell must use the LLM-authored document title');
const forbiddenRendererPlaceholders = [
  'No data',
  'no evidence',
  'No extracted data yet.',
  'No statements extracted.',
  'No statements authored.',
  'No metrics authored.',
  'No source-family map authored.',
  'No entry points authored.',
  'No exits authored.',
  'No state boundary authored.',
  'No four-level assessment authored.',
  'No roadmap authored.',
  'No drilldown references authored.',
  'No open questions authored.',
  'No LLM-authored blocks in this section.'
];
for (const placeholder of forbiddenRendererPlaceholders) {
  assert(!demoHtml.includes(placeholder), `Final visible report must not inject deterministic placeholder prose: ${placeholder}`);
}
const reportSource = readFileSync(join(root, 'src', 'report.ts'), 'utf8');
for (const placeholder of forbiddenRendererPlaceholders) {
  assert(!reportSource.includes(placeholder), `Renderer source must not contain deterministic placeholder prose: ${placeholder}`);
}
assert(bundle.report_artifacts?.index_html === true && bundle.report_artifacts?.analysis_data_json === true, 'Demo report artifacts must be materialized');
assert(bundle.report_mode?.final_synthesis_ready === true, 'Demo final report must be final-synthesis ready');
const mcpFinalize = callMcpTool('finalize', { repo: demo });
assert(mcpFinalize.final_llm_readiness === 'ready', `MCP finalize must expose ready Codex-authored analysis readiness, got ${mcpFinalize.final_llm_readiness}`);
assert(mcpFinalize.skill_workbench_coverage?.complete === true, 'MCP finalize must expose complete skill workbench coverage');
assert(mcpFinalize.report_quality_review?.verdict === 'decision_ready', 'MCP finalize must expose the LLM report-quality verdict');
assert(mcpFinalize.analysis_goal_contract?.contract_kind === 'analysis_goal_context', 'MCP finalize must expose the original goal context');
assert(mcpFinalize.analysis_goal_trace_alignment?.complete === true, 'MCP finalize must expose complete LLM goal-trace references');
assert(mcpFinalize.tool_positioning_references?.reference_kind === 'external_tool_positioning_context', 'MCP finalize must expose tool-positioning references');
assert(mcpFinalize.target_artifact_contract_coverage_scored === false, 'MCP target capability rows must not be CLI presence-scored');
assert(mcpFinalize.target_artifact_contract_coverage_total > 0, 'MCP target capability context must expose registered rows');
const mcpAudit = callMcpTool('audit-report', { repo: demo });
assert(mcpAudit.report_audit === 'passed', `MCP audit-report must pass, got ${mcpAudit.report_audit}: ${(mcpAudit.failures || []).join('; ')}`);
assert(mcpAudit.analysis_pipeline_contract?.complete === true, 'MCP audit-report must expose complete analysis pipeline contract');
assert(mcpAudit.skill_workbench_coverage?.complete === true, 'MCP audit-report must expose complete skill workbench coverage');
assert(mcpAudit.skill_workbench_synthesis?.complete === true, 'MCP audit-report must expose current skill workbench synthesis');
assert(mcpAudit.final_llm_readiness?.state === 'ready', 'MCP audit-report must expose ready final Codex-authored analysis readiness');

const tempRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-no-plan-'));
try {
  const tempDemo = join(tempRoot, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const planPath = join(tempDemo, '.analysis', 'llm', 'detail-agent-plan.json');
  assert(existsSync(planPath), 'Positive demo setup did not produce detail-agent-plan.json');
  rmSync(planPath);

  const negative = run(['dev', 'audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('missing required pre-final Codex-authored detail-agent plan artifact'), 'Missing-plan audit did not fail for the required reason');
  assert(output.includes('final Codex-authored report is not synthesized after completed detail reviews'), 'Missing-plan audit did not block final synthesis readiness');
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

const tempRootMissingOptionalTemplateOutput = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-missing-optional-template-output-'));
try {
  const tempDemo = join(tempRootMissingOptionalTemplateOutput, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const blockPath = join(tempDemo, '.analysis', 'llm', 'flows-mermaid.json');
  assert(existsSync(blockPath), 'Positive demo setup did not produce flows-mermaid.json');
  rmSync(blockPath);

  const positive = run(['dev', 'audit-report', tempDemo], { capture: true });
  const output = `${positive.stdout || ''}\n${positive.stderr || ''}`;
  assert(output.includes('Report audit: passed'), 'Missing optional capability-template output must not fail final readiness');
  const refreshedBundle = JSON.parse(readFileSync(join(tempDemo, '.analysis', 'data', 'bundle.json'), 'utf8'));
  assert(refreshedBundle.analysis_document_prerequisite_coverage?.complete === true, 'Missing optional capability-template output must not fail prerequisite coverage');
  assert(!(refreshedBundle.analysis_document_prerequisite_coverage?.missing_outputs || []).includes('llm/flows-mermaid.json'), 'Optional flows-mermaid output must not appear as a missing required prerequisite');
} finally {
  rmSync(tempRootMissingOptionalTemplateOutput, { recursive: true, force: true });
}

const tempRootMissingSkillReview = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-missing-skill-review-'));
try {
  const tempDemo = join(tempRootMissingSkillReview, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const skillReviewPath = join(tempDemo, '.analysis', 'skill_reviews', 'flow-mermaid-analysis.json');
  assert(existsSync(skillReviewPath), 'Positive demo setup did not produce flow-mermaid-analysis skill review');
  rmSync(skillReviewPath);

  const negative = run(['dev', 'audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('Codex-planned skill workbench execution incomplete'), 'Missing skill-review audit did not fail the Codex-planned skill workbench contract');
  assert(output.includes('Skill workbenches: partial'), 'Missing skill-review audit did not surface partial skill workbench execution');
} finally {
  rmSync(tempRootMissingSkillReview, { recursive: true, force: true });
}

const tempRootMissingSkillSynthesis = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-missing-skill-synthesis-'));
try {
  const tempDemo = join(tempRootMissingSkillSynthesis, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const documentPath = join(tempDemo, '.analysis', 'llm', 'analysis-document.json');
  const document = JSON.parse(readFileSync(documentPath, 'utf8'));
  assert(document.analysis_document?.skill_workbench_synthesis, 'Positive demo setup did not produce skill_workbench_synthesis');
  delete document.analysis_document.skill_workbench_synthesis;
  writeFileSync(documentPath, JSON.stringify(document, null, 2) + '\n');

  const negative = run(['dev', 'audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('skill-workbench synthesis stale'), 'Missing skill-workbench synthesis audit did not fail final report freshness');
  assert(output.includes('Skill workbench synthesis: stale'), 'Missing skill-workbench synthesis audit did not surface stale synthesis status');
} finally {
  rmSync(tempRootMissingSkillSynthesis, { recursive: true, force: true });
}

const tempRootMissingQuality = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-missing-quality-'));
try {
  const tempDemo = join(tempRootMissingQuality, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const documentPath = join(tempDemo, '.analysis', 'llm', 'analysis-document.json');
  const document = JSON.parse(readFileSync(documentPath, 'utf8'));
  assert(document.analysis_document?.report_quality_review, 'Positive demo setup did not produce report_quality_review');
  delete document.analysis_document.report_quality_review;
  writeFileSync(documentPath, JSON.stringify(document, null, 2) + '\n');

  const negative = run(['dev', 'audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('Codex-authored report quality review artifact incomplete'), 'Missing quality-review audit did not fail for the required reason');
  assert(output.includes('final Codex-authored report is not synthesized after completed detail reviews'), 'Missing quality-review audit did not block final synthesis readiness');
} finally {
  rmSync(tempRootMissingQuality, { recursive: true, force: true });
}

const tempRootPartialQuality = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-partial-quality-'));
try {
  const tempDemo = join(tempRootPartialQuality, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const documentPath = join(tempDemo, '.analysis', 'llm', 'analysis-document.json');
  const document = JSON.parse(readFileSync(documentPath, 'utf8'));
  assert(document.analysis_document?.report_quality_review, 'Positive demo setup did not produce report_quality_review');
  document.analysis_document.report_quality_review.verdict = 'partial';
  document.analysis_document.report_quality_review.summary = 'The LLM judged this report as useful but not decision-ready.';
  document.analysis_document.report_quality_review.criteria = [
    { name: 'Decision readiness', verdict: 'partial', reason: 'A remaining owner decision is required.', evidence: document.analysis_document.report_quality_review.evidence || [] }
  ];
  writeFileSync(documentPath, JSON.stringify(document, null, 2) + '\n');

  const negative = run(['dev', 'audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('Codex-authored report quality review verdict is not decision_ready: partial'), 'Partial Codex-authored quality verdict did not control final readiness');
  assert(output.includes('final Codex-authored report is not synthesized after completed detail reviews'), 'Partial Codex-authored quality verdict did not block final synthesis readiness');
  const finalizeNegative = run(['dev', 'finalize', tempDemo], { capture: true, expectFailure: true });
  const finalizeOutput = `${finalizeNegative.stdout || ''}\n${finalizeNegative.stderr || ''}`;
  assert(finalizeOutput.includes('Final Codex-authored analysis readiness: partial'), 'Finalize did not surface partial Codex-authored analysis readiness');
  assert(finalizeOutput.includes('Codex-authored report quality review verdict is not decision_ready: partial'), 'Finalize did not honor the Codex-authored quality verdict');
} finally {
  rmSync(tempRootPartialQuality, { recursive: true, force: true });
}

const tempRootMissingPartialRationale = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-missing-partial-rationale-'));
try {
  const tempDemo = join(tempRootMissingPartialRationale, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const documentPath = join(tempDemo, '.analysis', 'llm', 'analysis-document.json');
  const document = JSON.parse(readFileSync(documentPath, 'utf8'));
  assert(document.analysis_document?.report_quality_review?.partial_requirement_rationale, 'Positive demo setup did not produce partial_requirement_rationale');
  delete document.analysis_document.report_quality_review.partial_requirement_rationale;
  writeFileSync(documentPath, JSON.stringify(document, null, 2) + '\n');

  const negative = run(['dev', 'audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('Codex-authored report quality review artifact incomplete'), 'Missing partial rationale audit did not fail the Codex-authored report-quality contract');
  assert(output.includes('partial_requirement_rationale'), 'Missing partial rationale audit did not name the missing LLM rationale');
  assert(output.includes('final Codex-authored report is not synthesized after completed detail reviews'), 'Missing partial rationale audit did not block final synthesis readiness');
} finally {
  rmSync(tempRootMissingPartialRationale, { recursive: true, force: true });
}

const tempRootMissingTrace = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-missing-trace-'));
try {
  const tempDemo = join(tempRootMissingTrace, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const documentPath = join(tempDemo, '.analysis', 'llm', 'analysis-document.json');
  const document = JSON.parse(readFileSync(documentPath, 'utf8'));
  delete document.analysis_document.requirements_trace;
  writeFileSync(documentPath, JSON.stringify(document, null, 2) + '\n');

  const negative = run(['dev', 'audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('Codex-authored requirements trace contract incomplete'), 'Missing requirements trace audit did not fail the Codex-authored trace contract');
  assert(!output.includes('target capability context missing/partial'), 'Target capability context must not be the semantic readiness fail-gate');
  assert(output.includes('Requirements trace contract: partial'), 'Missing requirements trace audit did not show a partial trace contract');
} finally {
  rmSync(tempRootMissingTrace, { recursive: true, force: true });
}

const tempRootInvalidCoverage = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-invalid-coverage-'));
try {
  const tempDemo = join(tempRootInvalidCoverage, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const completenessPath = join(tempDemo, '.analysis', 'llm', 'report-completeness-review.json');
  const completeness = JSON.parse(readFileSync(completenessPath, 'utf8'));
  const sourceInventory = JSON.parse(readFileSync(join(tempDemo, '.analysis', 'data', 'source-inventory.json'), 'utf8'));
  const inventoryPaths = (sourceInventory.included_files || []).map(item => item.path).filter(Boolean);
  const invalidStringPath = inventoryPaths[0];
  const missingReasonPath = inventoryPaths[1] || inventoryPaths[0];
  const globPath = invalidStringPath.replace(/[^/]+$/, '*');
  assert(completeness.analysis_coverage?.inspected_files, 'Positive demo setup did not produce report-completeness analysis_coverage');
  completeness.analysis_coverage.inspected_files.push(invalidStringPath);
  completeness.analysis_coverage.deferred_files = completeness.analysis_coverage.deferred_files || [];
  completeness.analysis_coverage.deferred_files.push({ path: missingReasonPath });
  completeness.analysis_coverage.deferred_files.push({ path: globPath, reason: 'Glob must not count as an included source-inventory file.' });
  writeFileSync(completenessPath, JSON.stringify(completeness, null, 2) + '\n');

  const negative = run(['dev', 'audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('source inventory accounting incomplete'), 'Invalid analysis_coverage entries did not fail source inventory accounting');
  assert(output.includes('invalid coverage items'), 'Invalid analysis_coverage failure did not name invalid coverage items');
  const refreshedBundle = JSON.parse(readFileSync(join(tempDemo, '.analysis', 'data', 'bundle.json'), 'utf8'));
  assert(refreshedBundle.source_inventory_accounting?.invalid_coverage_items >= 3, 'Invalid analysis_coverage entries were not counted in the refreshed bundle');
} finally {
  rmSync(tempRootInvalidCoverage, { recursive: true, force: true });
}

const tempRootInvalidEvidenceLine = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-invalid-evidence-line-'));
try {
  const tempDemo = join(tempRootInvalidEvidenceLine, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const documentPath = join(tempDemo, '.analysis', 'llm', 'analysis-document.json');
  const document = JSON.parse(readFileSync(documentPath, 'utf8'));
  const sourceInventory = JSON.parse(readFileSync(join(tempDemo, '.analysis', 'data', 'source-inventory.json'), 'utf8'));
  const evidencePath = (sourceInventory.included_files || []).map(item => item.path).find(Boolean);
  assert(evidencePath, 'Positive demo setup did not produce an inventory path for invalid evidence testing');
  const firstStatementList = document.analysis_document.sections
    .flatMap(section => section.blocks || [])
    .find(block => block.type === 'statement_list');
  assert(firstStatementList?.items?.[0], 'Positive demo setup did not produce a statement-list item for semantic-lineage invalid-evidence testing');
  firstStatementList.items[0].evidence = [{ path: evidencePath, line: 0 }];
  document.analysis_document.report_quality_review.evidence = [
    { path: evidencePath, line: 0 },
    { path: evidencePath, line: 999999 }
  ];
  writeFileSync(documentPath, JSON.stringify(document, null, 2) + '\n');

  const negative = run(['dev', 'audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('invalid evidence'), 'Invalid file:line evidence did not fail audit-report');
  const refreshedBundle = JSON.parse(readFileSync(join(tempDemo, '.analysis', 'data', 'bundle.json'), 'utf8'));
  assert((refreshedBundle.evidence_index || []).some(item => item.valid === false && item.reason === 'invalid line'), 'Line zero evidence was not marked invalid in the evidence index');
  assert((refreshedBundle.evidence_index || []).some(item => item.valid === false && item.reason === 'line out of range'), 'Out-of-range evidence line was not marked invalid in the evidence index');
  const invalidLineage = (refreshedBundle.analysis_document_semantic_lineage?.lineage || []).find(item => item.label === firstStatementList.items[0].title);
  assert(invalidLineage, 'Invalid-evidence statement-list item was not represented in semantic lineage');
  assert((invalidLineage.supporting_artifacts || []).length === 0, 'Invalid line zero evidence must not infer semantic-lineage support from path-only overlap');
  assert((invalidLineage.missing || []).includes('supporting_artifacts'), 'Invalid line zero evidence must leave semantic-lineage support incomplete');
} finally {
  rmSync(tempRootInvalidEvidenceLine, { recursive: true, force: true });
}

const tempRootIgnoredVerifyTmp = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-ignored-verify-tmp-'));
try {
  const tempDemo = join(tempRootIgnoredVerifyTmp, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  rmSync(join(tempDemo, '.analysis'), { recursive: true, force: true });
  const leftoverDir = join(tempDemo, '.verify-tmp-leftover');
  mkdirSync(leftoverDir, { recursive: true });
  writeFileSync(join(leftoverDir, 'generated.ts'), 'export const leaked = true;\n');
  run(['analyze', tempDemo, '--no-seed', '--no-html'], { capture: true });
  const sourceInventory = JSON.parse(readFileSync(join(tempDemo, '.analysis', 'data', 'source-inventory.json'), 'utf8'));
  const leaked = (sourceInventory.included_files || []).map(item => item.path).filter(path => String(path).startsWith('.verify-tmp-'));
  assert(leaked.length === 0, `.verify-tmp-* directories must not enter source inventory: ${leaked.join(', ')}`);
} finally {
  rmSync(tempRootIgnoredVerifyTmp, { recursive: true, force: true });
}

const tempRootMissingDetailDecision = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-missing-detail-decision-'));
try {
  const tempDemo = join(tempRootMissingDetailDecision, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const planPath = join(tempDemo, '.analysis', 'llm', 'detail-agent-plan.json');
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  plan.detail_agent_plan.tasks = [];
  plan.detail_agent_plan.not_planned = [];
  delete plan.detail_agent_plan.no_detail_reviews_needed;
  writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');

  const negative = run(['dev', 'audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('source-family detail review coverage missing_detail_review_decision'), 'Missing detail-review decision audit did not block the Codex planning contract');
  assert(output.includes('final Codex-authored report is not synthesized after completed detail reviews'), 'Unexpected detail review audit did not block final synthesis readiness');
} finally {
  rmSync(tempRootMissingDetailDecision, { recursive: true, force: true });
}

const tempRootUnexpectedDetailReview = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-unexpected-detail-review-'));
try {
  const tempDemo = join(tempRootUnexpectedDetailReview, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const planPath = join(tempDemo, '.analysis', 'llm', 'detail-agent-plan.json');
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  plan.detail_agent_plan.tasks = [];
  plan.detail_agent_plan.not_planned = [
    {
      source_family: 'src/main',
      reason: 'Regression fixture: the LLM explicitly decided to skip detail reviews, so existing detail review outputs must be treated as unexpected.'
    }
  ];
  plan.detail_agent_plan.no_detail_reviews_needed = true;
  writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');

  const negative = run(['dev', 'audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('source-family detail review coverage unexpected_detail_reviews'), 'Unexpected detail review audit did not fail the Codex-planned detail review contract');
  assert(output.includes('final Codex-authored report is not synthesized after completed detail reviews'), 'Unexpected detail review audit did not block final synthesis readiness');
} finally {
  rmSync(tempRootUnexpectedDetailReview, { recursive: true, force: true });
}

const tempRootUnsafeDetailTaskId = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-unsafe-detail-task-id-'));
try {
  const tempDemo = join(tempRootUnsafeDetailTaskId, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const planPath = join(tempDemo, '.analysis', 'llm', 'detail-agent-plan.json');
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  plan.detail_agent_plan.tasks = [
    {
      id: '../escape/detail:src/main',
      source_family: 'src/main',
      recommended_agent: 'detail-reviewer',
      focus: ['Path-safe task materialization regression'],
      expected_outputs: ['Sanitized detail task and review paths'],
      seed_files: ['src/main/java/com/acme/onboarding/OnboardingService.java'],
      evidence: [{ path: 'src/main/java/com/acme/onboarding/OnboardingService.java', line: 1 }]
    },
    {
      id: 'escape/detail/src/main',
      source_family: 'src/main duplicate',
      recommended_agent: 'detail-reviewer',
      focus: ['Path-safe task materialization collision regression'],
      expected_outputs: ['Unique sanitized detail task and review paths'],
      seed_files: ['src/main/java/com/acme/onboarding/OnboardingController.java'],
      evidence: [{ path: 'src/main/java/com/acme/onboarding/OnboardingController.java', line: 1 }]
    }
  ];
  delete plan.detail_agent_plan.no_detail_reviews_needed;
  writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');

  run(['dev', 'finalize', tempDemo, '--allow-partial'], { capture: true });
  const manifest = JSON.parse(readFileSync(join(tempDemo, '.analysis', 'detail-task-manifest.json'), 'utf8'));
  const firstTask = manifest.tasks?.[0] || {};
  const secondTask = manifest.tasks?.[1] || {};
  assert(firstTask.id === 'escape-detail-src-main', `Detail task id must be sanitized, got ${firstTask.id}`);
  assert(firstTask.task_file === 'detail_tasks/001-escape-detail-src-main.md', `Detail task file must stay inside detail_tasks, got ${firstTask.task_file}`);
  assert(firstTask.expected_output === 'detail_reviews/escape-detail-src-main.json', `Detail review output must stay inside detail_reviews, got ${firstTask.expected_output}`);
  assert(secondTask.id === 'escape-detail-src-main-2', `Sanitized detail task id collisions must be made unique, got ${secondTask.id}`);
  assert(secondTask.task_file === 'detail_tasks/002-escape-detail-src-main-2.md', `Colliding detail task file must stay inside detail_tasks, got ${secondTask.task_file}`);
  assert(secondTask.expected_output === 'detail_reviews/escape-detail-src-main-2.json', `Colliding detail review output must stay inside detail_reviews, got ${secondTask.expected_output}`);
  assert(!existsSync(join(tempDemo, '.analysis', 'escape')), 'Unsafe detail task id must not create sibling paths outside detail_tasks/detail_reviews');
} finally {
  rmSync(tempRootUnsafeDetailTaskId, { recursive: true, force: true });
}

const tempRootMissingGoalRefs = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-missing-goal-refs-'));
try {
  const tempDemo = join(tempRootMissingGoalRefs, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const documentPath = join(tempDemo, '.analysis', 'llm', 'analysis-document.json');
  const document = JSON.parse(readFileSync(documentPath, 'utf8'));
  document.analysis_document.requirements_trace = (document.analysis_document.requirements_trace || []).map(item => {
    const next = { ...item };
    delete next.goal_contract_refs;
    return next;
  });
  writeFileSync(documentPath, JSON.stringify(document, null, 2) + '\n');

  const negative = run(['dev', 'audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('Codex-authored goal trace reference contract incomplete'), 'Missing goal refs audit did not fail the explicit Codex-authored goal trace contract');
  assert(output.includes('Goal trace references: partial'), 'Missing goal refs audit did not show partial explicit goal trace references');
} finally {
  rmSync(tempRootMissingGoalRefs, { recursive: true, force: true });
}

const tempRootEmptyDocBlock = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-empty-doc-block-'));
try {
  const tempDemo = join(tempRootEmptyDocBlock, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const documentPath = join(tempDemo, '.analysis', 'llm', 'analysis-document.json');
  const document = JSON.parse(readFileSync(documentPath, 'utf8'));
  assert(document.analysis_document?.sections?.[0]?.blocks, 'Positive demo setup did not produce report blocks');
  document.analysis_document.sections[0].blocks.push({
    type: 'statement_list',
    title: 'Empty renderer block',
    items: []
  });
  writeFileSync(documentPath, JSON.stringify(document, null, 2) + '\n');

  const negative = run(['dev', 'audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('analysis document component contract incomplete'), 'Empty Codex-authored report block did not block the renderer component contract');
  assert(output.includes('block_render_content_contract'), 'Empty Codex-authored report block contract output did not name the render-content contract');
} finally {
  rmSync(tempRootEmptyDocBlock, { recursive: true, force: true });
}

const tempRootBusinessNarrative = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-business-narrative-'));
try {
  const tempDemo = join(tempRootBusinessNarrative, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const documentPath = join(tempDemo, '.analysis', 'llm', 'analysis-document.json');
  const document = JSON.parse(readFileSync(documentPath, 'utf8'));
  assert(document.analysis_document?.sections?.[0]?.blocks, 'Positive demo setup did not produce report blocks');
  document.analysis_document.sections[0].blocks.unshift({
    type: 'narrative',
    title: 'Business need and use',
    business_need: 'Business needs a controlled onboarding decision before account activation.',
    business_use: 'Operations uses the flow to validate, accept and track a customer onboarding request.',
    technical_drilldown: 'The technical drilldown follows the REST controller, onboarding service and KYC client evidence.'
  });
  writeFileSync(documentPath, JSON.stringify(document, null, 2) + '\n');
  run(['dev', 'finalize', tempDemo]);
  run(['dev', 'audit-report', tempDemo]);
  const html = readFileSync(join(tempDemo, '.analysis', 'report', 'index.html'), 'utf8');
  assert(html.includes('Business needs a controlled onboarding decision before account activation.'), 'Business-need narrative field did not render');
  assert(html.includes('Operations uses the flow to validate, accept and track a customer onboarding request.'), 'Business-use narrative field did not render');
  assert(html.includes('The technical drilldown follows the REST controller, onboarding service and KYC client evidence.'), 'Technical-drilldown narrative field did not render');
} finally {
  rmSync(tempRootBusinessNarrative, { recursive: true, force: true });
}

const tempRootCustomLabels = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-custom-labels-'));
try {
  const tempDemo = join(tempRootCustomLabels, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const documentPath = join(tempDemo, '.analysis', 'llm', 'analysis-document.json');
  const document = JSON.parse(readFileSync(documentPath, 'utf8'));
  for (const section of document.analysis_document?.sections || []) {
    for (const block of section.blocks || []) {
      if (block.type === 'boundary_map') {
        block.labels = {
          entries: 'Customer-facing ingress',
          exits: 'Downstream handoffs',
          state: 'Operational state stores'
        };
      }
      if (block.type === 'decision_matrix') {
        block.labels = {
          decision: 'Choice point',
          options: 'Alternatives',
          recommendation: 'Preferred direction',
          risk: 'Decision risk'
        };
      }
      if (block.type === 'agent_plan') {
        block.labels = {
          source_family: 'Review slice',
          priority: 'Review priority',
          focus: 'Semantic focus',
          expected_outputs: 'Expected evidence',
          task_output: 'Task artifact',
          seed_files: 'Evidence seeds'
        };
      }
    }
  }
  writeFileSync(documentPath, JSON.stringify(document, null, 2) + '\n');
  run(['dev', 'finalize', tempDemo]);
  run(['dev', 'audit-report', tempDemo]);
  const html = readFileSync(join(tempDemo, '.analysis', 'report', 'index.html'), 'utf8');
  for (const label of [
    'Customer-facing ingress',
    'Downstream handoffs',
    'Operational state stores',
    'Choice point',
    'Alternatives',
    'Preferred direction',
    'Decision risk',
    'Review slice',
    'Review priority',
    'Semantic focus',
    'Expected evidence',
    'Task artifact',
    'Evidence seeds'
  ]) {
    assert(html.includes(label), `Renderer did not honor LLM-authored component label: ${label}`);
  }
} finally {
  rmSync(tempRootCustomLabels, { recursive: true, force: true });
}

const tempRootStaleContracts = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-stale-contracts-'));
try {
  const tempDemo = join(tempRootStaleContracts, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  writeFileSync(join(tempDemo, '.analysis', 'data', 'analysis-goal-contract.json'), JSON.stringify({ contract_kind: 'stale_goal_contract' }, null, 2) + '\n');
  writeFileSync(join(tempDemo, '.analysis', 'data', 'report-component-library.json'), JSON.stringify({ library_kind: 'stale_component_contract' }, null, 2) + '\n');
  writeFileSync(join(tempDemo, '.analysis', 'data', 'analysis-skill-catalog.json'), JSON.stringify({ catalog_kind: 'stale_skill_catalog' }, null, 2) + '\n');
  writeFileSync(join(tempDemo, '.analysis', 'analysis-pipeline.json'), JSON.stringify({ pipeline_kind: 'stale_pipeline' }, null, 2) + '\n');
  run(['dev', 'finalize', tempDemo]);
  const refreshedGoal = JSON.parse(readFileSync(join(tempDemo, '.analysis', 'data', 'analysis-goal-contract.json'), 'utf8'));
  const refreshedLibrary = JSON.parse(readFileSync(join(tempDemo, '.analysis', 'data', 'report-component-library.json'), 'utf8'));
  const refreshedCatalog = JSON.parse(readFileSync(join(tempDemo, '.analysis', 'data', 'analysis-skill-catalog.json'), 'utf8'));
  const refreshedPipeline = JSON.parse(readFileSync(join(tempDemo, '.analysis', 'analysis-pipeline.json'), 'utf8'));
  assert(refreshedGoal.contract_kind === 'analysis_goal_context', 'Finalize must refresh stale analysis goal contract artifacts');
  assert(refreshedGoal.llm_trace_guidance?.includes('required_output_shape.<key>'), 'Refreshed goal contract must include output-shape trace guidance');
  assert(refreshedLibrary.library_kind === 'analysis_document_component_library', 'Finalize must refresh stale report component library artifacts');
  assert(refreshedLibrary.components?.find(component => component.id === 'agent_plan')?.expected_fields?.includes('labels.source_family?'), 'Refreshed component library must include LLM-authored label fields');
  assert(refreshedCatalog.catalog_kind === 'llm_analysis_skill_catalog', 'Finalize must refresh stale analysis skill catalog artifacts');
  assert(refreshedPipeline.pipeline_kind === 'llm_driven_overview_detail_final_report', 'Finalize must refresh stale analysis pipeline artifacts');
} finally {
  rmSync(tempRootStaleContracts, { recursive: true, force: true });
}

const tempRootMissingRepoWideView = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-missing-repo-wide-'));
try {
  const tempDemo = join(tempRootMissingRepoWideView, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const corePath = join(tempDemo, '.analysis', 'llm', 'core-assessment.json');
  const core = JSON.parse(readFileSync(corePath, 'utf8'));
  delete core.assessment.repository_wide_view;
  writeFileSync(corePath, JSON.stringify(core, null, 2) + '\n');
  run(['dev', 'aggregate', tempDemo]);
  const modifiedBundle = JSON.parse(readFileSync(join(tempDemo, '.analysis', 'data', 'bundle.json'), 'utf8'));
  const row = (modifiedBundle.target_artifact_contract_coverage || modifiedBundle.target_coverage || []).find(item => item.id === 'whole-repository-documentation');
  assert(row?.output_status === 'not_scored', 'Missing concrete repository_wide_view must not create a deterministic target-row status');
  assert(row?.output_details?.some(item => item.key === 'assessment.repository_wide_view' && item.deterministic_presence_scored === false), 'Target rows must keep expected output keys as unscored LLM authoring hints');
} finally {
  rmSync(tempRootMissingRepoWideView, { recursive: true, force: true });
}

const tempRootCustomTrace = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-custom-trace-'));
try {
  const tempDemo = join(tempRootCustomTrace, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const documentPath = join(tempDemo, '.analysis', 'llm', 'analysis-document.json');
  const document = JSON.parse(readFileSync(documentPath, 'utf8'));
  const requirementRenames = new Map();
  document.analysis_document.requirements_trace = (document.analysis_document.requirements_trace || []).map((item, index) => {
    const renamed = `Repository-specific decision criterion ${index + 1}`;
    requirementRenames.set(item.requirement, renamed);
    return {
      ...item,
      requirement: renamed
    };
  });
  document.analysis_document.report_quality_review.partial_requirement_rationale = (document.analysis_document.report_quality_review.partial_requirement_rationale || []).map(item => ({
    ...item,
    requirement: requirementRenames.get(item.requirement) || item.requirement
  }));
  writeFileSync(documentPath, JSON.stringify(document, null, 2) + '\n');

  const positive = run(['dev', 'audit-report', tempDemo], { capture: true });
  const output = `${positive.stdout || ''}\n${positive.stderr || ''}`;
  assert(output.includes('Report audit: passed'), 'Custom LLM requirements trace labels should pass when the trace contract is structured');
  assert(output.includes('Requirements trace contract: structured'), 'Custom LLM requirements trace labels should still produce a structured trace contract');
} finally {
  rmSync(tempRootCustomTrace, { recursive: true, force: true });
}

const tempRootCustomQualityReview = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-custom-quality-review-'));
try {
  const tempDemo = join(tempRootCustomQualityReview, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const documentPath = join(tempDemo, '.analysis', 'llm', 'analysis-document.json');
  const document = JSON.parse(readFileSync(documentPath, 'utf8'));
  const review = document.analysis_document.report_quality_review;
  review.checks = {
    onboarding_decision_story_is_usable: 'decision_ready_with_demo_process_limit'
  };
  review.criteria = [
    {
      name: 'Repository-specific decision story',
      verdict: 'decision_ready',
      reason: 'The LLM judges the demo report usable for the onboarding decision story while keeping the process-readiness limitation explicit.',
      evidence: review.evidence || []
    }
  ];
  writeFileSync(documentPath, JSON.stringify(document, null, 2) + '\n');

  const positive = run(['dev', 'audit-report', tempDemo], { capture: true });
  const output = `${positive.stdout || ''}\n${positive.stderr || ''}`;
  assert(output.includes('Report audit: passed'), 'Repo-specific LLM report-quality review vocabulary should pass');
  assert(output.includes('Report quality review: structured · decision_ready'), 'Custom LLM report-quality checks should still produce a structured LLM verdict');
} finally {
  rmSync(tempRootCustomQualityReview, { recursive: true, force: true });
}

const tempBoundaryRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-boundary-'));
try {
  const tempRepo = join(tempBoundaryRoot, 'repo');
  mkdirSync(join(tempRepo, 'services', 'api', 'src', 'main', 'java'), { recursive: true });
  mkdirSync(join(tempRepo, 'web', 'src'), { recursive: true });
  mkdirSync(join(tempRepo, 'tools', '.venvs', 'ignored-env'), { recursive: true });
  mkdirSync(join(tempRepo, '.analysis-seed', 'source_tiers'), { recursive: true });
  writeFileSync(join(tempRepo, 'services', 'api', 'pom.xml'), '<project></project>\n');
  writeFileSync(join(tempRepo, 'services', 'api', 'src', 'main', 'java', 'Api.java'), 'class Api {}\n');
  writeFileSync(join(tempRepo, 'web', 'package.json'), '{"scripts":{"test":"echo ok"}}\n');
  writeFileSync(join(tempRepo, 'web', 'src', 'App.ts'), 'export const app = () => "ok";\n');
  writeFileSync(join(tempRepo, 'tools', '.venvs', 'ignored-env', 'generated.py'), 'print("not source inventory")\n');
  writeFileSync(join(tempRepo, '.analysis-seed', 'source_tiers', 'source-tier-seed.json'), '{"source_tier_reviews":[]}\n');
  const mcpPrepare = callMcpTool('prepare', { repo: tempRepo });
  assert(existsSync(join(tempRepo, '.analysis', 'source_tiers', 'source-tier-seed.json')), 'MCP prepare must copy source_tiers seed artifacts like CLI prepare');
  assert(mcpPrepare.staged_llm_workflow?.includes('00-analysis-strategy.md'), 'MCP prepare must expose the LLM analysis strategy step');
  assert(mcpPrepare.staged_llm_workflow?.includes('skill_workbench_tasks'), 'MCP prepare must expose the LLM-planned skill workbench materialization step');
  assert(mcpPrepare.staged_llm_workflow?.includes('capability_templates'), 'MCP prepare must describe optional capability templates');
  assert(mcpPrepare.staged_llm_workflow?.includes('11-detail-agent-plan.md'), 'MCP prepare must expose the staged detail-agent plan step');
  assert(mcpPrepare.staged_llm_workflow?.includes('12-analysis-document.md'), 'MCP prepare must expose final report authoring after detail reviews');
  const analyzePending = run(['analyze', tempRepo, '--mode', 'blueprint', '--goal', 'Create a rebuild decision brief.', '--no-seed', '--no-html'], { capture: true });
  const analyzePendingOutput = `${analyzePending.stdout || ''}\n${analyzePending.stderr || ''}`;
  assert(analyzePendingOutput.includes('Cognianalysis analyze: mode=blueprint'), 'Analyze output must surface the selected product mode');
  const productRequest = JSON.parse(readFileSync(join(tempRepo, '.analysis', 'data', 'product-analysis-request.json'), 'utf8'));
  assert(productRequest.mode === 'blueprint', `Analyze must persist requested product mode, got ${productRequest.mode}`);
  assert(productRequest.goal === 'Create a rebuild decision brief.', 'Analyze must persist the goal-first product request');
  assert(productRequest.analysis_scope_request?.mode === 'complete', 'Analyze must persist the requested analysis scope mode');
  const tempTaskGuide = readFileSync(join(tempRepo, '.analysis', 'TASK.md'), 'utf8');
  const tempStrategyTask = readFileSync(join(tempRepo, '.analysis', 'llm_tasks', '00-analysis-strategy.md'), 'utf8');
  const tempFinalTask = readFileSync(join(tempRepo, '.analysis', 'llm_tasks', '12-analysis-document.md'), 'utf8');
  assert(tempTaskGuide.includes('Product Analysis Request'), 'Analyze-generated TASK.md must expose the product analysis request');
  assert(tempTaskGuide.includes('Create a rebuild decision brief.'), 'TASK.md must include the requested product goal');
  assert(tempStrategyTask.includes('product-analysis-request.json'), 'Strategy task must tell Codex to read the product request');
  assert(tempStrategyTask.includes('blueprint'), 'Strategy task must include the selected product mode in hints');
  assert(tempFinalTask.includes('depth_policy'), 'Final report task must carry the product depth policy');
  const deepDive = run(['analyze', tempRepo, '--mode', 'deep-dive', '--flow', 'onboarding', '--no-seed', '--no-html'], { capture: true });
  assert((deepDive.stdout || '').includes('Cognianalysis analyze: mode=deep-dive'), 'Analyze must accept a targeted deep-dive mode');
  const deepDiveRequest = JSON.parse(readFileSync(join(tempRepo, '.analysis', 'data', 'product-analysis-request.json'), 'utf8'));
  assert(deepDiveRequest.target?.flow === 'onboarding', 'Deep-dive analyze must persist the requested flow target');
  rmSync(join(tempRepo, '.analysis'), { recursive: true, force: true });
  const missingTarget = run(['analyze', tempRepo, '--mode', 'deep-dive', '--no-seed', '--no-html'], { capture: true, expectFailure: true });
  assert(String(missingTarget.stderr || missingTarget.stdout || '').includes('Deep-dive mode requires --goal'), 'Deep-dive without a target or goal must fail closed');
  const freshScopeFilesOnly = run(['analyze', tempRepo, '--scope-files', '5', '--no-seed', '--no-html'], { capture: true, expectFailure: true });
  assert(String(freshScopeFilesOnly.stderr || freshScopeFilesOnly.stdout || '').includes('--scope-files requires --scope'), 'Fresh analyze with --scope-files but no --scope must fail clearly');
  const missingRepo = join(tempBoundaryRoot, 'missing-repo');
  const missingRepoRun = run(['analyze', missingRepo, '--mode', 'brief'], { capture: true, expectFailure: true });
  assert(String(missingRepoRun.stderr || missingRepoRun.stdout || '').includes('Repository path does not exist'), 'Analyze must reject missing repo paths before writing analysis data');
  assert(!existsSync(missingRepo), 'Analyze must not create a missing repo directory before validation');
  const missingResumeRepo = join(tempBoundaryRoot, 'missing-resume-repo');
  const missingResume = run(['resume', missingResumeRepo], { capture: true, expectFailure: true });
  assert(String(missingResume.stderr || missingResume.stdout || '').includes('Repository path does not exist'), 'Resume must reject missing repo paths before prepare fallback');
  assert(!existsSync(missingResumeRepo), 'Resume must not create a missing repo directory before validation');
  const missingRepairRepo = join(tempBoundaryRoot, 'missing-repair-repo');
  const missingRepair = run(['repair', missingRepairRepo], { capture: true, expectFailure: true });
  assert(String(missingRepair.stderr || missingRepair.stdout || '').includes('Repository path does not exist'), 'Repair must reject missing repo paths before prepare fallback');
  assert(!existsSync(missingRepairRepo), 'Repair must not create a missing repo directory before validation');
  const missingRunRepo = join(tempBoundaryRoot, 'missing-run-repo');
  const missingCompatibilityRun = run(['run', missingRunRepo], { capture: true, expectFailure: true });
  assert(String(missingCompatibilityRun.stderr || missingCompatibilityRun.stdout || '').includes('Repository path does not exist'), 'Compatibility run must reject missing repo paths before prepare fallback');
  assert(!existsSync(missingRunRepo), 'Compatibility run must not create a missing repo directory before validation');
  for (const tool of ['prepare', 'aggregate', 'finalize', 'audit-report']) {
    const missingMcpRepo = join(tempBoundaryRoot, `missing-mcp-${tool}`);
    const mcpError = callMcpToolExpectError(tool, { repo: missingMcpRepo });
    assert(mcpError.includes('Repository path does not exist'), `MCP ${tool} must reject missing repo paths`);
    assert(!existsSync(missingMcpRepo), `MCP ${tool} must not create a missing repo directory before validation`);
  }
  const readyRequestRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-request-refresh-'));
  const readyRequestRepo = join(readyRequestRoot, 'demo-repo');
  cpSync(demo, readyRequestRepo, { recursive: true });
  const changedRequest = run(['analyze', readyRequestRepo, '--mode', 'deep-dive', '--flow', 'onboarding'], { capture: true, expectFailure: true });
  const changedRequestOutput = `${changedRequest.stdout || ''}\n${changedRequest.stderr || ''}`;
  assert(!changedRequestOutput.includes('Product mode complete.'), 'Analyze must not complete an old ready report after the product request changes');
  assert(changedRequestOutput.includes('product analysis request changed'), 'Changed product request must make downstream LLM artifacts freshness-blocked');
  const equalMtimeRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-equal-mtime-refresh-'));
  const equalMtimeRepo = join(equalMtimeRoot, 'demo-repo');
  cpSync(demo, equalMtimeRepo, { recursive: true });
  run(['analyze', equalMtimeRepo, '--mode', 'deep-dive', '--flow', 'onboarding'], { capture: true, expectFailure: true });
  const equalRequestPath = join(equalMtimeRepo, '.analysis', 'data', 'product-analysis-request.json');
  const equalRequestMtime = new Date('2030-01-01T00:00:00Z');
  utimesSync(equalRequestPath, equalRequestMtime, equalRequestMtime);
  for (const relativePath of ['analysis-strategy.json', 'detail-agent-plan.json', 'analysis-document.json']) {
    utimesSync(join(equalMtimeRepo, '.analysis', 'llm', relativePath), equalRequestMtime, equalRequestMtime);
  }
  const equalMtimeAudit = run(['dev', 'audit-report', equalMtimeRepo], { capture: true, expectFailure: true });
  const equalMtimeOutput = `${equalMtimeAudit.stdout || ''}\n${equalMtimeAudit.stderr || ''}`;
  assert(equalMtimeOutput.includes('product analysis request changed'), 'Stale request marker must require LLM artifacts newer than the request, not equal-time artifacts');
  const staleMarkerRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-stale-marker-mask-'));
  const staleMarkerRepo = join(staleMarkerRoot, 'demo-repo');
  cpSync(demo, staleMarkerRepo, { recursive: true });
  const staleMarkerRequestPath = join(staleMarkerRepo, '.analysis', 'data', 'product-analysis-request.json');
  const staleMarkerRequest = JSON.parse(readFileSync(staleMarkerRequestPath, 'utf8'));
  staleMarkerRequest.goal = 'Mutated goal without freshness marker update';
  writeFileSync(staleMarkerRequestPath, JSON.stringify(staleMarkerRequest, null, 2) + '\n');
  const staleMarkerAudit = run(['dev', 'audit-report', staleMarkerRepo], { capture: true, expectFailure: true });
  const staleMarkerOutput = `${staleMarkerAudit.stdout || ''}\n${staleMarkerAudit.stderr || ''}`;
  assert(staleMarkerOutput.includes('product analysis request changed'), 'Freshness marker stale:false must not mask a changed product request hash');
  const legacyRequestRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-legacy-request-refresh-'));
  const legacyRequestRepo = join(legacyRequestRoot, 'demo-repo');
  cpSync(demo, legacyRequestRepo, { recursive: true });
  rmSync(join(legacyRequestRepo, '.analysis', 'data', 'product-analysis-request.json'), { force: true });
  rmSync(join(legacyRequestRepo, '.analysis', 'data', 'product-analysis-request-freshness.json'), { force: true });
  const legacyRequest = run(['analyze', legacyRequestRepo, '--goal', 'New product decision goal'], { capture: true, expectFailure: true });
  const legacyRequestOutput = `${legacyRequest.stdout || ''}\n${legacyRequest.stderr || ''}`;
  assert(!legacyRequestOutput.includes('Product mode complete.'), 'Analyze must not complete a legacy ready workspace when adding the first product request');
  assert(legacyRequestOutput.includes('product analysis request changed'), 'First product request on legacy ready workspaces must freshness-block old LLM artifacts');
  const plainAnalyzeRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-plain-analyze-preserve-'));
  const plainAnalyzeRepo = join(plainAnalyzeRoot, 'demo-repo');
  cpSync(demo, plainAnalyzeRepo, { recursive: true });
  const plainBefore = JSON.parse(readFileSync(join(plainAnalyzeRepo, '.analysis', 'data', 'product-analysis-request.json'), 'utf8'));
  const plainAnalyze = run(['analyze', plainAnalyzeRepo], { capture: true });
  const plainAnalyzeOutput = `${plainAnalyze.stdout || ''}\n${plainAnalyze.stderr || ''}`;
  const plainAfter = JSON.parse(readFileSync(join(plainAnalyzeRepo, '.analysis', 'data', 'product-analysis-request.json'), 'utf8'));
  assert(plainAnalyzeOutput.includes('Product mode complete.'), 'Plain analyze must continue an existing product request without freshness-blocking it');
  assert(plainAfter.request_hash === plainBefore.request_hash && plainAfter.goal === plainBefore.goal && plainAfter.mode === plainBefore.mode, 'Plain analyze must preserve the existing product request instead of resetting to defaults');
  const scopedBlueprintRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-scoped-blueprint-preserve-'));
  const scopedBlueprintRepo = join(scopedBlueprintRoot, 'demo-repo');
  cpSync(demo, scopedBlueprintRepo, { recursive: true });
  rmSync(join(scopedBlueprintRepo, '.analysis'), { recursive: true, force: true });
  run(['analyze', scopedBlueprintRepo, '--mode', 'blueprint', '--goal', 'Blueprint goal', '--no-seed', '--no-html'], { capture: true });
  run(['analyze', scopedBlueprintRepo, '--scope', 'representative', '--scope-files', '5', '--no-seed', '--no-html'], { capture: true });
  const scopedBlueprintRequest = JSON.parse(readFileSync(join(scopedBlueprintRepo, '.analysis', 'data', 'product-analysis-request.json'), 'utf8'));
  assert(scopedBlueprintRequest.mode === 'blueprint' && scopedBlueprintRequest.goal === 'Blueprint goal', 'Scope-only analyze must preserve an existing mode and goal');
  assert(scopedBlueprintRequest.analysis_scope_request?.mode === 'representative' && scopedBlueprintRequest.analysis_scope_request?.scope_files === 5, 'Scope-only analyze must update only the requested scope fields');
  const scopeChangeRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-scope-change-'));
  const scopeChangeRepo = join(scopeChangeRoot, 'demo-repo');
  cpSync(demo, scopeChangeRepo, { recursive: true });
  const scopeChange = run(['analyze', scopeChangeRepo, '--scope', 'representative', '--scope-files', '5'], { capture: true, expectFailure: true });
  const scopeChangeOutput = `${scopeChange.stdout || ''}\n${scopeChange.stderr || ''}`;
  assert(scopeChangeOutput.includes('requested scope differs'), 'Analyze must disclose when it rebuilds for a scope change');
  assert(!scopeChangeOutput.includes('Product mode complete.'), 'Analyze must not complete an old ready report after the requested scope changes');
  const changedScope = JSON.parse(readFileSync(join(scopeChangeRepo, '.analysis', 'data', 'analysis-scope.json'), 'utf8'));
  assert(changedScope.mode === 'representative' && changedScope.selected_files === 5, 'Analyze must rebuild analysis-scope.json for complete-to-representative scope changes');
  const scopeFlipRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-scope-flip-'));
  const scopeFlipRepo = join(scopeFlipRoot, 'demo-repo');
  cpSync(demo, scopeFlipRepo, { recursive: true });
  rmSync(join(scopeFlipRepo, '.analysis'), { recursive: true, force: true });
  run(['analyze', scopeFlipRepo, '--scope', 'representative', '--scope-files', '5', '--no-seed', '--no-html'], { capture: true });
  run(['analyze', scopeFlipRepo, '--scope', 'complete', '--no-seed', '--no-html'], { capture: true });
  const flippedScope = JSON.parse(readFileSync(join(scopeFlipRepo, '.analysis', 'data', 'analysis-scope.json'), 'utf8'));
  assert(flippedScope.mode === 'complete' && flippedScope.deferred_files === 0, 'Analyze must rebuild analysis-scope.json for representative-to-complete scope changes');
  const oversizedScopeRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-oversized-scope-'));
  const oversizedScopeRepo = join(oversizedScopeRoot, 'demo-repo');
  cpSync(demo, oversizedScopeRepo, { recursive: true });
  rmSync(join(oversizedScopeRepo, '.analysis'), { recursive: true, force: true });
  run(['analyze', oversizedScopeRepo, '--scope', 'representative', '--scope-files', '400', '--no-seed', '--no-html'], { capture: true });
  const repeatedOversizedScope = run(['analyze', oversizedScopeRepo, '--scope', 'representative', '--scope-files', '400', '--no-seed', '--no-html'], { capture: true });
  const repeatedOversizedScopeOutput = `${repeatedOversizedScope.stdout || ''}\n${repeatedOversizedScope.stderr || ''}`;
  assert(!repeatedOversizedScopeOutput.includes('requested scope differs'), 'Analyze must not rebuild repeatedly when requested scope-files exceeds repo size');
  const plainRepresentativeRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-plain-representative-preserve-'));
  const plainRepresentativeRepo = join(plainRepresentativeRoot, 'demo-repo');
  cpSync(demo, plainRepresentativeRepo, { recursive: true });
  rmSync(join(plainRepresentativeRepo, '.analysis'), { recursive: true, force: true });
  run(['analyze', plainRepresentativeRepo, '--scope', 'representative', '--scope-files', '5', '--no-seed', '--no-html'], { capture: true });
  const plainRepresentative = run(['analyze', plainRepresentativeRepo, '--no-seed', '--no-html'], { capture: true });
  const plainRepresentativeOutput = `${plainRepresentative.stdout || ''}\n${plainRepresentative.stderr || ''}`;
  const preservedRepresentativeScope = JSON.parse(readFileSync(join(plainRepresentativeRepo, '.analysis', 'data', 'analysis-scope.json'), 'utf8'));
  assert(!plainRepresentativeOutput.includes('requested scope differs'), 'Plain analyze must preserve an existing representative request instead of rebuilding to complete');
  assert(preservedRepresentativeScope.mode === 'representative' && preservedRepresentativeScope.selected_files === 5, 'Plain analyze must keep the prior representative analysis scope');
  const goalRepresentativeRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-goal-representative-preserve-'));
  const goalRepresentativeRepo = join(goalRepresentativeRoot, 'demo-repo');
  cpSync(demo, goalRepresentativeRepo, { recursive: true });
  rmSync(join(goalRepresentativeRepo, '.analysis'), { recursive: true, force: true });
  run(['analyze', goalRepresentativeRepo, '--scope', 'representative', '--scope-files', '5', '--no-seed', '--no-html'], { capture: true });
  run(['analyze', goalRepresentativeRepo, '--goal', 'New scoped goal', '--no-seed', '--no-html'], { capture: true });
  const goalRepresentativeRequest = JSON.parse(readFileSync(join(goalRepresentativeRepo, '.analysis', 'data', 'product-analysis-request.json'), 'utf8'));
  assert(goalRepresentativeRequest.goal === 'New scoped goal', 'Goal-only analyze must update the requested goal');
  assert(goalRepresentativeRequest.analysis_scope_request?.mode === 'representative' && goalRepresentativeRequest.analysis_scope_request?.scope_files === 5, 'Goal-only analyze must preserve an existing representative scope');
  const scopeDefaultRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-scope-default-change-'));
  const scopeDefaultRepo = join(scopeDefaultRoot, 'demo-repo');
  cpSync(demo, scopeDefaultRepo, { recursive: true });
  rmSync(join(scopeDefaultRepo, '.analysis'), { recursive: true, force: true });
  run(['analyze', scopeDefaultRepo, '--scope', 'representative', '--scope-files', '5', '--no-seed', '--no-html'], { capture: true });
  run(['analyze', scopeDefaultRepo, '--scope', 'critical-path', '--no-seed', '--no-html'], { capture: true });
  const criticalPathDefaultRequest = JSON.parse(readFileSync(join(scopeDefaultRepo, '.analysis', 'data', 'product-analysis-request.json'), 'utf8'));
  assert(criticalPathDefaultRequest.analysis_scope_request?.mode === 'critical-path' && criticalPathDefaultRequest.analysis_scope_request?.scope_files === 1200, 'Changing scope mode without --scope-files must persist the new mode default instead of the previous limit');
  const repeatedCriticalPath = run(['analyze', scopeDefaultRepo, '--no-seed', '--no-html'], { capture: true });
  const repeatedCriticalPathOutput = `${repeatedCriticalPath.stdout || ''}\n${repeatedCriticalPath.stderr || ''}`;
  assert(!repeatedCriticalPathOutput.includes('requested scope differs'), 'Plain analyze after scope mode defaulting must not rebuild from a stale scope_files value');
  const scopeFilesOnlyRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-scope-files-only-rebuild-'));
  const scopeFilesOnlyRepo = join(scopeFilesOnlyRoot, 'demo-repo');
  cpSync(demo, scopeFilesOnlyRepo, { recursive: true });
  rmSync(join(scopeFilesOnlyRepo, '.analysis'), { recursive: true, force: true });
  run(['analyze', scopeFilesOnlyRepo, '--scope', 'representative', '--scope-files', '5', '--no-seed', '--no-html'], { capture: true });
  run(['analyze', scopeFilesOnlyRepo, '--scope-files', '10', '--no-seed', '--no-html'], { capture: true });
  const scopeFilesOnlyScope = JSON.parse(readFileSync(join(scopeFilesOnlyRepo, '.analysis', 'data', 'analysis-scope.json'), 'utf8'));
  const scopeFilesOnlyRequest = JSON.parse(readFileSync(join(scopeFilesOnlyRepo, '.analysis', 'data', 'product-analysis-request.json'), 'utf8'));
  assert(scopeFilesOnlyRequest.analysis_scope_request?.mode === 'representative' && scopeFilesOnlyRequest.analysis_scope_request?.scope_files === 10, 'Scope-files-only analyze must preserve the previous non-complete scope mode in the product request');
  assert(scopeFilesOnlyScope.mode === 'representative' && scopeFilesOnlyScope.selected_files === 10, 'Scope-files-only analyze must rebuild with the merged non-complete scope instead of raw complete scope');
  const repeatedScopeFilesOnly = run(['analyze', scopeFilesOnlyRepo, '--no-seed', '--no-html'], { capture: true });
  const repeatedScopeFilesOnlyOutput = `${repeatedScopeFilesOnly.stdout || ''}\n${repeatedScopeFilesOnly.stderr || ''}`;
  assert(!repeatedScopeFilesOnlyOutput.includes('requested scope differs'), 'Plain analyze after scope-files-only rebuild must not rebuild from request/scope mismatch');
  const runFallbackRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-run-fallback-scope-'));
  const runFallbackRepo = join(runFallbackRoot, 'demo-repo');
  cpSync(demo, runFallbackRepo, { recursive: true });
  rmSync(join(runFallbackRepo, '.analysis'), { recursive: true, force: true });
  run(['analyze', runFallbackRepo, '--scope', 'representative', '--scope-files', '5', '--no-seed', '--no-html'], { capture: true });
  rmSync(join(runFallbackRepo, '.analysis', 'data', 'code-map.json'), { force: true });
  rmSync(join(runFallbackRepo, '.analysis', 'TASK.md'), { force: true });
  run(['analyze', runFallbackRepo, '--no-seed', '--no-html'], { capture: true });
  const runFallbackScope = JSON.parse(readFileSync(join(runFallbackRepo, '.analysis', 'data', 'analysis-scope.json'), 'utf8'));
  assert(runFallbackScope.mode === 'representative' && runFallbackScope.selected_files === 5, 'Plain analyze prepare fallback must honor persisted representative product request scope');
  const missingCodeMapRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-run-missing-code-map-'));
  const missingCodeMapRepo = join(missingCodeMapRoot, 'demo-repo');
  cpSync(demo, missingCodeMapRepo, { recursive: true });
  rmSync(join(missingCodeMapRepo, '.analysis'), { recursive: true, force: true });
  run(['analyze', missingCodeMapRepo, '--scope', 'representative', '--scope-files', '5', '--no-seed', '--no-html'], { capture: true });
  rmSync(join(missingCodeMapRepo, '.analysis', 'data', 'code-map.json'), { force: true });
  run(['analyze', missingCodeMapRepo, '--no-seed', '--no-html'], { capture: true });
  const missingCodeMapScope = JSON.parse(readFileSync(join(missingCodeMapRepo, '.analysis', 'data', 'analysis-scope.json'), 'utf8'));
  assert(missingCodeMapScope.mode === 'representative' && missingCodeMapScope.selected_files === 5, 'Plain analyze must reprepare missing code-map.json with persisted representative scope');
  const missingTierManifestRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-run-missing-tier-manifest-'));
  const missingTierManifestRepo = join(missingTierManifestRoot, 'demo-repo');
  cpSync(demo, missingTierManifestRepo, { recursive: true });
  rmSync(join(missingTierManifestRepo, '.analysis'), { recursive: true, force: true });
  run(['analyze', missingTierManifestRepo, '--scope', 'representative', '--scope-files', '5', '--no-seed', '--no-html'], { capture: true });
  rmSync(join(missingTierManifestRepo, '.analysis', 'source-tier-task-manifest.json'), { force: true });
  run(['analyze', missingTierManifestRepo, '--no-seed', '--no-html'], { capture: true });
  const missingTierManifestScope = JSON.parse(readFileSync(join(missingTierManifestRepo, '.analysis', 'data', 'analysis-scope.json'), 'utf8'));
  assert(missingTierManifestScope.mode === 'representative' && missingTierManifestScope.selected_files === 5, 'Plain analyze must reprepare missing source-tier manifest with persisted representative scope');
  const repairFallbackRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-repair-fallback-scope-'));
  const repairFallbackRepo = join(repairFallbackRoot, 'demo-repo');
  cpSync(demo, repairFallbackRepo, { recursive: true });
  rmSync(join(repairFallbackRepo, '.analysis'), { recursive: true, force: true });
  run(['analyze', repairFallbackRepo, '--scope', 'representative', '--scope-files', '5', '--no-seed', '--no-html'], { capture: true });
  rmSync(join(repairFallbackRepo, '.analysis', 'source-tier-task-manifest.json'), { force: true });
  run(['repair', repairFallbackRepo, '--no-seed', '--no-html'], { capture: true });
  const repairFallbackScope = JSON.parse(readFileSync(join(repairFallbackRepo, '.analysis', 'data', 'analysis-scope.json'), 'utf8'));
  assert(repairFallbackScope.mode === 'representative' && repairFallbackScope.selected_files === 5, 'Repair prepare fallback must honor persisted representative product request scope');
  assert(analyzePendingOutput.includes('00-analysis-strategy.md'), 'Analyze pending output must describe the LLM analysis strategy step');
  assert(analyzePendingOutput.includes('skill_workbench_tasks'), 'Analyze pending output must describe LLM-planned skill workbench materialization');
  assert(analyzePendingOutput.includes('capability_templates'), 'Analyze pending output must describe optional capability templates');
  assert(analyzePendingOutput.includes('11-detail-agent-plan.md'), 'Analyze pending output must describe the staged LLM detail-agent plan step');
  assert(analyzePendingOutput.includes('12-analysis-document.md'), 'Analyze pending output must describe final report authoring after detail reviews');
  assert(analyzePendingOutput.includes('--allow-partial'), 'Analyze pending output must describe the partial finalize step that materializes detail tasks');
  assert(!analyzePendingOutput.includes('execute .analysis/llm_tasks/*.md, write .analysis/llm/*.json'), 'Analyze pending output must not describe the old flat task workflow');
  const preparePending = run(['dev', 'prepare', tempRepo, '--no-seed'], { capture: true });
  const preparePendingOutput = `${preparePending.stdout || ''}\n${preparePending.stderr || ''}`;
  assert(preparePendingOutput.includes('00-analysis-strategy.md'), 'Prepare output must describe the LLM analysis strategy step');
  assert(preparePendingOutput.includes('skill_workbench_tasks'), 'Prepare output must describe LLM-planned skill workbench materialization');
  assert(preparePendingOutput.includes('capability_templates'), 'Prepare output must describe optional capability templates');
  assert(preparePendingOutput.includes('11-detail-agent-plan.md'), 'Prepare output must describe the staged LLM detail-agent plan step');
  assert(preparePendingOutput.includes('12-analysis-document.md'), 'Prepare output must describe final report authoring after detail reviews');
  assert(!preparePendingOutput.includes('execute .analysis/llm_tasks/*.md, write .analysis/llm/*.json'), 'Prepare output must not describe the old flat task workflow');
  run(['dev', 'aggregate', tempRepo]);
  const codeMap = JSON.parse(readFileSync(join(tempRepo, '.analysis', 'data', 'code-map.json'), 'utf8'));
  assert(!(codeMap.files || []).some(file => String(file.path || '').includes('.venvs/')), 'Code map must ignore local virtual-environment directories such as .venvs');
  const moduleNames = new Set((codeMap.modules || []).map(m => m.name));
  assert(moduleNames.has('services/api'), `Expected neutral path partition services/api, got ${[...moduleNames].join(', ')}`);
  assert(moduleNames.has('web/src'), `Expected neutral path partition web/src, got ${[...moduleNames].join(', ')}`);
  assert((codeMap.modules || []).every(m => m.boundary_source === 'path_partition'), 'Code map must not infer project boundaries from manifest filenames');
  const repoMapSource = readFileSync(join(root, 'src', 'repoMap.ts'), 'utf8');
  const forbiddenSourceLayouts = [['src', 'main', 'java'].join('/')];
  for (const layout of forbiddenSourceLayouts) assert(!repoMapSource.includes(layout), `repoMap.ts must not hardcode source layout path: ${layout}`);
  assert(!repoMapSource.includes('MODULE_BOUNDARY_MANIFESTS'), 'repoMap.ts must not keep manifest-name boundary tables');
  assert(!repoMapSource.includes('known_manifest_name'), 'repoMap.ts must not rank files by known manifest names');
  assert(!repoMapSource.includes('project_manifest'), 'repoMap.ts must not label module partitions as project manifests');
  const pendingBundle = JSON.parse(readFileSync(join(tempRepo, '.analysis', 'data', 'bundle.json'), 'utf8'));
  assert(pendingBundle.status?.state === 'awaiting_llm_extraction', 'No-seed repo should remain awaiting LLM extraction');
  const semanticIds = [
    'llm-first-semantic-extraction',
    'whole-codebase-source-inventory-accounting',
    'whole-repository-documentation',
    'four-level-analysis-model',
    'architecture-assessment',
    'process-readiness',
    'quality-risks-findings',
    'structured-decision-basis'
  ];
  const falseSemanticCoverage = (pendingBundle.target_artifact_contract_coverage || pendingBundle.target_coverage || [])
    .filter(row => semanticIds.includes(row.id) && ['present', 'partial', 'missing', 'pending'].includes(row.output_status))
    .map(row => `${row.id}:${row.output_status}`);
  assert(falseSemanticCoverage.length === 0, `No-seed deterministic fallbacks produced scored semantic target capability rows: ${falseSemanticCoverage.join(', ')}`);
} finally {
  rmSync(tempBoundaryRoot, { recursive: true, force: true });
}

console.log('verify-demo: positive, missing-plan, optional-template-output, missing-quality-review, partial-quality-verdict, missing-partial-rationale, missing-requirements-trace, unexpected-detail-review, missing-goal-trace-refs, empty-doc-block, business-narrative-fields, custom-component-labels, stale-contract-refresh, custom-trace-labels, custom-quality-review, unscored-target-context, neutral-path-partition and no-seed semantic-fallback regression checks passed');

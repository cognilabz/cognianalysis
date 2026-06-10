import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const demo = join(root, 'examples', 'demo-repo');
const cli = join(root, 'dist', 'cli.js');

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
run(['prepare', demo]);
run(['finalize', demo]);
run(['audit-report', demo]);
const auditOutput = run(['audit-report', demo], { capture: true }).stdout || '';
assert(auditOutput.includes('Source inventory:'), 'Audit output must use source inventory accounting wording');
assert(!auditOutput.includes('Source coverage:'), 'Audit output must not expose source coverage as a visible verdict label');
const coverageOutput = run(['coverage', demo], { capture: true }).stdout || '';
assert(coverageOutput.includes('Source inventory accounting:'), 'Coverage output must expose source inventory accounting wording');
assert(coverageOutput.includes('Tier 1 task backlog:'), 'Coverage output must expose Tier 1 task backlog wording');
assert(!coverageOutput.includes('Source coverage:'), 'Coverage output must not expose source coverage as a visible verdict label');
assert(coverageOutput.includes('target capabilities are registered as LLM trace context'), 'Coverage output must describe target rows as unscored LLM trace context');
assert(!coverageOutput.includes('tracked linked'), 'Coverage output must not describe target rows as linked/present artifacts');
assert(!coverageOutput.includes('covered present'), 'Coverage output must not use covered as the target design status');
assert(!coverageOutput.includes('target capability rows are present'), 'Coverage output must not sound like a semantic all-present verdict');

const bundlePath = join(demo, '.analysis', 'data', 'bundle.json');
const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
const demoHtml = readFileSync(join(demo, '.analysis', 'report', 'index.html'), 'utf8');
const demoCodeMap = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'code-map.json'), 'utf8'));
const demoSourceFamilyInventory = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'source-family-inventory.json'), 'utf8'));
const demoGoalContract = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'analysis-goal-contract.json'), 'utf8'));
const demoToolPositioningReferences = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'tool-positioning-references.json'), 'utf8'));
const demoComponentLibrary = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'report-component-library.json'), 'utf8'));
const demoSourceTierModel = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'source-tier-model.json'), 'utf8'));
const demoSourceTierBacklog = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'source-tier-backlog.json'), 'utf8'));
const demoSkillCatalog = JSON.parse(readFileSync(join(demo, '.analysis', 'data', 'analysis-skill-catalog.json'), 'utf8'));
const demoPipeline = JSON.parse(readFileSync(join(demo, '.analysis', 'analysis-pipeline.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const demoTaskManifest = JSON.parse(readFileSync(join(demo, '.analysis', 'task-manifest.json'), 'utf8'));
const demoCapabilityTemplateManifest = JSON.parse(readFileSync(join(demo, '.analysis', 'capability-template-manifest.json'), 'utf8'));
const instructions = readFileSync(join(demo, '.analysis', 'llm_instructions.md'), 'utf8');
const finalReportTask = readFileSync(join(demo, '.analysis', 'llm_tasks', '12-analysis-document.md'), 'utf8');
const strategyTask = readFileSync(join(demo, '.analysis', 'llm_tasks', '00-analysis-strategy.md'), 'utf8');
const rootAgents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
const resourceAgents = readFileSync(join(root, 'resources', 'AGENTS.md'), 'utf8');
const readme = readFileSync(join(root, 'README.md'), 'utf8');
const helpOutput = run(['--help'], { capture: true }).stdout || '';
assert(helpOutput.includes('init-harness'), 'CLI help must expose the generic harness installer');
assert(helpOutput.includes('init-codex'), 'CLI help must keep the Codex compatibility installer');
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
  assert(readFileSync(join(harnessTarget, 'CLAUDE.md'), 'utf8').includes('agent harness/LLM performs the semantic extraction'), 'Claude adapter must use harness-neutral extraction wording');
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
assert(demoTargetRows.every(row => row.semantic_verdict_authority === 'llm'), 'Every target row must assign semantic verdict authority to the LLM');
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
}
assert(strategyTask.includes('pre_source_tier_pre_overview'), 'Generated strategy task must require the pre-source-tier LLM strategy stage');
assert(finalReportTask.includes('analysis-strategy.json'), 'Final report task must require reading the LLM analysis strategy');
assert(demoTaskManifest.tasks?.every(task => typeof task.id === 'string' && task.id.length > 0), 'Demo task manifest must expose stable task ids');
assert(demoTaskManifest.tasks?.length === 3, 'Demo task manifest must contain only required workflow tasks');
assert(demoTaskManifest.tasks?.every(task => task.task_kind === 'workflow_task' && task.required_for_final === true), 'Required task manifest entries must be workflow gates');
assert(demoTaskManifest.capability_templates?.length === 10, 'Demo task manifest must expose optional capability templates separately');
assert(demoCapabilityTemplateManifest.mode === 'optional_llm_capability_templates', 'Capability template manifest must mark templates as optional');
assert(demoCapabilityTemplateManifest.templates?.every(template => template.required_for_final === false), 'Capability templates must not be final-readiness gates');
assert(!existsSync(join(demo, '.analysis', 'llm_tasks', '01-core-assessment.md')), 'Generic capability templates must not be generated as required llm_tasks');
assert(existsSync(join(demo, '.analysis', 'capability_templates', '01-core-assessment.md')), 'Generic capability templates must live under capability_templates');
assert(readFileSync(join(root, 'src', 'tasks.ts'), 'utf8').includes('schemaForTask(task.id)'), 'Task schema selection must use explicit task ids');
assert(!readFileSync(join(root, 'src', 'tasks.ts'), 'utf8').includes('schemaForTitle'), 'Task schema selection must not depend on title string matching');
assert(!readFileSync(join(root, 'src', 'tasks.ts'), 'utf8').includes('title.includes'), 'Task routing must not use title.includes string matching');
assert(packageJson.name === 'cognianalysis', 'Package name must be cognianalysis');
assert(packageJson.bin?.cognianalysis === 'dist/cli.js', 'Package must expose the cognianalysis CLI');
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
assert(demoSkillCatalog?.semantic_authority === 'llm', 'Demo analysis skill catalog must give semantic authority to the LLM');
assert(demoSkillCatalog?.deterministic_authority === 'catalog_presence_and_shape_only', 'Demo analysis skill catalog deterministic authority must be shape-only');
assert(demoSkillCatalog?.skills?.some(skill => skill.id === 'whole_repository_understanding'), 'Demo analysis skill catalog must include whole-repository understanding');
assert(demoSkillCatalog?.skills?.some(skill => skill.id === 'final_report_authoring'), 'Demo analysis skill catalog must include final report authoring');
assert(demoPipeline?.pipeline_kind === 'llm_driven_overview_detail_final_report', 'Demo must write analysis-pipeline.json');
assert(demoPipeline.stages?.some(stage => stage.id === 'llm_final_analysis_document' && stage.semantic_authority === true), 'Demo pipeline final report stage must be LLM-authoritative');
assert(demoPipeline.stages?.some(stage => stage.id === 'deterministic_finalization_and_rendering' && stage.semantic_authority === false), 'Demo pipeline finalization stage must be deterministic contract only');
assert(bundle.analysis_document_quality_review?.complete === true, `Demo LLM report quality review incomplete: ${(bundle.analysis_document_quality_review?.missing || []).join(', ')}`);
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
assert(finalReportTask.includes('required_output_shape.management_drilldown'), 'Generated final-report task must require management-drilldown goal refs');
assert(instructions.includes('tool-positioning-references.json'), 'Generated tasks must point the LLM to the tool-positioning reference artifact');
assert(demoGoalContract?.contract_kind === 'analysis_goal_context', 'Demo must write analysis-goal-contract.json as goal context');
assert(demoGoalContract?.deterministic_authority === 'goal_context_only', 'Demo goal contract must be deterministic context only');
assert(demoGoalContract?.semantic_verdict_authority === 'llm', 'Demo goal contract must give semantic verdict authority to the LLM');
assert(demoGoalContract?.required_levels?.length === 4, 'Demo goal contract must preserve the four requested analysis levels');
assert(demoGoalContract?.required_output_shape?.management_drilldown, 'Demo goal contract must preserve the management/business drilldown output shape');
assert(demoGoalContract?.llm_trace_guidance?.includes('required_output_shape.<key>'), 'Demo goal contract must tell the LLM to trace required output shape refs');
assert(bundle.analysis_goal_contract?.contract_kind === 'analysis_goal_context', 'Demo bundle must expose the analysis goal contract');
assert(bundle.semantic_authority?.non_authoritative_goal_context_artifacts?.includes('analysis-goal-contract.json'), 'Semantic authority must list the goal contract as non-authoritative context');
assert(demoToolPositioningReferences?.reference_kind === 'external_tool_positioning_context', 'Demo must write tool-positioning-references.json');
assert(demoToolPositioningReferences?.semantic_authority === false, 'Tool positioning references must not be semantic authority');
assert(demoToolPositioningReferences?.deterministic_authority === 'reference_context_only', 'Tool positioning references must remain reference context only');
assert(demoToolPositioningReferences?.llm_positioning_rubric?.semantic_authority === 'llm', 'Tool positioning rubric must give repository-specific positioning authority to the LLM');
assert(demoToolPositioningReferences?.llm_positioning_rubric?.required_judgment_dimensions?.includes('what_this_analysis_can_replace'), 'Tool positioning rubric must require replace/complement/handoff judgment dimensions');
assert(demoToolPositioningReferences?.references?.some(item => item.examples?.includes('Accenture GenWizard')), 'Tool positioning references must include Accenture GenWizard context');
assert(demoToolPositioningReferences?.references?.every(item => item.semantic_authority !== true && item.public_reference_url && Array.isArray(item.source_support) && item.source_support.length > 0), 'Every tool positioning reference must include official source support without semantic authority');
assert(demoToolPositioningReferences?.references?.some(item => item.examples?.includes('Accenture GenWizard') && item.source_support?.some(source => source.source_url?.includes('accenture.com'))), 'Accenture GenWizard positioning must include official source support');
assert(instructions.includes('Preserve the distinction between official reference facts, repository evidence and LLM-authored judgment'), 'Generated LLM instructions must separate reference facts from repository evidence and LLM judgment');
assert(finalReportTask.includes('what can be replaced, what is only complemented and the handoff boundaries'), 'Final report task must require repo-specific replace/complement/handoff positioning');
assert(bundle.tool_positioning_references?.references?.some(item => item.examples?.includes('CAST Imaging')), 'Bundle must expose official tool-positioning references');
assert(bundle.semantic_authority?.non_authoritative_navigation_artifacts?.includes('tool-positioning-references.json'), 'Semantic authority must list tool-positioning references as non-authoritative context');
assert(bundle.source_inventory_accounting?.contract_kind === 'source_inventory_accounting', 'Demo source accounting contract must use the primary source_inventory_accounting key');
assert(bundle.source_inventory_accounting?.semantic_verdict_authority === 'llm', 'Demo source accounting contract must point semantic verdict authority to the LLM');
assert(bundle.source_inventory_accounting?.accounting_status_meaning?.includes('Deferred files') && bundle.source_inventory_accounting?.accounting_status_meaning?.includes('do not count'), 'Demo source accounting contract must clarify deferred files are not completed analysis');
assert(bundle.source_inventory_accounting?.deterministic_contract_scope?.includes('structured analysis_coverage'), 'Demo source accounting must expose structured analysis_coverage path/reason validation scope');
assert(bundle.source_inventory_accounting?.invalid_coverage_items === 0, 'Demo source accounting must not contain invalid analysis_coverage items');
assert(bundle.source_inventory_accounting?.ignored_out_of_scope_coverage_items === 0, 'Demo source accounting must not contain ignored out-of-scope coverage items');
assert(bundle.source_inventory_accounting?.rules?.some(rule => rule.includes('strings, globs and patterns are invalid')), 'Demo source accounting rules must reject weak coverage entries');
assert(demoSourceTierModel?.model_kind === 'tiered_whole_codebase_analysis', 'Demo must write the tiered whole-codebase analysis model');
assert(demoSourceTierModel?.semantic_authority === 'llm', 'Source tier model must keep semantic authority with the LLM');
assert(bundle.source_tier_coverage?.contract_kind === 'tiered_whole_codebase_file_analysis', 'Demo must expose Tier 1 source-file coverage');
assert(bundle.source_tier_coverage?.complete === true, `Demo Tier 1 file-card coverage incomplete: ${bundle.source_tier_coverage?.tier1_file_cards}/${bundle.source_tier_coverage?.total_files}`);
assert(bundle.source_tier_coverage?.tier1_file_cards === bundle.source_tier_coverage?.total_files, 'Every included demo file must have a Tier 1 file card');
assert(bundle.source_tier_coverage?.missing_tier1_files === 0, 'Demo must not miss Tier 1 file cards');
assert(bundle.source_tier_coverage?.invalid_file_cards === 0, 'Demo Tier 1 file cards must be structurally valid');
assert(bundle.source_tier_backlog?.complete === true, 'Demo bundle must expose complete Tier 1 task backlog');
assert(demoSourceTierBacklog.complete === true, 'Demo must write complete source-tier-backlog.json');
const tierStatusOutput = run(['tier-status', demo, '--limit', '2'], { capture: true }).stdout || '';
assert(tierStatusOutput.includes('Tier 1 execution backlog: complete'), 'tier-status must report complete backlog for demo');
const tierNextOutput = run(['tier-next', demo, '--limit', '1', '--max-chars', '200'], { capture: true }).stdout || '';
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
assert(bundle.semantic_authority?.semantic_decider === 'llm', 'Demo semantic authority must name the LLM as semantic decider');
assert(bundle.semantic_authority?.cli_semantic_quality_judge === false, 'Demo CLI must not be marked as semantic quality judge');
assert(bundle.semantic_authority?.final_verdict_source === 'analysis_document.report_quality_review.verdict', 'Demo final verdict source must be the LLM-authored report quality review');
assert(bundle.semantic_authority?.goal_trace_reference_contract_complete === true, 'Demo semantic authority must expose completed explicit LLM goal-trace references');
assert(bundle.semantic_authority?.llm_authored_artifacts?.analysis_document === true, 'Demo semantic authority must see the LLM-authored analysis document');
assert(bundle.final_llm_readiness?.semantic_verdict_authority === 'llm', 'Demo final readiness must name the LLM as semantic verdict authority');
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
assert(mcpFinalize.final_llm_readiness === 'ready', `MCP finalize must expose ready LLM readiness, got ${mcpFinalize.final_llm_readiness}`);
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
assert(mcpAudit.final_llm_readiness?.state === 'ready', 'MCP audit-report must expose ready final LLM readiness');

const tempRoot = mkdtempSync(join(tmpdir(), 'cognianalysis-demo-no-plan-'));
try {
  const tempDemo = join(tempRoot, 'demo-repo');
  cpSync(demo, tempDemo, { recursive: true });
  const planPath = join(tempDemo, '.analysis', 'llm', 'detail-agent-plan.json');
  assert(existsSync(planPath), 'Positive demo setup did not produce detail-agent-plan.json');
  rmSync(planPath);

  const negative = run(['audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('missing required pre-final LLM detail-agent plan artifact'), 'Missing-plan audit did not fail for the required reason');
  assert(output.includes('final LLM report is not synthesized after completed detail reviews'), 'Missing-plan audit did not block final synthesis readiness');
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

  const positive = run(['audit-report', tempDemo], { capture: true });
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

  const negative = run(['audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('LLM-planned skill workbench execution incomplete'), 'Missing skill-review audit did not fail the LLM-planned skill workbench contract');
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

  const negative = run(['audit-report', tempDemo], { capture: true, expectFailure: true });
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

  const negative = run(['audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('LLM report quality review artifact incomplete'), 'Missing quality-review audit did not fail for the required reason');
  assert(output.includes('final LLM report is not synthesized after completed detail reviews'), 'Missing quality-review audit did not block final synthesis readiness');
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

  const negative = run(['audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('LLM report quality review verdict is not decision_ready: partial'), 'Partial LLM quality verdict did not control final readiness');
  assert(output.includes('final LLM report is not synthesized after completed detail reviews'), 'Partial LLM quality verdict did not block final synthesis readiness');
  const finalizeNegative = run(['finalize', tempDemo], { capture: true, expectFailure: true });
  const finalizeOutput = `${finalizeNegative.stdout || ''}\n${finalizeNegative.stderr || ''}`;
  assert(finalizeOutput.includes('Final LLM readiness: partial'), 'Finalize did not surface partial LLM readiness');
  assert(finalizeOutput.includes('LLM report quality review verdict is not decision_ready: partial'), 'Finalize did not honor the LLM quality verdict');
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

  const negative = run(['audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('LLM report quality review artifact incomplete'), 'Missing partial rationale audit did not fail the LLM report-quality contract');
  assert(output.includes('partial_requirement_rationale'), 'Missing partial rationale audit did not name the missing LLM rationale');
  assert(output.includes('final LLM report is not synthesized after completed detail reviews'), 'Missing partial rationale audit did not block final synthesis readiness');
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

  const negative = run(['audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('LLM requirements trace contract incomplete'), 'Missing requirements trace audit did not fail the LLM trace contract');
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

  const negative = run(['audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('source inventory accounting incomplete'), 'Invalid analysis_coverage entries did not fail source inventory accounting');
  assert(output.includes('invalid coverage items'), 'Invalid analysis_coverage failure did not name invalid coverage items');
  const refreshedBundle = JSON.parse(readFileSync(join(tempDemo, '.analysis', 'data', 'bundle.json'), 'utf8'));
  assert(refreshedBundle.source_inventory_accounting?.invalid_coverage_items >= 3, 'Invalid analysis_coverage entries were not counted in the refreshed bundle');
} finally {
  rmSync(tempRootInvalidCoverage, { recursive: true, force: true });
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

  const negative = run(['audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('source-family detail review coverage missing_detail_review_decision'), 'Missing detail-review decision audit did not fail the LLM planning contract');
  assert(output.includes('final LLM report is not synthesized after completed detail reviews'), 'Unexpected detail review audit did not block final synthesis readiness');
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

  const negative = run(['audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('source-family detail review coverage unexpected_detail_reviews'), 'Unexpected detail review audit did not fail the LLM-planned detail review contract');
  assert(output.includes('final LLM report is not synthesized after completed detail reviews'), 'Unexpected detail review audit did not block final synthesis readiness');
} finally {
  rmSync(tempRootUnexpectedDetailReview, { recursive: true, force: true });
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

  const negative = run(['audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('LLM goal trace reference contract incomplete'), 'Missing goal refs audit did not fail the explicit LLM goal trace contract');
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

  const negative = run(['audit-report', tempDemo], { capture: true, expectFailure: true });
  const output = `${negative.stdout || ''}\n${negative.stderr || ''}`;
  assert(output.includes('analysis document component contract incomplete'), 'Empty LLM report block did not fail the renderer component contract');
  assert(output.includes('block_render_content_contract'), 'Empty LLM report block failure did not name the render-content contract');
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
  run(['finalize', tempDemo]);
  run(['audit-report', tempDemo]);
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
  run(['finalize', tempDemo]);
  run(['audit-report', tempDemo]);
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
  run(['finalize', tempDemo]);
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
  run(['aggregate', tempDemo]);
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

  const positive = run(['audit-report', tempDemo], { capture: true });
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

  const positive = run(['audit-report', tempDemo], { capture: true });
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
  writeFileSync(join(tempRepo, 'services', 'api', 'pom.xml'), '<project></project>\n');
  writeFileSync(join(tempRepo, 'services', 'api', 'src', 'main', 'java', 'Api.java'), 'class Api {}\n');
  writeFileSync(join(tempRepo, 'web', 'package.json'), '{"scripts":{"test":"echo ok"}}\n');
  writeFileSync(join(tempRepo, 'web', 'src', 'App.ts'), 'export const app = () => "ok";\n');
  writeFileSync(join(tempRepo, 'tools', '.venvs', 'ignored-env', 'generated.py'), 'print("not source inventory")\n');
  const mcpPrepare = callMcpTool('prepare', { repo: tempRepo });
  assert(mcpPrepare.staged_llm_workflow?.includes('00-analysis-strategy.md'), 'MCP prepare must expose the LLM analysis strategy step');
  assert(mcpPrepare.staged_llm_workflow?.includes('skill_workbench_tasks'), 'MCP prepare must expose the LLM-planned skill workbench materialization step');
  assert(mcpPrepare.staged_llm_workflow?.includes('capability_templates'), 'MCP prepare must describe optional capability templates');
  assert(mcpPrepare.staged_llm_workflow?.includes('11-detail-agent-plan.md'), 'MCP prepare must expose the staged detail-agent plan step');
  assert(mcpPrepare.staged_llm_workflow?.includes('12-analysis-document.md'), 'MCP prepare must expose final report authoring after detail reviews');
  const analyzePending = run(['analyze', tempRepo, '--no-seed', '--no-html'], { capture: true });
  const analyzePendingOutput = `${analyzePending.stdout || ''}\n${analyzePending.stderr || ''}`;
  assert(analyzePendingOutput.includes('00-analysis-strategy.md'), 'Analyze pending output must describe the LLM analysis strategy step');
  assert(analyzePendingOutput.includes('skill_workbench_tasks'), 'Analyze pending output must describe LLM-planned skill workbench materialization');
  assert(analyzePendingOutput.includes('capability_templates'), 'Analyze pending output must describe optional capability templates');
  assert(analyzePendingOutput.includes('11-detail-agent-plan.md'), 'Analyze pending output must describe the staged LLM detail-agent plan step');
  assert(analyzePendingOutput.includes('12-analysis-document.md'), 'Analyze pending output must describe final report authoring after detail reviews');
  assert(analyzePendingOutput.includes('--allow-partial'), 'Analyze pending output must describe the partial finalize step that materializes detail tasks');
  assert(!analyzePendingOutput.includes('execute .analysis/llm_tasks/*.md, write .analysis/llm/*.json'), 'Analyze pending output must not describe the old flat task workflow');
  const preparePending = run(['prepare', tempRepo, '--no-seed'], { capture: true });
  const preparePendingOutput = `${preparePending.stdout || ''}\n${preparePending.stderr || ''}`;
  assert(preparePendingOutput.includes('00-analysis-strategy.md'), 'Prepare output must describe the LLM analysis strategy step');
  assert(preparePendingOutput.includes('skill_workbench_tasks'), 'Prepare output must describe LLM-planned skill workbench materialization');
  assert(preparePendingOutput.includes('capability_templates'), 'Prepare output must describe optional capability templates');
  assert(preparePendingOutput.includes('11-detail-agent-plan.md'), 'Prepare output must describe the staged LLM detail-agent plan step');
  assert(preparePendingOutput.includes('12-analysis-document.md'), 'Prepare output must describe final report authoring after detail reviews');
  assert(!preparePendingOutput.includes('execute .analysis/llm_tasks/*.md, write .analysis/llm/*.json'), 'Prepare output must not describe the old flat task workflow');
  run(['aggregate', tempRepo]);
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

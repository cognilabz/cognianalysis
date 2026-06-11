import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readProjectFile(path) {
  return readFileSync(join(root, path), 'utf8');
}

function runtimeSourceFiles(dir) {
  return readdirSync(dir)
    .flatMap(name => {
      const full = join(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) return runtimeSourceFiles(full);
      if ((full.endsWith('.ts') && !full.endsWith('.d.ts')) || full.endsWith('.js')) return [full];
      return [];
    });
}

function requireSnippets(file, snippets) {
  const source = readProjectFile(file);
  for (const snippet of snippets) {
    assert(source.includes(snippet), `${file} must include LLM-boundary invariant: ${snippet}`);
  }
}

const runtimeRoots = ['src', 'dist']
  .map(name => join(root, name))
  .filter(existsSync);
const runtimeSources = runtimeRoots
  .flatMap(runtimeSourceFiles)
  .map(file => [relative(root, file), readFileSync(file, 'utf8')]);

assert(runtimeSources.length > 0, 'No runtime source files found for LLM-boundary verification');

const forbiddenRuntimeSnippets = [
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

const forbiddenRuntimeSourceLayouts = [
  ['src', 'main', 'java'],
  ['src', 'test', 'java'],
  ['src', 'main', 'kotlin'],
  ['src', 'test', 'kotlin'],
  ['src', 'main', 'scala'],
  ['src', 'test', 'scala']
].map(parts => parts.join('/'));

const forbiddenDirectLlmApiSnippets = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_API_KEY',
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  '@anthropic-ai/sdk',
  '@google/generative-ai',
  '@ai-sdk/openai',
  'langchain/openai',
  'chat.completions.create',
  'responses.create',
  'models.generateContent',
  'new OpenAI',
  "from 'openai'",
  'from "openai"',
  "require('openai')",
  'require("openai")',
  'tier-run-openai'
];

const forbiddenLlmExecutionStateSnippets = [
  'llm_unavailable',
  'llm_failed',
  'provider_unavailable',
  'provider_availability_state',
  'execution_failure_state',
  'provider_credentials_required',
  'providerAvailable',
  'provider_available',
  'credential-blocked',
  'judge-unavailable',
  'direct_llm_runner',
  'directLlmRunner'
];

for (const [file, source] of runtimeSources) {
  for (const snippet of forbiddenRuntimeSnippets) {
    assert(!source.includes(snippet), `${file} must not reintroduce deterministic semantic/report shortcut: ${snippet}`);
  }
  for (const layout of forbiddenRuntimeSourceLayouts) {
    assert(!source.includes(layout), `${file} must not hardcode source layout path: ${layout}`);
  }
  const lowerSource = source.toLowerCase();
  for (const snippet of forbiddenDirectLlmApiSnippets) {
    assert(!lowerSource.includes(snippet.toLowerCase()), `${file} must not call or configure a direct LLM API/provider path: ${snippet}`);
  }
  for (const snippet of forbiddenLlmExecutionStateSnippets) {
    assert(!source.includes(snippet), `${file} must not model Codex LLM execution as an external service state: ${snippet}`);
  }
}

const forbiddenDirectLlmPackageDeps = [
  'openai',
  '@anthropic-ai/sdk',
  '@google/generative-ai',
  '@ai-sdk/openai',
  '@langchain/openai',
  'langchain'
];
const packageJson = JSON.parse(readProjectFile('package.json'));
for (const block of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
  const deps = packageJson[block] || {};
  for (const dep of Object.keys(deps)) {
    assert(!forbiddenDirectLlmPackageDeps.includes(dep), `package.json must not depend on a direct LLM API/provider SDK: ${block}.${dep}`);
  }
}

requireSnippets('src/repoMap.ts', [
  "return 'source-inventory'",
  "semantic_authority: false",
  "deterministic_parsing_disabled: true",
  "deterministic_import_parsing: false",
  "deterministic_symbol_parsing: false",
  "deterministic_framework_detection: false",
  "deterministic_build_tool_detection: false",
  "deterministic_contract_detection: false",
  "Inventory-only ranking for LLM attention"
]);

requireSnippets('src/analysisPipeline.ts', [
  "pipeline_kind: 'llm_driven_overview_detail_final_report'",
  "semantic_authority: 'codex_llm'",
  "deterministic_authority: 'artifact_contracts_only'",
  "execution_surface: 'current_codex_session'",
  "direct_llm_api_allowed: false",
  "external_service_state_tracked: false",
  "Semantic readiness is decided by analysis_document.report_quality_review.verdict, not by deterministic keyword or menu checks.",
  "semantic_verdict_authority: 'codex_llm'",
  "deterministic_contract_scope: 'stage order, artifact presence and authority boundaries only'"
]);

requireSnippets('src/targetCoverage.ts', [
  "semantic_verdict_authority: 'codex_llm'",
  "deterministic_contract_scope: 'target capability registration and expected-output hints only; no output-key presence scoring, semantic matching, quality scoring or readiness judgment'",
  "output_status: 'not_scored'",
  "deterministic_presence_scored: false"
]);

requireSnippets('src/tasks.ts', [
  "mode: 'deterministic_inventory_only'",
  "semantic_authority: false",
  "The legacy filename source-family-inventory.json is kept for workflow compatibility. Its contents are mechanical navigation partitions, not semantic source families.",
  "The legacy filename does not mean the CLI has authored semantic source families",
  "Do not use word matches, regex matches or filename matches as proof of behavior. Open the source and reason semantically."
]);

requireSnippets('src/sourceTiers.ts', [
  'Do not call an external LLM API',
  'Tier 1 has no external service state',
  "execution_surface: 'current_codex_session'",
  "direct_llm_api_allowed: false",
  "external_service_state_tracked: false",
  'The Codex LLM step is not an external service state.',
  'Codex is executing the LLM work directly; this is not an API call.',
  'Thin or truncated evidence must be represented as uncertainty.'
]);

requireSnippets('src/aggregate.ts', [
  "semantic_verdict_authority: 'codex_llm'",
  "execution_surface: 'current_codex_session'",
  "direct_llm_api_allowed: false",
  "external_service_state_tracked: false",
  "This is not a deterministic checklist of original requirements and not a judgment that the repository is fully understood.",
  "Counts are authored LLM trace statuses. They are reported for transparency, not computed semantic truth."
]);

requireSnippets('src/readiness.ts', [
  "semantic_verdict_authority: 'codex_llm'",
  "execution_surface: 'current_codex_session'",
  "direct_llm_api_allowed: false",
  "external_service_state_tracked: false",
  "partial_state_meaning: 'artifact/readiness contract is incomplete; Codex execution is in-session'"
]);

requireSnippets('README.md', [
  'The TypeScript/Node CLI prepares repository context',
  'The generated bundle includes a `semantic_authority` audit section',
  'it does not infer semantic quality from keywords, menus, classes, functions or component presence.',
  'That bridge exposes deterministic prepare/finalize/audit/report tooling. It still does not replace the LLM extraction step.'
]);

console.log(`verify-llm-boundary: passed (${runtimeSources.length} runtime files checked)`);

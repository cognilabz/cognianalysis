"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOURCE_TIER_MODEL_VERSION = void 0;
exports.sourceTierModelArtifact = sourceTierModelArtifact;
exports.writeSourceTierTasks = writeSourceTierTasks;
exports.writeSourceTierContext = writeSourceTierContext;
exports.sourceTierTaskFiles = sourceTierTaskFiles;
exports.sourceTierBacklogArtifact = sourceTierBacklogArtifact;
exports.writeNextSourceTierContexts = writeNextSourceTierContexts;
const utils_1 = require("./utils");
exports.SOURCE_TIER_MODEL_VERSION = 'source-tier-v1';
const DEFAULT_TIER_BATCH_SIZE = 80;
function sourceTierModelArtifact() {
    return {
        model_kind: 'tiered_whole_codebase_analysis',
        version: exports.SOURCE_TIER_MODEL_VERSION,
        semantic_authority: 'llm',
        deterministic_authority: 'task_materialization_and_path_contract_only',
        purpose: 'Make whole-codebase understanding explicit. Every included file receives at least a Tier 1 LLM-authored file card before final synthesis; selected areas then receive deeper Tier 2-4 reviews.',
        tiers: [
            {
                id: 'tier0_inventory',
                depth: 0,
                owner: 'cli',
                meaning: 'Deterministic inventory only: path, size, language/format and navigation partition. This is never semantic understanding.'
            },
            {
                id: 'tier1_file_card',
                depth: 1,
                owner: 'llm',
                required_for_every_included_file: true,
                meaning: 'A short LLM-authored per-file understanding card: purpose, technical role, business relevance or none/unknown, relationships visible from the file, confidence and evidence.'
            },
            {
                id: 'tier2_module_or_source_family',
                depth: 2,
                owner: 'llm',
                meaning: 'Module/source-family synthesis built from Tier 1 cards and direct source inspection: responsibilities, internal relationships, technical drilldown and uncertainty.'
            },
            {
                id: 'tier3_behavior_contract_flow',
                depth: 3,
                owner: 'llm',
                meaning: 'Deep behavior review for important flows, interfaces, contracts, state changes, examples, failure paths and side effects.'
            },
            {
                id: 'tier4_decision_transformation',
                depth: 4,
                owner: 'llm',
                meaning: 'Decision-level findings, risks, process improvements, refactoring and target-architecture options.'
            }
        ],
        completion_rule: 'Final readiness requires Tier 1 file-card coverage for every included source-inventory file. Deferred files are not completed analysis; they remain gaps until a Tier 1 card exists.',
        llm_rules: [
            'Do not summarize files from path names alone.',
            'Open each listed file or use an already-opened exact source excerpt before authoring its Tier 1 card.',
            'Use unknown/none when business relevance cannot be proven.',
            'Keep evidence exact with file:line references.',
            'Use Tier 1 to prevent blind spots; use Tier 2-4 to explain interactions and decision implications.'
        ]
    };
}
function writeSourceTierTasks(analysisDir, codeMap, batchSize = DEFAULT_TIER_BATCH_SIZE) {
    const tasksDir = utils_1.Path.join(analysisDir, 'source_tier_tasks');
    const outputDir = utils_1.Path.join(analysisDir, 'source_tiers');
    const dataDir = utils_1.Path.join(analysisDir, 'data');
    (0, utils_1.ensureDir)(tasksDir);
    (0, utils_1.ensureDir)(outputDir);
    (0, utils_1.ensureDir)(dataDir);
    for (const file of utils_1.FS.readdirSync(tasksDir).filter((name) => name.endsWith('.md'))) {
        utils_1.FS.unlinkSync(utils_1.Path.join(tasksDir, file));
    }
    const files = (0, utils_1.asList)(codeMap.files);
    const tasks = [];
    for (let start = 0, index = 1; start < files.length; start += batchSize, index += 1) {
        const batch = files.slice(start, start + batchSize).map((file) => ({
            path: file.path,
            module: file.module,
            language: file.language,
            lines: file.lines,
            bytes: file.bytes,
            navigation_tags: file.navigation_tags || file.roles || []
        }));
        const id = `source-tier-${String(index).padStart(4, '0')}`;
        const filename = `${id}.md`;
        const output = `source_tiers/${id}.json`;
        (0, utils_1.writeText)(utils_1.Path.join(tasksDir, filename), sourceTierTaskBody(id, output, batch));
        tasks.push({
            id,
            task_file: `source_tier_tasks/${filename}`,
            expected_output: output,
            file_count: batch.length,
            file_paths: batch.map((file) => file.path).filter(Boolean),
            first_path: batch[0]?.path || '',
            last_path: batch[batch.length - 1]?.path || '',
            status: 'pending'
        });
    }
    const manifest = {
        mode: 'llm_authored_tier1_file_cards',
        model: sourceTierModelArtifact(),
        batch_size: batchSize,
        total_files: files.length,
        task_count: tasks.length,
        summary: 'Execute every source_tier_tasks/*.md task before final report synthesis. These tasks create Tier 1 LLM-authored file cards for every included source-inventory file.',
        tasks
    };
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'source-tier-model.json'), manifest.model);
    (0, utils_1.writeJson)(utils_1.Path.join(analysisDir, 'source-tier-task-manifest.json'), manifest);
    (0, utils_1.writeJson)(utils_1.Path.join(dataDir, 'source-tier-task-manifest.json'), manifest);
    return manifest;
}
function writeSourceTierContext(repo, analysisDir, taskId, maxCharsPerFile = 6000) {
    const manifest = JSON.parse(utils_1.FS.readFileSync(utils_1.Path.join(analysisDir, 'source-tier-task-manifest.json'), 'utf8'));
    const task = (0, utils_1.asList)(manifest.tasks).find((item) => String(item?.id || '') === taskId);
    if (!task)
        throw new Error(`Unknown source tier task: ${taskId}`);
    const batchFiles = sourceTierTaskFiles(analysisDir, task);
    const files = batchFiles.map((item) => {
        const relativePath = String(item.path || '');
        const full = utils_1.Path.join(repo, relativePath);
        const excerpt = (0, utils_1.readText)(full, maxCharsPerFile);
        return {
            ...item,
            source_excerpt: excerpt,
            source_excerpt_truncated: excerpt.length >= maxCharsPerFile
        };
    });
    const context = {
        context_kind: 'source_tier_batch_context',
        semantic_authority: false,
        deterministic_authority: 'exact source excerpt packaging only',
        task_id: taskId,
        task_file: task.task_file,
        expected_output: task.expected_output,
        file_count: files.length,
        max_chars_per_file: maxCharsPerFile,
        instruction: 'Use these exact source excerpts only as input context. The LLM must author Tier 1 file cards and preserve uncertainty; this artifact does not classify or summarize behavior.',
        files
    };
    const out = utils_1.Path.join(analysisDir, 'source_tier_contexts', `${taskId}.json`);
    (0, utils_1.writeJson)(out, context);
    return { ...context, output_path: out, files: files.map((file) => ({ path: file.path, excerpt_chars: String(file.source_excerpt || '').length, truncated: file.source_excerpt_truncated })) };
}
function sourceTierTaskFiles(analysisDir, task) {
    const embedded = (0, utils_1.asList)(task?.files || task?.file_paths).map((item) => {
        if (typeof item === 'string')
            return { path: item };
        return item;
    }).filter((item) => item?.path);
    if (embedded.length)
        return embedded;
    const taskFile = utils_1.Path.join(analysisDir, String(task?.task_file || ''));
    const taskText = utils_1.FS.readFileSync(taskFile, 'utf8');
    const match = taskText.match(/## Files For This Batch\s*```json\s*([\s\S]*?)\s*```/);
    if (!match)
        throw new Error(`Could not parse files from ${task?.task_file || taskFile}`);
    return JSON.parse(match[1]);
}
function sourceTierOutputStatus(analysisDir, task, batchFiles) {
    const expectedOutput = String(task?.expected_output || '');
    const full = utils_1.Path.join(analysisDir, expectedOutput);
    const batchPaths = batchFiles.map((file) => String(file?.path || '')).filter(Boolean);
    const batchPathSet = new Set(batchPaths);
    const base = {
        id: String(task?.id || ''),
        task_file: String(task?.task_file || ''),
        expected_output: expectedOutput,
        file_count: batchPaths.length || Number(task?.file_count || 0),
        first_path: batchPaths[0] || String(task?.first_path || ''),
        last_path: batchPaths[batchPaths.length - 1] || String(task?.last_path || ''),
        output_exists: utils_1.FS.existsSync(full),
        valid_json: false,
        review_status: 'missing',
        card_count: 0,
        missing_file_count: batchPaths.length || Number(task?.file_count || 0),
        missing_file_examples: batchPaths.slice(0, 10),
        extra_file_count: 0,
        duplicate_file_count: 0,
        error: ''
    };
    if (!base.output_exists)
        return { ...base, status: 'missing' };
    const parsed = (0, utils_1.loadJson)(full, null);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        return { ...base, status: 'invalid_json', error: 'output is not a JSON object' };
    const review = parsed.source_file_tier_review || parsed;
    const cards = (0, utils_1.asList)(review?.files);
    const seen = new Set();
    const duplicatePaths = new Set();
    const extraPaths = [];
    const invalidCards = [];
    for (const card of cards) {
        const path = String(card?.path || '').trim();
        if (!path) {
            invalidCards.push({ reason: 'file card missing path' });
            continue;
        }
        if (seen.has(path))
            duplicatePaths.add(path);
        seen.add(path);
        if (!batchPathSet.has(path))
            extraPaths.push(path);
        if (card?.tier !== 'tier1_file_card')
            invalidCards.push({ path, reason: 'file card tier must be tier1_file_card' });
        if (Number(card?.analysis_depth || 0) < 1)
            invalidCards.push({ path, reason: 'file card analysis_depth must be at least 1' });
        if (!String(card?.summary || '').trim())
            invalidCards.push({ path, reason: 'file card missing summary' });
        if (!String(card?.technical_role || '').trim())
            invalidCards.push({ path, reason: 'file card missing technical_role' });
        if (!(0, utils_1.asList)(card?.evidence).length)
            invalidCards.push({ path, reason: 'file card missing evidence' });
    }
    const missing = batchPaths.filter(path => !seen.has(path));
    const reviewStatus = String(review?.review_status || '').toLowerCase() || 'unknown';
    const complete = reviewStatus === 'complete' && missing.length === 0 && extraPaths.length === 0 && duplicatePaths.size === 0 && invalidCards.length === 0;
    return {
        ...base,
        valid_json: true,
        review_status: reviewStatus,
        card_count: cards.length,
        missing_file_count: missing.length,
        missing_file_examples: missing.slice(0, 10),
        extra_file_count: extraPaths.length,
        extra_file_examples: extraPaths.slice(0, 10),
        duplicate_file_count: duplicatePaths.size,
        duplicate_file_examples: [...duplicatePaths].slice(0, 10),
        invalid_file_card_count: invalidCards.length,
        invalid_file_card_examples: invalidCards.slice(0, 10),
        status: complete ? 'complete' : reviewStatus === 'blocked' ? 'blocked' : 'partial'
    };
}
function sourceTierBacklogArtifact(analysisDir) {
    const manifest = (0, utils_1.loadJson)(utils_1.Path.join(analysisDir, 'source-tier-task-manifest.json'), { tasks: [] });
    const tasks = (0, utils_1.asList)(manifest.tasks);
    const rows = tasks.map((task) => {
        try {
            return sourceTierOutputStatus(analysisDir, task, sourceTierTaskFiles(analysisDir, task));
        }
        catch (err) {
            return {
                id: String(task?.id || ''),
                task_file: String(task?.task_file || ''),
                expected_output: String(task?.expected_output || ''),
                file_count: Number(task?.file_count || 0),
                first_path: String(task?.first_path || ''),
                last_path: String(task?.last_path || ''),
                output_exists: false,
                valid_json: false,
                review_status: 'invalid_task',
                card_count: 0,
                missing_file_count: Number(task?.file_count || 0),
                extra_file_count: 0,
                duplicate_file_count: 0,
                status: 'invalid_task',
                error: err?.message || String(err)
            };
        }
    });
    const incomplete = rows.filter((row) => row.status !== 'complete');
    const missing = rows.filter((row) => row.status === 'missing');
    const partial = rows.filter((row) => row.status === 'partial');
    const invalid = rows.filter((row) => row.status === 'invalid_json' || row.status === 'invalid_task');
    const blocked = rows.filter((row) => row.status === 'blocked');
    const invalidCardTasks = rows.filter((row) => Number(row.invalid_file_card_count || 0) > 0);
    const totalFiles = rows.reduce((sum, row) => sum + Number(row.file_count || 0), 0);
    const cardCount = rows.reduce((sum, row) => sum + Number(row.card_count || 0), 0);
    return {
        contract_kind: 'source_tier_execution_backlog',
        semantic_authority: 'llm',
        deterministic_authority: 'task/output reconciliation only',
        total_tasks: rows.length,
        complete_tasks: rows.length - incomplete.length,
        incomplete_tasks: incomplete.length,
        missing_tasks: missing.length,
        partial_tasks: partial.length,
        invalid_tasks: invalid.length,
        invalid_file_card_tasks: invalidCardTasks.length,
        blocked_tasks: blocked.length,
        total_task_files: totalFiles,
        authored_file_cards_in_task_outputs: cardCount,
        complete: incomplete.length === 0 && rows.length > 0,
        next_tasks: incomplete.slice(0, 50),
        rows,
        summary: incomplete.length
            ? `${incomplete.length}/${rows.length} Tier 1 task outputs still need LLM-authored file cards.`
            : 'All Tier 1 task outputs are present and complete.'
    };
}
function writeNextSourceTierContexts(repo, analysisDir, limit = 1, maxCharsPerFile = 6000) {
    const backlog = sourceTierBacklogArtifact(analysisDir);
    const selected = (0, utils_1.asList)(backlog.rows).filter((row) => row.status !== 'complete').slice(0, Math.max(1, limit));
    const contexts = selected.map((row) => writeSourceTierContext(repo, analysisDir, row.id, maxCharsPerFile));
    const workpackPath = utils_1.Path.join(analysisDir, 'source-tier-next.md');
    const plan = {
        plan_kind: 'next_source_tier_contexts',
        semantic_authority: 'llm',
        deterministic_authority: 'select incomplete task outputs, package exact source excerpts and write Codex workpack only',
        analysis_dir: analysisDir,
        selected_count: contexts.length,
        remaining_incomplete_tasks: Math.max(0, backlog.incomplete_tasks - contexts.length),
        codex_workpack: contexts.length ? workpackPath : '',
        contexts: contexts.map((context) => ({
            task_id: context.task_id,
            task_file: context.task_file,
            expected_output: context.expected_output,
            output_path: context.output_path,
            file_count: context.file_count,
            max_chars_per_file: context.max_chars_per_file
        }))
    };
    if (contexts.length) {
        (0, utils_1.writeJson)(utils_1.Path.join(analysisDir, 'source-tier-next.json'), plan);
        (0, utils_1.writeText)(workpackPath, sourceTierCodexWorkpack(plan));
    }
    else {
        for (const stale of [utils_1.Path.join(analysisDir, 'source-tier-next.json'), workpackPath]) {
            if (utils_1.FS.existsSync(stale))
                utils_1.FS.unlinkSync(stale);
        }
    }
    return plan;
}
function sourceTierCodexWorkpack(plan) {
    const rows = (0, utils_1.asList)(plan.contexts).map((context) => `- Task \`${context.task_id}\`
  - Read context: \`${context.output_path}\`
  - Write output: \`.analysis/${context.expected_output}\`
  - Original task: \`.analysis/${context.task_file}\`
  - Files: ${context.file_count}
`).join('\n');
    return `# Codex Tier 1 Workpack

You are Codex, and Codex itself is the LLM executor for this Cognianalysis Tier 1 workpack.

Do not call an external LLM API. Do not generate deterministic summaries from filenames, paths, extensions, regexes or navigation tags. Read each listed \`.analysis/source_tier_contexts/*.json\` file, use the exact source excerpts inside it, and author the requested \`.analysis/source_tiers/*.json\` output yourself.

## Rules

- Every file in each context's \`files[]\` array must receive exactly one \`tier1_file_card\`.
- Use \`unknown\` or \`none\` when business relevance or relationships are not proven from the excerpt.
- Do not use \`analysis_coverage.deferred_files\` for Tier 1. Deferred files are incomplete.
- Keep evidence references exact and point them to the same file as the card.
- If an excerpt is truncated or insufficient, preserve uncertainty in the card instead of inventing behavior.
- After writing the outputs, run \`cognianalysis tier-status .\` and \`cognianalysis audit-report .\`.

## Work Items

${rows || '- No incomplete Tier 1 work items were selected.'}
`;
}
function sourceTierTaskBody(id, output, files) {
    return `# Tier 1 Whole-Codebase File Cards · ${id}

You are a Cognianalysis Tier 1 source-file analyst.

This task exists because whole-repository documentation is not complete when most files are only deferred. Your job is to author a shallow but real file card for every listed file. This is not the E2E flow review yet; it is the broad base that later technical drilldown and detail agents use.

## Read First

- \`.analysis/llm_instructions.md\`
- \`.analysis/data/source-inventory.json\`
- \`.analysis/data/source-tier-model.json\`
- the exact source files listed below

## Rules

- Open each listed file, or use an already-opened exact source excerpt, before writing its card.
- Do not infer meaning only from file name, path, extension, framework words, regex matches or navigation tags.
- Keep the card short. Use \`unknown\` or \`none\` where business meaning is not proven.
- Every file listed below must appear exactly once in \`source_file_tier_review.files[]\`.
- Every card needs at least one exact evidence reference to the same file.
- Do not use \`analysis_coverage.deferred_files\` as a substitute for a file card.

## Files For This Batch

\`\`\`json
${JSON.stringify(files, null, 2)}
\`\`\`

## Write Output

Write valid JSON to \`.analysis/${output}\`.

Expected shape:

\`\`\`json
{
  "source_file_tier_review": {
    "task_id": "${id}",
    "tier_model_version": "${exports.SOURCE_TIER_MODEL_VERSION}",
    "review_status": "complete, partial or blocked",
    "files": [
      {
        "path": "relative/path/File.ext",
        "tier": "tier1_file_card",
        "analysis_depth": 1,
        "summary": "What this file does in human language.",
        "technical_role": "Repository-specific technical role in free text; use unknown when not proven.",
        "business_relevance": "Short proven business relevance, none, or unknown.",
        "relationships": [
          {"target": "relative/path-or-system", "kind": "Repository-specific relationship kind in free text, or unknown.", "description": "..."}
        ],
        "confidence": "Repository-specific confidence statement.",
        "evidence": [{"path":"relative/path/File.ext", "line":1}]
      }
    ],
    "open_questions": []
  },
  "analysis_coverage": {
    "inspected_files": [
      {"path":"relative/path/File.ext", "reason":"Tier 1 file card authored.", "evidence":[{"path":"relative/path/File.ext", "line":1}]}
    ],
    "deferred_files": [],
    "open_questions": []
  }
}
\`\`\`
`;
}

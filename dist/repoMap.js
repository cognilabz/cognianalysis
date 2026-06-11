"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRepoMap = buildRepoMap;
const utils_1 = require("./utils");
const LANGUAGE_BY_EXT = {
    '.java': 'Java', '.kt': 'Kotlin', '.kts': 'Kotlin', '.scala': 'Scala',
    '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript',
    '.py': 'Python', '.go': 'Go', '.cs': 'C#', '.fs': 'F#', '.vb': 'VB.NET',
    '.rb': 'Ruby', '.php': 'PHP', '.rs': 'Rust', '.swift': 'Swift', '.c': 'C', '.h': 'C/C++', '.cpp': 'C++', '.hpp': 'C++',
    '.sql': 'SQL', '.graphql': 'GraphQL', '.gql': 'GraphQL', '.proto': 'Protocol Buffers',
    '.yaml': 'YAML', '.yml': 'YAML', '.json': 'JSON', '.xml': 'XML', '.wsdl': 'WSDL', '.xsd': 'XSD', '.md': 'Markdown', '.rst': 'reStructuredText',
    '.tf': 'Terraform', '.toml': 'TOML', '.gradle': 'Gradle', '.properties': 'Properties', '.http': 'HTTP Examples'
};
const SOURCE_EXTS = new Set(['.java', '.kt', '.kts', '.scala', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.cs', '.rb', '.php', '.rs', '.swift', '.c', '.h', '.cpp', '.hpp', '.sql']);
const TEXT_EXTS = new Set(['.md', '.rst', '.txt', '.adoc']);
const STRUCTURED_EXTS = new Set(['.yaml', '.yml', '.json', '.xml', '.wsdl', '.xsd', '.graphql', '.gql', '.http', '.proto', '.toml', '.properties', '.tf', '.gradle']);
function moduleKey(relativePath) {
    const parts = relativePath.split('/').filter(Boolean);
    if (!parts.length)
        return '.';
    if (parts.length === 1)
        return parts[0];
    const dirs = parts.slice(0, -1);
    if (!dirs.length)
        return parts[0];
    return dirs.slice(0, Math.min(2, dirs.length)).join('/');
}
function fileFormatTags(relativePath) {
    const ext = utils_1.Path.extname(relativePath).toLowerCase();
    const tags = new Set();
    if (SOURCE_EXTS.has(ext))
        tags.add('source_file');
    if (TEXT_EXTS.has(ext))
        tags.add('text_document');
    if (STRUCTURED_EXTS.has(ext))
        tags.add('structured_file');
    return Array.from(tags).sort();
}
function scoreInventoryFile(tags, lines) {
    let score = 0;
    if (tags.includes('source_file'))
        score += 20;
    if (tags.includes('structured_file'))
        score += 18;
    if (tags.includes('text_document'))
        score += 16;
    if (lines >= 20 && lines <= 900)
        score += 8;
    if (lines > 2000)
        score -= 8;
    return score;
}
function inventoryBuildContext() {
    return { frameworks: [], buildTools: [], packageManagers: [] };
}
function artifactNavigationCandidates(files, limit = 140) {
    return files
        .filter(item => (item.navigation_tags || []).length > 0 || item.lines <= 220)
        .map(item => ({
        path: item.path,
        language: item.language,
        navigation_tags: item.navigation_tags || item.roles,
        roles: item.roles,
        signals: [],
        navigation_score: item.navigation_score,
        score: item.score,
        score_meaning: 'Inventory-only ranking for LLM attention. It is based on file format and size only, not path conventions, manifest filenames, imports, symbols, contract names, framework strings or semantic parsing.',
        lines: item.lines
    }))
        .sort((a, b) => (b.navigation_score || 0) - (a.navigation_score || 0) || a.path.localeCompare(b.path))
        .slice(0, limit);
}
function inventoryRepoType() {
    return 'source-inventory';
}
function buildRepoMap(root, opts = {}) {
    const absRoot = utils_1.Path.resolve(root);
    const maxFileSize = opts.maxFileSize ?? 1250000;
    const capsuleLimit = opts.capsuleLimit ?? 44;
    const capsuleChars = opts.capsuleChars ?? 10000;
    const inventory = (0, utils_1.listFileInventory)(absRoot, maxFileSize);
    const files = inventory.included;
    const languageLoc = {};
    const languageFiles = {};
    const fileItems = [];
    let totalLines = 0;
    for (const file of files) {
        const relativePath = (0, utils_1.rel)(file, absRoot);
        const ext = utils_1.Path.extname(file).toLowerCase();
        const language = LANGUAGE_BY_EXT[ext] || 'Other';
        const lines = (0, utils_1.countLines)(file);
        totalLines += lines;
        if (SOURCE_EXTS.has(ext) || !['Other', 'Markdown', 'JSON', 'YAML', 'XML', 'TOML', 'WSDL', 'XSD'].includes(language)) {
            languageLoc[language] = (languageLoc[language] || 0) + lines;
            languageFiles[language] = (languageFiles[language] || 0) + 1;
        }
        const navigationTags = fileFormatTags(relativePath);
        const navigationScore = scoreInventoryFile(navigationTags, lines);
        const item = {
            path: relativePath,
            language,
            extension: ext,
            lines,
            bytes: utils_1.FS.statSync(file).size,
            module: moduleKey(relativePath),
            navigation_tags: navigationTags,
            roles: navigationTags,
            symbol_count: 0,
            signal_count: 0,
            symbols: [],
            signals: [],
            imports: [],
            navigation_score: navigationScore,
            score: navigationScore
        };
        fileItems.push(item);
    }
    const { frameworks, buildTools, packageManagers } = inventoryBuildContext();
    const rankedFiles = fileItems.sort((a, b) => ((b.navigation_score || b.score) - (a.navigation_score || a.score)) || a.path.localeCompare(b.path));
    const sourceFiles = fileItems.filter(f => SOURCE_EXTS.has(f.extension));
    const artifactCandidates = artifactNavigationCandidates(rankedFiles);
    const moduleMap = {};
    for (const item of fileItems) {
        const mod = moduleMap[item.module] || {
            id: (0, utils_1.cleanId)(item.module),
            name: item.module,
            files: 0,
            source_files: 0,
            lines: 0,
            roles: {},
            languages: {},
            signals: {},
            top_files: [],
            boundary_source: 'path_partition',
            boundary_evidence: []
        };
        mod.files += 1;
        mod.lines += item.lines;
        if (SOURCE_EXTS.has(item.extension))
            mod.source_files += 1;
        mod.languages[item.language] = (mod.languages[item.language] || 0) + item.lines;
        for (const r of (item.navigation_tags || item.roles))
            mod.roles[r] = (mod.roles[r] || 0) + 1;
        mod.top_files.push({ path: item.path, navigation_score: item.navigation_score, score: item.score, navigation_tags: item.navigation_tags || item.roles, roles: item.roles, signals: 0, symbols: 0 });
        moduleMap[item.module] = mod;
    }
    const modules = Object.values(moduleMap).map((m) => ({
        ...m,
        navigation_tags: m.roles,
        navigation_signals: {},
        top_files: m.top_files.sort((a, b) => (b.navigation_score || b.score) - (a.navigation_score || a.score) || a.path.localeCompare(b.path)).slice(0, 10)
    })).sort((a, b) => (b.source_files - a.source_files) || (b.lines - a.lines));
    const capsules = rankedFiles.slice(0, capsuleLimit).map(item => {
        const file = utils_1.Path.join(absRoot, item.path);
        const excerpt = (0, utils_1.readText)(file, capsuleChars);
        return {
            id: `capsule-${(0, utils_1.sha1Short)(item.path, 10)}`,
            path: item.path,
            module: item.module,
            navigation_tags: item.navigation_tags || item.roles,
            roles: item.roles,
            navigation_score: item.navigation_score,
            score: item.score,
            language: item.language,
            lines: item.lines,
            symbols: [],
            signals: [],
            content_excerpt: excerpt,
            truncated: excerpt.length >= capsuleChars
        };
    });
    const profile = {
        repo_name: utils_1.Path.basename(absRoot), root: absRoot, analyzed_at: (0, utils_1.utcNow)(), commit: (0, utils_1.gitCommit)(absRoot), repo_type: inventoryRepoType(),
        languages: sortRecord(languageLoc), language_files: sortRecord(languageFiles), frameworks, build_tools: buildTools, package_managers: packageManagers,
        important_files: [], contract_files: [], example_files: [], test_files: 0, source_files: sourceFiles.length,
        total_files: fileItems.length, total_lines: totalLines, skipped_files: inventory.skipped.length
    };
    return {
        profile,
        modules,
        files: rankedFiles,
        signals: [],
        symbols: [],
        glossary_terms: [],
        capsules,
        artifact_navigation_candidates: artifactCandidates,
        important_docs: artifactCandidates,
        skipped_files: inventory.skipped,
        navigation_policy: {
            semantic_authority: false,
            score_meaning: 'Inventory-only ranking for LLM attention. It uses file format and file size only, not path conventions, manifest filenames or semantic parsing.',
            tag_meaning: 'File-format and inventory tags only; not imports, symbols, frameworks, contracts, examples, entrypoints, tests, quality findings or business facts.',
            artifact_candidate_meaning: 'Candidate files for LLM inspection, selected from inventory metadata only. The LLM must parse and decide whether any file is a contract, example, interface, flow or business artifact.'
        },
        extraction_policy: {
            mode: 'llm_first_inventory_only',
            signals_are_authoritative: false,
            navigation_scores_are_authoritative: false,
            navigation_tags_are_authoritative: false,
            artifact_candidates_are_authoritative: false,
            deterministic_parsing_disabled: true,
            deterministic_import_parsing: false,
            deterministic_symbol_parsing: false,
            deterministic_framework_detection: false,
            deterministic_build_tool_detection: false,
            deterministic_contract_detection: false,
            implementation_language: 'TypeScript',
            description: 'The CLI creates source inventory, file-format metadata, path partitions and raw context capsules only. Codex, as the active in-session LLM, parses imports, symbols, dependencies, frameworks, business logic, contracts, examples, requests, responses and flows from source evidence.'
        }
    };
}
function sortRecord(r) {
    const out = {};
    for (const [k, v] of Object.entries(r).sort((a, b) => b[1] - a[1]))
        out[k] = v;
    return out;
}

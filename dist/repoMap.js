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
const SPEC_EXTS = new Set(['.md', '.rst', '.yaml', '.yml', '.json', '.xml', '.wsdl', '.xsd', '.graphql', '.gql', '.http', '.proto']);
const IMPORTANT_NAMES = new Set([
    'readme.md', 'readme.rst', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle', 'package.json', 'pnpm-lock.yaml', 'yarn.lock', 'package-lock.json',
    'pyproject.toml', 'requirements.txt', 'go.mod', 'cargo.toml', 'dockerfile', 'docker-compose.yml', 'compose.yml', 'helmfile.yaml', 'chart.yaml',
    'openapi.yaml', 'openapi.yml', 'swagger.yaml', 'swagger.yml', 'swagger.json', 'asyncapi.yaml', 'asyncapi.yml', 'postman.json', 'application.yml', 'application.yaml',
    'agENTS.md'.toLowerCase(), 'claude.md'
]);
const SYMBOL_PATTERNS = [
    { type: 'class', re: /\b(?:class|interface|enum|record)\s+([A-Z][A-Za-z0-9_]*)/g },
    { type: 'function', re: /\b(?:function|def|func)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g },
    { type: 'method', re: /\b(?:public|private|protected|static|async|export|final|suspend|override|internal|virtual|sealed|partial|readonly|const|let|var)\s+[A-Za-z0-9_<>,\[\]?:|&\s]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g },
    { type: 'arrow_function', re: /\b(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g },
    { type: 'schema', re: /\b(?:type|interface|input|enum)\s+([A-Z][A-Za-z0-9_]*)\b/g },
    { type: 'xml_element', re: /<(?:xs:|xsd:)?(?:element|complexType|message|operation)\b[^>]*(?:name|id)=["']([^"']+)["']/g }
];
const IMPORT_PATTERNS = [
    /\bimport\s+(?:static\s+)?([a-zA-Z0-9_.*]+(?:\.[a-zA-Z0-9_.*]+)+)\s*;/g,
    /\bfrom\s+['"]([^'"]+)['"]\s+import\b/g,
    /\bimport\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\brequire\(['"]([^'"]+)['"]\)/g,
    /\busing\s+([A-Za-z0-9_.]+)\s*;/g,
    /\bpackage\s+([A-Za-z0-9_.]+)\s*;/g
];
function lineOf(text, index) {
    return text.slice(0, index).split(/\r?\n/).length;
}
function pushSignal(out, root, file, text, type, label, index, confidence = 'hint', extra = {}) {
    out.push({ type, label, path: (0, utils_1.rel)(file, root), line: lineOf(text, index), confidence, ...extra });
}
function detectSignals(file, root, text) {
    const out = [];
    const r = (0, utils_1.rel)(file, root).toLowerCase();
    const ext = utils_1.Path.extname(file).toLowerCase();
    if ((ext === '.yaml' || ext === '.yml' || ext === '.json') && (r.includes('openapi') || r.includes('swagger'))) {
        pushSignal(out, root, file, text, 'api_contract_candidate', 'OpenAPI/Swagger artifact candidate', 0, 'navigation');
    }
    if (ext === '.wsdl' || ext === '.xsd') {
        pushSignal(out, root, file, text, 'soap_contract_candidate', 'SOAP/WSDL/XSD artifact candidate', 0, 'navigation');
    }
    if (ext === '.graphql' || ext === '.gql') {
        pushSignal(out, root, file, text, 'graphql_contract_candidate', 'GraphQL schema artifact candidate', 0, 'navigation');
    }
    if (ext === '.http' || r.includes('postman')) {
        pushSignal(out, root, file, text, 'request_response_example_candidate', 'Request/response example artifact candidate', 0, 'navigation');
    }
    if (ext === '.md' || ext === '.rst') {
        pushSignal(out, root, file, text, 'documentation_candidate', 'Documentation artifact candidate', 0, 'navigation');
    }
    return out.slice(0, 24);
}
function roleTagsFor(relativePath, text) {
    const p = relativePath.toLowerCase();
    const roles = new Set();
    const ext = utils_1.Path.extname(relativePath).toLowerCase();
    const name = utils_1.Path.basename(p);
    if (p.includes('/test/') || p.includes('/tests/') || p.includes('__tests__') || name.endsWith('test' + ext) || name.endsWith('spec' + ext) || name.endsWith('.test' + ext) || name.endsWith('.spec' + ext))
        roles.add('test');
    if (p.startsWith('docs/') || p.includes('/docs/') || ext === '.md' || ext === '.rst')
        roles.add('documentation');
    if (p.includes('openapi') || p.includes('swagger'))
        roles.add('api_contract');
    if (p.includes('soap') || ext === '.wsdl' || ext === '.xsd')
        roles.add('soap_contract');
    if (p.includes('example') || p.includes('sample') || ext === '.http' || p.includes('postman'))
        roles.add('example');
    if (SOURCE_EXTS.has(ext))
        roles.add('source');
    if (['.yaml', '.yml', '.json', '.toml', '.properties', '.env'].includes(ext) || name.includes('config') || name === 'dockerfile' || name.includes('compose'))
        roles.add('config');
    if (p.includes('.github/workflows/') || p.includes('gitlab-ci') || p.includes('jenkinsfile') || p.includes('azure-pipelines') || p.includes('circleci') || p.includes('buildkite'))
        roles.add('ci_cd');
    if (ext === '.tf' || p.includes('terraform') || p.includes('helm') || p.includes('k8s') || p.includes('kubernetes'))
        roles.add('infrastructure');
    if (['package.json', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'pyproject.toml', 'go.mod', 'cargo.toml'].includes(name) || name.endsWith('.csproj'))
        roles.add('build');
    return Array.from(roles).sort();
}
function detectSymbols(file, root, text) {
    const out = [];
    for (const p of SYMBOL_PATTERNS) {
        let m;
        let guard = 0;
        p.re.lastIndex = 0;
        while ((m = p.re.exec(text)) && guard < 90) {
            out.push({ type: p.type, name: m[1], path: (0, utils_1.rel)(file, root), line: lineOf(text, m.index) });
            guard++;
        }
    }
    return out.slice(0, 180);
}
function detectImports(text) {
    const out = [];
    for (const re of IMPORT_PATTERNS) {
        let m;
        let guard = 0;
        re.lastIndex = 0;
        while ((m = re.exec(text)) && guard < 90) {
            const v = String(m[1] || '').trim();
            if (v && !out.includes(v))
                out.push(v);
            guard++;
        }
    }
    return out.slice(0, 80);
}
function moduleKey(relativePath) {
    const parts = relativePath.split('/');
    const prefixes = [
        ['src', 'main', 'java'], ['src', 'main', 'kotlin'], ['src', 'test', 'java'], ['src'], ['app'], ['pages'], ['packages'], ['services'], ['apps'], ['lib'], ['internal'], ['cmd']
    ];
    for (const prefix of prefixes) {
        if (parts.slice(0, prefix.length).join('/') === prefix.join('/') && parts.length > prefix.length) {
            const rest = parts.slice(prefix.length);
            if (prefix.join('/') === 'src/main/java' && rest.length > 3)
                return rest.slice(0, 4).join('/');
            return parts.slice(0, prefix.length + 1).join('/');
        }
    }
    return parts[0] || '.';
}
function scoreFile(relativePath, roles, symbols, signals, lines) {
    const weights = {
        api_contract: 75, soap_contract: 75, example: 65, source: 42,
        documentation: 34, test: 30, config: 18, ci_cd: 14, infrastructure: 14, build: 10
    };
    let score = 0;
    for (const role of roles)
        score += weights[role] || 5;
    score += Math.min(90, signals.length * 9);
    score += Math.min(50, symbols.length * 2);
    const low = relativePath.toLowerCase();
    if (IMPORTANT_NAMES.has(utils_1.Path.basename(low)) || IMPORTANT_NAMES.has(low))
        score += 35;
    if (lines >= 20 && lines <= 900)
        score += 10;
    if (lines > 2000)
        score -= 12;
    return score;
}
function detectBuildContext(root, files) {
    const names = new Set(files.map(f => (0, utils_1.rel)(f, root).toLowerCase()));
    const frameworks = new Set();
    const buildTools = new Set();
    const packageManagers = new Set();
    const has = (n) => names.has(n.toLowerCase()) || Array.from(names).some(x => x.endsWith('/' + n.toLowerCase()));
    if (has('package.json')) {
        buildTools.add('npm scripts');
        packageManagers.add('npm/yarn/pnpm');
        for (const file of files.filter(f => utils_1.Path.basename(f).toLowerCase() === 'package.json').slice(0, 8)) {
            const pkg = (0, utils_1.readText)(file, 200000).toLowerCase();
            if (pkg.includes('react'))
                frameworks.add('React');
            if (pkg.includes('next'))
                frameworks.add('Next.js');
            if (pkg.includes('express'))
                frameworks.add('Express');
            if (pkg.includes('fastify'))
                frameworks.add('Fastify');
            if (pkg.includes('@nestjs'))
                frameworks.add('NestJS');
            if (pkg.includes('angular'))
                frameworks.add('Angular');
            if (pkg.includes('vue'))
                frameworks.add('Vue');
            if (pkg.includes('svelte'))
                frameworks.add('Svelte');
        }
    }
    if (has('pom.xml')) {
        buildTools.add('Maven');
        packageManagers.add('Maven');
    }
    if (Array.from(names).some(n => n.endsWith('build.gradle') || n.endsWith('build.gradle.kts'))) {
        buildTools.add('Gradle');
        packageManagers.add('Gradle');
    }
    if (has('pyproject.toml') || has('requirements.txt')) {
        buildTools.add('Python packaging');
        packageManagers.add('pip/poetry');
    }
    if (has('go.mod')) {
        buildTools.add('Go modules');
        packageManagers.add('go modules');
    }
    if (has('cargo.toml')) {
        buildTools.add('Cargo');
        packageManagers.add('Cargo');
    }
    if (Array.from(names).some(n => n.endsWith('.csproj') || n.endsWith('.sln'))) {
        buildTools.add('.NET');
        packageManagers.add('NuGet');
    }
    return { frameworks: Array.from(frameworks).sort(), buildTools: Array.from(buildTools).sort(), packageManagers: Array.from(packageManagers).sort() };
}
function importantDocCandidates(files, limit = 140) {
    const docs = [];
    for (const item of files) {
        const low = item.path.toLowerCase();
        const roles = new Set(item.roles || []);
        const signalTypes = new Set((item.signals || []).map((s) => s.type));
        const isDoc = roles.has('documentation') || roles.has('api_contract') || roles.has('soap_contract') || roles.has('example') || roles.has('test') || SPEC_EXTS.has(item.extension);
        const isRelevant = ['api_contract_candidate', 'soap_contract_candidate', 'graphql_contract_candidate', 'request_response_example_candidate', 'documentation_candidate'].some(x => signalTypes.has(x));
        if (!isDoc && !isRelevant)
            continue;
        let score = item.score || 0;
        if (roles.has('api_contract'))
            score += 130;
        if (roles.has('soap_contract'))
            score += 130;
        if (roles.has('example'))
            score += 80;
        if (roles.has('documentation'))
            score += 45;
        if (isRelevant)
            score += 35;
        docs.push({ path: item.path, language: item.language, roles: item.roles, signals: item.signals.slice(0, 12), score, lines: item.lines });
    }
    return docs.sort((a, b) => b.score - a.score).slice(0, limit);
}
function inferRepoType(files, frameworks) {
    const roles = {};
    for (const f of files)
        for (const r of f.roles)
            roles[r] = (roles[r] || 0) + 1;
    if ((roles.infrastructure || 0) > 0 && (roles.source || 0) === 0)
        return 'infrastructure';
    if ((roles.documentation || 0) > (roles.source || 0) && (roles.documentation || 0) > 5)
        return 'documentation';
    if (new Set(files.map(f => f.module)).size > 12 && files.length > 200)
        return 'monorepo/multi-module';
    return 'library/application';
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
    const allSignals = [];
    const allSymbols = [];
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
        const text = (0, utils_1.readText)(file, 1200000);
        const sample = text.slice(0, 240000);
        const roles = roleTagsFor(relativePath, sample);
        const symbols = detectSymbols(file, absRoot, sample);
        const signals = detectSignals(file, absRoot, sample);
        const imports = detectImports(sample);
        allSignals.push(...signals);
        allSymbols.push(...symbols);
        const item = {
            path: relativePath, language, extension: ext, lines, bytes: utils_1.FS.statSync(file).size, module: moduleKey(relativePath), roles,
            symbol_count: symbols.length, signal_count: signals.length, symbols: symbols.slice(0, 45), signals: signals.slice(0, 36), imports: imports.slice(0, 40), score: 0
        };
        item.score = scoreFile(relativePath, roles, symbols, signals, lines);
        fileItems.push(item);
    }
    const { frameworks, buildTools, packageManagers } = detectBuildContext(absRoot, files);
    const rankedFiles = fileItems.sort((a, b) => (b.score - a.score) || (b.signal_count - a.signal_count));
    const sourceFiles = fileItems.filter(f => SOURCE_EXTS.has(f.extension));
    const testFiles = fileItems.filter(f => f.roles.includes('test'));
    const contractFiles = rankedFiles.filter(f => f.roles.includes('api_contract') || f.roles.includes('soap_contract') || ['.wsdl', '.xsd', '.proto', '.graphql', '.gql'].includes(f.extension) || f.signals.some((s) => ['api_contract_candidate', 'soap_contract_candidate', 'graphql_contract_candidate'].includes(s.type))).map(f => f.path).slice(0, 100);
    const exampleFiles = rankedFiles.filter(f => f.roles.includes('example') || f.signals.some((s) => s.type === 'request_response_example_candidate')).map(f => f.path).slice(0, 100);
    const importantFiles = files.map(f => (0, utils_1.rel)(f, absRoot)).filter(r => IMPORTANT_NAMES.has(utils_1.Path.basename(r).toLowerCase()) || IMPORTANT_NAMES.has(r.toLowerCase())).slice(0, 100);
    const importantDocs = importantDocCandidates(rankedFiles);
    const moduleMap = {};
    for (const item of fileItems) {
        const mod = moduleMap[item.module] || { id: (0, utils_1.cleanId)(item.module), name: item.module, files: 0, source_files: 0, lines: 0, roles: {}, languages: {}, signals: {}, top_files: [] };
        mod.files += 1;
        mod.lines += item.lines;
        if (SOURCE_EXTS.has(item.extension))
            mod.source_files += 1;
        mod.languages[item.language] = (mod.languages[item.language] || 0) + item.lines;
        for (const r of item.roles)
            mod.roles[r] = (mod.roles[r] || 0) + 1;
        for (const s of item.signals)
            mod.signals[s.type] = (mod.signals[s.type] || 0) + 1;
        mod.top_files.push({ path: item.path, score: item.score, roles: item.roles, signals: item.signal_count, symbols: item.symbol_count });
        moduleMap[item.module] = mod;
    }
    const modules = Object.values(moduleMap).map((m) => ({ ...m, top_files: m.top_files.sort((a, b) => b.score - a.score).slice(0, 10) })).sort((a, b) => (b.source_files - a.source_files) || (b.lines - a.lines));
    const capsules = rankedFiles.slice(0, capsuleLimit).map(item => {
        const file = utils_1.Path.join(absRoot, item.path);
        const excerpt = (0, utils_1.readText)(file, capsuleChars);
        return {
            id: `capsule-${(0, utils_1.sha1Short)(item.path, 10)}`,
            path: item.path,
            module: item.module,
            roles: item.roles,
            score: item.score,
            language: item.language,
            lines: item.lines,
            symbols: item.symbols.slice(0, 14),
            signals: item.signals.slice(0, 14),
            content_excerpt: excerpt,
            truncated: excerpt.length >= capsuleChars
        };
    });
    const profile = {
        repo_name: utils_1.Path.basename(absRoot), root: absRoot, analyzed_at: (0, utils_1.utcNow)(), commit: (0, utils_1.gitCommit)(absRoot), repo_type: inferRepoType(fileItems, frameworks),
        languages: sortRecord(languageLoc), language_files: sortRecord(languageFiles), frameworks, build_tools: buildTools, package_managers: packageManagers,
        important_files: importantFiles.sort(), contract_files: contractFiles, example_files: exampleFiles, test_files: testFiles.length, source_files: sourceFiles.length,
        total_files: fileItems.length, total_lines: totalLines, skipped_files: inventory.skipped.length
    };
    return {
        profile,
        modules,
        files: rankedFiles,
        signals: allSignals.sort((a, b) => String(a.path).localeCompare(String(b.path)) || (a.line || 0) - (b.line || 0)).slice(0, 3000),
        symbols: allSymbols.slice(0, 5000),
        glossary_terms: [],
        capsules,
        important_docs: importantDocs,
        skipped_files: inventory.skipped,
        extraction_policy: {
            mode: 'llm_first',
            signals_are_authoritative: false,
            implementation_language: 'TypeScript',
            description: 'The CLI creates a broad code map, documentation candidates and context capsules. Codex/LLM performs semantic extraction of business logic, contracts, examples, requests, responses and flows.'
        }
    };
}
function sortRecord(r) {
    const out = {};
    for (const [k, v] of Object.entries(r).sort((a, b) => b[1] - a[1]))
        out[k] = v;
    return out;
}

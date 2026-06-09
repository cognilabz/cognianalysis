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
function scanRegexSignals(out, root, file, text, type, re, labeler, confidence = 'hint') {
    let m;
    let guard = 0;
    re.lastIndex = 0;
    while ((m = re.exec(text)) && guard < 120) {
        pushSignal(out, root, file, text, type, labeler(m), m.index, confidence);
        guard++;
    }
}
function detectSignals(file, root, text) {
    const lower = text.toLowerCase();
    const out = [];
    const r = (0, utils_1.rel)(file, root).toLowerCase();
    const ext = utils_1.Path.extname(file).toLowerCase();
    if (lower.includes('openapi:') || lower.includes('swagger:') || r.includes('openapi') || r.includes('swagger')) {
        pushSignal(out, root, file, text, 'api_contract', 'OpenAPI/Swagger candidate', Math.max(0, lower.indexOf('openapi')), 'hint');
    }
    if (lower.includes('<definitions') || lower.includes('<wsdl:definitions') || lower.includes('soap:operation') || ext === '.wsdl' || ext === '.xsd' || r.includes('soap')) {
        pushSignal(out, root, file, text, 'soap_contract', 'SOAP/WSDL/XSD candidate', Math.max(0, lower.indexOf('soap')), 'hint');
    }
    if (/\b(request|response|payload|example|sample|curl|http\/1\.1)\b/i.test(text)) {
        pushSignal(out, root, file, text, 'request_response_doc', 'Request/response/example candidate', text.search(/\b(request|response|payload|example|sample|curl|http\/1\.1)\b/i), 'hint');
    }
    if (/\b(sequenceDiagram|flowchart\s+(?:TD|LR)|stateDiagram-v2|classDiagram|erDiagram)\b/.test(text)) {
        pushSignal(out, root, file, text, 'mermaid_diagram', 'Mermaid diagram candidate', text.search(/\b(sequenceDiagram|flowchart\s+(?:TD|LR)|stateDiagram-v2|classDiagram|erDiagram)\b/), 'hint');
    }
    // Broad framework and interface hints. These are deliberately not final facts.
    scanRegexSignals(out, root, file, text, 'http_route_hint', /@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping)\b(?:\([^\n]*?\))?/g, m => `Spring ${m[1]}`, 'hint');
    scanRegexSignals(out, root, file, text, 'http_route_hint', /\b(app|router|server)\.(get|post|put|patch|delete|route)\s*\(\s*['"`]([^'"`]+)['"`]/g, m => `${m[2].toUpperCase()} ${m[3]}`, 'hint');
    scanRegexSignals(out, root, file, text, 'http_route_hint', /\b(?:Get|Post|Put|Delete|Patch)\s*\(\s*['"]([^'"]*)['"]\s*\)/g, m => `Attribute route ${m[1]}`, 'hint');
    scanRegexSignals(out, root, file, text, 'http_route_hint', /\b(api|router)\.(?:route|add|get|post|put|delete)\s*\(/g, () => 'HTTP route candidate', 'hint');
    scanRegexSignals(out, root, file, text, 'graphql_contract', /\b(type|input|enum|query|mutation|subscription)\s+([A-Z][A-Za-z0-9_]*)\b/g, m => `GraphQL ${m[1]} ${m[2]}`, 'hint');
    scanRegexSignals(out, root, file, text, 'event_or_message_hint', /\b(?:topic|queue|exchange|channel|event|message|producer|consumer|publish|subscribe|KafkaListener|RabbitListener)\b[^\n]{0,100}/gi, m => m[0].trim(), 'hint');
    scanRegexSignals(out, root, file, text, 'job_or_schedule_hint', /\b(?:cron|schedule|Scheduled|batch|job|worker|celery|sidekiq|queue processor)\b[^\n]{0,100}/gi, m => m[0].trim(), 'hint');
    scanRegexSignals(out, root, file, text, 'database_touchpoint_hint', /\b(?:Repository|Entity|Table|SELECT|INSERT|UPDATE|DELETE|save\(|findBy|query|migration|datasource|jdbc|sequelize|typeorm|mongoose|prisma)\b[^\n]{0,120}/gi, m => m[0].trim(), 'hint');
    scanRegexSignals(out, root, file, text, 'validation_or_business_rule_hint', /\b(?:validate|required|must|cannot|allowed|denied|score|risk|status|transition|approval|reject|threshold|calculate|eligib|authorize|permission|rule)\b[^\n]{0,140}/gi, m => m[0].trim(), 'hint');
    scanRegexSignals(out, root, file, text, 'external_call_hint', /\b(?:fetch|axios|RestTemplate|WebClient|HttpClient|requests\.|http\.Client|FeignClient|SoapClient|send|call)\b[^\n]{0,120}/gi, m => m[0].trim(), 'hint');
    scanRegexSignals(out, root, file, text, 'ui_route_hint', /\b(?:Route|path|page|screen|component|routerLink|navigate|useRouter)\b[^\n]{0,120}/gi, m => m[0].trim(), 'hint');
    return out.slice(0, 80);
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
function roleTagsFor(relativePath, text) {
    const p = relativePath.toLowerCase();
    const t = text.slice(0, 80000).toLowerCase();
    const roles = new Set();
    const ext = utils_1.Path.extname(relativePath).toLowerCase();
    if (p.includes('/test/') || p.includes('__tests__') || /test|spec/.test(utils_1.Path.basename(p)))
        roles.add('test');
    if (p.startsWith('docs/') || p.includes('/docs/') || ext === '.md' || ext === '.rst')
        roles.add('documentation');
    if (p.includes('openapi') || p.includes('swagger') || t.includes('openapi:') || t.includes('swagger:'))
        roles.add('api_contract');
    if (p.includes('soap') || p.endsWith('.wsdl') || p.endsWith('.xsd') || t.includes('soap:operation') || t.includes('<wsdl:definitions'))
        roles.add('soap_contract');
    if (p.includes('example') || p.includes('sample') || ext === '.http' || p.includes('postman'))
        roles.add('example');
    if (/(controller|resource|route|endpoint|handler|resolver|api)/i.test(relativePath) || /@(restcontroller|controller|requestmapping)|app\.(get|post|put|delete)|router\.(get|post|put|delete)|fastapi|flask|express/.test(t))
        roles.add('controller');
    if (/(service|manager|usecase|interactor|workflow|facade|processor)/i.test(relativePath))
        roles.add('service');
    if (/(model|entity|domain|dto|request|response|schema|type|record|enum)/i.test(relativePath))
        roles.add('domain');
    if (/(repository|dao|migration|database|sql|prisma|typeorm|sequelize|mongoose)/i.test(relativePath) || /\b(select|insert|update|delete|repository|entity|table)\b/i.test(text))
        roles.add('persistence');
    if (/(client|connector|adapter|gateway|integration|publisher|consumer|listener|producer)/i.test(relativePath))
        roles.add('integration');
    if (/(component|page|view|screen|template|frontend|ui)/i.test(relativePath) || /react|vue|angular|svelte|jsx|tsx/.test(t))
        roles.add('frontend');
    if (/(application\.ya?ml|\.properties|config|settings|dockerfile|compose|helm|terraform|kustomization)/i.test(relativePath))
        roles.add('config');
    if (/(github\/workflows|gitlab-ci|jenkinsfile|azure-pipelines|circleci|buildkite)/i.test(relativePath))
        roles.add('ci_cd');
    if (/(terraform|helm|k8s|kubernetes|deployment|service\.yaml|chart\.yaml)/i.test(relativePath))
        roles.add('infrastructure');
    if (/(package\.json|pom\.xml|build\.gradle|pyproject\.toml|go\.mod|cargo\.toml|\.csproj)/i.test(relativePath))
        roles.add('build');
    return Array.from(roles).sort();
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
function extractWords(value) {
    const words = String(value || '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(/[^A-Za-z0-9]+/)
        .map(w => w.trim())
        .filter(w => w.length >= 4 && !/^\d+$/.test(w));
    const stop = new Set(['main', 'test', 'java', 'typescript', 'javascript', 'src', 'with', 'from', 'that', 'this', 'class', 'function', 'string', 'public', 'private', 'return', 'request', 'response']);
    return words.filter(w => !stop.has(w.toLowerCase()));
}
function scoreFile(relativePath, roles, symbols, signals, lines) {
    const weights = {
        api_contract: 75, soap_contract: 75, example: 65, controller: 60, service: 55, domain: 42, integration: 42, persistence: 36,
        documentation: 34, test: 30, frontend: 26, config: 18, ci_cd: 14, infrastructure: 14, build: 10
    };
    let score = 0;
    for (const role of roles)
        score += weights[role] || 5;
    score += Math.min(90, signals.length * 9);
    score += Math.min(50, symbols.length * 2);
    const low = relativePath.toLowerCase();
    if (IMPORTANT_NAMES.has(utils_1.Path.basename(low)) || IMPORTANT_NAMES.has(low))
        score += 35;
    if (/(openapi|swagger|wsdl|soap|xsd|postman|example|sample|flow|business)/.test(low))
        score += 45;
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
    const allText = files.slice(0, 80).map(f => (0, utils_1.readText)(f, 50000).toLowerCase()).join('\n');
    if (allText.includes('spring-boot') || allText.includes('@springbootapplication'))
        frameworks.add('Spring Boot');
    if (allText.includes('fastapi'))
        frameworks.add('FastAPI');
    if (allText.includes('flask'))
        frameworks.add('Flask');
    if (allText.includes('django'))
        frameworks.add('Django');
    if (allText.includes('aspnetcore') || allText.includes('microsoft.aspnetcore'))
        frameworks.add('ASP.NET Core');
    if (allText.includes('gin-gonic'))
        frameworks.add('Gin');
    if (allText.includes('echo'))
        frameworks.add('Echo');
    return { frameworks: Array.from(frameworks).sort(), buildTools: Array.from(buildTools).sort(), packageManagers: Array.from(packageManagers).sort() };
}
function importantDocCandidates(files, limit = 140) {
    const docs = [];
    for (const item of files) {
        const low = item.path.toLowerCase();
        const roles = new Set(item.roles || []);
        const signalTypes = new Set((item.signals || []).map((s) => s.type));
        const isDoc = roles.has('documentation') || roles.has('api_contract') || roles.has('soap_contract') || roles.has('example') || roles.has('test') || SPEC_EXTS.has(item.extension) || /(openapi|swagger|wsdl|soap|postman|examples|sample|docs|readme)/.test(low);
        const isRelevant = ['api_contract', 'soap_contract', 'request_response_doc', 'example_payload', 'mermaid_diagram'].some(x => signalTypes.has(x));
        if (!isDoc && !isRelevant)
            continue;
        let score = item.score || 0;
        if (/openapi|swagger|asyncapi/.test(low))
            score += 130;
        if (/wsdl|soap|\.xsd$/.test(low))
            score += 130;
        if (/postman|example|sample|\.http$/.test(low))
            score += 80;
        if (/readme|^docs\//.test(low))
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
    const names = files.slice(0, 400).map(f => f.path.toLowerCase()).join('\n');
    if ((roles.controller || 0) > 0 || ['Spring Boot', 'Express', 'FastAPI', 'ASP.NET Core', 'NestJS', 'Gin'].some(f => frameworks.includes(f)))
        return 'service/api';
    if ((roles.frontend || 0) > 0 || ['React', 'Vue', 'Angular', 'Svelte', 'Next.js'].some(f => frameworks.includes(f)))
        return 'frontend';
    if (/terraform|chart\.yaml|kustomization|deployment\.ya?ml/.test(names))
        return 'infrastructure';
    if ((roles.documentation || 0) > (roles.service || 0) && (roles.documentation || 0) > 5)
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
    const files = (0, utils_1.listFiles)(absRoot, maxFileSize);
    const languageLoc = {};
    const languageFiles = {};
    const fileItems = [];
    const allSignals = [];
    const allSymbols = [];
    const glossary = {};
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
        for (const w of extractWords(relativePath))
            glossary[w.toLowerCase()] = (glossary[w.toLowerCase()] || 0) + 1;
        for (const sym of symbols)
            for (const w of extractWords(sym.name || ''))
                glossary[w.toLowerCase()] = (glossary[w.toLowerCase()] || 0) + 2;
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
    const contractFiles = rankedFiles.filter(f => f.roles.includes('api_contract') || f.roles.includes('soap_contract') || ['.wsdl', '.xsd', '.proto', '.graphql', '.gql'].includes(f.extension) || f.signals.some((s) => s.type === 'api_contract' || s.type === 'soap_contract')).map(f => f.path).slice(0, 100);
    const exampleFiles = rankedFiles.filter(f => f.roles.includes('example') || f.signals.some((s) => ['request_response_doc', 'mermaid_diagram'].includes(s.type))).map(f => f.path).slice(0, 100);
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
        total_files: fileItems.length, total_lines: totalLines
    };
    return {
        profile,
        modules,
        files: rankedFiles,
        signals: allSignals.sort((a, b) => String(a.path).localeCompare(String(b.path)) || (a.line || 0) - (b.line || 0)).slice(0, 3000),
        symbols: allSymbols.slice(0, 5000),
        glossary_terms: Object.entries(glossary).sort((a, b) => b[1] - a[1]).map(x => x[0]).slice(0, 150),
        capsules,
        important_docs: importantDocs,
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

import { NormalizedScannerFinding, NormalizedScannerFindings, ScannerCategory, ScannerProductFilter, ScannerSeverity, ScannerTool } from './scannerTypes';
import { FS, Path, asList, loadJson, writeJson } from './utils';

export interface ScannerImportOptions {
  writeDataAlias?: boolean;
  productRequest?: any;
}

const INPUTS: Array<{ tool: ScannerTool; file: string }> = [
  { tool: 'sonar', file: 'sonar.json' },
  { tool: 'codeql', file: 'codeql.sarif' },
  { tool: 'semgrep', file: 'semgrep.sarif' },
  { tool: 'semgrep', file: 'semgrep.json' },
  { tool: 'snyk', file: 'snyk.json' }
];

const DEFAULT_PRODUCT_FILTER: ScannerProductFilter = {
  min_severity: 'medium',
  include_categories: ['bug', 'vulnerability', 'code_smell', 'secret', 'dependency', 'license', 'other'],
  exclude_paths: [
    'node_modules/**',
    '.git/**',
    'dist/**',
    'build/**',
    '.next/**',
    'coverage/**',
    '.analysis/**'
  ],
  include_paths: [],
  report_strategy: 'Use scanner findings as external evidence inputs. Prioritize critical/high/medium and product-relevant findings for LLM triage; keep filtered findings visible as omitted-from-triage, not deleted.'
};

function cleanPath(value: any): string {
  const raw = String(value || '').replace(/\\/g, '/');
  const afterComponent = raw.includes(':') && !/^[a-zA-Z]:\//.test(raw) ? raw.split(':').slice(1).join(':') : raw;
  return afterComponent.replace(/^\.?\//, '');
}

function severity(value: any): ScannerSeverity {
  const normalized = String(value || '').toLowerCase();
  if (['critical', 'blocker'].includes(normalized)) return 'critical';
  if (['high', 'error'].includes(normalized)) return 'high';
  if (['medium', 'major', 'warning'].includes(normalized)) return 'medium';
  if (['low', 'minor', 'note'].includes(normalized)) return 'low';
  if (['info', 'informational', 'none'].includes(normalized)) return 'info';
  return 'unknown';
}

function categoryValues(value: any): any[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function category(value: any, fallback: ScannerCategory = 'other'): ScannerCategory {
  const text = categoryValues(value).join(' ').toLowerCase();
  if (/\b(secret|credential|token|password)\b/.test(text)) return 'secret';
  if (/\b(license|licensing)\b/.test(text)) return 'license';
  if (/\b(dependency|dependencies|package|vulnerable dependency)\b/.test(text)) return 'dependency';
  if (/\b(vulnerability|security|cwe|cve|injection|xss|csrf)\b/.test(text)) return 'vulnerability';
  if (/\b(bug|reliability|correctness)\b/.test(text)) return 'bug';
  if (/\b(code_smell|code smell|maintainability|style|quality)\b/.test(text)) return 'code_smell';
  return fallback;
}

function finding(row: Partial<NormalizedScannerFinding>, index: number, tool: ScannerTool, inputPath: string): NormalizedScannerFinding {
  return {
    id: String(row.id || `${tool}-${index + 1}`),
    tool: String(row.tool || tool),
    title: String(row.title || row.message || row.id || `${tool} finding ${index + 1}`),
    severity: severity(row.severity),
    category: category(row.category, 'other'),
    path: cleanPath(row.path),
    line: Number.isFinite(Number(row.line)) ? Math.max(0, Number(row.line)) : 0,
    message: String(row.message || row.title || ''),
    raw_ref: String(row.raw_ref || `${inputPath}#${index + 1}`),
    ...(row.metadata ? { metadata: row.metadata } : {})
  };
}

function sarifFindings(toolHint: ScannerTool, inputPath: string, data: any): NormalizedScannerFinding[] {
  const out: NormalizedScannerFinding[] = [];
  for (const run of asList(data?.runs)) {
    const tool = String(run?.tool?.driver?.name || toolHint).toLowerCase().includes('semgrep') ? 'semgrep'
      : String(run?.tool?.driver?.name || toolHint).toLowerCase().includes('codeql') ? 'codeql'
      : toolHint;
    const rules = new Map<string, any>();
    for (const rule of asList(run?.tool?.driver?.rules)) rules.set(String(rule?.id || ''), rule);
    for (const result of asList(run?.results)) {
      const ruleId = String(result?.ruleId || result?.rule?.id || '');
      const rule = rules.get(ruleId) || {};
      const loc = asList(result?.locations)[0]?.physicalLocation || {};
      const tags = [
        ruleId,
        result?.kind,
        result?.level,
        rule?.properties?.problem?.severity,
        ...asList(rule?.properties?.tags)
      ];
      out.push(finding({
        id: ruleId || result?.guid,
        tool,
        title: rule?.shortDescription?.text || rule?.name || ruleId,
        severity: result?.level || rule?.properties?.severity || rule?.properties?.problem?.severity,
        category: category(tags),
        path: loc?.artifactLocation?.uri,
        line: loc?.region?.startLine,
        message: result?.message?.text || rule?.fullDescription?.text || '',
        raw_ref: `${inputPath}#${out.length + 1}`
      }, out.length, tool as ScannerTool, inputPath));
    }
  }
  return out;
}

function sonarFindings(inputPath: string, data: any): NormalizedScannerFinding[] {
  return asList(data?.issues || data?.findings).map((issue: any, index: number) => finding({
    id: issue.key || issue.rule || issue.id,
    tool: 'sonar',
    title: issue.rule || issue.component || issue.title,
    severity: issue.severity,
    category: category([issue.type, issue.issue_type, issue.rule]),
    path: issue.component || issue.path || issue.file,
    line: issue.line || issue.textRange?.startLine,
    message: issue.message || issue.title,
    raw_ref: issue.key || `${inputPath}#${index + 1}`
  }, index, 'sonar', inputPath));
}

function snykFindings(inputPath: string, data: any): NormalizedScannerFinding[] {
  const rows = [
    ...asList(data?.vulnerabilities),
    ...asList(data?.issues),
    ...asList(data?.results).flatMap((result: any) => asList(result?.vulnerabilities || result?.issues))
  ];
  return rows.map((issue: any, index: number) => finding({
    id: issue.id || issue.issueId || issue.ruleId,
    tool: 'snyk',
    title: issue.title || issue.packageName || issue.name,
    severity: issue.severity,
    category: category([issue.type, issue.issueType, issue.identifiers, 'dependency'], 'dependency'),
    path: issue.path || issue.file || issue.from?.[0] || issue.packageName,
    line: issue.line || issue.lineNumber,
    message: issue.message || issue.description || issue.title,
    raw_ref: issue.url || issue.id || `${inputPath}#${index + 1}`
  }, index, 'snyk', inputPath));
}

function semgrepJsonFindings(inputPath: string, data: any): NormalizedScannerFinding[] {
  return asList(data?.results || data?.findings || data?.issues || data).map((result: any, index: number) => {
    const extra = result?.extra || {};
    const metadata = extra?.metadata || result?.metadata || {};
    const explicitCategory = category(metadata?.category, 'other');
    const inferredCategory = category([metadata?.technology, metadata?.cwe, metadata?.owasp, result?.check_id, 'vulnerability']);
    return finding({
      id: result?.check_id || result?.rule_id || result?.ruleId || result?.id,
      tool: 'semgrep',
      title: extra?.metadata?.shortlink || result?.check_id || result?.rule_id || result?.id,
      severity: extra?.severity || result?.severity || result?.level,
      category: explicitCategory !== 'other' ? explicitCategory : inferredCategory,
      path: result?.path || result?.file,
      line: result?.start?.line || result?.line || result?.lineNumber,
      message: extra?.message || result?.message || result?.description,
      raw_ref: result?.extra?.fingerprint || `${inputPath}#${index + 1}`,
      metadata: {
        check_id: result?.check_id || result?.rule_id || '',
        cwe: metadata?.cwe,
        owasp: metadata?.owasp,
        confidence: metadata?.confidence,
        likelihood: metadata?.likelihood,
        impact: metadata?.impact
      }
    }, index, 'semgrep', inputPath);
  });
}

function simpleFindings(tool: ScannerTool, inputPath: string, data: any): NormalizedScannerFinding[] {
  return asList(data?.findings || data?.issues || data).map((item: any, index: number) => finding({
    id: item?.id || item?.rule_id || item?.ruleId,
    tool,
    title: item?.title || item?.name || item?.rule_id || item?.ruleId,
    severity: item?.severity || item?.level,
    category: category([item?.category, item?.type]),
    path: item?.path || item?.file || item?.filename,
    line: item?.line || item?.start_line || item?.startLine,
    message: item?.message || item?.description || item?.summary,
    raw_ref: item?.raw_ref || `${inputPath}#${index + 1}`
  }, index, tool, inputPath));
}

function scannerProductFilter(request: any): ScannerProductFilter {
  const policy = request?.scanner_policy?.product_filtering || {};
  const min = severity(policy.min_severity || DEFAULT_PRODUCT_FILTER.min_severity);
  const includeCategories = asList(policy.include_categories).length
    ? asList(policy.include_categories).map((value: any) => category(value)).filter(Boolean)
    : DEFAULT_PRODUCT_FILTER.include_categories;
  return {
    min_severity: min,
    include_categories: [...new Set(includeCategories)] as ScannerCategory[],
    exclude_paths: asList(policy.exclude_paths).length ? asList(policy.exclude_paths).map(String) : DEFAULT_PRODUCT_FILTER.exclude_paths,
    include_paths: asList(policy.include_paths).map(String),
    report_strategy: String(policy.report_strategy || DEFAULT_PRODUCT_FILTER.report_strategy)
  };
}

function severityRank(value: ScannerSeverity): number {
  return ({ critical: 5, high: 4, medium: 3, low: 2, info: 1, unknown: 0 } as Record<ScannerSeverity, number>)[value] || 0;
}

function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function matchesAnyPath(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    const clean = String(pattern || '').trim().replace(/\\/g, '/').replace(/^\.?\//, '');
    if (!clean) return false;
    return globToRegex(clean).test(path) || path.includes(clean.replace(/\*\*/g, '').replace(/\*/g, ''));
  });
}

function applyProductFilter(findings: NormalizedScannerFinding[], filter: ScannerProductFilter): NormalizedScannerFinding[] {
  return findings.map(item => {
    const reasons: string[] = [];
    const path = cleanPath(item.path);
    if (matchesAnyPath(path, filter.exclude_paths)) reasons.push('excluded_path');
    if (filter.include_paths.length && !matchesAnyPath(path, filter.include_paths)) reasons.push('outside_included_paths');
    if (severityRank(item.severity) < severityRank(filter.min_severity)) reasons.push(`below_min_severity_${filter.min_severity}`);
    if (filter.include_categories.length && !filter.include_categories.includes(item.category)) reasons.push('category_not_included');
    const product_filter_status = reasons.length ? 'filtered_out' : 'triage_candidate';
    return {
      ...item,
      product_filter_status,
      product_filter_reasons: reasons.length ? reasons : ['matches_product_filter']
    };
  });
}

export function normalizeScannerImports(analysisDir: string, options: ScannerImportOptions = {}): NormalizedScannerFindings {
  const importsDir = Path.join(analysisDir, 'imports');
  const sources: NormalizedScannerFindings['sources'] = [];
  const findings: NormalizedScannerFinding[] = [];
  for (const input of INPUTS) {
    const inputPath = Path.join(importsDir, input.file);
    if (!FS.existsSync(inputPath)) continue;
    const data = loadJson<any>(inputPath, null);
    if (!data) {
      sources.push({ tool: input.tool, input_path: `.analysis/imports/${input.file}`, finding_count: 0 });
      continue;
    }
    const rows = input.file.endsWith('.sarif') ? sarifFindings(input.tool, `.analysis/imports/${input.file}`, data)
      : input.tool === 'sonar' ? sonarFindings(`.analysis/imports/${input.file}`, data)
      : input.tool === 'semgrep' ? semgrepJsonFindings(`.analysis/imports/${input.file}`, data)
      : input.tool === 'snyk' ? snykFindings(`.analysis/imports/${input.file}`, data)
      : simpleFindings(input.tool, `.analysis/imports/${input.file}`, data);
    sources.push({ tool: input.tool, input_path: `.analysis/imports/${input.file}`, finding_count: rows.length });
    findings.push(...rows);
  }
  const productFilter = scannerProductFilter(options.productRequest || {});
  const filtered = applyProductFilter(findings, productFilter);
  const normalized: NormalizedScannerFindings = {
    schema_version: '2.0',
    kind: 'normalized_scanner_findings',
    sources,
    product_filter: productFilter,
    findings: filtered,
    triage_findings: filtered.filter(item => item.product_filter_status === 'triage_candidate'),
    filtered_out_findings: filtered.filter(item => item.product_filter_status === 'filtered_out')
  };
  writeJson(Path.join(analysisDir, 'scanner-findings.json'), normalized);
  if (options.writeDataAlias === true) writeJson(Path.join(analysisDir, 'data', 'scanner-findings.json'), normalized);
  return normalized;
}

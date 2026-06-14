export type ScannerTool = 'sonar' | 'codeql' | 'semgrep' | 'snyk' | 'other';
export type ScannerSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'unknown';
export type ScannerCategory = 'bug' | 'vulnerability' | 'code_smell' | 'secret' | 'dependency' | 'license' | 'other';

export interface NormalizedScannerSource {
  tool: ScannerTool;
  input_path: string;
  finding_count: number;
}

export type ScannerProductFilterStatus = 'triage_candidate' | 'filtered_out';

export interface ScannerProductFilter {
  min_severity: ScannerSeverity;
  include_categories: ScannerCategory[];
  exclude_paths: string[];
  include_paths: string[];
  report_strategy: string;
}

export interface NormalizedScannerFinding {
  id: string;
  tool: string;
  title: string;
  severity: ScannerSeverity;
  category: ScannerCategory;
  path: string;
  line: number;
  message: string;
  raw_ref: string;
  product_filter_status?: ScannerProductFilterStatus;
  product_filter_reasons?: string[];
  metadata?: any;
}

export interface NormalizedScannerFindings {
  schema_version: '2.0';
  kind: 'normalized_scanner_findings';
  sources: NormalizedScannerSource[];
  product_filter?: ScannerProductFilter;
  findings: NormalizedScannerFinding[];
  triage_findings?: NormalizedScannerFinding[];
  filtered_out_findings?: NormalizedScannerFinding[];
}

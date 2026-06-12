export type ScannerTool = 'sonar' | 'codeql' | 'semgrep' | 'snyk' | 'other';
export type ScannerSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'unknown';
export type ScannerCategory = 'bug' | 'vulnerability' | 'code_smell' | 'secret' | 'dependency' | 'license' | 'other';

export interface NormalizedScannerSource {
  tool: ScannerTool;
  input_path: string;
  finding_count: number;
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
}

export interface NormalizedScannerFindings {
  schema_version: '2.0';
  kind: 'normalized_scanner_findings';
  sources: NormalizedScannerSource[];
  findings: NormalizedScannerFinding[];
}

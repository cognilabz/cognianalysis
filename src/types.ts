export type Json = any;

export interface EvidenceRef {
  path: string;
  line?: number;
  symbol?: string;
  snippet?: string;
  valid?: boolean;
  reason?: string;
}

export interface RepoProfile {
  repo_name: string;
  root: string;
  analyzed_at: string;
  commit?: string | null;
  repo_type: string;
  languages: Record<string, number>;
  language_files: Record<string, number>;
  frameworks: string[];
  build_tools: string[];
  package_managers: string[];
  important_files: string[];
  contract_files: string[];
  example_files: string[];
  test_files: number;
  source_files: number;
  total_files: number;
  total_lines: number;
}

export interface CodeMapFile {
  path: string;
  language: string;
  extension: string;
  lines: number;
  bytes: number;
  module: string;
  roles: string[];
  symbol_count: number;
  signal_count: number;
  symbols: Json[];
  signals: Json[];
  imports: string[];
  score: number;
}

export interface CodeMap {
  profile: RepoProfile;
  modules: Json[];
  files: CodeMapFile[];
  signals: Json[];
  symbols: Json[];
  glossary_terms: string[];
  capsules: Json[];
  important_docs: Json[];
  extraction_policy: Json;
}

export interface TargetCapability {
  id: string;
  title: string;
  description: string;
  addressed_by: string[];
  expected_outputs: string[];
  output_keys: string[];
}

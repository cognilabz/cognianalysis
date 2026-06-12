export interface InventoryFileV2 {
  path: string;
  language: string;
  extension: string;
  lines: number;
  bytes: number;
  sha1: string;
  module_path_partition: string;
  inventory_tags: string[];
  navigation_score: number;
}

export interface InventoryContextCapsuleV2 {
  id: string;
  path: string;
  excerpt: string;
  truncated: boolean;
}

export interface SourceInventoryV2 {
  schema_version: '2.0';
  inventory_kind: 'deterministic_source_inventory';
  semantic_authority: false;
  repo: {
    name: string;
    root_redacted: true;
    commit: string;
    analyzed_at: string;
  };
  summary: {
    total_files: number;
    included_files: number;
    skipped_files: number;
    source_files: number;
    total_lines: number;
    languages: Record<string, number>;
  };
  files: InventoryFileV2[];
  context_capsules: InventoryContextCapsuleV2[];
  navigation_policy: {
    semantic_authority: false;
    meaning: string;
  };
}

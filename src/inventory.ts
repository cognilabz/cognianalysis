import { CodeMap } from './types';
import { InventoryFileV2, SourceInventoryV2 } from './inventoryTypes';
import { FS, Path, sha1Short } from './utils';

function fileSha1(repo: string, relativePath: string): string {
  try {
    const full = Path.join(repo, relativePath);
    return sha1Short(FS.readFileSync(full, 'utf8'), 40);
  } catch {
    return '';
  }
}

function inventoryTags(file: any): string[] {
  return Array.from(new Set([...(file.inventory_tags || []), ...(file.navigation_tags || []), ...(file.roles || [])]
    .map((item: any) => String(item || '').trim())
    .filter(Boolean))).sort();
}

export function buildInventory(repo: string, codeMap: CodeMap, opts: { capsuleLimit?: number } = {}): SourceInventoryV2 {
  const files = Array.isArray(codeMap.files) ? codeMap.files : [];
  const skipped = Array.isArray(codeMap.skipped_files) ? codeMap.skipped_files : [];
  const capsuleLimit = Math.max(0, opts.capsuleLimit ?? 40);
  const inventoryFiles: InventoryFileV2[] = files.map((file: any) => ({
    path: String(file.path || ''),
    language: String(file.language || 'Other'),
    extension: String(file.extension || ''),
    lines: Number(file.lines || 0),
    bytes: Number(file.bytes || 0),
    sha1: fileSha1(repo, String(file.path || '')),
    module_path_partition: String(file.module_path_partition || file.module || '.'),
    inventory_tags: inventoryTags(file),
    navigation_score: Number(file.navigation_score ?? file.score ?? 0)
  }));
  return {
    schema_version: '2.0',
    inventory_kind: 'deterministic_source_inventory',
    semantic_authority: false,
    repo: {
      name: String(codeMap.profile?.repo_name || Path.basename(repo)),
      root_redacted: true,
      commit: String(codeMap.profile?.commit || ''),
      analyzed_at: String(codeMap.profile?.analyzed_at || '')
    },
    summary: {
      total_files: Number(codeMap.profile?.total_files || files.length),
      included_files: files.length,
      skipped_files: Number(codeMap.profile?.skipped_files || skipped.length),
      source_files: Number(codeMap.profile?.source_files || 0),
      total_lines: Number(codeMap.profile?.total_lines || 0),
      languages: codeMap.profile?.languages || {}
    },
    files: inventoryFiles,
    context_capsules: (codeMap.capsules || []).slice(0, capsuleLimit).map((capsule: any) => ({
      id: String(capsule.id || ''),
      path: String(capsule.path || ''),
      excerpt: String(capsule.excerpt || capsule.content_excerpt || ''),
      truncated: capsule.truncated === true
    })),
    navigation_policy: {
      semantic_authority: false,
      meaning: 'Inventory-only. Not proof of behavior, architecture, APIs, business logic or quality.'
    }
  };
}

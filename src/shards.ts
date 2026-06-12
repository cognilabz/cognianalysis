import { FS, Path, loadJson } from './utils';

export interface LoadedShard {
  path: string;
  id: string;
  valid_json: boolean;
  schema_version: string;
  shard_kind: string;
  data: any;
  errors: string[];
}

export function loadShards(analysisDir: string): LoadedShard[] {
  const dir = Path.join(analysisDir, 'shards');
  if (!FS.existsSync(dir)) return [];
  return FS.readdirSync(dir)
    .filter((name: string) => name.endsWith('.json'))
    .sort()
    .map((name: string) => {
      const full = Path.join(dir, name);
      const relative = Path.join('shards', name).replace(/\\/g, '/');
      const parsed = loadJson<any | null>(full, null);
      const validJson = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
      const errors = [
        ...(validJson ? [] : ['invalid_json_or_not_object']),
        ...(validJson && String(parsed.schema_version || '') === '2.0' ? [] : ['schema_version']),
        ...(validJson && String(parsed.shard_kind || '').trim() ? [] : ['shard_kind'])
      ];
      return {
        path: relative,
        id: name.replace(/\.json$/, ''),
        valid_json: validJson,
        schema_version: validJson ? String(parsed.schema_version || '') : '',
        shard_kind: validJson ? String(parsed.shard_kind || '') : '',
        data: parsed,
        errors
      };
    });
}

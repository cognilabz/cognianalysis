import { legacyAnalysisDocumentToV2 } from '../contracts/analysisV2';
import { buildInventory } from '../inventory';
import { detectLegacyWorkspace } from '../legacy';
import { writeWorkpacks } from '../workpacks';
import { FS, Path, ensureDir, loadJson, utcNow, writeJson } from '../utils';

function normalizeMode(value: any): string {
  const mode = String(value || '').toLowerCase();
  if (mode === 'complete') return 'complete-audit';
  if (mode === 'deep-dive') return 'deep';
  if (mode === 'brief' || mode === 'blueprint' || mode === 'deep' || mode === 'complete-audit') return mode;
  return 'blueprint';
}

export function migrateV07ToV08(repo: string, analysisDir: string, options: { force?: boolean } = {}): any {
  ensureDir(analysisDir);
  ensureDir(Path.join(analysisDir, 'data'));
  const detection = detectLegacyWorkspace(analysisDir);
  const changed: string[] = [];
  const skipped: string[] = [];
  const force = options.force === true;
  const codeMap = loadJson<any | null>(Path.join(analysisDir, 'data', 'code-map.json'), null);

  if (codeMap && (force || !FS.existsSync(Path.join(analysisDir, 'inventory.json')))) {
    const inventory = buildInventory(repo, codeMap);
    writeJson(Path.join(analysisDir, 'inventory.json'), inventory);
    writeJson(Path.join(analysisDir, 'data', 'inventory.json'), inventory);
    changed.push('inventory.json');
  } else if (FS.existsSync(Path.join(analysisDir, 'inventory.json'))) {
    skipped.push('inventory.json already exists');
  }

  const legacyRun = loadJson<any | null>(Path.join(analysisDir, 'data', 'analysis-run.json'), null);
  if (legacyRun && (force || !FS.existsSync(Path.join(analysisDir, 'run.json')))) {
    writeJson(Path.join(analysisDir, 'run.json'), legacyRun);
    changed.push('run.json');
  }

  const legacyDocument = loadJson<any | null>(Path.join(analysisDir, 'llm', 'analysis-document.json'), null);
  if (legacyDocument && (force || !FS.existsSync(Path.join(analysisDir, 'analysis.json')))) {
    const request = loadJson<any | null>(Path.join(analysisDir, 'data', 'product-analysis-request.json'), null);
    const analysis = legacyAnalysisDocumentToV2(legacyDocument, repo, analysisDir, codeMap?.profile || {}, normalizeMode(request?.mode));
    writeJson(Path.join(analysisDir, 'analysis.json'), analysis);
    changed.push('analysis.json');
  } else if (FS.existsSync(Path.join(analysisDir, 'analysis.json'))) {
    skipped.push('analysis.json already exists');
  }

  const requestPath = Path.join(analysisDir, 'data', 'product-analysis-request.json');
  const request = loadJson<any | null>(requestPath, null);
  const mode = normalizeMode(request?.mode);
  if (!request || request.mode !== mode || !request.contract_kind) {
    writeJson(requestPath, {
      ...(request || {}),
      contract_kind: 'product_analysis_request',
      entrypoint: request?.entrypoint || 'analyze',
      mode,
      legacy_mode_alias: request?.mode && request.mode !== mode ? request.mode : request?.legacy_mode_alias || '',
      goal: request?.goal || '',
      generated_at: request?.generated_at || utcNow()
    });
    changed.push('data/product-analysis-request.json');
  }

  if (mode !== 'complete-audit' && (force || !FS.existsSync(Path.join(analysisDir, 'workpack-manifest.json')))) {
    writeWorkpacks(analysisDir);
    changed.push('workpack-manifest.json');
    changed.push('workpacks/');
    changed.push('TASK.md');
  }

  const report = {
    schema_version: '2.0',
    kind: 'v07_to_v08_migration_report',
    generated_at: utcNow(),
    detection,
    changed,
    skipped,
    legacy_artifacts_preserved: true
  };
  writeJson(Path.join(analysisDir, 'data', 'migration-v07-to-v08.json'), report);
  return report;
}

import { FS, Path } from './utils';

export interface LegacyWorkspaceDetection {
  version: 'v0.7' | 'v0.8' | 'unknown';
  legacy_code_map: boolean;
  legacy_analysis_document: boolean;
  v2_inventory: boolean;
  v2_analysis: boolean;
}

export function detectLegacyWorkspace(analysisDir: string): LegacyWorkspaceDetection {
  const legacyCodeMap = FS.existsSync(Path.join(analysisDir, 'data', 'code-map.json'));
  const legacyAnalysisDocument = FS.existsSync(Path.join(analysisDir, 'llm', 'analysis-document.json'));
  const v2Inventory = FS.existsSync(Path.join(analysisDir, 'inventory.json'));
  const v2Analysis = FS.existsSync(Path.join(analysisDir, 'analysis.json'));
  const version = v2Inventory || v2Analysis ? 'v0.8' : legacyCodeMap || legacyAnalysisDocument ? 'v0.7' : 'unknown';
  return {
    version,
    legacy_code_map: legacyCodeMap,
    legacy_analysis_document: legacyAnalysisDocument,
    v2_inventory: v2Inventory,
    v2_analysis: v2Analysis
  };
}

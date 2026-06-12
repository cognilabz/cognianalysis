import { AnalysisEvidenceRef } from './evidence';

export interface AnalysisReportBlock {
  type: string;
  title?: string;
  text?: string | string[];
  paragraphs?: string[];
  summary?: string;
  description?: string;
  items?: any[];
  rows?: any[];
  metrics?: any[];
  mermaid?: string | { source?: string; diagram_type?: string; evidence?: AnalysisEvidenceRef[] };
  steps?: any[];
  labels?: Record<string, string>;
  evidence?: AnalysisEvidenceRef[];
  evidence_refs?: AnalysisEvidenceRef[];
}

export interface AnalysisReportSection {
  id?: string;
  title: string;
  level?: string;
  intent?: string;
  blocks: AnalysisReportBlock[];
  evidence?: AnalysisEvidenceRef[];
  evidence_refs?: AnalysisEvidenceRef[];
}

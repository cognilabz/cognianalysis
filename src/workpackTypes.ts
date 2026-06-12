export type WorkpackMode = 'brief' | 'blueprint' | 'deep' | 'complete-audit';

export interface WorkpackDefinition {
  id: string;
  title: string;
  output_path: string;
  required: boolean;
  can_run_parallel: boolean;
  depends_on: string[];
  read_only_inputs: string[];
  write_locks: string[];
  goal: string;
  contract: any;
  non_goals: string[];
}

export interface WorkpackManifestV2 {
  schema_version: '2.0';
  workpack_model: 'parallel_llm_shards';
  mode: WorkpackMode;
  semantic_authority: 'active_agent_harness_llm';
  deterministic_authority: 'task_generation_only';
  merge_order: string[];
  workpacks: WorkpackDefinition[];
}

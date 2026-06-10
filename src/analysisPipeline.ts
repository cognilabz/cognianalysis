export function analysisPipelineArtifact(tasks: any[] = []): any {
  const byOutput = new Map(tasks.map((task: any) => [String(task.expected_output || ''), task]));
  const wholeRepoTasks = tasks.filter((task: any) => {
    const output = String(task.expected_output || '');
    return output.startsWith('llm/') && output !== 'llm/analysis-strategy.json' && output !== 'llm/detail-agent-plan.json' && output !== 'llm/analysis-document.json';
  });
  const strategyTask = byOutput.get('llm/analysis-strategy.json') || null;
  const detailPlanTask = byOutput.get('llm/detail-agent-plan.json') || null;
  const finalReportTask = byOutput.get('llm/analysis-document.json') || null;
  return {
    pipeline_kind: 'llm_driven_overview_detail_final_report',
    semantic_authority: 'llm',
    deterministic_authority: 'artifact_contracts_only',
    summary: 'The CLI prepares context, materializes Tier 1 file-card tasks and detail tasks, validates artifact contracts/evidence and renders HTML. The LLM authors per-file Tier 1 understanding, semantic extraction, detail-review priorities and the final decision document.',
    invariants: [
      'The LLM authors a repository-specific analysis strategy before source tiering, building blocks, detail planning and the final report.',
      'Every included file receives an LLM-authored Tier 1 file card before whole-repository synthesis.',
      'Whole-repository extraction building blocks are authored before detail-agent planning.',
      'The detail-agent plan is authored by the LLM in llm/detail-agent-plan.json after whole-repository building blocks.',
      'Focused detail-review tasks are mechanically materialized from the LLM-authored plan.',
      'Final analysis_document is authored only after pre-final LLM building blocks and planned detail reviews exist.',
      'Semantic readiness is decided by analysis_document.report_quality_review.verdict, not by deterministic keyword or menu checks.'
    ],
    stages: [
      {
        id: 'deterministic_context_preparation',
        controller: 'cli',
        semantic_authority: false,
        purpose: 'Create navigation and renderer-contract context for the LLM.',
        outputs: [
          '.analysis/data/source-inventory.json',
          '.analysis/data/analysis-goal-contract.json',
          '.analysis/data/code-map.json',
          '.analysis/data/navigation-artifact-candidates.json',
          '.analysis/data/source-family-inventory.json',
          '.analysis/data/report-component-library.json',
          '.analysis/source-capsules.json',
          '.analysis/llm_instructions.md'
        ]
      },
      {
        id: 'llm_analysis_strategy',
        controller: 'llm',
        semantic_authority: true,
        depends_on: ['deterministic_context_preparation'],
        purpose: 'Author the repository-specific analysis strategy, source-slice hypotheses, skill application plan and report intent before the fixed workbench tasks are used.',
        task_file: strategyTask?.task_file || 'llm_tasks/00-analysis-strategy.md',
        expected_output: 'llm/analysis-strategy.json'
      },
      {
        id: 'llm_source_file_tier_analysis',
        controller: 'llm',
        semantic_authority: true,
        depends_on: ['llm_analysis_strategy'],
        purpose: 'Author Tier 1 file cards for every included source-inventory file before repository synthesis, so technical drilldown is not limited to E2E files.',
        tasks: '.analysis/source_tier_tasks/*.md',
        outputs: ['.analysis/source_tiers/*.json']
      },
      {
        id: 'llm_whole_repository_building_blocks',
        controller: 'llm',
        semantic_authority: true,
        depends_on: ['llm_analysis_strategy', 'llm_source_file_tier_analysis'],
        purpose: 'Author whole-repository extraction building blocks before final report synthesis.',
        tasks: wholeRepoTasks.map((task: any) => ({
          title: task.title,
          task_file: task.task_file,
          expected_output: task.expected_output
        }))
      },
      {
        id: 'llm_detail_agent_plan',
        controller: 'llm',
        semantic_authority: true,
        depends_on: ['llm_whole_repository_building_blocks'],
        purpose: 'Choose focused detail-review areas after the whole-repository picture exists.',
        task_file: detailPlanTask?.task_file || 'llm_tasks/11-detail-agent-plan.md',
        expected_output: 'llm/detail-agent-plan.json'
      },
      {
        id: 'deterministic_detail_task_materialization',
        controller: 'cli',
        semantic_authority: false,
        depends_on: ['llm_detail_agent_plan'],
        purpose: 'Materialize executable detail task files from the LLM-authored plan without choosing semantic priorities.',
        outputs: ['.analysis/detail_tasks/*.md', '.analysis/detail-task-manifest.json']
      },
      {
        id: 'llm_detail_reviews',
        controller: 'llm',
        semantic_authority: true,
        depends_on: ['deterministic_detail_task_materialization'],
        purpose: 'Execute the planned source-family/detail reviews and write structured review JSON.',
        outputs: ['.analysis/detail_reviews/*.json']
      },
      {
        id: 'llm_final_analysis_document',
        controller: 'llm',
        semantic_authority: true,
        depends_on: ['llm_whole_repository_building_blocks', 'llm_detail_reviews'],
        purpose: 'Author the visible management-ready report through the component library after all building blocks and detail reviews are available.',
        task_file: finalReportTask?.task_file || 'llm_tasks/12-analysis-document.md',
        expected_output: 'llm/analysis-document.json'
      },
      {
        id: 'deterministic_finalization_and_rendering',
        controller: 'cli',
        semantic_authority: false,
        depends_on: ['llm_final_analysis_document'],
        purpose: 'Aggregate outputs, validate evidence and renderer contracts, and render the static HTML report.',
        outputs: ['.analysis/data/bundle.json', '.analysis/report/index.html', '.analysis/report/analysis-data.json']
      }
    ]
  };
}

export function computeAnalysisPipelineContract(bundle: any): any {
  const pipeline = bundle.analysis_pipeline || {};
  const stages = Array.isArray(pipeline.stages) ? pipeline.stages : [];
  const stageIds = new Set(stages.map((stage: any) => String(stage.id || '')));
  const requiredStageIds = [
    'deterministic_context_preparation',
    'llm_analysis_strategy',
    'llm_source_file_tier_analysis',
    'llm_whole_repository_building_blocks',
    'llm_detail_agent_plan',
    'deterministic_detail_task_materialization',
    'llm_detail_reviews',
    'llm_final_analysis_document',
    'deterministic_finalization_and_rendering'
  ];
  const missingStages = requiredStageIds.filter(id => !stageIds.has(id));
  const wrongAuthority = stages
    .filter((stage: any) => String(stage.id || '').startsWith('llm_') && stage.semantic_authority !== true)
    .map((stage: any) => stage.id);
  const wrongDeterministicAuthority = stages
    .filter((stage: any) => String(stage.id || '').startsWith('deterministic_') && stage.semantic_authority !== false)
    .map((stage: any) => stage.id);
  const finalStage = stages.find((stage: any) => stage.id === 'llm_final_analysis_document') || {};
  const sourceTierStage = stages.find((stage: any) => stage.id === 'llm_source_file_tier_analysis') || {};
  const wholeRepoStage = stages.find((stage: any) => stage.id === 'llm_whole_repository_building_blocks') || {};
  const finalDepends = new Set((finalStage.depends_on || []).map(String));
  const sourceTierDepends = new Set((sourceTierStage.depends_on || []).map(String));
  const wholeRepoDepends = new Set((wholeRepoStage.depends_on || []).map(String));
  const sourceTierDependsOnStrategy = sourceTierDepends.has('llm_analysis_strategy');
  const wholeRepoDependsOnStrategy = wholeRepoDepends.has('llm_analysis_strategy');
  const wholeRepoDependsOnSourceTiers = wholeRepoDepends.has('llm_source_file_tier_analysis');
  const strategyReady = bundle.llm_analysis_strategy?.uses_pre_analysis_strategy_artifact === true && bundle.llm_analysis_strategy?.strategy_present === true;
  const finalDependsOnBuildingBlocks = finalDepends.has('llm_whole_repository_building_blocks');
  const finalDependsOnDetailReviews = finalDepends.has('llm_detail_reviews');
  const sourceTierComplete = bundle.source_tier_coverage?.complete === true;
  const preFinalComplete = bundle.analysis_document_prerequisite_coverage?.complete === true;
  const detailReviewsComplete = bundle.source_family_detail_review_coverage?.complete === true;
  const finalAfterDetails = bundle.report_mode?.final_after_detail_reviews === true;
  const qualityVerdictReady = bundle.analysis_document_quality_review?.verdict_is_decision_ready === true;
  const missing: string[] = [
    ...missingStages.map(id => `stage:${id}`),
    ...wrongAuthority.map(id => `llm_authority:${id}`),
    ...wrongDeterministicAuthority.map(id => `deterministic_authority:${id}`),
    ...(!strategyReady ? ['llm_analysis_strategy_complete'] : []),
    ...(!sourceTierDependsOnStrategy ? ['source_tier_depends_on_analysis_strategy'] : []),
    ...(!wholeRepoDependsOnStrategy ? ['whole_repo_depends_on_analysis_strategy'] : []),
    ...(!wholeRepoDependsOnSourceTiers ? ['whole_repo_depends_on_source_file_tiers'] : []),
    ...(!sourceTierComplete ? ['source_file_tier_analysis_complete'] : []),
    ...(!finalDependsOnBuildingBlocks ? ['final_depends_on_whole_repo_building_blocks'] : []),
    ...(!finalDependsOnDetailReviews ? ['final_depends_on_detail_reviews'] : []),
    ...(!preFinalComplete ? ['pre_final_building_blocks_complete'] : []),
    ...(!detailReviewsComplete ? ['planned_detail_reviews_complete'] : []),
    ...(!finalAfterDetails ? ['final_after_detail_reviews'] : []),
    ...(!qualityVerdictReady ? ['llm_quality_verdict_decision_ready'] : [])
  ];
  return {
    contract_kind: 'llm_driven_analysis_pipeline_contract',
    semantic_verdict_authority: 'llm',
    deterministic_contract_scope: 'stage order, artifact presence and authority boundaries only',
    complete: missing.length === 0,
    missing,
    stage_count: stages.length,
    required_stage_count: requiredStageIds.length,
    analysis_strategy_complete: strategyReady,
    source_file_tier_analysis_complete: sourceTierComplete,
    pre_final_building_blocks_complete: preFinalComplete,
    planned_detail_reviews_complete: detailReviewsComplete,
    final_after_detail_reviews: finalAfterDetails,
    llm_quality_verdict_decision_ready: qualityVerdictReady,
    summary: missing.length
      ? `Analysis pipeline contract is incomplete: ${missing.slice(0, 8).join(', ')}.`
      : 'Analysis pipeline contract is complete: whole-repository LLM building blocks, LLM detail plan, detail reviews and final LLM-authored report are ordered and ready.'
  };
}

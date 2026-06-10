"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisPipelineArtifact = analysisPipelineArtifact;
exports.computeAnalysisPipelineContract = computeAnalysisPipelineContract;
function analysisPipelineArtifact(tasks = [], capabilityTemplates = []) {
    const byOutput = new Map(tasks.map((task) => [String(task.expected_output || ''), task]));
    const optionalTemplates = capabilityTemplates.map((template) => ({
        title: template.title,
        template_file: template.template_file,
        suggested_output: template.suggested_output,
        required_for_final: false
    }));
    const strategyTask = byOutput.get('llm/analysis-strategy.json') || null;
    const detailPlanTask = byOutput.get('llm/detail-agent-plan.json') || null;
    const finalReportTask = byOutput.get('llm/analysis-document.json') || null;
    return {
        pipeline_kind: 'llm_driven_overview_detail_final_report',
        semantic_authority: 'llm',
        deterministic_authority: 'artifact_contracts_only',
        summary: 'The CLI prepares context, materializes Tier 1 file-card tasks, LLM-planned skill workbench tasks and detail tasks, exposes optional capability templates, validates artifact contracts/evidence and renders HTML. The LLM authors per-file Tier 1 understanding, repository-specific skill application, detail-review priorities and the final decision document.',
        invariants: [
            'The LLM authors a repository-specific analysis strategy before source tiering, optional capability templates, detail planning and the final report.',
            'Every included file receives an LLM-authored Tier 1 file card before whole-repository synthesis.',
            'Repository-specific skill workbench tasks are materialized from analysis_strategy.skill_application_plan before detail-agent planning.',
            'Whole-repository building blocks come from Tier 1 file cards, LLM-planned skill workbench reviews and any optional capability templates the LLM strategy explicitly uses.',
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
                purpose: 'Author the repository-specific analysis strategy, source-slice hypotheses, skill application plan and report intent before source tiering, optional capability templates, detail planning and final synthesis are used.',
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
                id: 'deterministic_skill_workbench_task_materialization',
                controller: 'cli',
                semantic_authority: false,
                depends_on: ['llm_analysis_strategy', 'llm_source_file_tier_analysis'],
                purpose: 'Materialize repository-specific skill workbench tasks from the LLM-authored analysis strategy without choosing semantic scope.',
                outputs: ['.analysis/skill_workbench_tasks/*.md', '.analysis/skill-workbench-task-manifest.json']
            },
            {
                id: 'llm_skill_workbench_reviews',
                controller: 'llm',
                semantic_authority: true,
                depends_on: ['deterministic_skill_workbench_task_materialization'],
                purpose: 'Execute the LLM-planned skill workbenches as reusable semantic extraction building blocks.',
                outputs: ['.analysis/skill_reviews/*.json']
            },
            {
                id: 'llm_whole_repository_building_blocks',
                controller: 'llm',
                semantic_authority: true,
                depends_on: ['llm_analysis_strategy', 'llm_source_file_tier_analysis', 'llm_skill_workbench_reviews'],
                purpose: 'Author whole-repository building blocks before final report synthesis. Optional capability templates provide reusable output shapes; repository-specific semantic emphasis comes from the LLM-planned skill workbenches.',
                optional_capability_templates: optionalTemplates
            },
            {
                id: 'llm_detail_agent_plan',
                controller: 'llm',
                semantic_authority: true,
                depends_on: ['llm_whole_repository_building_blocks', 'llm_skill_workbench_reviews'],
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
function computeAnalysisPipelineContract(bundle) {
    const pipeline = bundle.analysis_pipeline || {};
    const stages = Array.isArray(pipeline.stages) ? pipeline.stages : [];
    const stageIds = new Set(stages.map((stage) => String(stage.id || '')));
    const requiredStageIds = [
        'deterministic_context_preparation',
        'llm_analysis_strategy',
        'llm_source_file_tier_analysis',
        'deterministic_skill_workbench_task_materialization',
        'llm_skill_workbench_reviews',
        'llm_whole_repository_building_blocks',
        'llm_detail_agent_plan',
        'deterministic_detail_task_materialization',
        'llm_detail_reviews',
        'llm_final_analysis_document',
        'deterministic_finalization_and_rendering'
    ];
    const missingStages = requiredStageIds.filter(id => !stageIds.has(id));
    const wrongAuthority = stages
        .filter((stage) => String(stage.id || '').startsWith('llm_') && stage.semantic_authority !== true)
        .map((stage) => stage.id);
    const wrongDeterministicAuthority = stages
        .filter((stage) => String(stage.id || '').startsWith('deterministic_') && stage.semantic_authority !== false)
        .map((stage) => stage.id);
    const finalStage = stages.find((stage) => stage.id === 'llm_final_analysis_document') || {};
    const sourceTierStage = stages.find((stage) => stage.id === 'llm_source_file_tier_analysis') || {};
    const skillMaterializationStage = stages.find((stage) => stage.id === 'deterministic_skill_workbench_task_materialization') || {};
    const skillReviewStage = stages.find((stage) => stage.id === 'llm_skill_workbench_reviews') || {};
    const wholeRepoStage = stages.find((stage) => stage.id === 'llm_whole_repository_building_blocks') || {};
    const finalDepends = new Set((finalStage.depends_on || []).map(String));
    const sourceTierDepends = new Set((sourceTierStage.depends_on || []).map(String));
    const skillMaterializationDepends = new Set((skillMaterializationStage.depends_on || []).map(String));
    const skillReviewDepends = new Set((skillReviewStage.depends_on || []).map(String));
    const wholeRepoDepends = new Set((wholeRepoStage.depends_on || []).map(String));
    const sourceTierDependsOnStrategy = sourceTierDepends.has('llm_analysis_strategy');
    const wholeRepoDependsOnStrategy = wholeRepoDepends.has('llm_analysis_strategy');
    const wholeRepoDependsOnSourceTiers = wholeRepoDepends.has('llm_source_file_tier_analysis');
    const skillMaterializationDependsOnStrategy = skillMaterializationDepends.has('llm_analysis_strategy');
    const skillMaterializationDependsOnSourceTiers = skillMaterializationDepends.has('llm_source_file_tier_analysis');
    const skillReviewsDependOnMaterialization = skillReviewDepends.has('deterministic_skill_workbench_task_materialization');
    const wholeRepoDependsOnSkillReviews = wholeRepoDepends.has('llm_skill_workbench_reviews');
    const strategyReady = bundle.llm_analysis_strategy?.uses_pre_analysis_strategy_artifact === true && bundle.llm_analysis_strategy?.strategy_present === true;
    const finalDependsOnBuildingBlocks = finalDepends.has('llm_whole_repository_building_blocks');
    const finalDependsOnDetailReviews = finalDepends.has('llm_detail_reviews');
    const sourceTierComplete = bundle.source_tier_coverage?.complete === true;
    const skillWorkbenchComplete = bundle.skill_workbench_coverage?.complete === true;
    const preFinalComplete = bundle.analysis_document_prerequisite_coverage?.complete === true;
    const detailReviewsComplete = bundle.source_family_detail_review_coverage?.complete === true;
    const finalAfterDetails = bundle.report_mode?.final_after_detail_reviews === true;
    const qualityVerdictReady = bundle.analysis_document_quality_review?.verdict_is_decision_ready === true;
    const missing = [
        ...missingStages.map(id => `stage:${id}`),
        ...wrongAuthority.map(id => `llm_authority:${id}`),
        ...wrongDeterministicAuthority.map(id => `deterministic_authority:${id}`),
        ...(!strategyReady ? ['llm_analysis_strategy_complete'] : []),
        ...(!sourceTierDependsOnStrategy ? ['source_tier_depends_on_analysis_strategy'] : []),
        ...(!skillMaterializationDependsOnStrategy ? ['skill_workbench_depends_on_analysis_strategy'] : []),
        ...(!skillMaterializationDependsOnSourceTiers ? ['skill_workbench_depends_on_source_file_tiers'] : []),
        ...(!skillReviewsDependOnMaterialization ? ['skill_reviews_depend_on_materialized_skill_tasks'] : []),
        ...(!wholeRepoDependsOnStrategy ? ['whole_repo_depends_on_analysis_strategy'] : []),
        ...(!wholeRepoDependsOnSourceTiers ? ['whole_repo_depends_on_source_file_tiers'] : []),
        ...(!wholeRepoDependsOnSkillReviews ? ['whole_repo_depends_on_skill_workbench_reviews'] : []),
        ...(!sourceTierComplete ? ['source_file_tier_analysis_complete'] : []),
        ...(!skillWorkbenchComplete ? ['skill_workbench_reviews_complete'] : []),
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
        skill_workbench_reviews_complete: skillWorkbenchComplete,
        pre_final_building_blocks_complete: preFinalComplete,
        planned_detail_reviews_complete: detailReviewsComplete,
        final_after_detail_reviews: finalAfterDetails,
        llm_quality_verdict_decision_ready: qualityVerdictReady,
        summary: missing.length
            ? `Analysis pipeline contract is incomplete: ${missing.slice(0, 8).join(', ')}.`
            : 'Analysis pipeline contract is complete: whole-repository LLM building blocks, LLM detail plan, detail reviews and final LLM-authored report are ordered and ready.'
    };
}

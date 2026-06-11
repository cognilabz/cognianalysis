"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolPositioningReferencesArtifact = toolPositioningReferencesArtifact;
function toolPositioningReferencesArtifact() {
    return {
        reference_kind: 'external_tool_positioning_context',
        semantic_authority: false,
        deterministic_authority: 'reference_context_only',
        last_verified_on: '2026-06-09',
        verification_basis: 'Official public vendor or project documentation checked for category framing. The LLM must still decide repository-specific positioning from source evidence.',
        purpose: 'Official public tool-market context for LLM-authored positioning. These references frame comparison categories; they are not repository evidence, do not decide report readiness and must not be used as deterministic replacement/complement verdicts.',
        llm_positioning_rubric: {
            semantic_authority: 'codex_llm',
            deterministic_scope: 'reference categories, source URLs and source support notes only',
            required_judgment_dimensions: [
                'repo_specific_decision_value',
                'what_this_analysis_can_replace',
                'what_this_analysis_only_complements',
                'handoff_boundary',
                'evidence_strength',
                'remaining_owner_or_specialist_follow_up'
            ],
            instruction: 'Use the official references as market context, then author repository-specific replace/complement/handoff statements from analyzed source evidence. If the source analysis cannot justify a claim, mark the positioning partial or open in the LLM-authored requirements trace/report quality review.'
        },
        references: [
            {
                category: 'consulting_or_genai_delivery_suite',
                examples: ['Accenture GenWizard'],
                public_reference_url: 'https://www.accenture.com/us-en/services/cloud/application-transformation/genwizard',
                source_type: 'official_vendor_page',
                source_support: [
                    {
                        claim: 'GenWizard is positioned as a full-suite generative AI platform for technology delivery.',
                        source_url: 'https://www.accenture.com/us-en/services/cloud/application-transformation/genwizard',
                        source_basis: 'Official Accenture GenWizard page, verified 2026-06-09'
                    },
                    {
                        claim: 'The page lists reverse engineering, migration/modernization, modern engineering and enterprise rationalization modules.',
                        source_url: 'https://www.accenture.com/us-en/services/cloud/application-transformation/genwizard',
                        source_basis: 'Official Accenture GenWizard page, verified 2026-06-09'
                    }
                ],
                current_public_positioning: 'Generative-AI technology delivery suite spanning application and infrastructure management, application/data modernization, reverse engineering, software/platform delivery acceleration and scaled transformation execution.',
                typical_focus: [
                    'reverse engineering and living knowledge base creation',
                    'application and infrastructure management',
                    'application and data modernization',
                    'software and platform delivery acceleration',
                    'scaled delivery governance'
                ],
                handoff_boundary: 'Use Cognianalysis to create source-derived decision documents; use consulting/gen-AI delivery suites for scaled delivery programs, transformation governance and execution capacity.',
                report_question: 'Where does this source-derived analysis provide a decision document that can complement or replace consulting-style discovery work, and where does it still need owner or specialist follow-up?'
            },
            {
                category: 'structural_architecture_mapping',
                examples: ['CAST Imaging'],
                public_reference_url: 'https://www.castsoftware.com/imaging',
                source_type: 'official_vendor_page',
                source_support: [
                    {
                        claim: 'CAST Imaging is positioned around deterministic maps across architecture, dependencies, data access and technical debt.',
                        source_url: 'https://www.castsoftware.com/imaging',
                        source_basis: 'Official CAST Imaging page, verified 2026-06-09'
                    },
                    {
                        claim: 'The page emphasizes transaction paths, data access graphs, change impact and AI-agent context.',
                        source_url: 'https://www.castsoftware.com/imaging',
                        source_basis: 'Official CAST Imaging page, verified 2026-06-09'
                    }
                ],
                current_public_positioning: 'Deterministic system mapping for architecture, dependencies, data access and technical debt to help humans and AI understand brownfield systems.',
                typical_focus: [
                    'deterministic dependency and transaction maps',
                    'architecture and data-access visualization',
                    'impact analysis for brownfield changes',
                    'agent context for architecture reasoning'
                ],
                handoff_boundary: 'Use Cognianalysis for LLM-authored narrative, business/technical decision framing and evidence-backed drilldown; use structural graph tooling when exhaustive dependency graphs, transaction maps or data lineage need deterministic graph proof.',
                report_question: 'Which relationships are proven from source evidence, which are representative, and where would deterministic graph tooling add confidence?'
            },
            {
                category: 'static_quality_security_gate',
                examples: ['SonarQube'],
                public_reference_url: 'https://docs.sonarsource.com/sonarqube-server/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates',
                source_type: 'official_documentation',
                source_support: [
                    {
                        claim: 'A quality gate consists of conditions measured during analysis and gives pass/fail status.',
                        source_url: 'https://docs.sonarsource.com/sonarqube-server/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates',
                        source_basis: 'Official SonarQube Server documentation, verified 2026-06-09'
                    },
                    {
                        claim: 'Quality gate status can be used in pull requests and CI pipelines to block or fail changes.',
                        source_url: 'https://docs.sonarsource.com/sonarqube-server/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates',
                        source_basis: 'Official SonarQube Server documentation, verified 2026-06-09'
                    }
                ],
                current_public_positioning: 'Quality gates use configured analysis conditions to determine pass/fail status for code quality and security governance.',
                typical_focus: [
                    'bugs and vulnerabilities',
                    'security hotspots',
                    'code smells and maintainability thresholds',
                    'CI/CD quality gates'
                ],
                handoff_boundary: 'Use Cognianalysis to explain visible source risks in business and architecture context; use static analysis gates for repeatable issue detection, thresholds and CI enforcement.',
                report_question: 'Which quality and security risks are visible in the source review, and which findings require a dedicated static-analysis/security scan before decisions?'
            },
            {
                category: 'automated_transformation_engine',
                examples: ['OpenRewrite'],
                public_reference_url: 'https://docs.openrewrite.org/',
                source_type: 'official_documentation',
                source_support: [
                    {
                        claim: 'OpenRewrite is described as an open-source automated refactoring ecosystem for source code.',
                        source_url: 'https://docs.openrewrite.org/',
                        source_basis: 'Official OpenRewrite documentation, verified 2026-06-09'
                    },
                    {
                        claim: 'OpenRewrite runs recipes for framework migrations, security fixes, stylistic consistency and lossless semantic tree transformations.',
                        source_url: 'https://docs.openrewrite.org/',
                        source_basis: 'Official OpenRewrite documentation, verified 2026-06-09'
                    }
                ],
                current_public_positioning: 'Open-source automated refactoring ecosystem for source code and repeatable technical-debt reduction.',
                typical_focus: [
                    'repeatable refactoring recipes',
                    'framework and language migrations',
                    'safe mechanical code transformations',
                    'large-scale modernization execution'
                ],
                handoff_boundary: 'Use Cognianalysis to decide and prioritize modernization options; use automated transformation engines when recommendations can be encoded as repeatable recipes or migration tasks.',
                report_question: 'Which modernization steps are analysis recommendations only, and which could become repeatable automated recipes or migration tasks?'
            }
        ]
    };
}

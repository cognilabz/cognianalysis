---
name: visual-explanation-analysis
description: Extract happy paths, failure paths, process/data relationships and side effects as purpose-fit explanation artifacts with file:line evidence. Mermaid is optional.
---

# Visual Explanation Analysis Skill

Use this skill when the repository assessment needs detailed source-backed relationships, flows, lifecycles, state transitions, process paths or data movement.

## Output focus

- Happy paths and failure paths when they exist
- Narrative, steps, tables, timelines, dependency maps, architecture/system landscape maps, process-flow visuals, Mermaid sequence/flow/state diagrams, local SVG/image artifacts or explicit no-diagram rationale
- `architecture_visual`, `process_flow_visual` and `report_image` blocks when the final report needs a visible picture rather than only prose
- Request/response references
- Business rule references
- Persistence, events, external calls, queues/topics and state changes
- Flow examples
- Evidence for every step or source-backed relationship
- A rationale for why the chosen artifact explains the repository better than alternatives

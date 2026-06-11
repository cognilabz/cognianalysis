import { Path, ensureDir, escapeHtml, loadJson, safeJsonForHtml, utcNow, writeJson, writeText } from './utils';
import { loadBundle } from './aggregate';

export function renderReport(analysisDir: string, outputDir?: string, title?: string): string {
  const bundle = publicReportBundle(loadBundle(analysisDir));
  const out = outputDir || Path.join(analysisDir, 'report');
  ensureDir(out);
  const reportTitle = title || bundle.analysis_document?.title || `Cognianalysis · ${bundle.profile?.repo_name || 'Repository'}`;
  const index = Path.join(out, 'index.html');
  writeText(index, buildHtml(bundle, reportTitle));
  const dataPath = Path.join(out, 'analysis-data.json');
  writeJson(dataPath, bundle);
  writeJson(Path.join(analysisDir, 'data', 'report-artifacts.json'), {
    output_dir: out,
    index_html_path: index,
    analysis_data_json_path: dataPath,
    index_html: true,
    analysis_data_json: true,
    generated_at: utcNow()
  });
  return index;
}

function publicReportBundle(bundle: any): any {
  const copy = JSON.parse(JSON.stringify(bundle || {}));
  const localRoot = String(copy.profile?.root || '');
  const redactLocalPath = (value: any): any => {
    if (typeof value === 'string' && localRoot && Path.isAbsolute(localRoot) && value.startsWith(localRoot)) {
      const relative = Path.relative(localRoot, value).replace(/\\/g, '/');
      return relative && relative !== '..' && !relative.startsWith('../') ? `<local-repo>/${relative}` : '<local-repo>';
    }
    if (Array.isArray(value)) return value.map(redactLocalPath);
    if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) value[key] = redactLocalPath(value[key]);
    }
    return value;
  };
  redactLocalPath(copy);
  if (copy.profile && typeof copy.profile === 'object') {
    const root = localRoot;
    if (Path.isAbsolute(root)) {
      copy.profile.local_root_hidden = true;
      copy.profile.root = '';
    }
  }
  return copy;
}

function chip(value: any, cls = ''): string {
  return `<span class="chip ${cls}">${escapeHtml(value)}</span>`;
}

function chips(values: any): string {
  if (!Array.isArray(values)) values = values === undefined || values === null ? [] : [values];
  return values.slice(0, 28).map((v: any) => chip(v)).join('');
}

let evidenceRenderCounter = 0;

function evidenceLabel(ev: any): string {
  return `${ev?.path || ''}:${ev?.line || 1}`;
}

function evidenceHtml(items: any): string {
  if (!Array.isArray(items) || !items.length) return '';
  const body = items.slice(0, 16).map((ev: any) => {
    const ok = ev && ev.valid !== false;
    const label = evidenceLabel(ev);
    const id = `evidence-${++evidenceRenderCounter}`;
    return `<div class="evidence-item ${ok ? 'ok' : 'bad'}" id="${id}"><div class="path">${escapeHtml(label)}</div>${ev?.symbol ? `<div class="small muted">${escapeHtml(ev.symbol)}</div>` : ''}${ev?.reason ? `<div class="small bad-text">${escapeHtml(ev.reason)}</div>` : ''}${ev?.snippet ? `<pre>${escapeHtml(ev.snippet)}</pre>` : ''}</div>`;
  }).join('');
  const links = items.slice(0, 8).map((ev: any, index: number) => {
    const target = `evidence-${evidenceRenderCounter - Math.min(items.length, 16) + index + 1}`;
    return `<a class="evidence-link" href="#${target}" data-evidence-target="${target}">${escapeHtml(evidenceLabel(ev))}</a>`;
  }).join('');
  const quick = `<div class="evidence-quick"><span>Evidence</span>${links}${items.length > 8 ? `<span class="small muted">+${items.length - 8}</span>` : ''}</div>`;
  const more = items.length > 16 ? `<div class="small muted">+${items.length - 16} additional evidence references</div>` : '';
  return `${quick}<details class="evidence"><summary>Details (${items.length})</summary><div class="evidence-list">${body}${more}</div></details>`;
}

function metric(label: string, value: any, detail = ''): string {
  return `<div class="metric card"><div class="metric-value">${escapeHtml(value)}</div><div class="metric-label">${escapeHtml(label)}</div>${detail ? `<div class="small muted">${escapeHtml(detail)}</div>` : ''}</div>`;
}

function card(title: string, body: string, cls = ''): string {
  return `<article class="card search-card ${cls}" data-search="${escapeHtml((title + ' ' + body).replace(/<[^>]*>/g, ' '))}"><h3>${escapeHtml(title)}</h3>${body}</article>`;
}

function listItems(items: any[], render: (x: any, i: number) => string): string {
  if (!Array.isArray(items) || !items.length) return '';
  return items.map(render).join('');
}

function firstText(...values: any[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function paragraphs(values: any): string {
  const items = Array.isArray(values) ? values : [values];
  return items
    .map((v: any) => typeof v === 'string' ? v : firstText(v?.business_need, v?.business_use, v?.technical_drilldown, v?.summary, v?.description, v?.rationale, v?.recommendation, v?.gap, v?.reason))
    .filter(Boolean)
    .slice(0, 10)
    .map((v: string) => `<p>${escapeHtml(v)}</p>`)
    .join('');
}

function textLike(value: any): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some(textLike);
  return false;
}

function hasEvidence(items: any): boolean {
  return Array.isArray(items) && items.length > 0;
}

function evidenceOf(item: any): any[] {
  if (!item) return [];
  if (Array.isArray(item)) return item;
  if (Array.isArray(item.evidence)) return item.evidence;
  if (Array.isArray(item.evidence_refs)) return item.evidence_refs;
  return [];
}

function statementHasDisplayContent(x: any): boolean {
  return [
    x?.title,
    x?.name,
    x?.criterion,
    x?.verdict,
    x?.id,
    x?.description,
    x?.summary,
    x?.rationale,
    x?.recommendation,
    x?.gap,
    x?.reason,
    x?.severity,
    x?.confidence,
    x?.owner
  ].some(textLike) || hasEvidence(evidenceOf(x));
}

function statementList(items: any[]): string {
  const displayItems = Array.isArray(items) ? items.filter(statementHasDisplayContent) : [];
  return listItems(displayItems, (x: any) => {
    const title = firstText(x.title, x.name, x.criterion, x.verdict, x.id) || 'Statement';
    const text = firstText(x.description, x.summary, x.rationale, x.recommendation, x.gap, x.reason);
    return `<div class="statement"><strong>${escapeHtml(title)}</strong>${x.confidence ? ` ${confidenceChip(x.confidence)}` : ''}${x.severity ? ` ${riskChip(x.severity)}` : ''}${x.owner ? ` ${chip(x.owner)}` : ''}${text ? `<p>${escapeHtml(text)}</p>` : ''}${evidenceHtml(evidenceOf(x))}</div>`;
  });
}

function mermaidBlock(source: any, evidence?: any): string {
  const text = typeof source === 'string' ? source : firstText(source?.source, source?.mermaid);
  if (!text) return '';
  return `<div class="mermaid-box" data-mermaid-box><div class="mermaid-output muted small">Rendering Mermaid diagram...</div><details><summary>Mermaid source</summary><pre class="mermaid-source">${escapeHtml(text)}</pre></details>${evidenceHtml(evidence || evidenceOf(source))}</div>`;
}

function sectionTasks(bundle: any): string {
  return listItems(bundle.tasks || [], (t: any) => card(t.title || t.task_file, `<div>${chip(t.status || 'pending')}</div><div class="kv"><span>Task</span><code>${escapeHtml(t.task_file)}</code></div><div class="kv"><span>Output</span><code>${escapeHtml(t.expected_output)}</code></div>`));
}

function sectionId(value: any, fallback: string): string {
  const id = String(value || fallback || 'section')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return id || fallback || 'section';
}

function initials(value: any): string {
  const words = String(value || '')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const picked = words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
  return picked || 'CB';
}

function statusChip(value: any): string {
  return chip(value || 'info');
}

function riskChip(value: any): string {
  return chip(value || 'risk');
}

function confidenceChip(value: any): string {
  return chip(value || 'confidence');
}

function priorityChip(value: any): string {
  return chip(value || 'priority');
}

function labelFor(block: any, key: string, fallback: string): string {
  return firstText(block?.labels?.[key], block?.[`${key}_label`], fallback) || fallback;
}

function tableHeader(labels: string[]): string {
  return `<thead><tr>${labels.map(label => `<th>${escapeHtml(label)}</th>`).join('')}</tr></thead>`;
}

function renderDocMetricGrid(block: any): string {
  const metrics = listItems(block.metrics || [], (m: any) => metric(m.label || labelFor(block, 'metric', 'Metric'), m.value ?? '', m.detail || ''));
  return `${metrics ? `<div class="metrics compact">${metrics}</div>` : ''}${evidenceHtml(evidenceOf(block))}`;
}

function renderSourceFamilyMap(block: any): string {
  const families = listItems(block.families || [], (f: any) => `<article class="family-card search-card" data-search="${escapeHtml(`${f.name || ''} ${f.role || ''} ${f.business_use || ''} ${f.technical_shape || ''}`)}">
    <div class="family-head"><h3>${escapeHtml(f.name || labelFor(block, 'family', 'Source family'))}</h3>${f.confidence ? confidenceChip(f.confidence) : chip(f.evidence_level || labelFor(block, 'family_status', 'source family'))}</div>
    ${paragraphs([f.role, f.business_use, f.technical_shape].filter(Boolean))}
    <div>${f.confidence && f.evidence_level ? chip(f.evidence_level) : ''}</div>
    ${evidenceHtml(evidenceOf(f))}
  </article>`);
  return `${families ? `<div class="family-grid">${families}</div>` : ''}${evidenceHtml(evidenceOf(block))}`;
}

function renderBoundaryMap(block: any): string {
  const entryBody = statementList(block.entries || []);
  const exitBody = statementList(block.exits || []);
  const stateBody = statementList(block.state || []);
  const cards = [
    entryBody ? card(labelFor(block, 'entries', 'System Entry'), entryBody, 'prose-card') : '',
    exitBody ? card(labelFor(block, 'exits', 'System Exit / Integrations'), exitBody, 'prose-card') : '',
    stateBody ? card(labelFor(block, 'state', 'State / Data Boundary'), stateBody, 'prose-card') : ''
  ].filter(Boolean).join('');
  return `${cards ? `<div class="grid three">${cards}</div>` : ''}${evidenceHtml(evidenceOf(block))}`;
}

function renderDocFlow(block: any): string {
  const source = typeof block.mermaid === 'string' ? block.mermaid : firstText(block.mermaid?.source, block.source);
  return `${paragraphs(firstText(block.summary, block.description))}${source ? mermaidBlock(source, evidenceOf(block.mermaid).length ? evidenceOf(block.mermaid) : evidenceOf(block)) : ''}
  ${block.steps?.length ? `<div class="doc-steps">${listItems(block.steps, (s: any) => `<div class="step"><span>${escapeHtml(s.order || '')}</span><div><strong>${escapeHtml(s.actor || s.kind || 'step')}</strong><p>${escapeHtml(s.description || '')}</p>${evidenceHtml(evidenceOf(s))}</div></div>`)}</div>` : ''}
  ${evidenceHtml(evidenceOf(block))}`;
}

function renderFourLevelAssessment(block: any): string {
  const levels = listItems(block.levels || [], (l: any) => `<article class="level-card search-card" data-search="${escapeHtml(`${l.level || ''} ${l.status || ''} ${l.summary || ''}`)}">
    <div class="family-head"><h3>${escapeHtml(String(l.level || labelFor(block, 'level', 'level')).replace(/_/g, ' '))}</h3>${statusChip(l.status)}</div>
    ${paragraphs(l.summary)}
    ${l.next_steps?.length ? `<h4>${escapeHtml(labelFor(block, 'next_steps', 'Next steps'))}</h4>${chips(l.next_steps)}` : ''}
    ${evidenceHtml(evidenceOf(l))}
  </article>`);
  return `${levels ? `<div class="level-grid">${levels}</div>` : ''}${evidenceHtml(evidenceOf(block))}`;
}

function renderDecisionMatrix(block: any): string {
  const rows = (block.rows || []).map((r: any) => `<tr class="search-card" data-search="${escapeHtml(`${r.decision || ''} ${r.recommendation || ''} ${r.risk || ''}`)}">
    <td><strong>${escapeHtml(r.decision || labelFor(block, 'decision', 'Decision'))}</strong><div>${r.confidence ? confidenceChip(r.confidence) : ''}</div></td>
    <td>${chips(r.options || [])}</td>
    <td>${escapeHtml(r.recommendation || '')}</td>
    <td>${r.risk ? riskChip(r.risk) : ''}${evidenceHtml(evidenceOf(r))}</td>
  </tr>`).join('');
  return `${rows ? `<div class="table-wrap"><table>${tableHeader([
    labelFor(block, 'decision', 'Decision'),
    labelFor(block, 'options', 'Options'),
    labelFor(block, 'recommendation', 'Recommendation'),
    labelFor(block, 'risk', 'Risk / Evidence')
  ])}<tbody>${rows}</tbody></table></div>` : ''}${evidenceHtml(evidenceOf(block))}`;
}

function renderRoadmap(block: any): string {
  const items = listItems(block.items || [], (r: any) => `<article class="roadmap-item search-card" data-search="${escapeHtml(`${r.title || ''} ${r.phase || ''} ${r.benefit || ''}`)}">
    <div class="family-head"><h3>${escapeHtml(r.title || labelFor(block, 'item', 'Roadmap item'))}</h3><div>${r.phase ? chip(r.phase) : ''}${r.effort ? chip(r.effort) : ''}${r.risk ? riskChip(r.risk) : ''}</div></div>
    ${paragraphs([r.benefit, r.description].filter(Boolean))}
    ${evidenceHtml(evidenceOf(r))}
  </article>`);
  return `${items ? `<div class="roadmap">${items}</div>` : ''}${evidenceHtml(evidenceOf(block))}`;
}

function renderAgentPlan(block: any): string {
  const tasks = block.tasks || block.detail_agent_tasks || [];
  const rows = tasks.slice(0, 80).map((t: any) => {
    const stateChip = t.review_status ? statusChip(t.review_status) : t.priority ? priorityChip(t.priority) : t.evidence_level_target ? chip(t.evidence_level_target) : chip(labelFor(block, 'planned_status', 'planned'));
    return `<tr class="search-card" data-search="${escapeHtml(`${t.source_family || ''} ${t.recommended_agent || ''} ${(t.focus || []).join(' ')}`)}">
      <td><strong>${escapeHtml(t.source_family || labelFor(block, 'source_family', 'source family'))}</strong><div class="small muted">${escapeHtml(t.recommended_agent || '')}</div></td>
      <td>${stateChip}</td>
      <td>${chips(t.focus || [])}</td>
      <td>${chips(t.expected_outputs || [])}</td>
      <td>${t.task_file ? `<code>${escapeHtml(t.task_file)}</code>` : `<span class="muted small">${escapeHtml(labelFor(block, 'planned_status', 'planned'))}</span>`}${t.expected_output ? `<div class="small muted">${escapeHtml(t.expected_output)}</div>` : ''}</td>
      <td>${chips((t.seed_files || []).map((f: any) => typeof f === 'string' ? f : f.path).filter(Boolean).slice(0, 4))}</td>
    </tr>`;
  }).join('');
  return `${paragraphs(firstText(block.summary, block.description))}${rows ? `<div class="table-wrap"><table>${tableHeader([
    labelFor(block, 'source_family', 'Source Family'),
    labelFor(block, 'priority', 'Priority'),
    labelFor(block, 'focus', 'Focus'),
    labelFor(block, 'expected_outputs', 'Expected Outputs'),
    labelFor(block, 'task_output', 'Task / Output'),
    labelFor(block, 'seed_files', 'Seed Files')
  ])}<tbody>${rows}</tbody></table></div>` : ''}${evidenceHtml(evidenceOf(block))}`;
}

function renderTechnicalDrilldown(block: any): string {
  const refs = listItems(block.references || [], (r: any) => `<a class="jump-card search-card" href="${escapeHtml(r.target || '#technical')}" data-search="${escapeHtml(`${r.label || ''} ${r.description || ''}`)}"><strong>${escapeHtml(r.label || labelFor(block, 'reference', 'Drilldown'))}</strong><p>${escapeHtml(r.description || '')}</p></a>`);
  return `${refs ? `<div class="grid three">${refs}</div>` : ''}${evidenceHtml(evidenceOf(block))}`;
}

function renderOpenQuestions(block: any): string {
  return statementList((block.items || []).map((q: any) => ({
    title: q.question || q.title || labelFor(block, 'question', 'Open question'),
    description: q.reason || q.why_it_matters || q.description || q.evidence_gap,
    owner: q.owner || q.impact,
    severity: q.blocking ? 'blocking' : q.priority,
    confidence: q.status,
    evidence: q.evidence
  }))) + evidenceHtml(evidenceOf(block));
}

function renderDocBlock(block: any): string {
  const title = block.title ? `<h3>${escapeHtml(block.title)}</h3>` : '';
  let body = '';
  switch (block.type) {
    case 'metric_grid': body = renderDocMetricGrid(block); break;
    case 'source_family_map': body = renderSourceFamilyMap(block); break;
    case 'boundary_map': body = renderBoundaryMap(block); break;
    case 'flow': body = renderDocFlow(block); break;
    case 'four_level_assessment': body = renderFourLevelAssessment(block); break;
    case 'decision_matrix': body = renderDecisionMatrix(block); break;
    case 'roadmap': body = renderRoadmap(block); break;
    case 'agent_plan': body = renderAgentPlan(block); break;
    case 'technical_drilldown': body = renderTechnicalDrilldown(block); break;
    case 'open_questions': body = renderOpenQuestions(block); break;
    case 'statement_list': body = statementList(block.items || []) + evidenceHtml(evidenceOf(block)); break;
    case 'narrative':
    default: body = paragraphs(block.text || block.paragraphs || block.summary || block.description || block.business_need || block.business_use || block.technical_drilldown) + evidenceHtml(evidenceOf(block)); break;
  }
  if (!title && !body) return '';
  return `<div class="doc-block ${escapeHtml(block.type || 'narrative')}">${title}${body}</div>`;
}

function analysisDocumentSections(bundle: any): [string, string, string][] {
  const doc = bundle.analysis_document || {};
  if (!doc || !Array.isArray(doc.sections) || !doc.sections.length) return [];
  const used = new Set<string>();
  const sections: [string, string, string][] = [];
  for (const section of doc.sections) {
    let id = sectionId(section.id || section.title, `doc-${sections.length + 1}`);
    while (used.has(id)) id = `${id}-${sections.length + 1}`;
    used.add(id);
    const label = firstText(section.title, section.id, `Section ${sections.length + 1}`);
    const body = `<article class="analysis-doc-section">
      <p class="doc-section-kicker">${escapeHtml(section.level || 'analysis')}</p>
      ${section.intent ? `<p class="section-intent">${escapeHtml(section.intent)}</p>` : ''}
      ${(section.blocks || []).map((block: any) => renderDocBlock(block)).join('')}
      ${evidenceHtml(evidenceOf(section))}
    </article>`;
    sections.push([id, label, body]);
  }
  return sections;
}

function pendingAnalysisDocumentSections(bundle: any): [string, string, string][] {
  const tasks = bundle.tasks || [];
  const body = `<article class="analysis-doc-lead card accent search-card" data-search="awaiting llm authored analysis document report incomplete">
    <p class="eyebrow">LLM-authored analysis document required</p>
    <h2>Report pending · ${escapeHtml(bundle.profile?.repo_name || 'Repository')}</h2>
    <p>This is not a completed analysis report. The CLI has prepared deterministic context and audit data, but the human-facing report is intentionally withheld until an LLM-authored <code>analysis_document.sections</code> output exists.</p>
    <p>The next step is to author <code>.analysis/llm_tasks/00-analysis-strategy.md</code>, complete every <code>.analysis/source_tier_tasks/*.md</code> Tier 1 file-card task, run <code>cognianalysis dev finalize . --allow-partial</code> to materialize strategy-planned skill workbenches, execute those reviews, optionally use <code>.analysis/capability_templates/*.md</code> only when the LLM strategy calls for them, then continue through detail planning and the final LLM-authored analysis document.</p>
    <div class="metrics compact">
      ${metric('Report mode', bundle.report_mode?.state || 'awaiting_llm_authored_report')}
      ${metric('Generated tasks', tasks.length)}
      ${metric('Source inventory files', (bundle.source_inventory_accounting || bundle.source_coverage)?.total_files || bundle.profile?.source_files || 0)}
    </div>
  </article>
  <article class="analysis-doc-section">
    <p class="doc-section-kicker">prepared audit inputs</p>
    <p class="section-intent">These deterministic artifacts are available to the agent harness, but they are not a replacement for the final LLM-authored document.</p>
    ${card('Next LLM Tasks', sectionTasks(bundle), 'prose-card')}
  </article>`;
  return [['analysis-document-pending', 'Analysis Document Pending', body]];
}

export function buildHtml(bundle: any, title: string): string {
  evidenceRenderCounter = 0;
  const authoredSections = analysisDocumentSections(bundle);
  const doc = bundle.analysis_document || {};
  const hasAuthoredReport = authoredSections.length > 0;
  const shellTitle = hasAuthoredReport ? firstText(doc.title, title, bundle.profile?.repo_name) : 'Cognianalysis';
  const shellSubtitle = hasAuthoredReport
    ? firstText(doc.subtitle, Array.isArray(doc.audience) ? doc.audience.join(' · ') : '', bundle.profile?.repo_type)
    : 'LLM-authored report pending';
  const heroEyebrow = hasAuthoredReport
    ? firstText(doc.subtitle, Array.isArray(doc.audience) ? doc.audience.join(' · ') : '', 'LLM-authored report')
    : 'LLM-authored report pending';
  const sections: [string, string, string][] = authoredSections.length ? [
    ...authoredSections
  ] : [
    ...pendingAnalysisDocumentSections(bundle)
  ];
  const nav = sections.map(([id, label], index) => `<a class="nav-link ${index === 0 ? 'active' : ''}" href="#${id}" data-section="${id}">${escapeHtml(label)}</a>`).join('');
  const htmlSections = sections.map(([id, label, body], index) => `<section class="view ${index === 0 ? 'active' : ''}" id="${id}"><div class="section-title"><h2>${escapeHtml(label)}</h2></div>${body}</section>`).join('\n');
  const dataJson = safeJsonForHtml(bundle);
  const rootLine = bundle.profile?.root
    ? `<p class="muted">${escapeHtml(bundle.profile.root)}</p>`
    : bundle.profile?.local_root_hidden
      ? '<p class="muted">Local repository path hidden in report output.</p>'
      : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head>
<body>
<script id="analysis-data" type="application/json">${dataJson}</script>
<div class="layout">
<aside class="sidebar"><div class="brand"><div class="logo">${escapeHtml(initials(shellTitle))}</div><div><div class="brand-title">${escapeHtml(shellTitle)}</div><div class="brand-subtitle">${escapeHtml(shellSubtitle)}</div></div></div><nav>${nav}</nav><div class="side-note"><strong>${escapeHtml(bundle.profile?.repo_name || 'Repository')}</strong><br><span>${escapeHtml(bundle.profile?.repo_type || 'unknown')}</span></div></aside>
<main><header class="hero"><div><p class="eyebrow">${escapeHtml(heroEyebrow)}</p><h1>${escapeHtml(title)}</h1>${rootLine}</div><div class="actions"><input id="search" type="search" placeholder="Search report …"><button id="theme" type="button">Theme</button></div></header>${htmlSections}</main>
</div>
<script>${JS}</script>
</body>
</html>`;
}

const CSS = `
:root{--bg:#f4f7fb;--panel:#ffffff;--panel2:#f8fbff;--text:#142033;--muted:#64748b;--line:#dbe5f2;--accent:#3157ff;--accent2:#eaf0ff;--good:#087443;--bad:#b42318;--warn:#a15c07;--shadow:0 18px 42px rgba(35,54,86,.10)}
.dark{--bg:#07111f;--panel:#0d1b2d;--panel2:#0a1626;--text:#eaf1ff;--muted:#9fb0c7;--line:#203249;--accent:#91a7ff;--accent2:#152544;--good:#55d296;--bad:#ff8b7f;--warn:#ffc46b;--shadow:none}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.layout{display:grid;grid-template-columns:300px minmax(0,1fr);min-height:100vh}.sidebar{position:sticky;top:0;height:100vh;background:linear-gradient(180deg,var(--panel),var(--panel2));border-right:1px solid var(--line);padding:22px;overflow:auto}.brand{display:flex;gap:12px;align-items:center;margin-bottom:24px}.logo{width:44px;height:44px;border-radius:14px;background:var(--accent);color:white;display:grid;place-items:center;font-weight:800}.brand-title{font-weight:800}.brand-subtitle{color:var(--muted);font-size:12px}nav{display:grid;gap:5px}.nav-link{padding:10px 12px;border-radius:12px;text-decoration:none;color:var(--text);font-weight:650}.nav-link:hover,.nav-link.active{background:var(--accent2);color:var(--accent)}.side-note{margin-top:22px;border:1px solid var(--line);border-radius:16px;padding:14px;background:var(--panel)}main{padding:28px 34px 60px;min-width:0}.hero{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:22px}.eyebrow{letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:800;font-size:12px;margin:0 0 8px}h1{font-size:34px;line-height:1.08;margin:0 0 8px}h2{font-size:26px;margin:12px 0 16px}h3{margin:0 0 12px}h4{margin:16px 0 8px}.muted{color:var(--muted)}.small{font-size:12px}.actions{display:flex;gap:10px;align-items:center}input,button{border:1px solid var(--line);border-radius:14px;background:var(--panel);color:var(--text);padding:11px 14px;font:inherit}input{width:min(430px,42vw)}button{cursor:pointer;font-weight:750}.view{display:none}.view.active{display:block}.section-title{display:flex;align-items:center;justify-content:space-between}.grid{display:grid;gap:16px}.two{grid-template-columns:repeat(2,minmax(0,1fr))}.three{grid-template-columns:repeat(3,minmax(0,1fr))}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin:16px 0}.metrics.compact .card{box-shadow:none}.card{background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:18px;box-shadow:var(--shadow);margin-bottom:16px}.readout p,.prose-card p,.narrative-lead p,.statement p,.boundary-item p,.e2e-thread p,.family-card p,.analysis-doc-section p,.analysis-doc-lead p{font-size:15px;line-height:1.58}.accent{background:linear-gradient(135deg,var(--panel),var(--accent2))}.metric-value{font-size:26px;font-weight:900}.metric-label{text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:var(--muted);font-weight:800}.chip{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:4px 9px;margin:2px;background:var(--panel2);font-size:12px;font-weight:700}.chip.ok{border-color:rgba(8,116,67,.3);color:var(--good)}.chip.bad{border-color:rgba(180,35,24,.3);color:var(--bad)}.chip.warn{border-color:rgba(161,92,7,.35);color:var(--warn)}.chip.pending{color:var(--muted)}.kv{display:grid;grid-template-columns:150px 1fr;gap:10px;border-top:1px solid var(--line);padding:10px 0}.kv:first-child{border-top:0}.kv span{color:var(--muted)}pre{white-space:pre-wrap;word-break:break-word;background:var(--panel2);border:1px solid var(--line);border-radius:14px;padding:12px;overflow:auto}.thread-kicker,.doc-section-kicker{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);font-weight:900;margin-bottom:8px}.thread-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:14px 0}.thread-grid>div{border:1px solid var(--line);border-radius:16px;background:var(--panel2);padding:14px}.family-grid,.level-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px}.family-card,.level-card,.roadmap-item,.requirement-card{background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:18px;box-shadow:var(--shadow)}.family-head{display:flex;gap:8px;justify-content:space-between;align-items:flex-start}.family-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}.family-stats span,.jump-card{display:block;border:1px solid var(--line);border-radius:12px;background:var(--panel2);padding:9px;text-decoration:none;color:var(--text);margin-top:8px}.boundary-item{border-top:1px solid var(--line);padding:12px 0}.boundary-item:first-child{border-top:0}.mermaid-box{border:1px solid var(--line);border-left:5px solid var(--accent);border-radius:16px;background:var(--panel2);padding:12px;margin:12px 0}.mermaid-output{background:var(--panel);border-radius:12px;padding:12px;overflow:auto}.mermaid-output svg{max-width:100%;height:auto}.mermaid-source{max-height:360px}.statement{border-top:1px solid var(--line);padding:12px 0}.statement:first-child{border-top:0}.evidence-quick{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:10px 0 6px}.evidence-quick>span:first-child{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:900}.evidence-link{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:4px 8px;background:var(--accent2);color:var(--accent);text-decoration:none;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;font-weight:800}.evidence-link:hover{filter:brightness(.96)}.evidence summary,.mermaid-box summary{cursor:pointer;color:var(--accent);font-weight:800;margin-top:10px}.evidence-item,.evidence-row{border:1px solid var(--line);border-radius:14px;padding:10px;margin:8px 0;background:var(--panel2);scroll-margin-top:22px}.evidence-item.ok,.evidence-row.ok{border-left:5px solid var(--good)}.evidence-item.bad,.evidence-row.bad{border-left:5px solid var(--bad)}.evidence-item.evidence-highlight{box-shadow:0 0 0 3px var(--accent2)}.evidence-item:target{box-shadow:0 0 0 3px var(--accent2)}.bad-text{color:var(--bad)}.path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:800}.subitem{border-top:1px solid var(--line);padding:12px 0}.subitem:first-child{border-top:0}.step{display:grid;grid-template-columns:32px 1fr;gap:10px;border-top:1px solid var(--line);padding:12px 0}.step>span{width:28px;height:28px;border-radius:50%;background:var(--accent2);display:grid;place-items:center;font-weight:900;color:var(--accent)}.empty{padding:18px;border:1px dashed var(--line);border-radius:16px;color:var(--muted);background:var(--panel2)}.table-wrap{overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:20px;box-shadow:var(--shadow);margin-bottom:18px}table{border-collapse:collapse;width:100%;min-width:900px}th,td{border-bottom:1px solid var(--line);padding:12px;text-align:left;vertical-align:top}th{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);background:var(--panel2)}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.analysis-doc-section{display:grid;gap:16px}.analysis-doc-lead h2{font-size:30px}.doc-block{background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:18px;box-shadow:var(--shadow)}.doc-block.narrative{background:transparent;border:0;box-shadow:none;padding:4px 0}.section-intent{color:var(--muted);max-width:920px}.requirement-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:16px}.roadmap{display:grid;gap:12px}.hide{display:none!important}@media(max-width:1000px){.thread-grid{grid-template-columns:1fr}}@media(max-width:900px){.layout{grid-template-columns:1fr}.sidebar{position:relative;height:auto}.hero{display:block}.actions{margin-top:14px}input{width:100%}.two,.three{grid-template-columns:1fr}}
`;

const JS = `
(function(){
  const links=[...document.querySelectorAll('.nav-link')];
  const views=[...document.querySelectorAll('.view')];
  const firstId=views[0] ? views[0].id : '';
  function show(id){
    if(!document.getElementById(id)) id=firstId;
    views.forEach(v=>v.classList.toggle('active', v.id===id));
    links.forEach(a=>a.classList.toggle('active', a.dataset.section===id));
    if(location.hash !== '#'+id) history.replaceState(null,'','#'+id);
    window.scrollTo({top:0,behavior:'instant'});
  }
  links.forEach(a=>a.addEventListener('click', e=>{e.preventDefault(); show(a.dataset.section)}));
  window.addEventListener('hashchange',()=>show(location.hash.slice(1)||'overview'));
  show(location.hash.slice(1)||'overview');
  const search=document.getElementById('search');
  if(search){search.addEventListener('input',()=>{
    const q=search.value.trim().toLowerCase();
    document.querySelectorAll('.search-card').forEach(el=>{
      const txt=(el.dataset.search || el.textContent || '').toLowerCase();
      el.classList.toggle('hide', !!q && !txt.includes(q));
    });
  });}
  document.addEventListener('click', event=>{
    const link=event.target && event.target.closest ? event.target.closest('[data-evidence-target]') : null;
    if(!link) return;
    const target=document.getElementById(link.dataset.evidenceTarget || '');
    if(!target) return;
    event.preventDefault();
    const details=target.closest('details');
    if(details) details.open=true;
    document.querySelectorAll('.evidence-highlight').forEach(el=>el.classList.remove('evidence-highlight'));
    target.classList.add('evidence-highlight');
    target.scrollIntoView({block:'center',behavior:'smooth'});
    history.replaceState(null,'','#'+target.id);
  });
  const theme=document.getElementById('theme');
  if(theme) theme.addEventListener('click',()=>document.documentElement.classList.toggle('dark'));
  async function renderMermaid(){
    const boxes=[...document.querySelectorAll('[data-mermaid-box]')];
    if(!boxes.length) return;
    if(!window.mermaid){
      boxes.forEach(box=>{ const out=box.querySelector('.mermaid-output'); if(out) out.textContent='Mermaid renderer unavailable; source is shown below.'; });
      return;
    }
    window.mermaid.initialize({startOnLoad:false,securityLevel:'loose',suppressErrorRendering:true,theme:document.documentElement.classList.contains('dark')?'dark':'default'});
    for(let i=0;i<boxes.length;i++){
      const box=boxes[i];
      const src=box.querySelector('.mermaid-source');
      const out=box.querySelector('.mermaid-output');
      if(!src || !out) continue;
      try{
        const text=src.textContent || '';
        if(window.mermaid.parse) await window.mermaid.parse(text);
        const result=await window.mermaid.render('cognianalysis-mermaid-'+i, text);
        out.innerHTML=result.svg;
      }catch(err){
        out.textContent='Diagram source could not be rendered safely; source is shown below.';
      }
    }
  }
  if(document.readyState==='complete') renderMermaid();
  else window.addEventListener('load', renderMermaid);
})();
`;

import { Path, ensureDir, escapeHtml, loadJson, utcNow, writeJson, writeText } from './utils';
import { loadBundle } from './aggregate';

export function renderReport(analysisDir: string, outputDir?: string, title?: string): string {
  const bundle = publicReportBundle(loadBundle(analysisDir));
  const out = outputDir || Path.join(analysisDir, 'report');
  ensureDir(out);
  const reportTitle = title
    || bundle.analysis_document?.title
    || `Cognianalysis Decision Report · ${bundle.analysis?.repo?.name || bundle.profile?.repo_name || 'Repository'}`;
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
  const line = ev?.line === undefined || ev?.line === null || ev?.line === '' ? 1 : ev.line;
  return `${ev?.path || ''}:${line}`;
}

function evidenceHtml(items: any): string {
  if (!Array.isArray(items) || !items.length) return '';
  const body = items.slice(0, 16).map((ev: any) => {
    const ok = ev && ev.valid !== false;
    const label = evidenceLabel(ev);
    const id = `evidence-${++evidenceRenderCounter}`;
    return `<div class="evidence-item ${ok ? 'ok' : 'bad'}" id="${id}"><div class="path">${escapeHtml(label)}</div>${ev?.symbol ? `<div class="small muted">${escapeHtml(ev.symbol)}</div>` : ''}${ev?.reason ? `<div class="small bad-text">${escapeHtml(ev.reason)}</div>` : ''}${ev?.snippet ? `<pre>${escapeHtml(ev.snippet)}</pre>` : ''}</div>`;
  }).join('');
  const more = items.length > 16 ? `<div class="small muted">+${items.length - 16} additional evidence references</div>` : '';
  return `<details class="evidence"><summary>Evidence details (${items.length})</summary><div class="evidence-list">${body}${more}</div></details>`;
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

function evidenceGapOf(item: any): string {
  return firstText(item?.evidence_gap, item?.missing_evidence, item?.proof_gap);
}

function evidenceGapHtml(item: any): string {
  const gap = evidenceGapOf(item);
  return gap ? `<div class="evidence-gap"><strong>Evidence gap</strong><p>${escapeHtml(gap)}</p></div>` : '';
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
    return `<div class="statement"><strong>${escapeHtml(title)}</strong>${x.confidence ? ` ${confidenceChip(x.confidence)}` : ''}${x.severity ? ` ${riskChip(x.severity)}` : ''}${x.owner ? ` ${chip(x.owner)}` : ''}${text ? `<p>${escapeHtml(text)}</p>` : ''}${evidenceGapHtml(x)}${evidenceHtml(evidenceOf(x))}</div>`;
  });
}

function mermaidBlock(source: any, evidence?: any): string {
  const text = typeof source === 'string' ? source : firstText(source?.source, source?.mermaid);
  if (!text) return '';
  return `<div class="mermaid-box" data-mermaid-box><div class="mermaid-output muted small">Rendering Mermaid diagram...</div><details><summary>Mermaid source</summary><pre class="mermaid-source">${escapeHtml(text)}</pre></details>${evidenceHtml(evidence || evidenceOf(source))}</div>`;
}

function sectionTasks(bundle: any): string {
  const rows = Array.isArray(bundle.workpack_manifest?.workpacks) && bundle.workpack_manifest.workpacks.length
    ? bundle.workpack_manifest.workpacks.map((w: any) => ({
      title: w.title || w.id,
      task_file: `workpacks/${w.id}.md`,
      expected_output: w.output_path,
      status: w.required ? 'required' : 'optional'
    }))
    : (bundle.tasks || []);
  return listItems(rows, (t: any) => card(t.title || t.task_file, `<div>${chip(t.status || 'pending')}</div><div class="kv"><span>Task</span><code>${escapeHtml(t.task_file)}</code></div><div class="kv"><span>Output</span><code>${escapeHtml(t.expected_output)}</code></div>`));
}

function collectEvidenceGaps(value: any, out: any[] = [], path: string[] = []): any[] {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectEvidenceGaps(item, out, [...path, String(index)]));
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  const gap = evidenceGapOf(value);
  if (gap) {
    out.push({
      title: firstText(value.title, value.name, value.id, value.question, path[path.length - 1], 'Evidence gap'),
      summary: gap,
      severity: value.blocking ? 'blocking' : value.severity,
      evidence: evidenceOf(value)
    });
  }
  for (const [key, child] of Object.entries(value)) {
    if (key !== 'evidence' && key !== 'evidence_refs') collectEvidenceGaps(child, out, [...path, key]);
  }
  return out;
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

function renderLayeredExplanation(block: any): string {
  const rows = [
    ['Plain language', firstText(block.plain_language, block.what_happens, block.summary, block.description)],
    ['Why it matters', firstText(block.business_context, block.why_it_matters, block.business_need, block.business_use)],
    ['Technical detail', firstText(block.technical_detail, block.technical_drilldown, block.implementation_detail)],
    ['Operational impact', firstText(block.operational_impact, block.risk, block.process_impact)]
  ].filter(([, value]) => value);
  const body = rows.map(([label, value]) => `<div class="subitem"><h4>${escapeHtml(label)}</h4>${paragraphs(value)}</div>`).join('');
  return `${body}${evidenceHtml(evidenceOf(block))}`;
}

function renderStructuredValue(value: any): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'string') return `<pre>${escapeHtml(value)}</pre>`;
  return `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
}

function renderFieldList(title: string, value: any): string {
  const items = Array.isArray(value) ? value : [];
  if (!items.length) return '';
  const body = statementList(items.map((item: any) => typeof item === 'string' ? { title: item } : item));
  return body ? `<h4>${escapeHtml(title)}</h4>${body}` : '';
}

function renderApiContracts(block: any): string {
  const apis = block.apis || block.items || block.contracts || [];
  const cards = listItems(apis, (api: any) => {
    const title = firstText(api.name, api.title, api.endpoint, api.path, api.operation) || labelFor(block, 'api', 'API');
    const meta = [
      api.protocol,
      api.method,
      api.path || api.endpoint,
      api.controller || api.handler,
      api.auth || api.authentication
    ].filter(Boolean);
    return `<article class="card search-card" data-search="${escapeHtml(`${title} ${meta.join(' ')} ${api.purpose || ''} ${api.description || ''}`)}">
      <div class="family-head"><h3>${escapeHtml(title)}</h3><div>${chips(meta)}</div></div>
      ${paragraphs([api.purpose, api.description, api.business_use, api.technical_detail].filter(Boolean))}
      ${renderFieldList(labelFor(block, 'request_fields', 'Request fields'), api.request_fields || api.request)}
      ${renderFieldList(labelFor(block, 'response_fields', 'Response fields'), api.response_fields || api.response)}
      ${renderFieldList(labelFor(block, 'errors', 'Errors / failure modes'), api.errors || api.failure_modes)}
      ${evidenceHtml(evidenceOf(api))}
    </article>`;
  });
  return `${paragraphs(firstText(block.summary, block.description))}${cards ? `<div class="grid two">${cards}</div>` : ''}${evidenceHtml(evidenceOf(block))}`;
}

function renderRequestResponseExamples(block: any): string {
  const examples = block.examples || block.items || [];
  const cards = listItems(examples, (example: any) => {
    const title = firstText(example.title, example.name, example.scenario, example.endpoint) || labelFor(block, 'example', 'Example');
    const origin = firstText(example.example_origin, example.origin) || 'unknown';
    return `<article class="card search-card" data-search="${escapeHtml(`${title} ${origin} ${example.notes || ''} ${example.description || ''}`)}">
      <div class="family-head"><h3>${escapeHtml(title)}</h3>${chip(origin)}</div>
      ${paragraphs(firstText(example.notes, example.description, example.business_context))}
      ${example.request !== undefined ? `<h4>${escapeHtml(labelFor(block, 'request', 'Request'))}</h4>${renderStructuredValue(example.request)}` : ''}
      ${example.response !== undefined ? `<h4>${escapeHtml(labelFor(block, 'response', 'Response'))}</h4>${renderStructuredValue(example.response)}` : ''}
      ${example.error !== undefined ? `<h4>${escapeHtml(labelFor(block, 'error', 'Error'))}</h4>${renderStructuredValue(example.error)}` : ''}
      ${evidenceHtml(evidenceOf(example))}
    </article>`;
  });
  return `${paragraphs(firstText(block.summary, block.description))}${cards ? `<div class="grid two">${cards}</div>` : ''}${evidenceHtml(evidenceOf(block))}`;
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

function renderCapabilityCoverage(block: any): string {
  const capabilities = block.capabilities || block.items || block.levels || [];
  const body = listItems(capabilities, (cap: any) => {
    const title = firstText(cap.label, cap.title, cap.name, cap.capability_id, cap.level) || labelFor(block, 'capability', 'Capability');
    const status = firstText(cap.status, cap.verdict, cap.coverage) || labelFor(block, 'status', 'coverage');
    const sectionLinks = Array.isArray(cap.covered_by_sections)
      ? `<div class="small muted">${escapeHtml(labelFor(block, 'covered_by_sections', 'Covered by sections'))}</div><div>${chips(cap.covered_by_sections)}</div>`
      : '';
    const nextSteps = Array.isArray(cap.next_steps) && cap.next_steps.length
      ? `<h4>${escapeHtml(labelFor(block, 'next_steps', 'Next steps'))}</h4>${chips(cap.next_steps)}`
      : '';
    return `<article class="level-card search-card" data-search="${escapeHtml(`${title} ${status} ${cap.summary || ''} ${cap.thesis_impact || ''}`)}">
      <div class="family-head"><h3>${escapeHtml(title.replace(/_/g, ' '))}</h3>${statusChip(status)}</div>
      ${paragraphs([cap.summary, cap.thesis_impact, cap.description, cap.rationale].filter(Boolean))}
      ${sectionLinks}
      ${nextSteps}
      ${evidenceHtml(evidenceOf(cap))}
    </article>`;
  });
  return `${body ? `<div class="level-grid">${body}</div>` : ''}${evidenceHtml(evidenceOf(block))}`;
}

function renderSourceCoverageTrace(block: any): string {
  const metrics = Array.isArray(block.metrics) && block.metrics.length ? block.metrics : [
    { label: labelFor(block, 'included_files', 'Included files'), value: block.included_files ?? block.total_files ?? '' },
    { label: labelFor(block, 'tier1_file_cards', 'Tier 1 file cards'), value: block.tier1_file_cards ?? block.file_cards ?? block.covered_files ?? '' },
    { label: labelFor(block, 'missing_tier1_file_cards', 'Missing Tier 1 cards'), value: block.missing_tier1_file_cards ?? block.missing_files ?? '' },
    { label: labelFor(block, 'source_tier_tasks', 'Source tier tasks'), value: block.source_tier_tasks ?? block.task_status ?? '' }
  ].filter(metric => metric.value !== undefined && metric.value !== null && metric.value !== '');
  const impacts = block.source_family_impacts || block.families || [];
  const familyCards = listItems(impacts, (item: any) => {
    const name = firstText(item.source_family, item.name, item.title, item.family) || labelFor(block, 'source_family', 'Source family');
    return `<article class="family-card search-card" data-search="${escapeHtml(`${name} ${item.thesis_impact || ''} ${item.summary || ''}`)}">
      <div class="family-head"><h3>${escapeHtml(name)}</h3>${item.file_count !== undefined ? chip(`${item.file_count} files`) : statusChip(item.confidence || item.status || 'impact')}</div>
      ${paragraphs([item.thesis_impact, item.summary, item.business_use, item.technical_shape, item.confidence_rationale].filter(Boolean))}
      ${evidenceHtml(evidenceOf(item))}
    </article>`;
  });
  return `${paragraphs(firstText(block.summary, block.thesis_impact_summary, block.description))}
    ${metrics.length ? renderDocMetricGrid({ ...block, metrics }) : ''}
    ${familyCards ? `<div class="family-grid">${familyCards}</div>` : ''}
    ${evidenceHtml(evidenceOf(block))}`;
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
  const intro = paragraphs(firstText(block.summary, block.description));
  const questions = statementList((block.items || []).map((q: any) => ({
    title: q.question || q.title || labelFor(block, 'question', 'Open question'),
    description: q.reason || q.why_it_matters || q.description || q.evidence_gap,
    owner: q.owner || q.impact,
    severity: q.blocking ? 'blocking' : q.priority,
    confidence: q.status,
    evidence: q.evidence,
    evidence_gap: q.evidence_gap || q.missing_evidence || q.proof_gap
  })));
  return intro + questions + evidenceHtml(evidenceOf(block));
}

function renderEvidenceIndex(block: any): string {
  const items = Array.isArray(block.items) ? block.items : [];
  if (!items.length) return evidenceHtml(evidenceOf(block));
  const rows = items.slice(0, 200).map((ev: any) => {
    const ok = ev && ev.valid !== false;
    return `<div class="evidence-row ${ok ? 'ok' : 'bad'}">
      <div class="path">${escapeHtml(evidenceLabel(ev))}</div>
      ${ev?.claim_id ? `<div class="small muted">Claim: ${escapeHtml(ev.claim_id)}</div>` : ''}
      ${ev?.symbol ? `<div class="small muted">${escapeHtml(ev.symbol)}</div>` : ''}
      ${ev?.reason ? `<div class="small bad-text">${escapeHtml(ev.reason)}</div>` : ''}
      ${ev?.snippet ? `<pre>${escapeHtml(ev.snippet)}</pre>` : ''}
    </div>`;
  }).join('');
  const more = items.length > 200 ? `<p class="small muted">+${items.length - 200} additional evidence references</p>` : '';
  return `<div class="evidence-list">${rows}${more}</div>${evidenceHtml(evidenceOf(block))}`;
}

function reportQualityBlock(review: any): string {
  if (!review || typeof review !== 'object') return '';
  return renderDocBlock({
    type: 'statement_list',
    title: 'Report Quality Self-Review',
    items: [
      {
        title: review.verdict || 'Report quality review',
        summary: review.rationale || '',
        confidence: review.confidence,
        evidence: evidenceOf(review)
      },
      ...(Array.isArray(review.blocking_gaps) ? review.blocking_gaps.map((gap: any, index: number) => ({
        title: gap.title || gap.id || `Blocking gap ${index + 1}`,
        summary: gap.summary || gap.description || gap.reason || String(gap || ''),
        severity: 'blocking',
        evidence: evidenceOf(gap),
        evidence_gap: evidenceGapOf(gap)
      })) : []),
      ...(Array.isArray(review.limitations) ? review.limitations.map((item: any, index: number) => ({
        title: item.title || item.id || `Limitation ${index + 1}`,
        summary: item.summary || item.description || item.reason || String(item || ''),
        evidence: evidenceOf(item),
        evidence_gap: evidenceGapOf(item)
      })) : [])
    ]
  });
}

function authoredReportSections(doc: any): any[] {
  const report = doc?.authored_report || doc?.freeform_report || doc?.narrative_report;
  if (!report || typeof report !== 'object' || Array.isArray(report)) return [];
  const sections = Array.isArray(report.sections) ? report.sections : [];
  return sections
    .filter((section: any) => section && typeof section === 'object' && !Array.isArray(section))
    .filter((section: any) => firstText(section.title, section.id) || textLike(section.body) || textLike(section.paragraphs) || Array.isArray(section.subsections));
}

function renderProseParagraphs(values: any): string {
  const items = Array.isArray(values) ? values : [values];
  return items
    .map((value: any) => {
      if (typeof value === 'string') return value.trim();
      return firstText(value?.text, value?.body, value?.summary, value?.description, value?.rationale, value?.recommendation);
    })
    .filter(Boolean)
    .map((value: string) => `<p>${escapeHtml(value)}</p>`)
    .join('');
}

function renderBullets(items: any): string {
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) return '';
  return `<ul class="report-bullets">${rows.map((item: any) => {
    if (typeof item === 'string') return `<li>${escapeHtml(item)}</li>`;
    const title = firstText(item.title, item.label, item.name);
    const text = firstText(item.text, item.description, item.summary, item.impact, item.recommendation);
    return `<li>${title ? `<strong>${escapeHtml(title)}:</strong> ` : ''}${escapeHtml(text || title || '')}${evidenceHtml(evidenceOf(item))}</li>`;
  }).join('')}</ul>`;
}

function renderAuthoredCallouts(items: any): string {
  const callouts = Array.isArray(items) ? items : [];
  if (!callouts.length) return '';
  return `<div class="callout-grid">${callouts.map((item: any) => {
    const title = firstText(item.title, item.label, item.name) || 'Note';
    const tone = sectionId(item.tone || item.kind || item.severity || 'note', 'note');
    const body = renderProseParagraphs(item.body || item.text || item.paragraphs || item.summary || item.description);
    return `<aside class="report-callout ${escapeHtml(tone)}"><strong>${escapeHtml(title)}</strong>${body}${renderBullets(item.items || item.bullets)}${evidenceHtml(evidenceOf(item))}</aside>`;
  }).join('')}</div>`;
}

function renderAuthoredSubsections(items: any): string {
  const subsections = Array.isArray(items) ? items : [];
  return subsections.map((item: any) => {
    const title = firstText(item.title, item.heading, item.name);
    const body = [
      renderProseParagraphs(item.body || item.paragraphs || item.text || item.summary || item.description),
      renderBullets(item.bullets || item.items),
      renderAuthoredCallouts(item.callouts),
      evidenceHtml(evidenceOf(item))
    ].join('');
    return title || body ? `<section class="report-subsection">${title ? `<h3>${escapeHtml(title)}</h3>` : ''}${body}</section>` : '';
  }).join('');
}

function renderAuthoredTechnicalBlocks(section: any): string {
  const blocks = Array.isArray(section.technical_blocks)
    ? section.technical_blocks
    : Array.isArray(section.blocks)
      ? section.blocks.filter((block: any) => block && block.render_in_freeform === true)
      : [];
  if (!blocks.length) return '';
  return `<div class="technical-annex">${blocks.map((block: any) => renderDocBlock(block)).join('')}</div>`;
}

function renderAuthoredReportSection(section: any): string {
  const kicker = firstText(section.kicker, section.level, section.audience);
  const intent = firstText(section.intent, section.summary);
  const lead = renderProseParagraphs(section.lead || section.opening);
  const body = renderProseParagraphs(section.body || section.paragraphs || section.text);
  const bullets = renderBullets(section.bullets || section.key_points);
  const callouts = renderAuthoredCallouts(section.callouts);
  const subsections = renderAuthoredSubsections(section.subsections);
  const technicalBlocks = renderAuthoredTechnicalBlocks(section);
  const evidence = evidenceHtml(evidenceOf(section));
  return `<article class="analysis-doc-section authored-report-section">
    ${kicker ? `<p class="doc-section-kicker">${escapeHtml(kicker)}</p>` : ''}
    ${intent ? `<p class="section-intent">${escapeHtml(intent)}</p>` : ''}
    <div class="report-prose">${lead}${body}${bullets}${callouts}${subsections}</div>
    ${technicalBlocks}
    ${evidence}
  </article>`;
}

function renderDocBlock(block: any): string {
  const title = block.title ? `<h3>${escapeHtml(block.title)}</h3>` : '';
  let body = '';
  switch (block.type) {
    case 'metric_grid': body = renderDocMetricGrid(block); break;
    case 'source_family_map': body = renderSourceFamilyMap(block); break;
    case 'boundary_map': body = renderBoundaryMap(block); break;
    case 'layered_explanation': body = renderLayeredExplanation(block); break;
    case 'api_contracts': body = renderApiContracts(block); break;
    case 'request_response_examples': body = renderRequestResponseExamples(block); break;
    case 'flow': body = renderDocFlow(block); break;
    case 'four_level_assessment': body = renderFourLevelAssessment(block); break;
    case 'capability_coverage': body = renderCapabilityCoverage(block); break;
    case 'source_coverage_trace': body = renderSourceCoverageTrace(block); break;
    case 'decision_matrix': body = renderDecisionMatrix(block); break;
    case 'roadmap': body = renderRoadmap(block); break;
    case 'agent_plan': body = renderAgentPlan(block); break;
    case 'technical_drilldown': body = renderTechnicalDrilldown(block); break;
    case 'open_questions': body = renderOpenQuestions(block); break;
    case 'evidence_index': body = renderEvidenceIndex(block); break;
    case 'statement_list': body = statementList(block.items || []) + evidenceHtml(evidenceOf(block)); break;
    case 'narrative':
    default: body = paragraphs(block.text || block.paragraphs || block.summary || block.description || block.business_need || block.business_use || block.technical_drilldown) + evidenceHtml(evidenceOf(block)); break;
  }
  if (!title && !body) return '';
  return `<div class="doc-block ${escapeHtml(block.type || 'narrative')}">${title}${body}</div>`;
}

function analysisDocumentSections(bundle: any): [string, string, string][] {
  const doc = bundle.analysis_document || {};
  if (!doc) return [];
  const freeformSections = authoredReportSections(doc);
  if (freeformSections.length) {
    const used = new Set<string>();
    return freeformSections.map((section: any, index: number) => {
      let id = sectionId(section.id || section.title, `report-${index + 1}`);
      while (used.has(id)) id = `${id}-${index + 1}`;
      used.add(id);
      const label = firstText(section.title, section.id, `Section ${index + 1}`);
      return [id, label, renderAuthoredReportSection(section)] as [string, string, string];
    });
  }
  if (!Array.isArray(doc.sections) || !doc.sections.length) return [];
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
  const evidenceAudit = hasAuthoredEvidenceGovernance(doc) ? null : evidenceAuditSection(bundle);
  if (evidenceAudit) sections.push(evidenceAudit);
  return sections;
}

function hasAuthoredEvidenceGovernance(doc: any): boolean {
  const sections = Array.isArray(doc?.sections) ? doc.sections : [];
  return sections.some((section: any) => {
    const level = String(section?.level || '').toLowerCase();
    const title = String(section?.title || '').toLowerCase();
    const blocks = Array.isArray(section?.blocks) ? section.blocks : [];
    const hasEvidenceBlock = blocks.some((block: any) => ['open_questions', 'evidence_index', 'agent_plan'].includes(String(block?.type || '').toLowerCase()));
    return hasEvidenceBlock && (
      level.includes('evidence')
      || level.includes('governance')
      || level.includes('method')
      || title.includes('evidence')
      || title.includes('method')
      || title.includes('open question')
    );
  });
}

function pendingAnalysisDocumentSections(bundle: any): [string, string, string][] {
  const tasks = bundle.tasks || [];
  const workpacks = Array.isArray(bundle.workpack_manifest?.workpacks) ? bundle.workpack_manifest.workpacks : [];
  const body = `<article class="analysis-doc-lead card accent search-card" data-search="awaiting llm authored analysis document report incomplete">
    <p class="eyebrow">LLM-authored analysis document required</p>
    <h2>Report pending · ${escapeHtml(bundle.profile?.repo_name || 'Repository')}</h2>
    <p>The CLI has prepared deterministic inventory and harness workpacks. Open <code>.analysis/TASK.md</code> in your agent harness, then rerun <code>cognianalysis analyze .</code> after the agent writes <code>.analysis/analysis.json</code>.</p>
    <div class="metrics compact">
      ${metric('Report mode', bundle.report_mode?.state || 'awaiting_llm_authored_report')}
      ${metric('Generated workpacks', workpacks.length || tasks.length)}
      ${metric('Source inventory files', (bundle.source_inventory_accounting || bundle.source_coverage)?.total_files || bundle.profile?.source_files || 0)}
    </div>
  </article>
  <article class="analysis-doc-section">
    <p class="doc-section-kicker">prepared harness inputs</p>
    <p class="section-intent">These deterministic artifacts are navigation aids only. They are not semantic findings.</p>
    ${card('Next LLM Tasks', sectionTasks(bundle), 'prose-card')}
  </article>`;
  return [['analysis-document-pending', 'Analysis Document Pending', body]];
}

function evidenceAuditSection(bundle: any): [string, string, string] | null {
  const validation = bundle.analysis_evidence_validation || {};
  const invalidEvidence = Array.isArray(validation.invalid_evidence) ? validation.invalid_evidence : [];
  const unsupported = Array.isArray(validation.unsupported_claims) ? validation.unsupported_claims : [];
  const allEvidence = Array.isArray(validation.evidence) && validation.evidence.length ? validation.evidence : (bundle.analysis?.evidence_index || []);
  const openQuestions = Array.isArray(bundle.analysis?.open_questions) ? bundle.analysis.open_questions : (bundle.analysis_document?.open_questions || []);
  const reportQuality = bundle.analysis?.report_quality_review || bundle.analysis_document?.report_quality_review;
  const blockingQuestions = openQuestions.filter((q: any) => q?.blocking === true);
  const evidenceGaps = collectEvidenceGaps(bundle.analysis || {}).slice(0, 80);
  if (!invalidEvidence.length && !unsupported.length && !allEvidence.length && !openQuestions.length && !reportQuality && !evidenceGaps.length) return null;
  const blocks = [
    renderDocBlock({
      type: 'metric_grid',
      title: 'Evidence Integrity Summary',
      metrics: [
        { label: 'Invalid evidence', value: invalidEvidence.length },
        { label: 'Unsupported major claims', value: unsupported.length },
        { label: 'Evidence gaps', value: evidenceGaps.length },
        { label: 'Open questions', value: openQuestions.length }
      ]
    }),
    blockingQuestions.length ? renderDocBlock({ type: 'open_questions', title: 'Blocking Open Questions', items: blockingQuestions }) : '',
    unsupported.length ? renderDocBlock({
      type: 'statement_list',
      title: 'Unsupported Major Claims',
      items: unsupported.map((claim: any) => ({
        title: claim.title || claim.id || 'Unsupported claim',
        summary: claim.summary || claim.category || '',
        severity: 'unsupported',
        evidence_gap: claim.evidence_gap || 'Major claim needs file:line evidence, explicit evidence_gap or open-question treatment.'
      }))
    }) : '',
    evidenceGaps.length ? renderDocBlock({
      type: 'statement_list',
      title: 'Explicit Evidence Gaps',
      items: evidenceGaps
    }) : '',
    invalidEvidence.length ? renderDocBlock({ type: 'evidence_index', title: 'Invalid Evidence References', items: invalidEvidence }) : '',
    allEvidence.length ? renderDocBlock({ type: 'evidence_index', title: 'Global Evidence Index', items: allEvidence }) : '',
    openQuestions.length ? renderDocBlock({ type: 'open_questions', title: 'Open Questions', items: openQuestions }) : '',
    reportQualityBlock(reportQuality)
  ].filter(Boolean).join('');
  const body = `<article class="analysis-doc-section">
    <p class="doc-section-kicker">evidence integrity</p>
    <p class="section-intent">This section is rendered from authored evidence references and deterministic path:line validation. It does not replace semantic judgement.</p>
    ${blocks}
  </article>`;
  return ['evidence-audit', 'Evidence & Open Questions', body];
}

const CORE_CAPABILITY_IDS = [
  'reverse_engineering_documentation',
  'code_analysis',
  'process_analysis',
  'refactoring_target_architecture'
];

function normalizedCapabilityId(value: any): string {
  const id = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (id === 'reverse_engineering' || id === 'documentation' || id === 'reverse_engineering_and_documentation') return 'reverse_engineering_documentation';
  if (id === 'process' || id === 'business_process_analysis') return 'process_analysis';
  if (id === 'refactoring' || id === 'modernization' || id === 'refactoring_modernization' || id === 'target_architecture') return 'refactoring_target_architecture';
  return id;
}

function coverageRows(doc: any): any[] {
  const rows = doc?.core_capability_coverage || doc?.capability_coverage || doc?.four_core_capabilities;
  return Array.isArray(rows) ? rows : [];
}

function capabilityCoverageStatusCovered(value: any): boolean {
  return ['covered', 'complete', 'decision_ready', 'ready'].includes(String(value || '').trim().toLowerCase());
}

function capabilityCoverageReady(doc: any): boolean {
  const rows = coverageRows(doc);
  if (!rows.length) return false;
  const byId = new Map<string, any>();
  rows.forEach((row: any) => byId.set(normalizedCapabilityId(row?.capability_id || row?.id || row?.level || row?.label), row));
  return CORE_CAPABILITY_IDS.every(id => {
    const row = byId.get(id);
    return row
      && capabilityCoverageStatusCovered(row.status || row.coverage || row.verdict)
      && firstText(row.summary, row.description, row.thesis_impact).length >= 80
      && Array.isArray(row.covered_by_sections)
      && row.covered_by_sections.length > 0;
  });
}

function numberField(value: any, keys: string[]): number | null {
  for (const key of keys) {
    const raw = value?.[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const num = Number(raw);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function wholeFileTrace(doc: any): any {
  return doc?.whole_file_thesis_trace || doc?.whole_repository_file_accounting || doc?.source_coverage_trace || null;
}

function wholeFileTraceReady(doc: any, bundle: any): boolean {
  const trace = wholeFileTrace(doc);
  if (!trace || typeof trace !== 'object' || Array.isArray(trace)) return false;
  const included = numberField(trace, ['included_files', 'total_files', 'file_count']);
  const cards = numberField(trace, ['tier1_file_cards', 'file_cards', 'covered_files']);
  const missing = numberField(trace, ['missing_tier1_file_cards', 'missing_files', 'missing']);
  const familyImpacts = trace.source_family_impacts || trace.families || trace.impacts;
  const sourceCoverage = bundle?.source_tier_coverage || {};
  const expectedTotal = Number(sourceCoverage.total_files || 0);
  const expectedCards = Number(sourceCoverage.tier1_file_cards || 0);
  if (included === null || cards === null || missing === null || missing !== 0) return false;
  const auditCountsOk = sourceCoverage.complete !== true
    || ((expectedTotal === 0 || included >= expectedTotal) && (expectedCards === 0 || cards >= expectedCards));
  return auditCountsOk
    && firstText(trace.summary, trace.thesis_impact_summary, trace.description).length >= 120
    && Array.isArray(familyImpacts)
    && familyImpacts.length > 0;
}

function reportTrustStatus(bundle: any): any {
  const requestMode = String(bundle.product_analysis_request?.mode || bundle.analysis?.mode || bundle.analysis_document?.mode || '').toLowerCase();
  const completeAudit = requestMode === 'complete-audit' || requestMode === 'complete';
  const authoredDoc = bundle.analysis_document || bundle.analysis || {};
  const capabilityRows = coverageRows(authoredDoc);
  const wholeTrace = wholeFileTrace(authoredDoc);
  const checks = [
    {
      id: 'source_tier_coverage',
      label: 'Whole-repo Tier 1 file-card coverage',
      ready: !completeAudit || bundle.source_tier_coverage?.complete === true,
      detail: `${Number(bundle.source_tier_coverage?.tier1_file_cards || 0)}/${Number(bundle.source_tier_coverage?.total_files || 0)} files`
    },
    {
      id: 'skill_workbenches',
      label: 'Planned skill workbenches',
      ready: !completeAudit || bundle.skill_workbench_coverage?.complete === true,
      detail: String(bundle.skill_workbench_coverage?.status || 'missing')
    },
    {
      id: 'detail_reviews',
      label: 'Planned source-family detail reviews',
      ready: !completeAudit || bundle.source_family_detail_review_coverage?.complete === true,
      detail: String(bundle.source_family_detail_review_coverage?.status || 'missing')
    },
    {
      id: 'requirements_trace',
      label: 'Requirements trace',
      ready: !completeAudit || bundle.analysis_document_requirements_trace_contract?.complete === true,
      detail: bundle.analysis_document_requirements_trace_contract?.complete === true ? 'complete' : 'missing or incomplete'
    },
    {
      id: 'goal_trace',
      label: 'Goal trace alignment',
      ready: !completeAudit || bundle.analysis_goal_trace_alignment?.complete === true,
      detail: bundle.analysis_goal_trace_alignment?.complete === true ? 'complete' : 'missing or incomplete'
    },
    {
      id: 'quality_review',
      label: 'LLM report quality review',
      ready: !completeAudit || (
        bundle.analysis_document_quality_review?.complete === true
        && bundle.analysis_document_quality_review?.verdict_is_decision_ready === true
      ),
      detail: `complete=${bundle.analysis_document_quality_review?.complete === true}, decision_ready=${bundle.analysis_document_quality_review?.verdict_is_decision_ready === true}`
    },
    {
      id: 'consistency_review',
      label: 'Consistency review',
      ready: !completeAudit || bundle.analysis_document_consistency_review?.complete === true,
      detail: bundle.analysis_document_consistency_review?.complete === true ? 'complete' : 'missing or incomplete'
    },
    {
      id: 'semantic_lineage',
      label: 'Semantic lineage',
      ready: !completeAudit || bundle.analysis_document_semantic_lineage?.complete === true,
      detail: bundle.analysis_document_semantic_lineage?.complete === true ? 'complete' : 'missing or incomplete'
    },
    {
      id: 'core_capability_coverage_model',
      label: 'LLM-authored four-core-capability coverage model',
      ready: capabilityCoverageReady(authoredDoc),
      detail: `${capabilityRows.length}/${CORE_CAPABILITY_IDS.length} coverage rows`
    },
    {
      id: 'whole_file_thesis_trace',
      label: 'LLM-authored whole-file thesis trace',
      ready: wholeFileTraceReady(authoredDoc, bundle),
      detail: wholeTrace ? 'present' : 'missing'
    },
    {
      id: 'final_synthesis',
      label: 'Final synthesis readiness',
      ready: !completeAudit || bundle.report_mode?.final_synthesis_ready === true,
      detail: bundle.report_mode?.final_synthesis_ready === true ? 'ready' : String(bundle.report_mode?.synthesis_stage || 'not ready')
    },
    {
      id: 'artifact_graph',
      label: 'Artifact dependency graph',
      ready: !completeAudit || bundle.artifact_dependency_graph?.complete === true,
      detail: bundle.artifact_dependency_graph?.complete === true ? 'complete' : 'missing or incomplete'
    }
  ];
  const missing = checks.filter(check => !check.ready);
  return {
    mode: requestMode || 'unknown',
    completeAudit,
    ready: missing.length === 0 && (completeAudit ? true : bundle.report_mode?.final_synthesis_ready === true),
    missing,
    checks
  };
}

function trustBannerHtml(bundle: any): string {
  const trust = reportTrustStatus(bundle);
  const title = trust.ready ? 'Trusted final report' : 'Draft report - not trusted final';
  const detail = trust.ready
    ? 'All configured readiness gates are complete for this run.'
    : 'This HTML is inspectable as a draft, but it is not a full trusted whole-repository report until every readiness gate below is complete.';
  const missing = trust.missing.slice(0, 10).map((item: any) => `<li><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.detail || '')}</span></li>`).join('');
  return `<aside class="trust-banner ${trust.ready ? 'ready' : 'draft'}">
    <div>
      <p class="eyebrow">${escapeHtml(trust.mode)} readiness</p>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(detail)}</p>
    </div>
    <div class="trust-status">${trust.ready ? chip('ready', 'ok') : chip(`${trust.missing.length} blocking gates`, 'bad')}${chip(`mode: ${trust.mode}`)}</div>
    ${missing ? `<ul>${missing}</ul>` : ''}
  </aside>`;
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
  const htmlSections = sections.map(([id, label, body]) => `<section class="view report-section" id="${id}"><div class="section-title"><h2>${escapeHtml(label)}</h2></div>${body}</section>`).join('\n');
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
<a class="skip-link" href="#report">Skip to report</a>
<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="#report" aria-label="${escapeHtml(shellTitle)} home"><div class="logo">${escapeHtml(initials(shellTitle))}</div><div><div class="brand-title">${escapeHtml(shellTitle)}</div><div class="brand-subtitle">${escapeHtml(shellSubtitle)}</div></div></a>
    <nav class="nav" aria-label="Report navigation">${nav}</nav>
  </div>
</header>
<main id="report" class="page-shell">
  <section class="intro-band">
    <div>
      <p class="eyebrow">${escapeHtml(heroEyebrow)}</p>
      <h1>${escapeHtml(title)}</h1>
      ${rootLine}
    </div>
    <aside class="scope-card">
      <strong>${escapeHtml(bundle.profile?.repo_name || 'Repository')}</strong>
      <span>${escapeHtml(bundle.profile?.repo_type || 'unknown')}</span>
      <label class="search-label" for="search">Search report</label>
      <input id="search" type="search" placeholder="Search findings, APIs, risks">
      <button id="theme" type="button">Theme</button>
    </aside>
  </section>
  ${trustBannerHtml(bundle)}
  ${htmlSections}
</main>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>${JS}</script>
</body>
</html>`;
}

const CSS = `
:root{--paper:#fbfbf8;--panel:#ffffff;--panel2:#f6f7f3;--ink:#1f2933;--muted:#617082;--line:#d9ded8;--red:#b83b42;--red-soft:#f7e5e6;--gold:#a36a00;--gold-soft:#f8edd2;--teal:#197b76;--teal-soft:#dff2ef;--blue:#315f95;--blue-soft:#e6eef8;--green:#55723b;--green-soft:#e9f1df;--shadow:0 18px 45px rgba(31,41,51,.08);color-scheme:light}
.dark{--paper:#0b1016;--panel:#121a24;--panel2:#0f1721;--ink:#edf2f7;--muted:#a6b3c2;--line:#2b3847;--red:#ff9aa2;--red-soft:#32191d;--gold:#ffc76f;--gold-soft:#332818;--teal:#73d6ce;--teal-soft:#12302f;--blue:#98bce8;--blue-soft:#142338;--green:#a8d081;--green-soft:#1d2a19;--shadow:none;color-scheme:dark}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}a{color:var(--blue);text-underline-offset:3px}code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.92em;background:var(--panel2);border:1px solid var(--line);border-radius:5px;padding:.05rem .28rem}.skip-link{position:absolute;left:1rem;top:-4rem;z-index:20;background:var(--ink);color:var(--panel);padding:.75rem 1rem;border-radius:6px}.skip-link:focus{top:1rem}.topbar{position:sticky;top:0;z-index:10;background:rgba(251,251,248,.95);border-bottom:1px solid var(--line);backdrop-filter:blur(12px)}.dark .topbar{background:rgba(11,16,22,.94)}.topbar-inner{max-width:1240px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:1.25rem;padding:.85rem 1.25rem}.brand{display:flex;align-items:center;gap:.75rem;color:var(--ink);text-decoration:none;min-width:230px}.logo{width:38px;height:38px;border-radius:6px;background:var(--red);color:#fff;display:grid;place-items:center;font-weight:900}.brand-title{font-weight:850}.brand-subtitle{display:block;color:var(--muted);font-size:.78rem;margin-top:.05rem}.nav{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.35rem}.nav-link{color:var(--ink);text-decoration:none;padding:.5rem .7rem;border-radius:6px;font-size:.92rem;font-weight:650}.nav-link:hover,.nav-link.active{background:var(--ink);color:var(--panel)}.page-shell{max-width:1240px;margin:0 auto;padding:1.5rem 1.25rem 4rem}.intro-band{display:grid;grid-template-columns:minmax(0,1fr) 280px;align-items:stretch;gap:1rem;margin:1rem 0 1.25rem;padding:1.25rem;background:var(--panel);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow)}.intro-band h1{margin:0;font-size:clamp(2rem,4vw,3.8rem);line-height:1.03;letter-spacing:0}.intro-band p{max-width:78ch;color:var(--muted);margin:.85rem 0 0}.eyebrow,.doc-section-kicker,.thread-kicker{margin:0 0 .35rem!important;text-transform:uppercase;letter-spacing:.06em;color:var(--red)!important;font-size:.76rem!important;font-weight:850}.scope-card{display:grid;align-content:center;gap:.5rem;background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:1rem}.scope-card strong{font-size:1.05rem}.scope-card span,.muted{color:var(--muted)}.search-label{font-size:.74rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:850;margin-top:.4rem}input,button{border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink);padding:.65rem .75rem;font:inherit}button{cursor:pointer;font-weight:800}h2,h3,h4{letter-spacing:0}h2{margin:0 0 .8rem;font-size:1.45rem}h3{margin:0 0 .55rem;font-size:1.08rem}h4{margin:.9rem 0 .4rem;font-size:.88rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}p{margin:.45rem 0}.small{font-size:.82rem}.report-section{display:block;scroll-margin-top:88px;margin:1rem 0}.section-title{margin:1.25rem 0 .75rem;padding-top:.35rem;border-top:3px solid var(--ink)}.analysis-doc-section{display:grid;gap:1rem}.section-intent{color:var(--muted);max-width:90ch}.doc-block,.card,.family-card,.level-card,.roadmap-item,.requirement-card,.stat-card,.panel{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:1.05rem;margin:0 0 1rem;box-shadow:var(--shadow)}.doc-block.narrative{background:transparent;border:0;box-shadow:none;padding:.2rem 0}.doc-block.layered_explanation{border-left:5px solid var(--teal)}.doc-block.api_contracts,.doc-block.request_response_examples{border-left:5px solid var(--blue)}.doc-block.flow{border-left:5px solid var(--green)}.doc-block.statement_list{border-left:5px solid var(--gold)}.grid,.content-grid{display:grid;gap:1rem}.two{grid-template-columns:repeat(2,minmax(0,1fr))}.three{grid-template-columns:repeat(3,minmax(0,1fr))}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:1rem;margin:.75rem 0}.metric-value{font-size:2rem;line-height:1;font-weight:900}.metric-label{text-transform:uppercase;letter-spacing:.06em;font-size:.72rem;color:var(--muted);font-weight:850;margin-top:.35rem}.family-grid,.level-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:1rem}.family-head{display:flex;gap:.7rem;justify-content:space-between;align-items:flex-start}.family-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem;margin:.75rem 0}.family-stats span,.jump-card{display:block;border:1px solid var(--line);border-radius:8px;background:var(--panel2);padding:.6rem;text-decoration:none;color:var(--ink);margin-top:.5rem}.chip{display:inline-flex;align-items:center;min-height:1.65rem;padding:.2rem .5rem;border:1px solid var(--line);border-radius:999px;background:var(--panel2);color:var(--ink);font-size:.78rem;font-weight:750;margin:.12rem}.chip.ok{border-color:#a8ceb9;color:var(--good);background:var(--green-soft)}.chip.bad{border-color:#e6b7b9;color:var(--red);background:var(--red-soft)}.chip.warn{border-color:#e2c983;color:var(--gold);background:var(--gold-soft)}.statement,.subitem,.boundary-item{border-top:1px solid var(--line);padding:.8rem 0}.statement:first-child,.subitem:first-child,.boundary-item:first-child{border-top:0}.statement p,.subitem p,.family-card p,.level-card p,.roadmap-item p,.analysis-doc-section p,.analysis-doc-lead p{font-size:.97rem;line-height:1.65}.subitem h4:first-child{margin-top:0}.trust-banner{border:1px solid var(--line);border-left-width:6px;border-radius:8px;background:var(--panel);padding:1rem;margin:0 0 1.25rem;box-shadow:var(--shadow);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1rem;align-items:start}.trust-banner.ready{border-left-color:var(--green)}.trust-banner.draft{border-left-color:var(--red)}.trust-banner h2{margin:0 0 .35rem}.trust-banner p{margin:0}.trust-banner ul{grid-column:1/-1;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:.5rem;list-style:none}.trust-banner li{border:1px solid var(--line);border-radius:8px;background:var(--panel2);padding:.7rem}.trust-banner li strong,.trust-banner li span{display:block}.trust-banner li span{color:var(--muted);font-size:.8rem;margin-top:.2rem}.trust-status{white-space:nowrap}.mermaid-box{border:1px solid var(--line);border-radius:8px;background:var(--panel2);padding:.8rem;margin:.8rem 0}.mermaid-output{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:.8rem;overflow:auto}.mermaid-output svg{max-width:100%;height:auto}.mermaid-source{max-height:360px}.mermaid-box summary,.evidence summary{cursor:pointer;color:var(--blue);font-weight:850;margin-top:.6rem}.evidence{margin:.75rem 0 0}.evidence summary{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;background:var(--panel2);padding:.28rem .6rem;font-size:.8rem}.evidence-list{margin-top:.55rem}.evidence-item,.evidence-row{border:1px solid var(--line);border-radius:8px;padding:.65rem;margin:.5rem 0;background:var(--panel2);scroll-margin-top:100px}.evidence-item.ok,.evidence-row.ok{border-left:5px solid var(--green)}.evidence-item.bad,.evidence-row.bad{border-left:5px solid var(--red)}.evidence-item.evidence-highlight,.evidence-item:target{box-shadow:0 0 0 3px var(--blue-soft)}.path{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:850}.bad-text{color:var(--red)}.evidence-gap{border:1px dashed var(--gold);border-radius:8px;background:var(--gold-soft);padding:.7rem;margin:.7rem 0}.evidence-gap strong{color:var(--gold)}pre{white-space:pre-wrap;word-break:break-word;background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:.75rem;overflow:auto}.step{display:grid;grid-template-columns:32px 1fr;gap:.65rem;border-top:1px solid var(--line);padding:.75rem 0}.step>span{width:28px;height:28px;border-radius:50%;background:var(--blue-soft);display:grid;place-items:center;font-weight:900;color:var(--blue)}.table-wrap{overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);margin-bottom:1rem}table{border-collapse:collapse;width:100%;min-width:900px}th,td{border-bottom:1px solid var(--line);padding:.75rem;text-align:left;vertical-align:top}th{font-size:.74rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:var(--panel2)}.kv{display:grid;grid-template-columns:150px 1fr;gap:.6rem;border-top:1px solid var(--line);padding:.6rem 0}.kv:first-child{border-top:0}.kv span{color:var(--muted)}.roadmap{display:grid;gap:.8rem}.empty{padding:1rem;border:1px dashed var(--line);border-radius:8px;color:var(--muted);background:var(--panel2)}.hide{display:none!important}@media(max-width:1000px){.topbar-inner{align-items:flex-start;display:grid}.nav{justify-content:flex-start}.intro-band{grid-template-columns:1fr}.two,.three{grid-template-columns:1fr}.trust-banner{grid-template-columns:1fr}.trust-status{white-space:normal}}@media(max-width:640px){.page-shell{padding:1rem .85rem 3rem}.topbar-inner{padding:.75rem .85rem}.brand{min-width:0}.nav-link{font-size:.84rem;padding:.42rem .55rem}.intro-band h1{font-size:2rem}.family-grid,.level-grid{grid-template-columns:1fr}table{min-width:720px}}
.authored-report-section{background:transparent;border:0;box-shadow:none;padding:0}.report-prose{max-width:92ch}.report-prose>p:first-child{font-size:1.12rem;line-height:1.7;color:var(--ink);font-weight:520}.report-prose p{font-size:1rem;line-height:1.72;margin:.7rem 0}.report-subsection{margin:1.2rem 0 0;padding-top:.15rem}.report-subsection h3{font-size:1.22rem;margin:0 0 .45rem;color:var(--ink)}.report-bullets{margin:.75rem 0 1rem;padding-left:1.25rem;max-width:88ch}.report-bullets li{margin:.45rem 0;line-height:1.6}.callout-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;margin:1rem 0}.report-callout{border:1px solid var(--line);border-left:5px solid var(--blue);border-radius:8px;background:var(--panel);padding:1rem;box-shadow:var(--shadow)}.report-callout strong{display:block;margin-bottom:.25rem}.report-callout.risk,.report-callout.critical,.report-callout.high{border-left-color:var(--red);background:var(--red-soft)}.report-callout.decision,.report-callout.recommendation{border-left-color:var(--teal);background:var(--teal-soft)}.report-callout.evidence,.report-callout.scope{border-left-color:var(--gold);background:var(--gold-soft)}.technical-annex{margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--line)}
`;

const JS = `
(function(){
  const links=[...document.querySelectorAll('.nav-link')];
  const sections=[...document.querySelectorAll('.report-section')];
  function markActive(id){
    links.forEach(a=>a.classList.toggle('active', a.dataset.section===id));
  }
  links.forEach(a=>a.addEventListener('click',()=>markActive(a.dataset.section)));
  if('IntersectionObserver' in window && sections.length){
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(visible) markActive(visible.target.id);
    },{rootMargin:'-20% 0px -65% 0px',threshold:[0,.2,.6]});
    sections.forEach(section=>observer.observe(section));
  }
  if(location.hash) markActive(location.hash.slice(1));
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

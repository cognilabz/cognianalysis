"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderReport = renderReport;
exports.buildHtml = buildHtml;
const utils_1 = require("./utils");
const aggregate_1 = require("./aggregate");
function renderReport(analysisDir, outputDir, title) {
    const bundle = (0, aggregate_1.loadBundle)(analysisDir);
    const out = outputDir || utils_1.Path.join(analysisDir, 'report');
    (0, utils_1.ensureDir)(out);
    const reportTitle = title || `Codebase Understanding · ${bundle.profile?.repo_name || 'Repository'}`;
    const index = utils_1.Path.join(out, 'index.html');
    (0, utils_1.writeText)(index, buildHtml(bundle, reportTitle));
    (0, utils_1.writeJson)(utils_1.Path.join(out, 'analysis-data.json'), bundle);
    return index;
}
function chip(value, cls = '') {
    return `<span class="chip ${cls}">${(0, utils_1.escapeHtml)(value)}</span>`;
}
function chips(values, empty = 'No data') {
    if (!Array.isArray(values))
        values = values === undefined || values === null ? [] : [values];
    return values.slice(0, 28).map((v) => chip(v)).join('') || `<span class="muted small">${(0, utils_1.escapeHtml)(empty)}</span>`;
}
function pretty(value) {
    if (value === undefined || value === null || value === '')
        return '';
    if (typeof value === 'string')
        return value;
    return JSON.stringify(value, null, 2);
}
function pre(value, cls = '') {
    const text = pretty(value);
    if (!text)
        return '';
    return `<pre class="${cls}">${(0, utils_1.escapeHtml)(text)}</pre>`;
}
function evidenceHtml(items) {
    if (!Array.isArray(items) || !items.length)
        return '<span class="muted small">no evidence</span>';
    const body = items.slice(0, 16).map((ev) => {
        const ok = ev && ev.valid !== false;
        const label = `${ev?.path || ''}:${ev?.line || 1}`;
        return `<div class="evidence-item ${ok ? 'ok' : 'bad'}"><div class="path">${(0, utils_1.escapeHtml)(label)}</div>${ev?.symbol ? `<div class="small muted">${(0, utils_1.escapeHtml)(ev.symbol)}</div>` : ''}${ev?.reason ? `<div class="small bad-text">${(0, utils_1.escapeHtml)(ev.reason)}</div>` : ''}${ev?.snippet ? `<pre>${(0, utils_1.escapeHtml)(ev.snippet)}</pre>` : ''}</div>`;
    }).join('');
    const more = items.length > 16 ? `<div class="small muted">+${items.length - 16} additional evidence references</div>` : '';
    return `<details class="evidence"><summary>Show evidence (${items.length})</summary><div class="evidence-list">${body}${more}</div></details>`;
}
function metric(label, value, detail = '') {
    return `<div class="metric card"><div class="metric-value">${(0, utils_1.escapeHtml)(value)}</div><div class="metric-label">${(0, utils_1.escapeHtml)(label)}</div>${detail ? `<div class="small muted">${(0, utils_1.escapeHtml)(detail)}</div>` : ''}</div>`;
}
function card(title, body, cls = '') {
    return `<article class="card search-card ${cls}" data-search="${(0, utils_1.escapeHtml)((title + ' ' + body).replace(/<[^>]*>/g, ' '))}"><h3>${(0, utils_1.escapeHtml)(title)}</h3>${body}</article>`;
}
function listItems(items, render, empty = 'No extracted data yet.') {
    if (!Array.isArray(items) || !items.length)
        return `<div class="empty">${(0, utils_1.escapeHtml)(empty)}</div>`;
    return items.map(render).join('');
}
function sectionOverview(bundle) {
    const p = bundle.profile || {};
    const s = bundle.status || {};
    const ev = bundle.evidence_index || [];
    const invalid = ev.filter((e) => e.valid === false).length;
    return `<div class="metrics">
    ${metric('Status', s.state || 'unknown', s.message || '')}
    ${metric('Languages', Object.keys(p.languages || {}).length, Object.keys(p.languages || {}).slice(0, 5).join(', '))}
    ${metric('Source files', p.source_files || 0)}
    ${metric('Contracts/examples', (p.contract_files || []).length + (p.example_files || []).length)}
    ${metric('Evidence', `${ev.length} total`, `${invalid} invalid`)}
    ${metric('Tasks', (bundle.tasks || []).length)}
  </div>
  <div class="grid two">
    ${card('Repository Profile', `<div class="kv"><span>Name</span><strong>${(0, utils_1.escapeHtml)(p.repo_name)}</strong></div><div class="kv"><span>Type</span><strong>${(0, utils_1.escapeHtml)(p.repo_type)}</strong></div><div class="kv"><span>Frameworks</span><div>${chips(p.frameworks)}</div></div><div class="kv"><span>Build tools</span><div>${chips(p.build_tools)}</div></div><div class="kv"><span>Commit</span><code>${(0, utils_1.escapeHtml)(p.commit || 'n/a')}</code></div>`)}
    ${card('Design Principle', `<p>The CLI prepares context. Codex extracts meaning. The report presents the result. Code-map signals are broad hints only and are not final entrypoints.</p><p class="muted">Implementation language: TypeScript.</p>`)}
  </div>`;
}
function sectionTargetCoverage(bundle) {
    const rows = (bundle.target_coverage || []).map((c) => {
        const statusCls = c.output_status === 'present' ? 'ok' : c.output_status === 'partial' ? 'warn' : 'pending';
        const details = (c.output_details || []).map((d) => `${d.present ? '✓' : '○'} ${d.key}`).join(' · ');
        return `<tr class="search-card" data-search="${(0, utils_1.escapeHtml)(c.title + ' ' + c.description + ' ' + details)}"><td><strong>${(0, utils_1.escapeHtml)(c.title)}</strong><div class="small muted">${(0, utils_1.escapeHtml)(c.id)}</div></td><td>${chip(c.design_status, 'ok')}</td><td>${chip(c.output_status, statusCls)}</td><td>${(0, utils_1.escapeHtml)(c.description)}</td><td><div class="small">${(0, utils_1.escapeHtml)(details)}</div><div>${chips(c.addressed_by || [])}</div></td></tr>`;
    }).join('');
    return `<div class="card accent"><h3>Target Vision Coverage</h3><p>This matrix checks whether the pack design covers the intended capability and whether the current repository output already contains extracted data for it. A pending output usually means Codex has not yet completed the LLM tasks.</p></div><div class="table-wrap"><table><thead><tr><th>Capability</th><th>Design</th><th>Current output</th><th>Purpose</th><th>Addressed by</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function sectionAssessment(bundle) {
    const a = bundle.assessment || {};
    const completeness = a.completeness || {};
    const comp = Object.entries(completeness).map(([k, v]) => metric(k.replace(/_/g, ' '), v)).join('');
    const risks = listItems(a.top_risks || [], (r) => `<li><strong>${(0, utils_1.escapeHtml)(r.title || 'Risk')}</strong> ${chip(r.severity || 'medium')}<br><span class="muted">${(0, utils_1.escapeHtml)(r.description || '')}</span>${evidenceHtml(r.evidence)}</li>`);
    const steps = listItems(a.recommended_next_steps || [], (x) => `<li><strong>${(0, utils_1.escapeHtml)(x.title || 'Step')}</strong><br><span class="muted">${(0, utils_1.escapeHtml)(x.reason || '')}</span>${evidenceHtml(x.evidence)}</li>`);
    return `<div class="grid two">${card('Executive Summary', `<p>${(0, utils_1.escapeHtml)(a.executive_summary || '')}</p><h4>System Purpose</h4><p>${(0, utils_1.escapeHtml)(a.system_purpose || '')}</p>`, 'accent')}${card('Key Scope', `<div class="kv"><span>Capabilities</span><div>${chips(a.key_capabilities)}</div></div><div class="kv"><span>Interfaces</span><div>${chips(a.key_interfaces)}</div></div><div class="kv"><span>Scope</span><div>${chips(a.assessment_scope)}</div></div>`)}</div><div class="metrics">${comp}</div><div class="grid two">${card('Top Risks', `<ul>${risks}</ul>`)}${card('Recommended Next Steps', `<ul>${steps}</ul>`)}</div>`;
}
function sectionBusiness(bundle) {
    const caps = bundle.capabilities || [];
    const logic = bundle.business_logic || [];
    const capHtml = listItems(caps, (c) => card(c.name || c.id || 'Capability', `<p>${(0, utils_1.escapeHtml)(c.description || '')}</p><div>${chips(c.actors || [])}${chips(c.domain_terms || [])}</div><h4>Business rules</h4>${listItems(c.business_rules || [], (r) => `<div class="subitem"><strong>${(0, utils_1.escapeHtml)(r.rule_type || 'rule')}</strong>: ${(0, utils_1.escapeHtml)(r.description || '')}${evidenceHtml(r.evidence)}</div>`, 'No rules extracted.')}<h4>Business logic examples</h4>${listItems(c.business_logic || [], (l) => `<div class="subitem"><strong>${(0, utils_1.escapeHtml)(l.name || l.title || 'Logic')}</strong><p>${(0, utils_1.escapeHtml)(l.description || '')}</p>${pre(l.example)}${evidenceHtml(l.evidence)}</div>`, 'No business logic examples extracted.')}<h4>Function/use-case examples</h4>${listItems(c.function_examples || [], (e) => `<div class="subitem"><strong>${(0, utils_1.escapeHtml)(e.title || e.function_or_use_case || 'Example')}</strong>${pre({ input: e.input, output: e.output, explanation: e.explanation, example_origin: e.example_origin })}${evidenceHtml(e.evidence)}</div>`, 'No function examples extracted.')}${evidenceHtml(c.evidence)}`));
    const logicHtml = listItems(logic, (l) => card(l.title || l.id || 'Business Logic', `<p>${(0, utils_1.escapeHtml)(l.description || '')}</p>${pre(l.examples)}${evidenceHtml(l.evidence)}`));
    return `<div class="grid two"><div>${capHtml}</div><div>${logicHtml}</div></div>`;
}
function sectionInterfaces(bundle) {
    const items = bundle.interfaces || [];
    return listItems(items, (it) => card(it.name || it.id || 'Interface', `<div>${chip(it.type || 'interface')}${chip(it.protocol || '')}${chip(it.method || '')}${chip(it.path || '')}</div><p>${(0, utils_1.escapeHtml)(it.description || '')}</p><div class="grid two"><div><h4>Request</h4>${pre(it.request)}</div><div><h4>Response</h4>${pre(it.response)}</div></div><h4>Examples</h4>${listItems(it.examples || [], (ex) => `<div class="subitem"><strong>${(0, utils_1.escapeHtml)(ex.title || 'Example')}</strong> ${chip(ex.example_origin || 'unknown')}${pre({ request: ex.request, response: ex.response })}${evidenceHtml(ex.evidence)}</div>`, 'No examples extracted.')}<h4>Errors / faults</h4>${pre(it.errors)}<h4>Source contracts</h4>${pre(it.source_contracts)}${evidenceHtml(it.evidence)}`));
}
function docList(documentation, key) {
    const v = documentation?.[key];
    if (Array.isArray(v))
        return v;
    if (v && typeof v === 'object')
        return [v];
    return [];
}
function sectionExamples(bundle) {
    const d = bundle.documentation || {};
    const reqres = docList(d, 'request_response_examples');
    const openapi = docList(d, 'openapi');
    const soap = docList(d, 'soap');
    const contract = docList(d, 'contract_examples');
    const logic = docList(d, 'business_logic_examples');
    const fn = docList(d, 'function_examples');
    const renderEx = (x) => card(x.title || x.operation || x.operation_id || 'Example', `<div>${chip(x.example_origin || x.source || x.kind || 'example')}</div>${pre(x.request || x.request_example || x.request_envelope)}${pre(x.response || x.response_example || x.response_envelope)}${pre(x.payload)}${pre(x.input || x.output ? { input: x.input, output: x.output, explanation: x.explanation } : '')}${evidenceHtml(x.evidence)}`);
    return `<div class="tabs-note card accent"><h3>Examples and Contracts</h3><p>Includes source examples, OpenAPI/Swagger examples, SOAP envelope examples, business logic examples and inferred examples marked with their origin.</p></div><h3>Request / Response Examples</h3>${listItems(reqres, renderEx)}<h3>OpenAPI / Swagger</h3>${listItems(openapi, renderEx)}<h3>SOAP / WSDL / XSD</h3>${listItems(soap, renderEx)}<h3>Other Contract Examples</h3>${listItems(contract, renderEx)}<h3>Business Logic Examples</h3>${listItems(logic, renderEx)}<h3>Function / Use-case Examples</h3>${listItems(fn, renderEx)}`;
}
function sectionFlows(bundle) {
    const flows = bundle.flows || [];
    const docFlows = docList(bundle.documentation || {}, 'mermaid_flows');
    const renderFlow = (f) => card(f.title || f.id || 'Flow', `<p>${(0, utils_1.escapeHtml)(f.summary || '')}</p>${f.mermaid ? `<div>${chip(f.mermaid.diagram_type || 'mermaid')}</div>${pre(f.mermaid.source, 'mermaid')}${evidenceHtml(f.mermaid.evidence)}` : ''}${f.source ? `<div>${chip(f.diagram_type || 'mermaid')}</div>${pre(f.source, 'mermaid')}` : ''}<h4>Steps</h4>${listItems(f.steps || [], (s) => `<div class="step"><span>${(0, utils_1.escapeHtml)(s.order || '')}</span><div><strong>${(0, utils_1.escapeHtml)(s.kind || s.actor || 'step')}</strong><p>${(0, utils_1.escapeHtml)(s.description || '')}</p>${evidenceHtml(s.evidence)}</div></div>`, 'No steps extracted.')}<h4>Side effects</h4>${pre(f.side_effects)}<h4>Examples</h4>${pre(f.examples)}${evidenceHtml(f.evidence)}`);
    return `<h3>Extracted Flows</h3>${listItems(flows, renderFlow)}<h3>Documentation Mermaid Flows</h3>${listItems(docFlows, renderFlow)}`;
}
function sectionDomain(bundle) {
    const dm = bundle.domain_model || {};
    const data = bundle.data_model || {};
    return `<div class="grid two">${card('Domain Glossary', listItems(dm.glossary || [], (g) => `<div class="subitem"><strong>${(0, utils_1.escapeHtml)(g.term)}</strong><p>${(0, utils_1.escapeHtml)(g.meaning || '')}</p>${evidenceHtml(g.evidence)}</div>`, 'No glossary extracted.'))}${card('Domain Entities', listItems(dm.entities || [], (e) => `<div class="subitem"><strong>${(0, utils_1.escapeHtml)(e.name)}</strong><p>${(0, utils_1.escapeHtml)(e.description || '')}</p>${pre(e.key_fields || e.fields)}${evidenceHtml(e.evidence)}</div>`, 'No domain entities extracted.'))}</div><div class="grid two">${card('Data Entities and Stores', `<h4>Entities</h4>${pre(data.entities)}<h4>Stores</h4>${pre(data.stores)}<h4>State changes</h4>${pre(data.state_changes)}`)}${card('Integrations and Side Effects', `<h4>Integrations</h4>${pre(bundle.integrations || [])}<h4>Side effects</h4>${pre(bundle.side_effects || [])}`)}</div>`;
}
function sectionArchitecture(bundle) {
    const a = bundle.architecture || {};
    return `<div class="grid two">${card('Architecture Summary', `<p>${(0, utils_1.escapeHtml)(a.summary || '')}</p><div>${chip(a.style || 'unknown')}</div>${a.mermaid ? pre(a.mermaid, 'mermaid') : ''}`)}${card('Modules', listItems(a.modules || [], (m) => `<div class="subitem"><strong>${(0, utils_1.escapeHtml)(m.name)}</strong><p>${(0, utils_1.escapeHtml)(m.responsibility || '')}</p>${chips(m.dependencies || [])}${evidenceHtml(m.evidence)}</div>`, 'No architecture modules extracted.'))}</div><div class="grid two">${card('External Systems', pre(a.external_systems || []))}${card('Runtime / Data Stores', `${pre(a.runtime || [])}${pre(a.data_stores || [])}`)}</div>${card('Observations', listItems(a.observations || [], (o) => `<div class="subitem"><strong>${(0, utils_1.escapeHtml)(o.title)}</strong><p>${(0, utils_1.escapeHtml)(o.description || '')}</p>${evidenceHtml(o.evidence)}</div>`, 'No observations extracted.'))}`;
}
function sectionProcess(bundle) {
    const p = bundle.process || {};
    const q = bundle.quality || {};
    const processCards = ['tests', 'ci_cd', 'release', 'observability', 'configuration', 'local_setup'].map(k => {
        const v = p[k] || {};
        return metric(k.replace(/_/g, ' '), v.status || 'unknown', (v.observations || []).join(' · '));
    }).join('');
    return `<div class="card accent"><h3>Process Summary</h3><p>${(0, utils_1.escapeHtml)(p.summary || '')}</p></div><div class="metrics">${processCards}</div><div class="grid three">${card('Strengths', pre(q.strengths || []))}${card('Risks', pre(q.risks || []))}${card('Testability', pre(q.testability || []))}</div>`;
}
function sectionFindings(bundle) {
    return listItems(bundle.findings || [], (f) => card(f.title || f.id || 'Finding', `<div>${chip(f.category || 'risk')}${chip(f.severity || 'medium')}</div><p>${(0, utils_1.escapeHtml)(f.description || '')}</p><h4>Recommendation</h4><p>${(0, utils_1.escapeHtml)(f.recommendation || '')}</p>${evidenceHtml(f.evidence)}`));
}
function sectionRefactoring(bundle) {
    const all = [...(bundle.refactoring || []), ...(bundle.modernization || [])];
    return listItems(all, (r) => card(r.title || r.id || 'Roadmap Item', `<div>${chip(r.risk || 'risk n/a')}${chip(r.effort || 'effort n/a')}</div><p>${(0, utils_1.escapeHtml)(r.description || '')}</p><h4>Benefit</h4><p>${(0, utils_1.escapeHtml)(r.benefit || '')}</p><h4>Target state</h4><p>${(0, utils_1.escapeHtml)(r.target_state || '')}</p><h4>Candidate files</h4>${chips(r.candidate_files || [])}${evidenceHtml(r.evidence)}`));
}
function sectionEvidence(bundle) {
    const ev = bundle.evidence_index || [];
    return listItems(ev, (e) => `<div class="evidence-row search-card ${e.valid === false ? 'bad' : 'ok'}" data-search="${(0, utils_1.escapeHtml)(`${e.path}:${e.line} ${e.symbol || ''} ${e.snippet || ''}`)}"><strong>${(0, utils_1.escapeHtml)(e.path)}:${(0, utils_1.escapeHtml)(e.line || 1)}</strong>${e.symbol ? ` <span class="muted">${(0, utils_1.escapeHtml)(e.symbol)}</span>` : ''}${e.valid === false ? ` ${chip(e.reason || 'invalid', 'bad')}` : ''}${e.snippet ? `<pre>${(0, utils_1.escapeHtml)(e.snippet)}</pre>` : ''}</div>`, 'No evidence collected yet.');
}
function sectionTasks(bundle) {
    return listItems(bundle.tasks || [], (t) => card(t.title || t.task_file, `<div>${chip(t.status || 'pending')}</div><div class="kv"><span>Task</span><code>${(0, utils_1.escapeHtml)(t.task_file)}</code></div><div class="kv"><span>Output</span><code>${(0, utils_1.escapeHtml)(t.expected_output)}</code></div>`));
}
function sectionCodeMap(bundle) {
    const modules = bundle.modules || [];
    const docs = bundle.important_docs || [];
    const capsules = bundle.capsules || [];
    const files = bundle.files || [];
    return `<div class="grid two">${card('Important Docs / Contracts / Examples', listItems(docs.slice(0, 60), (d) => `<div class="subitem"><strong>${(0, utils_1.escapeHtml)(d.path)}</strong><div>${chips(d.roles || [])}</div>${pre(d.signals || [])}</div>`, 'No candidates found.'))}${card('Source Capsules', listItems(capsules.slice(0, 30), (c) => `<div class="subitem"><strong>${(0, utils_1.escapeHtml)(c.path)}</strong><div>${chips(c.roles || [])}</div><p class="muted small">score ${(0, utils_1.escapeHtml)(c.score)} · ${(0, utils_1.escapeHtml)(c.lines)} lines</p></div>`, 'No capsules found.'))}</div><h3>Modules</h3><div class="table-wrap"><table><thead><tr><th>Module</th><th>Files</th><th>Source</th><th>Roles</th></tr></thead><tbody>${modules.slice(0, 80).map((m) => `<tr class="search-card" data-search="${(0, utils_1.escapeHtml)(m.name + ' ' + JSON.stringify(m.roles || {}))}"><td><strong>${(0, utils_1.escapeHtml)(m.name)}</strong></td><td>${(0, utils_1.escapeHtml)(m.files)}</td><td>${(0, utils_1.escapeHtml)(m.source_files)}</td><td>${chips(Object.keys(m.roles || {}))}</td></tr>`).join('')}</tbody></table></div><h3>Ranked Files</h3><div class="table-wrap"><table><thead><tr><th>File</th><th>Roles</th><th>Signals</th><th>Symbols</th><th>Score</th></tr></thead><tbody>${files.slice(0, 120).map((f) => `<tr class="search-card" data-search="${(0, utils_1.escapeHtml)(f.path + ' ' + (f.roles || []).join(' '))}"><td><code>${(0, utils_1.escapeHtml)(f.path)}</code></td><td>${chips(f.roles || [])}</td><td>${(0, utils_1.escapeHtml)(f.signal_count || 0)}</td><td>${(0, utils_1.escapeHtml)(f.symbol_count || 0)}</td><td>${(0, utils_1.escapeHtml)(f.score || 0)}</td></tr>`).join('')}</tbody></table></div>`;
}
function buildHtml(bundle, title) {
    const sections = [
        ['overview', 'Overview', sectionOverview(bundle)],
        ['coverage', 'Target Coverage', sectionTargetCoverage(bundle)],
        ['assessment', 'Core Assessment', sectionAssessment(bundle)],
        ['business', 'Business & Logic', sectionBusiness(bundle)],
        ['interfaces', 'Interfaces & Contracts', sectionInterfaces(bundle)],
        ['examples', 'Req/Res & Examples', sectionExamples(bundle)],
        ['flows', 'Flows & Mermaid', sectionFlows(bundle)],
        ['domain', 'Domain/Data/Integrations', sectionDomain(bundle)],
        ['architecture', 'Architecture', sectionArchitecture(bundle)],
        ['process', 'Process & Quality', sectionProcess(bundle)],
        ['findings', 'Findings', sectionFindings(bundle)],
        ['refactoring', 'Refactoring Roadmap', sectionRefactoring(bundle)],
        ['evidence', 'Evidence', sectionEvidence(bundle)],
        ['tasks', 'Codex Tasks', sectionTasks(bundle)],
        ['codemap', 'Code Map', sectionCodeMap(bundle)]
    ];
    const nav = sections.map(([id, label], index) => `<a class="nav-link ${index === 0 ? 'active' : ''}" href="#${id}" data-section="${id}">${(0, utils_1.escapeHtml)(label)}</a>`).join('');
    const htmlSections = sections.map(([id, label, body], index) => `<section class="view ${index === 0 ? 'active' : ''}" id="${id}"><div class="section-title"><h2>${(0, utils_1.escapeHtml)(label)}</h2></div>${body}</section>`).join('\n');
    const dataJson = (0, utils_1.safeJsonForHtml)(bundle);
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${(0, utils_1.escapeHtml)(title)}</title>
<style>${CSS}</style>
</head>
<body>
<script id="analysis-data" type="application/json">${dataJson}</script>
<div class="layout">
<aside class="sidebar"><div class="brand"><div class="logo">CU</div><div><div class="brand-title">Codebase Understanding</div><div class="brand-subtitle">LLM-first · TypeScript · evidence</div></div></div><nav>${nav}</nav><div class="side-note"><strong>${(0, utils_1.escapeHtml)(bundle.profile?.repo_name || 'Repository')}</strong><br><span>${(0, utils_1.escapeHtml)(bundle.profile?.repo_type || 'unknown')}</span></div></aside>
<main><header class="hero"><div><p class="eyebrow">Interactive HTML Report</p><h1>${(0, utils_1.escapeHtml)(title)}</h1><p class="muted">${(0, utils_1.escapeHtml)(bundle.profile?.root || '')}</p></div><div class="actions"><input id="search" type="search" placeholder="Search: API, request, Mermaid, rule, file …"><button id="theme" type="button">Theme</button></div></header>${htmlSections}</main>
</div>
<script>${JS}</script>
</body>
</html>`;
}
const CSS = `
:root{--bg:#f4f7fb;--panel:#ffffff;--panel2:#f8fbff;--text:#142033;--muted:#64748b;--line:#dbe5f2;--accent:#3157ff;--accent2:#eaf0ff;--good:#087443;--bad:#b42318;--warn:#a15c07;--shadow:0 18px 42px rgba(35,54,86,.10)}
.dark{--bg:#07111f;--panel:#0d1b2d;--panel2:#0a1626;--text:#eaf1ff;--muted:#9fb0c7;--line:#203249;--accent:#91a7ff;--accent2:#152544;--good:#55d296;--bad:#ff8b7f;--warn:#ffc46b;--shadow:none}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.layout{display:grid;grid-template-columns:300px minmax(0,1fr);min-height:100vh}.sidebar{position:sticky;top:0;height:100vh;background:linear-gradient(180deg,var(--panel),var(--panel2));border-right:1px solid var(--line);padding:22px;overflow:auto}.brand{display:flex;gap:12px;align-items:center;margin-bottom:24px}.logo{width:44px;height:44px;border-radius:14px;background:var(--accent);color:white;display:grid;place-items:center;font-weight:800}.brand-title{font-weight:800}.brand-subtitle{color:var(--muted);font-size:12px}nav{display:grid;gap:5px}.nav-link{padding:10px 12px;border-radius:12px;text-decoration:none;color:var(--text);font-weight:650}.nav-link:hover,.nav-link.active{background:var(--accent2);color:var(--accent)}.side-note{margin-top:22px;border:1px solid var(--line);border-radius:16px;padding:14px;background:var(--panel)}main{padding:28px 34px 60px;min-width:0}.hero{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:22px}.eyebrow{letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:800;font-size:12px;margin:0 0 8px}h1{font-size:34px;line-height:1.08;margin:0 0 8px}h2{font-size:26px;margin:12px 0 16px}h3{margin:0 0 12px}h4{margin:16px 0 8px}.muted{color:var(--muted)}.small{font-size:12px}.actions{display:flex;gap:10px;align-items:center}input,button{border:1px solid var(--line);border-radius:14px;background:var(--panel);color:var(--text);padding:11px 14px;font:inherit}input{width:min(430px,42vw)}button{cursor:pointer;font-weight:750}.view{display:none}.view.active{display:block}.section-title{display:flex;align-items:center;justify-content:space-between}.grid{display:grid;gap:16px}.two{grid-template-columns:repeat(2,minmax(0,1fr))}.three{grid-template-columns:repeat(3,minmax(0,1fr))}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin:16px 0}.card{background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:18px;box-shadow:var(--shadow);margin-bottom:16px}.accent{background:linear-gradient(135deg,var(--panel),var(--accent2))}.metric-value{font-size:26px;font-weight:900}.metric-label{text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:var(--muted);font-weight:800}.chip{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:4px 9px;margin:2px;background:var(--panel2);font-size:12px;font-weight:700}.chip.ok{border-color:rgba(8,116,67,.3);color:var(--good)}.chip.bad{border-color:rgba(180,35,24,.3);color:var(--bad)}.chip.warn{border-color:rgba(161,92,7,.35);color:var(--warn)}.chip.pending{color:var(--muted)}.kv{display:grid;grid-template-columns:150px 1fr;gap:10px;border-top:1px solid var(--line);padding:10px 0}.kv:first-child{border-top:0}.kv span{color:var(--muted)}pre{white-space:pre-wrap;word-break:break-word;background:var(--panel2);border:1px solid var(--line);border-radius:14px;padding:12px;overflow:auto}.mermaid{border-left:5px solid var(--accent)}.evidence summary{cursor:pointer;color:var(--accent);font-weight:800;margin-top:10px}.evidence-item,.evidence-row{border:1px solid var(--line);border-radius:14px;padding:10px;margin:8px 0;background:var(--panel2)}.evidence-item.ok,.evidence-row.ok{border-left:5px solid var(--good)}.evidence-item.bad,.evidence-row.bad{border-left:5px solid var(--bad)}.bad-text{color:var(--bad)}.path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:800}.subitem{border-top:1px solid var(--line);padding:12px 0}.subitem:first-child{border-top:0}.step{display:grid;grid-template-columns:32px 1fr;gap:10px;border-top:1px solid var(--line);padding:12px 0}.step>span{width:28px;height:28px;border-radius:50%;background:var(--accent2);display:grid;place-items:center;font-weight:900;color:var(--accent)}.empty{padding:18px;border:1px dashed var(--line);border-radius:16px;color:var(--muted);background:var(--panel2)}.table-wrap{overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:20px;box-shadow:var(--shadow);margin-bottom:18px}table{border-collapse:collapse;width:100%;min-width:900px}th,td{border-bottom:1px solid var(--line);padding:12px;text-align:left;vertical-align:top}th{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);background:var(--panel2)}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.hide{display:none!important}@media(max-width:900px){.layout{grid-template-columns:1fr}.sidebar{position:relative;height:auto}.hero{display:block}.actions{margin-top:14px}input{width:100%}.two,.three{grid-template-columns:1fr}}
`;
const JS = `
(function(){
  const links=[...document.querySelectorAll('.nav-link')];
  const views=[...document.querySelectorAll('.view')];
  function show(id){
    if(!document.getElementById(id)) id='overview';
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
  const theme=document.getElementById('theme');
  if(theme) theme.addEventListener('click',()=>document.documentElement.classList.toggle('dark'));
})();
`;

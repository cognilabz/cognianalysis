"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMcpLikeServer = startMcpLikeServer;
const aggregate_1 = require("./aggregate");
const repoMap_1 = require("./repoMap");
const report_1 = require("./report");
const tasks_1 = require("./tasks");
const aggregate_2 = require("./aggregate");
const utils_1 = require("./utils");
function send(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }
async function callTool(name, args) {
    const repo = utils_1.Path.resolve(args?.repo || '.');
    const analysis = utils_1.Path.resolve(args?.analysis || utils_1.Path.join(repo, '.analysis'));
    if (name === 'prepare') {
        const codeMap = (0, repoMap_1.buildRepoMap)(repo, { maxFileSize: args?.maxFileSize, capsuleLimit: args?.capsules, capsuleChars: args?.capsuleChars });
        (0, aggregate_2.prepareAnalysis)(repo, analysis, codeMap);
        const tasks = (0, tasks_1.writeLlmTasks)(analysis, codeMap);
        return { analysis, tasks: tasks.length };
    }
    if (name === 'aggregate')
        return (0, aggregate_1.aggregate)(repo, analysis);
    if (name === 'finalize') {
        const bundle = (0, aggregate_1.aggregate)(repo, analysis);
        const invalid = (bundle.evidence_index || []).filter((e) => e.valid === false);
        const rows = bundle.target_coverage || [];
        const missing = rows.filter((r) => ['missing', 'pending'].includes(r.output_status));
        const report = (0, report_1.renderReport)(analysis, args?.out, args?.title);
        return { report, status: bundle.status?.state, target_coverage_present: rows.length - missing.length, target_coverage_total: rows.length, source_coverage: bundle.source_coverage, evidence_total: (bundle.evidence_index || []).length, invalid: invalid.length, invalid_examples: invalid.slice(0, 20) };
    }
    if (name === 'render')
        return { report: (0, report_1.renderReport)(analysis, args?.out, args?.title) };
    if (name === 'validate') {
        const bundle = (0, aggregate_1.aggregate)(repo, analysis);
        const invalid = (bundle.evidence_index || []).filter((e) => e.valid === false);
        return { evidence_total: (bundle.evidence_index || []).length, invalid: invalid.length, invalid_examples: invalid.slice(0, 20) };
    }
    if (name === 'coverage') {
        const bundle = (0, aggregate_1.aggregate)(repo, analysis);
        return { target_coverage: bundle.target_coverage || [] };
    }
    throw new Error(`Unknown tool: ${name}`);
}
function startMcpLikeServer() {
    process.stdin.setEncoding('utf8');
    let buffer = '';
    process.stdin.on('data', async (chunk) => {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        for (const line of lines) {
            if (!line.trim())
                continue;
            let req;
            try {
                req = JSON.parse(line);
            }
            catch (err) {
                send({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } });
                continue;
            }
            try {
                if (req.method === 'initialize') {
                    send({ jsonrpc: '2.0', id: req.id, result: { protocolVersion: '2024-11-05', serverInfo: { name: 'codebase-analysis-pack', version: '0.6.0' }, capabilities: { tools: {} } } });
                }
                else if (req.method === 'tools/list') {
                    send({ jsonrpc: '2.0', id: req.id, result: { tools: ['prepare', 'finalize', 'aggregate', 'render', 'validate', 'coverage'].map(name => ({ name, description: `Run cba ${name}`, inputSchema: { type: 'object', properties: { repo: { type: 'string' }, analysis: { type: 'string' } } } })) } });
                }
                else if (req.method === 'tools/call') {
                    const result = await callTool(req.params?.name, req.params?.arguments || {});
                    send({ jsonrpc: '2.0', id: req.id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
                }
                else {
                    send({ jsonrpc: '2.0', id: req.id, error: { code: -32601, message: `Method not found: ${req.method}` } });
                }
            }
            catch (err) {
                send({ jsonrpc: '2.0', id: req.id, error: { code: -32000, message: err?.message || String(err) } });
            }
        }
    });
}

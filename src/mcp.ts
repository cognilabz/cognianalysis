import { aggregate } from './aggregate';
import { buildRepoMap } from './repoMap';
import { renderReport } from './report';
import { writeLlmTasks } from './tasks';
import { prepareAnalysis } from './aggregate';
import { Path } from './utils';

function send(obj: any): void { process.stdout.write(JSON.stringify(obj) + '\n'); }

async function callTool(name: string, args: any): Promise<any> {
  const repo = Path.resolve(args?.repo || '.');
  const analysis = Path.resolve(args?.analysis || Path.join(repo, '.analysis'));
  if (name === 'prepare') {
    const codeMap = buildRepoMap(repo, { maxFileSize: args?.maxFileSize, capsuleLimit: args?.capsules, capsuleChars: args?.capsuleChars });
    prepareAnalysis(repo, analysis, codeMap);
    const tasks = writeLlmTasks(analysis, codeMap);
    return { analysis, tasks: tasks.length };
  }
  if (name === 'aggregate') return aggregate(repo, analysis);
  if (name === 'finalize') {
    const bundle = aggregate(repo, analysis);
    const invalid = (bundle.evidence_index || []).filter((e: any) => e.valid === false);
    const rows = bundle.target_coverage || [];
    const missing = rows.filter((r: any) => ['missing', 'pending'].includes(r.output_status));
    const report = renderReport(analysis, args?.out, args?.title);
    return { report, status: bundle.status?.state, target_coverage_present: rows.length - missing.length, target_coverage_total: rows.length, evidence_total: (bundle.evidence_index || []).length, invalid: invalid.length, invalid_examples: invalid.slice(0, 20) };
  }
  if (name === 'render') return { report: renderReport(analysis, args?.out, args?.title) };
  if (name === 'validate') {
    const bundle = aggregate(repo, analysis);
    const invalid = (bundle.evidence_index || []).filter((e: any) => e.valid === false);
    return { evidence_total: (bundle.evidence_index || []).length, invalid: invalid.length, invalid_examples: invalid.slice(0, 20) };
  }
  if (name === 'coverage') {
    const bundle = aggregate(repo, analysis);
    return { target_coverage: bundle.target_coverage || [] };
  }
  throw new Error(`Unknown tool: ${name}`);
}

export function startMcpLikeServer(): void {
  process.stdin.setEncoding('utf8');
  let buffer = '';
  process.stdin.on('data', async (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      let req: any;
      try { req = JSON.parse(line); } catch (err: any) { send({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }); continue; }
      try {
        if (req.method === 'initialize') {
          send({ jsonrpc: '2.0', id: req.id, result: { protocolVersion: '2024-11-05', serverInfo: { name: 'codebase-analysis-pack', version: '0.6.0' }, capabilities: { tools: {} } } });
        } else if (req.method === 'tools/list') {
          send({ jsonrpc: '2.0', id: req.id, result: { tools: ['prepare','finalize','aggregate','render','validate','coverage'].map(name => ({ name, description: `Run cba ${name}`, inputSchema: { type: 'object', properties: { repo: { type: 'string' }, analysis: { type: 'string' } } } })) } });
        } else if (req.method === 'tools/call') {
          const result = await callTool(req.params?.name, req.params?.arguments || {});
          send({ jsonrpc: '2.0', id: req.id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
        } else {
          send({ jsonrpc: '2.0', id: req.id, error: { code: -32601, message: `Method not found: ${req.method}` } });
        }
      } catch (err: any) {
        send({ jsonrpc: '2.0', id: req.id, error: { code: -32000, message: err?.message || String(err) } });
      }
    }
  });
}

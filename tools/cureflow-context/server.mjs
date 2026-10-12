import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const roots = { frontend: root, backend: 'D:/Projects/Sarvik/Care-Flow/Cure-Flow/dotnet-backend' };
const preferredDocs = ['documentation/PROJECT_CONTEXT.md', 'documentation/README.md', 'documentation/tasks/README.md', 'documentation/design/HMS_ARCHITECTURE_AND_DESIGN_V3.md', 'documentation/design/PLAN3_HOSPITAL_FIRST_ROADMAP.md'];
function discoverDocuments(relative = 'documentation') {
  const found = [];
  for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const name = `${relative}/${entry.name}`;
    if (entry.isDirectory()) found.push(...discoverDocuments(name));
    else if (entry.isFile() && entry.name.endsWith('.md')) found.push(name);
  }
  return found.sort();
}
const docs = [...new Set([...preferredDocs, ...discoverDocuments()])];
const ignored = new Set(['node_modules', '.git', '.nuxt', '.output', 'bin', 'obj']);
const allowedSource = /\.(ts|vue|cs|csproj)$/i;
function allowed(scope, relative) {
  if (scope === 'frontend' && docs.includes(relative)) return true;
  if (scope === 'frontend' && ['package.json', 'nuxt.config.ts'].includes(relative)) return true;
  return /^(app|server|shared|tests|src)\//.test(relative) && allowedSource.test(relative) && !/(secret|credential|appsettings|\.env)/i.test(relative);
}
function resolveFile(scope, relative) {
  if (!roots[scope] || typeof relative !== 'string' || relative.includes('\\') || relative.split('/').some(p => !p || p === '.' || p === '..' || ignored.has(p)) || !allowed(scope, relative)) throw Error('File is outside the permitted source/document set');
  const base = fs.realpathSync(roots[scope]);
  const full = path.resolve(base, relative);
  const actual = fs.realpathSync(full);
  if (!actual.startsWith(base + path.sep) || actual !== full || !fs.statSync(actual).isFile()) throw Error('Links and paths outside the project are prohibited');
  return actual;
}
function inventory(scope) {
  const result = [];
  function walk(dir, prefix) {
    if (result.length >= 10000) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isSymbolicLink() || ignored.has(e.name)) continue;
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), rel);
      else if (allowed(scope, rel)) {
        const s = fs.statSync(path.join(dir, e.name));
        result.push({ path: rel, bytes: s.size, modified: s.mtime.toISOString() });
      }
    }
  }
  // Enumerate source roots only; never recurse through uploads, caches or other project directories.
  for (const dir of scope === 'frontend' ? ['app', 'server', 'shared', 'tests'] : ['src', 'tests']) {
    const p = path.join(roots[scope], dir);
    if (fs.existsSync(p) && !fs.lstatSync(p).isSymbolicLink()) walk(p, dir);
  }
  if (scope === 'frontend') for (const p of [...docs, 'package.json', 'nuxt.config.ts']) {
    const s = fs.statSync(resolveFile(scope, p));
    result.push({ path: p, bytes: s.size, modified: s.mtime.toISOString() });
  }
  return result;
}
const definitions = [
  { name: 'project_overview', description: 'Read the concise project map. Design documents are proposals; verify current code selectively.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'list_project_files', description: 'Fresh source/document path inventory and modification times without reading contents. Optional path substring filter.', inputSchema: { type: 'object', properties: { scope: { enum: ['frontend', 'backend'] }, filter: { type: 'string' }, offset: { type: 'integer', minimum: 0 } }, required: ['scope'], additionalProperties: false } },
  { name: 'read_project_file', description: 'Read a bounded line window of an allowed source or architecture document. Rejects secret/config data, traversal and symlinks.', inputSchema: { type: 'object', properties: { scope: { enum: ['frontend', 'backend'] }, path: { type: 'string' }, startLine: { type: 'integer', minimum: 1 }, lineCount: { type: 'integer', minimum: 1, maximum: 160 } }, required: ['scope', 'path'], additionalProperties: false } },
  { name: 'search_design', description: 'Literal search over context/design documents, latest V3 first. Returns relevant line numbers and bounded snippets.', inputSchema: { type: 'object', properties: { query: { type: 'string', minLength: 2, maxLength: 200 } }, required: ['query'], additionalProperties: false } },
];
export function callTool(name, args = {}) {
  if (name === 'project_overview') return { text: fs.readFileSync(resolveFile('frontend', docs[0]), 'utf8'), checkedAt: new Date().toISOString(), roots, documents: docs.map(p => ({ path: p, modified: fs.statSync(resolveFile('frontend', p)).mtime.toISOString() })) };
  if (name === 'list_project_files') {
    if (!roots[args.scope]) throw Error('Invalid scope');
    const rows = inventory(args.scope).filter(r => !args.filter || r.path.toLowerCase().includes(String(args.filter).toLowerCase()));
    const offset = Math.max(0, Number.isInteger(args.offset) ? args.offset : 0);
    return { checkedAt: new Date().toISOString(), total: rows.length, files: rows.slice(offset, offset + 150), nextOffset: offset + 150 < rows.length ? offset + 150 : null };
  }
  if (name === 'read_project_file') {
    const p = resolveFile(args.scope, args.path);
    if (fs.statSync(p).size > 2_000_000) throw Error('File exceeds context size limit');
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    const start = Math.max(1, Number.isInteger(args.startLine) ? args.startLine : 1);
    const count = Math.min(160, Math.max(1, Number.isInteger(args.lineCount) ? args.lineCount : 80));
    return { path: args.path, modified: fs.statSync(p).mtime.toISOString(), totalLines: lines.length, startLine: start, text: lines.slice(start - 1, start - 1 + count).map((s, i) => `${start + i}: ${s}`).join('\n').slice(0, 24000) };
  }
  if (name === 'search_design') {
    if (typeof args.query !== 'string' || args.query.length < 2 || args.query.length > 200) throw Error('Query must contain 2–200 characters');
    const matches = [];
    for (const p of docs) fs.readFileSync(resolveFile('frontend', p), 'utf8').split(/\r?\n/).forEach((line, i) => {
      if (matches.length < 60 && line.toLowerCase().includes(args.query.toLowerCase())) matches.push({ path: p, line: i + 1, text: line.slice(0, 400) });
    });
    return { matches, limit: 60 };
  }
  throw Error('Unknown tool');
}
export function dispatch(message) {
  if (message.id === undefined) return null;
  try {
    let result;
    switch (message.method) {
      case 'initialize': {
        const supported = ['2025-06-18', '2025-03-26', '2024-11-05'];
        result = { protocolVersion: supported.includes(message.params?.protocolVersion) ? message.params.protocolVersion : supported[0], capabilities: { tools: {}, resources: {} }, serverInfo: { name: 'cureflow-context', version: '1.0.0' } }; break;
      }
      case 'ping': result = {}; break;
      case 'tools/list': result = { tools: definitions.map(t => ({ ...t, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } })) }; break;
      case 'tools/call': {
        try { result = { content: [{ type: 'text', text: JSON.stringify(callTool(message.params?.name, message.params?.arguments)) }] }; }
        catch (e) { result = { isError: true, content: [{ type: 'text', text: e.message }] }; }
        break;
      }
      case 'resources/list': result = { resources: [{ uri: 'cureflow://overview', name: 'CureFlow project context', mimeType: 'text/markdown' }] }; break;
      case 'resources/read':
        if (message.params?.uri !== 'cureflow://overview') throw Error('Unknown resource');
        result = { contents: [{ uri: 'cureflow://overview', mimeType: 'text/markdown', text: callTool('project_overview').text }] }; break;
      default: return { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Method not found' } };
    }
    return { jsonrpc: '2.0', id: message.id, result };
  } catch (e) { return { jsonrpc: '2.0', id: message.id, error: { code: -32602, message: e.message } }; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  input.on('line', line => {
    try {
      if (line.length > 100000) throw Error('Request too large');
      const response = dispatch(JSON.parse(line));
      if (response) process.stdout.write(JSON.stringify(response) + '\n');
    } catch { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON request' } }) + '\n'); }
  });
}

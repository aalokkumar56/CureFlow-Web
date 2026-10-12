import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { callTool, dispatch } from './server.mjs';

test('bounded context reads and live source inventory', () => {
  assert.match(callTool('project_overview').text, /proposals/);
  assert.ok(callTool('list_project_files', { scope: 'frontend', filter: 'tenant' }).files.length);
  const section = callTool('read_project_file', { scope: 'frontend', path: 'documentation/design/PATIENT_ARCHITECTURE_AND_DESIGN.md', lineCount: 3 });
  assert.equal(section.text.split('\n').length, 3);
  assert.ok(callTool('search_design', { query: 'SharingGrants' }).matches.length);
  assert.match(callTool('read_project_file', { scope: 'frontend', path: 'documentation/tasks/priority-01/backend/BE-001-tenant-transaction-isolation.md', lineCount: 1 }).text, /Tenant transaction isolation/);
  assert.ok(callTool('list_project_files', { scope: 'frontend', filter: 'documentation/tasks/' }).files.length > 1);
});
test('sensitive and traversal paths fail closed', () => {
  for (const p of ['.env', 'app/../../.env', 'app\\foo.ts', 'server/appsettings.json', '/package.json', 'node_modules/foo.ts']) {
    assert.throws(() => callTool('read_project_file', { scope: 'frontend', path: p }));
  }
  assert.throws(() => callTool('list_project_files', { scope: 'arbitrary' }));
  assert.equal(dispatch({ id: 5, method: 'tools/call', params: { name: 'read_project_file', arguments: { scope: 'frontend', path: '.env' } } }).result.isError, true);
});
test('real stdio lifecycle and tool calls return valid newline JSON', () => {
  const requests = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'project_overview', arguments: {} } },
    { jsonrpc: '2.0', id: 4, method: 'resources/read', params: { uri: 'cureflow://overview' } },
  ];
  const proc = spawnSync(process.execPath, ['tools/cureflow-context/server.mjs'], { input: requests.map(JSON.stringify).join('\n') + '\n', encoding: 'utf8', timeout: 10000 });
  assert.equal(proc.status, 0, proc.stderr);
  const replies = proc.stdout.trim().split('\n').map(JSON.parse);
  assert.deepEqual(replies.map(r => r.id), [1, 2, 3, 4]);
  assert.equal(replies[1].result.tools.length, 4);
  assert.match(replies[2].result.content[0].text, /CureFlow/);
  assert.ok(replies[3].result.contents[0].text);
});

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const apiUrl = new URL('../renderers/workflow/workflow-api.mjs', import.meta.url).href;
const diagnosticUrl = new URL('../renderers/shared/diagnostics.mjs', import.meta.url).href;

function workflow() {
  return {
    schema_version: 2,
    diagram_type: 'workflow',
    meta: { title: 'Library diagnostics', output: 'caller-owned.html', quality_profile: 'standard', legend: { mode: 'hidden' } },
    lanes: [{ id: 'main', label: 'Main' }],
    nodes: [
      { id: 'a', lane: 'main', col: 0, type: 'frontend', label: 'Input', brand: 'openai' },
      { id: 'b', lane: 'main', col: 3, type: 'backend', label: 'Output' },
    ],
    edges: [{ id: 'ab', from: 'a', to: 'b' }],
  };
}

function runChild(program) {
  const script = `
    import assert from 'node:assert/strict';
    import { renderWorkflow } from ${JSON.stringify(apiUrl)};
    import { installRendererDiagnosticBoundary, recordDiagnostic, throwDiagnosticError } from ${JSON.stringify(diagnosticUrl)};
    const workflow = ${workflow.toString()};
    ${program}
  `;
  return spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
    encoding: 'utf8',
    timeout: 20000,
    env: {
      ...process.env,
      ARCHIFY_DIAGNOSTIC_FORMAT: 'json',
      ARCHIFY_BRAND_ALLOW_PRIVATE: '1',
      ARCHIFY_BRAND_CAPTURE_TIMEOUT_MS: '10000',
    },
  });
}

function assertCliDiagnostics(result, expectedCodes) {
  assert.equal(result.status, 1, result.stderr || result.error?.message);
  assert.equal(result.stdout, '');
  const receipt = JSON.parse(result.stderr);
  assert.equal(receipt.ok, false);
  assert.deepEqual(receipt.diagnostics.map(({ code }) => code), expectedCodes);
}

test('completed library failures do not enter CLI history or erase existing CLI diagnostics', () => {
  const result = runChild(`
    recordDiagnostic({ code: 'test/cli-existing', message: 'Existing CLI diagnostic' });
    const schemaFailure = await renderWorkflow({ workflow: {} });
    assert.equal(schemaFailure.ok, false);
    assert.ok(schemaFailure.diagnostics.every(({ code }) => code === 'schema/required'));
    for (let index = 0; index < 3; index++) {
      const invalid = workflow();
      invalid.meta.views = [{ id: 'view', label: 'View', focus: ['missing-' + index] }];
      const result = await renderWorkflow({ workflow: invalid });
      assert.deepEqual(result.diagnostics.map(({ code }) => code), ['guided-view/invalid']);
    }
    const compilerInput = workflow();
    compilerInput.nodes[0].lane = 'missing';
    const compilerFailure = await renderWorkflow({ workflow: compilerInput });
    assert.equal(compilerFailure.ok, false);
    assert.ok(compilerFailure.diagnostics.some(({ code }) => code === 'workflow/unknown-node-lane'));
    assert.equal((await renderWorkflow({ workflow: workflow() })).ok, true);
    assert.equal(globalThis[Symbol.for('archify.renderer-diagnostic-boundary')], undefined);
    installRendererDiagnosticBoundary();
    setImmediate(() => throwDiagnosticError('Current CLI error', [{ code: 'test/cli-current', message: 'Current CLI error' }]));
  `);
  assertCliDiagnostics(result, ['test/cli-existing', 'test/cli-current']);
});

test('overlapping asynchronous library failures stay isolated from concurrent CLI recording', () => {
  const result = runChild(`
    const { default: http } = await import('node:http');
    const { createHash } = await import('node:crypto');
    const icon = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    const digest = createHash('sha256').update(icon).digest('hex');
    const responses = [];
    let bothRequested;
    const requestsStarted = new Promise(resolve => { bothRequested = resolve; });
    const server = http.createServer((_request, response) => {
      responses.push(response);
      if (responses.length === 2) bothRequested();
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const valid = workflow();
      valid.nodes[0].brand = { url: 'http://127.0.0.1:' + server.address().port + '/mark.png', sha256: digest };
      const invalid = structuredClone(valid);
      invalid.nodes[0].brand.sha256 = '0'.repeat(64);
      const failedCall = renderWorkflow({ workflow: invalid });
      const successfulCall = renderWorkflow({ workflow: valid });
      await requestsStarted;
      // This continuation belongs to the caller, outside both library calls.
      recordDiagnostic({ code: 'test/cli-concurrent', message: 'Concurrent CLI diagnostic' });
      for (const response of responses) {
        response.writeHead(200, { 'content-type': 'image/png' });
        response.end(icon);
      }
      const [failed, successful] = await Promise.all([failedCall, successfulCall]);
      assert.deepEqual(failed.diagnostics.map(({ code }) => code), ['brand/digest-mismatch']);
      assert.equal(successful.ok, true, JSON.stringify(successful.diagnostics));
      assert.match(successful.svg, /data-brand-status="captured"/);
    } finally {
      server.closeAllConnections?.();
      await new Promise(resolve => server.close(resolve));
    }
    installRendererDiagnosticBoundary();
    setImmediate(() => throwDiagnosticError('Current CLI error', [{ code: 'test/cli-current', message: 'Current CLI error' }]));
  `);
  assertCliDiagnostics(result, ['test/cli-concurrent', 'test/cli-current']);
});

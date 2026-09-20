import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { renderWorkflow } from '../renderers/workflow/workflow-api.mjs';

// An authored shared corridor is allowed in advisory/standard mode, but the
// showcase contract rejects it. This distinguishes metadata from actual gates.
function nestedCorridors() {
  return {
    schema_version: 2,
    diagram_type: 'workflow',
    meta: { title: 'Nested corridors', output: 'corridors.html', legend: { mode: 'hidden' } },
    lanes: [0, 1, 2, 3].map(index => ({ id: `l${index}`, label: `Lane ${index}` })),
    nodes: [
      { id: 'outer-from', lane: 'l0', col: 0, type: 'backend', label: 'Outer from' },
      { id: 'inner-from', lane: 'l1', col: 0, type: 'backend', label: 'Inner from' },
      { id: 'inner-to', lane: 'l2', col: 2, type: 'database', label: 'Inner to' },
      { id: 'outer-to', lane: 'l3', col: 2, type: 'database', label: 'Outer to' },
    ],
    edges: [
      { id: 'outer', from: 'outer-from', to: 'outer-to', route: 'outside-right', channelX: 800, fromSide: 'right', toSide: 'right' },
      { id: 'inner', from: 'inner-from', to: 'inner-to', route: 'outside-right', channelX: 800, fromSide: 'right', toSide: 'right' },
    ],
  };
}

function restoreProfile(t) {
  const previous = process.env.ARCHIFY_QUALITY_PROFILE;
  t.after(() => {
    if (previous === undefined) delete process.env.ARCHIFY_QUALITY_PROFILE;
    else process.env.ARCHIFY_QUALITY_PROFILE = previous;
  });
}

test('renderWorkflow keeps unspecified quality advisory regardless of the host environment', async t => {
  restoreProfile(t);
  const document = nestedCorridors();
  delete process.env.ARCHIFY_QUALITY_PROFILE;
  const expected = await renderWorkflow({ workflow: document });
  assert.equal(expected.ok, true, JSON.stringify(expected.diagnostics));
  assert.match(expected.svg, /data-quality-gates="advisory"/);

  for (const ambient of ['showcase', 'standard']) {
    process.env.ARCHIFY_QUALITY_PROFILE = ambient;
    const actual = await renderWorkflow({ workflow: document });
    assert.equal(actual.ok, true, JSON.stringify(actual.diagnostics));
    assert.equal(actual.svg.match(/data-quality-profile="([^"]+)"/)?.[1], 'standard');
    assert.match(actual.svg, /data-quality-gates="advisory"/);
    assert.equal(actual.svg, expected.svg);
    assert.equal(actual.html, expected.html);
  }
});

test('renderWorkflow quality arguments and authored profiles control both acceptance and metadata', async t => {
  restoreProfile(t);
  process.env.ARCHIFY_QUALITY_PROFILE = 'standard';
  const document = nestedCorridors();
  const explicitShowcase = await renderWorkflow({ workflow: document, qualityProfile: 'showcase' });
  assert.equal(explicitShowcase.ok, false);
  assert.ok(explicitShowcase.diagnostics.some(({ code }) => code === 'workflow/explicit-pin-conflict'));

  document.meta.quality_profile = 'showcase';
  const authoredShowcase = await renderWorkflow({ workflow: document });
  assert.equal(authoredShowcase.ok, false);
  assert.ok(authoredShowcase.diagnostics.some(({ code }) => code === 'workflow/explicit-pin-conflict'));

  process.env.ARCHIFY_QUALITY_PROFILE = 'showcase';
  const explicitStandard = await renderWorkflow({ workflow: document, qualityProfile: 'standard' });
  assert.equal(explicitStandard.ok, true, JSON.stringify(explicitStandard.diagnostics));
  assert.match(explicitStandard.svg, /data-quality-profile="standard"/);
  assert.doesNotMatch(explicitStandard.svg, /data-quality-gates="advisory"/);
});

test('workflow CLI still resolves its quality profile from the environment', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-api-quality-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const input = path.join(directory, 'workflow.json');
  const output = path.join(directory, 'workflow.html');
  fs.writeFileSync(input, JSON.stringify(nestedCorridors()));
  const renderer = fileURLToPath(new URL('../renderers/workflow/render-workflow.mjs', import.meta.url));
  const run = profile => spawnSync(process.execPath, [renderer, input, output], {
    encoding: 'utf8',
    timeout: 15000,
    env: { ...process.env, ARCHIFY_QUALITY_PROFILE: profile, ARCHIFY_DIAGNOSTIC_FORMAT: 'json' },
  });
  const strict = run('showcase');
  assert.equal(strict.status, 1, strict.stderr || strict.error?.message);
  assert.ok(JSON.parse(strict.stderr).diagnostics.some(({ code }) => code === 'workflow/explicit-pin-conflict'));
  assert.equal(fs.existsSync(output), false);

  const standard = run('standard');
  assert.equal(standard.status, 0, standard.stderr || standard.error?.message);
  assert.match(fs.readFileSync(output, 'utf8'), /data-quality-profile="standard"/);
});

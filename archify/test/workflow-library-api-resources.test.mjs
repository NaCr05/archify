import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { renderWorkflow } from '../renderers/workflow/workflow-api.mjs';

const renderer = fileURLToPath(new URL('../renderers/workflow/render-workflow.mjs', import.meta.url));

function workflow() {
  return {
    schema_version: 2,
    diagram_type: 'workflow',
    meta: { title: 'Resource contracts', output: 'caller-owned.html', locale: 'en', quality_profile: 'standard', legend: { mode: 'hidden' } },
    lanes: [{ id: 'main', label: 'Main' }],
    nodes: [
      { id: 'a', lane: 'main', col: 0, type: 'frontend', label: 'Input', brand: 'openai' },
      { id: 'b', lane: 'main', col: 3, type: 'backend', label: 'Output', brand: 'github' },
    ],
    edges: [{ id: 'ab', from: 'a', to: 'b', label: 'request' }],
  };
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function directory(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-api-resources-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function runRenderer(t, document, repoRoot) {
  const root = directory(t);
  const input = path.join(root, 'input.json');
  const output = path.join(root, 'output.html');
  fs.writeFileSync(input, JSON.stringify(document));
  const env = { ...process.env, ARCHIFY_DIAGNOSTIC_FORMAT: 'json' };
  delete env.ARCHIFY_QUALITY_PROFILE;
  delete env.ARCHIFY_REPO_ROOT;
  if (repoRoot) env.ARCHIFY_REPO_ROOT = repoRoot;
  const result = spawnSync(process.execPath, [renderer, input, output], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30000,
    env,
  });
  assert.ifError(result.error);
  return { ...result, html: fs.existsSync(output) ? fs.readFileSync(output, 'utf8') : undefined };
}

async function assertFailureParity(t, document, code, repoRoot) {
  const before = structuredClone(document);
  const library = await renderWorkflow({ workflow: deepFreeze(document), repoRoot });
  assert.equal(library.ok, false);
  assert.equal(library.html, undefined);
  assert.equal(library.svg, undefined);
  assert.deepEqual(library.diagnostics.map(entry => entry.code), [code]);
  assert.deepEqual(document, before);

  const cli = runRenderer(t, document, repoRoot);
  assert.equal(cli.status, 1, cli.stderr);
  assert.equal(cli.stdout, '');
  assert.equal(cli.html, undefined);
  assert.deepEqual(JSON.parse(cli.stderr).diagnostics, library.diagnostics);
}

function repositoryFixture(t) {
  const root = directory(t);
  function git(...args) {
    const result = spawnSync('git', ['-c', `safe.directory=${root}`, '-C', root, ...args], {
      encoding: 'utf8',
      timeout: 30000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src/router.js'), 'export function route(input) {\n  return input.kind;\n}\n');
  git('init', '--quiet');
  git('config', 'core.autocrlf', 'false');
  git('remote', 'add', 'origin', 'https://github.com/example/archify-api-fixture');
  git('add', 'src/router.js');
  git('-c', 'user.name=Archify Fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Synthetic evidence fixture');
  const document = workflow();
  document.meta.repository = {
    url: 'https://github.com/example/archify-api-fixture',
    revision: git('rev-parse', 'HEAD'),
  };
  document.nodes[0].sources = [{ path: 'src/router.js', line: 1, end_line: 3 }];
  return { root, document };
}

test('default brand preparation preserves frozen inputs and matches real CLI output across repeated calls', async t => {
  const document = deepFreeze(workflow());
  const before = structuredClone(document);
  const first = await renderWorkflow({ workflow: document });
  assert.equal(first.ok, true, JSON.stringify(first.diagnostics));
  assert.match(first.svg, /data-brand-mark="openai"/);
  assert.match(first.svg, /data-brand-mark="github"/);

  const alternate = workflow();
  delete alternate.nodes[0].brand;
  const [again, different, third] = await Promise.all([
    renderWorkflow({ workflow: document }),
    renderWorkflow({ workflow: alternate }),
    renderWorkflow({ workflow: document }),
  ]);
  assert.deepEqual(again, first);
  assert.deepEqual(third, first);
  assert.equal(different.ok, true, JSON.stringify(different.diagnostics));
  assert.doesNotMatch(different.svg, /data-brand-mark="openai"/);
  assert.match(different.svg, /data-brand-mark="github"/);
  assert.deepEqual(document, before);

  const cli = runRenderer(t, document);
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(cli.html, first.html);
});

for (const { code, mutate } of [
  { code: 'schema/type', mutate: document => { document.nodes[0].col = 'invalid'; } },
  { code: 'relationship/duplicate-id', mutate: document => { document.edges.push({ id: 'ab', from: 'b', to: 'a' }); } },
  { code: 'guided-view/invalid', mutate: document => { document.meta.views = [{ id: 'view', label: 'View', focus: ['missing'] }]; } },
  { code: 'workflow/required-edge', mutate: document => { document.semanticChecks = { requiredEdges: [{ from: 'b', to: 'a' }] }; } },
  { code: 'brand/unknown', mutate: document => { document.nodes[0].brand = 'archify-test-unknown-brand'; } },
]) {
  test(`library and real CLI return the same ${code} diagnostic without rendered output`, async t => {
    const document = workflow();
    mutate(document);
    await assertFailureParity(t, document, code);
  });
}

test('default resources retain pinned repository evidence in the result and CLI-identical HTML', async t => {
  const { root, document } = repositoryFixture(t);
  // Verification must use the pinned Git object, even when the working file
  // no longer contains the authored line range.
  fs.writeFileSync(path.join(root, 'src/router.js'), 'changed working tree\n');
  const before = structuredClone(document);
  const result = await renderWorkflow({ workflow: deepFreeze(document), repoRoot: root });
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.equal(result.sourceEvidence.verified, true);
  assert.equal(result.sourceEvidence.referenceCount, 1);
  assert.equal(result.sourceEvidence.repository.revision, document.meta.repository.revision);
  assert.match(result.sourceEvidence.nodes.a[0].href, /\/blob\/[a-f0-9]{40}\/src\/router\.js#L1-L3$/);
  const payload = result.html.match(/<script id="archify-source-evidence-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(payload, 'Verified evidence must also reach the rendered HTML.');
  assert.deepEqual(JSON.parse(payload[1]), JSON.parse(JSON.stringify(result.sourceEvidence)));
  assert.match(result.svg, /data-brand-mark="openai"/);
  assert.deepEqual(document, before);

  const cli = runRenderer(t, document, root);
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(cli.html, result.html);
});

for (const { code, mutate, omitRoot } of [
  { code: 'repository-evidence/root-required', omitRoot: true },
  { code: 'repository-evidence/origin-mismatch', mutate: document => { document.meta.repository.url = 'https://github.com/example/different-repository'; } },
  { code: 'repository-evidence/revision-unavailable', mutate: document => { document.meta.repository.revision = '0'.repeat(40); } },
  { code: 'repository-evidence/file-missing', mutate: document => { document.nodes[0].sources[0].path = 'src/missing.js'; } },
  { code: 'repository-evidence/line-out-of-range', mutate: document => { document.nodes[0].sources[0].end_line = 999; } },
]) {
  test(`library and real CLI preserve the ${code} failure`, async t => {
    const { root, document } = repositoryFixture(t);
    mutate?.(document);
    await assertFailureParity(t, document, code, omitRoot ? undefined : root);
  });
}

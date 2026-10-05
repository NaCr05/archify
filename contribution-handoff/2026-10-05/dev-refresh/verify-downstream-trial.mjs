// Usage: node verify-downstream-trial.mjs <astro-checkout> <archify-checkout> <new-evidence-dir>
// Apply downstream-trial.patch, install the retained tarball and dependencies,
// and move the consumer's vendor directory aside before running this verifier.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
assert.equal(process.argv.length, 5, 'Provide consumer, source, and new evidence directories');
const [consumer, source, evidence] = process.argv.slice(2).map(p => path.resolve(p));
assert(!fs.existsSync(path.join(consumer, 'vendor')), 'The vendored copy must be unavailable');
fs.mkdirSync(evidence);
const readJson = p => JSON.parse(fs.readFileSync(p));
const packageRoot = path.join(consumer, 'node_modules', '@tt-a1i', 'archify');
const installed = readJson(path.join(packageRoot, 'package.json'));
const bin = path.resolve(packageRoot, installed.bin.archify);
const traceFile = path.join(evidence, 'public-cli-trace.jsonl');
const audit = path.join(path.dirname(fileURLToPath(import.meta.url)), 'astro-spawn-audit.cjs');
const env = {
  ...process.env,
  ASTRO_TELEMETRY_DISABLED: '1',
  PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}`,
  NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require "${audit.replaceAll('\\', '/')}"`.trim(),
  ARCHIFY_TRIAL_BIN: bin,
  ARCHIFY_TRIAL_TRACE: traceFile,
};
async function run(name, args, cwd, context, useAudit = true) {
  const fd = fs.openSync(path.join(evidence, `${name}.log`), 'w');
  const childEnv = { ...env, ARCHIFY_TRIAL_CONTEXT: context };
  if (!useAudit) childEnv.NODE_OPTIONS = process.env.NODE_OPTIONS || '';
  const status = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, env: childEnv, stdio: ['ignore', fd, fd] });
    child.once('error', reject);
    child.once('close', resolve);
  }).finally(() => fs.closeSync(fd));
  assert.equal(status, 0, `${name} failed; inspect its log`);
  console.log(`${name}: passed`);
}
function declaredBin(packageRoot, name) {
  const metadata = readJson(path.join(packageRoot, 'package.json'));
  return path.resolve(packageRoot, typeof metadata.bin === 'string' ? metadata.bin : metadata.bin[name]);
}
const baselineTypes = ['architecture', 'dataflow', 'lifecycle', 'sequence', 'workflow'];
await run('tests', [declaredBin(path.join(consumer, 'node_modules', 'vitest'), 'vitest'), '--run'], consumer, 'tests');
const builds = [];
for (const demo of ['astro-demo', 'starlight-demo']) {
  const project = path.join(consumer, demo);
  await run(demo, [declaredBin(path.join(project, 'node_modules', 'astro'), 'astro'), 'build', '--force'], project, demo);
  const dist = path.join(project, 'dist');
  const diagrams = fs.readdirSync(path.join(dist, '_archify')).filter(n => n.endsWith('.html'));
  let iframes = 0;
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '_archify') continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith('.html')) {
        const html = fs.readFileSync(file, 'utf8');
        assert(!/<div\b[^>]*class="archify-diagram-error"/.test(html));
        for (const match of html.matchAll(/<iframe\b[^>]*\bsrc="([^\"]*_archify\/[^\"]+)"/g)) {
          assert(fs.existsSync(path.join(dist, match[1].replace(/^\//, ''))), `Missing artifact: ${match[1]}`);
          iframes++;
        }
      }
    }
  };
  walk(dist);
  assert.equal(diagrams.length, 6);
  assert.equal(iframes, 6);
  builds.push({ demo, diagrams: diagrams.length, iframes });
}
const warmBuilds = [];
for (const demo of ['astro-demo', 'starlight-demo']) {
  const project = path.join(consumer, demo);
  await run(`${demo}-warm`, [declaredBin(path.join(project, 'node_modules', 'astro'), 'astro'), 'build'], project, `${demo}-warm`);
  const dist = path.join(project, 'dist');
  const diagrams = fs.readdirSync(path.join(dist, '_archify')).filter(n => n.endsWith('.html'));
  let iframes = 0;
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '_archify') continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith('.html')) {
        const html = fs.readFileSync(file, 'utf8');
        assert(!/<div\b[^>]*class="archify-diagram-error"/.test(html));
        for (const match of html.matchAll(/<iframe\b[^>]*\bsrc="([^"]*_archify\/[^"]+)"/g)) {
          assert(fs.existsSync(path.join(dist, match[1].replace(/^\//, ''))), `Missing warm artifact: ${match[1]}`);
          iframes++;
        }
      }
    }
  };
  walk(dist);
  assert.equal(diagrams.length, 6);
  assert.equal(iframes, 6);
  warmBuilds.push({ demo, diagrams: diagrams.length, iframes, errorBlocks: 0, danglingTargets: 0 });
}
const trace = fs.readFileSync(traceFile, 'utf8').trim().split('\n').map(JSON.parse);
for (const build of builds) {
  const calls = trace.filter(r => r.context === build.demo);
  build.publicCliCalls = calls.length;
  build.types = [...new Set(calls.map(r => r.type))].sort();
  assert.deepEqual(build.types, baselineTypes);
}
for (let i = 0; i < trace.length; i++) {
  const record = trace[i];
  assert.equal(record.status, 0);
  const input = path.join(evidence, `input-${i}.json`);
  const output = path.join(evidence, `source-${i}.html`);
  fs.writeFileSync(input, record.source);
  const args = [path.join(source, 'archify', 'bin', 'archify.mjs'), 'render', record.type, input, output];
  if (record.quality) args.push('--quality', record.quality);
  await run(`source-${i}`, args, consumer, 'source-comparison', false);
  assert.equal(createHash('sha256').update(fs.readFileSync(output)).digest('hex'), record.sha256);
}
const result = {
  node: process.versions.node,
  platform: process.platform,
  archifyHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim(),
  package: `${installed.name}@${installed.version}`,
  vendorUnavailable: true,
  builds,
  warmBuilds,
  byteIdenticalRenders: trace.length,
};
fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));

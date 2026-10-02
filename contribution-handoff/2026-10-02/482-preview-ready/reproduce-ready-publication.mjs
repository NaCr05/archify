import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(process.argv[2]);
const original = path.join(repo, 'archify/test/preview-force-stop.test.mjs');
const generated = path.join(repo, 'archify/test/preview-ready-publication.repro.test.mjs');
if (fs.existsSync(generated)) throw new Error(`Refusing to overwrite ${generated}`);
const source = fs.readFileSync(original, 'utf8');
const anchor = "      import fs from 'node:fs';";
if (source.split(anchor).length !== 3) throw new Error('Expected two child-process fixtures');
// Widen the ordinary open/truncate -> write interval for only the ready marker.
// The fixed test writes delivery.ready.tmp; the original writes delivery.ready.
const delayedWrite = `${anchor}
      const markerWrite = fs.writeFileSync;
      fs.writeFileSync = function (target, ...args) {
        if (typeof target === 'string' && /delivery[.]ready(?:[.]tmp)?$/.test(target)) {
          markerWrite.call(this, target, '');
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
        }
        return markerWrite.call(this, target, ...args);
      };`;
fs.writeFileSync(generated, source.replaceAll(anchor, delayedWrite));
try {
  const result = spawnSync(process.execPath, [
    '--test', '--test-name-pattern=force preserves recovery material at the real delivery', generated,
  ], { cwd: path.join(repo, 'archify'), encoding: 'utf8', timeout: 60000 });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  fs.unlinkSync(generated);
}

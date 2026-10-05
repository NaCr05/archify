#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

// The npm proof records one commit as its source. Keep both the index (used for
// staging's file selection/modes) and tracked working files bound to that commit.
const [repoRoot, expectedRevision, ...extra] = process.argv.slice(2);

function git(args) {
  const result = spawnSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
}

try {
  if (!repoRoot || extra.length) {
    throw new Error('Usage: verify-npm-package-source.mjs <repository> [expected-revision]');
  }
  const head = git(['rev-parse', '--verify', 'HEAD']);
  if (head.status !== 0) throw new Error(`unable to resolve package source revision: ${head.stderr.trim()}`);
  const revision = head.stdout.trim();
  if (expectedRevision && revision !== expectedRevision) {
    throw new Error('package source revision changed during verification; rerun from the intended clean commit');
  }

  for (const target of [[], ['--cached']]) {
    const result = git([
      'diff', '--quiet', '--no-ext-diff', '--no-textconv', '--ignore-submodules=none',
      ...target, revision, '--',
    ]);
    if (result.status === 1) {
      throw new Error('npm package verification requires a clean tracked checkout, including the index; commit or stash changes and rerun');
    }
    if (result.status !== 0) throw new Error(`unable to verify package source: ${result.stderr.trim()}`);
  }
  process.stdout.write(`${revision}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}

const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { syncBuiltinESMExports } = require('node:module');
const original = childProcess.spawn;
childProcess.spawn = function (command, args, options) {
  const matches = Array.isArray(args)
    && args[1] === 'render'
    && path.resolve(args[0]) === path.resolve(process.env.ARCHIFY_TRIAL_BIN);
  const source = matches ? fs.readFileSync(args[3], 'utf8') : null;
  const child = original.call(this, command, args, options);
  if (matches) child.once('close', status => {
    const html = status === 0 ? fs.readFileSync(args[4]) : null;
    const qualityAt = args.indexOf('--quality');
    const record = {
      entrypoint: '@tt-a1i/archify/bin/archify.mjs',
      context: process.env.ARCHIFY_TRIAL_CONTEXT,
      type: args[2],
      quality: qualityAt === -1 ? null : args[qualityAt + 1],
      status,
      source,
      sha256: html ? createHash('sha256').update(html).digest('hex') : null,
    };
    fs.appendFileSync(process.env.ARCHIFY_TRIAL_TRACE, `${JSON.stringify(record)}\n`);
  });
  return child;
};
syncBuiltinESMExports();

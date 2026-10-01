# PR #533: full dev refresh and real downstream trial

Prepared 2026-10-01. This is an adoptable candidate for the existing PR, with a
retained, tested tarball and an astro-archify migration prototype. The original
PR remains owned by its author; this handoff does not change its head or base.

## Revisions and change scope

| Input | Revision |
| --- | --- |
| Latest upstream dev, checked again after validation | `470c07274c0f5bf5c9b33a8405022da7b8bc359d` |
| Original #533 | `ecab25aa3ead5d02d686fe551f4e747b9cceef4a` |
| Refreshed candidate | [`6a30f574831c428fa7de67504e7b240552a60d37`](https://github.com/NaCr05/archify/commit/6a30f574831c428fa7de67504e7b240552a60d37) |
| Candidate branch | [`integrate/npm-cli-dev-refresh`](https://github.com/NaCr05/archify/tree/integrate/npm-cli-dev-refresh) |
| Consumer | [`joesaby/astro-archify@1f5e15b210094f9f94ea95ef5c2b685fc810468a`](https://github.com/joesaby/astro-archify/tree/1f5e15b210094f9f94ea95ef5c2b685fc810468a) |

The original six-file packaging change was replayed onto dev as `5883b6e`,
preserving vipul156's authorship. Conflicts retain dev's `3.0.2-dev.1` version,
current lockfile, and ownership-safe staging implementation. The installation
checks are `605b4c4`; `6a30f57` adds a real `overrides` fixture, documents clean
staging, retains the exact verified tarball, and rebuilds `archify.zip`.

The complete diff against dev is eight files. There are no renderer/schema
changes or independent version bump. Package naming and registry publication
remain maintainer decisions.

## Exact artifacts

- [Tested tarball](artifact/tt-a1i-archify-3.0.2-dev.1.tgz):
  `@tt-a1i/archify@3.0.2-dev.1`, 105 files, 1,770,252 bytes.
- Tarball SHA-256:
  `58959e7f501a4fd6cdd528c3c7c825237cabc41e6d1df9908d2e2f42c4653161`.
- [Packed file list and integrity](artifact/pack.json),
  [tested source revision](artifact/source-revision.txt).
- Canonical ZIP SHA-256:
  `f3080d93c4bd1971b3a1fc23c8ccbc734a01440e862fdf38bce637765bc09091`.

The ZIP was built with official Node 22.23.2 / bundled zlib `1.3.1-e00f703` on
Windows, then rebuilt byte-identically on Linux. Its 106 entries comprise 105
files and the root directory. Against dev, only `archify/package.json` changes;
there are no added or removed entries. See [ZIP comparison](evidence/packaging/zip-diff.json).

The retained tarball above was produced on Windows and is the exact archive
installed in the downstream trial. It also passed local/npx and isolated-global
installation plus five-type source parity on Linux. The separate Linux pack
has a different integrity because its CLI entry carries mode 0755 instead of
0644; the retained Windows archive is therefore tested directly on both hosts.

## Packaging validation

| Check | Result |
| --- | --- |
| Windows local/npx and isolated global install | passed, five types and classified failure exits |
| Linux local/npx and isolated global install | passed, five types and classified failure exits |
| The exact retained Windows tarball installed on Linux | passed through both CLI paths, five-type byte parity |
| Extracted ZIP smoke, Windows and Linux | passed |
| Canonical ZIP rebuilt across both hosts | byte-identical |
| Windows clean staging tests | 21 passed, 1 symlink-permission skip |
| Local DSH package/zero-regression contracts | 8 passed |

The external Skills CLI discovery attempt stalled while fetching its tool and
was stopped. That check was excluded from the eight local DSH checks. It is not
reported as passing, and no live Skill installation was changed.

[All packaging logs](evidence/packaging), including
[Windows PoC](evidence/packaging/windows-npm-poc.log),
[Linux PoC](evidence/packaging/linux-npm-poc.log), and
[the retained tarball on Linux](evidence/packaging/linux-windows-tarball.log).

### Full-suite boundary

The full Linux `npm test` result is **not green**: 2,394 tests, 2,297 passed,
2 failed, 95 skipped. Skips include real-browser, host-specific filesystem,
and optional integration coverage.

Both failures also reproduce on unmodified dev at `470c072`. The same two
modules were rerun serially on both revisions:

| Check | Original dev | Candidate |
| --- | --- | --- |
| Slow-network update checker: expected `check-failed`, observed `timeout` | fails | passes on focused rerun |
| Visual-check summary: expected 4 screenshot links, observed 0 | fails | fails |
| Two-module totals | 93 passed / 2 failed | 94 passed / 1 failed |

The tested modules and their update/visual-check implementations are unchanged
by this candidate. The initial full-suite failures remain recorded; a focused
rerun is not a replacement green full-suite claim.

[Full run](evidence/packaging/linux-full-suite.log),
[dev control](evidence/packaging/base-recheck.tap),
[candidate control](evidence/packaging/candidate-recheck.tap).
Required hosted CI must still run on the eventual integrated PR head.

## Real astro-archify trial

The pinned consumer is version 0.4.2 and originally vendors Archify
`2.17.0-dev.1` at `920543b`. The trial used Node 22.23.2, Astro 7.3.5 in both
demos, and Starlight 0.41.11. Demo dependency locks are [archived here](locks).

The original consumer passed all 29 tests and fresh builds of both demos.
Windows initially materialized README as CRLF; its LF-only fence test failed
until README was normalized to the exact line endings stored in Git. No test
assertion was weakened.

Directly switching to the public CLI exposed four failing tests. All four
failures reproduce through the same current-dev source CLI, independently of
the installed archive: [source comparison](evidence/downstream/source-rejection-comparison.json).
The [downstream trial patch](downstream-trial.patch) makes these explicit changes:

1. Resolve the installed manifest's `bin.archify` and spawn it with Node and
   `render <type> <input> <output>`. No renderer module is imported. Explicit
   legacy `rendererRoot` overrides remain supported.
2. Add `meta.output: "output.html"` only when absent, on the temporary parsed
   input. The integration already owns delivery, and the public CLI validates
   the complete IR. Authored source files and existing output fields are kept.
3. Raise the old sequence example's explicit canvas height from 760 to 800 in
   its test fixture and both demo copies. Current dev requires at least 766
   for its legend. The Archify validator and renderer are unchanged.
4. Enable strict rendering in both demo configurations.

With that patch, the `vendor/` directory was moved aside so it could not satisfy
the default renderer path. The installed package then passed:

| Acceptance | Result |
| --- | --- |
| Consumer tests | 29 / 29 passed |
| Standalone Astro, forced full build | 6 diagrams, 6 valid iframe targets, all five types |
| Starlight, forced full build | 6 diagrams, 6 valid iframe targets, all five types |
| Actual installed public CLI subprocesses | 20 captured: 8 test renders and 6 per demo |
| Those outputs versus the same Archify source revision | 20 / 20 byte-identical |

The standalone [reproduction verifier](verify-downstream-trial.mjs) was run
successfully as well: [result](evidence/reproducer/result.json),
[test log](evidence/reproducer/tests.log),
[Astro log](evidence/reproducer/astro-demo.log),
[Starlight log](evidence/reproducer/starlight-demo.log),
[input and output-hash trace](evidence/reproducer/public-cli-trace.jsonl).
These establish subprocess/build and byte-parity evidence, not browser or
perceptual acceptance.

### Existing downstream cache limitation

Ordinary repeated Astro builds can finish with exit 0 while omitting diagram
artifacts reused by the content cache. A control using the **unmodified vendored
integration and original fixtures** reproduces it: the forced build emits all
6 diagrams; the following warm build emits 1 and leaves 5 dangling iframe URLs.
See [control receipt](evidence/downstream/vendor-cache-control.json).

The accepted trial therefore uses `astro build --force` and checks every iframe
target. Persistent artifact/cache handling remains a separate downstream issue;
this handoff does not claim that warm builds are fixed.

## Reproduce and adopt

To validate a fresh packaging checkout at the candidate revision:

```sh
artifact_parent="$(mktemp -d)"
bash scripts/npm-pack-poc.sh "$artifact_parent/verified-package"
```

This retains the exact tarball just tested, its metadata, and the source SHA.
For the archive attached above, verify its SHA-256 before reuse. Publication
would use the verified staged tarball, subject to the maintainer's separate
scope/name and release decisions. Ordinary source-directory packing is not
the validated path.

For the consumer trial, use a fresh LF checkout at `1f5e15b`, install its locked
root dependencies, copy the archived locks into their respective demo folders,
and install both demos before adding the local Archify dependency:

```sh
npm ci --ignore-scripts --no-audit --no-fund
# Copy locks/astro-demo-package-lock.json to astro-demo/package-lock.json,
# and locks/starlight-demo-package-lock.json to starlight-demo/package-lock.json.
(cd astro-demo && npm ci --ignore-scripts --no-audit --no-fund)
(cd starlight-demo && npm ci --ignore-scripts --no-audit --no-fund)
git apply /absolute/path/to/downstream-trial.patch
npm install --save-exact --ignore-scripts --no-audit --no-fund /absolute/path/to/tt-a1i-archify-3.0.2-dev.1.tgz
node -e "require('node:fs').renameSync('vendor', 'vendor-disabled-for-cli-trial')"
node /absolute/path/to/verify-downstream-trial.mjs /absolute/path/to/astro-archify /absolute/path/to/archify-source /absolute/path/to/new-evidence
```

Keep `astro-spawn-audit.cjs` beside the verifier. It records only actual calls to
the installed public CLI. The verifier requires a new evidence directory,
forces both full builds, checks all iframe targets and all five diagram types,
then compares captured outputs with the exact source checkout.

Suggested next step: vipul156 can use the refreshed candidate when updating
#533 against dev; joesaby can review the consumer adapter and explicit fixture
migration, and decide how to address warm-build persistence. Maintainer CI and
merge decisions remain outstanding. No registry publication or live agent
Skill installation was performed.

Log copies remove terminal colors, normalize trailing whitespace, and redact
personal task paths as `<task-root>`. Test outcomes, diagnostics and counts are
preserved. The attached tarball and downstream patch are unmodified test inputs.

# PR #533: source provenance and refreshed validation evidence

The npm proof previously packaged tracked working-tree bytes while labelling the retained artifact with `HEAD`. An uncommitted edit could therefore produce a successful proof for bytes absent from that commit. The follow-up rejects a dirty tracked checkout, checks the same revision again after staging and before reporting success or retaining artifacts, and records the initially captured revision.

- Upstream PR: [tt-a1i/archify#533](https://github.com/tt-a1i/archify/pull/533).
- Reviewed head: `6a30f574831c428fa7de67504e7b240552a60d37`, on dev `470c07274c0f5bf5c9b33a8405022da7b8bc359d`.
- Tested follow-up: [`0e79602e3550ee3dfd1b542aee20472843e3a7b6`](https://github.com/NaCr05/archify/commit/0e79602e3550ee3dfd1b542aee20472843e3a7b6).
- Branch: [`NaCr05:fix/npm-package-source-provenance`](https://github.com/NaCr05/archify/tree/fix/npm-package-source-provenance).
- Package version remains `3.0.2-dev.1`; renderer/schema and staged package contents are unchanged.

## Change and regression evidence

`scripts/verify-npm-package-source.mjs` checks both the index and tracked working files against the captured commit. The index matters because staging uses its file selection and modes: an index change hidden by restoring a working file to HEAD must still fail. All tracked repository changes, including packaging tools, are rejected; untracked artifacts remain excluded by the existing stager. The proof should run without source edits or branch switches.

The check applies to the npm proof only. Existing ZIP and other staging callers retain their current behavior. No verification assertion is weakened, and failure leaves the requested retained-artifact directory absent. The new helper is checked before staging, immediately after staging, and after all package/CLI checks; the original captured value is reused for `source-revision.txt`.

| Verification | Observed result |
| --- | --- |
| Source regression suite, Linux Node 18.20.8 | 9 passed, 0 skipped |
| Source regression suite, Linux Node 22.23.2 | 9 passed, 0 skipped |
| Source regression suite, Windows Node 22.23.2 | 9 passed, 0 skipped |
| Unmodified old script, tracked CLI comment added before packing | Incorrectly succeeds and retains `6a30f57` as the source; the uncommitted comment is present in the tarball |
| Fixed script, same initial tracked edit | Exit 1 before staging; no retained output directory |
| Fixed script, tracked source edited at the real npm invocation after staging | All normal package checks run, then final source verification exits 1; no retained output directory |
| Fixed clean checkout, complete POC on Windows and Linux | Both pass local/npx and isolated-global installs, all five source-output comparisons, and classified exit-1 failure checks |
| Canonical ZIP rebuilt with official Node 22.23.2 | Byte-identical to the committed ZIP; no regenerated ZIP change needed |

The source suite covers staged and unstaged changes, index-only differences, added/deleted inputs, changed packaging tools, a clean but different HEAD, an unborn repository, and untracked output exclusion. These are local results at the follow-up revision. No new hosted CI result is claimed for this commit.

The baseline experiment is intentionally invalid evidence: its retained tarball includes an uncommitted edit. Only the valid clean-checkout Windows and Linux artifacts below are shared. [Artifact inspection](logs/artifact-verification.json) records the old packed-versus-committed CLI digest mismatch, plus the new artifacts' independently recomputed integrity values. [Control exit statuses](logs/integration-controls.json) and full sanitized logs are in [logs/](logs/).

## Exact validated artifacts

Both artifact directories contain the exact tested `.tgz`, npm's full `pack.json` file list/integrity, and `source-revision.txt` containing `0e79602e3550ee3dfd1b542aee20472843e3a7b6`.

| Host | Files | Bytes | SHA256 |
| --- | ---: | ---: | --- |
| [Windows](artifacts/windows/) | 105 | 1,770,252 | `58959e7f501a4fd6cdd528c3c7c825237cabc41e6d1df9908d2e2f42c4653161` |
| [Linux](artifacts/linux/) | 105 | 1,770,259 | `84add661c91e669b874e7ac6b37b59b3cd5acf3c86d5b5e60b7675210cab2387` |

All extracted file contents are identical across hosts. Their tarballs differ only in the archived mode of `package/bin/archify.mjs`. The Windows tarball is byte-identical to the one already handed off and independently tested by joesaby on astro-archify 0.4.3: [32 tests, both cold and warm demo builds, zero missing iframe targets](https://github.com/tt-a1i/archify/pull/533#issuecomment-5943079084). That prior downstream run can be reused for the identical artifact; it is not presented as a newly performed downstream run. The new source-provenance checks were run separately as recorded above.

## Reproduce

Use a clean checkout of the follow-up commit, with Node/npm, Git, tar and Bash (Git Bash on Windows):

```sh
node --test archify/test/npm-package-source.test.mjs
artifact_parent="$(mktemp -d)"
bash scripts/npm-pack-poc.sh "$artifact_parent/verified-package"
cat "$artifact_parent/verified-package/source-revision.txt"
```

To reproduce the dirty-input rejection, use a disposable checkout, append a harmless comment to `archify/bin/archify.mjs`, and run the POC with a new nonexistent artifact directory. The old head incorrectly succeeds; the follow-up fails with `requires a clean tracked checkout`. Do not use the old dirty experiment as a release artifact. The committed regression tests also provide small temporary Git fixtures for the index and HEAD cases.

## Integration and PR description

The original PR currently ends at `6a30f57`, the direct parent of this change. A fast-forward preserves the exact locally tested revision and author attribution:

```sh
git fetch https://github.com/NaCr05/archify.git fix/npm-package-source-provenance
git merge --ff-only FETCH_HEAD
```

Push the existing PR branch, then check hosted CI on `0e79602`. If another change requires a different integrated commit, rerun the POC and retain fresh revision metadata for that head. The already-passing [main CI run on `6a30f57`](https://github.com/tt-a1i/archify/actions/runs/36959227417) and [DSH checks](https://github.com/tt-a1i/archify/actions/runs/36959227419) are previous-head coverage; they do not establish final-head CI for this follow-up.

[PROPOSED_PR_BODY.md](PROPOSED_PR_BODY.md) is a complete replacement for the stale `2.17.0-dev.1` and direct-source `npm pack` instructions in the current PR body. The contributing account cannot edit another author's PR description, so the author needs to apply it. This handoff does not publish to npm, create a release, or add a duplicate upstream PR.

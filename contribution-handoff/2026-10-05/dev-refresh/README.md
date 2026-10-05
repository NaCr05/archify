# October 5 dev refresh: #533 and #482

Both candidates include dev 107b4fb18e8c76dbaac21657d84209f2be0cdeed and preserve the original authors' histories. They are available in NaCr05/archify for fast-forward adoption into the existing upstream PRs.

| Upstream PR | Previous author head | Candidate | Handoff branch |
| --- | --- | --- | --- |
| [#533](https://github.com/tt-a1i/archify/pull/533) | 6a30f574831c428fa7de67504e7b240552a60d37 | [630959ad9b474eb8ec641878395c9bf7a04ca009](https://github.com/NaCr05/archify/commit/630959ad9b474eb8ec641878395c9bf7a04ca009) | fix/npm-package-source-provenance |
| [#482](https://github.com/tt-a1i/archify/pull/482) | 473ecc0299165520aa4f8047aa82ca8890674d91 | [1ed8f29758423f4d1cd36de845e7dd3acd4139bb](https://github.com/NaCr05/archify/commit/1ed8f29758423f4d1cd36de845e7dd3acd4139bb) | fix/workflow-api-dev-refresh |

These are prepared candidates. Upstream adoption, required upstream CI and the maintainer's merge decision remain outstanding until verified in the original PRs.

## What changed

**#533:** kept the clean-source provenance guard offered as 0e79602; merged dev; moved its regression tests into root test/; replaced the associative array with a Bash 3.2-compatible case lookup; rebuilt the canonical ZIP. The new dev introduced five more diagram types and bundled locale catalogs. The npm file allowlist omitted locales/, and an extracted workflow render reproduced a missing-manifest failure before the correction. The allowlist now includes the catalogs, and the proof invokes the shared package smoke checker plus local/npx and isolated-global source parity for all ten diagram types.

The added npm-package CI matrix explicitly uses macOS /bin/bash. It checks out the exact submitted head and retains the tested tarball, pack.json and source-revision.txt. A new dev DSH test expected overrides to survive staging; its expectation now follows the existing #533 clean-manifest contract and explicitly rejects overrides in the packed Skill. This last correction changes only a test.

**#482:** merged dev into the author's 473ecc0, retained the adopted complete-marker publication fix, moved all five API suites to root test/ with corrected imports, and rebuilt the canonical ZIP. The existing source and shared CLI changes merged without text conflicts. The library surface remains workflow-only.

## Validation

| Evidence | Revision | Result |
| --- | --- | --- |
| #533 focused source/staging/discovery checks, Linux Node 18.20.8 and 22.23.2 | e1af1b2 | Each: 31 passed, 1 platform skip |
| #482 API, preview, import/diagnostic isolation and discovery checks, Linux Node 18.20.8 and 22.23.2 | b09868a | Each: 70 passed, 2 platform skips |
| Golden checks | e1af1b2 / b09868a | Passed |
| Canonical ZIP builds, official Node 22.23.2, bundled zlib 1.3.1-e00f703 | Combined source of both candidates | Two builds per candidate are byte-identical; final committed ZIP freshness also passes hosted CI |
| Initial dirty source and a controlled source edit after staging | 23fd1d9 | Both rejected; no retained output |
| Complete Windows and Linux npm proofs | 630959ad9b474eb8ec641878395c9bf7a04ca009 | Passed; ten diagram types, classified failures, shared package contracts |
| DSH corrected tarball tests | 630959ad9b474eb8ec641878395c9bf7a04ca009 | 2/2 passed locally; hosted DSH contracts and distribution acceptance passed |

Focused and golden results retain their actual tested revisions. The subsequent #482 change is the generated ZIP; subsequent #533 changes are its generated ZIP and the DSH test-only correction. The relevant source/tests are unchanged, and final-head package/ZIP/DSH checks cover those later changes. Logs are under [evidence/](evidence/); local filesystem prefixes are redacted, and assertion results are preserved.

## Hosted checks and remaining upstream gates

- [#533 CI on 630959ad9b474eb8ec641878395c9bf7a04ca009](https://github.com/NaCr05/archify/actions/runs/37251488198)
- [#533 DSH on 630959ad9b474eb8ec641878395c9bf7a04ca009](https://github.com/NaCr05/archify/actions/runs/37251488224)
- [#482 CI on 1ed8f29758423f4d1cd36de845e7dd3acd4139bb](https://github.com/NaCr05/archify/actions/runs/37250858273)
- [Recorded job-level snapshot](evidence/ci-snapshot.json)

All listed workflows have finished. #533 CI reports 14 successful jobs, 3 failed jobs and 1 skipped job; its DSH workflow reports 2 successful jobs and 1 skipped release job. #482 CI reports 10 successful jobs, 3 failed jobs and 2 skipped jobs. Both final candidates pass the Node 18/20/22/24 matrix, all three package-smoke jobs, canonical ZIP freshness and the browser/WebM gate. #533 also passes all three npm-package-proof jobs; the macOS log records Bash 3.2.57.

The whole fork CI must not be described as green. Both runs retain three fork-context failures: the published-update-manifest job queries this fork, which has no upstream Release; both Windows path jobs stop when their repository-evidence fixture expects tt-a1i/archify but the checkout origin is NaCr05/archify. Those Windows jobs have therefore not completed the remaining path checks. The original PRs must run those gates after adoption.

DSH originally lacked its pinned 7158026 source history in the fork; the exact upstream commit is now available under ci/dsh-source-7158026. After repairing that validation context, the real metadata-contract mismatch was fixed in 630959ad9b474eb8ec641878395c9bf7a04ca009, and the final DSH workflow passed. No gate was disabled.

## Exact npm artifacts

Version: @tt-a1i/archify@3.0.2-dev.1. Both retained archives contain 145 files and record source 630959ad9b474eb8ec641878395c9bf7a04ca009.

| Host | SHA-256 | Bytes |
| --- | --- | --- |
| [Windows](artifacts/windows/tt-a1i-archify-3.0.2-dev.1.tgz) | c12641496f7f245364c1d55f321fd88c97d96f8ef3522b006f0470f1b0b20bb5 | 3,873,727 |
| [Linux](artifacts/linux/tt-a1i-archify-3.0.2-dev.1.tgz) | 1c0815809447c92cf2d3446cdc1af637ec3798ee93644d9f32fa7d4cfe3c6274 | 3,873,734 |

[File-by-file comparison and CI artifact receipts](evidence/artifact-comparison.json) verifies identical payload bytes; only bin/archify.mjs mode differs (644 on Windows, 755 on Linux). All three downloaded final-head CI artifacts record 630959ad9b474eb8ec641878395c9bf7a04ca009; the Windows archive matches the retained Windows artifact, and Linux/macOS match the retained Linux artifact.

## Fresh consumer trial

astro-archify main 238f194dd5a45a7816b8daa2df0b9b06edd20bd4 (0.4.3), Windows official Node 22.23.2, using the public CLI adapter and with vendor/ moved aside:

- 32/32 tests pass.
- Forced Astro and Starlight builds each emit six diagrams and six valid iframe targets.
- Ordinary repeated builds also emit six diagrams and six valid iframe targets, with no error blocks or missing targets.
- 22 captured successful renders are byte-identical to current source output.

[Measured result](evidence/astro-trial/result.json), [22 render hash receipts](evidence/astro-trial/render-hashes.json), [trial patch](downstream-trial.patch), [verifier](verify-downstream-trial.mjs), and [CLI trace recorder](astro-spawn-audit.cjs).

The consumer run used the Windows archive produced at 23fd1d9. A fresh proof at 630959ad9b474eb8ec641878395c9bf7a04ca009 produces byte-identical tarball bytes, so the consumer evidence applies to the final artifact; it is not relabeled as a second consumer run. The trial retains the previously documented CLI adapter, strict demo mode and sequence fixture height adjustment. Its import context is updated for 0.4.3's existing warm-build fix. No consumer change is proposed for upstream integration here.

## Author adoption

On each existing PR branch, with a clean checkout:

#533:
~~~sh
git fetch https://github.com/NaCr05/archify.git fix/npm-package-source-provenance
git merge --ff-only 630959ad9b474eb8ec641878395c9bf7a04ca009
git push
~~~

#482:
~~~sh
git fetch https://github.com/NaCr05/archify.git fix/workflow-api-dev-refresh
git merge --ff-only 1ed8f29758423f4d1cd36de845e7dd3acd4139bb
git push
~~~

Replace the stale descriptions with [the #533 body](533-PROPOSED-PR-BODY.md) and [the #482 body](482-PROPOSED-PR-BODY.md), then link the original PR's final-head Actions run. If an author branch has advanced, reconcile that work rather than force-pushing. If one PR merges first, refresh the other against the new dev and rebuild its ZIP from the combined source. Release permissions and actual npm publication remain maintainer decisions.

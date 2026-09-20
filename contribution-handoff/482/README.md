# Workflow API #482: fixes and resource-contract handoff

Contribution material for [tt-a1i/archify#482](https://github.com/tt-a1i/archify/pull/482), prepared on 2026-09-20 for the original author to integrate.

- [Exact tested source](https://github.com/NaCr05/archify/tree/c9933c471145d3152cb2d59782bf4c97b65978fb): `c9933c471145d3152cb2d59782bf4c97b65978fb`.
- [Source branch](https://github.com/NaCr05/archify/tree/test/workflow-library-resource-contracts): `test/workflow-library-resource-contracts`.
- [Cumulative source-only patch](cumulative-source.patch): apply after syncing original #482 `77b1fd5` with dev `5769206`. It contains our fixes and tests, excluding upstream changes and the binary ZIP.
- This handoff branch contains publication notes and logs; those files are not part of the proposed upstream code change.

## Changes

1. A library call with no quality profile remains advisory even if the host sets `ARCHIFY_QUALITY_PROFILE=showcase`. The compiler's actual policy and SVG metadata use one resolved value. Explicit parameters and the CLI's environment behavior remain intact.
2. Library failures do not enter global CLI diagnostic history, including failures after asynchronous brand preparation. AsyncLocalStorage preserves isolation without clearing earlier CLI diagnostics or suppressing unrelated concurrent CLI recording. Per-call error diagnostics remain available.
3. Tests no longer require the compiler to accept duplicate relationship IDs, which #462 correctly rejects. The library uses the landed shared cross-collection validator. Early validation remains before resource preparation, and the compiler keeps its own boundary for direct callers.
4. Twelve new public-API/real-CLI tests cover default brands, frozen and repeated inputs, pinned repository evidence, embedded evidence, invalid schema, duplicate IDs, invalid guided views, semantic failures, unknown brands, missing repository roots/files/revisions, origin mismatch, and out-of-range lines. Successful HTML and failure diagnostics are compared directly.

The adapter comment accurately describes possible template/repository reads and remote brand I/O. No redesign of `meta.output`, brand-resource options, or the other four renderers is included.

## Integration

#462 is already merged into dev as `5769206e556e3a74a382b826ad84391080280ccc`. Its final PR head was `d12d0ee`.

The source branch preserves the original #482 history and our earlier fix commits. The actual merge of our repairs with dev is `054ba7b`; only `archify.zip` conflicted, and it was rebuilt from the combined source with Node 22.

For #482:

1. Sync with dev containing #462.
2. Apply [cumulative-source.patch](cumulative-source.patch). It was checked and actually applied to a separate original-#482-plus-dev tree; all tracked files except the deliberately excluded ZIP then matched the tested source.
3. Rebuild `archify.zip` from the author's final branch with Node 22, run the relevant checks and hosted CI, then request maintainer review.

The patch is 8 files, 421 insertions and 24 deletions. Its SHA-256 is `74c156ed6442d8adfe0f08cb50ba05d990dda1bb90f32eee8a868cac23cc33c0`. The comparison source-tree object is `3060a5c7a3f7c4e851216ae9d1ff464c5d50f196`; its temporary old ZIP was not a deliverable.

## Validation

These are local results, not a claim about hosted CI on #482's eventual integrated head.

| Check | Result | Evidence |
| --- | --- | --- |
| New resource tests, Windows Node 22.23.2 | 12 pass, 0 fail | Included in the contract run below |
| Library/compiler contracts, Windows Node 22.23.2 | 99 pass, 0 fail, 0 skip | [Log](evidence/contracts-node22.tap) |
| Full npm test, Linux Node 22.23.2, final c9933c4 | 2,045 pass, 0 fail, 76 skip | [Log](evidence/linux-full-test.log) |
| Extracted ZIP library tests, Windows Node 24.17.0 | 23 pass, 0 fail, 0 skip | [Log](evidence/package-node24.log) |
| Canonical ZIP rebuild, Linux Node 22 | Byte-identical | [Build record](evidence/zip-freshness.log) |
| Extracted ZIP smoke, Linux Node 22 | Passed | [Log](evidence/package-smoke.log) |
| Package payload audit | 85 entries; canonical source and modes preserved | [Audit](evidence/package-audit.json) |
| Regression tests before the earlier fixes | 2 pass, 3 expected failures | [Baseline log](evidence/regressions-before-fix.tap) |

The focused source run was performed before the ZIP-only commit; its runtime/test files are identical to final c9933c4. The Linux full run and extracted-package checks used that final snapshot. The package audit compares against actual merge 054ba7b; only workflow-api.mjs changed inside the ZIP after that point.

The baseline failure log is from dev d2f9229 plus original #482, integration commit c6500c2, with the five new regression tests added before the production fixes. Its three failures demonstrate the quality mismatch, synchronous diagnostic retention and asynchronous diagnostic retention.

Full npm test also passed the four freshness gates and golden renders. The 76 skips include real-browser tests, platform/filesystem conditions, an external repository fixture and the separate site gate. No real-browser acceptance is claimed. Extracted-package checks did not install node_modules; Git was available for evidence tests.

Final ZIP SHA-256: `b86f2a018165503249655b16f64046b639bf20e25a9b88ef3e8329d6a00228b9`.

Machine-specific workspace/build prefixes in the published logs are normalized where present; test assertions, diagnostics, counts and outcomes are unchanged. [Machine-readable validation summary](validation.json).

# #482: focused brand-resource follow-up

Prepared on 2026-09-21 for [the maintainer's brand-resource correction](https://github.com/tt-a1i/archify/pull/482#issuecomment-5760467551), against #482 head `62940ddabeece27028bdedb0dede658df8da72b2`.

- [Source-only patch](brand-source.patch), six files; no ZIP or unrelated dev changes.
- [Tested source and regenerated package](https://github.com/NaCr05/archify/tree/152c652dc2f879357d4fb9a529c5aa243f8d9a40), on `fix/workflow-api-brand-preparation`.
- Source change: `5fdfee542f13423b1cb0dce86e64edc1d3f001f9`; package commit: `152c652dc2f879357d4fb9a529c5aa243f8d9a40`.
- This is an optional integration patch for #482. It does not reopen the earlier quality/diagnostic fixes or the broader resource-contract proposal.

## Change and reproduction

Remove the `prepareBrandMarks` skip option and always prepare the library's cloned document. Existing draft callers passing `prepareBrandMarks: false` now get normal brand preparation and validation. Existing tests no longer use the removed option.

The new six-test public-API suite covers:
- Valid OpenAI/GitHub brands, with default options and with the removed flag; HTML matches the actual renderer CLI.
- Unknown brands with both option shapes; the API returns `brand/unknown`, no HTML/SVG, and the same diagnostics as the CLI.
- A document already prepared by its caller: the API must still prepare its own clone.
- Frozen inputs and repeated/concurrent success, unbranded and failure calls without cross-call contamination.

On unchanged `62940dd`, the suite gives **3 passes / 3 failures**: valid brands disappear with the skip flag, unknown brands incorrectly succeed, and caller-prepared brands disappear after cloning. The fix makes all six pass. The workflow README now gives an executable results/errors example, explains template/repository/network resource I/O, and identifies the subprocess/worker boundary needed for kill-on-timeout isolation.

## Validation

All new runtime checks used official Node 22.23.2. Logs are under [evidence/](evidence/); local account names in paths are replaced with `contributor`, with test results unchanged.

| Revision / environment | Result |
| --- | --- |
| Original #482, native Windows; [brand regression](evidence/brands-baseline-node22-native.tap) | 3 passed, 3 expected failures |
| Patched #482, native Windows; [API/compiler/import/diagnostics](evidence/candidate-focused-node22.tap) | 46 passed, 0 failed, 0 skipped |
| Patched #482, Linux; [same focused checks and golden harness](evidence/candidate-linux-test.log) | 46 passed, 0 failed, 0 skipped; golden passed |
| Patched #482, Linux; [extracted-package API tests](evidence/candidate-package-tests.log) | 15 passed, 0 failed, 0 skipped, without node_modules |
| Patched #482 plus dev `0b8b955f14668fbec83303f6533dfa1f93a516c5`; [full Linux npm test](evidence/integration-linux-test.log) | 2047 passed, 0 failed, 76 conditional skips; generation/golden checks passed |
| That dev integration; [extracted-package API tests](evidence/integration-package-tests.log) | 15 passed, 0 failed, 0 skipped |
| [README example](evidence/readme-example-node22.log), extracted package / Windows | Branded success writes HTML; invalid brand returns diagnostics and preserves the previous output |

The local dev integration merged automatically except for `archify.zip`, which was rebuilt from the combined source (local rehearsal commit `efa67e69fd26c390b125306a4f7c1c62ac37b650`). Linux checks use exact Git source archives with temporary Git metadata for tracked-file package validation. Both source variants passed canonical ZIP repeat-build comparison and extracted-package smoke.

The package against #482 retains all 85 entries and modes. Only `workflow-api.mjs` and its README change inside the archive; [content audit](evidence/package-content-audit.json). Its SHA-256 is `8d64db57c0059def16977102b8470591ba81a51a17e37287c8f0b634f08e4aea`.

The [patch application check](evidence/patch-application.json) applies the source patch to the original #482 Git index and reproduces source tree `096a0a340abda67f0cb34719388a49dec2960dde` exactly. Patch SHA-256: `8213441fae6a936a0d8056b649fff2e7a47f9befd776db50016fa1e3847ff994`.

## Integration

From the current #482 source (or after syncing dev), apply `brand-source.patch`, regenerate `archify.zip` with Node 22 from the final combined tree, and run the relevant checks / hosted CI on the author's final branch. The source patch deliberately excludes generated ZIP bytes because that archive also reflects the selected dev base.

No new hosted CI, browser/perceptual review, or astro-archify site trial is claimed for this follow-up. The 76 local skips remain skips. The maintainer's earlier downstream trial belongs to the unpatched PR head. This contribution remains within #482; no competing upstream PR was opened.

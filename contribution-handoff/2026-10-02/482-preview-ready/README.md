# Complete readiness markers for the preview force-stop tests

The Node 18 job on Archify PR #482 failed while reading the retained snapshot, before testing shutdown preservation. A marker-publication race reproduces that failure. A one-file test correction publishes the marker by rename only after the write completes. Preview, delivery, and Workflow API production code are unchanged.

- Compared dev: `470c07274c0f5bf5c9b33a8405022da7b8bc359d`.
- Compared PR #482: `3606fba410c36b3ef989bb8fd0c51d2152916542`.
- Proposed fix: [`64cc8ae9a05da844b64a83eff6229b464d642858`](https://github.com/NaCr05/archify/commit/64cc8ae9a05da844b64a83eff6229b464d642858), a direct child of that PR head.
- Branch: [`NaCr05:test/preview-ready-publication`](https://github.com/NaCr05/archify/tree/test/preview-ready-publication).
- Original [Node 18 job and logs](https://github.com/tt-a1i/archify/actions/runs/36944416351/job/110643168654): Node 18.20.8, 2,311 passed, one failed, 100 skipped. Failure: `preview: force preserves recovery material at the real delivery snapshot window`, `ENOENT` at `preview-force-stop.test.mjs:229`.

## Diagnosis and boundary

`until(() => fs.existsSync(ready))` observes creation, while the child uses `writeFileSync(ready, contents)`. That synchronous call is synchronous only for the writer: the parent can run between opening/creating the file and writing its contents. At the snapshot boundary an empty marker becomes an empty pathname; the sibling receipt boundary can instead parse empty JSON.

The preview implementation and this test file are byte-identical between the compared dev and PR heads. The unmodified force-stop module passed normally on both heads. A controlled reproduction widens only the ready-marker creation-to-write interval by 300 ms. Both heads then fail the snapshot case with the same `ENOENT`/read stack as hosted CI, and the receipt case with an empty-JSON error. This demonstrates an existing test synchronization race; the original CI did not retain the marker bytes, so the historical scheduler interleaving cannot be recovered directly.

The fix writes `delivery.ready.tmp` and renames it to `delivery.ready` after the content is complete, for both child fixtures. It does not add retries, weaken preservation assertions, suppress errors, or modify the product. The retained snapshot, claimant content, previous output, input cleanup, HTTP shutdown, and repeated-stop assertions still run.

## Local results

Official runtimes: Linux Node 18.20.8 and 22.23.2; Windows Node 22.23.2. The Node 18 archive was checked against the official distribution SHA256 list. Tests ran against the final patch bytes; the tested source SHA256 is `6e9c132bd7d52ff8116b551a90b400e9a680be7f615d3fe4ee5383bc33a9cdd0`.

| Revision / scenario | Result |
| --- | --- |
| Unmodified dev, Node 18, force-stop module | 7 passed |
| Unmodified PR, Node 18, force-stop module | 7 passed |
| Unmodified dev and PR, delayed marker | Each: both selected cases fail; five unrelated cases filtered |
| Fixed, Node 18, all three preview modules | 39 passed, 0 failed, 2 platform skips |
| Fixed, Node 22 Linux, all three preview modules | 39 passed, 0 failed, 2 platform skips |
| Fixed, delayed marker, all three runtime/host combinations | Both selected cases pass on each; Node 18 reports the five filtered cases as skipped |
| Fixed, Node 22 Windows, force-stop cases within the expanded run | 6 passed, 1 POSIX-only skip |
| Fixed, Node 22 Windows, all three preview modules | 33 passed, 1 failed, 7 skipped; see environment limitation below |

The expanded Windows failure is `preview: rejects destructive or unsupported startup targets before watching`: this host cannot create the required directory symlink (`EPERM`). The exact same test fails on unmodified dev for the same reason. It is not reported as passed or silently skipped. The Linux skips are the case-insensitive-filesystem and Windows 8.3 cases. Sanitized full local logs are under [logs/](logs/).

The production code and package inputs are unchanged. `scripts/stage-clean-skill.mjs` excludes `archify/test/`, so the existing ZIP remains valid and was not regenerated. This focused test correction does not require repeating unchanged rendering/browser evidence. These are local results, not a replacement for hosted CI on the author's integrated head.

## Reproduce and adopt

The portable [reproducer](reproduce-ready-publication.mjs) requires a disposable checkout at the chosen revision and its supported Node runtime. It makes a temporary sibling test file, applies the same marker-only timing perturbation to the two child fixtures, runs the two public force-stop cases, and removes that temporary file in `finally`. It refuses to overwrite an existing file. Production files and the tracked test remain untouched.

```sh
# From this evidence directory; repeat with pristine dev, PR head, and fixed checkouts.
node reproduce-ready-publication.mjs /absolute/path/to/disposable-checkout

# Ordinary focused coverage from the checkout's archify/ directory.
node --test --test-concurrency=2 test/preview-force-stop.test.mjs test/preview-contract.test.mjs test/preview.test.mjs
```

The original implementation should fail the two perturbed cases; the fixed implementation should pass them. The perturbation is an external diagnostic harness and is not included in the proposed source commit.

For adoption into the existing #482 branch:

```sh
git fetch https://github.com/NaCr05/archify.git test/preview-ready-publication
git cherry-pick 64cc8ae9a05da844b64a83eff6229b464d642858
```

A plain [patch](ready-publication.patch) is also included. Push the integrated branch and inspect newly triggered hosted CI, especially Node 18. A rerun of the old head alone cannot validate this correction. The same test-only change applies to dev if maintainers prefer it separately; no duplicate upstream PR has been opened.

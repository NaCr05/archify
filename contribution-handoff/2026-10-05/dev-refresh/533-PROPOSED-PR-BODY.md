## Problem and behavior

Fixes #408.

Prepare @tt-a1i/archify@3.0.2-dev.1 as an installable CLI package for consumers such as astro-archify. The package exposes bin.archify; main/exports remain absent while the separate library API work continues under #222.

The package is built through the tracked-only clean staging pipeline shared with the Skill ZIP. Runtime resources include all ten current renderer types and bundled locale catalogs. Shipped metadata omits lifecycle scripts, dependency fields and overrides.

The proof requires a clean tracked checkout and index. It captures one source revision, checks it after staging and before retention, and retains the exact tested tarball, pack.json and source-revision.txt. Dirty inputs or a changed revision fail verification. The script supports Bash 3.2, including macOS /bin/bash.

## Reproduce

From a clean repository checkout with Bash >=3.2, Node >=18, npm, Git and tar:

~~~sh
artifact_parent="$(mktemp -d)"
bash scripts/npm-pack-poc.sh "$artifact_parent/verified-package"
~~~

The output directory must not exist. This stages the package, runs shared extracted-package contracts and local/npx plus isolated-global CLI checks outside the checkout, compares all ten diagram types with source output, and checks classified failures.

Ordinary npm pack or npm publish from archify/ retains repository-only metadata and is not the supported publishing input. A future registry publication must use the verified staged tarball; package publication is a separate maintainer action.

## Validation

Comparison base: dev 107b4fb18e8c76dbaac21657d84209f2be0cdeed. Prepared final candidate: 630959ad9b474eb8ec641878395c9bf7a04ca009.

- Complete final-head Windows and Linux proofs pass. Three-platform hosted npm proof also passes; macOS explicitly runs Bash 3.2.57.
- Final-head Node 18/20/22/24, three-platform package smoke and the browser/WebM gate pass.
- All three downloaded CI artifacts name the final source revision and contain the same 145 file contents. Windows differs only in the CLI executable mode at the archive level.
- Focused provenance/staging/discovery tests pass on Node 18 and 22; initial and mid-proof dirty-source controls reject without retained output. Evidence records the actual local revisions and reuse rationale.
- Canonical ZIP was rebuilt from combined dev source and passes hosted byte-for-byte freshness. The DSH metadata test follows the shared stripping contract; hosted DSH package and distribution acceptance pass.
- A fresh astro-archify 0.4.3 trial passes 32/32 tests, six artifacts in each of two cold and warm demo builds, zero missing iframe targets, and 22 source/installed render comparisons. Its tested Windows tarball is byte-identical to the final retained artifact.

[Artifacts, hashes, logs, consumer patch, recorded CI jobs and revision boundaries](https://github.com/NaCr05/archify/tree/review/october-contribution-handoff/contribution-handoff/2026-10-05/dev-refresh).

[Fork CI](https://github.com/NaCr05/archify/actions/runs/37251488198) and [DSH](https://github.com/NaCr05/archify/actions/runs/37251488224) are validation evidence for the prepared candidate. The whole fork workflow is not green: upstream-specific release and Windows-origin gates fail in the fork. The original PR still requires CI after adopting the final head; record that upstream run separately.

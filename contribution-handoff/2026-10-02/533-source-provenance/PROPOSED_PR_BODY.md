## Problem and behavior

Fixes #408.

Prepare a CLI-first npm package so consumers such as astro-archify can install Archify and invoke its public CLI as a subprocess. The package is `@tt-a1i/archify@3.0.2-dev.1`, produced through the tracked-only clean staging pipeline shared with the Skill ZIP.

The package exposes `bin.archify`; `main` and `exports` remain absent while the separate library API work proceeds under #222. Its file allowlist includes the renderer, validation, CLI, template/font, documentation and example resources needed by shipped commands. Staged metadata excludes lifecycle scripts, dependency fields and overrides, and installation does not install an agent Skill.

The verification script requires a clean tracked checkout, including the index. It captures one source revision, checks it again after staging and after the CLI proof, then optionally retains the exact tested tarball, `pack.json`, and that same `source-revision.txt`. Uncommitted source changes or a different HEAD fail verification.

## Supported packaging path

From a clean repository checkout with Node/npm, Git, tar and Bash available:

```sh
artifact_parent="$(mktemp -d)"
bash scripts/npm-pack-poc.sh "$artifact_parent/verified-package"
```

This command stages tracked package inputs, removes repository-only manifest fields, packs the staging directory, and tests that tarball outside the source checkout. Ordinary `npm pack` or `npm publish` from `archify/` retains repository-only metadata and is not the supported publishing input.

The output directory must not exist. Consumers can install the retained `.tgz` with `npm install /absolute/path/to/verified-package/tt-a1i-archify-3.0.2-dev.1.tgz`. Any future registry publication must use the verified staged tarball. Publication permissions and release automation remain separate maintainer decisions.

## Validation and revisions

- Comparison base: dev `470c07274c0f5bf5c9b33a8405022da7b8bc359d`.
- Latest locally verified follow-up: `0e79602e3550ee3dfd1b542aee20472843e3a7b6`.
- Complete Windows and Linux POC runs with official Node 22.23.2 pass. They install the same per-run tarball locally and into an isolated global prefix, run outside the checkout, compare all five diagram types with source output, and check exit 1 plus classified JSON failures.
- The source-provenance regression suite passes all 9 tests on Linux Node 18.20.8, Linux Node 22.23.2, and Windows Node 22.23.2. Controlled initial and mid-proof source edits are rejected without retained output.
- The canonical ZIP is fresh and byte-identical when rebuilt with official Node 22.23.2 and bundled zlib. No runtime/schema or version change is introduced by the provenance follow-up.
- Hosted CI and DSH checks passed on the preceding head `6a30f57`: [CI](https://github.com/tt-a1i/archify/actions/runs/36959227417), [DSH](https://github.com/tt-a1i/archify/actions/runs/36959227419). Hosted CI must also pass on the final integrated follow-up head; these links are not a claim of new-head CI success.

[Exact tested tarballs, file lists, integrity/revision metadata, sanitized logs and reproduction controls](https://github.com/NaCr05/archify/tree/review/october-contribution-handoff/contribution-handoff/2026-10-02/533-source-provenance).

Both retained packages contain 105 files. The Windows tarball SHA256 is `58959e7f501a4fd6cdd528c3c7c825237cabc41e6d1df9908d2e2f42c4653161`; the Linux tarball SHA256 is `84add661c91e669b874e7ac6b37b59b3cd5acf3c86d5b5e60b7675210cab2387`. Extracted file contents match across hosts; the CLI archive mode accounts for the tarball difference.

## Real consumer evidence

joesaby independently verified the Windows tarball with astro-archify 0.4.3: 32 tests passed, both Astro and Starlight demos generated six artifacts on full and warm builds, and no iframe targets were missing. [Consumer report](https://github.com/tt-a1i/archify/pull/533#issuecomment-5943079084).

The new Windows proof produces byte-identical tarball bytes, so that downstream evidence remains applicable to the artifact. It is not a new downstream run. The downstream package still needs to declare the eventual published dependency and complete its migration. This PR prepares and validates packaging; it does not publish a registry release.

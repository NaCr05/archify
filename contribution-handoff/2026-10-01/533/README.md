# PR #533: isolated installation contracts

Follow-up: [full dev refresh, rebuilt ZIP, and real downstream trial](dev-refresh/README.md). The notes below preserve the earlier reproduction against the original PR head.

## Source and scope

- Original PR head: `ecab25aa3ead5d02d686fe551f4e747b9cceef4a`.
- Its reported CI base: `8809b273c278a813a47fa37698864779c0d4cf08`.
- Current dev used for a local rehearsal: `470c07274c0f5bf5c9b33a8405022da7b8bc359d` (`3.0.2-dev.1`).
- Follow-up: [e39777f](https://github.com/NaCr05/archify/commit/e39777f729f0a9ae81f57431c2ec2c0dc553f367), branch `test/npm-package-install-contracts`.
- Only `scripts/npm-pack-poc.sh` changes. Package identity, runtime code, release policy and canonical ZIP are not changed by this follow-up.

The existing five-type comparison read input examples from the source checkout, and did not exercise an isolated global installation. The follow-up uses the installed examples after comparing their bytes with source, runs local/npx and isolated-prefix global CLI paths outside the checkout, compares all five HTML outputs, and checks exit 1 plus classified JSON diagnostics for invalid input. It prints the source revision, actual package version, tarball integrity and packed file list. The global prefix includes a space.

## Reproduced CI failures

Official Node 22.23.2, bundled zlib `1.3.1-e00f703`, Linux:

| Check | Original base | Original PR | Current dev |
| --- | --- | --- | --- |
| Existing committed ZIP package smoke | pass | fails on `overrides` | pass |
| Rebuilt ZIP equals committed ZIP | yes | no | yes |
| First DSH zero-regression test | fails | fails | pass |

The base and PR commit exactly the same ZIP (SHA-256 `d2296515b0091fb8f00580ea9e0b665d91ca5839fde651abe3ecd57a3ca178ec`). The PR strengthens the package-smoke assertion and changes manifest staging but leaves that ZIP unchanged. Rebuilding from the PR source makes package smoke pass; the original npm PoC also passes. Hosted Node 22 failed the canonical-archive comparison, matching the same stale-artifact finding.

The DSH failure rejects the additional repository-maintenance SKILL.md. It reproduces unchanged on the original base and is already fixed on current dev; it is not a packaging regression introduced by #533.

See [hosted failure excerpts](evidence/hosted-failures.json) and [local baseline logs](evidence/baseline).

## Validation of this follow-up

- Linux on the original PR: local and isolated-global installation, both doctor checks, five-type byte parity through each installation, and both JSON failure/exit checks pass.
- Windows with Git Bash, Node 22.23.2 and npm 11.13.0: the same checks pass, including a global prefix containing a space.
- Linux local current-dev rehearsal: the same checks pass with package version `3.0.2-dev.1`. This rehearsal copies only the PR's name/publishConfig/repository/files fields, removes private and staged overrides, and uses the follow-up script. It is not an author-updated PR or a complete port of all six PR files.
- These runs used the source base plus the exact follow-up script later committed as e39777f. The logs print their original base SHA; they do not represent hosted CI at e39777f.
- No macOS run, registry publication, full-suite rerun, browser acceptance or astro-archify full-build result is claimed here.

Logs: [PR Linux](evidence/pr-linux-poc.log), [Windows](evidence/pr-windows-poc.log), [current-dev rehearsal](evidence/dev-rehearsal-poc.log).

## Adoption

Fetch branch `test/npm-package-install-contracts` from `NaCr05/archify`, or apply [the source commit patch](https://github.com/NaCr05/archify/commit/e39777f729f0a9ae81f57431c2ec2c0dc553f367.patch). Run `bash scripts/npm-pack-poc.sh` with Node/npm/git/tar available. The script stages and packs into temporary directories; it does not publish.

Suggested division: this follow-up covers installation-contract validation; vipul156 retains the main packaging/dev refresh, and joesaby retains the real astro-archify trial. The updated final source should regenerate the ZIP and run the required CI. The publishing entry point, package name/scope and release permissions still need the decisions requested by the maintainer.

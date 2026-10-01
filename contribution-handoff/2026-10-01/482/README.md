# PR #482: public API repository-evidence coverage

## Source and scope

- PR head: `1825012d50157e8bbb0823c598a5d935ec517374`.
- Test-only follow-up: [d161c06](https://github.com/NaCr05/archify/commit/d161c062b07f0b8863acbcc80ee25711bf689fc7), branch `test/workflow-api-repository-evidence`.
- Adds only `archify/test/workflow-library-api-repository-evidence.test.mjs`. Runtime files and the canonical ZIP are unchanged.

Three public `renderWorkflow()` tests create temporary Git repositories with pinned commits:

1. A valid source produces verified `sourceEvidence`, expected revision-specific links, the same evidence in HTML, and HTML identical to the public CLI with `--repo-root`. The working-tree file is deliberately changed after committing to prove verification uses the pinned blob.
2. Missing `repoRoot` returns the classified `repository-evidence/root-required` failure.
3. A source that exists locally but not in the pinned commit returns `repository-evidence/file-missing`, precise source/revision evidence, no render output, and preserves the input and host exit code.

## Validation

Official Node 22.23.2:

- Windows: all 18 Workflow library API tests pass, no skips.
- Linux: the same 18 tests pass, no skips.
- Extracted committed ZIP, without source-checkout dependencies: the three new tests pass.
- Temporary mutation removing repository verification: all three new tests fail.
- Temporary mutation dropping evidence from HTML: the success-path test fails (two other tests pass).

Mutations existed only in a disposable test checkout. They are not part of the source commit. Windows sandbox path-identity checks initially encountered EPERM; the stated passing Windows run used normal filesystem permissions.

Logs: [Windows API](evidence/windows-api.tap), [Linux API](evidence/linux-api.tap), [extracted package](evidence/extracted-package.tap), [omitted verification](evidence/omit-verification.tap), [omitted HTML evidence](evidence/omit-html-evidence.tap).

From `archify/`, run:

```sh
node --test test/workflow-library-api-*.test.mjs
```

Fetch branch `test/workflow-api-repository-evidence` from `NaCr05/archify`, or apply [the source commit patch](https://github.com/NaCr05/archify/commit/d161c062b07f0b8863acbcc80ee25711bf689fc7.patch). This addresses the evidence-coverage comment without changing the maintainer's CLI-first sequencing. It does not resolve the PR's current dev conflict or establish final integrated CI.

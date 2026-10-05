## Problem and behavior

Closes #527. Workflow-first library API proof for #222.

An application importing a CLI renderer can unintentionally read process arguments, write files or terminate its host process. This change adds an async renderWorkflow() entry point that clones the parsed input, validates it, prepares repository evidence and brand resources, compiles the workflow and returns HTML/SVG plus metadata and diagnostics to the caller.

Classified rendering failures return structured data. Invalid API arguments and unclassified implementation errors can still throw. The library does not install the CLI process-level diagnostic boundary; callers own delivery. Resource preparation can read files or fetch authored pinned brand resources, and the template is read on first use.

The API validates schema, relationship IDs, edge endpoints, engineering profiles, repository evidence and brand resources. Current dev no longer enforces guided-view contracts; this PR does not claim that removed behavior.

Shared HTML filling keeps CLI/API output aligned. AsyncLocalStorage isolates diagnostic recording across async calls, resolved quality policy stays independent of ambient process environment, and repository evidence reaches both the returned result and the rendered output. Scope remains workflow-only; other renderers retain their current CLI paths.

## Attribution and dev refresh

Preserves the original implementation and the credited NaCr05 host-isolation analysis, brand-resource correction, repository-evidence tests and preview readiness-marker fix. The marker fix is test-only: write content to a temporary marker and rename after completion.

Prepared candidate 1ed8f29758423f4d1cd36de845e7dd3acd4139bb merges dev 107b4fb18e8c76dbaac21657d84209f2be0cdeed into author head 473ecc0. The five API test files moved to root test/ with updated imports, matching dev; archify.zip was rebuilt from the combined source.

## Validation

- Linux official Node 18.20.8 and 22.23.2: each focused run reports 70 passed, 0 failed, 2 platform skips, covering all 18 API cases, preview, import/diagnostic isolation and test discovery.
- Golden checks pass; two canonical ZIP builds match, and hosted final-head ZIP freshness passes.
- Final-head fork CI passes Node 18/20/22/24, three-platform package smoke and the browser/WebM gate.
- Fork CI retains three context-dependent failures: its missing upstream Release and both Windows origin-fixture checks. Those Windows jobs stop at the origin mismatch and do not establish the remaining Windows path coverage. Original-PR final-head CI is still required after adoption.

The local focused/golden checks were run at b09868a; the only following change is the rebuilt ZIP. Final-head CI runs at 1ed8f29758423f4d1cd36de845e7dd3acd4139bb. This distinction replaces older blanket claims about the full suite.

[Final-head fork CI](https://github.com/NaCr05/archify/actions/runs/37250858273). [Logs, revision boundaries, ZIP evidence and adoption instructions](https://github.com/NaCr05/archify/tree/review/october-contribution-handoff/contribution-handoff/2026-10-05/dev-refresh).

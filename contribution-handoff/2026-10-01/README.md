# Packaging validation and Workflow API evidence follow-up

Prepared 2026-10-01. This handoff contains two independent contribution workstreams. The latest #533 follow-up includes a full dev refresh, rebuilt ZIP, and real downstream trial; #482 remains a separate test-only change.

- [Latest #533: full dev refresh and real downstream trial](533/dev-refresh/README.md), candidate `6a30f57`, with the exact tested tarball and consumer migration patch.

- [PR #533 installation-contract follow-up](533/README.md): source commit [e39777f](https://github.com/NaCr05/archify/commit/e39777f729f0a9ae81f57431c2ec2c0dc553f367).
- [PR #482 repository-evidence tests](482/README.md): source commit [d161c06](https://github.com/NaCr05/archify/commit/d161c062b07f0b8863acbcc80ee25711bf689fc7).

No upstream PR was replaced, no package was published, and no live Skill installation was changed. Integration, final-head hosted checks, and downstream acceptance remain with the original PRs. Local log copies remove terminal colors, normalize trailing whitespace, and replace personal workspace paths with `<task-root>`; results and counts are unchanged.

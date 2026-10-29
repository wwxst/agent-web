# Granted native workspace: concurrent file-tab reads and stale completion ordering — 2026-10-28

## Verified source and preceding implementation

The user-provided `frontend/webview/assets/app-initial-5851df3f6cb1.js`
SHA-256 is `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`.
Its `IX/k3o` path selects an existing file tab by stable source ID and reuses
its content instance, as documented in `SOURCE_REVIEW_FILE_TAB_LIFECYCLE_20261028.md`.
The original private `XL` native file loading / focus scheduling is unavailable.

Before this batch, the independent read-only fallback in mounted
`demo/App.tsx` used one `workspaceOpenInFlightRef` across **both** the
native user-consent folder chooser and *every* subsequent file read.
A second file click during an already-authorized slow read returned
immediately without opening anything. Late completions could also
reselect an older tab or overwrite the new content for a reopened path.

## Changes integrated into the existing UI

- Keep **only** the native directory chooser single-flight. Once the
  sender-scoped workspace grant exists, the same mounted canonical
  user-message attachment buttons can issue overlapping read-only file
  requests via the existing narrow Electron preload method. The native
  main-process sender/epoch/path/descriptor bounds from PR #66 are unchanged.
- Track monotonic preview selection intent and last issued request **per
  original `k3o` file ID**. A different file completing late is stored
  as a background tab without taking selection away from a newer click.
  A stale read for the **same** file ID cannot replace a newer reopen.
- Manual tab selection and tab closure override in-flight activation.
  Closing a tab cancels its outstanding local-result acceptance; switching
  conversation clears all request identities and invokes the existing
  native permission revoke.
- Put source tab data and active selection in the existing
  `SourceReviewFileTabModel`; no replacement panel or new Agent backend IPC.
  Preserve fallback visibility for a sole completed background read when
  a newer request fails or has not yet finished.
- Do not register a selection intent for an ignored click while a native
  directory chooser is still pending.

## Regression coverage

- Core model test exercises a late, inactive file result that must not
  steal selection and a first-result fallback.
- Canonical Chromium mounted-user-message test suspends two separate
  host file reads, resolves the later one first, then verifies both tabs,
  one selected tab, and the correct body.
- The same browser test reopens one file twice, resolves the newer
  content first, and rejects the older result. It then closes a tab
  with another pending read and verifies that the tab stays closed.

## Boundaries / acceptance

This restores correctness for asynchronous requests in the **independent
read-only local preview**, not a guessed replica of Codex private `XL`
ordering, editor, remote filesystem or tab persistence. Browser tests use
an explicitly synthetic `agentWebDesktopHost` on the canonical mounted
message and are not proof of real Windows Electron interaction. The
native Linux/Windows tests remain required in CI, as does visual comparison
to the identical installed Codex build. No raw compiled assets, Agent
backend code or `main` branch are modified.

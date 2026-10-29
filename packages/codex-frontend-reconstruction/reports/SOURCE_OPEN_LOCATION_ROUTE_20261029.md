# Original `onOpenLocation` route into the local read-only preview — 2026-10-29

## Compiled-source evidence

All observations below come from the user-provided `frontend.zip`; proprietary bundles are not copied into the repository.

- `frontend/webview/assets/app-initial-5851df3f6cb1.js`
  - SHA-256: `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`
  - The local file-preview tab's `onOpenLocation` calls `IX(e, t.path, ...)` with `line = t.range.start.line + 1`, `column = t.range.start.character + 1`, and `resetTabState: true`. That callback does **not** forward `range.end` as `endLine`. It also retains the current tab panel target and derives the workspace root for the destination path.
- `frontend/webview/assets/review-file-source-breadcrumb-987458adbcad.js`
  - SHA-256: `0a8f50343e2a3a6e45bd84488e5ae44254c124c83e42b29bc8817b6d9a000ad9`
  - The file-source language wrapper obtains host language capabilities, gates definition navigation on the advertised `locationKinds`, and exposes source-confirmed Go to Definition, Type Definition, Implementations, and References actions. It also wires Ctrl/Cmd-click on eligible code tokens to the definition lookup and routes a selected result to `onOpenLocation`.
- `frontend/webview/assets/review-file-source-item-ea4a7f8c2999.js`
  - SHA-256: `53812bb091af4ce685638b26c055f8a0f51928ebe9dfe120c47fa48bf09c5a92`
  - The file-source item passes `onOpenLocation` to that language-aware wrapper alongside the current file path and content.
- `frontend/webview/assets/text-file-editor-tab-content.electron-e71f710dc03c.js`
  - SHA-256: `ba7c1910c4075b90e92cf1566a76ffef1f630dada835bf5b466a031d77150607`
  - The original editor controller accepts the location callback and owns the destination editor lifecycle.

## Integrated implementation

- Added `SourceOpenLocationModel.ts` to validate the source-shaped location and map the zero-based LSP start position to one-based `line` / `column`. The range end is intentionally not forwarded by this callback route.
- Connected `App.tsx`'s `openWorkspaceLocation` to the existing attachment/read-only-tab flow. It requires an already granted local workspace and does not open a new directory picker in response to a location event.
- The existing native bridge still receives only the absolute `path` and one-based `line` (plus `endLine` only when an existing caller supplies one). `column`, `resetTabState`, and the LSP range never become filesystem authority or new IPC arguments.
- Added a clearly labeled synthetic demo event and a mounted Playwright regression that verifies the existing tab is reused, line 14 / column 4 is revealed, stale scroll is superseded, and only path + line cross the native-reader boundary.
- Added core model tests for zero-based conversion, path preservation, omitted range-end forwarding, and fail-closed malformed positions.

## Verification boundary

This integrates and tests the **callback-to-local-preview route**. It does not restore the language-service provider, capability query, definition/reference results, or original context-menu / Ctrl-click surface in the independent frontend. The demo fixture supplies a synthetic event only; it is not an LSP implementation. Local file access remains native-grant-scoped and read-only. No Agent backend or `main` changes.

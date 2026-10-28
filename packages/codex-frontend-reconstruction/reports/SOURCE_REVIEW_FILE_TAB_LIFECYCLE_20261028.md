# Source IX/k3o file tab lifecycle and bounded local preview integration — 2026-10-28

## Compiled Codex evidence

This batch uses original uploaded `frontend/webview/assets/app-initial-5851df3f6cb1.js`
SHA-256 `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`.

- `HJ` (byte ~7,301,903) routes local `openInSidePanel` requests
  through a host-owned content-kind/metadata and `Zyo/e` target.
  Cloud tasks can load `review-file-source-tab-67af095f5331.js`
  (actual 256-byte re-export chunk) and `openReviewFileSourceTab`
  with environment-scoped file coordinates; this is NOT reproduced by
  the independent file reader.
- `IX` (byte ~7,943,909) is the main file-source tab open function.
  It delegates `XL(scope,F3o,...)` into the existing host panel
  tab registry, keyed by `k3o(scope,path,options)`. It reuses a
  matching tab `contentInstance` and retains the passed `line`,
  `endLine`, `column` in the tab props. Existing tabs are
  queried through `panel.tabById$` and matched by `hostId/path`.
- `k3o` (byte ~7,948,358) builds exactly:
  `options.tabId ?? (hostId==null ? "file:"+path
    : "file:"+hostId+":"+(environmentId==null?"":environmentId+":")+path)`.
  `cX` can resolve environment ID from the original app store; the
  independent preview **does not invent an environment or host ID**.
- `O3o` toggles the active file panel; `sX` synchronizes the set
  of open tabs to the original local-thread host. Durable tab routes,
  `isPreview`, tab replacement, tab panel layout, and editor state
  are owned by private `XL/F3o` and remain unavailable.

The tiny `review-file-source-tab-67af095f5331.js` only re-exports
`openReviewFileSourceTab`, `getReviewFileSourceTabId`, and
`toggleReviewFileSourceTab`. Restoring the original full editor
from that re-export would be inaccurate.

## Implemented in the already mounted conversation

- `SourceReviewFileTabModel.ts` restores source-exact `k3o` tab IDs,
  dedup on open, active file selection and deterministic independent
  close semantics. The **close-next-tab** behavior is deliberately an
  independent fallback, not a claim about private `XL` focus policy.
- Existing `demo/App.tsx` local native file preview state now uses
  this keyed tab model. Real clicks on `SourceUserFileAttachments`
  trigger the same user-consented sender-scoped IPC; responses add or
  update tabs only for the current thread epoch.
- The already present `WorkspaceReadOnlyPreviewPanel.tsx` now
  contains a scrollable file tab strip; each tab selects its existing
  read-only text and line-range highlight, with per-file Close.
  It does not launch a separate editor/renderer or fake a cloud file.
- Thread switch/reset revoke the actual native directory grant and
  discard this independent panel's tab state; no file reads become
  authorized simply by a new tab ID.

## Validation and limits

Tests pin k3o identities (local, explicit host and environment),
file re-open without duplication, open/select/close order, selected
content and line range, and thread-scoped grant revocation.
A second explicitly synthetic workspace file is added to the existing
demo host fixture solely for exercising the canonical mounted user
message in Chromium; there is no production-synthetic host integration.
Real Windows/Linux Electron tests continue to verify preload, native
clipboard, read-only permissions and right-click keyboard menus.

This is **not** the original Codex FileSourceTab or editor:
private `XL` tab layout and persistence, remote task file loading,
editor contents, file tree and open-target discovery remain missing.
The panel explicitly says "Read-only local preview" and "Not the
original Codex file manager." No Agent backend, `main`, or original
compiled source bundle files are modified.

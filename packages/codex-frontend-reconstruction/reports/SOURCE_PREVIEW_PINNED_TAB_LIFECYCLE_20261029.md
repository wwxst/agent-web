# Source XL preview/pinned file-tab lifecycle — 2026-10-29

## Compiled Codex evidence

Evidence is from the user-provided `frontend.zip`, not screenshot inference.

- `frontend/webview/assets/app-initial-5851df3f6cb1.js`, SHA-256
  `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`:
  - `IX` at byte ~7,943,909 forwards its optional `isPreview` flag into
    `XL`; an ordinary open with no flag is not a preview.
  - The tab-controller add path `j` at ~5,027,200 calls `P` when inserting
    a new preview. `P` locates and disposes the prior `isPreview` tab,
    removes it from the tab registry and strip, then the new tab is inserted.
    Permanent tabs are not replaced.
  - `ce(e,t) { A(e,t,{isPreview:false}) }` is the controller's `pinTab`
    implementation. The app-shell tab's double-click action invokes it for
    an `isPreview` tab.
  - `Eqi` near byte ~5,415,600 separately offers **Pin to sidebar** /
    **Unpin from sidebar** when the original pinned-content registry is
    available. That action is NOT equivalent to merely making a preview
    permanent: it also creates/removes a sidebar pinned-content reference.
- `frontend/webview/assets/review-file-tree-side-pane-6403b8872f72.js`,
  SHA-256 `7db45f694481f92c4e0320484d012797b49439d1b53958491623f326c766a319`:
  - The ordinary tree selection callback invokes `K(path,{isPreview:true})`.
    The tree's explicit open/double-click callback invokes
    `K(path,{isPreview:false})`.
  - Search result selection uses the same preview callback, and the search
    result's explicit open action uses the pinned callback.
  - Therefore this is a source-confirmed single-click-preview /
    double-click-pinned contract for the file tree and its search results.

## Integrated behavior in the existing React/Electron preview

- `SourceLocalReadOnlyFileTab.isPreview` now models the disposable-preview
  flag. Adding a *new* preview removes only the previous preview; all
  permanent tabs survive. Reopening an existing permanent tab as a preview
  does not demote it. An ordinary/pinned reopen of an existing preview keeps
  that tab and makes it permanent.
- The existing `WorkspaceGrantedDirectoryTree` and its native filename
  search results delay a single-click by 250 ms so a double-click can cancel
  the preview action. Single click opens/reuses a preview; double-click opens
  or keeps a permanent tab. Keyboard activation uses the preview route.
- The already-mounted `WorkspaceReadOnlyPreviewPanel` renders preview tab
  labels in italics, exposes preview state to accessibility/automation, pins
  a preview on tab double-click, and adds a local **Keep tab** menu action.
  This is deliberately not labelled **Pin to sidebar**, because the private
  sidebar pinned-content registry is not implemented.
- The existing conversation attachment route remains a permanent open by
  default, consistent with `IX` when `isPreview` is omitted. After a native
  read, its returned root-relative path is compared with open tabs so opening
  the same granted file through the tree and the conversation attachment
  reuses the same live tab rather than duplicating it or exposing the grant
  root.
- A separate monotonically increasing preview request identity rejects a
  slow old preview when a newer preview selection has already been issued.
  This is needed because this independent host finishes file reads
  asynchronously, while the original tab controller registers tabs in its
  own host lifecycle.

## Tests and boundaries

- Core tests cover preview replacement, preservation of permanent tabs,
  existing-tab promotion, Keep tab action and active selection when a
  background preview replaces the selected preview.
- Playwright exercises the mounted canonical attachment, single-click
  preview replacement, double-click permanent open, the Keep tab action,
  preview-tab double-click, cross-entry file deduplication, and an older
  unresolved preview completing after a newer preview.
- Existing Linux/Windows Electron smoke continues to test the real isolated
  preload and native host boundary; the preview/pinning E2E uses the same
  canonical mounted React UI with an explicitly synthetic host fixture.

Not restored: original private `XL` panel registry, `contentInstance`
retention, durable route/persistence, the sidebar's real **Pin to sidebar**
registry, remote/cloud hosts, writable editor state, and version-matched
pixel parity. This is a source-grounded local tab lifecycle, not a claim that
the private Codex panel controller or Agent backend has been restored. No
Agent backend, `main`, or compiled bundle files are changed.

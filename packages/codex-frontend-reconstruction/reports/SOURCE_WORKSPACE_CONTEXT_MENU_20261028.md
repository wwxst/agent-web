# Original workspace attachment context menu — 2026-10-28

## Source (user-provided original compiled Windows assets)

- `frontend/webview/assets/workspace-file-context-menu-trigger-2c51b734f37b.js`
  SHA-256 `d146a80bcb689c6c3fdd6d68362b98f61127142294aa555f9e994ad8fde1505e`.
  Wrapper `d` renders original `xO` trigger with `getItems:()=>jTt(scope,props)`.
- That `jTt` is **an export alias**, not the unrelated local function of
  the same name: the `app-initial-5851df3f6cb1.js` export list maps
  **`xXo as jTt`**. That original asset SHA-256 is
  `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`.
- `xXo` (original compiled byte offset ~7,812,886) asynchronously fetches
  preferred/available open targets and an optional GitHub URL, then invokes
  `SXo` (original offset ~7,813,296). This is a dynamic host menu, not a
  static submenu inferred from a filename.

Original `SXo` ordered menu branch:

1. `workspace-file-view-file` when `openInSidePanel`, or
   `workspace-file-view-browser` when original browser/viewer host supports
   local HTML (including browser-availability and remote-host gating).
2. `workspace-file-open-targets` / `workspace-file-open-*` when there
   is a **verified** host preference/target list, possibly submenu.
3. `workspace-file-open-in-github` when a genuine computed URL exists.
4. `workspace-file-open-target-separator` if a target or GitHub link exists.
5. `workspace-file-save-as` only when the private
   `workspaceFiles.saveCopy` capability exists and `openMode!="workspace"`.
6. `workspace-file-copy-path` always (original `Oi.clipboard.writeText(C)`).
7. `workspace-file-copy-contents` only if `openMode!="workspace"`, uses
   private `_Xo(queryClient,hostId,path)` to read actual contents.
8. `workspace-file-reveal-path` only if host is local, delegates to
   `target:"fileManager"` with platform-specific text
   `Open in Explorer` on Windows, `Reveal in Finder` on macOS.

## Connected work in PR #61

`SourceWorkspaceFileContextMenuModel.ts` preserves source IDs/order and
the `openInSidePanel`/workspace openMode rules, but exposes only actions
that the independent host can perform: file view (only with a real viewer
callback), copy path and consented read-only file contents. Browser/external
targets, Explorer, Save as, GitHub and office actions are **not** guessed.

The existing canonical `SourceUserFileAttachments` pill now handles
right-click and mounts a portal-backed role=menu with outside-click, Escape
and scroll dismissal. Its parent `ConnectedConversationMessageRenderers`
forwards the authenticated host capabilities and source `Qe` route; it does
not substitute a new transcript or change grouping.

The existing React demo adapter enables Copy path and Copy file contents
**only when the actual independent Electron preload is present**. Copy path
uses the same clipboard API already used by the code-block action. Copy
contents uses the same user-granted, sender-scoped, realpath-validated 1 MiB
UTF-8 reader added in PR #59; it does not open arbitrary files without a
native folder grant, does not modify files and does not issue an Agent RPC.
A failure is surfaced without claiming a successful clipboard operation.
The original private file-viewer still is not rebuilt; this native fallback
remains explicitly independent.

Core regression checks source menu ID/order, gate and upload/shared-thread
denial. Browser end-to-end tests right-click the **mounted user message
attachment**, mock the absent Agent host explicitly and verify copy
clipboard values plus real React menu dismissal. Native Linux/Windows
Electron smoke checks source menu and excludes unavailable OS actions.

## Follow-on blockers

Private `yXo/RJ` preferred target discovery, `_Xo` remote file content
service, `NF` GitHub link computation, native context-menu skin and the
original file-manager, multi-tab and editor integration still need the
authenticated Codex/Agent host counterpart or further source reverse
engineering. A **manual Windows** native folder-picker and clipboard
permission check is still required, and no version-matched pixel comparison
has been performed. No backend or `main` branch is touched.

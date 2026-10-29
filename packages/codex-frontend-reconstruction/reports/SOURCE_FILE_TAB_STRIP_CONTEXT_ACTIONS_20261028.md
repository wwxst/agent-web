# Original Eqi tab-strip close actions on the mounted local preview — 2026-10-28

## Compiled source evidence

User-provided `frontend/webview/assets/app-initial-5851df3f6cb1.js`
SHA-256 `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`
contains `Eqi` near byte 5,415,600. The function requires a current
presented tab instance and `placement === "tab-strip"` for the strip-only
items. For a closeable tab its menu appends, in order:

1. `close-tab` / **Close** — current closeable tab.
2. `close-other-tabs` / **Close other tabs** — enabled when the
   panel contains another `isClosable` tab.
3. `close-tabs-to-the-right` / **Close tabs to the right** — enabled
   when a `isClosable` tab follows the target in `tabs$` order.

The real menu can also include pinned-tab commands, workspace-specific
commands, tab-type-specific commands and source-current guards.
Private `Eqi` returns no menu for an unmounted/stale tab identity.
The source `fe` closes other closeable tabs then activates the target;
`pe` closes only closeable tabs to its right (source byte ~5,033,000).
The original `Hxn/xO` trigger accepts ContextMenu and Shift+F10; its
keyboard/menu surface was previously recovered for *workspace attachments*
in the existing user-message component. Those same accessible semantics
are reused here, not a new native bridge.

## Actual mounted changes

- `SourceReviewFileTabModel.ts` now exposes the source action order,
  enabled checks, deterministic local close-other and close-right
  transformations, based on the existing source `k3o` tab identities.
- The *existing* `WorkspaceReadOnlyPreviewPanel.tsx` tab buttons now
  open an accessible browser fallback menu on right-click,
  Shift+F10 or ContextMenu key. Escape returns focus; arrow/Home/End
  navigation skips disabled commands. The source menu IDs remain in the
  DOM for inspection and automated tests.
- Existing `demo/App.tsx` handles those menu actions on the existing
  per-thread, user-consented native file-tab state. It cancels pending
  results for removed tabs, including outstanding reads for files that
  have not mounted, so stale native IO cannot resurrect a closed tab.
  The existing native read/clipboard security boundary is unchanged.
- Reuse the existing browser fallback menu styling and labels; do not
  imply that the private Codex native menu skin, pinned tabs, workspace
  tab actions, or full `XL` tab controller were recovered.

## Validation scope and acceptance

- Core model tests cover action ordering, disabled flags, closing other
  tabs, closing right-side tabs, unknown targets and preserved state.
- Chromium browser regression exercises the **already mounted canonical
  user-message attachments and read-only side panel**, menu keyboard
  focus/dismiss, close actions, reopens and preserved sender-scoped grant.
  The browser `agentWebDesktopHost` fixture is explicitly synthetic;
  actual native IPC remains covered by the separate Linux/Windows Electron
  suite.
- Full `test:core`, `demo:check-model`, `demo:build`, Chromium and
  Windows/Linux Electron CI must succeed at the final HEAD. Interactive,
  version-matched original Codex visual comparison is still missing.

## Unrestored

No editable source tab, source file tree, private pin/unpin, preview
replacement, durable tab route, remote workspace/cloud host, original
panel focus policy or original native context-menu style. This is a
source-grounded incremental behavior in an explicitly independent,
read-only local preview; no original compiled assets, Agent backend
or `main` branch modification.

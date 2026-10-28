# Codex source xO context-menu keyboard and focus — 2026-10-28

## Original build evidence

Read from the user-supplied, unchanged Windows Codex compiled ZIP:

- `frontend/webview/assets/workspace-file-context-menu-trigger-2c51b734f37b.js`,
  SHA-256 `d146a80bcb689c6c3fdd6d68362b98f61127142294aa555f9e994ad8fde1505e`.
  Its wrapper `d` constructs `xO({getItems:()=>jTt(scope,props),children})`.
- `frontend/webview/assets/app-shared-bbfeca5e5737.js`,
  SHA-256 `a6579611db8acf9c9908e2a29e70a88687eaa1d8f8dbcdc258de58f286051e9d`.
  The export map declares `Hxn as xO`; original `Hxn` begins at
  byte offset ~4,188,921.
- `Hxn` handles `ContextMenu` and `Shift+F10` on the actual trigger,
  rejecting child-origin and Ctrl/Alt/Meta-modified keyboard events.
  With no native menu bridge, it synthesizes a `contextmenu` event from
  `trigger.getBoundingClientRect().left/bottom`; otherwise it requests
  `window.electronBridge.showContextMenu` with the event position.
  In the native path, it remembers the active element, resolves the
  selected command, then restores focus if still connected.
- The dropdown branch delegates menu items to Radix/React `WCe`
  and `qCe`; keyboard Arrow/Home/End traversal, item activation, and
  Escape dismissal are handled by those menu primitives rather than
  by the outer `Hxn` component.

## Actual integrated changes

The existing `SourceUserFileAttachments` used in
`ConnectedConversationMessageRenderers.UserMessage` now:

- Recognizes **ContextMenu** and **Shift+F10** on the workspace file pill,
  at the original trigger boundary, while retaining mouse right-click.
- Keeps menu eligibility bound to source item IDs and the already
  validated host capabilities. No new arbitrary OS/Agent action was added.
- Autofocuses the first enabled menu item and supports Up/Down/Home/End,
  Escape and Tab dismissal, and returns focus to the originating pill
  after Escape/selection.
- Exposes `aria-haspopup`, `aria-controls`, and per-file
  `aria-expanded` without conflating featured/context attachment rows.
- Dismisses on outside pointer, scroll, and window blur. It does not
  hijack outside pointer focus on dismissal.

The browser-portal dropdown is an **independent substitute** for
Codex's source native `showContextMenu` protocol and Radix surface.
A real native integration requires the original Electron bridge's
authenticated menu payload and lifecycle, which are unavailable here.
We do not claim pixel-identical menu skin, shortcuts, or native Windows
menu rendering.

## Validation / explicit limits

Playwright exercises the canonical real user message attachment
via fake-host-only clipboard capabilities; original key shortcuts,
focus lifecycle and arrow traversal must pass. The actual sandboxed
Windows/Linux Electron renderers exercise Shift+F10, menuitem focus,
arrow navigation, and restored trigger focus. Existing original
clipboard and folder authorization regressions are retained.

No Agent backend, OS shell/file-manager, original editor tabs,
workspaces registry or production thread subscription was changed.
This branch is stacked on green PR #62, not merged into `main`.

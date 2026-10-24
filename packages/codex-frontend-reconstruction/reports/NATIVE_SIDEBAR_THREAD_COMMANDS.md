# Original native sidebar/thread command route → existing Electron React UI

## Private source, no screenshot guessing

From the user's supplied `frontend.zip`,
`frontend/.vite/build/main-C4DYk222.js` SHA-256
`c8a2af504b21314fa6a64ad1b4ec83dbad80033ede902caf9978fd9c74a2c175`.
The source `D0e` native menu builder:

- `Ne={...N('toggleSidebar'),click:async()=>…sendMessageToWindow({type:'toggle-sidebar'})}`.
  The original View menu adds Ne conditionally under `desktopFeatureAvailability.sidebarCollapsible`.
- `st={...N('previousThread'),click:async()=>me('previousThread',…)}` and
  `lt={...N('nextThread'),click:async()=>me('nextThread',…)}`; `me` dispatches
  `{type:'run-command',id,originPanel,keyboardEvent}` via the original host.
- `N` derives menu accelerators through the original dynamic
  `commandKeymapState` and `a.Nt`/keymap filtering; there is no one
  universal shortcut to infer from the bundle without the host keymap state.
- They live in the original View menu near tab/session navigation and are
  not autonomous backend tasks.

Read-only source audit:
`node scripts/audit-original-sidebar-thread-menu.mjs <frontend/.vite/build>`.
The auditor pins the full hash and eight exact source signatures.

## Implemented in existing mounted code

- Added native menu `toggleSidebar`, `previousThread`, `nextThread` items
  to the existing `desktop/nativeMenu.cjs` View submenu; **no invented
  accelerators**.
- The independently authored desktop main process forwards three fixed,
  source-derived actions to its currently focused **loaded and allowed**
  renderer as `agent-web:ui-command`. This intentionally does not claim
  to implement the private `codex_desktop` IPC protocol.
- The sandboxed `desktop/preload.cjs` accepts only this allowlisted trio,
  drops the raw Electron event and offers
  `subscribeUiCommands(callback):unsubscribe` to the renderer.
- The existing `demo/App.tsx` subscribes and calls its **existing**
  `setCollapsed` and `switchConversation` actions. The demo has two
  explicit conversation IDs, and previous/next are bounded by its existing
  order; this is a **demo-host interpretation** of those original commands,
  not a claim of reconstructing all original Codex navigation history
  or full keyboard keymap.
- `desktop/native-menu.test.mjs` checks menu action routing and absence
  of invented accelerators; the **actual Linux and Windows Playwright
  Electron test** invokes the native menu items, then checks the mounted
  React sidebar property and the original conversation virtual-row lifecycle,
  before its existing native zoom and tool IPC assertions.

## Intentionally not restored

- The private configurable Codex command keymap; original
  `run-command` event payload including focused pane/keyboardEvent.
- Native `Find in Thread` input, command palette, file-search, new-task,
  browser tab and keyboard navigation actions that require host state.
- Full source application-menu visibility/enablement from feature flags;
  the independent demo enables its collapsible sidebar explicitly.
- Real Agent backend; none of these new actions call it.
- Matched Windows binary UI screenshots and packaged Windows installers.

These are genuine UI integration steps, but final product parity remains
dependent on real host data and a version-matched desktop comparison.

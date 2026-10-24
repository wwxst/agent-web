# 2026-10-24 — source-derived native File/Edit/View/Help menu integration

## Original Windows Codex evidence

Original archive: user-uploaded `frontend/.vite/build/main-C4DYk222.js`.
Exact SHA-256: `c8a2af504b21314fa6a64ad1b4ec83dbad80033ede902caf9978fd9c74a2c175`.

The original compiled `w0e({nativeIntl,isMacOS})` declares Electron
`Edit` with native roles: Undo, Redo, Cut, Copy, Paste, Delete and Select All;
macOS also has Paste and Match Style via
`Command+Option+Shift+V`. Original `D0e` attaches File and View
operations, including:

- File: Close Window, Quit, plus many *private* commands such as New Task,
  New Project, Open Folder, Logout and New Window.
- View: Zoom In `CmdOrCtrl+Plus`, Zoom Out `CmdOrCtrl+-`,
  Actual Size `CmdOrCtrl+0`; Windows/Linux Ctrl+= hidden alias and F11
  Full Screen; macOS `Command+Control+F`.
- Help: Documentation link to
  `https://developers.openai.com/codex/app`, plus private shortcuts/help
  functionality.
- Original menu uses `D.Menu.setApplicationMenu(Bt)`. The original native
  handler dispatches `step-window-zoom`/`reset-window-zoom` to the
  *private renderer command system*, not directly to generic Electron zoom.

Audit `scripts/audit-original-native-menu.mjs` checks the original SHA and
**17** exact minified source signatures. No proprietary compiled bundle
was committed.

## Integrated real frontend implementation

`desktop/nativeMenu.cjs` reconstructs the **source-confirmed, actually
functional subset**. It builds real Electron `MenuItem` roles for Edit and
real main-process callbacks for File Close/Quit, View Zoom In/Out/Actual Size,
Full Screen and Help Documentation. We did **not** add inert or misleading
"New Task" / "Open Folder" / "Search" actions because those route to an
unavailable private Codex host.

Our standalone `WebContents` uses Chromium's normal zoom level step
(`getZoomLevel() +/-1`, clamped) and `setZoomLevel(0)`. This intentionally
differs from the original private `step-window-zoom` dispatcher until that
frontend keymap/zoom state has been recovered. Source shortcut labels and
native Edit roles remain faithful.

`desktop/main.cjs` sets the real application menu and offers a
**strictly bounded** `agent-web:open-menu` IPC handler. It accepts only
`file/edit/view/help`, checks the caller is its own loaded BrowserWindow,
checks source/origin and finite positions, and creates a native menu popup.
The isolated `desktop/preload.cjs` exposes only this narrow
`openMenu` method rather than raw `ipcRenderer`.

The existing `demo/App.tsx` uses the true native menu popup triggers in
Electron while keeping the browser-mode text preview unchanged. The top
strip remains draggable around real buttons, with `-webkit-app-region:
no-drag` for hit testing; no second conversation timeline was added.

`desktop/native-menu.test.mjs` covers exact role lists, accelerators,
whitelisted actions and malformed anchors. The *actual* Playwright Electron
BrowserWindow smoke asserts native `Menu.getApplicationMenu()` content,
security of the bounded preload call, and zoom changes on the real
`WebContents`.

## Target Windows runtime validation

The previous Linux Xvfb Electron smoke was useful but insufficient to prove
native Windows titlebar/menu fidelity. The workflow now adds a distinct
`windows-latest` job that builds and launches the actual Windows Electron
executable and runs the same desktop tests. Its screenshot artifact is
uploaded for manual comparison. The desktop test script lists explicit file
paths rather than relying on Unix shell wildcard expansion.

**Do not claim Windows validation until the Windows job is green**.

## Remaining differences

This is a functional source-grounded *subset*, not complete original menus.
Source-recognized but unimplemented commands (new task, project, workspace
tabs, shortcut customization, chat/file search, copy thread path, Logout,
DevTools, Help task manager, etc) still require the original renderer command
bus and/or a real host. Native popup hit targets and Windows accent/Mica
need matching-build visual comparison; Windows installer/signing is not
built. Original private IPC, Agent backend, real conversation streaming and
full interactive parity are still outside this batch.

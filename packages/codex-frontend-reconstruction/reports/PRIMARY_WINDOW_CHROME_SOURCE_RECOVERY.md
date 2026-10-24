# 2026-10-24 — original primary window chrome and lifecycle alignment

## Direct evidence from supplied Codex Windows compilation

Inspected `frontend/.vite/build/main-C4DYk222.js` in the user's private
`frontend.zip`. SHA-256:
`c8a2af504b21314fa6a64ad1b4ec83dbad80033ede902caf9978fd9c74a2c175`.
The read-only source audit `scripts/audit-original-primary-window-chrome.mjs`
pins nine exact signatures from `A9`, `z9` and `i3e`.

- Original `z9(appearance='primary')` uses `titleBarStyle:'hidden'` and
  `titleBarOverlay:A9(zoom)` on Windows and Linux. For macOS it uses
  `hiddenInset` and `trafficLightPosition:k9(44,zoom)`.
- `A9(zoom)`: `color:'#00000000'`,
  `symbolColor` chosen from native system dark preference
  (`#ffffff` / `#1f1f1f`), and height `round(36*zoom)`.
- `k9(44,zoom)`: `{x:16,y:round((44*zoom-14)/2)}`.
- Original `i3e.getPrimaryMinimumSize()` returns `{width:480,height:600}`.
- The original `i3e` persists `electron-main-window-bounds` from
  `getNormalBounds()`, including `isMaximized`; restoring clamps to the
  minimum bounds and rejects windows not intersecting any work area.
- The compiled main syncs transparent overlay icon colors when
  `nativeTheme.updated` fires; it resets renderer zoom on loading.

These are **compiled-source observations**, not visual redesign proposals.

## Integrated implementation and tests

- New `desktop/windowChrome.cjs` returns those documented primary native
  titlebar styles and minimum size by platform. Existing `desktop/main.cjs`
  now uses them on the real Electron BrowserWindow, refreshing overlay symbol
  colors on native system theme changes.
- `demo/App.tsx` knows whether the isolated desktop preload is present.
  Browser-only fake `─ □ ×` caption characters remain for the Vite visual
  demo, but the Electron rendition hides them and applies a 36px draggable
  titlebar, reserving the right-hand native caption button hit targets.
  No new React message/component tree was created and no private Codex
  application-menu commands were synthesized. The File/Edit/View/Help row
  is still a **nonfunctional preview placeholder** pending original menu
  command routing.
- New `desktop/windowBounds.cjs` stores independent geometry in
  `app.getPath('userData')` as an atomic JSON replacement. This is our
  standalone equivalent of the observed `i3e` lifetime contract, **not**
  a claim that the private Codex `globalState` database was recovered.
  Safe display-intersection checks reject obsolete off-screen coordinates.
  Ordinary and maximized dimensions are restored when the next window
  opens. Bounds are persisted on native close, not simulated in React.
- `desktop/window-chrome.test.mjs` and
  `desktop/window-bounds.test.mjs` cover Windows/Linux/Mac chrome params,
  source minimum dimensions, clamping, multiple-display intersection,
  invalid saved JSON, true disk restore and maximization state.
- The actual Electron Playwright smoke now verifies the minimum size,
  36px draggable titlebar, hidden duplicate renderer caption, and the
  earlier main-process -> isolated preload -> qn/Qr tool activity transition.
  Existing Chromium browser tests ensure the demonstration still works.
- The uploaded Codex binary was used only as **read-only evidence**;
  no proprietary Electron bundle is committed.

## Remaining fidelity gates

This does NOT prove Windows titlebar visuals: automated native smoke currently
runs in Linux Xvfb. Real Windows native overlay hit targets, Mica backdrop,
native menu commands, multiple-monitor transitions, lost-display recovery in
an actual GUI, Windows keyboard shortcuts, persistence after app update,
original titlebar/icon assets, and matching-build screenshot differencing all
need later real-world verification. Original `electronBridge` still has
private channels not connected, and the Agent backend remains untouched.

Run source audit (against the private extracted assets):
```sh
node scripts/audit-original-primary-window-chrome.mjs /path/to/frontend/.vite/build
```

Run independent desktop smoke:
```sh
npm run demo:build
npm run desktop:test:smoke
```

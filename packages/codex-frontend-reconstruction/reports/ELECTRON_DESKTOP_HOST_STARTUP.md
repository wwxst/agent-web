# 2026-10-24 — standalone Electron desktop startup checkpoint

## Source evidence

The supplied Windows Codex frontend archive contains **actual** Electron main/preload build files:
`frontend/.vite/build/early-bootstrap.js`, `main-C4DYk222.js`, and
`frontend/.vite/build/preload.js`. The preload has SHA-256:
`a3e622f8d80a83e58fb3cfcc640fa7e14e6461cccdae9ef7d7b0c821dde256b7`.

The preload exports `electronBridge` via `contextBridge`, with
`codex_desktop:message-from-view`, `codex_desktop:message-for-view`,
shared-object snapshots, worker message channels, theme getters, sidebar
bootstrap, and chunked messages. The source fingerprint audit:
`scripts/audit-electron-preload-evidence.mjs` (SHA + eight signatures).

**Do not claim** that the private original bridge has been reconstructed or
that the original Electron main process can run without its private native
`app-server-manager`, custom protocol and internal dependencies.

## Implemented actual desktop runtime

New `desktop/main.cjs`, `desktop/preload.cjs`, `desktop/dev.mjs` and
`demo/desktopHost.ts` create a standalone *independently authored*
Electron window for the existing recovered React frontend.

- Installed Electron as an explicit desktop dependency and made
  `package.json.main` point at our main process. `npm run desktop:start`
  loads a previously generated `demo-dist/index.html` via actual `file://`;
  `npm run desktop:dev` starts Vite then Electron for fast inspection.
- Vite `base:"./"` makes the built JavaScript and CSS load as local files;
  the same build continues to serve the Chromium preview.
- Isolated preload under `contextIsolation:true`, `sandbox:true` and
  `nodeIntegration:false`, exposing only
  `agentWebDesktopHost.getHostInfo()` and
  `agentWebDesktopHost.subscribeHostEvents(listener)`. The renderer cannot
  issue arbitrary Electron IPC, Node process invocations or privileged file
  changes.
- Main process denies unapproved navigations and in-app new windows.
  It does not execute Agent actions or make claims of private Codex protocol
  compatibility.
- `demo/desktopHost.ts` attaches the preload to the *already mounted*
  `SourceConversationHostEventBridge`. Incoming main-process host events
  travel through the existing Y history, Fc qn/Qr and LO tool history stores,
  into existing virtualized React UI rather than creating a second desktop UI.
- `desktop/electron-smoke.test.mjs` uses Playwright's Electron driver on an
  actual Electron BrowserWindow. It checks local `file://` load, Node
  isolation, preload host info, and injects a source-shaped Qr event from
  main process through real IPC to the mounted `Ga/qe` tool group, then
  clears the thread. CI runs this on Xvfb and saves a desktop screenshot.

## Limitations and next acceptance gate

This shell runs the **existing demo's synthetic conversations**, not a
real connected Agent, and does not recreate Codex's original menus, private
theme resolver, shell integrations, updater, native source protocol or startup
services. The release build still needs Windows installer/packaging,
code-signing, trusted host-event schema with main-process authorization,
actual backend transport, lifetime/navigation testing, screenshot comparison
against a matching original Codex build, and complete UI feature audit.

**Do not equate successful Electron smoke with completed Codex desktop
reconstruction.** The smoke proves a real desktop process/render pipeline,
where earlier phases had only a browser demo.

## Commands

```sh
npm install
npm run demo:build
npm run desktop:start
# or:
npm run desktop:dev
# Linux CI / desktop display:
xvfb-run -a npm run desktop:test:smoke
```

The original private build assets are **not committed**.

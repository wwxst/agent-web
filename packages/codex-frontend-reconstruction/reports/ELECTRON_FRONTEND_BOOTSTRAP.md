# Electron isolated front-end bootstrap — 2026-10-23

## Objective
The repository previously mounted the semantic reconstruction only in Vite/Chromium. The original supplied Codex Windows package has `frontend/.vite/build/main-C4DYk222.js` and `preload.js`, but those belong to Codex's privileged Agent host and must **not** be copied. The new Electron entry intentionally loads only the existing React demo/connected components.

## Implementation
- `electron/main.cjs`: a real `BrowserWindow` launched from `npm run desktop:run` or `desktop:dev`. Vite is bundled under a first-party registered `agent-web://local` secure scheme; the resource resolver forbids traversal and off-origin paths.
- Disallows new windows, external navigation, webviews and downloads. Renderer uses `contextIsolation:true`, `sandbox:true`, `nodeIntegration:false`, `webSecurity:true`; **no preload or private IPC**.
- The Electron native window owns the OS frame/menu chrome. The old mocked desktop menubar is hidden by a renderer-only visual flag `desktopShell=1`; this is not an Agent capability switch.
- `desktop:smoke` starts the bundled renderer under Electron and validates real React transcript, Composer and active thread scroll viewport; can capture a screenshot. Unit tests verify origin and local resource policy; CI runs Linux `xvfb-run` as an automated platform smoke, not native Windows parity.

## Verify on Windows
```powershell
cd packages/codex-frontend-reconstruction
npm install
npm run desktop:run
```
For development: `npm run desktop:dev`. This is an independently runnable **front-end host**, not a rebuilt Codex executable, fully packaged distribution, or connected desktop Agent. The existing conversation/tool data remain synthetic.

## Remaining
- Actual Windows desktop run and pixel comparison with same-version Codex.
- Original titlebar/window frame/tray behavior, icons, theme registry and rich Composer plugins.
- Verified Electron preload protocol/IPC boundaries, real Agent event adapter, approval/file operations and desktop packaging.
- All host capabilities must be recovered from the original compiled resources before implementing; do not silently expose Node APIs to renderer.

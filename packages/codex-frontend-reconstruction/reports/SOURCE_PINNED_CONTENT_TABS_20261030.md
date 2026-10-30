# Source-backed pinned content tab references — 2026-10-30

## Compiled-source evidence

Audited the user-provided `frontend.zip`; proprietary compiled assets are not copied into this repository.

- `frontend/webview/assets/app-initial-5851df3f6cb1.js`
  - SHA-256: `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`
  - `mqi(accountId, hostId, clientThreadId, tabId)` creates the exact reference identity as `JSON.stringify([accountId, hostId, clientThreadId, tabId])`; `m5n(pinId)` creates the unified order key `content-tab:<pinId>`.
  - `uqi` is the Pin action: it requires the source capability and a real non-label tab, calls the owning tab controller's `pinTab`, then stores the exact tab reference with account/host/thread/client-thread identity, `tabId`, `tabKind`, title, route path/search and order.
  - `f7n` is Unpin: it removes the pinned record, unified-order entry and presentation record. It does **not** close the source tab.
  - `fqi` reveals the pin through the content-tab service / local owner fallback. It distinguishes `revealed`, `unavailable` and `cancelled`; unavailable pins remain and show the source message: “This source tab is unavailable. You can keep the pin or unpin it.”
  - `gqi` watches the exact source tab's presented state and persists presentation metadata separately: `sourceToken`, title, kind, forwarded chrome and availability. Once a previously presented owner disappears, the snapshot is marked unavailable.
  - `Gll` / `qll` / `Jll` render the pinned content list and unpin action; the accessible unpin label is “Unpin tab”. `Lll` chooses a type-specific preview, including the original file thumbnail.
- `frontend/.vite/build/main-C4DYk222.js`
  - SHA-256: `c8a2af504b21314fa6a64ad1b4ec83dbad80033ede902caf9978fd9c74a2c175`
  - The original `Zge` owner manager registers and subscribes to owners keyed by account, host, thread and client-thread identity. Reveal is routed to the exact owner with `tabId` and `sidebarPinnedContentTabId`, then focuses the owning BrowserWindow / detached tab. This is a cross-window service, not just a sidebar state toggle.
- `frontend/webview/assets/preload-bridge-a3f4732ecb5a.js`
  - SHA-256: `64f719efc465432f6f58cc2b7b5d3fedd8ce5a98059a13158d4a57f8a492cad3`
  - `PinnedContentTabPreloadBridge` can preload an eligible versioned durable route with reason `pinned-tab-preload`; it does not fabricate a route for an ineligible descriptor.

## Integrated implementation

- Added `SourcePinnedContentTabsModel.ts` with the source identity function, record and presentation models, safe persistence parsing, exact original storage keys, order-key preservation, idempotent pin/unpin, live presentation updates and unavailable-row derivation.
- Restored `Pin to sidebar` / `Unpin from sidebar` in the existing local file tab context menu, before the existing tab actions and separated as in the source menu.
- Added a `Pinned` section to the existing conversation sidebar. A live pin selects the exact already-mounted file tab; it does not read the file again or create a duplicate editor.
- The local fallback persists only pin metadata in the renderer's local storage. It stores no file contents and adds no file-write API, save path, Electron IPC or Agent backend changes.
- The local owner presentation is updated while the exact `workspace-file` tab is mounted in the matching demo client-thread. Closing/revoking/switching away marks the presentation unavailable but preserves the pin. Reopening the same tab identity reattaches it with a new source token.
- Unpin removes only the sidebar reference and leaves the source tab open. Selecting an unavailable pin shows the original unavailable message; it does not attempt a file read without the current workspace grant.

## Validation

GitHub Actions run [40986143431](https://github.com/wwxst/agent-web/actions/runs/40986143431) passed on branch head `bc9ff949ca639d71d2722e4ddb293dbe2adaceeb`:

- Core reconstruction tests: 537 passed, 0 failed.
- Demo data-model tests: 5 passed, 0 failed.
- Chromium browser suite: 77 passed, 0 failed, including all three new pinned-content-tab lifecycle tests and the existing tab-menu keyboard/focus regression.
- Desktop Node smoke tests: 82 passed, 0 failed.
- Linux Electron launch / preload smoke: passed.
- Windows Electron window / preload / IPC / native-menu smoke: passed.
- TypeScript / Vite React preview build and local Electron renderer build: passed.

The mounted browser tests verify exact pin identity, selecting the same existing EditorView after opening another file, unpin without closing the source tab, unavailable state after source close, unavailable state after reload, persistence of the pin record, and explicit unpin of unavailable records.

## Fidelity boundary and remaining work

This is a source-backed local-renderer slice, **not** the complete original cross-window implementation:

- The original main-process `Zge` owner registry / `contentTabs.registerOwner`, `subscribeOwners` and `reveal` RPC are not yet ported into this independent Electron host.
- The original `PinnedContentTabPreloadBridge` durable-route preloading is not implemented here. After reload, local file pins correctly appear unavailable because the current workspace grant and source EditorView are not restored.
- This fallback only reveals an already-mounted exact tab in the matching demo client-thread. It does not focus another BrowserWindow or restore an eligible durable route.
- The original file thumbnail component and drag/reorder interaction are not restored; this version preserves insertion order and uses a file icon.
- The original private localized messages and design-system components are not wired. A same-build, same-theme visual comparison against a running original Codex Electron window remains outstanding; no pixel-parity claim is made.

# Source Thread Find — independent conversation-domain slice (2026-10-24)

## Exact original build evidence

User supplied `frontend.zip` is **read-only** and is deliberately not committed.

| Source chunk | SHA-256 | Confirmed branch |
|---|---|---|
| `frontend/.vite/build/main-C4DYk222.js` | `c8a2af504b21314fa6a64ad1b4ec83dbad80033ede902caf9978fd9c74a2c175` | Native `D0e`: `findInThread` dynamic keymap; visible `Find in Thread`; hidden `Find Next` `Command+G` / `Ctrl+G`; hidden `Find Previous` `Command+Shift+G` / `Shift+F3`; `find-in-thread`, `find-next-in-thread`, `find-previous-in-thread` renderer messages |
| `frontend/webview/assets/app-primary-fe8a450b3b04.js` | `2a05e25229bd7a38c12c55d90f82fb07087e80b4e16070116b215484498478f2` | `iFt` host command subscription and focused-pane domain dispatch; `pFt` text input; `xFt` result count and navigation; `aFt` domain selection; `AFt` top-right portal container |

Observed literal source signatures:
- `find-in-thread`, `find-next-in-thread`, `find-previous-in-thread`
- `defaultMessage:\`Search chat…\``, `defaultMessage:\`Find in chat\``
- `className:\`pointer-events-none fixed top-2 z-[55] flex justify-end\``
- `className:\`max-w-[70vw]\`` with `style:{right:16+i.right}`

Native View **primary** `Find in Thread` accelerator is taken from original runtime `commandKeymapState`; do not invent a default `CmdOrCtrl+F`. Original find routing can prioritize the browser, Diff and file panes; that private focus/search host is not recovered.

## Integrated implementation

- `desktop/nativeMenu.cjs`: adds only source-verified View menu items, preserving original fixed next/previous accelerators and dynamic-primary absence.
- `desktop/main.cjs` / `preload.cjs` / `demo/desktopHost.ts`: extend the *existing* narrow trusted `agent-web:ui-command` channel. No private `codex_desktop` message schema is claimed or spoofed.
- `src/conversation/SourceThreadFindModel.ts`: small deterministic, case-insensitive **literal** search over explicitly supplied conversation text; does **not** copy the original private async regex workers.
- `demo/threadFindProjection.ts`: maps text in existing source-projected message/activity blocks to the same virtualizer turn keys; does not index private/unloaded history or arbitrary JSON fields.
- `demo/App.tsx`: same mounted React conversation snapshot, search state and VirtualizedTurnListApi.scrollToKey; no second list or independent fake search transcript.
- `demo/codexDesktopShell.css`: source-evidenced fixed top-right placement and bounded size, without claiming pixel parity.

## Automated checks

- `tests/source-thread-find-model.test.mjs`: matching, caps, empty query, navigation bounds.
- `desktop/native-menu.test.mjs`: Windows/Linux and macOS accelerators and source menu action wiring.
- `desktop/electron-smoke.test.mjs`: actual native View item → main process → sandboxed preload → mounted React search; zero and multiple matches, next/previous and Escape/close, preserving earlier history/menus/IPC tests.
- CI must pass **both** Linux browser/Electron and native Windows Electron jobs on the final branch head. Build/test status belongs to GitHub Actions; the existence of test code alone does not count as a pass.

## Deliberate missing fidelity

No original regex-worker implementation, match highlighting or selection offset, global/side panel search, search in Diff/file/browser/page, historical content not hydrated into the current demo, genuine Agent transport, or version/theme-matched Windows visual comparison. Search matches only the current demo-host owned content. All actions are UI-only; no file modification, private host call or model inference.

Next iteration should source-trace private source `iFt/xFt` search worker and pane selection, then restore match highlights and historical cache indexing in the **existing** transcript before broadening the domain; compare original UI at the same viewport/theme. Do not merge `main` without explicit acceptance.

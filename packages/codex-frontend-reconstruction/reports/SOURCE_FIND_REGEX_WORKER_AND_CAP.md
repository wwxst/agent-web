# Original Find count cap and regex worker protocol recovery (2026-10-24)

## Source provenance

The user's uncommitted `frontend.zip` is the only original Codex compiled-source authority. The following two original files were read directly, not inferred from screenshots:

| Original asset | SHA-256 | Confirmed implementation |
|---|---|---|
| `frontend/webview/assets/use-conversation-search-highlights-6c328093bb06.js` | `9eb8a0cab01112576154fe84cc54e9f4041c6fd5f321255140a5a11aefd05d02` | `re` emits source conversation match objects with a `totalMatches` separate from the navigable `matches` array and `isCapped`; `z=250`; slash-delimited pattern extraction only in host `searchMath=true` branch, `searchMath=false` continues via private literal `p` |
| `frontend/webview/assets/regex-search.worker-93adb92b59ce.js` | `61f7b3ea037b6e55e99b75e1710b967a165808b86742b2c7288f65ea0ecab10e` | `self.onmessage({texts,query,maxMatches,mathTexts})`; returns `offsets` and `totalMatches` independently; `RegExp(query,'giu')`, skips empty hits, reports `invalid-regex`; math ranges extend `\\frac` and other macro arguments, adjacent overlapping math-expanded matches coalesce |
| `frontend/webview/assets/app-primary-fe8a450b3b04.js` | `2a05e25229bd7a38c12c55d90f82fb07087e80b4e16070116b215484498478f2` | `xFt` shows `{active} / {matches}+ results` when `isCapped` rather than displaying a false limited count |

## Implemented in the current mounted frontend

- `SourceThreadFindModel.searchSourceThreadLiteralRows` now traverses the **same source Y-projected and host-hydrated** text rows already used by mounted React Find, returning at most **250 navigable hits**, the **full** `totalMatches`, `isCapped`, and accurate per-turn hit totals. Legacy `findSourceThreadLiteralMatches` remains a thin compatibility wrapper.
- Existing `demo/App.tsx` renders `1 / 315+ results` for 315 total hits, retains 250 navigation entries, and passes full per-turn counts to the existing React-safe CSS Highlight renderer. The previous 2000-match cap is removed.
- `SourceRegexSearchWorkerModel.runSourceRegexWorkerRequest` recovers the original dedicated worker message/result data contract and LaTeX range rules as a typed, testable TypeScript implementation. `demo/sourceRegexSearch.worker.ts` provides a dedicated Worker entry, not a main-thread regex invocation.
- Normal Find is **still literal**. It must NOT interpret `/pattern/` as regex without a genuine host-provided `searchMath` mode. A real cancellable Worker controller, timeouts and original `searchMath` UI/host contract are not yet connected; do not claim that the source regex worker is available in the current normal conversation search.

## Tests and boundaries

- Core tests: worker `giu` behavior over multiple strings, global cap vs independent `totalMatches`, invalid-regex, zero-length skip, math-macro argument/overlap handling; normal literal 250 cap and distinct full count; slash-delimited normal text stays literal.
- Native Electron test extends the same View menu → preload → App → virtual row chain with an actual mounted >250-hit message; checks `+ results` on full count, highlight still maps to the first real mounted occurrence, and regular slash search does not trigger regex.
- Preserve prior historical hydration/replay, original native menus, safety allowlist and React lifecycle tests. Do not ship the original private JS or change backend/IPC.
- Need CI on **final SHA** for TypeScript/Vite, core, demo models, Chromium, Linux Electron and Windows Electron before marking review-ready.

Remaining original capabilities: source `re` unitId/textChunks/equation offsets and stable per-unit IDs, searchPersisted host callback, cancelable Worker use in genuine `searchMath` mode with timeout (`regex-timeout`, `regex-unavailable`), whole-message Markdown math rendering parity, cross-pane search and pixel parity.

# Find-in-Thread with source Y historical hydration (2026-10-24)

## Original Codex evidence — verified against supplied `frontend.zip`

| Asset | SHA-256 | Observed contract |
|---|---|---|
| `frontend/webview/assets/use-conversation-search-highlights-6c328093bb06.js` | `9eb8a0cab01112576154fe84cc54e9f4041c6fd5f321255140a5a11aefd05d02` | `te({contextId,getTurns,hydratePersistedMatch,revealUnrenderedMatches,searchPersisted,searchMath,scrollAdapter})`: conversation domain; `re` indexes turn/unit text chunks and optional equations; `ensureVisible` can hydrate a persisted turn before `scrollToTurn` and `scroll-to-match`; merges persisted and locally visible matches by stable match ID |
| `frontend/webview/assets/regex-search.worker-93adb92b59ce.js` | `61f7b3ea037b6e55e99b75e1710b967a165808b86742b2c7288f65ea0ecab10e` | Native worker accepts `{texts,query,maxMatches,mathTexts}`; responds `{offsets:[[{start,end}]],totalMatches}` or `invalid-regex`; compiles `RegExp(query, 'giu')`, skips zero-length matches; math mode expands LaTeX argument ranges |
| `frontend/webview/assets/scroll-to-match-701662e58079.js` | *Signature verified in supplied ZIP* | Looks for identified range and waits up to 1500ms after scroll, with AbortSignal and animation-frame retries |
| `frontend/webview/assets/app-primary-fe8a450b3b04.js` | `2a05e25229bd7a38c12c55d90f82fb07087e80b4e16070116b215484498478f2` | `xFt` reads `totalMatches`, `isCapped`, `invalid-regex`, `regex-timeout`, `regex-unavailable`; `iFt` routes pane focus; `AFt` mounts the search bar |

**Important:** The original `te` also has an independent `searchPersisted` callback. This frontend does not have that persisted search backend; historical results in this PR are ONLY those actually loaded into its source Y cache.

## Real integration, not an isolated mock index

Existing frontend path before this change:
`SourceConversationHostEventBridge.historicalTurns` → `SourceHistoricalTurnContentSource` → `ConversationMessageBlocks.createConversationLiveRow` → `getDemoBlocks(entry, historicalSnapshot)` → **existing** virtualized transcript.

This PR exposes that **same canonical** source from `makeDemoRow.findHistory` (one query, one store and source subscription), and subscribes in the existing `demo/App.tsx` with `useSyncExternalStore`. The find index receives `buildConversationRenderEntries(...)` output — the same source Y projection as `ConnectedLiveConversationTranscript`. A history-backed entry whose `turn` has been removed by Y is **not indexed** until `historicalSnapshot.loaded` is true. When loaded, `projectDemoThreadFindRows` calls the **same** `getDemoBlocks(entry, snapshot)`, preserving canonical `turnItemIds` ordering and virtualizer `turnKey`. Clearing `clear-thread` invalidates both live historical UI and find matches without a forced transcript remount. Other host/thread/entity keys cannot leak into this query.

The input UI, literal matcher, active CSS highlight and `VirtualizedTurnListApi.scrollToKey` are unchanged. The existing native menu/preload/React routing remains intact. No new Agent event schema, file writes or privileged IPC were introduced.

## Regression gates

- Demo model integration: Y strips raw base-turn `turn.items`; before cache hydration there are **no phantom matches**; one canonical history entity load exposes one real match; `clear-thread` removes it; replay restores it without row recreation.
- Electron native smoke (Windows/Linux): View → Find in Thread → 0 results before hydration → click existing `模拟：读取历史回合` → 1/1 result with DOM Range highlight in the mounted Y row → click `模拟：清除历史缓存` → 0 results and removed highlight. Existing menu, IPC, same-turn navigation, runtime statuses and image screenshots remain covered.
- React/TypeScript build, 413+ core tests, demo models, 27 Chromium tests and both Windows/Linux Electron CI jobs must pass on final SHA. **Do not claim success before reading CI logs.**

## Remaining fidelity gaps

This is still a deliberately labeled **synthetic host** with an in-memory Y cache; it has no real persisted search service, Agent history database, or original host query implementation. The original worker regex/math expression processing, 250-match cap, `unitId`/equation-index based offsets and debounce/mutation-driven highlight renderer are **not yet integrated**. Current literal search can count collapsed activities that cannot be visually highlighted. Diff/file/page/browser search domains and pixel comparison also remain outside this implementation.

**Next source-first batch:** reconstruct the original small regex-worker protocol as a cancellable, typed adapter and integrate source `te/re` unit-based results with stable match IDs; supply `searchPersisted` only when a genuine host contract exists. Avoid claiming the original is simply a literal 2000-match scanner or shipping the private compiled worker in Git.

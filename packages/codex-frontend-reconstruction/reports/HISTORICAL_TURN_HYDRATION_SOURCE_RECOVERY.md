# Original Y history-summary hydration → mounted React transcript

## Primary evidence from supplied Codex Windows frontend.zip

The private original bundle `local-conversation-thread-turn-entries-ed0916a7814f.js` (SHA-256 `425119f9ef6c93afaf78b9f48656b357384d360ca2d0ca1b22ff5f983c5fc45f`) explicitly implements:

```js
v = historyEntityKey != null &&
    !isAeonThread && !preserveServerUserMessages &&
    turnState == null && transcriptBlock == null
```

For such a historical row, it assigns `turn:undefined`, but retains `turnItemIds:turn.items.map(item=>item.id)`, `turnStatus:turn.status`, identity `historyEntityKey`, and the same turn/row key.

This behavior explains a real reconstruction gap: `ConversationRenderEntriesModel` faithfully removed the `turn`, yet the React `createConversationLiveRow` only sourced message blocks from inline `turn.items`. The result was an empty history-backed virtual row, despite valid stored data. **Do not bypass the original Y projection** by globally setting `preserveServerUserMessages` or rendering fake static HTML.

The supplied compiled bundle has an original private history entity/query engine; its exact transport and event payload are **not** in this independently runnable frontend. Consequently the added independent-host history content adapter is a **reconstruction of the verifiable Y/rs contract**, not a claim of an exact reverse-engineered private database.

## Concrete frontend restoration

- `SourceHistoricalTurnContentSource.ts`: a typed host-owned `{hostId,threadId,entityKey}` history query. An immutable source and simple event cache provide current-value replay, per-identity subscriptions, generation-guarded stale callback rejection, identity rebinding, cleanup, clear-thread, and error state.
- `sourceHistoricalTurnQuery(entry)` activates **only when the original Y historical-summary predicates hold** and the projected `turn` has been removed. Aeon entries, preserved-server rows, transcript-block rows and active inline-turn rows are not double-hydrated.
- `selectSourceHistoricalTurnItems` enforces the preserved `turnItemIds` identity filter **and its original order**; unrelated history records cannot enter the current virtual turn.
- `ConversationMessageBlocks/createConversationLiveRow`: an optional host `getHistoricalTurnSource(entry)` feeds a **second stable React.useSyncExternalStore** subscription. The existing host's `getBlocks(entry,historySnapshot)` receives those hydrated items. No new message renderer or activity grouping is created.
- `demo/mockConversation` feeds the recovered `projectSourceTurnTranscriptBlocks` splitter for loaded history items, using the correct raw `user-message` item type. The history fixture is marked as synthetic; its Y-projected base turn has no inline content and includes a normal user message, an exec command and a final assistant response.
- `demo/adapters` uses a separate keyed history-turn store and two clearly labeled preview controls to publish or clear fake stored turn items. The same existing React virtual row updates when the store changes; command/Markdown and Rk/nk nested historical tool activities reuse their already connected renderers.
- `tests/source-historical-turn-content-source.test.mjs` tests identity activation/denial, replay, canonical item order, cache invalidation and recovery, query rebinding/stale callbacks, disposal, and host errors.
- `demo/e2e/historical-turn-hydration.spec.ts` checks that content is **absent before history subscription data**, appears after loading, disappears after clearing and comes back when rehydrated. Historical Rk disclosure controls the child tool group exactly as before.
- The original Y source bundle is hash-pinned and checked against seven exact strings in `scripts/audit-historical-turn-hydration-evidence.mjs`; no proprietary bundle is committed to GitHub.

## Remaining independent frontend acceptance gaps

The implementation requires the actual Electron/host history database or an independent Agent event provider to supply `subscribeHistoryTurn`. The demo is deterministic **synthetic data**, not a live Codex conversation and does not execute commands, write disk changes or approve tools. A source-specific history-fetch loading UI, native IPC transport, additional media/approval history entities, private Codex icons/design-system assets, and actual version-matched pixel comparison are still missing.

**Next priority:** map a concrete Electron/Agent-host event channel, with canonical host/thread/entity IDs and history turn records, to the already recovered history-turn, qn/Qr and tool-item stores. Then test cross-conversation navigation/virtualized row remount and diff/approval parity in a running desktop host, without changing the current backend.

Verify source audit locally:

```sh
node scripts/audit-historical-turn-hydration-evidence.mjs /path/to/frontend/webview/assets
```

Do not claim end-to-end Electron parity or a real data source based solely on browser fixture tests.

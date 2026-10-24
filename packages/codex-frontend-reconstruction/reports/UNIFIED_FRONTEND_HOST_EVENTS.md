# Unified host event ingress for the recovered Codex conversation frontend
2026-10-24 · Branch `recovery/codex-mcp-result-guard-20261023` · Draft PR #3

## Source basis and the important distinction

Read the **user-supplied original** `frontend.zip` for three separate compiled query families:

| Original compiled evidence | Canonical query identity | Existing frontend owner |
| --- | --- | --- |
| `local-conversation-thread-turn-entries-ed0916a7814f.js` Y, SHA `425119f9ef6c93afaf78b9f48656b357384d360ca2d0ca1b22ff5f983c5fc45f` | hostId/threadId/entityKey + original ordered `turnItemIds` | `SourceHistoricalTurnContentSource` |
| `local-conversation-turn-69783815d57d.js` Fc, SHA `e40ee63884bc75af917583fe70afade4b6c683adbd93d9536b7636eb6d8f54d4` | qn: hostId/threadId/entityKey; Qr: hostId/threadId | `SourceTurnRuntimeStatusSource` |
| `sites-end-resource-fa77a923096d.js` LO/zO, SHA `a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708` | Au/Vd: hostId/threadId/entityKey/itemId | `ToolActivityHistoryEntityStore` |

The three source excerpts have different data owners and different query keys. They **must not** be replaced with a generic `conversationId`-only store. Their existing per-component subscription and React rendering models are retained.

**`SourceConversationHostEventBridge` is a new, independent frontend event protocol, NOT recovered original Codex IPC.** Its explicit discriminated event types are a host-facing API that our eventual Electron/Agent event adapter may implement only after verifying actual event schemas. This change does not open sockets, call any private Codex service, execute commands, approve actions or touch the Agent backend.

## Integrated implementation

- `SourceConversationHostEventBridge.ts` owns **one** `historicalTurns`, `turnRuntime`, and `toolHistory` store. Its `publish(event)` dispatches typed `historical-turn`, `turn-history-status`, `up-next-ready`, `tool-history-entity`, `assistant-message-presence` and `clear-thread` events to the corresponding *unchanged* source store.
- `connect(transport)` accepts a host event stream with `subscribe(listener):unsubscribe`, and generation-fences callbacks from an old transport after replacement, disconnect or dispose. Required host/thread/entity/item query identities are checked rather than inferred.
- `SourceTurnRuntimeStatusSource`'s store has new scoped `clearThread(hostId,threadId)` invalidation to agree with existing per-thread historical/tool history invalidation, returning `qn` to raw turn status fallback and `Qr` to pending state; other threads remain untouched.
- **The actual existing preview React path is rewired**: `demo/adapters.tsx` now publishes tool execution hydration data and all historical/turn-status buttons through `eventBridge.publish`; `createConversationLiveRow` still mounts its original `useSyncExternalStore` subscribers and recovered Markdown, Rk/nk and source tool leaves. There is no second timeline, separate dashboard or disconnected mock model.
- `tests/source-conversation-host-event-bridge.test.mjs` verifies all five source data channels, cache replays, cross-conversation identity, thread-scoped clearing, invalid identity rejection, upstream reconnect fencing, and disposal.
- `demo/e2e/unified-host-event-routing.spec.ts` proves that a **single** clear-thread event invalidates two different mounted virtual React rows (historical content and Qr group retention), then allows event-driven recovery.

## Test and source reproduction

Historical original-bundle evidence and audit scripts remain in:
`reports/HISTORICAL_TURN_HYDRATION_SOURCE_RECOVERY.md`,
`reports/TURN_RUNTIME_STATUS_SUBSCRIPTIONS.md`, and
`reports/TOOL_ACTIVITY_HISTORY_SOURCE_RECOVERY.md` (where present).
Source chunks never enter Git.

For the target checkout, CI runs `npm run test:core`, `npm run demo:check-model`, `npm run demo:build` and `npm run demo:test:e2e`. **Read the latest head's Actions results before claiming completion**.

## Open work and acceptance boundary

The unified host event ingress is tested against deterministic *synthetic* events, not a real Electron preload or Agent backend. A verified, permission-aware host event transport must be implemented and tested before calling the frontend independently live. Other remaining work: original connected task-result cards, controls and approvals, true Electron process startup/IPC, browser/desktop screenshots against the **matching original Codex binary/theme**, and long-history remount/navigation regressions. Do not merge to main until user authorization.

# 2026-10-27 — Host-driven pending MCP elicitation lifecycle in canonical conversation

## Evidence from the uploaded original Windows compiled frontend
- `mcp-server-elicitation-request-panel-7318114289f7.js`: original `_t` reads `pendingRequest` and dispatches `_t → ft/Ge` for Browser access, `_t → ge/Be` for Computer Use, otherwise `_t → at` for source discriminants including `urlAction`, `generic`, `mcpToolCall`, `browserAuth`, `toolSuggestion`, forms and verification.
- Original React case key `JSON.stringify([hostId,conversationId,requestId])` in the same bundle for verification and original reply transport is also scoped by hostId, conversationId, requestId.
- The presence of a mounted card is not proof of permission; request settlement is owned by actual host state. Unlike the original private Codex protocol, the following event shapes are intentionally independently designed.

## Code implemented, not isolated models
- `SourcePendingElicitationRequestStore` retains recognized discriminant envelopes under `[hostId,threadId,requestId]`, rejects bad IDs and payloads larger than 32K, exposes stable immutable snapshots, and removes a request only on an explicit host settlement/clear-thread event.
- The existing `SourceConversationHostEventBridge` now routes `pending-elicitation` and `elicitation-settled` through that registry, along with its prior history/tool events. Replacing transports invalidates old callbacks.
- `SourcePendingElicitationTimelineBinder` injects pending rows into the same `LiveConversationSource` consumed by the current `ConnectedLiveConversationTranscript` virtualizer; no secondary parallel request panel, overlay transcript or separate React root.
- `demo/adapters.tsx` now renders verified host-originated `urlAction` via existing two-step URL card and recognized Browser/Chrome site approval via existing SourceBrowserWebsiteApprovalCard. Other known discriminants remain visible as 'host request pending' but intentionally do not create invented grant UI.
- `demo/App.tsx` binds active `frontend` or `review` source for the lifecycle of the existing demo row host. Host/thread segregation prevents a `review` request from showing on `frontend`, even when IDs are reused.
- No local `accept`, `decline`, link opening, or client-side state can settle/delete a pending request. Electron approval reply still rejects without a verified Agent backend.

## Automated verification
- Core: registry identity bounds, duplicate updates vs new rows, host/thread separation, stale transport suppression, settlement by exact identity, clear-thread, unsubscribe/remount and canonical latest-turn behavior.
- Real Electron on Linux/Windows: authenticated main-process `webContents.send('agent-web:host-event', ...)` exercises context-isolated preload event subscription, bridge, LiveConversationSource, React card mounting, updating and settlement. No actual external website is opened.
- Native test included in `desktop:test:smoke` on both runner OSes. CI results must be verified on this branch before declaring green.

## Explicit remaining work
- This is an independent incoming host-event contract, NOT recovered private `codex_desktop` IPC. Current standalone main process still has no authenticated Agent client to emit actual real-world pending requests: native test injects explicitly test-originated main-process events.
- Browser site global grant remains deliberately blocked (no backend protocol); original `browserAuth`, `connectorAuth`, forms and verification require further source-specific UI recovery.
- Still pending: real backend request registry/settlement, original host event transport discovery, account connector flows, holistic Codex desktop UI pixel comparison and complete production integration.
- This stacked draft branch does not modify `main`.

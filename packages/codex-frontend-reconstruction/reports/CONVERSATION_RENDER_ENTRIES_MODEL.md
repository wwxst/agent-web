# Conversation render-entry projection

Date: 2026-10-21

## Compiled reference

- `frontend/webview/assets/local-conversation-thread-turn-entries-ed0916a7814f.js`, function `Y` (render-entry projection) and helper `me` (preserved-server-message turn expansion).
- `frontend/webview/assets/local-conversation-thread-6999d2419a30.js`, function `cA`, which supplies live conversation state and invokes the turn-entry projection.
- `frontend/webview/assets/timestamps-85bd12c0e1b2.js`, timestamp separator helper used by the projection.

## Added modules

- `src/conversation/ConversationRenderEntriesModel.ts`
- `src/components/LiveConversationTranscript.tsx`

## Reconstructed projection responsibilities

- Creates per-turn render metadata: stable history/turn keys, conversation/host/workspace metadata, latest-turn state, turn number/count, edit/fork actions, generated-image projection, and inherited-parent attachment metadata.
- Reuses special rows when their stable key and estimated height are unchanged.
- Reuses previous preserved-server transcript entries by turn-search key and delegates expansion to `TranscriptEntryExpansion` through an explicit adapter.
- Computes ordinary-turn timestamp separators using the observed first-user-age and assistant/user gap thresholds.
- Computes compact Aeon timestamp markers, external delivery channel transitions, reply-chain quote boundaries, inter-message gaps, latest-turn placement for handoff operations, and historical summary item IDs.
- Uses an injected predicate for the private Aeon duplicate-turn filter, preserving null placeholders/order so the adapter can match adjacency-sensitive retry filtering rather than treating every request-free turn as a duplicate.
- Preserves row object identity through the existing memo comparator and a conservative structural equality fallback.
- Returns initial Aeon timestamp, latest rendered turn key, and next compact-message reveal time to the caller.

## React composition

`LiveConversationTranscript.tsx` passes the projection output into `VirtualizedTurnList.tsx`. The caller supplies base turn entries, private projection adapters, a row renderer, and a scroll controller. Missing row keys get a deterministic index-based fallback; compiled entries are expected to already have stable keys.

## Validation

- `npm run test:core`: 87 tests passed, 0 failed.
- `LiveConversationTranscript.tsx`, `VirtualizedTurnList.tsx`, and `StaticThreadTranscript.tsx` pass a separate strict static TypeScript check using a temporary minimal React declaration shim.
- The model's private source projector, actual host subscriptions, row renderers, Electron bridge and React runtime are still adapters or unimplemented. This is not a complete live page or pixel-parity claim.

## Explicitly unresolved

- Private base-entry creation and timeline hook `Df` are not transplanted; caller must provide their output.
- Generated-image projection, Aeon duplicate/retry filtering, external-surface predicate, read-receipt updates and turn expansion remain injected where their exact private dependencies are needed.
- The actual message/activity row renderer and composer are not integrated into a running Electron window.

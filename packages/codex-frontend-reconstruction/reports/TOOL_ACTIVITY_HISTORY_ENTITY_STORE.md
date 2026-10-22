# Tool activity history entity store

## Source evidence

The supplied readable Codex bundle `sites-end-resource-fa77a923096d.js` contains the source-shaped `zO` activity wrapper. It reads the canonical entity with `Mr(Au, { hostId, threadId, entityKey, itemId })` and reads a second, distinct query channel with `Mr(Vd, sameQuery)` only for assistant-message items. The second value is used as a truthy/falsy streaming gate (`isTurnInProgress && !item.completed && !presence`); the compiled call site does not require it to have the canonical entity's shape.

## Implementation

- `ToolActivityHistoryEntityStore.ts` supplies a concrete independent-frontend cache with separate history and assistant-presence channels.
- It supports subscribe-before-publish and cached-value replay, exact host/thread/entity/item query identity, thread clearing, and disposal.
- `ToolActivityHistorySource.ts` consumes this store using the same two-channel query contract.
- `ConnectedCodexToolActivityItem.tsx` continues to bind the immutable history source snapshot into the existing source-shaped renderer.

## Validation and boundary

The tests exercise the entity store and the store → history source → hydrated activity path, including command output/status and assistant streaming presence.

This is a reconstructed host-side store, not the original private Codex `Mr/Au/Vd` query runtime. The private runtime and its provider are bundled into Codex's compiled application; this package intentionally does not import or claim to reuse those private modules. Agent-backend event ingestion and a real Electron mount remain subsequent integration work.
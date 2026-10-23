# 2026-10-23 — source-owned activity collapse state and group header identity

## Source evidence
- `frontend/webview/assets/sites-end-resource-fa77a923096d.js`, SHA-256 `a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708`.
- `Lk` consumes `persistedCollapsed` and `Rk` chooses `persistedCollapsed ?? local` through its `useState` fallback. Its `Hk` disclosure uses `onSetCollapsed` when provided, otherwise local state.
- `ek` gives `nk` `isLatestVisibleUnit` only for the last unit (`t===m.length-1`), with `isActivitySliceClosed` forwarded to `hg`.
- `frontend/webview/assets/local-conversation-turn-69783815d57d.js`, SHA-256 `e40ee63884bc75af917583fe70afade4b6c683adbd93d9536b7636eb6d8f54d4`. The turn-level `n===all` branch supplies `isCollapsed:ae` and `onSetCollapsed:N` to `za/Rk`.

## Implementation
- Introduced host-neutral `createSourceActivityCollapseState`, keyed by conversation + virtualized turn + block key. It stores only explicit user choices in memory. A single host instance survives virtualized row remounts and conversation switches, while a new demo host lifetime clears them.
- The existing `ConversationMessageBlocks → ConnectedConversationMessageRenderers → CodexAgentActivity` path now supports source-confirmed controlled collapse via `React.useSyncExternalStore`; older hosts without the adapter retain local-state fallback.
- The existing group header receives `isLatestVisibleUnit` from unit order and `isActivitySliceClosed` from the source block, instead of labelling all groups as latest and all slices as open.
- Unit tests cover unchanged notifications, key separation, unsubscribe and disposal. Existing Chromium interaction tests additionally verify switching/remounting and reset semantics.

## Boundaries
- This is in-memory host state, not disk persistence, Codex settings, Electron IPC or Agent persistence.
- Private `Wa/hn` partitioning, `Ga` details, MCP subgroups and source-accurate appearance still require further recovery. This batch makes no claim of pixel parity. CI must verify the commit before any passing assertion.

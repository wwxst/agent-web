# Live conversation message row rendering — reconstruction batch

Date: 2026-10-21

## Source evidence

The user-provided compiled Codex assets were examined directly:

- `frontend/webview/assets/local-conversation-turn-69783815d57d.js`, especially the compiled `rs` block renderer and `ls` wrapper.
- `frontend/webview/assets/agent-activity-item-1be092f0c744.js`, including activity grouping and dynamic-tool presentation.
- Existing reconstructed `LiveConversationTranscript` and `VirtualizedTurnList` interfaces.

The actual source is compiled/minified JavaScript without source maps. These are independently named reconstructions and not the authors' original React/TypeScript files.

## New code

`src/conversation/ConversationMessageRenderPlan.ts`:

- Models five observed transcript block kinds: user messages, assistant messages, agent-activity groups, activity items and generated-image rows.
- Preserves multi-part agent-activity keys, distinct result rows, active/collapsed status, explicit MCP special result handling and subagent/ordinary/activity-unit presentation branches.
- Preserves user first/last metadata, read receipt gating, last assistant key, streaming copy policy, generated-image `src` filtering and first-response boundary consumption.
- Models the thinking / compact-typing slot, in-progress fixed content carrying diff and todo item metadata, and footer/follow-content anchoring.
- Calculates block gaps, including the compiled exception before the compact typing slot.

`src/components/ConversationMessageBlocks.tsx`:

- Reconstructs the observed single/multiple block wrappers and `data-virtualized-turn-content` in the single-block case.
- Dispatches each semantic node to an explicitly injected host/UI renderer.
- Uses the original wrapper utility classes to the extent verified from the compiled chunk.
- Supplies the last eligible block for the latest-turn footer; preserves follow-content refs.
- Provides `createConversationLiveRow(adapters)` as a compatible `VirtualizedTurnList.RowComponent` factory, plus `getDirectTranscriptBlock` for already-expanded single-block entries.

## Critical dependency boundaries

The following are **not** replaced with speculative replicas:

- Real Markdown / rich text / code and link renderer used by Codex message bodies.
- Activity slice visual renderer, automatic approvals, MCP app widgets, agent/sandbox/diff cards, icons, animations and design-system primitives.
- Compiled activity partition helper (`hn`), unit conversion (`Wa`), private persistent activity predicate and the special MCP result resolver.
- Full per-turn transcript projection, host subscriptions, Electron IPC, actual Agent backend protocol and composer.

The `ConversationMessageRenderers` interface is a **required host adapter**. The module by itself does not render the original Codex UI and does not establish pixel-level parity.

## Tests and verification

- Core `npm run test:core`: 110 Node tests passed, including 18 new message-plan tests; strict TypeScript core build passed.
- New TSX component static type check passed against a **temporary minimal React declaration shim**. This is not a full React environment/type-package check, and no component was mounted.
- A Git patch is constructed against the previous delivered `codex-frontend-live-source-full.zip` archive. Patch application and ZIP re-extraction checks are performed at packaging.

## Next work

1. Trace and restore the actual Markdown/code/file-diff, activity-unit, MCP approval and assistant-content renderer interfaces, without replacing Codex CSS/DOM rules by invented UI.
2. Mount the React rendering chain using genuine React dependencies and a controlled host event adapter; test streaming and scroll/resize behavior.
3. Recover composer/editor controls and Electron bridge contracts, then run end-to-end desktop + visual comparison.

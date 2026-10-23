# 2026-10-23 — source-first activity timeline and grouped patch integration

## Verified original bytes
- `inline-followup-markdown-4751fe20f26d.js`: SHA-256 `b2a356e8c59b592f16514e9c160cacbbeebfedf0c18b87699564f8c20705fa0b`.
- `sites-end-resource-fa77a923096d.js`: SHA-256 `a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708`.
- Locale `zh-CN-7ba80cbb133d.js` contains `localConversation.agentActivity.summary.editedFiles.leading` and `.summary.commands`.

## Exact recovered decisions
- `N/P`: buffer consecutive `groupable` normalized items; preserve source order, `startsGroup`, stable IDs, and conditional continuation across subagent activity. `_e` remains host-owned: no guessed grouping of unknown tool types.
- `mk/rk`: filter unfinished read/search/list-file rows and patch visualization visibility before deciding if a group can expand. The original `mh`, `cc`, `Og` are explicit host callbacks, not fabricated private implementations.
- `nk`: group child rows scroll within `vertical-scroll-fade-mask ... max-h-56 ... overflow-y-auto`. Nested FileDiff continues to own its 100/240px viewport.
- `je`: grouped summary uses the already recovered `classifyRawActivityItem -> aggregateAgentActivityUnits -> projectCompletedGroupHeaderParts` chain. The demo formats just two source-confirmed zh-CN labels, visibly marked simulated.

## Current connected implementation
- `AgentActivityUnitGrouping.ts` and `AgentActivityGroupVisibility.ts` are reusable host-neutral pure modules.
- `demo/adapters.tsx` now calls them in the existing `ConnectedConversationMessageRenderers` path, rather than unconditional one-group and unconditional expandability.
- `CodexActivityGroupRow` adds the original group's independent capped scroller and now receives the `mk`-filtered detail rows separately from the full header items; no replacement transcript or standalone showcase was added.
- `demo/mockConversation.ts` contains a **synthetic** multi-command/multi-patch continuity case. `demo/e2e/activity-continuity.spec.ts` verifies actual browser expansion, child order and nested FileDiff scrolling.
- No Electron IPC, Agent backend, real command execution, approval mutation, private icons/theme, or same-build pixel parity is claimed. The supplied reference screenshots may be from a different build.

## Next
1. Trace the private `_e` normalizer and host-supplied group boundaries to remove demo grouping metadata.
2. Restore real `Sg` completed header localization/icons, `mk/rk` private guards and `bg` MCP subgroups.
3. Compare the exact original-build screenshot at identical viewport/theme/state before CSS claims.
4. Then continue ProseMirror jja/Dja and real Electron integration.

## Follow-up: actual Turn-mode renderer

The source `local-conversation-turn-69783815d57d.js` branches `n===latest` to `ga` directly, while `n===all` wraps older activity in `za` (the `Rk/Hk` collapse family). `SourceTurnTranscriptBlocks` now reuses previously recovered `TurnItemRenderGroups` and the existing `ConversationMessageRenderPlan`, instead of constructing separate test Turn rows for every commentary, tool and final-answer item. `ConnectedConversationMessageRenderers` receives the mode through the same block renderer. A generated raw-turn scenario exercises command+patch+final answer in one virtualized Turn, without an extra historical Rk disclosure.

The synthetic host explicitly provides `_e`-shaped metadata for the final assistant and a commentary-to-command group boundary; it does not infer Codex private predicates. The latest-mode commentary filter is respected even when that differs from a reference screenshot with multiple turns. In the verified CI run at `699d9849`, core 333/333, model 4/4, build and 21/21 Chromium passed. The connected app still does not ingest real Agent/Electron events or claim pixel parity.

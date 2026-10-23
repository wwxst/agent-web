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
- `CodexActivityGroupRow` adds the original group's independent capped scroller; no replacement transcript or standalone showcase was added.
- `demo/mockConversation.ts` contains a **synthetic** multi-command/multi-patch continuity case. `demo/e2e/activity-continuity.spec.ts` verifies actual browser expansion, child order and nested FileDiff scrolling.
- No Electron IPC, Agent backend, real command execution, approval mutation, private icons/theme, or same-build pixel parity is claimed. The supplied reference screenshots may be from a different build.

## Next
1. Trace the private `_e` normalizer and host-supplied group boundaries to remove demo grouping metadata.
2. Restore real `Sg` completed header localization/icons, `mk/rk` private guards and `bg` MCP subgroups.
3. Compare the exact original-build screenshot at identical viewport/theme/state before CSS claims.
4. Then continue ProseMirror jja/Dja and real Electron integration.

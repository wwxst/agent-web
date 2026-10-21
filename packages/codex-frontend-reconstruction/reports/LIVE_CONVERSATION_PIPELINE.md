# Live conversation pipeline — recovered module contracts

Date: 2026-10-21

## Exact compiled reference

`frontend/webview/assets/local-conversation-thread-6999d2419a30.js`

This reference is readable **compiled JS**, not the authors' TypeScript/React source. The following source-line locations refer to the supplied readable build and are not stable across releases.

| Compiled function / lines | Behavior observed | New independent TypeScript module |
|---|---|---|
| `eD`, 1204–1217 | Loaded-history gate, tail-flush filtering, legacy-entry handling, voice/history projection and reconciliation | `LiveConversationTimelineCoordinator.ts` (outer orchestration only) |
| `tD`, 1218 | Projects a turn while honoring hidden items and request IDs | **Not recovered**; explicit `projectOrdinaryTurn` adapter |
| `nD`, 1219–1220 | Marks most recent real turn and its fixed-content state | `LiveTimelineMerge.ts` → `markMostRecentTurn` |
| `iD`, 1228–1239 | Synthesizes bootstrap voice/BEM events for an active session | **Not recovered** |
| `aD`, 1240–1243 | Determines insertion of voice session boundaries | **Not recovered** |
| `oD`, 1244–1263 | Merges projected voice entries into existing transcript, preserves unprojected entries and defers boundary-adjacent entries | `LiveTimelineMerge.ts` → `reconcileProjectedTimeline` |
| `sD`, 1264 | Retrieves base turn ID or presentation source turn ID | `LiveTimelineMerge.ts` → `getEntrySourceTurnIdWithPredicate` |
| `cD`, 1265–1272 | Trims/filters voice session records according to visible turn groups | **Not recovered** |
| `lD`, 1272 | Recognizes BEM lifecycle record types | `LiveTimelineMerge.ts` → `isBemLifecycleRecord` |
| `uD`, 1273–1335 | Turns BEM/voice blocks into render entries; supports grouped voice tail, subagent presentations, pending artifacts and history keys | `LiveVoiceBlockProjection.ts` |
| `dD`, 1336 | Attaches history source key, associated IDs and projection closure | `LiveVoiceBlockProjection.ts` → `attachHistorySource` |
| `ZE`, 1194–1201 | Joins adjacent same-role voice transcript chunks | `LiveTimelineMerge.ts` → `coalesceAdjacentVoiceItems` |
| `EO`, `DO`, `OO`, `kO`, `AO`, 1549–1574 | Automatic follow, phase transitions and scroll mode | `LiveViewportFollowState.ts` |
| `Mk`, `Nk`, `Pk`, 1746–1754 | Response spacer persistence and newest steering key | `LiveViewportFollowState.ts` |
| `Ok`, 1694 onward | Virtualized turn list and response follow-state orchestration | **Not recovered**; requires `virtualized-turn-list` reference |
| `cA`, 1835 onward | Live thread data subscriptions, real-time selection, history and timeline view | **Not recovered**; still main React target |
| `qA`, 1969 onward | Local thread shell, composer, overlays, responsive layout | **Not recovered**; still main React target |

| `Y` in `local-conversation-thread-turn-entries-ed0916a7814f.js` | Builds final render-entry metadata, timestamp separators, compact Aeon channel/timestamp markers, reply quote boundaries, gaps and row identity reuse | `ConversationRenderEntriesModel.ts` (private dependencies injected) |
| `cA` composition edge | Invokes live timeline and turn-entry projection, then hands entries to the virtualized list | `LiveConversationTranscript.tsx` (adapter-based middle layer only) |

## Independent interfaces and test coverage

1. **LiveTimelineMerge** — source turn extraction, preserving actual last real turn, voice-item coalescing, projected timeline merging, transcript-tail-flush turn classification, BEM record-type classification.
2. **LiveVoiceBlockProjection** — canonicalized BEM voice event projection, voice transcript tail assembly, subagent thread lookup, terminal session suppression, pending artifact preservation, per-item history source metadata. Private presentation helpers are injected.
3. **LiveViewportFollowState** — pure follow-state reducer, in-progress turn phase inference, steering key tracking, spacer persistence and 24px scroll tolerance.
4. **LiveConversationTimelineCoordinator** — loaded-history gate, identification and omission of synthetic transcript-only turns, fast path for sessions without historical voice records, optional ordinary-turn projection, merging and latest-turn marking.

These modules are **not yet wired into a running React/Electron shell**. Their unit tests verify independently authored behavior against selected branch contracts; they do not establish full behavioral or pixel-level parity with the proprietary reference. In particular, the compiled code's private predicates (`_y`, `Du`, `kD`, `OD`) and projector helpers (`pD`, `xD`, `mD`, `hD`, `gD`, `vD`, `eu`) are deliberately not guessed.

## Remaining implementation order

1. Extract and classify the imports/props around the live virtualized turn list (`Ok`) and `virtualized-turn-list-*` dependency.
2. Restore the live thread's React shell (`cA`, `qA`) **behind typed injected host/component adapters**, without inventing unobserved UI styling.
3. Reconstruct the actual live page host subscriptions and connect their `renderEntries` output to `LiveConversationTranscript`; then restore the verified message-body, Markdown and activity-item renderers.
4. Recover the composer and integrate a local bridge mock with deterministic event fixtures; build a usable UI prototype.
5. Validate the prototype against real Codex desktop behavior with matched viewport, interaction scenarios and screenshots.
6. Only after license/permissions review and parity testing, connect an independently implemented backend event adapter.

## Status note

There is no claim that the full Codex frontend has been recovered or that it is now runnable. The reconstruction is intentionally staged, with original references kept read-only.

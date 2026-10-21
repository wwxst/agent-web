# Module map and confidence

This is a semantic map derived from the user-provided compiled frontend. Reconstructed names are descriptive and are not asserted to be the original source names.

| Reconstructed module | Compiled reference | Scope | Confidence / unresolved dependency |
|---|---|---|---|
| `conversation/ActiveToolActivityLabel.ts` | `active-tool-activity-label-4bf40176756e.js` | Tool activity labels, command status copy, safe query-term formatting, visualization create/update detection | High for branch structure and message IDs; path formatting and skill recognition are injected adapters |
| `conversation/TurnEntriesModel.ts` | `local-conversation-thread-turn-entries-ed0916a7814f.js` | Reply-chain index, timestamp markers, item-to-turn lookup, virtualization height estimates, equality/memo helpers | High for recovered pure helper behavior; private renderability predicate and deep-equality implementation are injectable |
| `components/TimelineActivityBody.tsx` | `timeline-activity-body-20adff28ef8e.js` | Lightweight activity layout wrapper | High for observed classes and prop forwarding; class-merging utility is injected |
| `components/CollapsedTurnDisclosure.tsx` | `collapsed-turn-disclosure-5a24f5665073.js` | Disclosure button, duration/count label, denied-action count and ARIA behavior | High for visible structure and message IDs; internal design-system primitives are injected |

## Not yet reconstructed

- Full local conversation page / shell from `local-conversation-thread-6999d2419a30.js`.
- Complete activity item renderer and all private helper dependencies.
- Message body and composer integration as a standalone application.
- Electron main-process/preload bridge and its exact runtime protocol.

## Fidelity policy

Keep the original extracted bundle separately as a local reference. Do not replace a reconstructed helper into the original runtime until its contract has been validated against the reference behavior. No claim of pixel-level equivalence or complete standalone operation is made at this stage.

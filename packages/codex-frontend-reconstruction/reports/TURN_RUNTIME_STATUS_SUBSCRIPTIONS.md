# Original Codex qn/Qr turn-runtime subscription recovery (2026-10-23)

## Source and boundaries

The user's private `frontend.zip` includes `frontend/webview/assets/local-conversation-turn-69783815d57d.js`, SHA-256 `e40ee63884bc75af917583fe70afade4b6c683adbd93d9536b7636eb6d8f54d4`. We checked the exact Fc render path, not screenshots. The bundled code keeps the following relationships in order:

1. `We = historyEntityKey == null || turn.status !== 'in_progress' ? null : { hostId, threadId, entityKey }`. `Ge=G(qn,We)`; `K=Ge==null ? turn.status==='in_progress' : Ge==='inProgress'`.
2. `Bi = isMostRecentTurn && upNextStatusItem!=null && !interruptedByThisClient`. It sends `Bi ? {hostId,threadId} : null` to `Qr`, reads `Ui=G(Qr,Vi)`, then `Wi=Bi&&!Ui`.
3. `Gi=K&&!ai&&!Wi` is passed to `Ga(Wa(...),Gi)` for *latest* rendering only. Historical rendering keeps the units unchanged.

Audit these with the read-only script `scripts/audit-turn-status-subscribers-evidence.mjs` against your own uncommitted extracted compiled bundle. It pins the full SHA-256 and nine source strings.

## Implemented and connected

- `SourceTurnRuntimeStatusSource.ts` adds actual frontend state subscriptions for those two canonical query channels; no fake Agent tool or private Codex database is instantiated. The host supplies `subscribeHistoryStatus({hostId,threadId,entityKey}, listener)` and `subscribeUpNextReady({hostId,threadId}, listener)`.
- The source performs exact query enabling, status fallback, source `Gi` derivation using the already recovered `SourceLatestActivityRetentionGate`, frozen stable snapshots, replay of published values, query rebinding, subscription teardown and generation-based stale callback rejection.
- The source also exports a small host-side `SourceTurnRuntimeStatusStore` publishing qn/Qr events for the **independent frontend**; production integration must feed it real host events. Its cache does not run commands or schedule automations.
- The existing `createConversationLiveRow` React component now subscribes using `useSyncExternalStore` to a host-supplied turn state source, overriding only `isTurnInProgress` and `latestActivityRetentionInput` in the existing render plan. `ConversationMessageBlocks`, `ConversationMessageRenderPlan`, `Ga/qe` and activity leaf renderers are reused unchanged.
- The DEMO uses a conspicuously labeled extra turn and buttons to publish simulated qn/Qr updates. The Chromium test checks **actual mounted React DOM** as Qr becomes ready, history status becomes completed, and history status resumes—without reloading the parent conversation or Agent backend.
- Node tests cover query activation and null fallback, external-store snapshot stability, synchronous replay, stale callbacks, host failures, thread rebinding, and source Gi propagation.

## Open gaps

We have **not** bound these query subscriptions to a real Electron or Agent backend transport. The private `G(qn/Qr)` runtime and its native history entity store remain unavailable. This batch restores an observable, independently testable frontend integration point rather than claiming real device/subscription data.

The source-aligned command/tool details, Codex proprietary UI/icon set, full automated task cards, original-build pixel matching and independent Electron lifecycle are also incomplete. Tests remain browser-fixture validation, not full Codex desktop acceptance.

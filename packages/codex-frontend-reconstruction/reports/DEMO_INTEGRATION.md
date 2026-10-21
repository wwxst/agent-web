# React/browser demonstration checkpoint

## Purpose

Make recovered **actual** React components mount together for user-visible integration validation. Use the existing `ConnectedLiveConversationTranscript`, projection, virtualization, message dispatch and review/approval components. Do **not** replace them with a standalone mock transcript implementation.

## Architecture

`mockConversation.ts` (synthetic entries) → `createLiveConversationSource` → `ConnectedLiveConversationTranscript` → `LiveConversationTranscript`/`buildConversationRenderEntries` → `VirtualizedTurnList` + `BrowserScrollController` → `createConversationLiveRow` / `ConversationMessageBlocks` → `createConnectedConversationMessageRenderers` + explicit demo host adapters.

The demo deliberately supplies `getBlocks` from mock `turn.demoBlocks` because the Codex private data-to-block projector is **not** reconstructed. The original compiled source was used to decide this boundary, not copied into the demo.

## Verification matrix

- `npm run test:core`: recovered pure TS model suite.
- `npm run demo:typecheck`: requires actual React/ReactDOM/Vite/Markdown dependencies installed; typechecks **all** demo and reconstructed TSX.
- `npm run demo:build`: Vite compilation and bundling; this is not the same as actually mounting in Chrome.
- `npm run demo:dev`: browser runtime smoke testing; evaluate React console, row virtualization, navigation and scroll restoration.
- Local Codex screenshot & interaction comparison is **manual**, not yet complete.

## Explicit non-goals in this checkpoint

The styling is a temporary integration skin based on generic Codex-like patterns. It has not passed official UI parity. The demo renderer does not claim to recover the original private Markdown engine, design-system components, exact approval mechanisms, live protocols, full diff worker or real Composer.

## Safety/authority boundary

- Demo sample command output (including test counts) is fixture text only.
- Mock "Reject" only displays a notification; accept/edit explicitly disabled.
- The composer returns an offline simulated reply; no network API is called.
- Binary original Codex resources and copyrighted archive remain local and are not committed to the public repository.

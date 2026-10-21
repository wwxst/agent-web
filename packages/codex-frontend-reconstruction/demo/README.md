# Browser integration demo · recovered Codex frontend

This is a **local interactive integration preview**, not the official Codex desktop UI, a production Agent client, or a reproduction of private Codex runtime behavior.

## Launch with Codex / your terminal

```bash
cd packages/codex-frontend-reconstruction
npm install
npm run test:core
npm run demo:build
npm run demo:dev
```

Open **http://127.0.0.1:5173/** in your browser. For a production-like local preview:

```bash
npm run demo:preview
# open http://127.0.0.1:4173/
```

Recommended: Node.js 20.19+ or 22.12+. On Windows, use the same commands in PowerShell or an integrated Codex terminal. If port 5173 is occupied, edit `demo/vite.config.ts` (the dev server uses `strictPort`). Do **not** use the Electron entrypoint yet; none has been restored.

## What is actually connected?

- `createLiveConversationSource` -> `ConnectedLiveConversationTranscript` -> `LiveConversationTranscript` -> `VirtualizedTurnList`.
- `ConversationRenderEntriesModel` produces the projected row keys and metadata.
- `createConversationLiveRow` -> `ConversationMessageBlocks` -> `createConnectedConversationMessageRenderers` and recovered `InlineFileReview`, `ActivityStatusLabel` and `AutomaticApprovalReviewList`.
- A **demo-only** scroll-controller adapter, Markdown renderer (`react-markdown`), mock activity details, and read-only file review components complete the private host interfaces.
- Interactions: switch sample conversations, expand tool output, show mock approval/file diff, append 45 messages to exercise virtualization, jump to a specific row, mock playback, stop, and send a local mock message.

## What is NOT implemented?

- No Agent API / real model inference, true streaming execution, attachments, file writes or security approvals.
- No original Codex Markdown engine, full FileDiff renderer, real Composer, Electron preload, IPC or design-system theme.
- Visual appearance is a temporary Codex-style preview; pixel parity is unverified. Never treat a mock command/result as real terminal output.
- No end-to-end browser verification has been completed until the commands above run on an npm-enabled environment.

## Local smoke checks after npm install

1. Open the page and verify conversation rows render without console errors.
2. Expand an activity; clicking "Reject" must only display a mock notification.
3. Click "添加 45 条历史", scroll to the top and back; the virtualized window should update.
4. Submit a Chinese message using Enter; a marked **模拟回复** should appear.
5. Start/stop the simulation and switch conversations. No backend requests should occur.
6. Run `npm run demo:build`, capture a screenshot and compare against your locally installed Codex. Record differences rather than claiming visual fidelity.

For any live browser testing, watch the browser console for React warnings and check the main transcript scroller. See `reports/DEMO_INTEGRATION.md` for the integration boundary and validation checklist.

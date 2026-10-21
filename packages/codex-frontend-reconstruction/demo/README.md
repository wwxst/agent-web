# Browser integration demo · recovered Codex frontend

The current preview includes an **evidence-informed light Windows desktop shell**, not a verified reproduction of the original private component tree. See [`../reports/UI_FIDELITY_STAGE_01.md`](../reports/UI_FIDELITY_STAGE_01.md) for source CSS selectors, the reference screenshot layout, known limitations and validation.

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
- Visual appearance is a source-audited light-shell iteration, **not pixel-level parity**. Original UI components and Composer runtime remain unimplemented. Never treat a mock command/result as real terminal output.
- No end-to-end browser verification has been completed until the commands above run on an npm-enabled environment.

## Local smoke checks after npm install

1. Open the page and verify conversation rows render without console errors.
2. Expand an activity; clicking "Reject" must only display a mock notification.
3. Open **演示工具** in the header, then click "添加 45 条历史", scroll to the top and back; the virtualized window should update.
4. Submit a Chinese message using Enter; a marked **模拟回复** should appear.
5. Start/stop the simulation and switch conversations. No backend requests should occur.
6. Run `npm run demo:build`, capture a screenshot and compare against your locally installed Codex. Record differences rather than claiming visual fidelity.

For any live browser testing, watch the browser console for React warnings and check the main transcript scroller. See `reports/DEMO_INTEGRATION.md` for the integration boundary and validation checklist.

## Automated browser smoke test

After `npm install`, run `npx playwright install chromium` once, then `npm run demo:test:e2e`. The tests run real Chromium against the Vite dev server, exercising initial React mount, simulated composer, long history and conversation switching; screenshot output goes to `demo/test-results/browser-preview.png` by default. They **do not** validate pixel parity or backend integrations.

### Source-first Composer layout checkpoint

The demo now mounts `src/components/CodexComposerLayout.tsx` rather than an
independent all-in-one composer box. This restores layout slots and state flags
verified against the user-provided compiled JS, not the actual rich text editor.
Shell CSS geometry follows original token values (`275px` preferred sidebar,
`46px` toolbar, `36px` application menu). The old `290px/49px` screenshot-sized
constants are no longer treated as Codex source facts.

See `reports/SOURCE_TRACE_COMPOSER_SHELL.md` for byte hashes, source signatures,
limitations, and the reproducible private-source audit command.


### Source-verified navigation rail checkpoint

`CodexNavigationRail` now renders the **separate** `nav[data-app-navigation-rail]`
landmark discovered in original compiled `app-initial`. Its direct destinations
are projected through `NavigationRailModel` and the secondary project/chat panel
is an independent sibling. Closing the secondary panel leaves the browser rail
mounted; measured width is forwarded to the shell variable. The host provides
icons and real actions — the demo's unavailable destinations are disabled rather
than pretending to navigate to nonexistent routes.

See [`../reports/NAVIGATION_RAIL_SOURCE_RECOVERY.md`](../reports/NAVIGATION_RAIL_SOURCE_RECOVERY.md)
for exact source identifiers and what remains unimplemented (drag/reorder,
account customization, peek, original icon system, Electron/window variants).

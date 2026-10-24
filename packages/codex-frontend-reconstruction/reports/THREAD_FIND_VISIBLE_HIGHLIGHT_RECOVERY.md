# Source Thread Find — mounted Markdown match highlighting (2026-10-24)

## Source boundary

The user's original Codex Windows bundle remains read-only and is never committed:

- `frontend/webview/assets/app-primary-fe8a450b3b04.js`, SHA-256 `2a05e25229bd7a38c12c55d90f82fb07087e80b4e16070116b215484498478f2`.
- Source functions `iFt` / `pFt` / `_Ft` / `xFt` / `AFt` route find commands, render input, previous/next and result label, and attach a top-right portal. `xFt` visibly exposes a private regex-worker result with `totalMatches`, `isCapped`, and `invalid-regex` / `regex-timeout` / `regex-unavailable` states.
- The compiled app's own search worker, text-offset matching, selection, and highlight rendering are **not** reproduced or proven equivalent by this change.

## Actual integration

The previous branch's `SourceThreadFindModel`, native Electron menu allowlist, `demo/App.tsx`, and `VirtualizedTurnListApi.scrollToKey` stay in place. This increment extends **the mounted conversation UI**, not an isolated model:

1. `demo/threadFindRenderedHighlight.ts` enumerates visible text nodes inside the existing row's `.demo-markdown` renderer, mapping a literal query occurrence to real DOM `Range`s across split Markdown text nodes.
2. The active match is selected by the same `findMatches` ordinal already shown in the bar, scoped to the same `history-content:turn` key used by the virtualizer.
3. A CSS Custom Highlight decorates a single active `Range` without modifying React-owned nodes, introducing an additional transcript renderer, or selecting user's text. If source and visible counts disagree (e.g. a collapsed activity, hidden content, Markdown conversion), no wrong occurrence is highlighted.
4. Once the virtual row is mounted after `scrollToKey`, the selected match itself is moved into the scroll viewport. Unmount, Escape, query/turn change and component cleanup remove the highlight.
5. `desktop/electron-smoke.test.mjs` tests the actual native View menu, synthetic message submission, six distinct repeated occurrences across two mounted virtualized turns, next navigation to a different `Range` inside the same turn, visible geometry and cleanup.

## Explicit limitations

- **UI approximation:** CSS highlight colors are not validated against the private version-matched Codex visuals.
- Only already rendered Markdown can be highlighted. Tool outputs hidden in collapsed activities, unhydrated history turns, diff/file/page/browser domains and arbitrary JSON are not highlighted.
- Search counting remains the previous capped literal source snapshot projection, **not** the original private regex worker, match-offset range system, or asynchronous background scanning.
- CSS Custom Highlight support is required for visual decoration; unsupported hosts still preserve existing search and turn navigation.
- Synthetic demo messages and the Electron preload are not the real Agent event stream and do not execute tools or modify files.

## Verification gate

Require final-commit GitHub Actions green on React/TypeScript build, core, demo models, Chromium browser and **native Windows/Linux Electron** smoke. The new same-turn occurrence test runs against the independent Electron app. CI status must be checked; a source report is not evidence of a passed test.

Next: trace original worker protocol and exact match offset-to-renderer ownership. Recover host-hydrated history indexing and content domain selection only after actual source contracts have been verified.

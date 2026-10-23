# Original conversation-gap and typography integration — 2026-10-23

## Compiled evidence
- `frontend/webview/assets/app-shared-dc7535e633d7.css` defines `--conversation-item-gap:16px` and `--conversation-grouped-item-gap:4px`; the normal chat font tokens resolve via `--codex-chat-font-size:var(--codex-chat-font-size-override,var(--font-ui-size,13px))` and the code font through `--codex-chat-code-font-size:var(--codex-chat-code-font-size-override,var(--font-code-size,12px))`.
- `frontend/webview/assets/conversation-gap-f75c434d4ee7.js` is the original visible gap component. It uses `variant==='grouped' ? var(--conversation-grouped-item-gap,4px) : var(--conversation-item-gap,16px)`.
- The existing browser preview had `gapPx={22}` in `demo/App.tsx` despite the source's 16px ordinary-item default, and independently specified 13.5px for Markdown in `demo/codexDesktopShell.css`.

## Connected fix
- Introduced `SourceConversationLayoutTokens.ts` for the pinned source defaults. The *existing* `ConnectedLiveConversationTranscript → VirtualizedTurnList` now receives the source 16px item-gap value, so scroll anchor calculations and DOM spacing use the same number.
- The existing browser shell exposes the normal and grouped gap properties, plus chat/content and code font tokens, and renders its message/Markdown typography via those properties. This is CSS and virtualized geometry integration, not a new transcript renderer.
- Chromium test, after adding history and navigating to the beginning, checks computed tokens, at least one actual virtual row margin, and rendered Markdown font size. Core test records the pinned values to prevent accidental regression.

## Known limits
The original can override these tokens by active theme, platform and presentation variant. The fixture uses default light-shell values, not a full implementation of the original token/theme resolver. The mock `Worked for` marker and all fake timeline data remain clearly demo-only. This batch does not implement Electron IPC, Agent events, file operations, permissions or pixel-parity against a different original-build screenshot.

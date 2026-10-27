# 2026-10-27 — Source unsupportedOpenAIForm fallback, Skip/Dismiss and exact wire

## Original Windows compiled implementation (from supplied frontend.zip)
- `frontend/webview/assets/mcp-server-elicitation-request-panel-7318114289f7.js`: original `at` routes `unsupportedOpenAIForm` to `ke` from `request-panel-26c348285c1a.js`, passing `hostId`, `conversationId`, `requestId`, `serverName`, and `onStandaloneResponseChange`.
- `frontend/webview/assets/request-panel-26c348285c1a.js` `bn` (export r, imported as ke): source-specific fallback title **This form isn’t supported in this version**, description **{serverName} requested this form. You can skip it and keep going, or dismiss the request**, two buttons **Dismiss** -> `cancel` and **Skip** -> `decline`; Escape -> cancel. It has a 16px content inset, separate bordered action footer, primary Skip and danger Dismiss. No form fields can be displayed in this fallback.
- The original `bn` invokes `replyWithMcpServerElicitationResponse(conversationId,requestId,St(action))` where `St` is `q2t` (export `iSr`) in `app-initial-5851df3f6cb1.js`. Its EXACT unsupported-form action wire for either decline or cancel is `{action:'decline'|'cancel',content:null,_meta:null}`. It is NOT a generic `{decision:'accept'|'decline'}` reply.
- Other source variants `formElicitation`, `openaiForm`, `legacyOpenAIForm` are routed to full `Ae` form renderer, with private typed schema parsing/validation, drafts, input, file options, auto resolution and alternate confirmation presentation. They have NOT been restored in this PR. Returning the unsupported fallback for these valid kinds would be incorrect.

## Implemented in the real reconstructed app
- `SourceUnsupportedOpenAIFormModel.ts`: strict exact-kind projection; serverName bounds; host/thread/request identity; explicitly distinct cancel and decline source wire.
- `SourceUnsupportedOpenAIFormCard.tsx` + CSS: source-specific fixed fallback panel, exact actions/description, no fabricated input fields; request-local submitting/sent/error phases. Rendering no input fields is required by source for this variant, not a shortcut to a full form implementation.
- Existing `ConnectedConversationMessageRenderers`, `demo/adapters.tsx`, host pending registry and canonical LiveConversationSource virtualized timeline: original `at` branch now mounts in the live transcript. Browser demo has a clearly marked synthetic fixture, read-only when no Electron transport is present.
- New context-isolated `agent-web:unsupported-form-reply` native IPC in main/preload. Exact four-field envelope, validated trusted renderer, only `decline` or `cancel`, no content or arbitrary IPC. Optional authenticated Agent transport receives source `action`, `content:null`, `_meta:null`, but current independent desktop has NO backend and always rejects with `UNSUPPORTED_FORM_BACKEND_UNAVAILABLE`. Clicking Skip/Dismiss cannot remove a request. Host `elicitation-settled` must do so.

## Automated tests
- Core original source projection and exact response mapping, including malformed kinds and identity.
- Node native IPC validates trusted sender, schema/extraneous keys, action restrictions and source decision/content/_meta wire.
- Chromium mounts fallback in same transcript, checks actual text, Skip/Dismiss browser read-only and absence of made-up fields, captures screenshot.
- Real Windows and Linux Electron: main host event -> context-isolated preload -> virtualized React card, Skip and Dismiss fail-closed via native IPC, update same request without duplicates, wrong-host settlement ignored, exact host settlement removes row. Native test is part of existing desktop:test:smoke.

## Gaps and architecture boundary
- This is NOT a full schema-driven MCP form renderer. Remaining original `Ae` (formElicitation/openaiForm/legacyOpenAIForm), draft persistence and file fields, validation, auto-resolution, alternate confirmations and native Agent protocol must be recovered separately from original resources.
- The independent Electron host still has no authenticated Agent backend, so even valid Skip/Dismiss remains pending after rejected IPC. Synthetic fixture and native test-originated host events are explicitly labeled as such.
- No pixel equality claimed without comparison against a running original Windows Codex executable. Branch stacked on previous draft PR. Do not merge main.

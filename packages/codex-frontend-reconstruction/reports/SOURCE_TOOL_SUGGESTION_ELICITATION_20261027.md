# 2026-10-27 — Source Tool Suggestion compact request in canonical conversation

## Verified compiled Windows source
- `frontend/webview/assets/mcp-server-elicitation-request-panel-7318114289f7.js`: `at` dispatches `kind:toolSuggestion` to `Re`, with request-scoped `hostId`, `conversationId`, `requestId`, and `suggestion`.
- `frontend/webview/assets/inline-tool-suggestion-request-card-bbfc54e45af0.js`: exported `ot` routes onboarding vs `J`; `J` branches on `suggestion.tool_type` (`connector`/`plugin`), `suggest_type` (`install`/`enable`), `tool_id`, `tool_name` and calls real host connector/plugin availability, install/enabling and re-check functions. Primary starts Install/Enable; after an initiated install it may become Continue, whose handler verifies actual readiness before dispatching `accept`.
- Same module `st`: the Continue title for connector installation is `Click Continue when you're done connecting {toolName}`; for plugin installation it is `Click Continue when you're done installing the {toolName} plugin`; `ct` checks connector `isAccessible` plus optional `isEnabled`, or plugin `installed` plus optional `enabled`.
- `frontend/webview/assets/mcp-plugin-logo-807452fde2d3.js`: shared `ct` compact flex-wrap request surface with 40px icon, app name and description, `Not now` secondary and Install/Enable/Continue primary. It is **not** the `qbd` MCP permission card.

## Implemented and integrated
- `SourceToolSuggestionRequestModel.ts`: exact source selector/field projection; original readiness predicate; primary label and title selection; strict host-scoped identity.
- `SourceToolSuggestionRequestCard.tsx`: original-shaped card using the existing `SourceCompactElicitationCard` with target icon. It supports host-provided `onStartSetup` and `onCheckReady`, and can submit `accept` only after a **verified** positive readiness result. It never equates opening an installer with a granted tool permission.
- `SourceCompactElicitationCard.tsx`: factored original ct into two true sibling variants, without changing the existing URL-action attributes or two-step semantics.
- `ConnectedConversationMessageRenderers` projects the exact request in the **existing canonical virtual transcript**. The `demo/adapters.tsx` host projects authenticated incoming pending `toolSuggestion` events from the host event registry and supplies no install/enable callbacks: this independent Electron has no verified plugin/app management protocol. The primary action is therefore disabled, not a fake installer.
- `Not now` calls the pre-existing Electron context-isolated, fail-closed MCP response transport with decline and full host/request context; absence of an authenticated Agent backend leaves the card pending with explicit error. Only the host's authoritative settlement removes it.
- A toolbar-injected synthetic fixture is clearly marked as such, for Chromium UI/screenshot verification only. It does not pretend to be an Agent event.

## Verification
- Core tests: 2 targets x 2 actions, source title/label, exact original readiness conditions, rejected unsupported and malformed variants, scoped identity.
- Playwright: mounted card through existing browser demo transcript, no false Install/Continue behavior, Not now fail-closed.
- Real native Electron: main process sends pending event -> context-isolated preload -> source bridge -> live React transcript -> compact card. Native button cannot install absent real host; Not now failure retains request; host update same ID changes variant; exact host settlement removes card. Tests included in Windows/Linux desktop:test:smoke.
- CI status should be checked on final branch commit. Do not claim full source parity before exact original executable visual comparison.

## Remaining work
- The real authenticated Agent backend and native host install/enable/OAuth, connector list, plugin availability and reload, source App logo/icon lookup, analytics, in-app installation, onboarding overlays, verified reply settlement and source hotkeys are NOT implemented. No live plugin is installed in this test.
- Source UI is a semantic recovery from compiled JS, not a screenshot redesign; full pixel equality requires comparison to running original Codex. Keep branch stacked on PR #44 and draft; no main merge.

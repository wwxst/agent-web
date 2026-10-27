# 2026-10-27 — Source userVerification biometric request and narrow cancel transport

## Verified user-uploaded Windows source
- `frontend/webview/assets/mcp-server-elicitation-request-panel-7318114289f7.js`: `at` dispatches `kind: userVerification` to `we` keyed with JSON.stringify([hostId,conversationId,requestId]), NOT generic MCP approval.
- `frontend/webview/assets/mcp-plugin-logo-807452fde2d3.js`: `Re` displays `Identity verification requested by {serverName}`, source `title`, whitespace-preserving `description`, `Review this request before approving it with Touch ID`, `Cancel` and `Approve with Touch ID`. It disables approval unless a native verification provider is available; status can say `Waiting for Touch ID…` after a REAL verification attempt.
- In same module `Ke`, approval is not a reply-shaped grant: it requires native `beginUserVerification` with expected source request, challenge/session handle, wait for verified outcome, then explicit `accept`. Cancel is separately wired with `ye('cancel', {'openai/userVerificationReason':'userCancelled'})`. It is NOT generic `decline`.

## Implemented in canonical frontend
- `SourceUserVerificationModel`: strict source `userVerification` projection from trusted host event with full scoped identity; explicit source cancellation reason.
- `SourceUserVerificationCard` + CSS: original-shaped source panel and separate action labels. `Approve with Touch ID` stays **disabled** because the independently running Electron shell has no verified provider or biometric signing/accept implementation. No simulated result, fake authentication or inferred capability.
- `ConnectedConversationMessageRenderers` uses the existing canonical virtualized transcript and host pending request registry. Browser-only fixture is explicitly synthetic; its Cancel is disabled with absent Electron transport.
- `desktop/userVerificationCancel.cjs`, `desktop/main.cjs`, `desktop/preload.cjs`: a separate context-isolated and strictly scoped `agent-web:user-verification-cancel` IPC; exact 4-field request and `userCancelled` only, trusted renderer only, foreign field/ID rejected. Main can forward source `decision: cancel` to a verified Agent transport when provided, but currently fails closed with `USER_VERIFICATION_BACKEND_UNAVAILABLE`. Never reinterpret as generic decline, never settle the request on a local button click.

## Tests
- Core projection tests for userVerification title/serverName/description/scoped request identity and rejected malformed fields.
- Native cancel contract validates exact envelope, rejects unauthorized renderer, malformed reasons, and confirms full source-specific `cancel` wire shape with an explicitly supplied verified mock transport. A transport success is not a biometric verification.
- Chromium e2e tests mount the synthetic request in the same transcript and validate disabled Touch ID, read-only browser Cancel and original text.
- Real Windows/Linux Electron tests inject a main-originated host pending request; verify isolation, disabled Touch ID, enabled Cancel, backend-unavailable failure, no settlement, same-request update and exact host settlement. Full source parity requires subsequent real Codex executable comparison.

## Not yet implemented
- Original biometric provider, local credentials, Touch ID hardware/device integration, mobile handoff/Wallet purchase, request cancellation settlement via real Agent backend, original private Electron bridge and exact pixel parity. These must NOT be represented as restored success paths. Keep PR stacked and draft; no main merge.

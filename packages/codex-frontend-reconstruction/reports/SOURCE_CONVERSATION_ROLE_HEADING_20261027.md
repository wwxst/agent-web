# 2026-10-27 — Original Ft speaker headings in canonical conversation

## Original compiled evidence

User-supplied `frontend.zip` resource:
`frontend/webview/assets/user-message-attachments-93893a2e6026.js`
(34,522 UTF-8 bytes, SHA-256
`e19f1394a0b45725c91903e7c6f597fb8a431307f5c0a3ed29c0814d3561e411`).

Original `Ft({speaker})` creates exactly one `h4` for `user`
and `assistant`, with `sr-only m-0 select-none` and
`print:not-sr-only print:mt-4 print:mb-2 print:text-xs
print:leading-normal print:font-bold`.

- User: localized `codex.conversation.roleHeading.user`; source
  default text `You said:`.
- Assistant: localized `codex.conversation.roleHeading.assistant`;
  source default text `ChatGPT said:`, plus
  `data-conversation-role="assistant"` and `tabIndex=-1`.
- No heading is returned for other speakers.

## Concrete integration

`SourceConversationRoleHeading` is inserted directly into the
already-mounted `ConnectedConversationMessageRenderers.UserMessage`
and `.AssistantMessage` branches. It does not change the
virtualizer, Markdown engine, activity rows, approvals, Composer,
Electron IPC or Agent backend.

Host translations may override the source's default English strings
through the optional `roleHeadings` property. CSS preserves
screen-reader accessibility while reproducing the original
print-visible dimensions. No visible bubble redesign.

## Verification and boundaries

A Playwright test sends a synthetic message into the existing
React conversation and checks the two headings, assistant focus
metadata, hidden screen appearance and print stylesheet.

This is a source-backed accessibility and print subfeature, not
a claim of full attachment renderer recovery, exact private
localization, original Electron pixel parity or real Agent
connection. Original compiled assets remain outside Git.

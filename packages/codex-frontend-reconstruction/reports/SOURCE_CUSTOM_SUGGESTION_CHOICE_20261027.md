# 2026-10-27 — Source `or`/`Hn` Something else choice: free-text suggestions only

## Exact original Windows source
- User-provided compiled `frontend/webview/assets/request-panel-26c348285c1a.js`, `ur` dispatch checks the source free-text schema predicate (`EQn` as exported `tir`) and `x-openai-suggestions` to choose the `or` branch; a strict `oneOf` belongs to a separate `Hn` path and must **never** accept a non-enumerated answer.
- `or` displays the localized `Something else` final choice. The original `customDraft` has `{text,selected}`. Focusing or typing selects the custom choice; clicking a suggested const deselects it but **preserves** the custom text. On a single choice, the answer value becomes the custom text when selected, or the const when a source suggestion is selected.
- `Hn` handles `input[type=radio]` keyboard ArrowUp/ArrowDown, moving to the adjacent option and selecting it. The custom editor uses source `Qn` and the request `maxLength`; the host `Ge` draft persists customDrafts independently from the actual answer map.
- The original schema helper `TQn` (`Qrr`) obtains choices from `oneOf`, `anyOf`, `x-openai-suggestions`, or `enum`; `EQn` considers only string schemas without enum/oneOf/anyOf to be free-text. This PR **only** projects literal const/title/description `x-openai-suggestions` under a plain string schema.

## Integrated implementation, not a detached demo
- Extends existing `SourceTextFormElicitationModel` to project `x-openai-suggestions` only when no strict `oneOf` is present. Unknown private formats/extensions, conflicting fields, duplicate options or arbitrary HTML are rejected for the **whole form**. Existing `oneOf` and array checklists remain strict and unchanged.
- The existing `SourceTextFormElicitationCard` renders a final `Something else` radio + editable choice. Clicking a suggested option preserves the inactive custom text; focusing/editing custom selects it. ArrowUp/Down on radio inputs moves focus and selection. The same source validation handles minLength/maxLength.
- `SourceTextFormDraftStore`, owned by `SourceConversationHostEventBridge`, now retains bounded and frozen `customDrafts` separate from selected answer values by `[hostId,conversationId,requestId]`, surviving virtualized row unmount and conversation switch. Only original host settle or thread clear removes the request draft.
- The existing context-isolated Electron `agent-web:text-form-reply` checks answer envelope and values, but **does not have an authenticated Agent backend**. A valid source free-text answer is denied with `TEXT_FORM_BACKEND_UNAVAILABLE` until the real Agent checks its authoritative schema. No false success or permission grant.

## Verification and remaining work
- Unit tests cover strict vs suggestions, optional empty suggestions, unknown schema rejection, custom draft state/length, scoped settle and source q2t reply.
- Chromium Playwright mounts the actual canonical virtual transcript, edits custom choice, changes to suggestions and back, ArrowDown focus/selection, and restores custom state after switching conversations.
- Windows/Linux Electron test injects host pending event through main/preload to mounted React, enforces minLength and fail-closed Continue, and only exact host authoritative settled event removes the row. This is a main-originated test event, **not** a real Agent backend.
- Out of scope: array free-text suggestions with Enter-to-add, `x-openai-input` file or special formats, `anyOf`/`enum` variants, custom thumbnails, full original schema validator, native Agent backend, original executable side-by-side pixel comparison. No backend directories changed.

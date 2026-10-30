# 2026-10-27 — Source formElicitation oneOf radio and array multiple-choice recovery

## Original Windows compiled source, not screenshot inference
- Uploaded `frontend.zip`, `frontend/webview/assets/request-panel-26c348285c1a.js`, original `ei → Wr → ur → Hn` dispatch. Original `ur` calls `Ke(schema)` to derive option objects from choices, and routes string choice schemas to `Hn` using a single radio and array choices to `Hn` using multi checkbox; option cards display `const`/`title`/`description`.
- Original `Hn` uses Ft (radio) and kt (checkbox), selected matching `option.const`, keyboard ArrowUp/ArrowDown, and `onChange` for either the single const string or the array of selected const strings. Nontrivial `x-openai-suggestions`, `x-openai-input`, file/resource, image thumbnail and editable 'Something else' are separate code paths.
- Original `ei` keeps its current question, values and custom drafts in host `Ge`, and `q2t` accepts `{action:'accept',content,_meta:null}`. The real host must validate all allowed choices against its authoritative source schema.

## Reused and integrated implementation
- Extends the already integrated `SourceTextFormElicitationModel.ts`: only strictly constrained `string.oneOf` choices and `array` with `items:{type:'string',oneOf}`; bounded 2–12 unique const strings with title/description. Rejects private x-* options, unknown constraints, patterns, custom choices, nested arrays, unsupported numeric options, malformed/duplicate values and contradictory min/max constraints. Never partially renders a form with unsupported fields.
- Reuses **the same** `SourceTextFormElicitationCard.tsx` and one-question-at-a-time source navigation in actual `ConnectedConversationMessageRenderers`, canonical `LiveConversationSource`, not a secondary form system. Native radio group, multi checkbox selections, descriptions and maxItems reached disabled state.
- Existing `SourceTextFormDraftStore` now stores scoped, frozen string-array values and the question index across virtualized unmount/thread switch. Drafts are never promoted to an accepted action merely because they exist; exact host `elicitation-settled` removes a matching request.
- Existing context-isolated `agent-web:text-form-reply` preload/main accepts only bounded unique string arrays (at most 12, each <=256 chars, no control chars), typed booleans and numeric values. It passes only the original q2t payload through an *optional authenticated* host transport; current independent Electron rejects with `TEXT_FORM_BACKEND_UNAVAILABLE`, and tests explicitly assert no optimistic settlement.
- Synthetic choice form toolbar entry is clearly tagged as synthetic for UI tests; real native tests originate pending events from main process and traverse preload + canonical React event bridge.

## Tests and gaps
- Node model tests: exact oneOf and multi const/title/description, minItems/maxItems, required, JSON typed content and original q2t wire, malformed/duplicate/unknown constraints, host-owned draft retention, scoped authoritative settlement.
- Native IPC tests: typed arrays preserving false/numeric sibling values, rejecting duplicates/mixed-type/too many/overlong/control characters and backend-absent rejection.
- Chromium Playwright: actual radios/checklists in the virtualized transcript, current-question validation, max-items lockout, navigation, retained draft across thread switch and screenshot.
- Real Windows/Linux Electron test: host pending→preload→React radio/checkbox→Continue fails closed→native IPC rejects invalid options→only exact host settlement dismisses request.
- Not yet restored: original custom option text editor, thumbnail/resource/file choices, advanced selection keyboard behaviors, full unrestricted schema validator, OpenAI/legacy variants, true authenticated Agent backend, device software integration or exact pixel parity against a running Codex Windows build. All remain explicit gaps.

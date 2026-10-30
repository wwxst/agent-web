# 2026-10-27 — Original multi-select free-text custom suggestions

## Evidence from user-uploaded original Windows compiled frontend
- `frontend/webview/assets/request-panel-26c348285c1a.js` `ur` checks source string/array `zt` with `x-openai-suggestions` and dispatches `or({multiple:true, ...})` for an array. The original component differs from the single-choice `Something else` editor: `onChange` edits only the pending `{text,selected}` draft while typing; pressing Enter via its `On` key handler appends nonempty selected text to the array and resets the custom draft to `{text:'',selected:false}`.
- Original `Hn` maps array entries outside declared options as selected `kt` checkbox rows with their literal text; unchecking removes only that item. The regular suggested choices continue to allow independent checkbox selections.
- Original `vn` starts with the committed draft `values`, then for each `customDrafts[field]` whose `selected` is true and `text.length>0` and value is an array, appends the pending string to the outgoing answer before schema `Mt` validation. This intentionally means Next/Continue can include pending, not-yet-Enter-confirmed text, but must not prematurely mutate the draft array.
- Original `Ge` stores `fieldIndex`, `values`, `customDrafts` by host/thread/request identity, not by virtualized DOM lifetime. `q2t` produces `{action:'accept',content,_meta:null}` as the final typed MCP form response.

## Integrated changes
- Extends the existing `SourceTextFormElicitationModel`, not a new form system: accepts only array item `type:'string'` plus strict bounded `x-openai-suggestions` source `const/title/description`, optional item min/max text bounds, and outer minItems/maxItems/uniqueItems. Unknown formats, x-openai-input, mixed with oneOf, other private keys, unsupported schemas remain unprojected and cannot be submitted.
- Extends original canonical `SourceTextFormElicitationCard`: array choice checkboxes, pending Something else checkbox/text editor, Enter confirms a custom selection into the committed array and clears editor, explicit custom chips can be unchecked, and final validation incorporates an independent pending nonempty custom string.
- Extends `SourceTextFormDraftStore` to retain committed custom tags *and* independently selected pending text across virtual unmount, thread switch, and authoritatively scoped settlement. Existing single-choice custom behavior is unchanged.
- Existing Electron preload/main `agent-web:text-form-reply` accepts bounded unique strings; it **still rejects** every attempted response without a real authenticated Agent backend. Do not interpret test-injected main→renderer events as production Agent integration.

## Verification / limitations
- Core tests: source array schema, min/max and item min/max, strict vs suggestions, committed and pending combination, duplicates/over-limit/invalid draft, q2t content and host-scoped settlement.
- Chromium E2E: synthetic form appears in canonical transcript, Enter commits, custom chips removable, max choices disabled, pending custom draft and committed values restored after switching threads.
- Real Windows/Linux Electron test injects an original-shaped host `pending-elicitation`, exercises the same input/validation and confirms backend-unavailable reply and exact host settlement through the actual main/preload/UI boundary.
- Unimplemented: original unrestricted schema validation, non-string/custom file option variants, real Agent backend, original executable side-by-side pixel fidelity, session-restart persistent drafts. Source restrictions are deliberate, not an assertion that all Codex forms are done.

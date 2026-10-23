# 2026-10-23 — original ek/ok combined activity trace

## Compiled source

- `frontend/webview/assets/sites-end-resource-fa77a923096d.js`, pinned SHA-256 `a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708`, functions `ek` and `ok`.
- `ek` branches on `combinedUnitKey`: if no key, keep the `N/P`-derived units; otherwise call `ok` to flatten each existing group or standalone into a single source-ordered `agent-activity-trace:<key>` group.
- `ok` does not inspect commands, patches, titles, permissions or timestamps to decide whether to combine. The enclosing host owns the key and its semantics.
- `inline-followup-markdown-4751fe20f26d.js` `N/P` handles explicit `startsGroup` boundaries before `ek/ok` combines units.

## Integrated result

- `SourceCombinedActivityTrace.ts` is a side-effect-free port of `ok`.
- `ConnectedConversationMessageRenderers.tsx` calls it inside the existing `ActivityGroup` renderer after `toUnits`. An absent key preserves the previous UI, including independent group headers. No new layout or mock-only component was introduced.
- `demo/adapters.tsx` supplies `combinedUnitKey` only for a marked synthetic fixture. `demo/mockConversation.ts` now deliberately sets a boundary between commands and a two-file patch, demonstrating the original two-stage `N/P → ek/ok` composition in one real Turn and DOM group.
- Unit tests guard key/null/empty behaviour, stable trace IDs, item order, and input immutability; Chromium verifies one visible combined group, 3 command leaves, one patch leaf and FileDiff.

## Remaining

- The private selector that generates `combinedUnitKey` on real Codex events is *not* recovered; it must come from a verified Electron/Agent host contract.
- `Wa/hn` classification and activity-slice closure, MCP repeated-call subgroups, local theme/icons and scroll/focus pixel parity remain to be traced. Fixture-only metadata is not a production capability.
- A passing browser scenario is not an Electron IPC or actual Agent execution test.

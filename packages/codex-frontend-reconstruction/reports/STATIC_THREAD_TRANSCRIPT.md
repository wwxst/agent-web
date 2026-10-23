# Static thread transcript reconstruction

## Compiled source examined

`frontend/webview/assets/static-thread-transcript-c04876a22450.js`

The work in this batch focuses on the compiled helper `Bt` and the React orchestration in `Ot`, `At`, and `Vt`.

## Implemented

- `StaticThreadTranscriptModel.ts` converts snapshot items into stable message entries and grouped activity entries.
- Message IDs use a global counter across turns, while reasoning/commentary activity IDs retain their turn/item indices.
- Consecutive reasoning/commentary rows are grouped, then the range between the first and last activity group is merged exactly as observed, preserving intervening messages inside the group.
- User text blocks are joined with newlines; image blocks are retained as image URLs.
- Inspected images, generated images and file changes are extracted into distinct groups.
- The model identifies the last turn containing a user message, the first top-level assistant entry and the first user entry in that last user turn.
- `StaticThreadTranscript.tsx` restores the outer `<main>` / per-turn `<section>` hierarchy, omission notice placement, image placement, generated-image/file-diff ordering and the collapsed work-group behavior.

## Dependencies that remain explicit

- The shared-snapshot helper deciding whether the first turn is omitted.
- The exact predicate used to show the omission notice.
- Codex Markdown/message body, activity, image preview, file-diff and design-system components.
- Snapshot asset context/loader and translated copy.

These are adapters because their private implementations are in other compiled chunks; this reconstruction does not invent their behavior.

## Validation

Seven model tests cover message normalization, global IDs, activity merging, image/file-change extraction, initial-message anchoring, first-turn omission delegation and work-group collapse behavior. The pure TypeScript model is included in the strict core build. The TSX component passed a separate static type check against a temporary minimal React declaration shim; this catches local TS/JSX contract issues but is not equivalent to checking against the actual React package. The component has not been mounted or exercised in a browser/Electron runtime.

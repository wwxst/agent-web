# Find in Thread: visible Markdown labels vs hidden URL source hits (2026-10-26)

## Evidence from user-provided original compiled frontend

- `frontend/webview/assets/use-conversation-search-highlights-6c328093bb06.js`:
  `re` scans per-turn/per-unit **source text** (`textChunks ?? [text]`);
  `Y` highlights the actual rendered DOM under
  `[data-content-search-unit-key]` via private `w`/DOM walker.
- `frontend/webview/assets/highlight-selectors-4f82ccb0876d.js`:
  `r` groups results by `turnKey,unitId` (source `C Jn` key).
- The original private plain-text matcher `p`, worker, exact Markdown
  syntax-to-DOM offset mapping, and history-aware renderer walkers are not
  fully available as recoverable standalone source modules.

The previous independent demo (PR #23) preserved source unit IDs and
refused highlights when source and DOM counts differed. That is safe
against false highlights but also lost legitimate highlights such as
`foo [foo](https://site/foo) foo`, whose full raw source contains four
`foo` occurrences but the mounted DOM contains only three.

## Implementation

- Adds `SourceMarkdownVisibleFindModel.ts`: a **conservative,
  deterministic inline Markdown link visibility** adapter. It locates
  source spans hidden by supported `[label](destination)` and
  `![alt](destination)`, including balanced URL parentheses and
  escaping; code spans and code fences are skipped rather than
  misinterpreted as links.
- It maps a known full-source literal match offset to its ordinal among
  visible raw-text occurrences. Hidden URL / image-alt hits return
  `null` and must never borrow a visible occurrence.
- The existing search count, navigation position, per-unit identity and
  250-match cap are **unchanged**. This is a display-side verification
  layer, not a fake replacement search service.
- Actual mounted `App.tsx` passes the selected unit's original Markdown
  source and offset through existing virtualized scroll-to-key and
  source folded-user reveal to the existing CSS Highlight adapter.
- The CSS adapter maps only supported visible source matches to the
  selected live message's actual DOM `Range`, and refuses to highlight
  when visible DOM matches still disagree with the conservative source
  projection. No React DOM mutations or duplicate transcript.
- Core tests cover identical link label/URL occurrences, image alt text,
  nested parentheses, code spans/fences and malformed offsets.
- Real Electron smoke sends a message through mounted ProseMirror, uses
  the native View → Find menu, verifies source results 1–4, confirms a
  visible link-label highlight, confirms the hidden URL result has no
  fabricated highlight, then highlights the later visible occurrence
  in the same canonical user unit.

## Explicit limitations

This is intentionally not a general Markdown parser or a pixel parity
claim. Reference links, entities, rendered HTML, complex GFM tables,
escaped visible characters, math expressions, and mixed code-output
search units can still be ambiguous; they retain the safety guard or
remain unhighlighted. The private Codex worker and UI cannot be
asserted identical. User-provided original compiled files remain
read-only and are not pushed to GitHub. No Agent backend modifications.

Acceptance requires final-head Linux and Windows CI success and
original Windows UI side-by-side review for pixel-level claims.

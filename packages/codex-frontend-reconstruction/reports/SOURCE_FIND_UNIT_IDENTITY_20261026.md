# 2026-10-26 — Source conversation Find unit identity recovery

## Original evidence

The uploaded read-only Codex bundle
`frontend/webview/assets/use-conversation-search-highlights-6c328093bb06.js`:

- `re` iterates `getTurns().flatMap(turn => turn.units.flatMap(unit =>
  unit.textChunks ?? [unit.text]))`, retaining `turnKey` **and**
  `unitId`. It counts and navigates the first `z=250` matches.
- `Y` iterates rendered `[data-content-search-unit-key]` DOM nodes
  under the transcript container, finds the matching source location's
  unit key, and applies highlights *inside that unit*. A tool occurrence
  cannot shift an assistant-message or user-message highlight ordinal.
- Source `te.ensureVisible` navigates by `turnKey` then by match ID;
  it does not stitch unrelated Markdown and command metadata into one
  searchable DOM string.
- The original highlights use private `w/C` DOM walker, worker and
  `highlight-selectors`; they are not available in the independent demo.

## Concrete implementation

- `SourceThreadFindModel`: accepts optional `units` on each projected
  turn; indexes each unit independently, retains `unitKey` and
  **unit-local text offsets** on results; maintains independent
  `totalByTurn` and `totalByUnit`, preserving the 250-match global
  navigation cap. Old whole-turn hosts without `units` remain supported.
- `demo/threadFindProjection`: uses the existing canonical
  `getDemoBlocks` projection and already-hydrated history; builds
  stable message/activity unit keys from actual source item IDs. It
  no longer invents matches that span the `join("\\n")` of unrelated items.
- `ConnectedConversationMessageRenderers`: binds
  `data-content-search-unit-key` to already-mounted real user and
  assistant message DOM, without adding another row renderer.
- `App.tsx` keeps existing search, native View menu routing, virtual
  scroll-to-key, and source _u user-message reveal; now carries unit
  identity, per-unit ordinal and result count to the renderer.
- `threadFindRenderedHighlight`: restricts reveal to the exact
  selected user unit, and DOM CSS ranges to the single matching
  rendered message unit. Tool/search results without a corresponding
  visible Markdown unit never receive a fabricated highlight.
- Adds core tests for same-turn source unit ordinal/offset isolation and
  global navigation cap; existing Chromium/Windows/Linux Electron
  regressions exercise mounted history, user-message reveal, and Find.

## Still not fully equivalent to Codex

This does **not** recreate the private worker/parser or real
`unitId` construction for every activity domain. It retains a
conservative literal-search fallback for this mock host. Markdown
source syntax (e.g. hidden link URL) can produce raw matches that
have no visible DOM range. Those are counted but not wrongly
highlighted; full Markdown parser-derived source/DOM mapping is
future work. No real Agent backend or original Windows pixel parity
is implied. Do not claim test success until final branch CI completes.

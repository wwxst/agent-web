# Transcript entry expansion recovery

## Source evidence

The orchestration is reconstructed from the `me` function in
`frontend/webview/assets/local-conversation-thread-turn-entries-ed0916a7814f.js`.

## What the module models

- Reuses previous transcript entries when the observed turn/render inputs remain stable.
- Calls injected adapters for turn projection, item-to-block mapping, transcript grouping and compact Aeon transcript behavior.
- Handles empty summary placeholders and partially loaded Aeon history.
- Builds stable `turnKey` values, reply-chain metadata, estimated heights and the final-entry extras flag.
- Preserves the source's distinction between an Aeon transcript state and a normal projected turn state.

## Unresolved private helpers

The original bundle delegates substantial semantics to other modules. The reconstructed module therefore requires explicit adapters for projection, mapping, grouping, computer handoffs, pending-item classification and height estimation. This is not a drop-in replacement for Codex's original component.

## Validation

Four focused tests cover no-turn fallback, normal block expansion, empty pagination summary, and previous-entry reuse. Pixel-level behavior and full Electron integration are not validated.

# Virtualized turn-list React shell

## Compiled reference

- `frontend/webview/assets/virtualized-turn-list-d00a3b041bce.js`
- `frontend/webview/assets/thread-virtualizer-e1964ca5c039.js`

The component structure was reconstructed from the `M` list component and `N` row wrapper in the compiled bundle.

## Implemented in this batch

- A generic `VirtualizedTurnList` React component that consumes the verified `ThreadVirtualizerModel`.
- Renders only the current visible range plus overscan and explicitly retained rows.
- Uses the reference's relative root, full virtual height, offset flex column, row wrappers, `data-turn-key`, and virtualized-content visibility class.
- Measures row content through `ResizeObserver`, records heights by stable turn key, and rebuilds the layout.
- Attempts to preserve the visible measured row as a scroll anchor when the layout changes.
- Exposes `getEntryGeometry` and promise-based `scrollToKey` through an adapter API.
- Supports abortable navigation requests, center/top alignment, bottom padding, latest-turn footer, latest-turn follow-content ref, retained rows and viewport-range callbacks.
- Injects the scroll controller and row component rather than importing Codex private host or design-system modules.

## Fidelity boundary

This is an independently authored React integration based on observed compiled structure, not original source recovery. The reference's full layout transaction, host zoom helper, all latest-turn height/follow-content callbacks, accessibility details, restoration behavior, history retention callbacks and private scroll controller semantics are not fully reconstructed. It is not yet wired to a real Electron host and has not been mounted against the actual React package in a browser.

## Validation

The component is checked with a separate static TypeScript pass using a minimal React declaration shim. Core tests exercise the pure layout model. This does not replace real React type-checking, browser interaction tests or Electron visual regression.

## Static type check

The TSX component passed a strict TypeScript static check against a temporary minimal React declaration shim. This is not equivalent to checking against actual `@types/react`; no browser/Electron mount has been performed.

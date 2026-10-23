# Source-confirmed activity scroll-edge appearance — 2026-10-23

## Compiled CSS evidence

- `frontend/webview/assets/app-shared-dc7535e633d7.css` (from the uploaded 2026 Codex Windows `frontend.zip`).
- The original `.vertical-scroll-fade-mask` is gated by `@supports (animation-timeline:--scroll-fade)` and uses `animation-timeline: scroll(self y)`, custom `--top-fade`/`--bottom-fade` properties and the `edge-fade` keyframes.
- At scroll start, the top is opaque and the bottom fades over `--edge-fade-distance,1rem`; at scroll end the bottom is opaque and the top fades. The CSS also registers typed custom properties. This differs from a permanently drawn fade or a pseudo-element overlay.
- Original `sites-end-resource-fa77a923096d.js` `nk` puts the `vertical-scroll-fade-mask` class on the `max-h-56 overflow-y-auto` group detail surface.

## Current connected implementation

- `codexScrollFade.css` reconstructs the same source-observed behavior with namespaced typed custom properties and a source-specific animation name, rather than copying the entire proprietary app-shared theme.
- `CodexActivityGroupRow` now imports this CSS where its existing details scroller already had the class. No JS state, timer, synthetic scroll events or new demo UI were introduced.
- The existing 224px group scroller still owns scroll independently of its nested 240px FileDiff viewport. The updated Chromium test checks the computed mask and scroll timeline when supported, then scrolls the nested view to verify normal behavior.
- Unsupported CSS scroll timelines do not paint a permanent mask, matching the source feature-gated intent.

## Boundaries

This is one source-proven scroll treatment, **not** full visual matching to latest Codex. Theme token reconciliation, status icons, tool row spacing, FileDiff header and nested transitions remain unresolved; reference screenshots may have a different build. The work changes no backend, MCP protocol, IPC or permissions. CI must be checked at this exact commit before accepting any test result.

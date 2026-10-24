# Source IT → BT → VT FileDiff frame integration — 2026-10-23

## Pinned compiled implementation

In `frontend/webview/assets/sites-end-resource-fa77a923096d.js`, `BT` is an outer disclosure-content frame around `VT`, not another diff engine. It uses `border-default flex flex-col overflow-hidden rounded-lg border`, a muted top header with the basename and source path tooltip/open callback, `ts` added/removed line counts when provided, and a right-hand `Or` icon-only copy action for the unified diff. The body uses `bg-surface-tertiary`. `VT` retains `composer-diff-simple-line overflow-y-auto` and pending/regular `max-h-25/max-h-60` viewports; inner `FileDiff` has no duplicate file header.

## Restored current front-end

`CodexSourcePatchDiffPreview` now optionally renders a source-shaped frame using existing `PatchFileRow` count and open-line data. It preserves the one-file `@pierre/diffs/react FileDiff` parser and all existing fallback paths. The copy button writes the actual unified patch string to the web clipboard; it performs no file edit, command or privileged host action. When frame metadata is absent, the old preview contract still works.

The frame CSS uses the original utility-class semantics and theme token references with explicit fallback values, not CSS copied from the compiled proprietary bundle. The copy glyph is a neutral inline symbol because the original private icon asset/runtime has not been restored.

Chromium tests check a real expanded two-file-patch turn, framed basename and statistics, copy to actual clipboard, original 240px FileDiff scroll viewport, group scroll fade, and no console errors.

## Not yet parity

Real Codex clipboard service `er`, original `Or` icon, exact original theme resolver, hunk navigation/expansion and same-build screenshot comparison are outstanding. This remains a local browser UI demonstration without Electron or Agent tools.

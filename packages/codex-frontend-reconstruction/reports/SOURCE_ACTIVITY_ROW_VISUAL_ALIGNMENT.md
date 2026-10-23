# Source-aligned activity row metrics (2026-10-23)

## Evidence
From the pinned supplied `frontend.zip`:
- `sites-end-resource-fa77a923096d.js`, `nk`: `vertical-scroll-fade-mask -ms-2 flex max-h-56 flex-col overflow-x-hidden overflow-y-auto ps-2 [--edge-fade-distance:1.5rem]`; details contain no border-left.
- `app-shared-dc7535e633d7.css`: `max-h-56=56*--spacing`, `--spacing:4px`; `text-size-chat-sm=calc(var(--codex-chat-font-size) - 1px)`. Default `--codex-chat-font-size=var(--font-ui-size,13px)`; browser `rounded-lg` uses source radius token.
- `BT` diff frame: `border-default flex flex-col overflow-hidden rounded-lg border`; header has `bg-background-primary-ghost-hover/60 px-2.5 py-0.5 text-size-chat-sm text-codex-description/80`.

## Change
The original 224px React details scroller is now offset -8px and padded +8px on inline-start, uses a 1.5rem scroll edge distance, and removes the previously invented left rule. The existing scroll mask and nested FileDiff remain intact. The BT frame now uses the source chat-font and rounded-corner CSS tokens, plus an actual translucent ghost-hover header rather than opaque gray fallback. CSS variables retain fallback values for an isolated web test host.

Chromium checks measured margin, padding, missing border, fade distance, header font size, scrollability and FileDiff. This change does not add any service, MCP backend, privileged API or product feature. The original token resolver/large-scale icon and typography styling still require same-build inspection.

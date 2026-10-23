# Source thread-scroll-layout footer geometry — 2026-10-23

## Compiled source evidence
The uploaded `frontend.zip` contains `thread-scroll-layout-96ebbe17c836.js` and `thread-scroll-layout-24b9bd243051.css`.
In original `I` for default presentation:
- The thread footer is `pointer-events-none absolute inset-x-0 bottom-0 z-20` with interactive descendants, data attribute `data-thread-scroll-footer=true` and a `surface` backdrop.
- The active scroll host has `overflow-y-auto`, `[scroll-padding-bottom:var(--thread-scroll-padding-bottom,0px)]`, `[overflow-anchor:none]`, `role=region`, and a focusable localized label.
- The `Wt` Footer measurement callback obtains actual height via original size observer `o`, sets `--thread-scroll-padding-bottom` to `height+16px` in default mode (compact uses +0), and preserves the pinned-bottom position when the composer height changes.
- Scroll content includes a sticky clearance/fade tied to this variable; its exact proprietary surface/motion components and focus-mode variants are outside this batch.

## Integrated React browser-host subset
- Existing `demo-main` acts as the relative default thread layout host; the *existing* Composer zone becomes an absolute footer with interactive children, and the *same* `demo-scroll-region` extends to the bottom under it.
- A `ResizeObserver` measures the real footer and sets the original scroll padding variable on that actual scroll host. The existing scroll controller retains bottom-following behavior when the footer changes. This is not a new virtualizer or demo tool.
- The transcript column receives end padding based on the same measured height. Thus scroll-to-latest does not hide the final message behind Composer while the viewport itself fills the available thread surface.
- Chromium checks bottom alignment, measured footer+16px scroll variable, viewport full height, long-history latest-row clearance, and existing PageDown/scroll-to-key interactions.

## Still missing
Original private `surface` and `fade` renderer, exact default footer placement variants (home, compact, panel), advanced focus mode, full Composer ProseMirror plugins, Electron IPC, actual Agent data feed and same-build pixel-level acceptance. The existing preview gradient is explicitly demo CSS; no claim of identical original UI motion or native controls.

## Follow-up: original footer background part and sticky end fade

Pinned `app-initial-5851df3f6cb1.js` exports `i_i` as `ATn`, imported by `thread-scroll-layout-96ebbe17c836.js` as `ie`. `i_i({part:'surface'})` mounts `_background_106nk_2 _surface_106nk_2` with `bg-surface`; `i_i({part:'fade'})` mounts `_background_106nk_2 _fade_106nk_2` with a `from-surface` to-top gradient. In `app-initial-e7c27dd40beb.css`, the fade height is `calc(var(--spacing) * 8)` (32px), while surface background uses an 8-unit negative top with compensating margin.

The original default scroll root places a `pointer-events-none sticky bottom-0 z-10 mt-auto ...` end-clearance with `height:calc(var(--thread-scroll-padding-bottom) - var(--spacing)*4)` and fade part, separately from the footer's `surface` part. The outer transcriptContent has `pb-8`.

The recovered active demo thread now uses the **same existing** virtualizer and scroll controller but gives the transcript normal 32px end padding and a sticky end-clearance sibling, with a 32px fading surface at its lower edge. The absolute Composer Footer has a separate, non-interactive surface layer behind the existing form; the previous whole-footer fake gradient was removed. Chromium now checks actual CSS dimensions, overlay pointer behavior, and that dynamic footer height changes resize the sticky clearance, while preserving keyboard and scroll-to-latest tests.

This restores source-backed DOM roles and geometry, not the original private icon/theme/runtime or all compact/home/panel presentation variants. The hosted preview's effective `--color-surface` fallback is not a full Codex theme implementation.

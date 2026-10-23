# Thread virtualizer model reconstruction

## Compiled source evidence

Primary reference: `frontend/webview/assets/thread-virtualizer-e1964ca5c039.js`.
The surrounding orchestration was cross-checked in `virtualized-turn-list-d00a3b041bce.js`.

## Recovered behavior

- Builds top and bottom offsets from measured heights, estimates, minimum heights, row-specific gaps and pixel-scale rounding.
- Uses a 280px fallback estimate when a row has neither measured nor estimated height.
- Supports `collapseEmptyRows`, tracks gap-row keys and suppresses gaps around empty rows according to the compiled branch.
- Computes visible row ranges using distance-from-bottom coordinates and configurable overscan.
- Reanchors a rendered window by a stable row key while retaining its prior row count.
- Adjusts distance-from-bottom after layout changes to preserve an anchor row's viewport position.
- Calculates centered and edge-aligned turn navigation targets.
- Selects visible measured rows as layout-change anchors and captures measured heights/rendered-window metadata.

## Boundaries

This is a pure TypeScript semantic reconstruction, not original source recovery. The DOM observer lifecycle, actual virtualized React row mounting, host scroll controller and browser zoom helper remain outside this module. No pixel-level or Electron integration claim is made.

## Validation

Twelve focused tests cover geometry, rounding, empty-row collapse, visible-range selection, overscan, reanchoring, scroll preservation, navigation offsets, anchor selection and rendered-window capture.

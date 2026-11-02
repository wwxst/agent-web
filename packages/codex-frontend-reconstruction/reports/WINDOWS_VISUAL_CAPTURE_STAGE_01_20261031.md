# Windows full-window visual capture — Stage 01 (2026-10-31)

## Goal

Make the first Codex-versus-Electron visual comparison reproducible at the same physical window bounds and fail closed when capture metadata proves the pair is not comparable.

## Added implementation

- `scripts/capture-windows-window.ps1` enumerates visible top-level windows and requires exactly one match by process name and/or title regex. It does not silently choose the first candidate.
- The helper restores and resizes the selected window so its DWM extended visible frame is exactly **1352 × 760** physical pixels, centers it on the primary display, foregrounds it, and moves the pointer outside the capture rectangle where possible.
- It captures the DWM visible-frame rectangle directly with `System.Drawing.Graphics.CopyFromScreen`. It does not scale, crop, or substitute a renderer-only screenshot.
- A companion `.png.json` file records scenario ID, theme, capture boundary, DPI-awareness mode, window DPI/scale, visible and outer bounds, process/window identity, capture time and PNG SHA-256.
- `compare-ui-screenshots.mjs` accepts optional paired `--reference-meta` / `--actual-meta` arguments. When present, it verifies matching scenario, theme, capture boundary, window DPI/scale, DPI-awareness mode, visible screen position and PNG dimensions before launching the pixel comparison.
- Metadata mismatch exits with code **3**, writes a diagnostic `report.json`, and does not create overlay/difference/side-by-side images. Existing dimension mismatch behavior remains exit code **2**.
- The Windows CI job runs the capture helper's self-test, including PowerShell native API compilation, display metrics, EnumWindows callback, DWM bounds and System.Drawing availability.

## Usage

See `VISUAL_REGRESSION_WORKFLOW_20261030.md` for the exact PowerShell commands to capture the original Codex window and reconstructed Electron window separately, plus the metadata-aware compare command.

The helper expects the operator to open the same scenario in both applications, use the same theme and app zoom, close transient UI, and keep both windows on the same Windows display scale. It records window DPI; it cannot independently inspect the proprietary Codex renderer's app zoom or verify that two conversations contain identical content.

## Boundaries

- Keep private screenshots outside the public repository unless the owner explicitly authorizes a specific evidence pair. The A-shell-empty pair below was reviewed and authorized for unchanged publication; extracted proprietary assets remain excluded.
- No source bundle is copied into the reconstructed application.
- No Agent CIL backend or Electron host behavior is changed.
- This stage provides a deterministic capture and comparability gate. It does **not** claim pixel parity or automatically certify that the manually selected scenario is semantically identical.

## Verification plan

CI must pass:
1. Existing core and screenshot comparator tests.
2. New valid-metadata comparison test.
3. New metadata-mismatch fail-closed test.
4. Windows PowerShell capture-helper self-test.
5. Existing browser and Linux/Windows Electron regression suites.

## Real Windows capture follow-up

The first real [A-shell-empty evidence pair and six-region acceptance report](visual-acceptance/20261031-A-shell-empty/README.md) is now published with explicit owner consent. Both full windows are 1352×760, light, 96 DPI, at (284,160) on the same primary display. Metadata matches; capture/comparison succeeded, while visual fidelity remains unaccepted. Existing sidebar history and language differ and are documented rather than hidden.

Real capture exposed an `op_Subtraction` error that the native API self-test did not reach. The three cursor-coordinate expressions now parenthesize arithmetic before array construction. A Windows PowerShell 5.1 regression executes the actual production assignment for three display sizes without touching desktop content; it failed before the fix and passes afterward. `visual:test` also verifies published image hashes, dimensions, metadata and inventory. Windows CI runs both new regression tests.

The local Chromium mismatch was an installed Playwright/browser-cache environment issue. The report records the existing Chromium used to recompute the original images and the standard matching-browser installation command. No Electron host or image-capture behavior was changed.

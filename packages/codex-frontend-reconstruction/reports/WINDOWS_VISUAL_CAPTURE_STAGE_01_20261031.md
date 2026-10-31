# Windows full-window visual capture — Stage 01 (2026-10-31)

## Goal

Make the first Codex-versus-Electron visual comparison reproducible at the same physical window bounds and fail closed when capture metadata proves the pair is not comparable.

## Added implementation

- `scripts/capture-windows-window.ps1` enumerates visible top-level windows and requires exactly one match by process name and/or title regex. It does not silently choose the first candidate.
- The helper restores and resizes the selected window so its DWM extended visible frame is exactly **1352 × 760** physical pixels, centers it on the primary display, foregrounds it, and moves the pointer outside the capture rectangle where possible.
- It captures the DWM visible-frame rectangle directly with `System.Drawing.Graphics.CopyFromScreen`. It does not scale, crop, or substitute a renderer-only screenshot.
- A companion `.png.json` file records scenario ID, theme, capture boundary, window DPI/scale, visible and outer bounds, process/window identity, capture time and PNG SHA-256.
- `compare-ui-screenshots.mjs` accepts optional paired `--reference-meta` / `--actual-meta` arguments. When present, it verifies matching scenario, theme, capture boundary, window DPI/scale, visible screen position and PNG dimensions before launching the pixel comparison.
- Metadata mismatch exits with code **3**, writes a diagnostic `report.json`, and does not create overlay/difference/side-by-side images. Existing dimension mismatch behavior remains exit code **2**.
- The Windows CI job runs the capture helper's self-test, including PowerShell native API compilation, display metrics, EnumWindows callback, DWM bounds and System.Drawing availability.

## Usage

See `VISUAL_REGRESSION_WORKFLOW_20261030.md` for the exact PowerShell commands to capture the original Codex window and reconstructed Electron window separately, plus the metadata-aware compare command.

The helper expects the operator to open the same scenario in both applications, use the same theme and app zoom, close transient UI, and keep both windows on the same Windows display scale. It records window DPI; it cannot independently inspect the proprietary Codex renderer's app zoom or verify that two conversations contain identical content.

## Boundaries

- Original Codex screenshots and extracted proprietary assets remain outside the public repository.
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

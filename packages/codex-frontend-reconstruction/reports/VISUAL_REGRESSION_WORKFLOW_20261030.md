# Codex screenshot comparison workflow — 2026-10-30

## Purpose

Establish a repeatable, source-led visual correction loop between the user-provided Windows Codex desktop build and the independent React/Electron reconstruction.

This workflow borrows PI-Desktop's AI-assisted task decomposition and review discipline only. It does not import PI-Desktop UI, runtime, product behavior, or backend architecture. The user's compiled Codex frontend bundle remains the primary implementation evidence.

## First uploaded comparison pair

The two screenshots from the 2026-10-30 review were preserved in the conversation's file context and inspected locally. They are intentionally **not copied into this public repository**.

| Capture | Dimensions | SHA-256 | Observation |
|---|---:|---|---|
| Original Codex Windows | 1211 × 759 | `74c1384f14d566ee918a3cdee5caed5de5cb16722f92b6c3172f526f428af1a8` | Native Windows titlebar, full Codex sidebar, in-progress repository task, real model/permission/voice controls |
| Reconstructed frontend | 1352 × 760 | `7c58d24e4a9386c0884d604cc37f4ee550287b96f2d1d6677eca05d9ad75865f` | Browser/demo-style shell, different conversation fixture, simulated activity and mock Composer controls |

These captures are useful as a **qualitative structural review**, not a valid pixel-diff pair. Their dimensions, content, execution state, and window chrome differ. Do not resize/crop either capture to manufacture a passing comparison.

## Local comparison tool

The package provides:

```sh
cd packages/codex-frontend-reconstruction
npx playwright install chromium
npm run visual:compare -- --reference <original-codex.png> --actual <reconstructed-electron.png> --out-dir <output-directory>
```

The comparator:
- Reads PNG dimensions and SHA-256 before comparison.
- Refuses to rescale or crop images.
- Emits `report.json` and exits with code 2 if dimensions differ.
- For same-size images, uses a local Playwright Chromium canvas to produce `overlay.png`, `difference.png`, and `side-by-side.png`, plus per-pixel metrics.
- Marks pixels whose maximum RGB-channel delta exceeds the configurable threshold (default 24).
- Does not claim that one aggregate pixel percentage is a substitute for human visual acceptance.

The reference and actual paths can be absolute Windows paths. Keep private/original Codex screenshots outside the public repository; only commit non-proprietary test code and written evidence.

For a deterministic empty-shell capture in the **actual Electron app**, use PowerShell from the package directory:

```powershell
$env:AGENT_WEB_VISUAL_SCENARIO = "shell-empty"
npm run desktop:dev
```

This opens the normal Electron host against the same React shell and mounted Composer, but starts with an empty transcript. The hidden fixture route is not added to the sidebar and does not read or overwrite saved pinned-tab data. Close the app and clear the environment variable when returning to the normal demo:

```powershell
Remove-Item Env:AGENT_WEB_VISUAL_SCENARIO -ErrorAction SilentlyContinue
```

The browser E2E suite also checks this route and captures `shell-empty-visual-baseline.png` as a CI artifact.

## Windows full-window capture helper

The package now includes `scripts/capture-windows-window.ps1`. It runs with the built-in Windows PowerShell 5.1 (`powershell.exe`); PowerShell 7 is not required. Run it on the **same Windows machine and display** as the original Codex app and the reconstructed Electron app.

First identify the visible process names/titles:

```powershell
Get-Process |
  Where-Object { $_.MainWindowHandle -ne 0 } |
  Select-Object ProcessName, Id, MainWindowTitle
```

Capture the original Codex app and reconstructed app separately. Replace the process names with the exact values returned on your machine; add `-WindowTitleRegex` if a process owns more than one visible window.

```powershell
npm run visual:capture:windows -- -ProcessName Codex -ScenarioId A-shell-empty -Theme light -OutputPath "$PWD/visual-captures/original-shell-empty.png"

# Start the reconstructed app in a separate terminal with:
$env:AGENT_WEB_VISUAL_SCENARIO = "shell-empty"
npm run desktop:dev

# After the Electron window is visible, capture it from another terminal:
npm run visual:capture:windows -- -ProcessName electron -ScenarioId A-shell-empty -Theme light -OutputPath "$PWD/visual-captures/reconstructed-shell-empty.png"
```

If the reconstructed process is not named `electron`, use the exact `ProcessName` shown by `Get-Process`. If more than one window matches, narrow it with `-WindowTitleRegex`; the helper deliberately refuses to guess.

The helper:
- Restores the selected window, then sets its **visible DWM frame** to exactly 1352 × 760 physical pixels and centers that frame on the primary display.
- Captures `DWMWA_EXTENDED_FRAME_BOUNDS` using a direct screen copy. It does not crop, resize, or substitute a renderer-only screenshot.
- Moves the pointer outside the window where possible and waits for the requested settle interval.
- Writes a companion `.png.json` file with scenario ID, theme, capture boundary, DPI-awareness mode, visible/outer bounds, window DPI/scale factor, process identity and PNG SHA-256.
- Fails if the selected window is ambiguous, the requested visible bounds cannot be achieved, the window is not foreground, or the DWM capture boundary is unavailable.

For a valid pair, keep both apps on the same display scale, use the same light/dark theme and app zoom, open the same new-chat state, close transient popovers/toasts, and ensure fonts/layout have settled. The metadata records window DPI; app zoom and conversation-content equivalence still require the operator to set and review the same state in both apps.

Compare the pair with metadata validation enabled:

```powershell
npm run visual:compare -- --reference .\visual-captures\original-shell-empty.png --actual .\visual-captures\reconstructed-shell-empty.png --reference-meta .\visual-captures\original-shell-empty.png.json --actual-meta .\visual-captures\reconstructed-shell-empty.png.json --out-dir .\visual-comparison\A-shell-empty
```

When both metadata files are supplied, the comparator fails closed with exit code **3** if scenario ID, theme, capture boundary, window DPI/scale, DPI-awareness mode, visible screen position, or PNG dimensions differ. It creates a diagnostic `report.json` but no overlay/heatmap. Dimension-only mismatches without metadata retain exit code **2**. Metadata is optional for generic image comparisons, but mandatory for Codex visual acceptance.

The Windows CI job compiles the native capture API and checks primary-display metrics with `npm run visual:capture:windows -- -SelfTest`; CI does not capture or upload private original Codex screenshots.

## Capture protocol — mandatory before accepting a pixel diff

Both captures must share all of the following:

1. Same Codex build and same light/dark theme.
2. Same outer window bounds and actual content viewport dimensions.
3. Same Windows display scale, app zoom, and device-pixel ratio.
4. Same capture boundary: compare full-window captures with full-window captures, or WebContents content-area captures with content-area captures. Never compare an original full-window screenshot to a renderer-only screenshot.
5. Same sidebar expanded/collapsed state, selected conversation, scroll position, and open popovers.
6. Same conversation content, Markdown/code blocks, tool status, and approval state.
7. Same font availability and loaded state; wait for fonts and layout to settle before capture.
8. No transient notifications, cursor hover, loading shimmer phase, toast, or unrelated OS overlays unless that state is the explicit test target.

Capture the **actual Electron app**, not only the Vite browser preview. Record the capture environment and scenario ID alongside each image.

## Fixed acceptance scenarios

| ID | Scenario | Required visible state |
|---|---|---|
| A — shell-empty | New/empty conversation | Native window chrome, navigation rail, sidebar, titlebar, empty transcript, complete idle Composer |
| B — transcript | Markdown and code | Same user/assistant messages, headings, lists, quote, table, fenced code, copy/wrap controls |
| C — tool-running | Active Agent work | Commentary, running command, expanded/collapsed tool activity, streaming/final response |
| D — approval | Pending approval | Same approval card, risk explanation, scope selector, primary/secondary actions and keyboard-open menu |

For the first pass, prioritize A and the shell geometry. Do not wait for Agent runtime integration to compare static, source-backed transcript fixtures.

## Correction loop

For each scenario:

1. Confirm original compiled-source evidence and the original screenshot state.
2. Capture the original Codex reference and reconstructed Electron app with matching environment metadata.
3. Generate overlay, difference heatmap, and report.
4. Classify each mismatch as window chrome, navigation, layout geometry, typography, spacing, color/surface, component state, or content.
5. Fix the owning React component/token/host boundary; avoid screenshot-only CSS patches.
6. Re-run the same screenshot and all relevant browser/Electron regressions.
7. Review the new side-by-side result; record accepted and deferred differences.

A screenshot test is not passed merely because it generated a PNG. Pixel parity is not claimed until same-state comparisons have been reviewed.

## New phase priorities

1. **Visual fidelity loop:** deterministic capture, same-state baselines, overlays/diffs, and a reviewed mismatch backlog.
2. **Core conversation workflow:** integrate the existing timeline and mounted ProseMirror Composer; complete source-backed input, attachment, model/permission controls, send/stop/queue, tool activity, and approval transitions.
3. **Real runtime chain:** typed React ↔ Preload ↔ Electron Main host events and lifecycle; only then connect the existing Agent backend.

Cross-window pinned-tab owner/reveal and durable preload remain documented work, but are moved behind these higher-impact product-wide goals. Existing read-only file preview, Find, and pin behavior must remain regression-green.

## Current limitations

- The first screenshot pair cannot be pixel-compared due to the dimension and scenario mismatch documented above.
- The PNG comparator and Windows full-window capture helper are implemented, but no same-state original-versus-reconstructed capture pair has yet been reviewed and accepted.
- The current UI still contains an explicitly demo-only shell, synthetic transcript events, and mock Composer controls. This report does not claim they are complete.
- The original Codex app must be captured again at the chosen canonical dimensions for each fixed scenario. A later same-size capture is still invalid if the scenario/content differs.


## CI verification — final branch head 2026-10-30

GitHub Actions run [40992465671](https://github.com/wwxst/agent-web/actions/runs/40992465671) passed on branch code head `d32002d3d8f19b0950c22cdd067ae80bedc5f910`:

- Core reconstruction tests: 542 passed, 0 failed.
- Demo model integration tests: 5 passed, 0 failed.
- Screenshot comparator Chromium integration: 1 passed, 0 failed; generated overlay, difference heatmap, side-by-side PNG and metrics from two known 2×2 images.
- Chromium browser suite: 78 passed, 0 failed, including the deterministic empty-shell route test.
- Linux Electron desktop smoke: 82 passed, 0 failed.
- Windows Electron desktop smoke: 81 passed, 1 skipped, 0 failed.
- React TypeScript/Vite build and Electron renderer build passed.

This verifies the comparator's image-processing path, the empty-shell fixture and existing regression gates. It does **not** constitute an original-Codex screenshot comparison; the first uploaded screenshot pair still fails the deliberate same-size/same-state/capture-boundary requirements above.

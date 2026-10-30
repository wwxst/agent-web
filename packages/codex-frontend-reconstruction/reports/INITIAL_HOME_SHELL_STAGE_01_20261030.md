# Codex initial new-chat home — stage 01 (2026-10-30)

## Source evidence

The supplied Windows build resources for Codex 26.1013.40934 were inspected directly.

- `app-primary-71492d0e9e92.js` resolves the Codex home Composer placeholder through `homePage.composer.placeholder.askAnything.v2`, whose source default is **Do anything**. Existing conversation threads use the distinct **Work with Codex** placeholder.
- `app-shared-dc7535e633d7.css` defines `home-composer-anchor` with a 42svh anchor, adjusted for window zoom and the main-content toolbar offset.
- The same source stylesheet defines `--home-composer-inline-inset` as 3.25 spacing units.
- `app-primary-71492d0e9e92.css` gives the home Hero its minimum block size from `--home-composer-top`.

## Implemented in this stage

- The sidebar **New chat** action now opens the blank home surface rather than resetting the current demo conversation.
- The left **Home** rail keeps its existing host/demo destination; it is deliberately not conflated with New chat.
- The blank home does not display the synthetic `agent web` project, demo recent threads, project-folder breadcrumb, demo-tools button, or synthetic subagent action.
- The home Composer has an explicit `data-composer-placement="home"`, source-derived 42svh positioning, source-derived inline inset, and the source home placeholder/accessibility label.
- Existing conversation threads retain their thread placement and `Work with Codex` placeholder.

## Verification

- Playwright visual-shell test checks the home placement, geometry at 1352×760, empty transcript/sidebar fixture, and the home/new-chat navigation path.
- Navigation-rail regression checks that the existing Home destination remains unchanged while New chat opens the blank home.
- The real Electron smoke now captures `electron-home-new-chat.png` after navigating the actual file renderer to the empty-home scenario. It checks the same placement and geometry in a native BrowserWindow.
- CI results are tracked by PR #86. Visual acceptance still requires comparing the new Electron screenshot with the matching original Codex screenshot at the same window size, theme, DPI and crop.

## Remaining scope

This stage is only the initial new-chat shell/home Composer. It does not claim completion of the ordinary conversation timeline, tool activity, approvals, full Composer feature parity, or agent-cil integration. No backend changes were made.

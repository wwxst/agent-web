# Codex initial new-chat home — stage 01 (2026-10-30)

## Source evidence

The supplied Windows build resources for Codex 26.1013.40934 were inspected directly.

- `app-primary-fe8a450b3b04.js` resolves the Codex home Composer placeholder through `homePage.composer.placeholder.askAnything.v2`, whose source default is **Do anything**. Existing conversation threads use the distinct **Work with Codex** placeholder.
- `app-shared-dc7535e633d7.css` defines `home-composer-anchor` with a 42svh anchor, adjusted for window zoom and the main-content toolbar offset.
- The same source stylesheet defines `--home-composer-inline-inset` as 3.25 spacing units.
- `app-primary-71492d0e9e92.css` gives the home Hero its minimum block size from `--home-composer-top`.
- `app-initial-5851df3f6cb1.js` supplies the original sidebar labels and empty states: **Projects** / **No projects**, and **Recents** / **No chats**.
- `app-primary-fe8a450b3b04.js` DBt renders **What should we build?** when no project is selected, under a 56px Codex hero icon at 30% opacity with a 24px gap. The home layout bottom-aligns the hero above the Composer with 5.5 spacing units of desktop padding.

## Implemented in this stage

- The sidebar **New chat** action now opens the blank home surface rather than resetting the current demo conversation.
- The left **Home** rail keeps its existing host/demo destination; it is deliberately not conflated with New chat.
- The blank home does not display the synthetic `agent web` project, demo recent threads, project-folder breadcrumb, demo-tools button, or synthetic subagent action. It now retains the source sidebar sections with the correct empty states, **No projects** and **No chats**.
- The home Composer has an explicit `data-composer-placement="home"`, source-derived 42svh positioning, source-derived inline inset, and the source home placeholder/accessibility label.
- Existing conversation threads retain their thread placement and `Work with Codex` placeholder. The home send action now fails closed without an Agent host: typed drafts remain editable, and Enter/send cannot append a fake user or Agent response.
- The original no-project hero heading and source-shaped Codex icon now render in the actual empty home; ordinary demo threads do not render this hero.

## Verification

- Playwright visual-shell test checks the home placement, geometry at 1352×760, source-backed hero and heading/Composer gap, empty transcript, source-backed sidebar empty states, and the home/new-chat navigation path. A focused regression asserts that the unconnected home preserves typed drafts instead of sending simulated responses.
- Navigation-rail regression checks that the existing Home destination remains unchanged while New chat opens the blank home.
- The real Electron smoke now captures `electron-home-new-chat.png` after navigating the actual file renderer to the empty-home scenario. It checks the same placement, geometry and sidebar empty states in a native BrowserWindow.
- CI results are tracked by PR #86. Visual acceptance still requires comparing the new Electron screenshot with the matching original Codex screenshot at the same window size, theme, DPI and crop.

## Remaining scope

This stage is only the initial new-chat shell/home Composer. It does not claim completion of the ordinary conversation timeline, tool activity, approvals, full Composer feature parity, or agent-cil integration. No backend changes were made.

## Normal launch versus fixture-only preview (2026-10-30)

- **Normal** standalone browser dev server and Electron file/desktop dev launch now
  start on `visual-empty` with the source-backed Hero and idle Composer.
- Browser E2E uses a Playwright-only `VITE_AGENT_WEB_DEMO_FIXTURES=1` Vite dev
  environment so the existing test suite still exercises the canonical demo
  timeline, tools, approval and preview fixtures. Normal production builds
  cannot inherit that dev-only default.
- Native Electron smoke uses `desktop/enableSmokeFixture.mjs` to opt into the
  `demoScenario=frontend` query on the initial file URL. The application does
  **not** enable fixtures unless the test runner explicitly sets
  `AGENT_WEB_DESKTOP_FIXTURE=frontend` (or `review`).
- Added a separate *normal packaged launch* Electron smoke that removes that
  opt-in and confirms the initial screen, host status, Home navigation, no mock
  history and disabled send. It also captures `electron-default-new-chat.png`.
- The original `?visualScenario=shell-empty` remains available for strict
  saved-pin-isolated screenshot baselines and takes precedence over any
  fixture flag. No agent-cil changes were made.


## Composer attachment context entry (2026-10-30)

The source `app-primary-fe8a450b3b04.js` composer context acquisition
uses the `composer.addPhotos` and `composer.contextAction.filesAndFolders`
labels and routes its picker actions to the host. The independent frontend
previously opened a file input immediately when clicking `+`, so no context
actions were visible.

The existing `+` button now opens an accessible menu exposing source-aligned
**Add photos**, **Add files**, and **Add folder** actions. Separate native
file/photo/directory inputs are used because this standalone host has no
combined picker IPC. File and folder selections feed the already-existing
local attachment staging and removal tray; no fabricated upload ids, Agent
actions, or backend modifications are involved. Directory selections stage
the selected files only: project context and folder hierarchy persistence
are NOT claimed. Disabled Agent send remains fail-closed on the new home.

The menu handles Escape, outside pointer dismissal, focus restoration and
conversation switches. Browser E2E verifies menu semantics, file/photo
staging and lack of submission. Native Windows Electron smoke captures
`electron-home-attachment-actions.png` and exercises menu dismissal.

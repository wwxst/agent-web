# Codex sidebar section recovery — 2026-10-31

## Source evidence

The reference is the user-supplied Windows Codex `frontend.zip`, specifically:

- `frontend/webview/assets/app-initial-5851df3f6cb1.js`
  - `l4`: section wrapper, source `data-app-action-sidebar-section` metadata, collapsible header and section actions.
  - `_Hc`: disclosure button, `aria-expanded`, `data-app-action-sidebar-section-toggle`, hover/focus-only chevron, 36px browser row.
  - `_V`: title row with `min-h-[var(--height-token-row)]`, 14px Electron `text-base`, title actions hidden until hover/focus, and 4px content top padding.
  - `Gdl`: Projects title action uses `data-app-action-sidebar-project-create`; its source default label is “Add new project”.
  - `kfl`: the sidebar section order and labels include Pinned, Projects and Recents; the project empty state is “No projects”, and the Codex task-list empty state is “No chats”.
  - `epl`: recent/project-list empty states use `px-[var(--padding-row-cell-x,var(--padding-row-x))] py-2 text-base text-codex-description opacity-50`.
  - `vwc`: the search action label is “Search” and dispatches `chat-search-command-menu`. The independent host does not currently implement that command.
- `frontend/webview/assets/app-initial-e7c27dd40beb.css`
  - `_ConversationSidebar_1uxfp_2` sets `--height-token-nav-row: 36px`.
  - `_Navigation_1uxfp_2` is a min-height-zero column flex container.
- `frontend/webview/assets/app-shared-dc7535e633d7.css`
  - Electron sidebar navigation defaults to 30px rows, while the Codex ConversationSidebar overrides its navigation row to 36px.
  - Sidebar row horizontal padding defaults to 8px.

These are source contracts, not a claim that private original React components or their account-backed services have been copied.

## Implementation

- Added reusable source-shaped section disclosure rows for Pinned, Projects and Recents.
- Added the original sidebar section data attributes:
  - `data-app-action-sidebar-section`
  - `data-app-action-sidebar-section-heading`
  - `data-app-action-sidebar-section-collapsed`
  - `data-app-action-sidebar-section-toggle`
  - `data-app-action-sidebar-scroll`
  - `data-app-action-sidebar-project-create`
- Added 36px section/action rows, 14px empty-state text, source 8px empty-state padding, 4px section-content spacing, and hover/focus-only disclosure and project actions.
- Changed the disabled search control's accessible name/tooltip to the source label “Search”. It remains disabled because the source host command is not implemented; no fake search UI or route was added.
- Kept the Projects action connected only to the existing trusted Electron read-only directory picker. It is not presented as a real Agent project creation API.
- Moved the explicit demo conversation rows into the Recents section; the Projects section shows its project row separately. The default non-fixture Electron launch remains projectless and history-free.
- Updated browser and native Electron tests for disclosure state, source data attributes, empty-state geometry, search fail-closed behavior, and the existing native folder-picker path.

## Boundaries

- Collapse state is local UI state for this reconstruction and is not persisted through Codex's original preference/store service.
- Global Search remains unavailable until a real host command and search route are implemented.
- Project creation, project ordering, thread drag/drop, project sorting, section reordering, unread states, account menus and the original source icons remain incomplete.
- Pinned rows in this demo still represent local preview/content tabs, not Codex's full pinned-thread registry.
- No Agent CIL or Electron main-process/backend changes were made.

## Verification

Pending GitHub Actions for this stacked sidebar PR. The required gates are the existing core/model checks, React/TypeScript build, Chromium Playwright suite, and native Electron smoke on Windows. The native smoke must exercise section collapse and the real read-only folder picker before this stage is called verified.

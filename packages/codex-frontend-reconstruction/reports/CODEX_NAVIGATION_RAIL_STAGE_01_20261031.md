# CODEX_NAVIGATION_RAIL_STAGE_01_20261031

## Scope

Restore the visible Windows Codex navigation-rail order, grouping, vertical cadence and footer silhouette from the same-theme A-shell-empty reference. This is a visual and accessibility pass only; unavailable destinations remain disabled.

## Source evidence

- User-supplied `frontend.zip`, `app-initial-5851df3f6cb1.js`:
  - `dWc`: navigation landmark, fixed/primary destination stack, Explore/More trigger, separator, pinned destinations and footer.
  - `Fvc`, `xvc`, `Rhi`: destination identity and primary/more/pinned projection.
  - `MUc`, `TUc`: destination item and Explore menu trigger contracts.
  - `pL`: destination IDs including images, automations, library, skills/plugins, pull requests and Sites.
- `zh-CN-7ba80cbb133d.js`: source labels 首页, 图像, 定时任务, 资料库, 插件, 探索, 代码审查 and 站点.
- PR #89 [A-shell-empty visual acceptance report](https://github.com/wwxst/agent-web/blob/46fba0ea2978f9e4f60fbab2817a5b1cd1ec4d4d/packages/codex-frontend-reconstruction/reports/visual-acceptance/20261031-A-shell-empty/VISUAL_ACCEPTANCE_A_SHELL_EMPTY.md):
  - original rail width approximately 52px;
  - original visible icon centers approximately y=70, 114, 158, 202, 246, 290, 344 and 388;
  - original destination cadence approximately 44px, with an Explore divider before the account-pinned destinations;
  - original footer contains an account avatar, not the Settings button shown in the earlier reconstruction.

## Implementation

- Split the rail API into primary destinations, Explore/More, account-pinned secondary destinations and footer.
- Restore the visible source order: Home, Images, Scheduled, Library, Plugins, Explore/More, Code review, Sites, account avatar.
- Restore the 44px item cadence, 24px separator and footer alignment against the 1352×760 Windows reference.
- Restore a filled Home icon and source-positioned image/plugin/library/clock/branch/grid affordances.
- Localize accessible names to the supplied Chinese source bundle.
- Keep Home connected to the existing real new-chat route. Images, Scheduled, Library, Plugins, Explore, Code review and Sites remain disabled with explicit not-connected tooltips and visual-reference markers.
- Use a generic account silhouette in the source avatar position; do not copy the real user's initials, profile image or account data.
- Add Playwright coverage for destination order, disabled host boundaries, 44px cadence, separator position and footer geometry.

## Boundaries

- This branch is stacked on PR #91 and does not modify `main`, Agent CIL or Electron main/preload APIs.
- The rail is not yet backed by Codex account preferences, destination discovery, pin/reorder state, unread state, or the real account menu.
- The More/Explore popover and secondary destination routing are intentionally unavailable rather than simulated.
- The visual icon paths are local approximations; they are not claimed to be byte-identical copies of proprietary icon assets.
- This report does not claim full-window pixel acceptance. The next real Windows capture should use PR #89's DWM capture workflow after this branch is reviewed.

# Next-step semantic recovery: turn item render groups

## What was added

`src/conversation/TurnItemRenderGroups.ts` is an independent typed reconstruction of the grouping behavior in the compiled asset:

`frontend/webview/assets/split-items-into-render-groups-9b11d88dce52.js`

It models the observed output groups for user items, agent timeline items, final assistant messages, approvals, MCP elicitations, generated-image outputs, automation updates, subagent activity, model/plan events, and terminal system errors.

## Important accuracy boundary

The original bundle imports private helper functions from other chunks. Their behavior is not fabricated; dependencies that could not be independently verified are supplied through `Dependencies`. The module is a semantic reconstruction, not recovered original TypeScript and not a drop-in replacement for the compiled Codex module.

## Validation

The unit tests cover:
- initial user-message routing and final-answer extraction
- pending patch/exec approval routing
- automatic-approval review attachment
- generated image output routing
- contiguous subagent activity grouping
- terminal system-error extraction
- latest-turn commentary filtering

Tests do not yet establish pixel parity or complete parity for every private helper. Those require running the original frontend in its Electron host.

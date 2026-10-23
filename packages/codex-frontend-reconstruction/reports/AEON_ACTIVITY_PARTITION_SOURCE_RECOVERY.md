# 2026-10-23 — Source Smn/hn Aeon activity partitions in existing transcript

## Original source evidence

This batch used the user-supplied private `frontend.zip`, not screenshots or invented task semantics:

- `app-initial-5851df3f6cb1.js` SHA-256: `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`.
- Function `Smn({hostId,isAeonThread,items})` is exported as `ayr` and imported by `local-conversation-turn-69783815d57d.js` under local alias `hn`.
- `local-conversation-turn-69783815d57d.js` SHA-256: `e40ee63884bc75af917583fe70afade4b6c683adbd93d9536b7636eb6d8f54d4`. The `agent-activity` render branch calls `hn` first, renders each `task` result using a separate host renderer, and sends each remaining `activity` slice through `Wa` and the existing `ga` activity list.
- `Smn` yields no parts for empty input. Non-Aeon threads yield exactly one activity part without evaluating task results. Aeon threads check only `mcp-tool-call` items through private `_mn(item,hostId)`; non-null results become *separate* task parts. Neighboring ordinary activity items are accumulated into contiguous parts. Adjacent task parts never coalesce.
- `_mn` is not a generic MCP success check. Its source validates completed state, app/connector/plugin/tool capabilities, superseded-widget flag, source-specific result errors, and parsed automation/attached-thread payloads. The reconstruction MUST rely on explicit host resolution, not guess from result fields.

## Implemented and connected

- `src/conversation/SourceAeonActivityPartitions.ts` implements `Smn` and preserves `_mn` as the host `resolveMcpTask(item,hostId)` function. It neither schedules automation tasks nor calls external tools.
- `ConversationMessageRenderPlan` forwards `isAeonThread` and `hostId` to the existing `partitionActivities` callback. The original indexed node keys and no-follow task-result placement are reused; `ConversationMessageBlocks` already mounts the corresponding separate `ActivityResult` and `ActivityGroup` React renderers.
- The existing demo adapter delegates `partitionActivities` to this model and only accepts an explicit synthetic `demoAeonTaskResult` property to illustrate the host boundary. Standard demo sessions continue as non-Aeon threads. This does not claim a real Aeon host data source is connected.
- Four unit/integration tests cover non-Aeon bypass, adjacent task splits, ordinary MCP retention, and `rs` node-key preservation.
- `scripts/audit-aeon-partition-evidence.mjs` checks both exact source hashes and the `Smn/hn` call-site signatures.

## Limits and next checkpoint

The private `_mn` parser and `cs` task renderer, real Aeon session subscription, UI for automation/attached threads, Electron IPC, and Agent event integration are not restored. The test fixtures do not create tasks, send messages or modify user data. The finished browser preview remains synthetic, and visual parity against the exact original build has not been verified.

Next verify the real `Wa/Ke` pre-group filter (`fr` special exec suppression), `ur` classifier options and `qe` latest-turn group visibility with original evidence. Reuse the existing `AgentActivityUnitGrouping` and `ConversationMessageRenderPlan`; do not implement another parallel transcript.

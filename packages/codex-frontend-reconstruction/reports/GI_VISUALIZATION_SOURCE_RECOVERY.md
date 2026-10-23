# Source-confirmed Gi / Jt / Kt / qt runtime checkpoint (2026-10-23)

## Original assets, not screenshot inference

Compared these exact user-supplied private compiled bundles directly; no bundle or source map is committed:

| Bundle | SHA-256 |
| --- | --- |
| `skill-exploration-labels-dbc7ec897dab.js` | `26c09e991cbfa31950d34e9106bb7f76c4efd6220cb30a606f6c81e7e26399c4` |
| `agent-activity-item-1be092f0c744.js` | `e64adbffa15ebaa08ffd854743e1409325303481313656bf6749407b4c53d1ca` |
| `local-conversation-turn-69783815d57d.js` | `e40ee63884bc75af917583fe70afade4b6c683adbd93d9536b7636eb6d8f54d4` |
| `app-initial-5851df3f6cb1.js` | `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10` |

The new `scripts/audit-visualization-and-gi-evidence.mjs` checks 19 source fingerprints plus these four complete hashes. The audit was cross-checked against the extracted original archive.

## Corrected Ke/fr source semantics

`agent-activity-item` imports `Jt`, `Kt`, `qt`, `Zt` from `skill-exploration-labels`. Previously they were treated as private host-only predicates, and the `qt` call was over-described as a generic loaded-tool read.

Actual original behavior:
- `Jt` is the visualization-eligible **execution status** check: null, `inProgress` and `completed` are allowed; `failed`, `declined` and `interrupted` are not. This is not simply a "successfully completed" test.
- `Kt` recognizes `visualizations` as an actual slash/backslash-bounded directory and validates modifying commands (apply_patch/mkdir/tee/touch/cp/mv/install/output redirects). Patch Add/Update/Delete signatures distinguish create, update and no visualization. Plain `touch visualizations/...` without a directory boundary is intentionally **not** accepted by the original regex; `touch .codex/visualizations/...` is.
- `qt(Zt({summary,cwd}))` first parses skill-definition metadata, then allows only skill ID `visualize`, or plugin ID `visualize` with skill ID `live`/`persisted`. An ordinary `.codex/skills/other/SKILL.md` must remain visible even if meaningful as a general Skill read.
- `fr` hides an eligible visualization command only if the **next** source item is a patch with nonempty visualizationActivities; its second branch hides only the precise visualization skill definition read.

These now run in `SourceVisualizationActivityPredicates`, `SourcePreGroupExecFilter` and the existing source-history skill-path helper. Explicit host callbacks remain available for source host-specific metadata, but the known classification rules no longer require synthetic decisions.

## Gi exact expression and attached view

`local-conversation-turn` original:
- `K` is resolved turn-in-progress, optionally overriding raw turn status through history entity updates.
- `ri=!Ze&&Ht(Y)`; `ii=ar&&ri&&Y.phase==='commentary'`; `ai=ri&&!ii`. Terminal/summary rows and subagent-only commentary differ from a real assistant response.
- `U=isMostRecentTurn`, `rn=upNextStatusItem`, `we=interruptedByThisClient`; `Bi=U&&rn!=null&&!we`.
- `Ui=G(Qr, Bi ? {hostId,threadId} : null)` is a host query; `Wi=Bi&&!Ui`.
- `Gi=K&&!ai&&!Wi`, then `Ga(Wa(items),Gi)`, before `ek` combines traces.

`SourceLatestActivityRetentionGate` now implements exactly these boolean conditions with **explicit** input state. `ConversationMessageRenderPlan` projects it into the existing ActivityGroup node; `ConversationMessageBlocks` carries the value to the mounted React `ConnectedConversationMessageRenderers`. The existing host's `allowLatestCompletedGroup` callback remains as a compatibility fallback when no definitive source state was provided.

Real host K history status, Ui query subscription and private model-specific presentation remain to be wired: passing boolean fixture values is not equivalent to a live host connection. The demo verifies the source-visible group and command/Skill distinctions through the existing browser conversation. No commands, app scheduling, Electron IPC or Agent backend changes are performed.

## Tests and remaining work

Targeted Node tests verify status enum, command regex, specific skill definitions, ordinary Skill retention, explicit host veto, and the exact Gi assistant/subagent/up-next truth table plus RS React node forwarding. Browser e2e validates actual mounted latest group, patch leaf and visible ordinary Skill read.

Still missing: real Ui/Qr result feed, real historical entity turn-state K, complete private `_mn` task-card rendering, Codex proprietary icons/animations, independent Electron start and same-build screenshot parity. **CI run must be read for current head before claiming passed tests.**

Reproduce against private original assets (local only):

```sh
node scripts/audit-visualization-and-gi-evidence.mjs /path/to/frontend/webview/assets
```

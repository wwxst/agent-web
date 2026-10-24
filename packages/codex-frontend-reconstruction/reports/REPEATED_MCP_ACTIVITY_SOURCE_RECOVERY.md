# 2026-10-23 — original Je/bg repeated MCP and external event grouping

## Original source evidence
- `inline-followup-markdown-4751fe20f26d.js`, function `Je` exported as `s`, imported by sites-end-resource under `bg`.
- `Je` groups only adjacent `grouping===groupable` completed MCP calls where `source==null`, `server!==computer-use`, result is success, no automatic approval reviews, and the private `ie` unsupported Codex Apps result check is false.
- MCP identity includes invocation server/tool, functionName, pluginId, connectorId/linkId, invocationResourceUri, and the host callback result `bm` (tool display + arguments/results). Consecutive external-event records use subscriptionEnded, sourceKey, sourceLabel independently.
- `sites-end-resource-fa77a923096d.js` `nk` first filters rows, then calls `bg(H, callback)`. The resulting repeated MCP or external-event partitions are wrapped in `XO`/`V_` using `A_` disclosure within its 224px scrolling details list; singletons render ordinarily.
- `zh-CN-7ba80cbb133d.js` has `localConversation.agentActivity.repeatedToolCalls`, `repeatedCodexCallCount`, `localConversation.externalEvent.repeatedSummary`. The demo shows the matching count wording, with an explicit simulated suffix.

## Integration
- `SourceRepeatedActivityGroups.ts` implements the eligibility, full identity key and contiguous-only grouping, with explicit host result-safety and tool-display inputs. Unresolved private predicates are NOT guessed.
- `CodexActivityGroupRow` receives Je groups from the same renderer's `groupHeader` host and renders nested native disclosure rows; existing tool leaves are reused, not replaced.
- The demo uses explicit, synthetic `demoSafeMcpResult` and `demoToolDisplaySignature` data; no real MCP call is made. Browser testing opens the existing historical activity and then the subgroup, checks pending barrier stays separate, and closes subgroup.
- Exact original `A_` motion, icon assets, Codex Apps result parser `ie`, and `bm` rich metadata renderer have not been recovered. This is a structural subset, not pixel-level parity.

## Next
- Recover `bm` signature and `ie` safety checker from their actual compiled bundles, and use host contracts with real resolved Apps metadata.
- Recover `XO` header/icon structure and `V_` event grouping, and restore subrow disclosure animation via original motion evidence.
- Trace real Wa/hn live turn activity/approval partition; keep Agent/Electron boundary isolated.


## 2026-10-23 follow-up — source `$_` Codex Apps error barrier

Evidence rechecked against the exact private `frontend.zip` supplied by the user (none of the compiled assets are committed):

- `app-initial-5851df3f6cb1.js`: SHA-256 `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`. Its `$_` exported as `mjr` is the `ie` imported by `Je`. `K_` treats only the exact server name `codex_apps` as a Codex Apps server.
- `inline-followup-markdown-4751fe20f26d.js`: SHA-256 `b2a356e8c59b592f16514e9c160cacbbeebfedf0c18b87699564f8c20705fa0b`. `Je` negates `ie({isCodexAppsServer: K_(server),result})` as a *mandatory* call-group eligibility condition.
- `mcp-tool-activity-label-220d2d98d4ad.js`: SHA-256 `448fe0573dd26310387c8c59b7f5245a1fef69dc95b7207c8b0d3f8a0f74971c`. Its `xa` is imported by `sites-end-resource` as `bm`: it produces the localized activity label using app matching, tool metadata, invocation arguments and completed result. It is not merely the MCP tool name.
- `$_` rejects error results. On a successful Codex Apps result it first parses a `BIt` wrapper (`content`, `isError`, `meta`, `structuredContent`); an `isError:true` wrapper is excluded. It also excludes a direct or unwrapped nested `VIt` execution-error object carrying string `error`/`error_code` and `error_data.type='mcp_tool_execution_error'` plus `result.isError=true`.

Implementation: `SourceMcpResultGroupingGuard.ts` enforces these recognized error shapes inside the existing `projectSourceRepeatedActivityRows` path, **in addition to** the host's safe-group callback. The new regression tests keep a transport-successful but application-failed Codex Apps invocation as its own row, so adjacent good calls do not mask it in a count. `src/index.ts` exports the guard for use by future real hosts.

Limits: this is an independently authored structural subset of the private Zod `BIt/VIt` parse, not a verbatim copy of its JSON schema semantics. The real resolved-App metadata, `xa/bm` localization, exact `XO/V_` icon composition, `A_` motion transitions and live Electron/Agent events remain host/visual gaps. No MCP connection, command execution or approval API is introduced.

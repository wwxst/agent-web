# Source XO/V_ repeated activity disclosure headers — 2026-10-23

## Original evidence from uploaded frontend.zip

- `sites-end-resource-fa77a923096d.js`: `XO` selects `_m(item,resolvedApps)`; recognized Codex action uses the returned message and icon, then the separate `repeatedCodexCallCount` suffix. Unrecognized calls use `KO` (host/resolved Apps tool title), prefixed by the grouped `mv` icon, with `repeatedToolCalls` title. `V_` uses the external source label and the `externalEvent.repeatedSummary` translation. Both mount `A_` with `shouldAnimateInitialCollapse:false`.
- `KO` builds the source `bm` call using `appContext, completed, intl, matchingApp, serverName, source, toolArguments, toolName, toolResult, toolDisplay, toolDefinition`. Real `bm` formatting and real App metadata remain private host dependencies, not approximated by the demo.
- Exact `zh-CN` locale keys: `localConversation.agentActivity.repeatedToolCalls`: `{toolName} · {count} 次调用`; `localConversation.agentActivity.repeatedCodexCallCount`: `· {count} 次调用`; `localConversation.externalEvent.repeatedSummary`: `已收到来自 {source} 的 {count} 个事件` (ICU plural source syntax).
- `inline-followup-markdown-4751fe20f26d.js` `Je` forms partitions; `sites-end-resource` `nk` invokes the grouping and routes results to XO/V_. Do not confuse grouping eligibility with header title selection.

## Connected implementation

- `SourceRepeatedActivityHeader.ts` implements the source discriminator for generic MCP, recognized Codex action and external-event rows, with a nullable host recognition callback.
- `CodexActivityGroupRow` uses the discriminator inside the existing `nk` details list. It accepts optional host icon/title slots; private `_m`, `KO`, `mv` output is never synthesized in core code.
- `demo/adapters.tsx` opts in with clearly synthetic labels/icons to exercise both MCP branches while preserving fallback callbacks for older hosts.
- Unit tests verify all three branches and absent/singleton rows. Chromium tests verify both headers, two nested disclosures, icon slot, and the incomplete MCP barrier.
- **Limits:** no real `bm` rich metadata, real Apps lookup, browser-use icon, Electron integration, backend execution, original `A_` animation, or pixel parity. These remain unimplemented.

## Next

1. Trace source `bm`, `_m`, `of`, and `KO` into the precise original asset that exports them; recover validated interface/metadata adapters.
2. Verify `Je` normalized rows, keys, and dynamic status transitions before claiming actual streaming behavior.
3. Compare source-version-matched screenshots, including XO/V_ expanded states and real tool metadata.

## Follow-up: `bm` implementation located, not reimplemented

The KO component imports `bm` from the bundled `mcp-tool-activity-label-220d2d98d4ad.js`, where the corresponding exported formatter is `xa`. The original `xa` accepts `appContext`, `completed`, `intl`, `serverName`, `matchingApp`, `nativeDesktopAppMetadata`, `platform`, `source`, `toolArguments`, `toolResult`, `toolName`, `toolDisplay`, and `toolDefinition`.

Observed fallback order: resolved specialized tool action → JavaScript title argument → connector-specific action formatter → tool display `invoking/invoked` or tool-definition metadata (guarded by success/failure) → tool title/tool definition → browser-use or generic named tool action. The precise private parsers and connector handlers (`Pt/Mt/wa/mt/gt/ct/et/Ea/Ta`) need independent implementation evidence; this batch intentionally **does not** claim that the entire formatter is restored.

The Playwright subgroup test additionally captures a screenshot with both XO header variants expanded inside the real transcript. The image remains a synthetic host fixture, not a source-version matched visual acceptance.

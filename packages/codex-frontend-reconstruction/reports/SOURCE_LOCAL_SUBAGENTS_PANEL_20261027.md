# Source Local Conversation Subagents side panel — 2026-10-27

## Primary compiled Codex evidence

The uploaded `frontend.zip` contains:
- `webview/assets/local-conversation-subagents-panel-tab-f7116bdb2e6f.js` (original `F/I/V/H/W/B`).
- `webview/assets/subagent-panel-e2d31e8d7515.js` (original `w/T/E/D/h/y`).
- `webview/assets/open-local-conversation-subagents-panel-6bda7c73a612.js` (original `x` tab opener).

Original host `F` reads child agent summaries scoped by parent
`{hostId,parentConversationId}`, and uses existing `renderSlots`
for right-tab content. In overview `I`, it separates
`status==="done"` from active, displays `Active · {count}` and
`Done · {count}`, `No active subagents`, and a count for status
`waiting`. Active/done initial visible limits are **4** and **10**
respectively. `V` chooses objective (shortened to 60 chars) before
status summary, falling back to `Working` for other active records.
`W` uses `startedAtMs` for active elapsed time and
`lastAssistantMessageAtMs ?? recencyAtMs` for done relative time.

Opening a row routes to `B` detail header. `F` mounts the original
`local-conversation-thread` with `canInteract===true` only for
a verified child; the opener's `verify-descendant` and historical
hydrate RPC are private and cannot be faked.

## Actual integrated implementation

- `SourceLocalSubagentsPanelModel`: typed source entries and section
  projection; caller provides verified original source order (the
  private `Vl` sorting implementation is not copied or guessed).
- `SourceLocalSubagentsPanel`: renders real overview sections,
  limits / show-more, waiting/elapsed/done metadata, selected-agent
  header/back and a **host-provided** child thread renderer. No
  client-side creation of Agent jobs.
- The already-running browser/Electron shell exposes the right-side
  tab through an **explicit synthetic demo fixture** only, and reuses
  `ConnectedLiveConversationTranscript` and existing React row
  rendering for its synthetic child. Absent host entries shows
  `No active subagents`, not invented activity.
- Tests mount the real shell, check section counts/limits and source
  navigation, parent transcript continuity and child canonical
  virtualized assistant row.

## Boundaries

The real `verify-descendant`, `getThreadListSummary`,
`loadBackgroundThreadHistoryPage`, host source subscription,
on-demand ancestor hydration, original Avatar generator, private
model/effort translation and actual child Agent RPC are **not**
implemented. Demo records are clearly synthetic. Right tab width
is owned by this standalone demo adapter pending exact original
shell measurement; no assertion of pixel-identical Windows UI.

The original compiled bundle is not committed. Do not merge until
final CI passes. Backend is unchanged.

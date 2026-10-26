# 2026-10-26 — Work status divider inside the original conversation timeline

## Source evidence (read directly from uploaded frontend.zip)

- `frontend/webview/assets/collapsed-turn-disclosure-5a24f5665073.js`
  SHA-256 `03d7dd347ffcc49d6904457584d7b92ebe82d55ef6e557d72db636e183f6a9f8`:
  - Function `y` prioritizes `workedForItem` over aggregate `workedDurationMs`
    and over `collapsedMessageCount`.
  - Historical collapse button `b` uses that label. The status is not a
    permanent conversation-header subtitle.
- `frontend/webview/assets/app-primary-fe8a450b3b04.js`
  SHA-256 `2a05e25229bd7a38c12c55d90f82fb07087e80b4e16070116b215484498478f2`:
  - `SG` accepts `{status,startedAtMs,completedAtMs,className}`. Status cases:
    `loading` ("Loading activity status"), `unknown` ("Activity"), `paused`
    ("Paused"), `working` ("Working" for less than 1 second; thereafter
    "Working for {time}"), `worked` ("Worked for {time}"),
    `stopped` ("You stopped after {time}").
  - `F7e` updates live working time once every 1000ms and clamps negative
    elapsed time to zero. The original `Wfe` duration formatter uses locale.
  - `P7e` renders the status with a divider immediately after its leading text.
- `frontend/webview/assets/sites-end-resource-fa77a923096d.js`
  SHA-256 `a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708`:
  original `kk` partitions standalone `worked-for` from collapsible activity.

## Actual integrated changes

- Removes the hardcoded "Worked for 2m 11s · mock" block beneath the
  conversation title from the mounted `demo/App.tsx`. That block was placed
  incorrectly even as a demo.
- Adds `SourceWorkStatusModel.ts` (typed time/status resolution),
  `CodexSourceWorkStatus.tsx` (mounted UI, 1-second working refresh), and
  connects them through the **existing**
  `ConnectedConversationMessageRenderers` → `CodexAgentActivity` path.
  Existing `projectAgentActivityCollapse` still determines when and where
  `worked-for` moves into the summary versus the expanded detail.
- Adds an explicitly synthetic completed command + `worked-for` fixture
  inside the existing review conversation to exercise the real virtualized
  transcript. Synthetic timestamps are not represented as live Agent results.
- Adds core unit tests and a real Electron navigation/expanded/collapsed
  transcript screenshot test. Both status locations are checked in one mounted
  conversation, with no duplicate activity list or second render host.
- The independent UI remains frontend-only. No backend, permission, file or
  private IPC action is performed.

## Limitations, not falsely claimed

- The English `formatDemoWorkDuration` is **not** the private locale-aware
  `Wfe` implementation. Exact duration pluralization, internationalization,
  shimmer skeleton, animation and theme tokens still require original parity
  work. Tests confirm the English standalone demo only.
- No status is synthesized from the wall-clock for live Agent activity.
  `working` is updated only if supplied by the host as a real status item.
- The existing mock conversation is not a production runtime or a faithful
  original Codex transcript.
- CI test code and screenshot names are not an acceptance result: check the
  final branch GitHub Actions logs and screenshot artifacts to confirm.

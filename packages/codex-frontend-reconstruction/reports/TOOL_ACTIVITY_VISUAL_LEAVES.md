# Source-derived tool-detail visual leaves

## Source evidence

The visual leaf routing was inspected in the user-provided Codex Windows frontend archive, without committing the archive or any proprietary compiled assets to this repository.

- Archive: \`frontend.zip\`
- Archive SHA-256: \`764a550ab17d5ec3a27d4ef3c7f76487d23083e7ddee6c14ae75210aa474f5be\`
- Main source chunk: \`frontend/webview/assets/sites-end-resource-fa77a923096d.js\`
- Main source chunk SHA-256: \`a84b2e2181125a3e4d2bc9be458bad4fb36df615243c7f3cc23e076bd4094708\`

The pinned bundle contains the dispatch and leaf definitions below:

| Compiled identifier | Observed responsibility |
| --- | --- |
| \`xC\` | Dispatch parsed exec summaries to \`RC\`, \`EC\`, \`NC\`, or \`CC\` |
| \`RC\` | Read summary, completed-read visibility, skill-definition branch, path display |
| \`EC\` | Search summary text for query/path and in-progress/completed state |
| \`NC\` | File-list summary text for path and in-progress/completed state |
| \`CC\` | Collapsible command shell, elapsed label, output, exit code, interruption and denied-review state |
| \`SC\` | Shared tool-summary wrapper and automatic-review marker/detail entry |
| \`WC\` | Command summary variants including background terminal and interrupted command |
| \`PT\` | Patch status precedence, visualization activity visibility, file-change iteration |
| \`IT\` | Per-file add/delete/update labels, diff disclosure, line counts, file-open callback and empty/oversized preview fallback |
| \`BT\` / \`VT\` | Diff header and unified-diff / fallback preview presentation |

These are translations of compiled implementation evidence, not the original authored React/TypeScript source. The proprietary Codex design-system runtime, localization runtime and private file-open/approval handlers are not included here.

## Independent React implementation

New source module: \`src/components/CodexSourceToolActivityLeaves.tsx\`

- \`CodexSourceExecReadLeaf\` restores read visibility and summary/path presentation.
- \`CodexSourceExecSearchLeaf\` restores query/path summary variants.
- \`CodexSourceExecListFilesLeaf\` restores file-list summary variants.
- \`CodexSourceExecCommandLeaf\` restores collapsed-by-default command details, hydrated output/exit status, elapsed time and interruption/automatic-review-decline presentation. It never starts a command.
- \`CodexSourcePatchLeaf\` and its file row restore the source status precedence, visualization activity label, per-file status, diff disclosure, basic unified-diff line coloring and source-observed empty/oversized-preview fallback.
- Optional \`onOpenFile\` is an explicit host callback. Without a host callback, paths are display-only. No file mutation or approval write-back is implemented in the leaf components.

Integration uses the existing \`CodexToolActivityLeafRenderer\` and \`ConnectedConversationMessageRenderers\`; it does not create a second transcript or bypass history hydration. The browser preview uses explicitly synthetic fixtures for command, patch, read, search and list-files rows.

## Audit and verification boundary

\`scripts/audit-tool-detail-evidence.mjs\` now checks the original bundle hash and 55 source signatures, including the CC/RC/EC/NC/SC/WC/PT/IT branches and their key summary/fallback markers. The 21 added visual-leaf signatures were independently checked against the provided bundle and passed 21/21.

Source signature checks prove the target compiled branches are present; they do not prove pixel parity. The authored CSS in \`demo/styles.css\` is a local compatibility layer, not copied Codex CSS. The current browser preview is still a demo host, not a complete Electron app.

Remaining work:
- verify the latest CI run after the new read/search/list-files and patch-interaction fixtures;
- replace remaining host-injected visual leaves with source-shaped equivalents where source evidence supports it;
- bind file opening, approval requests and tool updates to a confirmed Agent/Electron event contract;
- compare the reconstructed leaf screenshots and interactions against the same Codex build and viewport.

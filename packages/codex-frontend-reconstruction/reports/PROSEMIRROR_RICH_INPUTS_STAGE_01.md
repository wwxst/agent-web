# Source-confirmed Composer rich inputs — stage 01

Base: `c6e02d9dca778a32c4603b1d344a78b0e54ae84d`, recovery branch / draft PR #1.

## Original bundled code used (read-only)

- `frontend/webview/assets/app-initial-5851df3f6cb1.js` SHA-256 `c70d95da34ba7e5962a559dbf68d0102d10b4b47b877f5d9933629bb5a1f3a10`.
- `Aja`: `Dja` supplies private `atMention`, `skillMention`, `appMention`, `pluginMention`, `richLink`, etc. `kja` is the plain base schema. Do not synthesize these atom specifications.
- `lG`: `KCa` extends a link mark with `href`, `literalMarkdownOccurrenceId`, `literalMarkdownSource`, `sourceAppId`, `isGeneratedAutolink`; the private `VCa` controls link DOM output.
- `Qja`: `Yja.proseMirrorInputRules` appends a three-backtick rule matching `/```$/` when a depth-one paragraph is at its end, inserting a `code_block` after the paragraph.
- `rUu`: `enableSelectedTextLinks` with a URL pasted over text adds the link mark without replacing the selected label, provided no inline non-text atom is selected. A main host in `app-primary-fe8a450b3b04.js` passes `enableSelectedTextLinks:!0`.
- `jja`: rich mode constructs a separate Markdown extension set, ordered around `S.listInput`, `S.codeBlockFenceExit`, `S.inputRules`, `S.inputRulesHistoryIsolation`, suggestions, backspace and keymaps. This batch **does not replicate** this full private plugin graph.

## What actually runs

- `SourceComposerRichExtensions.ts` defines safe link DOM parsing/metadata and the scoped `Yja` input behavior as a regular ProseMirror plugin. Since the private `ICa/xa` URL parser is unavailable, the implementation only accepts a conservative http(s)/mailto subset and renders plain upstream anchors without claiming Codex link icons.
- `SourcePlainProseMirrorController.ts` enables optional source-backed behaviors through flags, and `DemoProseMirrorComposerEditor.tsx` opts in on the **existing mounted editor**. Composer host lifecycle, readiness, attachment event boundaries, typing and history are unchanged.
- `composer-rich-extensions.spec.ts` checks real Chromium text entry, code-block creation, URL link paste, unsafe scheme rejection and submit regression.

## Explicit boundaries and risks

- Plain schema still lacks rich headings, lists, bold/italic, full Markdown serialization, restored link provenance on clipboard, original URL policy, `Dja` inline mentions, skills, autocomplete/suggestions, private input-rule-history isolation and Electron/Agent host bridges.
- The original `Yja` rule is part of rich-mode extensions; this stage deliberately **isolates it** as an opt-in subset, not an assertion that the original plain mode enabled it.
- URL safety logic and plain DOM anchor output are a conservative replacement for private link helpers. All visual and behavioral differences require source/version-matched comparison.
- Tests for this commit must be read from CI; source signature checks prove snippets exist, not complete parity.

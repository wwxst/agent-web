# 2026-10-26 — Original Lezer code highlighting in the real mounted Markdown viewer

## Original compiled evidence (uploaded Windows Codex bundle, read-only)

- frontend/webview/assets/chatgpt-code-block-d92f3a4029b6.js
  - SHA256 4e9522c34ee74936140e83bb8c722c25ec8600206782c8086946456675a5cf4e.
  - Original Bt lazy-loads a language parser; It coalesces contiguous text runs of identical Lezer syntax class.
  - Source caps: Rt=65536 UTF-16 code units and zt=10000 syntax runs. If exceeded, the viewer falls back to unstyled raw code.
  - Original Ht renders token spans inside code and keeps its scrollport independent of the text.
  - The original streaming path uses a 500 ms throttle (Lt=500), incremental updates, cancellation and parser state. **Not ported here.**
- frontend/webview/assets/chatgpt-code-block-highlighting-72144295f264.js
  - SHA256 9d1d8a10245b28684d5855082fe037cc67ad9c2e6260286a0ba19b6bf0a7b689.
  - Original Lezer semantic tags map to text-codex-syntax-comment, keyword, literal, string, variable, attribute, name and error classes.
  - Underline is used on links and error/escape tokens. This exact source class taxonomy is reused.
- frontend/webview/assets/app-shared-dc7535e633d7.css
  - SHA256 282dd3546bccfba48212a186641a73dedb27af6af7962dad40b3f5db6a9a08f2.
  - Light syntax fallback palette: keyword #ab4f7a, literal #ac4f23, string #3a843f, variable #643cae, attribute #b8802b, name #1f4e94.
- frontend/webview/assets/languages-6665b0380ca0.js
  - SHA256 abf6cfa6c19daeb0eb9a0881f775b88ded312df5fc294003a2ed6950a7a5deb1.
  - Contains original lazy language resolution; the independent source subset is NOT full parity.
- shiki-highlight-provider-d964b57bf416.js is a separate original provider for Pierre diffs. It is not the Markdown code block Ht/Bt path and is not substituted here.

## Real integration

- SourceLezerCodeHighlight.ts uses official @lezer/highlight, @codemirror/language and the JS/TS, CSS, HTML and Python language grammars, lazily imported and cached, rather than a regex keyword approximation.
- The original semantic class names are applied to safe React text spans. The source text is preserved bit-for-bit; oversized/unsupported code falls back to plain text, never broken markup.
- The actual existing MarkdownSourceCodeBlock in demo/adapters.tsx loads syntax segments with a current-input effect guard, cloning the existing react-markdown code element. The current copy button, global Wrap lines and conversation virtualizer remain mounted and unchanged.
- codexDesktopShell.css uses original Codex light-mode syntax variables with explicit fallbacks.
- Core tests cover language aliases, five source languages, unknown and oversized fallback and Unicode exact text preservation.
- Browser / native Electron tests submit code-fenced Markdown via the mounted composer, assert original token class names, computed palette, raw text and global wrap, capture real running screenshots.

## Unimplemented / safety boundaries

- No private 500ms streaming incremental parser, CodeMirror editor, worker, rich preview, syntax language chooser, diff provider or code execution.
- No full original language catalogue or private grammar loading policy.
- No original theme synchronization, original live Windows pixel-by-pixel comparison or Agent backend integration.
- Do not label this work as fully restored CodeMirror.
- User-provided compiled resources remain read-only and are NOT committed to GitHub.
- Final-head Linux and Windows CI must succeed; keep stacked PR open unless explicitly approved.

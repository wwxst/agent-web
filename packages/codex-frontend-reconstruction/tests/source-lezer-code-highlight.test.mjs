import test from "node:test";
import assert from "node:assert/strict";
import {
  highlightSourceCodeWithLezer,
  resolveSourceCodeHighlightLanguage,
  fallbackSourceCodeSegments,
  SOURCE_CODE_HIGHLIGHT_MAX_CHARS,
  SOURCE_CODE_HIGHLIGHT_MAX_SEGMENTS,
} from "../build/SourceLezerCodeHighlight.js";

test("original lazy Lezer grammars highlight supported code while retaining every source character",async()=>{
  for(const [language,source] of [
    ["ts",'const greeting: string = "Codex";\n// a real comment\n'],
    ["javascript",'function answer(){ return 42; }\n'],
    ["css",'.foo { color: #fff; }\n'],
    ["html",'<div class="greeting">Hello</div>\n'],
    ["python",'def answer():\n    return "Codex"\n'],
  ]){
    const output=await highlightSourceCodeWithLezer(source,language);
    assert.equal(output.highlighted,true,"grammar "+language+" should apply real tags");
    assert.equal(output.segments.map(part=>part.text).join(""),source);
    assert.ok(output.segments.some(part=>part.className?.startsWith("text-codex-syntax-")),
      language+" must emit original classes");
    assert.ok(output.segments.length<SOURCE_CODE_HIGHLIGHT_MAX_SEGMENTS);
  }
});

test("source aliases resolve explicitly without guessing unsupported languages",()=>{
  assert.equal(resolveSourceCodeHighlightLanguage("TSX"),"typescript");
  assert.equal(resolveSourceCodeHighlightLanguage("py"),"python");
  assert.equal(resolveSourceCodeHighlightLanguage("jsx"),"javascript");
  assert.equal(resolveSourceCodeHighlightLanguage("htm"),"html");
  assert.equal(resolveSourceCodeHighlightLanguage("unknown-lang"),null);
  assert.equal(resolveSourceCodeHighlightLanguage(null),null);
});

test("source hard 64KiB safety ceiling and unknown languages preserve plain readable code",async()=>{
  const code='const x = "hello";';
  const unknown=await highlightSourceCodeWithLezer(code,"toml");
  assert.deepEqual(unknown,fallbackSourceCodeSegments(code));
  const huge=code.repeat(Math.ceil((SOURCE_CODE_HIGHLIGHT_MAX_CHARS+1)/code.length));
  const oversized=await highlightSourceCodeWithLezer(huge,"typescript");
  assert.equal(oversized.highlighted,false);
  assert.deepEqual(oversized.segments,[{className:null,text:huge}]);
  const empty=await highlightSourceCodeWithLezer("","js");
  assert.deepEqual(empty.segments,[]);
  assert.equal(empty.highlighted,false);
  const unicode=await highlightSourceCodeWithLezer('const 🐱 = "🌏";\n',"js");
  assert.equal(unicode.segments.map(part=>part.text).join(""),'const 🐱 = "🌏";\n');
});

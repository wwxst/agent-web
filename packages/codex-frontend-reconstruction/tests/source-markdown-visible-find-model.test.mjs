import test from "node:test";
import assert from "node:assert/strict";
import {
  sourceMarkdownNonRenderedLinkRanges,
  sourceMarkdownVisibleFindOrdinal,
} from "../build/SourceMarkdownVisibleFindModel.js";

function visibleHits(text,query){
  const out=[];
  for(let at=text.indexOf(query);at>=0;at=text.indexOf(query,at+query.length))
    out.push({offset:at,mapping:sourceMarkdownVisibleFindOrdinal({
      text,query,offset:at,length:query.length,
    })});
  return out;
}
test("a Markdown label with an identically named invisible URL keeps exact DOM ordinals",()=>{
  const text="needle [needle](https://docs.example/needle) needle";
  assert.deepEqual(visibleHits(text,"needle").map(hit=>hit.mapping),[
    {ordinal:0,visibleMatches:3},
    {ordinal:1,visibleMatches:3},
    null,
    {ordinal:2,visibleMatches:3},
  ]);
});
test("image alternative text is not visible DOM text; ordinary link label is",()=>{
  const text="![needle](image.png) and [needle](docs.html) needle";
  assert.deepEqual(visibleHits(text,"needle").map(hit=>hit.mapping),[
    null,
    {ordinal:0,visibleMatches:2},
    {ordinal:1,visibleMatches:2},
  ]);
});
test("nested link destination parentheses and escaped destination closing paren remain hidden",()=>{
  const text="[needle](https://host/(needle)/q\\)u) needle";
  assert.deepEqual(visibleHits(text,"needle").map(hit=>hit.mapping),[
    {ordinal:0,visibleMatches:2},null,{ordinal:1,visibleMatches:2},
  ]);
});
test("backtick code spans and fenced blocks do not get parsed as Markdown links",()=>{
  const text="`[needle](https://site/needle)` and [needle](https://site/needle)";
  assert.deepEqual(visibleHits(text,"needle").map(hit=>hit.mapping),[
    {ordinal:0,visibleMatches:3},
    {ordinal:1,visibleMatches:3},
    {ordinal:2,visibleMatches:3},
    null,
  ]);
  assert.equal(sourceMarkdownNonRenderedLinkRanges("```md\n[foo](bar)\n```").length,0);
});
test("invalid source hits are never remapped to unrelated visible text",()=>{
  const text="[needle](https://site/needle)";
  for(const [offset,length] of [[-1,6],[text.length,6],[1,5],[0,6]]){
    assert.equal(sourceMarkdownVisibleFindOrdinal({
      text,query:"needle",offset,length,
    }),null);
  }
  assert.equal(sourceMarkdownVisibleFindOrdinal({
    text,query:"needle",offset:1,length:6,
  })?.ordinal,0);
});

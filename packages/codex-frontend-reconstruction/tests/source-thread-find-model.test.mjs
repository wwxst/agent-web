import test from "node:test";
import assert from "node:assert/strict";
import {
  findSourceThreadLiteralMatches, wrapSourceThreadFindOrdinal,
} from "../build/SourceThreadFindModel.js";

test("independent literal conversation search keeps turn anchors and order", () => {
  const rows=[
    {turnKey:"history-content:turn:1",text:"Codex and CODEX"},
    {turnKey:"history-content:turn:2",text:"Codex"},
  ];
  assert.deepEqual(findSourceThreadLiteralMatches(rows,"codex"),[
    {turnKey:"history-content:turn:1",offset:0,length:5},
    {turnKey:"history-content:turn:1",offset:10,length:5},
    {turnKey:"history-content:turn:2",offset:0,length:5},
  ]);
  assert.deepEqual(findSourceThreadLiteralMatches(rows,"codex",2).map(x=>x.turnKey),[
    "history-content:turn:1","history-content:turn:1",
  ]);
});
test("empty/absent strings do not report phantom matches",()=>{
  const rows=[{turnKey:"turn:1",text:"hello"}];
  assert.deepEqual(findSourceThreadLiteralMatches(rows,""),[]);
  assert.deepEqual(findSourceThreadLiteralMatches(rows,"  "),[]);
  assert.deepEqual(findSourceThreadLiteralMatches(rows,"world"),[]);
  assert.deepEqual(findSourceThreadLiteralMatches(rows,"hello",0),[]);
});
test("next/previous search navigation wraps but never leaves range",()=>{
  assert.equal(wrapSourceThreadFindOrdinal(2,3,"next"),0);
  assert.equal(wrapSourceThreadFindOrdinal(0,3,"previous"),2);
  assert.equal(wrapSourceThreadFindOrdinal(10,3,"next"),0);
  assert.equal(wrapSourceThreadFindOrdinal(0,0,"next"),0);
});

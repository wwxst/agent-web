import test from "node:test";
import assert from "node:assert/strict";
import {
  SOURCE_CONVERSATION_FIND_NAVIGATION_LIMIT, findSourceThreadLiteralMatches,
  searchSourceThreadLiteralRows, sourceThreadFindUnitIdentity,
  wrapSourceThreadFindOrdinal,
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

test("250 source find offsets remain navigable while total and per-turn counts remain exact",()=>{
  assert.equal(SOURCE_CONVERSATION_FIND_NAVIGATION_LIMIT,250);
  const rows=[
    {turnKey:"turn:1",text:"needle ".repeat(240)},
    {turnKey:"turn:2",text:"needle ".repeat(80)},
  ];
  const result=searchSourceThreadLiteralRows(rows,"needle");
  assert.equal(result.totalMatches,320);
  assert.equal(result.matches.length,250);
  assert.equal(result.isCapped,true);
  assert.equal(result.totalByTurn.get("turn:1"),240);
  assert.equal(result.totalByTurn.get("turn:2"),80);
  assert.equal(result.matches.at(249).turnKey,"turn:2");
  assert.equal(result.matches.at(249).offset,9*7);
  assert.equal(wrapSourceThreadFindOrdinal(249,result.matches.length,"next"),0);
  assert.deepEqual(searchSourceThreadLiteralRows(rows,"needle",400).matches.length,320);
  assert.equal(searchSourceThreadLiteralRows(rows,"needle",400).isCapped,false);
});
test("literal fallback never interprets slash delimiters as a regex",()=>{
  const rows=[{turnKey:"turn:1",text:"/a.+b/ abc aZZb"}];
  const result=searchSourceThreadLiteralRows(rows,"/a.+b/");
  assert.equal(result.totalMatches,1);
  assert.deepEqual(result.matches,[{turnKey:"turn:1",offset:0,length:6}]);
});

test("source turn.units keep per-message offsets and avoid activity/Markdown ordinal drift",()=>{
  const turnKey="history-content:turn:complex";
  const rows=[{
    turnKey,text:"demo concatenation only",
    units:[
      {unitKey:"exec-output",text:"open file TESTKEY"},
      {unitKey:"user-1",text:"**TESTKEY** markdown"},
      {unitKey:"assistant-1",text:"TESTKEY ready"},
    ],
  }];
  const result=searchSourceThreadLiteralRows(rows,"testkey");
  assert.deepEqual(result.matches,[
    {turnKey,unitKey:"exec-output",offset:10,length:7},
    {turnKey,unitKey:"user-1",offset:2,length:7},
    {turnKey,unitKey:"assistant-1",offset:0,length:7},
  ]);
  assert.equal(result.totalMatches,3);
  assert.equal(result.totalByTurn.get(turnKey),3);
  for(const name of ["exec-output","user-1","assistant-1"]){
    assert.equal(result.totalByUnit.get(sourceThreadFindUnitIdentity(turnKey,name)),1);
  }
  assert.equal(result.totalByUnit.size,3);
  assert.equal(searchSourceThreadLiteralRows(rows,"concatenation").totalMatches,0,
    "unrendered concatenation must not become an invented search unit");
});
test("source 250-match cap applies across actual units, not separately to each unit",()=>{
  const turnKey="turn:long";
  const result=searchSourceThreadLiteralRows([{
    turnKey,text:"",
    units:[
      {unitKey:"a",text:"hit ".repeat(200)},
      {unitKey:"b",text:"hit ".repeat(100)},
    ],
  }],"hit");
  assert.equal(result.totalMatches,300);
  assert.equal(result.matches.length,250);
  assert.equal(result.matches[199]?.unitKey,"a");
  assert.equal(result.matches[200]?.unitKey,"b");
  assert.equal(result.matches[200]?.offset,0);
  assert.equal(result.totalByUnit.get(sourceThreadFindUnitIdentity(turnKey,"b")),100);
});

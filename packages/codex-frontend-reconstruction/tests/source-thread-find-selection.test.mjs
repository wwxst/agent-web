import test from "node:test";
import assert from "node:assert/strict";
import {sourceThreadFindSelectedQuery} from "../build/SourceThreadFindSelectionModel.js";

test("source cFt takes the focused text input selection ahead of page selection",()=>{
  assert.equal(sourceThreadFindSelectedQuery({
    value:"unselected rendering selected",selectionStart:11,selectionEnd:20,
  },"stale transcript selection"),"rendering");
  assert.equal(sourceThreadFindSelectedQuery({
    value:"search current",selectionStart:0,selectionEnd:0,
  },"stale transcript selection"),undefined);
  assert.equal(sourceThreadFindSelectedQuery({
    value:"search current",selectionStart:null,selectionEnd:null,
  },"stale transcript selection"),undefined);
});

test("source cFt reads normal document selections, including r and n",()=>{
  assert.equal(sourceThreadFindSelectedQuery(null,"  agent web  "),"agent web");
  assert.equal(sourceThreadFindSelectedQuery(null,"  rendering  "),"rendering");
  assert.equal(sourceThreadFindSelectedQuery(null,"  " ),undefined);
  assert.equal(sourceThreadFindSelectedQuery(null,null),undefined);
});

test("source cFt explicitly clears the find query on multi-line selection",()=>{
  assert.equal(sourceThreadFindSelectedQuery(null,"first\nsecond"),"");
  assert.equal(sourceThreadFindSelectedQuery(null,"first\rsecond"),"");
  assert.equal(sourceThreadFindSelectedQuery({
    value:"row one\r\nrow two",selectionStart:0,selectionEnd:16,
  },null),"");
});

import test from "node:test";
import assert from "node:assert/strict";
import {SOURCE_USER_MESSAGE_COLLAPSED_LINES,
  SOURCE_USER_MESSAGE_CHARS_PER_LINE,sourceUserMessagePrefixLimit,
  sourceUserMessageVisibleText,shouldCollapseSourceUserMessage}
  from "../build/SourceCollapsibleUserMessageModel.js";

test("original C 20-line and 512-char bound",()=>{
 assert.equal(SOURCE_USER_MESSAGE_COLLAPSED_LINES,20);
 assert.equal(SOURCE_USER_MESSAGE_CHARS_PER_LINE,512);
 assert.equal(sourceUserMessagePrefixLimit(),10240);
 assert.equal(sourceUserMessagePrefixLimit(3),1536);
});
test("source C forces long text to collapse, even without height measurement",()=>{
 assert.equal(shouldCollapseSourceUserMessage({
  textLength:10241,renderedContentHeightPx:0,lineHeightPx:0}),true);
 const text="x".repeat(10241);
 assert.equal(sourceUserMessageVisibleText(text,true).length,10240);
 assert.equal(sourceUserMessageVisibleText(text,false).length,10241);
});
test("source rendered-geometry branch handles shorter multi-line markdown",()=>{
 assert.equal(shouldCollapseSourceUserMessage({
  textLength:100,renderedContentHeightPx:421,lineHeightPx:20}),true);
 assert.equal(shouldCollapseSourceUserMessage({
  textLength:100,renderedContentHeightPx:400,lineHeightPx:20}),false);
 assert.equal(shouldCollapseSourceUserMessage({
  textLength:100,renderedContentHeightPx:400,lineHeightPx:0}),false);
});

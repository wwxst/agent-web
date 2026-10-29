import assert from "node:assert/strict";
import test from "node:test";
import {
  SOURCE_SUBAGENTS_ACTIVE_VISIBLE_LIMIT,
  SOURCE_SUBAGENTS_DONE_VISIBLE_LIMIT,
  sourceLocalSubagentSections,
  sourceLocalSubagentPreview,
  sourceLocalSubagentLastActivityMs,
  isSourceLocalSubagentChildVerified,
  sourceLocalSubagentRelativeTime,
} from "../build/SourceLocalSubagentsPanelModel.js";

test("original I groups only done separately and counts waiting among active",()=>{
  const items=[
    {conversationId:"a",displayName:"A",status:"waiting"},
    {conversationId:"b",displayName:"B",status:"done"},
    {conversationId:"c",displayName:"C",status:"running"},
    {conversationId:"d",displayName:"D",status:"waiting"},
  ];
  const groups=sourceLocalSubagentSections(items);
  assert.deepEqual(groups.active.map(x=>x.conversationId),["a","c","d"]);
  assert.deepEqual(groups.done.map(x=>x.conversationId),["b"]);
  assert.equal(groups.waitingCount,2);
  assert.equal(SOURCE_SUBAGENTS_ACTIVE_VISIBLE_LIMIT,4);
  assert.equal(SOURCE_SUBAGENTS_DONE_VISIBLE_LIMIT,10);
  // Do not sort or mutate host-owned source collections.
  assert.equal(items[0].conversationId,"a");
});

test("original V/W fallback and timestamp precedence are preserved",()=>{
  assert.equal(sourceLocalSubagentPreview({
    conversationId:"a",displayName:"A",status:"running"}),"Working");
  assert.equal(sourceLocalSubagentPreview({
    conversationId:"b",displayName:"B",status:"done"}),null);
  assert.equal(sourceLocalSubagentPreview({
    conversationId:"c",displayName:"C",status:"done",
    statusSummary:"Built artifact"}),"Built artifact");
  assert.equal(sourceLocalSubagentPreview({
    conversationId:"d",displayName:"D",status:"running",
    objective:"   Inspect source trace  ",statusSummary:"working"}),"Inspect source trace");
  assert.equal(sourceLocalSubagentLastActivityMs({
    conversationId:"e",displayName:"E",status:"done",
    lastAssistantMessageAtMs:100,recencyAtMs:200}),100);
  assert.equal(sourceLocalSubagentLastActivityMs({
    conversationId:"f",displayName:"F",status:"done",recencyAtMs:200}),200);
  assert.equal(sourceLocalSubagentLastActivityMs({
    conversationId:"g",displayName:"G",status:"done"}),null);
  assert.equal(sourceLocalSubagentRelativeTime(0,2*3600000),"2 hours ago");
});

test("a nested transcript cannot open if not in the parent's verified summary",()=>{
  const rows=[{conversationId:"child-one",displayName:"Child one",status:"running"}];
  assert.equal(isSourceLocalSubagentChildVerified(rows,"child-one"),true);
  assert.equal(isSourceLocalSubagentChildVerified(rows,"other-thread"),false);
  assert.equal(isSourceLocalSubagentChildVerified([],"child-one"),false);
});

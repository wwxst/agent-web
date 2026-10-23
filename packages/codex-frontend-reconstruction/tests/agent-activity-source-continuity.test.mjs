import assert from "node:assert/strict";
import test from "node:test";
import {groupSourceAgentActivityUnits} from "../build/AgentActivityUnitGrouping.js";
import {getSourceExpandableGroupRows,isSourceGroupRowVisible} from "../build/AgentActivityGroupVisibility.js";
const item=(id,type="exec",extra={})=>({id,type,...extra});
const groups={getGrouping:e=>e.type==="exec"||e.type==="patch"?"groupable":"standalone"};
test("N combines adjacent exec and patch items in source order",()=>{
  const u=groupSourceAgentActivityUnits([item("a"),item("b"),item("patch","patch")],groups);
  assert.equal(u.length,1);assert.equal(u[0].kind,"group");
  assert.deepEqual(u[0].items.map(i=>i.id),["a","b","patch"]);
  assert.equal(u[0].key,"agent-activity-group:a");
});
test("N flushes around standalone rows and preserves stable identities",()=>{
  const u=groupSourceAgentActivityUnits([item("a"),item("notice","strict-review-notice"),item("b")],groups);
  assert.deepEqual(u.map(x=>x.kind),["group","standalone","group"]);
  assert.deepEqual(u.map(x=>x.key),["agent-activity-group:a","agent-activity-standalone:notice","agent-activity-group:b"]);
});
test("N suppresses only adjacent repeated strict review notices",()=>{
  const u=groupSourceAgentActivityUnits([item("n1","strict-review-notice"),item("n2","strict-review-notice"),item("a")],groups);
  assert.equal(u.length,2);
});
test("N honors host group start boundaries",()=>{
  const u=groupSourceAgentActivityUnits([item("a"),item("b")],{...groups,startsGroup:e=>e.id==="b"});
  assert.equal(u.length,2);
});
test("N can continue group across a subagent only when explicitly enabled",()=>{
  const input=[item("a"),item("sub","subagent-activity"),item("b")];
  assert.equal(groupSourceAgentActivityUnits(input,groups).length,3);
  const u=groupSourceAgentActivityUnits(input,{...groups,groupAcrossSubagentActivity:true});
  assert.equal(u.length,2);assert.equal(u[0].kind,"group");assert.deepEqual(u[0].items.map(x=>x.id),["a","b"]);
});
test("mk hides unfinished searches/lists and delegates meaningful reads",()=>{
  const search=item("s","exec",{parsedCmd:{type:"search",isFinished:false}});
  const list=item("l","exec",{parsedCmd:{type:"list_files",isFinished:false}});
  const read=item("r","exec",{parsedCmd:{type:"read",isFinished:false}});
  assert.deepEqual(getSourceExpandableGroupRows([search,list,read]),[]);
  assert.deepEqual(getSourceExpandableGroupRows([read],{isMeaningfulRead:()=>true}),[read]);
  assert.equal(isSourceGroupRowVisible(item("done","exec",{parsedCmd:{type:"search",isFinished:true}})),true);
});
test("mk respects source empty patch visualization and cancellation guards",()=>{
  const pending=item("p","patch",{changes:{},success:null,visualizationActivities:[{}]});
  assert.deepEqual(getSourceExpandableGroupRows([pending]),[]);
  assert.equal(isSourceGroupRowVisible(pending,{hasRenderableVisualization:()=>true}),true);
  assert.equal(isSourceGroupRowVisible(pending,{hasRenderableVisualization:()=>true,isTurnCancelled:true}),false);
  assert.equal(isSourceGroupRowVisible({...pending,success:false},{hasRenderableVisualization:()=>true}),false);
});
test("rk suppresses groups consisting exclusively of hidden dynamic tools",()=>{
  const d=item("dynamic","dynamic-tool-call");
  assert.deepEqual(getSourceExpandableGroupRows([d],{isHiddenDynamicTool:()=>true}),[]);
  assert.equal(getSourceExpandableGroupRows([d],{isHiddenDynamicTool:()=>false}).length,1);
  assert.equal(getSourceExpandableGroupRows([d,item("command")],{isHiddenDynamicTool:()=>true}).length,2);
});

import {test} from "node:test";
import assert from "node:assert/strict";
import {projectSourceRepeatedActivityRows} from "../build/SourceRepeatedActivityGroups.js";
const mk=(id,extra={})=>({
  id,type:"mcp-tool-call",grouping:"groupable",completed:true,source:null,
  invocation:{server:"files",tool:"search"},result:{type:"success"},
  functionName:"files.search",pluginId:"plugin",appContext:{connectorId:"abc",linkId:"link"},
  invocationResourceUri:"file://resource",...extra
});
const host={getGrouping:item=>item.grouping==="groupable"?"groupable":"standalone",
 canGroupMcpResult:item=>item.safeGroup!==false,
 getToolDisplaySignature:item=>item.displaySignature??"Files search"};
const project=x=>projectSourceRepeatedActivityRows(x,host);
test("Je groups adjacent completed matching successful calls, preserving source order",()=>{
 const items=[mk("a"),mk("b"),mk("c")],rows=project(items);
 assert.equal(rows.length,1);assert.equal(rows[0].kind,"mcp-tool-call");
 assert.deepEqual(rows[0].items.map(x=>x.id),["a","b","c"]);
 assert.equal(items.length,3);assert.equal(items[0].id,"a");
});
test("Je separates calls across pending, failed, approval and private result guard",()=>{
 for(const bad of [
   {completed:false},{result:{type:"error"}},
   {automaticApprovalReviews:[{status:"approved"}]},{source:{kind:"app"}},
   {invocation:{server:"computer-use",tool:"search"}},{safeGroup:false},
 ]){
   const rows=project([mk("a"),mk("barrier",bad),mk("b")]);
   assert.equal(rows.length,3,JSON.stringify(bad));
   assert.deepEqual(rows.map(r=>r.kind),["single","single","single"]);
 }
});
test("Je respects full MCP identity, including host toolDisplay result",()=>{
 for(const extra of [
  {invocation:{server:"files",tool:"other"}},{functionName:"other"},{pluginId:"different"},
  {appContext:{connectorId:"different",linkId:"link"}},{invocationResourceUri:"different"},
  {displaySignature:"different"},{grouping:"standalone"},
 ]){
  assert.equal(project([mk("a"),mk("b",extra)]).length,2,JSON.stringify(extra));
 }
});
test("Je resets across standalone rows and preserves later repeated pair",()=>{
 const rows=project([mk("a"),mk("b"),{id:"cmd",type:"exec",grouping:"groupable"},mk("c"),mk("d")]);
 assert.deepEqual(rows.map(r=>r.items.map(i=>i.id)),[["a","b"],["cmd"],["c","d"]]);
});
test("Je groups external events by source unless subscription ended",()=>{
 const event=(id,extra={})=>({id,type:"external-event",grouping:"groupable",
   sourceKey:"slack",sourceLabel:"Slack",...extra});
 const rows=project([event("e1"),event("e2"),event("e3",{subscriptionEnded:true}),
   event("e4"),event("e5",{sourceLabel:"GitHub"})]);
 assert.deepEqual(rows.map(r=>r.items.map(i=>i.id)),[["e1","e2"],["e3"],["e4"],["e5"]]);
 assert.equal(rows[0].kind,"external-event");
});
test("Je requires host verification of private MCP result predicate",()=>{
 const noSafety={...host,canGroupMcpResult:()=>false};
 assert.deepEqual(projectSourceRepeatedActivityRows([mk("a"),mk("b")],noSafety).map(r=>r.kind),["single","single"]);
});

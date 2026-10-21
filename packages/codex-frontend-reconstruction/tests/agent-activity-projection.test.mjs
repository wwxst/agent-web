import assert from "node:assert/strict";
import test from "node:test";
import { getAgentActivityCollapseEligibility, projectAgentActivityCollapse } from "../build/AgentActivityProjection.js";

const single = (key, type, extra = {}) => ({kind:"standalone", key, item:{id:key,type,...extra}});
const group = (key,...items) => ({kind:"group",key,items:items.map((type,i)=>({type,id:`${key}-${i}`}))});
const base = (units, rest={})=>({units,hasFinalAssistantStarted:true,isTurnCancelled:false,...rest});

test("Lk: no final assistant means no auto-collapse unless explicitly allowed",()=>{
 assert.deepEqual(getAgentActivityCollapseEligibility({hasFinalAssistantStarted:false,isTurnCancelled:false,hasRenderableAgentItems:true}),{shouldAllowCollapse:false,isCollapsed:false});
 assert.deepEqual(getAgentActivityCollapseEligibility({hasFinalAssistantStarted:false,isTurnCancelled:false,hasRenderableAgentItems:true,allowCollapseBeforeFinal:true}),{shouldAllowCollapse:true,isCollapsed:true});
});
test("Lk: cancelling a turn prevents auto-collapse after final assistant starts",()=>{
 assert.equal(getAgentActivityCollapseEligibility({hasFinalAssistantStarted:true,isTurnCancelled:true,hasRenderableAgentItems:true}).isCollapsed,false);
});
test("Lk: no renderable entries means no toggle",()=>{
 assert.equal(projectAgentActivityCollapse(base([])).canToggle,false);
});
test("Lk: forceExpanded and disableCollapse do not hide activities",()=>{
 for(const flag of ["forceExpanded","disableCollapse"]){const units=[single("a","exec")];const x=projectAgentActivityCollapse(base(units,{[flag]:true}));assert.equal(x.isCollapsed,false);assert.deepEqual(x.expandedUnits,units)}
});
test("Lk: persisted collapsed state overrides auto-collapse",()=>{
 const p=projectAgentActivityCollapse(base([single("x","exec")],{persistedCollapsed:false}));assert.equal(p.isCollapsed,false);assert.equal(p.canToggle,true);
});
test("Lk: preventAutoCollapse starts expanded and can still be toggled",()=>{
 const p=projectAgentActivityCollapse(base([single("x","exec")],{preventAutoCollapse:true}));assert.equal(p.isCollapsed,false);assert.equal(p.canToggle,true);
});
test("kk: worked-for leaves the unit list and appears in summary metadata",()=>{
 const x=projectAgentActivityCollapse(base([single("duration","worked-for",{durationMs:3000}),single("cmd","exec")]));
 assert.equal(x.workedForItem.id,"duration");assert.deepEqual(x.collapsibleUnits.map(u=>u.key),["cmd"]);assert.equal(x.collapsedMessageCount,1);
});
test("kk: leading realtime-transcript remains before toggle",()=>{
 const x=projectAgentActivityCollapse(base([single("voice","realtime-transcript"),single("exec","exec"),single("trailing","realtime-transcript")]));
 assert.deepEqual(x.preToggleUnits.map(u=>u.key),["voice"]);
 assert.deepEqual(x.persistentUnits.map(u=>u.key),["trailing"]);
 assert.deepEqual(x.collapsibleUnits.map(u=>u.key),["exec"]);
});
test("kk: grouped units count every grouped child and are not implicitly persistent",()=>{
 const x=projectAgentActivityCollapse(base([group("tools","exec","patch","web-search")]));
 assert.equal(x.collapsedMessageCount,3);assert.equal(x.persistentUnits.length,0);
});
test("Ak: incomplete user input response is persistent",()=>{
 const x=projectAgentActivityCollapse(base([single("approval","user-input-response",{completed:false}),single("exec","exec")]));
 assert.deepEqual(x.persistentUnits.map(u=>u.key),["approval"]);
});
test("Ak: unresolved user message stays persistent when no later final answer",()=>{
 const x=projectAgentActivityCollapse(base([single("unsent","user-message",{deliveryStatus:"not-sent"}),single("normal","user-message")],{hasFollowingFinalAnswer:true}));
 assert.deepEqual(x.persistentUnits.map(u=>u.key),["unsent"]);
});
test("Ak: unknown private MCP and dynamic predicates do not fabricate persistence",()=>{
 const x=projectAgentActivityCollapse(base([single("mcp","mcp-tool-call"),single("dynamic","dynamic-tool-call"),single("assistant","assistant-message")]));
 assert.equal(x.persistentUnits.length,0);
});
test("Ak: private predicates only persist units when injected by host",()=>{
 const x=projectAgentActivityCollapse(base([single("mcp","mcp-tool-call"),single("dynamic","dynamic-tool-call")],{adapters:{hasPersistentMcpToolCall:()=>true,hasPersistentDynamicToolCall:()=>true}}));
 assert.deepEqual(x.persistentUnits.map(u=>u.key),["mcp","dynamic"]);
});
test("Rk: only a context-compaction unit cannot become an empty disclosure",()=>{
 const x=projectAgentActivityCollapse(base([single("compact","context-compaction")]));
 assert.equal(x.canToggle,false);assert.equal(x.isCollapsed,false);
});
test("Rk: when collapse is unavailable full unit order is preserved",()=>{
 const units=[single("a","exec"),single("b","patch")];const x=projectAgentActivityCollapse(base(units,{hasFinalAssistantStarted:false}));
 assert.deepEqual(x.expandedUnits,units);assert.equal(x.isCollapsed,false);
});

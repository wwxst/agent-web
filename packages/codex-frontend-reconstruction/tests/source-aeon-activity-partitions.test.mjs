import test from "node:test";
import assert from "node:assert/strict";
import {partitionSourceAeonActivity} from "../build/SourceAeonActivityPartitions.js";
import {buildConversationMessageRenderPlan} from "../build/ConversationMessageRenderPlan.js";

const mk=(id,type="exec",extra={})=>({type,id,...extra});
const resolve=item=>item.taskResult??null;
const run=(items,isAeonThread)=>partitionSourceAeonActivity({items,isAeonThread,resolveMcpTask:resolve});

test("Smn leaves a non-Aeon thread in one activity partition without resolving tasks",()=>{
 const items=[mk("a"),mk("task","mcp-tool-call",{taskResult:{kind:"automation"}}),mk("b")];
 const out=partitionSourceAeonActivity({items,isAeonThread:false,resolveMcpTask:()=>{throw Error("should not resolve")}});
 assert.deepEqual(out,[{type:"activity",items}]);
 assert.notEqual(out[0].items,items);
 assert.deepEqual(run([],false),[]);
 assert.deepEqual(run([],true),[]);
});

test("Smn splits Aeon tasks and preserves consecutive ordinary/unsupported MCP calls",()=>{
 const original=[
  mk("a"),mk("b","mcp-tool-call"),
  mk("task","mcp-tool-call",{taskResult:{type:"chatgpt-automation",id:"schedule-1"}}),
  mk("c","mcp-tool-call",{taskResult:null}),mk("d"),
  mk("task2","mcp-tool-call",{taskResult:{type:"attached-threads",threads:[{threadId:"thread-1"}]}}),
  mk("e"),
 ];
 const before=structuredClone(original);
 const out=run(original,true);
 assert.deepEqual(out.map(x=>x.type),["activity","result","activity","result","activity"]);
 assert.deepEqual(out.filter(x=>x.type==="activity").map(x=>x.items.map(y=>y.id)),[["a","b"],["c","d"],["e"]]);
 assert.deepEqual(out.filter(x=>x.type==="result").map(x=>x.result.type),["chatgpt-automation","attached-threads"]);
 assert.deepEqual(original,before);
});

test("Smn never resolves non-MCP types or joins adjacent task results",()=>{
 const out=partitionSourceAeonActivity({items:[
  mk("non-mcp","exec",{taskResult:{id:"should-stay"}}),
  mk("task1","mcp-tool-call",{taskResult:{id:"one"}}),
  mk("task2","mcp-tool-call",{taskResult:{id:"two"}}),
 ],isAeonThread:true,resolveMcpTask:resolve});
 assert.deepEqual(out.map(x=>x.type),["activity","result","result"]);
 assert.deepEqual(out[0].items.map(x=>x.id),["non-mcp"]);
});

test("rs uses the Smn host context, stable index keys and non-follow task rows",()=>{
 const blocks=[{type:"agent-activity",key:"activity",items:[
   mk("first"),mk("schedule","mcp-tool-call",{taskResult:{id:"schedule"}}),mk("last"),
 ]}];
 const plan=isAeonThread=>buildConversationMessageRenderPlan(blocks,
  {isTurnInProgress:false,isAeonThread,includeTurnExtras:false},{
   partitionActivities:(items,{isAeonThread})=>run(items,isAeonThread),
   getSpecialActivityResult:resolve,
   hasPersistentActivity:()=>true,
  });
 const aeon=plan(true);
 assert.deepEqual(aeon.nodes.map(n=>[n.kind,n.key]),[
  ["activity-group","activity:0"],["activity-result","activity:1"],["activity-group","activity:2"],
 ]);
 assert.equal(aeon.nodes[1].canOwnLatestTurnFollowContent,false);
 assert.deepEqual(plan(false).nodes.map(n=>[n.kind,n.key]),[["activity-group","activity"]]);
});

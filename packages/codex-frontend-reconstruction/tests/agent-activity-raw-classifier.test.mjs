import {test} from "node:test";
import assert from "node:assert/strict";
import {classifyRawActivityItem as xe,classifyExplorationActivityGroup as we,isReadOnlyRemoteCurl as curl}
  from "../build/AgentActivityRawClassifier.js";
import {aggregateAgentActivityUnits as Le} from "../build/AgentActivityAggregate.js";
const exec=(cmd,done=true,extra={})=>({type:"exec",parsedCmd:{type:"unknown",cmd,isFinished:done},...extra});
test("xe completed and running exec",()=>{
  assert.deepEqual(xe(exec("ls")),{type:"exec",isInProgress:false});
  assert.deepEqual(xe(exec("ls",false)),{type:"exec",isInProgress:true});
  assert.deepEqual(xe({type:"exec"}),{type:"other"});
});
test("xe source loaded read exclusion uses private host predicate",()=>{
 const raw={type:"exec",cwd:"/repo",parsedCmd:{type:"read",path:"skills.md",isFinished:false}};
 assert.equal(xe(raw).type,"exec");
 assert.equal(xe(raw,{isLoadedToolRead:(_cmd,cwd)=>cwd==="/repo"}).type,"other");
});
test("xe mkdir command anchoring and visualization priority",()=>{
 assert.equal(xe(exec(" mkdir -p src",false)).createsFolder,true);
 assert.equal(xe(exec("echo hi && mkdir tmp")).createsFolder,undefined);
 assert.equal(xe(exec("mkdir img"),{classifyVisualizationCommand:()=> "create"}).visualizationActivityKind,"create");
});
test("D remote curl filters local hosts and mutating flags",()=>{
 assert.equal(curl("curl https://example.org"),true);
 for(const cmd of ["curl http://localhost:3000","curl http://127.1/a","echo curl https://example.org",
    "curl -X POST https://example.org","curl --request=DELETE https://example.org",
    "curl -d a https://example.org","curl --data-raw=x https://example.org",
    "curl --json x https://example.org","curl -F x https://example.org"])
   assert.equal(curl(cmd),false,cmd);
});
test("xe only counts successful completed or still-running remote curl",()=>{
 assert.equal(xe(exec("curl https://example.org",false)).searchesWeb,true);
 assert.equal(xe(exec("curl https://example.org",true,{output:{exitCode:0}})).searchesWeb,true);
 assert.equal(xe(exec("curl https://example.org",true,{output:{exitCode:1}})).searchesWeb,undefined);
});
test("O only propagates denied and timedOut reviews",()=>{
 const reviews=[{id:"x",status:"approved"},{id:"y",status:"denied"},{id:"z",status:"timedOut"}];
 assert.deepEqual(xe(exec("ls",true,{automaticApprovalReviews:reviews})).automaticApprovalReviewFailures,reviews.slice(1));
});
test("Te stopped pending add and running add",()=>{
 const patch={type:"patch",changes:{"file.ts":{type:"add",content:"one\ntwo\n"}},success:null};
 assert.deepEqual(xe(patch,{}, {isTurnCancelled:true}).stoppedCreatedPaths,["file.ts"]);
 assert.equal(xe(patch,{}, {isTurnCancelled:true}).runningCreatedLineCount,0);
 const running=xe(patch,{getPatchLineChanges:()=>({added:2,deleted:1})});
 assert.deepEqual(running.runningCreatedPaths,["file.ts"]);
 assert.equal(running.runningCreatedLineCount,2);
 assert.equal(running.changedLineCount,3);
});
test("Te edit/delete and private visualization path callback",()=>{
 const p=xe({type:"patch",changes:{x:{type:"delete"},y:{type:"update"}},success:true,
   visualizationActivities:[{path:"./viz.svg",kind:"update"}]},{normalizePath:x=>x.slice(2)});
 assert.deepEqual(p.deletedPaths,["x"]);assert.deepEqual(p.editedPaths,["y"]);
 assert.deepEqual(p.visualizationActivity,{activities:[{path:"viz.svg",kind:"update"}],isInProgress:false});
});
test("Te empty failed visualization is omitted",()=>{
 assert.equal(xe({type:"patch",changes:{},success:false,
   visualizationActivities:[{path:"x",kind:"create"}]}).type,"other");
});
test("xe MCP source and hide/keep-expanded overrides are host-controlled",()=>{
 const raw={type:"mcp-tool-call",completed:false};
 assert.equal(xe(raw,{isHiddenMcpCall:()=>true}).type,"other");
 assert.equal(xe(raw,{shouldKeepMcpExpanded:()=>true},{keepMcpAppCallsExpandedByDefault:true}).type,"other");
 assert.deepEqual(xe(raw,{resolveMcpSource:()=>({key:"app"})}),
   {type:"mcp-tool-call",isInProgress:true,source:{key:"app"}});
});
test("xe external-event complete MCP source from host only",()=>{
 assert.deepEqual(xe({type:"external-event"}),{type:"mcp-tool-call",isInProgress:false});
 assert.equal(xe({type:"external-event"},{resolveExternalEventSource:()=>({key:"remote"})}).source.key,"remote");
});
test("xe automatic approvals and direct web search",()=>{
 assert.equal(xe({type:"automatic-approval-review",status:"approved",id:"a"}).type,"other");
 assert.equal(xe({type:"automatic-approval-review",status:"denied",id:"a"}).status,"denied");
 assert.deepEqual(xe({type:"web-search",completed:false}),{type:"web-search",count:1,runningCount:1});
});
test("known non-tools never invoke private classifier",()=>{
 assert.equal(xe({type:"assistant-message"},{classifyPrivateEvent:()=>({type:"exec"})}).type,"other");
 assert.equal(xe({type:"subagent-activity"}).type,"other");
 assert.equal(xe({type:"new-private"},{classifyPrivateEvent:()=>({type:"exec"})}).type,"exec");
});
test("we grouped exploration paths, running counts and approval extraction",()=>{
 const rows=[
  {type:"exec",parsedCmd:{type:"search",isFinished:false}},
  {type:"exec",parsedCmd:{type:"list_files",isFinished:true}},
  {type:"exec",cwd:"/repo",parsedCmd:{type:"read",path:"a.md",isFinished:false}},
  {type:"exec",parsedCmd:{type:"read",name:"tool.md",isFinished:true},
   automaticApprovalReviews:[{id:"r",status:"denied"}]},
 ];
 const x=we(rows,{resolveReadPath:(p,cwd)=>[cwd??".",p].join("/"),
   isLoadedToolRead:cmd=>cmd.name==="tool.md"});
 assert.deepEqual([x.searchCount,x.runningSearchCount,x.listCount],[1,1,1]);
 assert.deepEqual(x.readPaths,["/repo/a.md"]);assert.deepEqual(x.loadedToolPaths,["./tool.md"]);
 assert.equal(x.automaticApprovalReviewFailures[0].status,"denied");
});
test("xe -> Le aggregation integrates commands, web searches and approvals",()=>{
 const result=Le([xe(exec("mkdir repo",false)),xe({type:"web-search",completed:false}),
   xe({type:"automatic-approval-review",id:"r",status:"timedOut"})]);
 assert.equal(result.commandCount,1);assert.equal(result.runningFolderCreationCommandCount,1);
 assert.equal(result.runningWebSearchCount,0);assert.equal(result.runningWebSearchCount,0);
 assert.equal(result.webSearchCount,1);assert.equal(result.timedOutRequestCount,1);
});

import {test} from "node:test";
import assert from "node:assert/strict";
import {projectToolActivityDetail as project,getToolPatchStatus as status,
 getToolActivityHistoryItemId as id} from "../build/ToolActivityDetailModel.js";
const exec=(type,finished,more={})=>({type:"exec",parsedCmd:{type,isFinished:finished,cmd:"echo hi"},...more});
test("HO history source IDs and fallback call IDs",()=>{
 assert.equal(id({type:"assistant-message",requestUserInputAsync:{sourceItemId:"q"}}),"q");
 assert.equal(id({type:"exec",sourceItemId:"s",commandExecutionItemId:"e"}),"s");
 assert.equal(id({type:"exec",commandExecutionItemId:"e",callId:"c"}),"e");
 assert.equal(id({type:"patch",callId:"p"}),"p");
 assert.equal(id({type:"generated-image",id:"image"}),"image");
 assert.equal(id({type:"unknown",id:"x"}),null);
});
test("SO work-mode route excludes tool unless private override",()=>{
 const item=exec("unknown",true);
 assert.deepEqual(project(item,{isWorkMode:true}),{kind:"hidden",reason:"work-mode"});
 assert.equal(project(item,{isWorkMode:true,renderToolActivityInWorkMode:true}).kind,"exec");
});
test("SO running read/search/list_files suppressed without private NO predicate",()=>{
 for(const type of ["read","search","list_files"])
  assert.deepEqual(project(exec(type,false)),{kind:"hidden",reason:"running-exploration"});
 assert.equal(project(exec("read",false),{isMeaningfulRead:()=>true}).leaf,"read");
});
test("xC delegates special command variants",()=>{
 for(const type of ["read","search","list_files"])
  assert.equal(project(exec(type,true)).leaf,type);
 assert.equal(project(exec("unknown",true)).leaf,"command");
});
test("xC background terminal flags and interruption",()=>{
 const run=project(exec("unknown",false));
 assert.equal(run.isBackgroundTerminalRunning,true);
 const done=project(exec("unknown",true,{processId:2}));
 assert.equal(done.isBackgroundTerminalFinished,true);
 assert.equal(project(exec("unknown",true,{processId:2}),{isTurnInProgress:true}).isBackgroundTerminalFinished,false);
 assert.equal(project(exec("unknown",true,{executionStatus:"interrupted"})).wasInterrupted,true);
});
test("xC declined review forces generic command leaf",()=>{
 const a=project(exec("read",true),{isAutoReviewDeclined:()=>true});
 assert.equal(a.wasDeclinedByAutoReview,true);
 assert.equal(a.leaf,"command");
});
test("PT status priority",()=>{
 const row={type:"patch",changes:{a:{}}};
 assert.equal(status({...row,success:true},{isAutoReviewDeclined:()=>true}),"auto-review-declined");
 assert.equal(status({...row,success:true}),"applied");
 assert.equal(status({...row,success:false}),"rejected");
 assert.equal(status({...row,approvalRequestId:"p"}),"pending");
 assert.equal(status(row,{isTurnCancelled:true}),"stopped");
 assert.equal(status(row),"streaming");
});
test("PT suppresses empty patches unless visualization recognized",()=>{
 assert.deepEqual(project({type:"patch",changes:{}}),{kind:"hidden",reason:"empty-patch"});
 assert.equal(project({type:"patch",changes:{}},{hasVisualizationActivity:()=>true}).showVisualization,true);
 assert.equal(project({type:"patch",changes:{},success:false},{hasVisualizationActivity:()=>true}).kind,"hidden");
});
test("PT passes showDiffDetails and streaming states",()=>{
 const row={type:"patch",changes:{a:{}},approvalRequestId:"p"};
 const plan=project(row,{isWorkMode:true,renderToolActivityInWorkMode:true,hasVisualizationActivity:()=>true});
 assert.equal(plan.kind,"patch");assert.equal(plan.status,"pending");
 assert.equal(plan.showDiffDetails,false);assert.equal(plan.isVisualizationInProgress,true);
 assert.equal(project(row,{isWorkMode:true}).kind,"hidden");
});
test("SO delegates MCP/reviews/external/dynamic/web to distinct host leaves",()=>{
 for(const type of ["mcp-tool-call","external-event","dynamic-tool-call","automatic-approval-review","web-search"])
 assert.deepEqual(project({type}),{kind:"host-leaf",leaf:type});
});
test("SO ignores placeholder kinds and leaves extensions alone",()=>{
 for(const type of ["userInput","plan-implementation","proposed-plan"])
  assert.equal(project({type}).kind,"hidden");
 assert.equal(project({type:"custom"}).kind,"fallback");
 assert.equal(project({type:"exec"}).kind,"fallback");
});
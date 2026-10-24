import test from "node:test";
import assert from "node:assert/strict";
import {isSourcePreGroupExecSuppressed} from "../build/SourcePreGroupExecFilter.js";
import {groupSourceAgentActivityUnits} from "../build/AgentActivityUnitGrouping.js";
const cmd=(id,props={})=>({type:"exec",id,grouping:"groupable",
 parsedCmd:{type:"unknown",cmd:"render",isFinished:true},...props});
const patch=(id,visualizationActivities)=>({id,type:"patch",grouping:"groupable",
 visualizationActivities});
const host={
 isSuccessfulExecution:item=>item.executionStatus==="completed",
 classifyVisualizationCommand:item=>item.demoVisualization ?? null,
 isLoadedToolRead:item=>item.demoLoadedRead===true,
};
test("fr suppresses completed visualization exec only with adjacent visualized patch",()=>{
 const exec=cmd("command",{executionStatus:"completed",demoVisualization:"create"});
 assert.equal(isSourcePreGroupExecSuppressed(exec,patch("p",[{path:"x"}]),host),true);
 assert.equal(isSourcePreGroupExecSuppressed(exec,patch("p",[]),host),false);
 assert.equal(isSourcePreGroupExecSuppressed(exec,cmd("other"),host),false);
 assert.equal(isSourcePreGroupExecSuppressed({...exec,executionStatus:"interrupted"},patch("p",[{path:"x"}]),host),false);
 assert.equal(isSourcePreGroupExecSuppressed({...exec,demoVisualization:null},patch("p",[{path:"x"}]),host),false);
 assert.equal(isSourcePreGroupExecSuppressed(exec,patch("p",[{path:"x"}]),{}),false);
});
test("fr suppresses only host-identified loaded-tool reads",()=>{
 const read=cmd("read",{parsedCmd:{type:"read",path:"skill.md",isFinished:true}});
 assert.equal(isSourcePreGroupExecSuppressed(read,undefined,host),false);
 assert.equal(isSourcePreGroupExecSuppressed({...read,demoLoadedRead:true},undefined,host),true);
 assert.equal(isSourcePreGroupExecSuppressed({...read,demoLoadedRead:true},undefined,{}),false);
 assert.equal(isSourcePreGroupExecSuppressed({...read,type:"patch"},undefined,host),false);
});
test("Ke applies fr before classification preserving original source positions",()=>{
 const items=[
  cmd("visible-start"),
  cmd("hidden-visual",{executionStatus:"completed",demoVisualization:"update"}),
  patch("patch-with-visual",[{path:"main.ts"}]),
  cmd("hidden-read",{parsedCmd:{type:"read",path:"skill.md",isFinished:true},demoLoadedRead:true}),
  cmd("visible-end",{grouping:"standalone"}),
 ];
 const units=groupSourceAgentActivityUnits(items,{
  getGrouping:item=>item.grouping,
  shouldSkipBeforeGrouping:(item,next)=>isSourcePreGroupExecSuppressed(item,next,host),
 });
 assert.deepEqual(units.map(u=>u.kind),["group","standalone"]);
 assert.deepEqual(units[0].items.map(x=>x.id),["visible-start","patch-with-visual"]);
 assert.equal(units[1].item.id,"visible-end");
 assert.deepEqual(items.map(i=>i.id),["visible-start","hidden-visual","patch-with-visual","hidden-read","visible-end"]);
});

import test from "node:test";
import assert from "node:assert/strict";
import { projectSourceTurnTranscriptBlocks } from "../build/SourceTurnTranscriptBlocks.js";
const deps={
  isAutomationNamespaceTool:()=>false,parseUpNextStatus:()=>undefined,
  getCloudAutomation:()=>null,
  getActivityMetadata:item=>item.grouping==="groupable"?{grouping:"groupable"}:null,
  canGroupActivityWithNext:(_item,next)=>next?.grouping==="groupable",
};
const item=(id,type,extra={})=>({id,type,completed:true,...extra});
test("one turn projects commentary, tools, and final response without a second virtual turn",()=>{
  const blocks=projectSourceTurnTranscriptBlocks({turnId:"t1",status:"completed",mode:"latest",dependencies:deps,items:[
    item("u","user-message",{content:"do the task"}),
    item("thought","assistant-message",{phase:"commentary",content:"Checking sources"}),
    item("c1","exec",{grouping:"groupable",parsedCmd:{type:"unknown",isFinished:true,cmd:"pwd"}}),
    item("p1","patch",{grouping:"groupable",success:true,changes:{"src/a.ts":{type:"update"}}}),
    item("final","assistant-message",{phase:"final_answer",content:"Done"}),
  ]});
  assert.deepEqual(blocks.map(b=>b.type),["user-message","agent-activity","assistant-message"]);
  assert.deepEqual(blocks[1].items.map(i=>i.id),["thought","c1","p1"]);
  assert.equal(blocks[2].item.id,"final");
  assert.equal(blocks[1].key,"t1:agent-activity");
});
test("source latest commentary keeps only current commentary from an updating run",()=>{
  const blocks=projectSourceTurnTranscriptBlocks({turnId:"t2",status:"in_progress",mode:"latest",dependencies:deps,items:[
    item("old","assistant-message",{phase:"commentary",content:"Old step"}),
    item("new","assistant-message",{phase:"commentary",content:"New step",completed:false}),
    item("c1","exec",{grouping:"groupable",parsedCmd:{type:"unknown",isFinished:false,cmd:"git status"}}),
  ]});
  assert.equal(blocks[0].type,"agent-activity");
  assert.deepEqual(blocks[0].items.map(i=>i.id),["new","c1"]);
  assert.equal(blocks.some(b=>b.type==="assistant-message"),false);
});
test("source group start markers from existing split model survive projection",()=>{
  const blocks=projectSourceTurnTranscriptBlocks({turnId:"t3",status:"completed",mode:"latest",dependencies:deps,items:[
    item("comment","assistant-message",{phase:"commentary",content:"Found it"}),
    item("one","exec",{grouping:"groupable",parsedCmd:{type:"unknown",isFinished:true,cmd:"ls"}}),
    item("two","exec",{grouping:"groupable",parsedCmd:{type:"unknown",isFinished:true,cmd:"cat file"}}),
    item("final","assistant-message",{phase:"final_answer",content:"Done"}),
  ]});
  assert.equal(blocks[0].type,"agent-activity");
  assert.ok(blocks[0].items.every(i=>i.id));
});

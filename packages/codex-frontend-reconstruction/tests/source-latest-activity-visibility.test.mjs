import test from "node:test";
import assert from "node:assert/strict";
import {
 filterSourceLatestActivityUnits,isSourceMeaningfulAssistant,
} from "../build/SourceLatestActivityVisibility.js";

const single=(id,type="assistant-message",props={})=>({
 kind:"standalone",key:id,item:{type,id,...props},
});
const group=(id,items)=>({kind:"group",key:id,items});

test("qe drops completed groups while retaining standalone messages",()=>{
 const input=[single("blank","assistant-message",{completed:false,content:"  "}),
  group("finished",[{type:"exec",parsedCmd:{isFinished:true}}]),
  single("answer","assistant-message",{completed:true,content:"Done"})];
 const out=filterSourceLatestActivityUnits(input,false);
 assert.deepEqual(out.map(x=>x.key),["blank","answer"]);
 assert.deepEqual(filterSourceLatestActivityUnits(input,true).map(x=>x.key),["blank","answer"]);
});

test("qe preserves the final completed group only when Gi allows it",()=>{
 const input=[
  group("earlier",[{type:"exec",parsedCmd:{isFinished:true}}]),
  single("empty","assistant-message",{content:"\n",completed:false}),
  group("latest",[{type:"exec",parsedCmd:{isFinished:true}}]),
  single("trailing","assistant-message",{content:"\t",completed:false}),
 ];
 assert.deepEqual(filterSourceLatestActivityUnits(input,true).map(x=>x.key),["empty","latest","trailing"]);
 assert.deepEqual(filterSourceLatestActivityUnits(input,false).map(x=>x.key),["empty","trailing"]);
 assert.deepEqual(input.map(x=>x.key),["earlier","empty","latest","trailing"]);
});

test("qe always retains active groups regardless of Gi, except interrupted exec",()=>{
 const input=[
  group("running",[{type:"exec",executionStatus:"inProgress",parsedCmd:{isFinished:false}}]),
  group("interrupted",[{type:"exec",executionStatus:"interrupted",parsedCmd:{isFinished:false}}]),
  group("pending-approval",[{type:"automatic-approval-review",status:"inProgress"}]),
  group("pending-patch",[{type:"patch",success:null}]),
  single("done","assistant-message",{completed:true}),
 ];
 assert.deepEqual(filterSourceLatestActivityUnits(input,false).map(x=>x.key),
  ["running","pending-approval","pending-patch","done"]);
});

test("original F$n considers text, completion and structured output",()=>{
 assert.equal(isSourceMeaningfulAssistant({type:"assistant-message",content:"  "}),false);
 assert.equal(isSourceMeaningfulAssistant({type:"assistant-message",content:"Hello"}),true);
 assert.equal(isSourceMeaningfulAssistant({type:"assistant-message",completed:true}),true);
 assert.equal(isSourceMeaningfulAssistant({type:"assistant-message",structuredOutput:{}}),true);
});

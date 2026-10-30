import test from "node:test";
import assert from "node:assert/strict";
import {
 projectSourceTextFormElicitation,sourceTextFormValidate,
 sourceTextFormWireResponse,sourceTextFormReply,sourceFormFieldAnswer,
} from "../build/SourceTextFormElicitationModel.js";
import {createSourceConversationHostEventBridge}
 from "../build/SourceConversationHostEventBridge.js";
const ids={hostId:"host-a",conversationId:"frontend",requestId:"choices-1"};
const choices=[
 {const:"plan",title:"Planning",description:"Outline the steps"},
 {const:"code",title:"Coding",description:"Implement components"},
 {const:"review",title:"Review",description:"Inspect the results"},
];
const schema={type:"object",properties:{
 mode:{type:"string",title:"Working mode",oneOf:choices},
 tasks:{type:"array",title:"Needed tasks",items:{type:"string",oneOf:choices},
   minItems:1,maxItems:2,uniqueItems:true},
},required:["mode","tasks"]};
const form=()=>projectSourceTextFormElicitation({
 kind:"formElicitation",serverName:"MCP Host",message:"Choose tasks",schema,
},ids);

test("original Hn oneOf radio and array choices retain source titles, descriptions and constraints",()=>{
 const r=form();assert.ok(r);
 assert.deepEqual(r.fields.map(f=>f.type),["string","array"]);
 assert.deepEqual(r.fields[0].choices?.map(c=>[c.value,c.title,c.description]),
  choices.map(c=>[c.const,c.title,c.description]));
 assert.deepEqual([r.fields[1].minItems,r.fields[1].maxItems],[1,2]);
 const valid=sourceTextFormValidate(r,{mode:"code",tasks:["plan","review"]});
 assert.deepEqual(valid.invalidFieldNames,[]);
 assert.deepEqual(Object.entries(valid.content),[
  ["mode","code"],["tasks",["plan","review"]],
 ]);
 assert.deepEqual(sourceTextFormWireResponse(sourceTextFormReply(r,"accept",valid.content)),{
  action:"accept",content:valid.content,_meta:null,
 });
});
test("unknown or duplicated enum values, under/over selection and wrong wire shape fail closed",()=>{
 const r=form();
 for(const data of [
  {mode:"sneaky",tasks:["code"]},
  {mode:"plan",tasks:["sneaky"]},
  {mode:"plan",tasks:["plan","plan"]},
  {mode:"plan",tasks:[]},
  {mode:"plan",tasks:["plan","code","review"]},
  {mode:"plan",tasks:"plan"},
  {mode:["plan"],tasks:["code"]},
 ]){
  const out=sourceTextFormValidate(r,data);
  assert.equal(out.content,null);
  assert.ok(out.invalidFieldNames.length>0);
 }
 assert.deepEqual(sourceFormFieldAnswer(r.fields[1],undefined),
  {valid:false,answered:false});
});
test("unsupported custom options, items kinds and constraints never become working controls",()=>{
 const entry={kind:"formElicitation",serverName:"MCP",message:"Choose",
  schema:{type:"object",properties:{selection:{type:"string",oneOf:choices}}}};
 const change=field=>projectSourceTextFormElicitation({
  ...entry,schema:{type:"object",properties:{selection:field}},
 },ids);
 for(const field of [
  {type:"string",oneOf:[{const:"a",title:"A"}]},
  {type:"string",oneOf:[...choices,{const:"plan",title:"Duplicate"}]},
  {type:"string",oneOf:choices,format:"uri"},
  {type:"string",oneOf:choices,"x-openai-input":{userOptions:[]}},
  {type:"string",oneOf:choices.map(x=>({...x,icon:"fake"}))},
  {type:"array",items:{type:"number",oneOf:choices}},
  {type:"array",items:{type:"string",oneOf:choices},maxItems:0},
  {type:"array",items:{type:"string",oneOf:choices},minItems:3,maxItems:2},
  {type:"array",items:{type:"string",oneOf:choices},uniqueItems:false},
  {type:"array",items:{type:"string",oneOf:choices},contains:{const:"x"}},
  {type:"array",items:{type:"string",oneOf:choices},maxItems:30},
  {type:"boolean",oneOf:[{const:"true",title:"True"}]},
 ])assert.equal(change(field),null);
});
test("host draft preserves multi-choice array across unmount and rejects modified choices",()=>{
 const bridge=createSourceConversationHostEventBridge(),r=form();assert.ok(r);
 bridge.textFormDrafts.save(r,{fieldIndex:1,values:{
  mode:"code",tasks:["plan","review"],
 }});
 const stored=bridge.textFormDrafts.get(r);
 assert.equal(stored.fieldIndex,1);
 assert.deepEqual(stored.values.tasks,["plan","review"]);
 assert.equal(Object.isFrozen(stored.values.tasks),true);
 assert.throws(()=>bridge.textFormDrafts.save(r,{fieldIndex:1,values:{
  tasks:["sneaky"],
 }}),/invalid form draft field/);
 assert.throws(()=>bridge.textFormDrafts.save(r,{fieldIndex:1,values:{
  tasks:["plan","plan"],
 }}),/invalid form draft field/);
 bridge.publish({type:"elicitation-settled",query:{
  hostId:"host-a",threadId:"frontend",requestId:"choices-1",
 }});
 assert.equal(bridge.textFormDrafts.get(r),null);
 bridge.dispose();
});

import test from "node:test";
import assert from "node:assert/strict";
import {projectSourceTextFormElicitation,sourceTextFormValidate,sourceTextFormReply,sourceTextFormWireResponse}
 from "../build/SourceTextFormElicitationModel.js";
import {createSourceConversationHostEventBridge}
 from "../build/SourceConversationHostEventBridge.js";
const ids={hostId:"h",conversationId:"frontend",requestId:"suggest-1"};
const options=[{const:"build",title:"Build",description:"Compile"},{const:"review",title:"Review"}];
const input={kind:"formElicitation",serverName:"MCP",message:"Task",
 schema:{type:"object",properties:{task:{type:"string",title:"Task",minLength:3,maxLength:80,"x-openai-suggestions":options}},required:["task"]}};
const parse=x=>projectSourceTextFormElicitation(x,ids);
test("source ur/or suggestions permit a custom string; strict oneOf remains strict",()=>{
 const f=parse(input);assert.ok(f);
 assert.equal(f.fields[0].allowCustomChoice,true);
 assert.deepEqual(f.fields[0].choices?.map(x=>x.value),["build","review"]);
 for(const value of ["build","review","A custom request"]){
  const answer=sourceTextFormValidate(f,{task:value});
  assert.deepEqual(answer.invalidFieldNames,[]);
  assert.equal(answer.content.task,value);
 }
 for(const value of ["ab","","a\u0000b","x".repeat(81)])
  assert.deepEqual(sourceTextFormValidate(f,{task:value}).invalidFieldNames,["task"]);
 assert.deepEqual(sourceTextFormWireResponse(sourceTextFormReply(f,"accept",{task:"A custom request"})),
  {action:"accept",content:{task:"A custom request"},_meta:null});
 const strict=parse({...input,schema:{...input.schema,properties:{task:{
  type:"string",title:"Task",oneOf:options,
 }}}});
 assert.ok(strict);
 assert.equal(strict.fields[0].allowCustomChoice,undefined);
 assert.deepEqual(sourceTextFormValidate(strict,{task:"A custom request"}).invalidFieldNames,["task"]);
});
test("private input, pattern, malformed and duplicate suggestions fail closed",()=>{
 const cases=[
 {type:"string","x-openai-suggestions":[{const:"a",title:"A"},{const:"a",title:"B"}]},
 {type:"string","x-openai-suggestions":"bad"},
 {type:"string","x-openai-suggestions":options,pattern:"^[a-z]+$"},
 {type:"string","x-openai-suggestions":options,"x-openai-input":{kind:"file"}},
 {type:"string","x-openai-suggestions":options,oneOf:options},
 {type:"string","x-openai-suggestions":[...options,{const:"extra",title:"X",html:"unsafe"}]},
 ];
 for(const value of cases)assert.equal(parse({...input,schema:{
  ...input.schema,properties:{task:value},
 }}),null);
 const empty=parse({...input,schema:{...input.schema,properties:{task:{
  type:"string","x-openai-suggestions":[],
 }}}});
 assert.ok(empty);
 assert.deepEqual(empty.fields[0].choices,[]);
});
test("host-owned customDrafts preserve selected+text separately from active selection",()=>{
 const bridge=createSourceConversationHostEventBridge(),f=parse(input);assert.ok(f);
 bridge.textFormDrafts.save(f,{fieldIndex:0,values:{task:"build"},
  customDrafts:{task:{selected:false,text:"Draft stays"}}});
 const saved=bridge.textFormDrafts.get(f);
 assert.equal(saved.values.task,"build");
 assert.deepEqual(saved.customDrafts.task,{selected:false,text:"Draft stays"});
 assert.equal(Object.isFrozen(saved.customDrafts.task),true);
 bridge.textFormDrafts.save(f,{fieldIndex:0,values:{task:"Custom execution"},
  customDrafts:{task:{selected:true,text:"Custom execution"}}});
 for(const draft of [
  {fieldIndex:0,values:{task:"custom"},customDrafts:{wrong:{selected:true,text:"bad"}}},
  {fieldIndex:0,values:{task:"custom"},customDrafts:{task:{selected:true,text:"x".repeat(81)}}},
 ])
  assert.throws(()=>bridge.textFormDrafts.save(f,draft),/invalid custom form draft/);
 bridge.publish({type:"elicitation-settled",query:{hostId:"other",threadId:"frontend",requestId:"suggest-1"}});
 assert.equal(bridge.textFormDrafts.get(f).values.task,"Custom execution");
 bridge.publish({type:"elicitation-settled",query:{hostId:"h",threadId:"frontend",requestId:"suggest-1"}});
 assert.equal(bridge.textFormDrafts.get(f),null);
 bridge.dispose();
});

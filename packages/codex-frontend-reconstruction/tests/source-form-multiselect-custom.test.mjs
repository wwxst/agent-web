import test from "node:test";
import assert from "node:assert/strict";
import {
 projectSourceTextFormElicitation,sourceTextFormValidate,sourceFormFieldAnswer,
 sourceTextFormReply,sourceTextFormWireResponse,
} from "../build/SourceTextFormElicitationModel.js";
import {createSourceConversationHostEventBridge}
 from "../build/SourceConversationHostEventBridge.js";
const ids={hostId:"main-host",conversationId:"frontend",requestId:"multi-suggestions-1"};
const option=(value,title)=>({const:value,title,description:"Source recommendation"});
const schema={type:"object",properties:{
 work:{type:"array",title:"Work items",items:{type:"string",
  "x-openai-suggestions":[option("compile","Compile"),option("verify","Verify")],
  minLength:3,maxLength:48},
  minItems:1,maxItems:3,uniqueItems:true},
},required:["work"],additionalProperties:false};
const project=(data=schema)=>projectSourceTextFormElicitation({
 kind:"formElicitation",serverName:"MCP",message:"Select work",schema:data,
},ids);

test("original ur/or array suggestions safely project options, limits and text bounds",()=>{
 const request=project();assert.ok(request);
 const field=request.fields[0];
 assert.equal(field.type,"array");
 assert.equal(field.allowCustomChoice,true);
 assert.equal(field.itemMinLength,3);
 assert.equal(field.itemMaxLength,48);
 assert.deepEqual(field.choices.map(x=>x.value),["compile","verify"]);
 const already=sourceTextFormValidate(request,{work:["compile","Fix audit logs"]});
 assert.deepEqual(already.invalidFieldNames,[]);
 assert.deepEqual(Object.entries(already.content),[["work",["compile","Fix audit logs"]]]);
 const pending=sourceTextFormValidate(request,{work:["compile"]},{
   work:{text:"Check security",selected:true},
 });
 assert.deepEqual(Object.entries(pending.content),[["work",["compile","Check security"]]]);
 const source=sourceTextFormWireResponse(sourceTextFormReply(request,"accept",pending.content));
 assert.deepEqual(source,{action:"accept",content:pending.content,_meta:null});
});
test("array pending custom text joins only when selected+nonempty, never duplicated",()=>{
 const form=project(),f=form.fields[0];
 assert.deepEqual(sourceFormFieldAnswer(f,["compile"],{selected:false,text:"Ignored"}),
  {valid:true,answered:true,value:["compile"]});
 assert.deepEqual(sourceFormFieldAnswer(f,["compile"],{selected:true,text:""}),
  {valid:true,answered:true,value:["compile"]});
 assert.deepEqual(sourceFormFieldAnswer(f,[],{selected:true,text:"Custom row"}),
  {valid:true,answered:true,value:["Custom row"]});
 for(const [committed,pending] of [
  [["compile","verify"],{selected:true,text:"compile"}],
  [["compile","verify","One more"],{selected:true,text:"Another entry"}],
  [["compile"],{selected:true,text:"xy"}],
  [["compile","verify","One more"],{selected:true,text:"Too many"}],
  [["x"],{selected:false,text:""}],
  [["xx"],{selected:false,text:""}],
  [["compile","compile"],{selected:false,text:""}],
 ]){
  assert.equal(sourceFormFieldAnswer(f,committed,pending).valid,false);
 }
 assert.deepEqual(sourceTextFormValidate(form,{work:[]}).invalidFieldNames,["work"]);
});
test("unsupported array item schema never partially materializes or accepts user text",()=>{
 for(const bad of [
  {type:"string",oneOf:[option("compile","Compile"),option("verify","Verify")],
   "x-openai-suggestions":[option("foo","Foo")]},
  {type:"string","x-openai-suggestions":[option("compile","Compile")],format:"email"},
  {type:"string","x-openai-suggestions":[],maxLength:257},
  {type:"string","x-openai-suggestions":[],minLength:null},
  {type:"string","x-openai-suggestions":"invalid"},
  {type:"number","x-openai-suggestions":[option("compile","Compile")]},
 ]){
  assert.equal(project({...schema,properties:{work:{
   type:"array",items:bad,minItems:1,maxItems:3,uniqueItems:true,
  }}}),null);
 }
 // Strict oneOf has no Something else allowance, including a required array.
 const strict=project({...schema,properties:{work:{
  type:"array",items:{type:"string",oneOf:[option("compile","Compile"),option("verify","Verify")]},
  minItems:1,maxItems:2,uniqueItems:true,
 }}});
 assert.ok(strict);
 assert.equal(strict.fields[0].allowCustomChoice,undefined);
 assert.equal(sourceTextFormValidate(strict,{work:["unlisted"]}).content,null);
});
test("host-owned Ge custom drafts retain confirmed tags separately from pending editor and isolate hosts",()=>{
 const request=project(),bridge=createSourceConversationHostEventBridge();
 bridge.textFormDrafts.save(request,{fieldIndex:0,
  values:{work:["compile","Second custom"]},
  customDrafts:{work:{selected:true,text:"Third custom"}},
 });
 const saved=bridge.textFormDrafts.get(request);
 assert.deepEqual(saved.values.work,["compile","Second custom"]);
 assert.deepEqual(saved.customDrafts.work,{selected:true,text:"Third custom"});
 assert.ok(Object.isFrozen(saved.values.work));
 assert.ok(Object.isFrozen(saved.customDrafts.work));
 const final=sourceTextFormValidate(request,saved.values,saved.customDrafts);
 assert.deepEqual(Object.entries(final.content),[["work",[
  "compile","Second custom","Third custom",
 ]]]);
 assert.throws(()=>bridge.textFormDrafts.save(request,{
  fieldIndex:0,values:{work:["xx"]},customDrafts:{},
 }),/invalid form draft field/);
 assert.throws(()=>bridge.textFormDrafts.save(request,{
  fieldIndex:0,values:{work:["compile"]},
  customDrafts:{work:{selected:true,text:"x".repeat(49)}},
 }),/invalid custom form draft/);
 bridge.publish({type:"elicitation-settled",query:{
  hostId:"unrelated",threadId:"frontend",requestId:"multi-suggestions-1",
 }});
 assert.ok(bridge.textFormDrafts.get(request));
 bridge.publish({type:"elicitation-settled",query:{
  hostId:"main-host",threadId:"frontend",requestId:"multi-suggestions-1",
 }});
 assert.equal(bridge.textFormDrafts.get(request),null);
 bridge.dispose();
});

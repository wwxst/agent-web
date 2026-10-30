import test from "node:test";
import assert from "node:assert/strict";
import {createSourceConversationHostEventBridge}
 from "../build/SourceConversationHostEventBridge.js";
import {projectSourceTextFormElicitation}
 from "../build/SourceTextFormElicitationModel.js";
const request=(hostId="h",conversationId="frontend",requestId="form-1")=>
 projectSourceTextFormElicitation({
   kind:"formElicitation",serverName:"Project",message:"Questions",
   schema:{type:"object",properties:{
    subject:{type:"string",title:"Subject"},
    purpose:{type:"string",title:"Purpose"},
   },required:["subject"]},
 },{hostId,conversationId,requestId});
test("original Ge-like host-owned form draft survives virtualized row unmount and unrelated thread events",()=>{
 const bridge=createSourceConversationHostEventBridge();
 const form=request();assert.ok(form);
 bridge.textFormDrafts.save(form,{fieldIndex:1,values:{subject:"draft",purpose:"todo"}});
 const reloaded=bridge.textFormDrafts.get(form);
 assert.equal(reloaded.fieldIndex,1);
 assert.deepEqual(Object.entries(reloaded.values),[["subject","draft"],["purpose","todo"]]);
 const other=request("other","frontend","form-1");
 assert.equal(bridge.textFormDrafts.get(other),null);
 bridge.publish({type:"elicitation-settled",query:{
  hostId:"other",threadId:"frontend",requestId:"form-1",
 }});
 assert.equal(bridge.textFormDrafts.get(form).values.subject,"draft");
 bridge.publish({type:"elicitation-settled",query:{
  hostId:"h",threadId:"frontend",requestId:"form-1",
 }});
 assert.equal(bridge.textFormDrafts.get(form),null);
 bridge.dispose();
});
test("field schema changes invalidate old draft; clear-thread and disposal erase all data",()=>{
 const bridge=createSourceConversationHostEventBridge();
 const one=request("h","frontend","form-1");
 bridge.textFormDrafts.save(one,{fieldIndex:0,values:{subject:"old"}});
 const changed={...one,fields:[{name:"updated",title:"Updated",description:"",required:true}]};
 assert.equal(bridge.textFormDrafts.get(changed),null);
 assert.throws(()=>bridge.textFormDrafts.save(changed,{
  fieldIndex:0,values:{subject:"untrusted"},
 }),/unknown form draft field|invalid form draft field/);
 assert.throws(()=>bridge.textFormDrafts.save(one,{
  fieldIndex:12,values:{subject:"bad"},
 }),/invalid field index/);
 bridge.textFormDrafts.save(one,{fieldIndex:0,values:{subject:"keep"}});
 const other=request("h","review","form-1");
 bridge.textFormDrafts.save(other,{fieldIndex:0,values:{subject:"elsewhere"}});
 bridge.publish({type:"clear-thread",hostId:"h",threadId:"frontend"});
 assert.equal(bridge.textFormDrafts.get(one),null);
 assert.equal(bridge.textFormDrafts.get(other).values.subject,"elsewhere");
 bridge.dispose();
 assert.equal(bridge.textFormDrafts.get(other),null);
});

test("host draft tracks boolean checked state and numeric raw text independently",()=>{
 const bridge=createSourceConversationHostEventBridge();
 const form=projectSourceTextFormElicitation({
  kind:"formElicitation",serverName:"MCP",message:"Settings",
  schema:{type:"object",properties:{
   approved:{type:"boolean",title:"Approved"},
   retries:{type:"integer",title:"Retries"},
  },required:["approved"]},
 },{hostId:"h",conversationId:"frontend",requestId:"typed"});
 assert.ok(form);
 bridge.textFormDrafts.save(form,{
  fieldIndex:1,values:{approved:false,retries:"3"},
 });
 const resumed=bridge.textFormDrafts.get(form);
 assert.equal(resumed.fieldIndex,1);
 assert.equal(resumed.values.approved,false);
 assert.equal(resumed.values.retries,"3");
 assert.throws(()=>bridge.textFormDrafts.save(form,{
  fieldIndex:1,values:{approved:"false"},
 }),/invalid form draft field/);
 assert.throws(()=>bridge.textFormDrafts.save(form,{
  fieldIndex:1,values:{retries:3},
 }),/invalid form draft field/);
 bridge.publish({type:"elicitation-settled",query:{
  hostId:"h",threadId:"frontend",requestId:"typed",
 }});
 assert.equal(bridge.textFormDrafts.get(form),null);
 bridge.dispose();
});

import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {validFormTextReply,handleFormTextReply}=require("./textFormReply.cjs");
const ids={hostId:"host-a",conversationId:"frontend",requestId:"form-1"};
const payload={...ids,action:"accept",content:{name:"My Project",message:"Important"}};
test("source q2t text form IPC validates exact action/content shape, rejects unauthorized values",()=>{
 for(const value of [
  payload,{...ids,action:"accept",content:{}},
  {...ids,action:"decline",content:null},
  {...ids,action:"cancel",content:null},
 ])assert.equal(validFormTextReply(value),true);
 for(const value of [
  null,{}, {...payload,action:"grant"},
  {...payload,action:"decline"},
  {...payload,action:"accept",content:null},
  {...payload,content:{name:42}},
  {...payload,content:{name:"bad\n\u0000text"}},
  {...payload,content:{name:"x".repeat(16385)}},
  {...payload,content:Object.assign(Object.create(null),{"constructor":"unsafe"})},
  {...payload,conversationId:" bad "},
  {...payload,requestId:""},
  {...payload,unexpected:true},
  {...payload,content:Array.from({length:4})},
 ]){
  assert.equal(validFormTextReply(value),false);
 }
});
test("authenticated sender required; no Agent transport -> never confirms form acceptance",async()=>{
 assert.throws(()=>handleFormTextReply({
  isTrustedRenderer:()=>false}, {},payload),/TEXT_FORM_UNTRUSTED_RENDERER/);
 assert.throws(()=>handleFormTextReply({
  isTrustedRenderer:()=>true}, {},{...payload,action:"cancel"}),/TEXT_FORM_INVALID_REPLY/);
 assert.throws(()=>handleFormTextReply({
  isTrustedRenderer:()=>true}, {},payload),/TEXT_FORM_BACKEND_UNAVAILABLE/);
 const sends=[];
 const delivered=await handleFormTextReply({
  isTrustedRenderer:()=>true,
  agentFormReplyTransport:async reply=>{sends.push(reply);return "sent";},
 },{},payload);
 assert.equal(delivered,"sent");
 assert.deepEqual(sends,[{...ids,response:{
  action:"accept",content:{name:"My Project",message:"Important"},_meta:null,
 }}]);
});

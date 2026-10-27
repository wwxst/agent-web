import test from "node:test";
import assert from "node:assert/strict";
import {
 projectSourceUrlActionRequest,sourceUrlActionSafeHref,
 sourceUrlActionReply,sourceUrlActionRequestKey,
} from "../build/SourceUrlActionRequestModel.js";

const context={hostId:"host-a",conversationId:"thread-b",requestId:"request-c"};
test("original at only selects explicit urlAction and projects message + external URL",()=>{
 assert.deepEqual(projectSourceUrlActionRequest({kind:"urlAction",action:{
   url:"https://example.org/verify",message:"Finish signing in",
 }},context),{...context,url:"https://example.org/verify",message:"Finish signing in"});
 for(const data of [
  {kind:"mcpToolCall",action:{url:"https://example.org",message:"go"}},
  {kind:"urlAction",action:{url:"javascript:alert(1)",message:"go"}},
  {kind:"urlAction",action:{url:"file:///secret",message:"go"}},
  {kind:"urlAction",action:{url:"https://example.org",message:42}},
 ])assert.equal(projectSourceUrlActionRequest(data,context),null);
});
test("external URL must be HTTPS and cannot contain credentials or controls",()=>{
 assert.equal(sourceUrlActionSafeHref("https://example.org/path"),
   "https://example.org/path");
 for(const input of [
  "http://example.org","javascript:alert(1)","file:///test",
  "https://user:pass@example.org/","https://example.org/\nfoo",
  "https://example.org/"+"a".repeat(2048),
 ])assert.equal(sourceUrlActionSafeHref(input),null);
});
test("URL-action responses never claim approval persistence",()=>{
 assert.deepEqual(sourceUrlActionReply("accept"),{decision:"accept"});
 assert.deepEqual(sourceUrlActionReply("decline"),{decision:"decline"});
 assert.equal(sourceUrlActionReply("accept",true),null);
 assert.notEqual(sourceUrlActionRequestKey(context),
   sourceUrlActionRequestKey({...context,hostId:"host-z"}));
 assert.notEqual(sourceUrlActionRequestKey(context),
   sourceUrlActionRequestKey({...context,conversationId:"thread-z"}));
 assert.notEqual(sourceUrlActionRequestKey(context),
   sourceUrlActionRequestKey({...context,requestId:"request-z"}));
});

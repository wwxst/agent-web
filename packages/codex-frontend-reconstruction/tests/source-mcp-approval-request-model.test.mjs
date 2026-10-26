import test from "node:test";
import assert from "node:assert/strict";
import {
 sourceMcpApprovalParameterEntries,sourceMcpApprovalParamText,
 sourceMcpApprovalReply,SOURCE_MCP_INITIAL_PARAMETER_COUNT,
} from "../build/SourceMcpApprovalRequestModel.js";

test("source ye approval/rejection and scoped persistence are host-gated",()=>{
 const req={disabled:false,approveDisabled:false,persist:["session"]};
 assert.deepEqual(sourceMcpApprovalReply(req,"accept"),{decision:"accept"});
 assert.deepEqual(sourceMcpApprovalReply(req,"accept","session"),
   {decision:"accept",persist:"session"});
 assert.equal(sourceMcpApprovalReply(req,"accept","always"),null,
   "never synthesize an unapproved persistent permission");
 assert.deepEqual(sourceMcpApprovalReply({...req,approveDisabled:true},"decline"),
   {decision:"decline"});
 assert.equal(sourceMcpApprovalReply({...req,approveDisabled:true},"accept"),null);
 assert.equal(sourceMcpApprovalReply({...req,disabled:true},"decline"),null);
 assert.equal(sourceMcpApprovalReply({...req,disabled:true},"accept"),null);
});
test("source Ce/we/Ne use host projected display or first four parameter entries",()=>{
 assert.equal(SOURCE_MCP_INITIAL_PARAMETER_COUNT,4);
 const params={first:1,second:true,third:null,fourth:"yes",fifth:{ok:true}};
 assert.deepEqual(sourceMcpApprovalParameterEntries(params).map(e=>e.name),
   Object.keys(params));
 const explicit=[{name:"opaque",displayName:"Public Label",value:"safe"}];
 assert.equal(sourceMcpApprovalParameterEntries(params,explicit),explicit);
 const longText="line\n".repeat(6);
 const text=sourceMcpApprovalParamText(longText);
 assert.equal(text.kind,"text");assert.equal(text.expandable,true);
 assert.equal(text.full,longText);
 const short=sourceMcpApprovalParamText("short");
 assert.equal(short.expandable,false);
 const json=sourceMcpApprovalParamText({description:"a".repeat(65)});
 assert.equal(json.kind,"json");
 assert.equal(json.expandable,true);
 assert.equal(json.preview.length,48);
 assert.match(json.full,/description/);
 assert.deepEqual(sourceMcpApprovalParamText(null),{
   kind:"text",full:"null",preview:"null",expandable:false,
 });
 const cyclic={};cyclic.self=cyclic;
 assert.equal(sourceMcpApprovalParamText(cyclic).full,"[unserializable]");
});

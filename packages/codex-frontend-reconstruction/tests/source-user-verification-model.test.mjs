import test from "node:test";
import assert from "node:assert/strict";
import {
 projectSourceUserVerificationRequest,sourceUserVerificationCancel,
 sourceUserVerificationKey,
} from "../build/SourceUserVerificationModel.js";
const context={hostId:"demo-host",conversationId:"frontend",requestId:"verify-1"};
const data={kind:"userVerification",
 title:"Verify reading workspace",
 serverName:"Project Files",description:"Review the request\nand verify your identity."};

test("original at userVerification uses source title, serverName, multiline description and scoped identity",()=>{
 const actual=projectSourceUserVerificationRequest(data,context);
 assert.deepEqual(actual,{...context,title:data.title,serverName:data.serverName,
  description:data.description});
 assert.deepEqual(sourceUserVerificationCancel(actual),
  {...context,reason:"userCancelled"});
 assert.equal(sourceUserVerificationKey(actual),
  JSON.stringify(["demo-host","frontend","verify-1"]));
 assert.notEqual(sourceUserVerificationKey(actual),
  sourceUserVerificationKey({...context,hostId:"other"}));
 assert.notEqual(sourceUserVerificationKey(actual),
  sourceUserVerificationKey({...context,conversationId:"review"}));
 assert.notEqual(sourceUserVerificationKey(actual),
  sourceUserVerificationKey({...context,requestId:"verify-2"}));
});
test("non-verification, missing fields and control/payload injection do not become a device-identity card",()=>{
 for(const value of [
  null,{}, {...data,kind:"generic"}, {...data,title:null},
  {...data,title:""}, {...data,serverName:" "},
  {...data,serverName:12},{...data,description:[]},
  {...data,title:"x".repeat(4097)},
  {...data,description:"Unsafe\u0000data"},
 ]){
  assert.equal(projectSourceUserVerificationRequest(value,context),null,
   "malformed host request remains a read-only pending row");
 }
 const short=projectSourceUserVerificationRequest({
  kind:"userVerification",title:"Verify",serverName:"Storage",
 },context);
 assert.equal(short.description,"");
});

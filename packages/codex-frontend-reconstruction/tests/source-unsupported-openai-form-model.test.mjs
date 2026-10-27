import test from "node:test";
import assert from "node:assert/strict";
import {
 projectSourceUnsupportedOpenAIForm,
 sourceUnsupportedOpenAIFormReply,
 sourceUnsupportedOpenAIFormWireResponse,
 sourceUnsupportedOpenAIFormKey,
} from "../build/SourceUnsupportedOpenAIFormModel.js";

const ids={hostId:"test-host",conversationId:"frontend",requestId:"request-1"};
test("at.unsupportedOpenAIForm projects exact source serverName and host-scoped identity",()=>{
 const value=projectSourceUnsupportedOpenAIForm({
   kind:"unsupportedOpenAIForm",serverName:"Project Files",
 },ids);
 assert.deepEqual(value,{...ids,serverName:"Project Files"});
 assert.equal(sourceUnsupportedOpenAIFormKey(value),
   JSON.stringify(["test-host","frontend","request-1"]));
 assert.deepEqual(sourceUnsupportedOpenAIFormReply(value,"decline"),
  {...ids,action:"decline"});
 assert.deepEqual(sourceUnsupportedOpenAIFormReply(value,"cancel"),
  {...ids,action:"cancel"});
 assert.deepEqual(sourceUnsupportedOpenAIFormWireResponse("cancel"),
  {action:"cancel",content:null,_meta:null});
 assert.deepEqual(sourceUnsupportedOpenAIFormWireResponse("decline"),
  {action:"decline",content:null,_meta:null});
 assert.notEqual(sourceUnsupportedOpenAIFormKey(value),
  sourceUnsupportedOpenAIFormKey({...ids,conversationId:"review"}));
});
test("malformed/other form envelopes remain read-only pending rather than fake form",()=>{
 for(const value of [
  null,{}, {kind:"openaiForm",serverName:"Project Files"},
  {kind:"unsupportedOpenAIForm",serverName:""},
  {kind:"unsupportedOpenAIForm",serverName:" "},
  {kind:"unsupportedOpenAIForm",serverName:null},
  {kind:"unsupportedOpenAIForm",serverName:23},
  {kind:"unsupportedOpenAIForm",serverName:" bad\\n line"},
  {kind:"unsupportedOpenAIForm",serverName:"x".repeat(257)},
 ]){
  assert.equal(projectSourceUnsupportedOpenAIForm(value,ids),null);
 }
});

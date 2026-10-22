import test from "node:test";
import assert from "node:assert/strict";
import {convertMcpToolCallHistoryEntity as convert} from "../build/ToolActivityExternalMessageConversion.js";
const appContext={connectorId:"connector_openai_orbit_user_channel",actionName:"send_message"};
function slackCall(overrides={}) {
 return {type:"mcpToolCall",id:"call-1",server:"codex_apps",appContext,status:"completed",
  arguments:{channel:"slack",text:"fallback text",library_file_ids:[]},
  result:{structuredContent:{channel:"slack",status:"accepted",messages:[
   {status:"accepted",channel:"slack",message_id:"slack:C123:123.456:123.789",text:"Delivered",workspace_id:"T1"}
  ]}},...overrides};
}
test("Uf maps accepted Codex Apps Slack receipts to an assistant message with channel/thread metadata",()=>{
 const result=convert(slackCall());
 assert.equal(result?.type,"assistant-message");assert.equal(result?.content,"Delivered");
 assert.equal(result?.searchItemId,"call-1");
 assert.deepEqual(result?.externalDelivery,{provider:"slack",state:"accepted",attachmentCount:0,
  channel:{id:"C123",teamId:"T1",thread:{rootId:"123.456"}}});
});
test("Uf suppresses in-progress Codex Apps message calls and mismatched receipt channels",()=>{
 assert.equal(convert(slackCall({status:"inProgress"})),null);
 const mismatched=slackCall({arguments:{channel:"teams",text:"x",library_file_ids:[]}});
 assert.equal(convert(mismatched),null);
});
test("Uf does not surface the non-Slack Codex Apps receipt branch",()=>{
 const result=convert({type:"mcpToolCall",id:"voice-1",server:"codex_apps",
  appContext:{connectorId:"connector_openai_orbit_user_channel",actionName:"send_voice_memo"},
  status:"completed",arguments:{channel:"imessage",text:"voice caption",library_file_ids:[]},
  result:{structuredContent:{status:"accepted",channel:"imessage",message_id:"m-1",text:null}}});
 // The source Ihn wrapper only returns the inner helper result when provider is Slack;
 // other records must pass the separate Fhn external-channel-message predicate.
 assert.equal(result,null);
});

test("Uf maps outgoing Teams external-channel results and respects source delivery status",()=>{
 const result=convert({type:"mcpToolCall",id:"teams-1",server:"codex_apps",tool:"teamsbot.send_message",
  appContext:{connectorId:"other",actionName:"other"},status:"completed",
  result:{structuredContent:{external_channel_message:{channel:"teams",direction:"outgoing",binding_id:"binding",
   workspace_id:null,source_thread_id:null,message:"Teams message",destination:"channel-1",delivery_status:"sent"}}}});
 assert.equal(result?.type,"assistant-message");assert.equal(result?.content,"Teams message");
 assert.deepEqual(result?.externalDelivery,{provider:"teams",channel:{id:"channel-1",teamId:undefined,thread:undefined},state:"sent"});
});
test("Uf rejects malformed external-channel records rather than fabricating assistant messages",()=>{
 const result=convert({type:"mcpToolCall",id:"bad",server:"codex_apps",tool:"teamsbot.send_message",
  status:"completed",result:{structuredContent:{external_channel_message:{channel:"teams",direction:"incoming",
   binding_id:"binding",message:"no",destination:"channel-1",delivery_status:"sent"}}}});
 assert.equal(result,null);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAssistantHistoryContent as normalizeAssistant, formatReasoningSummary,
  mapHistoryFileChanges, isCodexVisualizationFileChange, extractImageGenerationFailure,
  isCodexAppMessageTool, getVisualizationActivityKind, isAutoReviewDeclinedToolActivity,
  normalizeMcpContentItem, formatMcpToolResult,
} from "../build/ToolActivityHistorySourceTransforms.js";
const base={phase:"commentary",isStreaming:false,isHeartbeatAutomationTurn:false,isHeartbeatAutomationRequest:false};

test("wo preserves ordinary content without mutation",()=>{
 const result=normalizeAssistant({...base,content:"plain answer"});
 assert.equal(result.content,"plain answer");assert.equal(result.completed,true);
 assert.equal(result.hidden,false);assert.equal(result.artifactScanContent,"plain answer");
});
test("wo removes complete memory citation blocks and hides citation-only content",()=>{
 assert.equal(normalizeAssistant({...base,content:"answer<oai-mem-citation>private</oai-mem-citation> tail"}).content,"answer tail");
 const hidden=normalizeAssistant({...base,content:"<oai-mem-citation>private</oai-mem-citation>"});
 assert.equal(hidden.content,"");assert.equal(hidden.hidden,true);
});
test("wo strips external tool wrappers when content normalization is otherwise required",()=>{
 const result=normalizeAssistant({...base,content:"before\n[external_agent_tool_call:abc]\nsecret output\n[/external_agent_tool_call]\nafter<oai-mem-citation>citation</oai-mem-citation>"});
 assert.equal(result.content,"before\nafter");
});
test("wo honors skip-completion and padded final-answer CDATA",()=>{
 const skipped=normalizeAssistant({...base,content:" :: SKIP_COMPLETION :: "});
 assert.equal(skipped.content,"");assert.equal(skipped.isSkippedCompletion,true);assert.equal(skipped.hidden,false);
 const cdata=normalizeAssistant({...base,phase:"final_answer",content:"<![CDATA[ final text ]]>"});
 assert.equal(cdata.content,"final text");
});
test("wo trims an incomplete memory citation only while streaming",()=>{
 const result=normalizeAssistant({...base,isStreaming:true,content:"partial answer\n<oai-mem-citation"});
 assert.equal(result.content,"partial answer");assert.equal(result.completed,false);
});
test("wo parses heartbeat notification separately from visible assistant text",()=>{
 const result=normalizeAssistant({...base,content:"Visible\n<heartbeat><decision>NOTIFY</decision><message>Ping</message></heartbeat>"});
 assert.equal(result.content,"Visible");
 assert.deepEqual(result.structuredOutput,{type:"heartbeat",decision:"NOTIFY",notificationMessage:"Ping"});
 assert.equal(result.artifactScanContent,"Visible\nPing");
});
test("wo handles DONT_NOTIFY heartbeat automation sentinel",()=>{
 const result=normalizeAssistant({...base,phase:"final_answer",isHeartbeatAutomationTurn:true,content:"<![CDATA[ DONT_NOTIFY ]]>"});
 assert.equal(result.content,"");
 assert.deepEqual(result.structuredOutput,{type:"heartbeat",decision:"DONT_NOTIFY",notificationMessage:null});
});
test("wo reserves the streaming placeholder for JSON-shaped content",()=>{
 assert.equal(normalizeAssistant({...base,isStreaming:true,content:"  {\"pending\":true"}).renderPlaceholderWhileStreaming,true);
});
test("Wa reasoning summary bolds the first line unless already bold",()=>{
 assert.equal(formatReasoningSummary(["First","Second"]),"**First**\n\nSecond");
 assert.equal(formatReasoningSummary(["**First**","Second"]),"**First**\n\nSecond");
 assert.equal(formatReasoningSummary(["Only"]),"Only");assert.equal(formatReasoningSummary([]),"");
});
test("zl maps add/delete/update and removes Codex visualization artifacts",()=>{
 const changes=[
  {path:"a.ts",kind:{type:"add"},diff:"+a"},
  {path:"b.ts",kind:{type:"delete"},diff:"-b"},
  {path:"old.ts",kind:{type:"update",move_path:"new.ts"},diff:"@@"},
  {path:"normal.ts",kind:{type:"update",move_path:".codex/visualizations/2026/10/22/session_1/index.html"},diff:"generated"},
 ];
 assert.deepEqual(mapHistoryFileChanges(changes),{
  "a.ts":{type:"add",content:"+a"},"b.ts":{type:"delete",content:"-b"},
  "old.ts":{type:"update",unified_diff:"@@",move_path:"new.ts"},
 });
 assert.equal(isCodexVisualizationFileChange(changes[3]),true);
});
test("qr accepts only the source usage-limit failure shape",()=>{
 assert.deepEqual(extractImageGenerationFailure({failure:{type:"usageLimitExceeded",limitId:"image_gen",resetsAt:123}}),
  {type:"usageLimitExceeded",limitId:"image_gen",resetsAt:123});
 assert.equal(extractImageGenerationFailure({failure:{type:"other",limitId:"image_gen",resetsAt:null}}),undefined);
 assert.equal(extractImageGenerationFailure({failure:{type:"usageLimitExceeded",limitId:"image_gen",resetsAt:"later"}}),undefined);
});
test("Po recognizes only the original Codex Apps send actions",()=>{
 assert.equal(isCodexAppMessageTool("codex_apps",{connectorId:"connector_openai_orbit_user_channel",actionName:"send_message"}),true);
 assert.equal(isCodexAppMessageTool("codex_apps",{connectorId:"connector_openai_orbit_user_channel",actionName:"send_voice_memo"}),true);
 assert.equal(isCodexAppMessageTool("codex_apps",{connectorId:"other",actionName:"send_message"}),false);
 assert.equal(isCodexAppMessageTool("server",{connectorId:"connector_openai_orbit_user_channel",actionName:"send_message"}),false);
});
test("cc prioritizes create visualization activity over update",()=>{
 assert.equal(getVisualizationActivityKind([{kind:"update"},{kind:"create"}]),"create");
 assert.equal(getVisualizationActivityKind([{kind:"update"}]),"update");
 assert.equal(getVisualizationActivityKind([{kind:"delete"}]),null);assert.equal(getVisualizationActivityKind(null),null);
});
test("Gf requires declined status and at least one denied review",()=>{
 assert.equal(isAutoReviewDeclinedToolActivity({type:"exec",executionStatus:"declined",automaticApprovalReviews:[{status:"denied"}]}),true);
 assert.equal(isAutoReviewDeclinedToolActivity({type:"patch",status:"declined",automaticApprovalReviews:[{status:"approved"}]}),false);
 assert.equal(isAutoReviewDeclinedToolActivity({type:"exec",executionStatus:"declined"}),false);
});
test("amn normalizes known MCP content and preserves invalid content as unknown",()=>{
 assert.deepEqual(normalizeMcpContentItem({type:"text",text:"hello",extra:"discarded"}),{type:"text",text:"hello",annotations:undefined});
 assert.deepEqual(normalizeMcpContentItem({type:"resource",resource:{uri:"file://x",name:"x",extra:"discarded"}}),{
  type:"embedded_resource",resource:{uri:"file://x",name:"x",title:undefined,description:undefined,mimeType:undefined,
   text:undefined,blob:undefined,annotations:undefined},
 });
 assert.deepEqual(normalizeMcpContentItem({type:"text",text:4}),{type:"unknown",raw:{type:"text",text:4}});
});
test("wl handles protocol errors, successful results and failed tool results",()=>{
 assert.deepEqual(formatMcpToolResult(null,{message:"protocol"},"failed"),{
  type:"error",kind:"protocol",error:"protocol",rawError:{message:"protocol"},raw:undefined,
 });
 const success={content:[{type:"text",text:"ok"}],structuredContent:{accepted:true}};
 assert.deepEqual(formatMcpToolResult(success,null,"completed"),{
  type:"success",content:[{type:"text",text:"ok",annotations:undefined}],
  structuredContent:{accepted:true},raw:success,
 });
 assert.deepEqual(formatMcpToolResult({content:[{type:"text",text:"denied"}]},null,"failed"),{
  type:"error",kind:"tool",error:"denied",raw:{content:[{type:"text",text:"denied"}]},
 });
 assert.deepEqual(formatMcpToolResult({content:[],structuredContent:{reason:"no"}},null,"failed"),{
  type:"error",kind:"tool",error:'{"reason":"no"}',raw:{content:[],structuredContent:{reason:"no"}},
 });
});

import test from "node:test";
import assert from "node:assert/strict";
import {projectSourceHostMcpApproval} from "../build/SourceHostMcpApprovalProjection.js";
import {sourceMcpApprovalParameterEntries,sourceMcpApprovalReply}
 from "../build/SourceMcpApprovalRequestModel.js";

const context={hostId:"demo-host",conversationId:"frontend",requestId:"mcp-101"};
test("original be generic preserves verified metadata.reason, persist scopes and Ce argument fallback",()=>{
 const projected=projectSourceHostMcpApproval({
  kind:"generic",serverName:"connector_hello-world",
  message:"Tool call needs your approval. Reason: Read file metadata",
  metadata:{reason:"Read file metadata"},toolParams:{path:"/workspace",limit:4},
  persist:["session","always"],riskLevel:"high",subtitle:"Account access",
 },context);
 assert.ok(projected);
 assert.deepEqual(
  {hostId:projected.hostId,conversationId:projected.conversationId,requestId:projected.requestId},
  context);
 assert.equal(projected.title,"Read file metadata");
 assert.equal(projected.reason,null);
 assert.equal(projected.connectorName,"hello-world");
 assert.equal(projected.riskLevel,"high");
 assert.equal(projected.subtitle,"Account access");
 assert.deepEqual(projected.persist,["session","always"]);
 assert.equal(projected.toolParamsDisplay,undefined,
  "source Ce must infer arguments from toolParams when display data is absent");
 assert.deepEqual(sourceMcpApprovalParameterEntries(projected.toolParams,projected.toolParamsDisplay)
  .map(entry=>[entry.name,entry.value]),[["path","/workspace"],["limit",4]]);
 assert.deepEqual(sourceMcpApprovalReply(projected,"accept","always"),{decision:"accept",persist:"always"});
 assert.equal(sourceMcpApprovalReply(projected,"accept","invalid"),null);
});
test("source generic presentation trims duplicate trailing reason and retains non-boilerplate message",()=>{
 const item=projectSourceHostMcpApproval({
  kind:"generic",serverName:"",message:"Delete sample file? Reason: User requested cleanup",
  metadata:{reason:"User requested cleanup"},persist:["session"],
 },context);
 assert.ok(item);
 assert.equal(item.title,"Delete sample file?");
 assert.equal(item.reason,"User requested cleanup");
 assert.equal(item.connectorName,"Server");
 assert.deepEqual(item.persist,["session"]);
 assert.deepEqual(sourceMcpApprovalReply(item,"accept","session"),{decision:"accept",persist:"session"});
 assert.equal(sourceMcpApprovalReply(item,"accept","always"),null);
});
test("original be tool-call uses approval connector and params, source Se changes tool name visual only",()=>{
 const projected=projectSourceHostMcpApproval({
  kind:"mcpToolCall",message:'Allow a fake connector to run tool "find_files"?',
  approval:{connector_id:"fs-connector",connector_name:"Project Files",
    tool_name:"find_files",tool_params:{path:"/repo",recursive:true},
    persist:["session"]},
  riskLevel:"high",approveDisabled:false,
 },context);
 assert.ok(projected);
 assert.equal(projected.connectorName,"Project Files");
 assert.equal(projected.title,'Allow a fake connector to run tool "find_files"?');
 assert.deepEqual(projected.toolParams,{path:"/repo",recursive:true});
 assert.deepEqual(projected.persist,["session"]);
 assert.equal(projected.collapseToolParams,false,
  "source collapse is only supplied by verified re approval presentation, never inferred");
 assert.equal(sourceMcpApprovalReply(projected,"accept","always"),null);
 assert.deepEqual(sourceMcpApprovalReply(projected,"decline"),{decision:"decline"});
});
test("host supplied toolParamsDisplay is authoritative, including an explicitly empty array",()=>{
 const projected=projectSourceHostMcpApproval({
  kind:"generic",serverName:"storage",message:"Allow request?",
  toolParams:{raw:1},toolParamsDisplay:[{name:"read-only",displayName:"Read Only",value:"shown"}],
 },context);
 assert.ok(projected);
 assert.deepEqual(sourceMcpApprovalParameterEntries(projected.toolParams,projected.toolParamsDisplay)
  .map(e=>e.displayName),["Read Only"]);
 const hidden=projectSourceHostMcpApproval({
  kind:"generic",serverName:"storage",message:"Allow request?",
  toolParams:{raw:1},toolParamsDisplay:[],
 },context);
 assert.ok(hidden);
 assert.equal(sourceMcpApprovalParameterEntries(hidden.toolParams,hidden.toolParamsDisplay).length,0);
});
test("special/private consent and malformed host payload never become a guessed approval surface",()=>{
 const baseline={kind:"generic",serverName:"server",message:"Allow?"};
 const invalid=[
  {...baseline,browserEmailOtp:{origin:"https://example.org"}},
  {...baseline,approvalPresentation:{message:"Specialized UI"}},
  {...baseline,persist:["unscoped"]},
  {...baseline,persist:["session","unknown"]},
  {...baseline,toolParams:[1]},
  {...baseline,toolParamsDisplay:[{name:7,value:"x"}]},
  {...baseline,riskLevel:42},
  {...baseline,disabled:"false"},
  {...baseline,approveDisabled:"true"},
  {...baseline,message:"   "},
  {...baseline,serverName:null},
  {kind:"mcpToolCall",message:"Approve?",approval:{tool_name:"",
    connector_id:"files"}},
  {kind:"mcpToolCall",message:"Approve?",approval:{tool_name:"open",
    connector_id:"files",persist:["forever"]}},
  {kind:"mcpToolCall",message:"Approve?",approval:{tool_name:"open",
    connector_id:"files",tool_params:"unsafe"}},
  {kind:"urlAction",url:"https://example.org",message:"Approve?"},
  {kind:"toolSuggestion",message:"Approve?"},
  {kind:"browserAuth",message:"Approve?"},
 ];
 for(const item of invalid){
  assert.equal(projectSourceHostMcpApproval(item,context),null,
   "invalid or specialized schema must remain a read-only host pending row");
 }
});

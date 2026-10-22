import test from "node:test";
import assert from "node:assert/strict";
import {
  buildToolActivityHistoryQueryPlan as buildQueries,
  hydrateToolActivityItemFromHistory as hydrate,
} from "../build/ToolActivityHistoryHydrationModel.js";

const deps = {
  prepareAssistantContent: args => ({
    content: args.content, phase: args.phase, isStreaming: args.isStreaming,
    isHeartbeatAutomationTurn: args.isHeartbeatAutomationTurn,
    isHeartbeatAutomationRequest: args.isHeartbeatAutomationRequest,
    artifactScanContent: "must-not-leak",
  }),
  reasoningSummaryToText: value => Array.isArray(value) ? value.join(" ") : String(value ?? ""),
  convertMcpToolCall: entity => entity.converted ?? null,
  mapFileChanges: changes => ({ mapped: changes }),
  imageGenerationFailure: entity => entity.failure ?? null,
  isMcpAppToolCall: (server, appContext) => server === "app-server" && appContext != null,
  formatMcpResult: (result, error, status) => ({ result, error, status }),
};
const ctx = { isTurnInProgress: true };

test("query plan uses HO identity and requests external assistant entity only for assistant messages", () => {
  const base = { hostId:"host", conversationId:"thread", historyEntityKey:"history" };
  assert.deepEqual(buildQueries({type:"exec",commandExecutionItemId:"exec-1"},base), {
    historyEntity:{hostId:"host",threadId:"thread",entityKey:"history",itemId:"exec-1"},
    assistantMessageEntity:null,
  });
  assert.deepEqual(buildQueries({type:"assistant-message",searchItemId:"msg-1"},base), {
    historyEntity:{hostId:"host",threadId:"thread",entityKey:"history",itemId:"msg-1"},
    assistantMessageEntity:{hostId:"host",threadId:"thread",entityKey:"history",itemId:"msg-1"},
  });
  assert.equal(buildQueries({type:"exec",commandExecutionItemId:"",callId:"fallback"},base)
    ?.historyEntity.itemId,"");
});

test("query plan follows LO bypass rules for missing key/ID and read-only async/input messages", () => {
  const base = {hostId:"h",conversationId:"t",historyEntityKey:"k"};
  assert.equal(buildQueries({type:"exec"},base),null);
  assert.equal(buildQueries({type:"exec",callId:"c"},{...base,historyEntityKey:null}),null);
  assert.equal(buildQueries({type:"assistant-message",searchItemId:"m",delivery:"async"},
    {...base,isReadOnly:true}),null);
  assert.equal(buildQueries({type:"assistant-message",searchItemId:"m",requestUserInputAsync:{questionIndex:0}},
    {...base,isReadOnly:true}),null);
  assert.notEqual(buildQueries({type:"assistant-message",searchItemId:"m",delivery:"async"},
    {...base,isReadOnly:false}),null);
});

test("agentMessage hydrates assistant text, phase and citation while stripping internal fields", () => {
  const original={type:"assistant-message",content:"old",completed:false};
  const result=hydrate(original,{type:"agentMessage",text:"new",phase:"final",memoryCitation:{entries:[1]}},
    null,ctx,deps);
  assert.equal(result.item.content,"new");
  assert.equal(result.item.phase,"final");
  assert.deepEqual(result.item.memoryCitation,{entries:[1]});
  assert.equal("artifactScanContent" in result.item,false);
  assert.equal(result.item.isStreaming,true);
});

test("agentMessage chooses request question title, then falls back to original content", () => {
  const item={type:"assistant-message",content:"fallback",requestUserInputAsync:{questionIndex:1}};
  const entity={type:"agentMessage",text:"base",questions:[{title:"first"},{title:"second"}]};
  assert.equal(hydrate(item,entity,null,ctx,deps).item.content,"second");
  assert.equal(hydrate(item,{...entity,questions:[]},null,ctx,deps).item.content,"fallback");
  assert.equal(hydrate({...item,requestUserInputAsync:{questionIndex:null}},entity,null,ctx,deps).item.content,"base");
});

test("agentMessage hides rows when source content projection requests hiding", () => {
  const hiddenDeps={...deps,prepareAssistantContent:()=>({hidden:true,artifactScanContent:"secret"})};
  const result=hydrate({type:"assistant-message",content:"x"},
    {type:"agentMessage",text:"x"},null,ctx,hiddenDeps);
  assert.equal(result.item,null);
  assert.equal(result.hiddenByAssistantContent,true);
});

test("assistant streaming is false when external assistant entity is present", () => {
  const result=hydrate({type:"assistant-message",content:"old",completed:false},
    {type:"agentMessage",text:"new",phase:"commentary"},
    {type:"other"},ctx,deps);
  assert.equal(result.item.isStreaming,false);
});

test("assistant external delivery can be replaced by converted MCP history record", () => {
  const item={type:"assistant-message",content:"fallback",externalDelivery:{kind:"tool"}};
  const converted={type:"mcp-tool-call",callId:"mapped",completed:true};
  const result=hydrate(item,{type:"mcpToolCall",converted},null,ctx,deps);
  assert.equal(result.item,converted);
  assert.equal(hydrate(item,{type:"mcpToolCall"},null,ctx,deps).item,item);
});

test("reasoning and proposed plan hydrate their distinct content fields", () => {
  assert.equal(hydrate({type:"reasoning",content:"old"},
    {type:"reasoning",summary:["a","b"]},null,ctx,deps).item.content,"a b");
  assert.equal(hydrate({type:"proposed-plan",content:"old"},
    {type:"plan",text:"plan from history"},null,ctx,deps).item.content,"plan from history");
});

test("commandExecution hydrates status, duration, process and aggregated output", () => {
  const item={type:"exec",executionStatus:"interrupted",parsedCmd:{type:"command",cmd:"run",isFinished:false}};
  const result=hydrate(item,{type:"commandExecution",status:"inProgress",durationMs:30,processId:44,
    aggregatedOutput:"partial",exitCode:null},null,ctx,deps).item;
  assert.equal(result.executionStatus,"interrupted");
  assert.equal(result.durationMs,30);
  assert.equal(result.processId,44);
  assert.equal(result.parsedCmd.isFinished,true);
  assert.deepEqual(result.output,{aggregatedOutput:"partial",exitCode:undefined});
});

test("commandExecution leaves interrupted state only while canonical record is in progress", () => {
  const item={type:"exec",executionStatus:"interrupted",parsedCmd:{cmd:"run"}};
  assert.equal(hydrate(item,{type:"commandExecution",status:"completed"},null,ctx,deps).item.executionStatus,"completed");
  assert.equal(hydrate(item,{type:"commandExecution",status:"inProgress"},null,ctx,deps).item.parsedCmd.isFinished,true);
});

test("commandExecution uses null output when both output and exit code are absent", () => {
  const result=hydrate({type:"exec",parsedCmd:{cmd:"run"}},
    {type:"commandExecution",status:"completed"},null,ctx,deps).item;
  assert.equal(result.output,null);
});

test("fileChange maps changes and status to success tri-state", () => {
  const item={type:"patch",changes:{}};
  const inProgress=hydrate(item,{type:"fileChange",status:"inProgress",changes:{a:1}},null,ctx,deps).item;
  const completed=hydrate(item,{type:"fileChange",status:"completed",changes:{a:1}},null,ctx,deps).item;
  const failed=hydrate(item,{type:"fileChange",status:"failed",changes:{a:1}},null,ctx,deps).item;
  assert.equal(inProgress.success,null);
  assert.equal(completed.success,true);
  assert.equal(failed.success,false);
  assert.deepEqual(completed.changes,{mapped:{a:1}});
});

test("imageGeneration hydrates src, status and derived failure", () => {
  const result=hydrate({type:"generated-image",id:"i"},
    {type:"imageGeneration",src:"data:image/test",status:"failed",failure:{reason:"limit"}},null,ctx,deps).item;
  assert.equal(result.src,"data:image/test");
  assert.equal(result.status,"failed");
  assert.deepEqual(result.failure,{reason:"limit"});
});

test("mcpToolCall uses private converter unless it is an MCP app, then formats fallback result", () => {
  const converted={type:"mcp-tool-call",callId:"converted"};
  assert.equal(hydrate({type:"mcp-tool-call",callId:"base"},
    {type:"mcpToolCall",server:"server",converted},null,ctx,deps).item,converted);
  const app=hydrate({type:"mcp-tool-call",callId:"base"},
    {type:"mcpToolCall",server:"app-server",appContext:{id:"app"},status:"inProgress",
     result:"r",error:null,durationMs:8},null,ctx,deps).item;
  assert.equal(app.completed,false);
  assert.equal(app.durationMs,8);
  assert.deepEqual(app.result,{result:"r",error:null,status:"inProgress"});
});

test("mcpToolCall fallback completes when turn is no longer active", () => {
  const result=hydrate({type:"mcp-tool-call",callId:"base"},
    {type:"mcpToolCall",server:"app-server",appContext:{id:"app"},status:"inProgress"},
    null,{isTurnInProgress:false},deps).item;
  assert.equal(result.completed,true);
});

test("dynamicToolCall hydrates completion, content items and success", () => {
  const result=hydrate({type:"dynamic-tool-call",callId:"d"},
    {type:"dynamicToolCall",status:"failed",contentItems:[{text:"err"}],success:false},null,ctx,deps).item;
  assert.equal(result.completed,true);
  assert.deepEqual(result.contentItems,[{text:"err"}]);
  assert.equal(result.success,false);
});

test("assistant copy text follows trim and streaming permission rule", () => {
  const item={type:"assistant-message",content:"  final answer  "};
  assert.equal(hydrate(item,null,null,{assistantCopyText:"previous"},deps).assistantCopyText,"final answer");
  assert.equal(hydrate(item,null,null,{allowAssistantCopyWhileStreaming:true},deps).assistantCopyText,"final answer");
  assert.equal(hydrate(item,null,null,{},deps).assistantCopyText,undefined);
  assert.equal(hydrate({...item,content:undefined},null,null,{assistantCopyText:"previous"},deps).assistantCopyText,"previous");
});

test("unmatched history entity preserves original item identity", () => {
  const item={type:"exec",callId:"x"};
  assert.equal(hydrate(item,{type:"unrecognized"},null,ctx,deps).item,item);
});

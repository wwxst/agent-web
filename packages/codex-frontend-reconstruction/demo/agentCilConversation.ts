/**
 * Actual one-shot Agent CIL stdout -> existing conversation render contracts.
 * No demo messages, fabricated tools, approvals, or host events are created.
 * A CLI result is text only until a structured Agent protocol is connected.
 */
import {createLiveConversationSource} from "../src/conversation/LiveConversationSource.js";
import type {ConversationRenderEntry} from "../src/conversation/ConversationRenderEntriesModel.js";
import type {ConversationTranscriptBlock,ConversationMessageItem}
  from "../src/conversation/ConversationMessageRenderPlan.js";

export function createAgentCilConversationSource(){
  return createLiveConversationSource({
    conversationId:"agent-cil-local",
    entries:[],
    connectionState:"connected",
    loadingHistory:false,
    projection:{conversationId:"agent-cil-local",hostId:"agent-cil",cwd:"",
      showFullTranscript:true},
  });
}
export type AgentCilConversationSource=ReturnType<typeof createAgentCilConversationSource>;
function messageEntry(role:"user"|"assistant",id:string,content:string,
  completed:boolean):ConversationRenderEntry{
  const item:ConversationMessageItem={
    id,type:role==="assistant"?"agentMessage":"userMessage",
    content,completed,
  };
  const block:ConversationTranscriptBlock={
    type:role==="assistant"?"assistant-message":"user-message",
    key:`block:${id}`,item,
  };
  return {
    turnId:id,turnSearchKey:id,estimatedHeightPx:136,isLatestTurn:true,
    turn:{items:[],status:completed?"completed":"inProgress",demoBlocks:[block]},
  };
}
export function appendAgentCilMessage(
  source:AgentCilConversationSource,role:"user"|"assistant",id:string,
  content:string,completed=true,
){
  const existing=source.getSnapshot().entries;
  source.update({entries:[
    ...existing.map(entry=>entry.isLatestTurn?{...entry,isLatestTurn:false}:entry),
    messageEntry(role,id,content,completed),
  ]});
}
export function updateAgentCilAssistant(
  source:AgentCilConversationSource,id:string,content:string,completed:boolean,
){
  const entries=source.getSnapshot().entries;
  source.update({entries:entries.map(entry=>entry.turnId===id
    ?{...messageEntry("assistant",id,content,completed),isLatestTurn:entry.isLatestTurn}
    :entry)});
}

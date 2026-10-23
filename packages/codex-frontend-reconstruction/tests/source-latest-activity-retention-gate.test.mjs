import test from "node:test";
import assert from "node:assert/strict";
import {deriveSourceLatestActivityRetention} from "../build/SourceLatestActivityRetentionGate.js";
import {buildConversationMessageRenderPlan} from "../build/ConversationMessageRenderPlan.js";

const defaults={
 isTurnInProgress:true,
 isTerminalOrSummaryTurn:false,
 assistantItem:null,
 hasInlineSubagentActivity:false,
 isMostRecentTurn:false,
 hasUpNextStatusItem:false,
 interruptedByThisClient:false,
 hasResolvedUpNextState:false,
};
const gate=(override={})=>deriveSourceLatestActivityRetention({...defaults,...override});

test("Fc Gi retains last group only while a turn is genuinely active and no response started",()=>{
 assert.equal(gate(),true);
 assert.equal(gate({isTurnInProgress:false}),false);
 assert.equal(gate({assistantItem:{type:"assistant-message",content:" "}}),true);
 assert.equal(gate({assistantItem:{type:"assistant-message",content:"Answer"}}),false);
 assert.equal(gate({assistantItem:{type:"assistant-message",completed:true}}),false);
 assert.equal(gate({assistantItem:{type:"assistant-message",structuredOutput:{}}}),false);
});
test("original ai excludes terminal summary and inline subagent commentary",()=>{
 const commentary={type:"assistant-message",phase:"commentary",completed:true,content:"Checking"};
 assert.equal(gate({assistantItem:commentary}),false);
 assert.equal(gate({assistantItem:commentary,hasInlineSubagentActivity:true}),true);
 assert.equal(gate({isTerminalOrSummaryTurn:true,assistantItem:commentary}),true);
 assert.equal(gate({assistantItem:{...commentary,phase:"final_answer"},hasInlineSubagentActivity:true}),false);
});
test("original Wi blocks final-group retention while up-next query Qr is unresolved",()=>{
 const pending={isMostRecentTurn:true,hasUpNextStatusItem:true};
 assert.equal(gate(pending),false);
 assert.equal(gate({...pending,hasResolvedUpNextState:true}),true);
 assert.equal(gate({...pending,interruptedByThisClient:true}),true);
 assert.equal(gate({...pending,isMostRecentTurn:false}),true);
 assert.equal(gate({...pending,hasUpNextStatusItem:false}),true);
});
test("turn render plan supplies Gi to the same activity group used by React ga",()=>{
 const blocks=[{type:"agent-activity",key:"tools",items:[{
  type:"exec",id:"cmd",parsedCmd:{type:"unknown",isFinished:true},
 }]}];
 const deps={
  partitionActivities:items=>[{type:"activity",items}],
  getSpecialActivityResult:()=>null,
  hasPersistentActivity:()=>true,
 };
 const plan=input=>buildConversationMessageRenderPlan(blocks,{
   isTurnInProgress:input.isTurnInProgress,renderMode:"latest",
   latestActivityRetentionInput:input,
 },deps);
 assert.equal(plan(defaults).nodes[0].allowLatestCompletedGroup,true);
 assert.equal(plan({...defaults,isTurnInProgress:false}).nodes[0].allowLatestCompletedGroup,false);
 assert.equal(buildConversationMessageRenderPlan(blocks,{
   isTurnInProgress:false,renderMode:"latest",
 },deps).nodes[0].allowLatestCompletedGroup,null);
});

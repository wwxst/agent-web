import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSourceComposerControlsMutationResult,
  parseSourceComposerControlsSnapshot,
  planSourceComposerPermissionSelection,
  sourceComposerModelChangeRequest,
} from "../build/SourceComposerControlsModel.js";

function snapshot(conversationId="frontend"){
  return {
    schemaVersion:1,
    conversationId,
    model:{
      selected:{
        id:"gpt-6.1-sol",label:"GPT-6.1 Sol",
        reasoningEffortId:"high",reasoningEffortLabel:"高",
      },
      options:[
        {id:"gpt-6.1-sol",label:"GPT-6.1 Sol",defaultReasoningEffortId:"high",
          reasoningEfforts:[{id:"low",label:"低"},{id:"high",label:"高"}]},
        {id:"gpt-6.1-codex",label:"GPT-6.1 Codex",defaultReasoningEffortId:"medium",
          reasoningEfforts:[{id:"medium",label:"中"},{id:"high",label:"高"}]},
        {id:"locked",label:"Unavailable model",disabledReason:"Not available to this host",
          reasoningEfforts:[]},
      ],
    },
    permissions:{
      selected:{id:"approval",kind:"agent-mode",label:"Ask for approval"},
      options:[
        {id:"approval",kind:"agent-mode",label:"Ask for approval",
          description:"Ask before actions outside the workspace."},
        {id:"full-access",kind:"agent-mode",label:"Full access",
          requiresConfirmation:true,
          confirmation:{
            title:"Confirm full access",
            body:"Allow this host to perform actions without asking for each one?",
            riskDescription:"Only continue if you trust the active workspace and agent.",
            capabilities:["Read and write workspace files","Run commands"],
            confirmLabel:"Enable full access",cancelLabel:"Cancel",
          }},
        {id:"custom",kind:"custom",label:"Custom",disabledReason:"Managed by organization"},
      ],
    },
  };
}

test("parses a host-owned model/reasoning and permission snapshot without inventing values",()=>{
  const parsed=parseSourceComposerControlsSnapshot(snapshot(),"frontend");
  assert.ok(parsed);
  assert.equal(parsed.model.selected?.label,"GPT-6.1 Sol");
  assert.equal(parsed.model.selected?.reasoningEffortLabel,"高");
  assert.deepEqual(parsed.model.options.map(option=>option.id),
    ["gpt-6.1-sol","gpt-6.1-codex","locked"]);
  assert.equal(parsed.permissions.selected?.label,"Ask for approval");
  assert.equal(parsed.permissions.options[1].confirmation?.capabilities.length,2);
});

test("rejects stale, malformed, duplicate and cross-conversation host snapshots",()=>{
  assert.equal(parseSourceComposerControlsSnapshot(snapshot(),"review"),null);
  const duplicate=snapshot();
  duplicate.model.options.push(duplicate.model.options[0]);
  assert.equal(parseSourceComposerControlsSnapshot(duplicate,"frontend"),null);
  const malformed=snapshot();
  malformed.permissions.options[0].kind="shell";
  assert.equal(parseSourceComposerControlsSnapshot(malformed,"frontend"),null);
  assert.equal(parseSourceComposerControlsSnapshot({...snapshot(),schemaVersion:2},"frontend"),null);
});

test("model changes can only target host-provided enabled models and reasoning efforts",()=>{
  const parsed=parseSourceComposerControlsSnapshot(snapshot(),"frontend");
  assert.ok(parsed);
  assert.deepEqual(sourceComposerModelChangeRequest(parsed,"gpt-6.1-codex"),{
    conversationId:"frontend",modelId:"gpt-6.1-codex",reasoningEffortId:"medium",
  });
  assert.deepEqual(sourceComposerModelChangeRequest(parsed,"gpt-6.1-sol","low"),{
    conversationId:"frontend",modelId:"gpt-6.1-sol",reasoningEffortId:"low",
  });
  assert.equal(sourceComposerModelChangeRequest(parsed,"locked"),null);
  assert.equal(sourceComposerModelChangeRequest(parsed,"gpt-6.1-sol","invented"),null);
  assert.equal(sourceComposerModelChangeRequest(parsed,"unknown"),null);
});

test("full-access selection requires host-provided confirmation and other modes remain host-gated",()=>{
  const parsed=parseSourceComposerControlsSnapshot(snapshot(),"frontend");
  assert.ok(parsed);
  assert.equal(planSourceComposerPermissionSelection(parsed,"approval").kind,"apply");
  const full=planSourceComposerPermissionSelection(parsed,"full-access");
  assert.equal(full.kind,"confirm");
  if(full.kind==="confirm")assert.equal(full.option.confirmation?.confirmLabel,"Enable full access");
  assert.equal(planSourceComposerPermissionSelection(parsed,"custom").kind,"disabled");
  assert.equal(planSourceComposerPermissionSelection(parsed,"unknown").kind,"disabled");

  const missingConfirmation=snapshot();
  missingConfirmation.permissions.options[1].confirmation=undefined;
  const guarded=parseSourceComposerControlsSnapshot(missingConfirmation,"frontend");
  assert.ok(guarded);
  const plan=planSourceComposerPermissionSelection(guarded,"full-access");
  assert.equal(plan.kind,"disabled");
});

test("mutation acknowledgements reject optimistic or stale snapshots",()=>{
  const valid=parseSourceComposerControlsMutationResult({
    ok:true,snapshot:snapshot(),
  },"frontend");
  assert.ok(valid);
  assert.equal(valid.ok,true);
  assert.equal(valid.snapshot?.conversationId,"frontend");
  assert.equal(parseSourceComposerControlsMutationResult({
    ok:true,snapshot:snapshot("review"),
  },"frontend"),null);
  assert.equal(parseSourceComposerControlsMutationResult({ok:true},"frontend")?.snapshot,null);
  assert.equal(parseSourceComposerControlsMutationResult({
    ok:false,errorMessage:"Policy rejected",
  },"frontend")?.errorMessage,"Policy rejected");
  assert.equal(parseSourceComposerControlsMutationResult({selectedModel:"fake"},"frontend"),null);
});

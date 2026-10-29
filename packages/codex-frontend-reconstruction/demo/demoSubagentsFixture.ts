/** Synthetic source records only. Never present these as real spawned Agent tasks. */
import type {SourceLocalSubagent} from "../src/conversation/SourceLocalSubagentsPanelModel.js";

export function makeSyntheticSubagentsFixture():readonly SourceLocalSubagent[]{
  const now=Date.now();
  return [
    {conversationId:"demo-subagent-review",displayName:"Frontend review (synthetic)",
      status:"running",objective:"Review recovered conversation geometry",
      startedAtMs:now-77000,model:"Demo Agent",reasoningEffort:"medium",canInteract:false},
    {conversationId:"demo-subagent-wait",displayName:"Waiting for source (synthetic)",
      status:"waiting",statusSummary:"Waiting for original build assets",startedAtMs:now-10000},
    ...[3,4,5].map(n=>({
      conversationId:`demo-subagent-active-${n}`,
      displayName:`Synthetic agent ${n}`,status:"running",startedAtMs:now-120000,
      objective:`Synthetic source inspection step ${n}`,canInteract:false,
    })),
    ...Array.from({length:11},(_,i)=>({
      conversationId:`demo-subagent-done-${i+1}`,
      displayName:`Completed fixture ${i+1} (synthetic)`,status:"done",
      statusSummary:`Local test only; no real background execution ${i+1}`,
      lastAssistantMessageAtMs:now-(i+1)*3600000,canInteract:false,
    })),
  ];
}

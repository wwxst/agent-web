/**
 * Original local-conversation-turn-69783815d57d.js Fc:
 *   ni = !Ze && Trr(Y);
 *   ii = ar && ni && Y?.phase === "commentary";
 *   ai = ni && !ii;
 *   Bi = U && rn != null && !we;
 *   Ui = G(Qr, Bi ? {hostId:d,threadId:u} : null);
 *   Wi = Bi && !Ui;
 *   Gi = K && !ai && !Wi;
 *
 * This explicitly separates the source's turn status, assistant, and up-next
 * query states. It never guesses missing host data from tool text or timestamps.
 */
import {isSourceMeaningfulAssistant} from "./SourceLatestActivityVisibility.js";
import type {GroupActivityItem} from "./AgentActivityGroupPresentation.js";

export interface SourceLatestActivityRetentionInput {
 /** K: resolved in-progress state from the host's history + turn status. */
 isTurnInProgress:boolean;
 /** Ze: terminal/synthetic-summary turn must not count Y as final response. */
 isTerminalOrSummaryTurn:boolean;
 /** Y: source-extracted final assistant candidate, if any. */
 assistantItem?:GroupActivityItem|null;
 /** ar: renderable inline subagent activity present. */
 hasInlineSubagentActivity:boolean;
 /** U: isMostRecentTurn in Fc. */
 isMostRecentTurn:boolean;
 /** rn: source's current up-next status item. */
 hasUpNextStatusItem:boolean;
 /** we: interruptedByThisClient. */
 interruptedByThisClient:boolean;
 /** Ui: host query Qr; absence is treated as unresolved. */
 hasResolvedUpNextState:boolean;
}

/** Source Gi passed into Ga/qe before ek merges combined activity traces. */
export function deriveSourceLatestActivityRetention(input:SourceLatestActivityRetentionInput):boolean {
 const hasResponse=!input.isTerminalOrSummaryTurn && input.assistantItem!=null &&
   isSourceMeaningfulAssistant(input.assistantItem);
 const hasStartedFinalResponse=hasResponse && !(input.hasInlineSubagentActivity &&
   input.assistantItem?.phase==="commentary");
 const needsUpNext=input.isMostRecentTurn&&input.hasUpNextStatusItem &&
   !input.interruptedByThisClient;
 const waitingOnUpNext=needsUpNext&&!input.hasResolvedUpNextState;
 return input.isTurnInProgress && !hasStartedFinalResponse && !waitingOnUpNext;
}

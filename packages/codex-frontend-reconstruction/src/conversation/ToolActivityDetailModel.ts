/**
 * Audited source semantics: sites-end-resource-...js fk -> LO -> SO -> xC/PT.
 * Private NO/mh, Gf, cc remain callbacks; leaf visuals still host-owned.
 */
export interface ToolItem {type:string;[key:string]:unknown}
export interface ToolDetailContext {
 isWorkMode?:boolean;
 renderToolActivityInWorkMode?:boolean;
 isTurnInProgress?:boolean;
 isTurnCancelled?:boolean;
 isMeaningfulRead?:(item:ToolItem)=>boolean;
 isAutoReviewDeclined?:(item:ToolItem)=>boolean;
 hasVisualizationActivity?:(item:ToolItem)=>boolean;
}
export type PatchStatus="auto-review-declined"|"applied"|"rejected"|"pending"|"streaming"|"stopped";
export type ToolProjection=
 |{kind:"hidden";reason:"work-mode"|"running-exploration"|"empty-patch"|"ignored-event"}
 |{kind:"exec";leaf:"read"|"search"|"list_files"|"command";summary:Record<string,unknown>;isInProgress:boolean;
  isBackgroundTerminalRunning:boolean;isBackgroundTerminalFinished:boolean;
  wasInterrupted:boolean;wasDeclinedByAutoReview:boolean;hideRawCommand:boolean}
 |{kind:"patch";status:PatchStatus;showDiffDetails:boolean;showVisualization:boolean;
   isVisualizationInProgress:boolean;fileCount:number}
 |{kind:"host-leaf";leaf:"mcp-tool-call"|"external-event"|"dynamic-tool-call"|
   "automatic-approval-review"|"web-search"}
 |{kind:"fallback"};
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const nonempty=(v:unknown)=>typeof v==="string"&&v.length>0?v:null;
/** HO identity for history hydration in LO/zO. */
export function getToolActivityHistoryItemId(item:ToolItem):string|null {
 if(item.type==="assistant-message"&&object(item.requestUserInputAsync))
   return nonempty(item.requestUserInputAsync.sourceItemId);
 if("sourceItemId" in item)return nonempty(item.sourceItemId);
 if("searchItemId" in item)return nonempty(item.searchItemId);
 if(item.type==="exec")return nonempty(item.commandExecutionItemId)??nonempty(item.callId);
 if(item.type==="patch"||item.type==="mcp-tool-call"||item.type==="dynamic-tool-call")
   return nonempty(item.callId);
 return item.type==="generated-image"?nonempty(item.id):null;
}
/** PT original status precedence. */
export function getToolPatchStatus(item:ToolItem,ctx:ToolDetailContext={}):PatchStatus {
 if(ctx.isAutoReviewDeclined?.(item)===true)return "auto-review-declined";
 if(item.success===true)return "applied";
 if(item.success===false)return "rejected";
 if(item.approvalRequestId!=null)return "pending";
 return ctx.isTurnCancelled===true?"stopped":"streaming";
}
/** SO branches, xC exec selection, PT visibility/status. */
export function projectToolActivityDetail(item:ToolItem,ctx:ToolDetailContext={}):ToolProjection {
 const workMode=ctx.isWorkMode===true;
 const hideRawCommand=workMode&&ctx.renderToolActivityInWorkMode===true;
 if(item.type==="exec"){
   if(!object(item.parsedCmd))return {kind:"fallback"};
   const summary=item.parsedCmd,hasRead=ctx.isMeaningfulRead?.(item)===true;
   if(workMode&&!hideRawCommand&&!hasRead)return {kind:"hidden",reason:"work-mode"};
   const rawType=summary.type;
   if((rawType==="read"||rawType==="search"||rawType==="list_files")&&
       summary.isFinished!==true&&!hasRead)return {kind:"hidden",reason:"running-exploration"};
   const declined=ctx.isAutoReviewDeclined?.(item)===true;
   const effective=declined?"unknown":rawType;
   const leaf=effective==="read"||effective==="search"||effective==="list_files"?effective:"command";
   const normalizedSummary=declined?{type:"unknown",cmd:summary.cmd,isFinished:true}:summary;
   const running=summary.isFinished!==true;
   return {kind:"exec",leaf,summary:normalizedSummary,isInProgress:running,wasInterrupted:item.executionStatus==="interrupted",
     wasDeclinedByAutoReview:declined,hideRawCommand,
     isBackgroundTerminalRunning:running&&ctx.isTurnInProgress!==true,
     isBackgroundTerminalFinished:!hideRawCommand&&!running&&
       ctx.isTurnInProgress!==true&&item.processId!=null};
 }
 if(item.type==="patch"){
   if(workMode&&!hideRawCommand)return {kind:"hidden",reason:"work-mode"};
   const status=getToolPatchStatus(item,ctx);
   const visible=ctx.hasVisualizationActivity?.(item)===true&&
     !["rejected","stopped","auto-review-declined"].includes(status);
   const fileCount=object(item.changes)?Object.keys(item.changes).length:0;
   if(!visible&&fileCount===0)return {kind:"hidden",reason:"empty-patch"};
   return {kind:"patch",status,showDiffDetails:!hideRawCommand,
     showVisualization:visible,isVisualizationInProgress:status==="streaming"||status==="pending",fileCount};
 }
 switch(item.type){
  case "mcp-tool-call":case "external-event":case "dynamic-tool-call":
  case "automatic-approval-review":case "web-search":return {kind:"host-leaf",leaf:item.type};
  case "userInput":case "plan-implementation":case "proposed-plan":
    return {kind:"hidden",reason:"ignored-event"};
  default:return {kind:"fallback"};
 }
}

/**
 * Source-derived raw activity classifier: xe/we/Te/O/D in
 * inline-followup-markdown-4751fe20f26d.js.
 * Private x,ue,y,he,pe,ne,T,S,oe,ye,g/Ee remain host dependencies.
 */
import type {AggregateUnit,ReviewFailure,SourceDescriptor,VisualizationKind} from "./AgentActivityAggregate.js";

export type RawActivityItem = {type:string; [key:string]:unknown};
export interface RawActivityHost {
  isLoadedToolRead?: (parsed:Readonly<Record<string,unknown>>,cwd:string|undefined)=>boolean;
  isHiddenMcpCall?: (item:RawActivityItem)=>boolean;
  shouldKeepMcpExpanded?: (item:RawActivityItem)=>boolean;
  resolveMcpSource?: (item:RawActivityItem)=>SourceDescriptor|null;
  resolveExternalEventSource?: (item:RawActivityItem)=>SourceDescriptor|null;
  classifyVisualizationCommand?: (item:RawActivityItem,cmd:string)=>VisualizationKind|null;
  getPatchLineChanges?: (path:string,change:Readonly<Record<string,unknown>>)=>{added:number;deleted:number}|null;
  normalizePath?: (path:string)=>string;
  resolveReadPath?: (path:string,cwd?:string)=>string;
  classifyPrivateEvent?: (item:RawActivityItem)=>AggregateUnit;
  suppressExec?: (item:RawActivityItem)=>boolean;
}
export interface RawActivityOptions {isTurnCancelled?:boolean;keepMcpAppCallsExpandedByDefault?:boolean}
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const str=(v:unknown):v is string=>typeof v==="string";
const parsed=(v:RawActivityItem)=>obj(v.parsedCmd)?v.parsedCmd:null;
const failures=(v:unknown):ReviewFailure[]=>Array.isArray(v)?v.flatMap((r):ReviewFailure[]=>
  obj(r)&&str(r.id)&&(r.status==="denied"||r.status==="timedOut")?[{id:r.id,status:r.status}]:[]):[];
const failureFields=(v:unknown):Pick<AggregateUnit,"automaticApprovalReviewFailures">=>{
  const xs=failures(v);return xs.length?{automaticApprovalReviewFailures:xs}:{};
};
/** D/Ce: source curl classifier; this labels activity, it never runs commands. */
export function isReadOnlyRemoteCurl(cmd:string):boolean {
  if(!/^\s*curl(?:\s|$)/.test(cmd))return false;
  if(/(?:^|\s)(?:-X\s*|--request(?:=|\s+))(?:POST|PUT|PATCH|DELETE)\b/i.test(cmd))return false;
  if(/(?:^|\s)(?:--data(?:-[^\s=]+)?|--json|--form|--upload-file)(?:=|\s|$)/.test(cmd))return false;
  if(/(?:^|\s)-(?:d|F|T)(?:=|\s|$)/.test(cmd))return false;
  return cmd.match(/\bhttps?:\/\/[^\s'"<>]+/gi)?.some(url=>{
    try {const host=new URL(url).hostname.toLowerCase();return host!=="localhost"&&!host.startsWith("127.");}
    catch{return false;}
  })===true;
}
/** Te: classify patch changes; private diff count and path normalization stay callbacks. */
function patch(raw:RawActivityItem,host:RawActivityHost,cancelled:boolean):AggregateUnit {
  if(!obj(raw.changes))return {type:"other"};
  const edits=Object.entries(raw.changes).filter(([,v])=>obj(v));
  if(edits.length===0&&raw.visualizationActivities!=null&&
      (raw.success===false||(raw.success==null&&cancelled)))return {type:"other"};
  const createdPaths:string[]=[],runningCreatedPaths:string[]=[],stoppedCreatedPaths:string[]=[];
  const editedPaths:string[]=[],runningEditedPaths:string[]=[],deletedPaths:string[]=[],runningDeletedPaths:string[]=[];
  let runningCreatedLineCount=0,changedLineCount=0;
  for(const [path,value] of edits){
    const change=value as Record<string,unknown>;
    const diff=host.getPatchLineChanges?.(path,change);
    changedLineCount+=(diff?.added??0)+(diff?.deleted??0);
    if(change.type==="add"){
      createdPaths.push(path);
      if(raw.success==null&&cancelled)stoppedCreatedPaths.push(path);
      else if(raw.success==null){
        runningCreatedPaths.push(path);
        if(str(change.content)&&change.content.length)runningCreatedLineCount+=
          change.content.split("\n").length-(change.content.endsWith("\n")?1:0);
      }
    }else if(change.type==="delete"){
      deletedPaths.push(path);if(raw.success==null)runningDeletedPaths.push(path);
    }else{
      editedPaths.push(path);if(raw.success==null)runningEditedPaths.push(path);
    }
  }
  const acts=Array.isArray(raw.visualizationActivities)?
    raw.visualizationActivities.flatMap((v):{path:string;kind:VisualizationKind}[]=>
      obj(v)&&str(v.path)&&(v.kind==="create"||v.kind==="update")?
        [{path:host.normalizePath?.(v.path)??v.path,kind:v.kind}]:[]):[];
  const visualizationActivity=raw.visualizationActivities==null||raw.success===false||
    (raw.success==null&&cancelled)?undefined:{activities:acts,isInProgress:raw.success==null};
  return {type:"patch",createdPaths,runningCreatedPaths,stoppedCreatedPaths,runningCreatedLineCount,changedLineCount,
    editedPaths,runningEditedPaths,deletedPaths,runningDeletedPaths,
    ...(visualizationActivity?{visualizationActivity}:{}),...failureFields(raw.automaticApprovalReviews)};
}
const nonTools=new Set(["reasoning","todo-list","worked-for","multi-agent-action","proposed-plan",
  "realtime-transcript","user-message","userInput","user-input-response","mcp-server-elicitation",
  "permission-request","turn-diff","plan-implementation","system-error","steered","stream-error",
  "subagent-activity","remote-task-created","context-compaction","personality-changed",
  "forked-from-conversation","model-changed","model-rerouted","auto-review-interruption-warning",
  "strict-review-notice","assistant-message","dil-reasoning","generated-image","image-view",
  "automation-update","dynamic-tool-call","worktree-init"]);
/** xe: raw activity => a unit compatible with the already restored Le/Be/Ve. */
export function classifyRawActivityItem(raw:RawActivityItem,host:RawActivityHost={},
    options:RawActivityOptions={}):AggregateUnit {
  if(raw.type==="external-event")return {type:"mcp-tool-call",isInProgress:false,
    ...(host.resolveExternalEventSource?{source:host.resolveExternalEventSource(raw)}:{})};
  if(raw.type==="patch")return patch(raw,host,options.isTurnCancelled===true);
  if(raw.type==="exec"){
    const cmd=parsed(raw);if(cmd==null)return {type:"other"};
    const cwd=str(raw.cwd)?raw.cwd:undefined;
    if(host.suppressExec?.(raw)===true||
      (cmd.type==="read"&&cmd.isFinished===false&&host.isLoadedToolRead?.(cmd,cwd)===true))
      return {type:"other"};
    const isInProgress=cmd.isFinished!==true;
    const shellCmd=cmd.type==="unknown"&&str(cmd.cmd)?cmd.cmd:null;
    const visual=shellCmd==null?null:host.classifyVisualizationCommand?.(raw,shellCmd)??null;
    const approval=failureFields(raw.automaticApprovalReviews);
    if(visual!=null)return {type:"exec",isInProgress,visualizationActivityKind:visual,...approval};
    if(shellCmd!=null&&/^\s*mkdir(?:\s|$)/.test(shellCmd))
      return {type:"exec",isInProgress,createsFolder:true,...approval};
    if(shellCmd!=null&&isReadOnlyRemoteCurl(shellCmd)&&
       (isInProgress||(obj(raw.output)&&raw.output.exitCode===0)))
      return {type:"exec",isInProgress,searchesWeb:true,...approval};
    return {type:"exec",isInProgress,...approval};
  }
  if(raw.type==="mcp-tool-call"){
    if(host.isHiddenMcpCall?.(raw)===true||
      (options.keepMcpAppCallsExpandedByDefault===true&&host.shouldKeepMcpExpanded?.(raw)===true))
      return {type:"other"};
    return {type:"mcp-tool-call",isInProgress:raw.completed!==true,
      ...(host.resolveMcpSource?{source:host.resolveMcpSource(raw)}:{}),
      ...failureFields(raw.automaticApprovalReviews)};
  }
  if(raw.type==="automatic-approval-review")return str(raw.id)&&
      (raw.status==="denied"||raw.status==="timedOut")
      ?{type:"automatic-approval-review",id:raw.id,status:raw.status}:{type:"other"};
  if(raw.type==="web-search")return {type:"web-search",count:1,runningCount:raw.completed?0:1};
  if(nonTools.has(raw.type))return {type:"other"};
  return host.classifyPrivateEvent?.(raw)??{type:"other"};
}
/** we: grouped exploration exec items, with private loader/path predicates injected. */
export function classifyExplorationActivityGroup(items:readonly RawActivityItem[],host:RawActivityHost={}):AggregateUnit {
  const readPaths:string[]=[],runningReadPaths:string[]=[],loadedToolPaths:string[]=[],runningLoadedToolPaths:string[]=[];
  const approval:ReviewFailure[]=[];let searchCount=0,runningSearchCount=0,listCount=0,runningListCount=0;
  for(const raw of items){
    if(raw.type!=="exec")continue;
    approval.push(...failures(raw.automaticApprovalReviews));
    const cmd=parsed(raw);if(cmd==null)continue;
    const running=cmd.isFinished!==true;
    if(cmd.type==="search"){searchCount++;if(running)runningSearchCount++;continue;}
    if(cmd.type==="list_files"){listCount++;if(running)runningListCount++;continue;}
    if(cmd.type==="read"){
      const from=str(cmd.path)?cmd.path:str(cmd.name)?cmd.name:null;
      if(from==null)continue;
      const cwd=str(raw.cwd)?raw.cwd:undefined;
      const path=host.resolveReadPath?.(from,cwd)??from;
      if(host.isLoadedToolRead?.(cmd,cwd)===true){
        loadedToolPaths.push(path);if(running)runningLoadedToolPaths.push(path);
      }else{readPaths.push(path);if(running)runningReadPaths.push(path);}
    }
  }
  return {type:"exploration",readPaths,runningReadPaths,loadedToolPaths,runningLoadedToolPaths,
    searchCount,runningSearchCount,listCount,runningListCount,
    ...(approval.length?{automaticApprovalReviewFailures:approval}:{})};
}
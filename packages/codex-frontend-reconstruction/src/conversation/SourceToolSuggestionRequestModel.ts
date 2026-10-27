/**
 * Source: uploaded Windows compiled frontend:
 * mcp-server-elicitation-request-panel-7318114289f7.js (at.toolSuggestion),
 * inline-tool-suggestion-request-card-bbfc54e45af0.js (ot/J/st/ct),
 * mcp-plugin-logo-807452fde2d3.js (ct compact request surface).
 *
 * Original J checks real app/plugin availability, install/enable state,
 * and host-verified readiness before accepting. A UI cannot infer any of
 * those capabilities from a suggestion. This projection does not do so.
 */
import type {
  SourceMcpApprovalContext,
  SourceMcpApprovalReplyTransport,
} from "./SourceMcpApprovalRequestModel.js";

export type SourceToolSuggestionTarget="connector"|"plugin";
export type SourceToolSuggestionAction="install"|"enable";

export interface SourceToolSuggestionRequest extends SourceMcpApprovalContext {
  requestId:string;
  toolId:string;
  toolName:string;
  targetType:SourceToolSuggestionTarget;
  suggestionAction:SourceToolSuggestionAction;
  /** Only verified host metadata, NOT arbitrary request description. */
  description?:string;
}

export type SourceToolSuggestionReplyTransport=SourceMcpApprovalReplyTransport;
export type SourceToolSuggestionSetupResult="started"|"ready";
export type SourceToolSuggestionStart=(request:SourceToolSuggestionRequest)=>
  Promise<SourceToolSuggestionSetupResult>;
export type SourceToolSuggestionCheckReady=(request:SourceToolSuggestionRequest)=>
  Promise<boolean>;

const object=(value:unknown):Record<string,unknown>|null=>
  value!=null&&typeof value==="object"&&!Array.isArray(value)
    ?value as Record<string,unknown>:null;

export function projectSourceToolSuggestion(
  elicitation:unknown,
  context:SourceMcpApprovalContext&{requestId:string},
):SourceToolSuggestionRequest|null{
  const e=object(elicitation);
  if(e?.kind!=="toolSuggestion")return null;
  const s=object(e.suggestion);
  if(s==null||
    (s.tool_type!=="connector"&&s.tool_type!=="plugin")||
    (s.suggest_type!=="install"&&s.suggest_type!=="enable")||
    typeof s.tool_id!=="string"||!s.tool_id.trim()||
    s.tool_id.length>256||typeof s.tool_name!=="string"||
    !s.tool_name.trim()||s.tool_name.length>256)
    return null;
  // Original J looks up actual description, logo and local plugin state.
  // Those are absent here; do not fabricate them from a request payload.
  return {
    ...context,toolId:s.tool_id,toolName:s.tool_name,
    targetType:s.tool_type,suggestionAction:s.suggest_type,
  };
}

/** Original J chooses Install/Enable, then Continue only after a real
 * host setup attempt; source st changes the title for pending installation. */
export function sourceToolSuggestionPrimaryLabel(
  request:Pick<SourceToolSuggestionRequest,"suggestionAction">,
  setupStarted:boolean,
):"Install"|"Enable"|"Continue"{
  return setupStarted?"Continue":
    request.suggestionAction==="install"?"Install":"Enable";
}
export function sourceToolSuggestionTitle(
  request:Pick<SourceToolSuggestionRequest,"toolName"|"targetType"|"suggestionAction">,
  setupStarted:boolean,
):string{
  if(!setupStarted||request.suggestionAction!=="install")
    return request.toolName;
  return request.targetType==="connector"
    ?'Click Continue when you’re done connecting '+request.toolName
    :'Click Continue when you’re done installing the '+request.toolName+' plugin';
}
export function sourceToolSuggestionReady(
  request:Pick<SourceToolSuggestionRequest,"targetType"|"suggestionAction">,
  state:{
    connector?:{isAccessible:boolean;isEnabled:boolean}|null;
    plugin?:{installed:boolean;enabled:boolean}|null;
  },
):boolean{
  // Direct source ct guard. A missing verified state is NEVER "ready".
  if(request.targetType==="connector"){
    const app=state.connector;
    return app?.isAccessible===true&&
      (request.suggestionAction==="install"||app.isEnabled===true);
  }
  const plugin=state.plugin;
  return plugin?.installed===true&&
    (request.suggestionAction==="install"||plugin.enabled===true);
}
export function sourceToolSuggestionKey(
  request:Pick<SourceToolSuggestionRequest,"hostId"|"conversationId"|"requestId">,
):string{
  return JSON.stringify([request.hostId,request.conversationId,request.requestId]);
}

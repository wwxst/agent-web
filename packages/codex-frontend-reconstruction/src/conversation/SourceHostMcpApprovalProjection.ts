/**
 * User-provided Windows compiled source:
 * mcp-server-elicitation-request-panel-7318114289f7.js (_t -> at, ft)
 * mcp-request-card-e83948fa712b.js (be -> ye, ke, Se, Ce, pe).
 *
 * SOURCE FORMAT ONLY: the independent frontend host is responsible for
 * authenticating a pending request and providing hostId/threadId/requestId.
 * Do not manufacture an MCP grant or resolve original connector metadata.
 */
import {
  projectSourceMcpGenericApprovalMessage,
  type SourceMcpApprovalContext,
  type SourceMcpApprovalRequest,
  type SourceMcpApprovalPersistence,
  type SourceMcpApprovalParameter,
} from "./SourceMcpApprovalRequestModel.js";

const object=(v:unknown):Record<string,unknown>|null=>
  v!=null&&typeof v==="object"&&!Array.isArray(v)
    ?v as Record<string,unknown>:null;
const optionalText=(v:unknown):string|null=>
  typeof v==="string"&&v.trim().length>0?v.trim():null;
function persistence(v:unknown):readonly SourceMcpApprovalPersistence[]|null {
  if(v==null)return [];
  if(!Array.isArray(v)||v.some(x=>x!=="session"&&x!=="always"))return null;
  return [...new Set(v as SourceMcpApprovalPersistence[])];
}
function displayParams(v:unknown):readonly SourceMcpApprovalParameter[]|null|undefined{
  if(v==null)return undefined;
  if(!Array.isArray(v)||v.length>80)return null;
  const result:SourceMcpApprovalParameter[]=[];
  for(const candidate of v){
    const data=object(candidate);
    if(data==null||typeof data.name!=="string"||!data.name.trim()||
      data.name.length>256||!("value" in data)||
      data.displayName!=null&&
        (typeof data.displayName!=="string"||data.displayName.length>256))
      return null;
    result.push({
      name:data.name,
      value:data.value,
      ...(typeof data.displayName==="string"?{displayName:data.displayName}:{}),
    });
  }
  return result;
}
function params(value:unknown):Readonly<Record<string,unknown>>|null{
  return value==null?{}:object(value);
}
const invalidScope=(value:unknown):boolean=>
 value!==undefined&&value!==null&&typeof value!=="string";
const invalidDisabled=(value:unknown):boolean=>
 value!==undefined&&value!==null&&typeof value!=="boolean";

/**
 * "generic": source be reads message, serverName, metadata.reason, subtitle,
 * toolParams, toolParamsDisplay, persist, riskLevel and approveDisabled.
 * "mcpToolCall": be reads message, approval.connector_id/name,
 * approval.tool_params/persist, and the parent risk/disabled presentation.
 *
 * Special browserEmailOtp and approvalPresentation require OTHER private
 * verified host metadata. Returning null means a visibly pending readonly
 * row, not a guessed authorization interface.
 */
export function projectSourceHostMcpApproval(
 elicitation:unknown,
 context:SourceMcpApprovalContext&{requestId:string},
):SourceMcpApprovalRequest|null {
 const data=object(elicitation);
 if(data==null||
   (data.kind!=="generic"&&data.kind!=="mcpToolCall")||
   typeof data.message!=="string"||!data.message.trim()||
   invalidScope(data.riskLevel)||invalidDisabled(data.approveDisabled)||
   invalidDisabled(data.disabled)||invalidScope(data.subtitle))
   return null;
 if(data.approvalPresentation!=null||data.browserEmailOtp!=null)return null;
 const risk=optionalText(data.riskLevel);
 const subtitle=optionalText(data.subtitle);
 const disabled=data.disabled===true;
 const approveDisabled=data.approveDisabled===true;
 if(data.kind==="generic"){
   if(typeof data.serverName!=="string")return null;
   const persist=persistence(data.persist);
   const parameters=params(data.toolParams);
   const paramDisplay=displayParams(data.toolParamsDisplay);
   if(persist==null||parameters==null||paramDisplay===null)return null;
   const presented=projectSourceMcpGenericApprovalMessage(
     data.message,data.metadata);
   // Original Oe removes connector_/connector- before fallback to "Server".
   const connectorName=data.serverName.trim().replace(/^connector[_-]/,"")||"Server";
   return {
     ...context,title:presented.title,connectorName,
     reason:presented.reason,subtitle,riskLevel:risk,
     disabled,approveDisabled,
     persist,toolParams:parameters,
     ...(paramDisplay===undefined?{}:{toolParamsDisplay:paramDisplay}),
     collapseToolParams:false,
   };
 }
 const approval=object(data.approval);
 if(approval==null||typeof approval.tool_name!=="string"||
    !approval.tool_name.trim()||
    typeof approval.connector_id!=="string"||!approval.connector_id.trim())
   return null;
 const persist=persistence(approval.persist);
 const parameters=params(approval.tool_params);
 const paramDisplay=displayParams(data.toolParamsDisplay);
 if(persist==null||parameters==null||paramDisplay===null)return null;
 const connectorName=optionalText(approval.connector_name)||
   optionalText(approval.connector_id)||"Connector";
 // Original pe resolves display name/logo from trusted host connector metadata.
 // Such metadata is not available to this independently hosted frontend.
 // Fall back to source-provided connector_name, never invent an icon or logo.
 return {
   ...context,title:data.message,connectorName,
   subtitle,riskLevel:risk,disabled,approveDisabled,
   persist,toolParams:parameters,
   ...(paramDisplay===undefined?{}:{toolParamsDisplay:paramDisplay}),
   // Source be applies collapseToolParams only when real approval
   // presentation re(...) is available. Do not infer it from tool kind.
   collapseToolParams:false,
 };
}

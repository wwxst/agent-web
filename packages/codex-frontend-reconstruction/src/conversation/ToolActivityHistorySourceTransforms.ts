export type HistoryToolItem = Record<string, unknown> & { type: string };
export type McpContent =
 | {type:"text";text:string;annotations:Record<string,unknown>|undefined}
 | {type:"image"|"audio";data:string;mimeType:string;annotations:Record<string,unknown>|undefined}
 | {type:"resource_link";uri:string;name:string|undefined;title:string|undefined;description:string|undefined;mimeType:string|undefined;annotations:Record<string,unknown>|undefined}
 | {type:"embedded_resource";resource:Record<string,unknown>}
 | {type:"unknown";raw:unknown};
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const optionalString=(v:unknown):string|undefined=>typeof v==="string"?v:undefined;
const optionalNumber=(v:unknown):number|undefined=>typeof v==="number"&&Number.isFinite(v)?v:undefined;
const externalToolOpen=/^\[external_agent_tool_(call|result)(?::[^\]]*)?\]$/;
const externalToolClose=/^\[\/external_agent_tool_(call|result)\]$/;
const externalSessionImported="<EXTERNAL SESSION IMPORTED>";
const memoryCitationOpen="<oai-mem-citation>";
const memoryCitationNames=[memoryCitationOpen,"[oai-mem-citation]"];
const memoryCitationBlocks=/(?:<oai-mem-citation>|\[oai-mem-citation\])(?:(?!(?:<oai-mem-citation>|\[oai-mem-citation\])).)*?<\/oai-mem-citation>/gs;
const paddedCdata=/^<!\[CDATA\[ ([\s\S]*) \]\]>$/;
const paddedCdataPrefix="<![CDATA[ ";
const skipCompletion=/^::\s*SKIP_COMPLETION\s*::$/;
const visualizationFilePath=/(?:^|[\\/])(?:\.codex|(?:\.codex-workspaces|OpenAI[\\/]Codex[\\/]workspaces)(?:[\\/]instances[\\/][0-9a-f-]+)?)[\\/]visualizations[\\/]\d{4}[\\/]\d{2}[\\/]\d{2}[\\/]([a-zA-Z0-9_-]+)[\\/][a-z0-9]+(?:-[a-z0-9]+)*\.html$/;
function unwrapPaddedCdata(content:string,enabled:boolean):string {
 const match=content.match(paddedCdata);
 if(match==null)return enabled&&content.startsWith(paddedCdataPrefix)?content.slice(10):content;
 return match[1]??"";
}
function firstMemoryCitation(content:string,start=0):number {
 let found=-1;
 for(const tag of memoryCitationNames){const i=content.indexOf(tag,start);if(i!==-1&&(found===-1||i<found))found=i;}
 return found;
}
function trimIncompleteMemoryCitation(content:string):string {
 let target=firstMemoryCitation(content);if(target===-1)return content;
 const tickChar=String.fromCharCode(96);let cursor=0;
 while(cursor<content.length){
  const tick=content.indexOf(tickChar,cursor);if(tick===-1)break;
  let slashes=0;for(;content[tick-slashes-1]===String.fromCharCode(92);)slashes+=1;
  if(slashes%2===1){cursor=tick+1;continue;}
  let fenceEnd=tick+1;for(;content[fenceEnd]===tickChar;)fenceEnd+=1;
  const fence=content.slice(tick,fenceEnd);let closing=content.indexOf(fence,fenceEnd);
  while(closing!==-1&&(content[closing-1]===tickChar||content[closing+fence.length]===tickChar))
   closing=content.indexOf(fence,closing+fence.length);
  if(closing===-1){cursor=fenceEnd;continue;}
  if(target>=fenceEnd&&target<closing&&memoryCitationNames.includes(content.slice(fenceEnd,closing).trim()))
   target=firstMemoryCitation(content,target+1);
  cursor=closing+fence.length;
 }
 return target===-1?content:content.slice(0,target);
}
interface CleanAssistantContent {content:string;removed:boolean;isSkippedCompletion?:boolean}
function cleanAssistantContent(content:string,isStreaming:boolean,unwrapCdata:boolean):CleanAssistantContent {
 const unwrapped=unwrapPaddedCdata(content,unwrapCdata);
 if(skipCompletion.test(unwrapped.trim()))return {content:"",removed:true,isSkippedCompletion:true};
 const changedByUnwrap=unwrapped!==content;
 let cleaned=trimIncompleteMemoryCitation(unwrapped.replace(memoryCitationBlocks,""));
 const incompleteStart=isStreaming?cleaned.lastIndexOf("<"):-1;
 if(incompleteStart!==-1&&memoryCitationOpen.startsWith(cleaned.slice(incompleteStart)))cleaned=cleaned.slice(0,incompleteStart);
 if(changedByUnwrap&&cleaned===unwrapped)return {content:cleaned,removed:true};
 let changed=cleaned!==content;const trimmedStart=cleaned.trimStart();
 if(cleaned.trim()===externalSessionImported||trimmedStart.startsWith("[external tool call:")||
   trimmedStart.startsWith("[external tool result]")||trimmedStart.startsWith("[external tool result:"))
  return {content:"",removed:true};
 if(cleaned===content&&!cleaned.includes("[oai-mem-citation]"))return {content,removed:false};
 let openBlock:string|null=null;const visibleLines:string[]=[];
 for(const line of cleaned.split(/\r?\n/)){
  const trimmed=line.trim();
  if(openBlock!=null){changed=true;if(externalToolClose.exec(trimmed)?.[1]===openBlock)openBlock=null;continue;}
  const opening=externalToolOpen.exec(trimmed);
  if(opening!=null){openBlock=opening[1]??null;changed=true;continue;}
  visibleLines.push(line);
 }
 cleaned=visibleLines.join("\n").replace(/\n{3,}/g,"\n\n").trim();changed=changed||cleaned!==content;
 return {content:cleaned,removed:changed};
}
interface ParsedHeartbeat {decision:"NOTIFY"|"DONT_NOTIFY";visibleText:string;notificationMessage:string|null}
interface HeartbeatProjection {displayContent:string;artifactScanContent:string;parsedHeartbeat:ParsedHeartbeat|null}
function visibleTextWithoutHeartbeat(content:string):string|null {
 const trimmed=content.trim();
 const visible=trimmed.replace(/\x60{3}(?:xml)?\s*<heartbeat>[\s\S]*?<\/heartbeat>\s*\x60{3}/gi,"")
  .replace(/<heartbeat>[\s\S]*?<\/heartbeat>/gi,"").trim();
 return visible===trimmed?null:visible;
}
function lastHeartbeat(content:string):string|null {
 return Array.from(content.trim().matchAll(/<heartbeat>[\s\S]*?<\/heartbeat>/gi)).at(-1)?.[0]??null;
}
function heartbeatMessage(block:string):string {
 const message=block.match(/<message>\s*([\s\S]*?)\s*<\/message>/i)?.[1]?.trim()??"";
 return message.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/)?.[1]?.trim()??message;
}
function parseHeartbeat(content:string):ParsedHeartbeat|null {
 const visible=visibleTextWithoutHeartbeat(content),block=lastHeartbeat(content);
 if(visible==null||block==null)return null;
 const decision=block.match(/<decision>\s*(NOTIFY|DONT_NOTIFY)\s*<\/decision>/i);
 if(decision==null)return null;
 const message=heartbeatMessage(block);
 return {decision:decision[1]?.toUpperCase()==="NOTIFY"?"NOTIFY":"DONT_NOTIFY",
  visibleText:visible,notificationMessage:message.length>0?message:null};
}
function parseHeartbeatTurn(content:string):ParsedHeartbeat|null {
 const unwrapped=content.match(/^<!\[CDATA\[ ([\s\S]*) \]\]>$/)?.[1]??content;
 if(unwrapped.trim()==="DONT_NOTIFY")return {decision:"DONT_NOTIFY",visibleText:"",notificationMessage:null};
 return parseHeartbeat(content);
}
function visibleHeartbeatTurnFallback(content:string):string {
 return visibleTextWithoutHeartbeat(content)??"";
}
function stripIncompleteHeartbeat(content:string):string {
 let start=content.toLowerCase().indexOf("<heartbeat>");const lastOpen=content.lastIndexOf("<");
 if(start===-1)start=lastOpen!==-1&&"<heartbeat>".startsWith(content.slice(lastOpen).toLowerCase())?lastOpen:content.length;
 if(start===content.length){
  const fence=content.search(/\x60{3}(?:x(?:m(?:l)?)?)?\s*$/i);
  if(fence===-1||(content.slice(0,fence).match(/\x60{3}/g)?.length??0)%2!==0)return content;
  return content.slice(0,fence).trim();
 }
 return content.slice(0,start).replace(/\x60{3}(?:xml)?\s*$/i,"").trim();
}
function projectHeartbeat(content:string,isTurn:boolean,isRequest:boolean,isStreaming:boolean):HeartbeatProjection {
 const parsed=isTurn?parseHeartbeatTurn(content):parseHeartbeat(content);
 let display=parsed?.visibleText??(isTurn?visibleHeartbeatTurnFallback(content):content);
 if((isTurn||isRequest)&&isStreaming)display=stripIncompleteHeartbeat(display);
 const notification=parsed?.notificationMessage??null;
 return {displayContent:display,
  artifactScanContent:notification==null||display.includes(notification)?display:[display,notification].filter(Boolean).join("\n"),
  parsedHeartbeat:parsed};
}
export function normalizeAssistantHistoryContent(args:{
 content:unknown;phase:unknown;isStreaming:boolean;
 isHeartbeatAutomationTurn:boolean;isHeartbeatAutomationRequest:boolean;
}):Record<string,unknown>&{content:string;completed:boolean;isSkippedCompletion:boolean|undefined;
 renderPlaceholderWhileStreaming:boolean;structuredOutput:Record<string,unknown>|undefined;hidden:boolean;artifactScanContent:string} {
 const raw=typeof args.content==="string"?args.content:"";
 const cleaned=cleanAssistantContent(raw,args.isStreaming,args.phase==="final_answer");
 const heartbeat=args.isHeartbeatAutomationTurn||args.isHeartbeatAutomationRequest||/<heartbeat>/i.test(cleaned.content)
  ?projectHeartbeat(cleaned.content,args.isHeartbeatAutomationTurn,args.isHeartbeatAutomationRequest,args.isStreaming):null;
 const content=heartbeat?.displayContent??cleaned.content,parsed=heartbeat?.parsedHeartbeat??null;
 const structuredOutput=parsed==null?undefined:{type:"heartbeat",decision:parsed.decision,notificationMessage:parsed.notificationMessage};
 return {content,completed:!args.isStreaming,isSkippedCompletion:cleaned.isSkippedCompletion,
  renderPlaceholderWhileStreaming:args.isStreaming&&!cleaned.isSkippedCompletion&&
   (content.trimStart().startsWith("{")||heartbeat!=null&&parsed==null&&content.length===0),
  structuredOutput,hidden:cleaned.removed&&cleaned.content.length===0&&!cleaned.isSkippedCompletion,
  artifactScanContent:heartbeat?.artifactScanContent??cleaned.content};
}
export function formatReasoningSummary(summary:unknown):string {
 const parts=Array.isArray(summary)?summary as unknown[]:[],first=parts[0],rest=parts.slice(1);
 if(!first||rest.length===0)return typeof first==="string"?first:"";
 const lines=parts.map(value=>typeof value==="string"?value:String(value));
 if(typeof first==="string"&&first.startsWith("**"))return lines.join("\n\n");
 return ["**"+lines[0]+"**",...lines.slice(1)].join("\n\n");
}
export function isCodexVisualizationFileChange(change:unknown):boolean {
 if(!record(change))return false;
 const kind=record(change.kind)?change.kind:{};
 const path=kind.type==="update"?(kind.move_path??change.path):change.path;
 return typeof path==="string"&&visualizationFilePath.test(path);
}
export function mapHistoryFileChanges(changes:unknown):Record<string,unknown> {
 const mapped:Record<string,unknown>={};if(!Array.isArray(changes))return mapped;
 for(const value of changes){
  if(!record(value)||isCodexVisualizationFileChange(value))continue;
  const path=value.path,kind=record(value.kind)?value.kind:null;if(typeof path!=="string"||kind==null)continue;
  const diff=value.diff;
  switch(kind.type){
   case "add":mapped[path]={type:"add",content:diff};break;
   case "delete":mapped[path]={type:"delete",content:diff};break;
   case "update":mapped[path]={type:"update",unified_diff:diff,move_path:kind.move_path??null};break;
  }
 }
 return mapped;
}
export function extractImageGenerationFailure(entity:unknown):Record<string,unknown>|undefined {
 if(!record(entity))return undefined;const failure=entity.failure;if(failure===undefined)return undefined;
 if(!record(failure)||failure.type!=="usageLimitExceeded"||typeof failure.limitId!=="string"||
  !(failure.resetsAt===null||typeof failure.resetsAt==="number"&&Number.isFinite(failure.resetsAt)))return undefined;
 return {type:"usageLimitExceeded",limitId:failure.limitId,resetsAt:failure.resetsAt};
}
export function isCodexAppMessageTool(server:unknown,appContext:unknown):boolean {
 return server==="codex_apps"&&record(appContext)&&appContext.connectorId==="connector_openai_orbit_user_channel"&&
  (appContext.actionName==="send_message"||appContext.actionName==="send_voice_memo");
}
export function getVisualizationActivityKind(activities:unknown):"create"|"update"|null {
 if(!Array.isArray(activities))return null;let result:"update"|null=null;
 for(const value of activities){if(!record(value))continue;if(value.kind==="create")return "create";if(value.kind==="update")result="update";}
 return result;
}
export function isAutoReviewDeclinedToolActivity(item:HistoryToolItem):boolean {
 const status=item.type==="exec"?item.executionStatus:item.status;
 return status==="declined"&&Array.isArray(item.automaticApprovalReviews)&&
  item.automaticApprovalReviews.some(review=>record(review)&&review.status==="denied")===true;
}
function normalizeAnnotations(value:unknown):Record<string,unknown>|undefined {
 if(!record(value))return undefined;const output:Record<string,unknown>={};
 if(Array.isArray(value.audience)&&value.audience.length>0&&value.audience.every(x=>x==="assistant"||x==="user"))output.audience=value.audience;
 const priority=optionalNumber(value.priority);if(priority!==undefined)output.priority=priority;
 const lastModified=optionalString(value.lastModified);if(lastModified!==undefined)output.lastModified=lastModified;
 return Object.keys(output).length>0?output:undefined;
}
function normalizeResource(value:unknown):Record<string,unknown>|null {
 if(!record(value)||typeof value.uri!=="string")return null;
 return {uri:value.uri,name:optionalString(value.name),title:optionalString(value.title),
  description:optionalString(value.description),mimeType:optionalString(value.mimeType),
  text:optionalString(value.text),blob:optionalString(value.blob),annotations:normalizeAnnotations(value.annotations)};
}
export function normalizeMcpContentItem(value:unknown):McpContent {
 if(!record(value)||typeof value.type!=="string")return {type:"unknown",raw:value};
 const annotations=normalizeAnnotations(value.annotations);
 switch(value.type){
  case "text":return typeof value.text==="string"?{type:"text",text:value.text,annotations}:{type:"unknown",raw:value};
  case "image":case "audio":return typeof value.data==="string"&&typeof value.mimeType==="string"
   ?{type:value.type,data:value.data,mimeType:value.mimeType,annotations}:{type:"unknown",raw:value};
  case "resource_link":return typeof value.uri==="string"?{
   type:"resource_link",uri:value.uri,name:optionalString(value.name),title:optionalString(value.title),
   description:optionalString(value.description),mimeType:optionalString(value.mimeType),annotations,
  }:{type:"unknown",raw:value};
  case "resource":case "embedded_resource":{
   const resource=normalizeResource(value.resource);
   return resource==null?{type:"unknown",raw:value}:{type:"embedded_resource",resource};
  }
  default:return {type:"unknown",raw:value};
 }
}
export function formatMcpToolResult(result:unknown,error:unknown,status:unknown):Record<string,unknown>|null {
 if(!result&&!error)return null;
 if(error)return {type:"error",kind:"protocol",error:record(error)?error.message:undefined,rawError:error,raw:result??undefined};
 if(!record(result))return null;
 const rawContent=Array.isArray(result.content)?result.content:[],content=rawContent.map(normalizeMcpContentItem);
 if(status==="failed"){
  const textParts=content.flatMap(item=>item.type==="text"?[item.text]:[]);let message=textParts.join("\n");
  if(!message){const fallback=result.structuredContent??result.content;message=JSON.stringify(fallback)??"";}
  return {type:"error",kind:"tool",error:message,raw:result};
 }
 return {type:"success",content,structuredContent:result.structuredContent,raw:result};
}

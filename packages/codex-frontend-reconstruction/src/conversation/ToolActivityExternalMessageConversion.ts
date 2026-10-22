import type { ToolItem } from "./ToolActivityDetailModel.js";
import { isCodexAppMessageTool, normalizeAssistantText, type HistoryToolItem } from "./ToolActivityHistorySourceTransforms.js";
type Channel="phone_number"|"whatsapp"|"slack";
type Transport="imessage"|"rcs"|"unknown";
interface Receipt {
 status:"accepted";channel:Channel;transport?:Transport;batch_index?:number;message_id:string|null;
 text?:string|null;library_file_id?:string;library_file_ids?:string[];workspace_id?:string|null;
}
interface ParsedReceipts {receipts:Receipt[];partial:boolean}
interface AppArgs {channel:Channel;text?:string|null;library_file_ids:string[];destination?:{message_id?:string}|null;metadata?:{effect?:string|null}|null}
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const nonempty=(v:unknown):v is string=>typeof v==="string"&&v.length>0;
const effects=new Set(["slam","loud","gentle","invisible","confetti","fireworks","balloons","heart","lasers","celebration","sparkles","spotlight","echo"]);
function normalizeChannel(value:unknown):Channel|null {
 if(value==="imessage"||value==="rcs")return "phone_number";
 return value==="phone_number"||value==="whatsapp"||value==="slack"?value:null;
}
function parseArgs(value:unknown):AppArgs|null {
 if(!record(value))return null;
 const channel=normalizeChannel(value.channel);
 if(channel==null||(value.text!=null&&typeof value.text!=="string"))return null;
 const files=value.library_file_ids===undefined?[]:
  Array.isArray(value.library_file_ids)&&value.library_file_ids.every(nonempty)?value.library_file_ids as string[]:null;
 if(files==null)return null;
 let destination:AppArgs["destination"];
 if(value.destination==null)destination=value.destination as null|undefined;
 else if(record(value.destination)){
  if("message_id" in value.destination&&!nonempty(value.destination.message_id))return null;
  destination={...(nonempty(value.destination.message_id)?{message_id:value.destination.message_id}:{})};
 }else return null;
 let metadata:AppArgs["metadata"];
 if(value.metadata==null)metadata=value.metadata as null|undefined;
 else if(record(value.metadata)&&(value.metadata.effect==null||
  typeof value.metadata.effect==="string"&&effects.has(value.metadata.effect)))
  metadata={...(value.metadata.effect===undefined?{}:{effect:value.metadata.effect as string|null})};
 else metadata=undefined;
 return {channel,text:value.text as string|null|undefined,library_file_ids:files,destination,metadata};
}
function parseReceipt(value:unknown):Receipt|null {
 if(!record(value)||value.status!=="accepted"||!(value.message_id===null||nonempty(value.message_id)))return null;
 if(value.batch_index!==undefined&&!(typeof value.batch_index==="number"&&Number.isInteger(value.batch_index)&&value.batch_index>=0))return null;
 if(value.text!=null&&typeof value.text!=="string")return null;
 if(value.library_file_id!==undefined&&!nonempty(value.library_file_id))return null;
 if(value.library_file_ids!==undefined&&(!Array.isArray(value.library_file_ids)||!value.library_file_ids.every(nonempty)))return null;
 let channel:Channel,transport:Transport|undefined;
 if(value.channel==="phone_number"){
  channel="phone_number";
  if(value.transport===undefined)transport="unknown";
  else if(value.transport==="imessage"||value.transport==="rcs"||value.transport==="unknown")transport=value.transport;
  else return null;
 }else if(value.channel==="imessage"||value.channel==="rcs"){
  channel="phone_number";transport=value.channel;
 }else if(value.channel==="whatsapp"||value.channel==="slack")channel=value.channel;
 else return null;
 const workspace=value.workspace_id==null?value.workspace_id as null|undefined:nonempty(value.workspace_id)?value.workspace_id:undefined;
 return {status:"accepted",channel,...(transport===undefined?{}:{transport}),
  ...(value.batch_index===undefined?{}:{batch_index:value.batch_index as number}),
  message_id:value.message_id as string|null,
  ...(value.text===undefined?{}:{text:value.text as string|null}),
  ...(value.library_file_id===undefined?{}:{library_file_id:value.library_file_id as string}),
  ...(value.library_file_ids===undefined?{}:{library_file_ids:value.library_file_ids as string[]}),
  ...(workspace===undefined?{}:{workspace_id:workspace})};
}
function parseReceiptArray(value:unknown):Receipt[]|null {
 if(!Array.isArray(value))return null;
 const rows=value.map(parseReceipt);return rows.some(row=>row==null)?null:rows as Receipt[];
}
function sorted(receipts:Receipt[]):Receipt[]{return receipts.sort((a,b)=>(a.batch_index??0)-(b.batch_index??0));}
function parseAcceptedReceipts(value:unknown):ParsedReceipts|null {
 const single=parseReceipt(value);if(single)return {receipts:[single],partial:false};
 if(!record(value)||value.status!=="accepted"||!Array.isArray(value.messages))return null;
 const channel=normalizeChannel(value.channel);if(channel==null)return null;
 const messages=parseReceiptArray(value.messages);
 const extra=value.accepted_messages_without_channel===undefined?[]:parseReceiptArray(value.accepted_messages_without_channel);
 if(messages==null||extra==null)return null;
 const receipts=sorted([...messages,...extra]);
 if(receipts.length===0||receipts.some(row=>row.channel!==channel))return null;
 return {receipts,partial:false};
}
function parsePartialReceipts(value:unknown):ParsedReceipts|null {
 if(!record(value)||!Array.isArray(value.accepted_messages))return null;
 const accepted=parseReceiptArray(value.accepted_messages);
 const extra=value.accepted_messages_without_channel===undefined?[]:parseReceiptArray(value.accepted_messages_without_channel);
 if(accepted==null||extra==null)return null;
 const receipts=sorted([...accepted,...extra]);return receipts.length>0?{receipts,partial:true}:null;
}
function slackChannel(receipts:Receipt[]):Record<string,unknown>|undefined {
 const rows=receipts.map(receipt=>{
  const match=/^slack:([CDG][A-Z0-9]+):([0-9]{1,20}\.[0-9]{1,10})?:([0-9]{1,20}\.[0-9]{1,10})$/.exec(receipt.message_id??"");
  if(match?.[0]!==receipt.message_id)return undefined;
  const id=match[1],timestamp=match[3];
  return id==null||timestamp==null?undefined:{id,teamId:receipt.workspace_id??undefined,thread:{rootId:match[2]||timestamp}};
 });
 const first=rows[0];
 return first!=null&&rows.every(row=>row!=null&&row.id===first.id&&row.teamId===first.teamId&&
  record(row.thread)&&record(first.thread)&&row.thread.rootId===first.thread.rootId)?first:undefined;
}
function renderIMessageAction(action:Record<string,unknown>):string {
 switch(action.actionName){
  case "send_message":case "send_voice_memo":return typeof action.text==="string"?action.text:"";
  case "send_message_with_effect":return String(action.text??"")+"\n"+String(action.effect??"");
  case "reply_to_message":{
   const target=record(action.target)?action.target:{};
   return [action.text,target.messageId,target.partIndex,action.effect].filter(value=>value!=null).join("\n");
  }
  default:return "";
 }
}
function convertCodexAppsMessage(item:HistoryToolItem):ToolItem|null {
 if(item.type!=="mcpToolCall"||!isCodexAppMessageTool(item.server,item.appContext)||item.status==="inProgress")return null;
 const args=parseArgs(item.arguments),result=record(item.result)?item.result:{};
 const parsed=item.status==="failed"||item.error!=null?parsePartialReceipts(result.structuredContent):parseAcceptedReceipts(result.structuredContent);
 if(args==null||parsed==null||parsed.receipts.some(receipt=>receipt.channel!==args.channel))return null;
 const first=parsed.receipts[0];if(first==null)return null;
 const voiceMemo=record(item.appContext)&&item.appContext.actionName==="send_voice_memo";
 if(voiceMemo&&(first.channel!=="phone_number"||first.transport!=="imessage"||args.destination!=null))return null;
 const textParts:string[]=[];let attachmentCount=0;
 for(const [index,receipt] of parsed.receipts.entries()){
  const text=receipt.text??(!parsed.partial&&index===0?args.text:null);
  if(text)textParts.push(text);
  attachmentCount+=receipt.library_file_ids?.length??(receipt.library_file_id==null?0:1);
 }
 if(!parsed.partial&&attachmentCount===0)attachmentCount=args.library_file_ids.length;
 const content=textParts.join("\n");
 if(!content.trim()&&attachmentCount===0)return null;
 if(first.channel==="phone_number"&&first.transport!=="unknown"&&
  parsed.receipts.every(receipt=>receipt.channel==="phone_number"&&receipt.transport===first.transport)){
  const effect=args.metadata?.effect,messageId=args.destination?.message_id;
  const action:Record<string,unknown>=voiceMemo?{actionName:"send_voice_memo",text:content}:
   messageId==null?effect==null?{actionName:"send_message",text:content}:
    {actionName:"send_message_with_effect",text:content,effect}:
    {actionName:"reply_to_message",text:content,effect:effect??null,target:{messageId,partIndex:null}};
  return {type:"assistant-message",externalDelivery:{provider:first.transport,state:"accepted",attachmentCount},
   searchItemId:item.id,content:renderIMessageAction(action),sentAtMs:null,completed:true,phase:null,
   structuredOutput:undefined,aeonImessageAction:action,aeonSentMessage:true};
 }
 return {type:"assistant-message",content,searchItemId:item.id,sentAtMs:null,completed:true,phase:null,
  structuredOutput:undefined,aeonSentMessage:true,
  externalDelivery:{provider:first.channel==="phone_number"?"phone":first.channel,state:"accepted",attachmentCount,
   channel:first.channel==="slack"?slackChannel(parsed.receipts):undefined}};
}
interface ExternalChannelMessage {
 channel:"slack"|"teams";workspace_id?:string|null;source_thread_id?:string|null;
 message:string;destination:string;delivery_status:"sent"|"failed"|"unknown";
}
function parseExternalChannelMessage(item:HistoryToolItem):ExternalChannelMessage|null {
 if(item.server!=="codex_apps"||(item.tool!=="slackbot.send_message"&&item.tool!=="teamsbot.send_message"))return null;
 const result=record(item.result)?item.result:{};
 const structured=record(result.structuredContent)?result.structuredContent:{},raw=structured.external_channel_message;
 if(!record(raw)||(raw.channel!=="slack"&&raw.channel!=="teams")||raw.direction!=="outgoing"||
  !nonempty(raw.binding_id)||typeof raw.message!=="string"||!nonempty(raw.destination)||
  (raw.delivery_status!=="sent"&&raw.delivery_status!=="failed"&&raw.delivery_status!=="unknown"))return null;
 if(item.tool!==(raw.channel==="slack"?"slackbot.send_message":"teamsbot.send_message"))return null;
 if("message_id" in raw&&raw.message_id!==undefined&&raw.message_id!==null&&typeof raw.message_id!=="string")return null;
 const workspace=raw.workspace_id==null?raw.workspace_id as null|undefined:nonempty(raw.workspace_id)?raw.workspace_id:undefined;
 const sourceThread=raw.source_thread_id==null?raw.source_thread_id as null|undefined:
  typeof raw.source_thread_id==="string"?raw.source_thread_id:undefined;
 return {channel:raw.channel,...(workspace===undefined?{}:{workspace_id:workspace}),
  ...(sourceThread===undefined?{}:{source_thread_id:sourceThread}),message:raw.message,destination:raw.destination,
  delivery_status:raw.delivery_status};
}
/** Source app-initial Ihn/ihn/Fhn: convert recognized outgoing external-delivery records only. */
export function convertMcpToolCallHistoryEntity(item:HistoryToolItem):ToolItem|null {
 if(item.type!=="mcpToolCall")return null;
 const appMessage=convertCodexAppsMessage(item);
 if(appMessage!=null&&record(appMessage.externalDelivery)&&appMessage.externalDelivery.provider==="slack")return appMessage;
 const external=parseExternalChannelMessage(item);if(external==null)return null;
 const content=normalizeAssistantText(external.message);if(content.length===0)return null;
 const root=typeof external.source_thread_id==="string"&&/^\d+\.\d+$/.test(external.source_thread_id)
  ?{rootId:external.source_thread_id}:undefined;
 return {type:"assistant-message",content,searchItemId:item.id,sentAtMs:null,completed:item.status!=="inProgress",
  phase:null,structuredOutput:undefined,aeonSentMessage:true,
  externalDelivery:{provider:external.channel,channel:{id:external.destination,
   teamId:external.channel==="slack"?external.workspace_id??undefined:undefined,
   thread:external.channel==="slack"?root:undefined},state:external.delivery_status}};
}

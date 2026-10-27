/**
 * Source: uploaded Windows Codex compiled request-panel-26c348285c1a.js
 * ei (form controller), _n (draft), vn -> Mt(schema, values), Yr (question
 * header/nav), Wr -> ur (field rendering), wn (Skip for now/Next/Continue).
 * This is the **plain string** subset of original formElicitation, not a
 * generic replacement for fileOptions, choices, arrays, special formats,
 * confirmation presentations, or openai/legacy schemas.
 */
export interface SourceTextFormField {
 name:string; title:string; description:string;
 required:boolean; minLength?:number; maxLength?:number;
}
export interface SourceTextFormRequest{
 hostId:string;conversationId:string;requestId:string;
 kind:"formElicitation";serverName:string;message:string;
 fields:readonly SourceTextFormField[];
}
export interface SourceTextFormReply{
 hostId:string;conversationId:string;requestId:string;
 action:"accept"|"decline"|"cancel";
 content:Record<string,string>|null;
}
export type SourceTextFormReplyTransport=(value:SourceTextFormReply)=>Promise<void>;
const object=(v:unknown):Record<string,unknown>|null=>
 v!==null&&typeof v==="object"&&!Array.isArray(v)
   ?v as Record<string,unknown>:null;
const string=(v:unknown,max:number):v is string=>
 typeof v==="string"&&v.length<=max&&
 !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v);
const id=(v:unknown)=>typeof v==="string"&&v.length>0&&v.length<=256&&
 v.trim()===v&&!/[\u0000-\u001f\u007f]/u.test(v);
const lengthBound=(v:unknown)=>v===undefined||v===null||
 Number.isInteger(v)&&typeof v==="number"&&v>=0&&v<=16384;
const ALLOWED_FIELD_KEYS=new Set([
 "type","title","description","minLength","maxLength",
]);
const ALLOWED_SCHEMA_KEYS=new Set([
 "type","properties","required","additionalProperties","title","description",
]);
/** A conservative source-supported subset: never convert unknown fields
 * into text boxes or silently drop a required field. */
export function projectSourceTextFormElicitation(
 elicitation:unknown,context:{hostId:string;conversationId:string;requestId:string},
):SourceTextFormRequest|null{
 const e=object(elicitation);
 if(e?.kind!=="formElicitation"||
   !id(context.hostId)||!id(context.conversationId)||!id(context.requestId)||
   !string(e.serverName,256)||!e.serverName.trim()||
   !string(e.message,4096)||!e.message.trim()||
   e.confirmation!==undefined||
   !object(e.schema))return null;
 const schema=object(e.schema)!;
 if(schema.type!=="object"||
   Object.keys(schema).some(k=>!ALLOWED_SCHEMA_KEYS.has(k))||
   schema.additionalProperties!==undefined&&schema.additionalProperties!==false||
   schema.title!==undefined&&!string(schema.title,256)||
   schema.description!==undefined&&!string(schema.description,4096))return null;
 const props=object(schema.properties);
 if(!props)return null;
 const entries=Object.entries(props);
 if(entries.length===0||entries.length>12)return null;
 if(schema.required!==undefined&&
   (!Array.isArray(schema.required)||
    schema.required.some(x=>typeof x!=="string")||
    new Set(schema.required).size!==schema.required.length))return null;
 const required=new Set(schema.required as string[]|undefined ?? []);
 if([...required].some(k=>!Object.hasOwn(props,k)))return null;
 const fields:SourceTextFormField[]=[];
 for(const [name,value] of entries){
   if(!id(name))return null;
   const field=object(value);
   if(!field||field.type!=="string"||
     Object.keys(field).some(k=>!ALLOWED_FIELD_KEYS.has(k))||
     field.title!==undefined&&!string(field.title,256)||
     field.description!==undefined&&!string(field.description,4096)||
     !lengthBound(field.minLength)||!lengthBound(field.maxLength))return null;
   const min=field.minLength as number|undefined;
   const max=field.maxLength as number|undefined;
   if(min!==undefined&&max!==undefined&&min>max)return null;
   fields.push({name,title:typeof field.title==="string"&&field.title.trim()
      ?field.title:name,
      description:typeof field.description==="string"?field.description:"",
      required:required.has(name),
      ...(min===undefined?{}:{minLength:min}),
      ...(max===undefined?{}:{maxLength:max})});
 }
 return {...context,kind:"formElicitation",serverName:e.serverName,
   message:e.message,fields};
}
export function sourceTextFormKey(
 key:Pick<SourceTextFormRequest,"hostId"|"conversationId"|"requestId">,
):string{
 return JSON.stringify([key.hostId,key.conversationId,key.requestId]);
}
export function sourceTextFormValidate(
 request:SourceTextFormRequest,values:Readonly<Record<string,string>>,
):{content:Record<string,string>|null;invalidFieldNames:string[]}{
 const content:Record<string,string>=Object.create(null);
 const invalidFieldNames:string[]=[];
 for(const field of request.fields){
   const v=values[field.name];
   // Omitted optional answers are excluded from the source accept content.
   if(v===undefined||v===""){
     if(field.required||field.minLength!==undefined&&field.minLength>0&&
       v!==undefined&&v!=="")invalidFieldNames.push(field.name);
     continue;
   }
   if(!string(v,16384)||
     field.minLength!==undefined&&v.length<field.minLength||
     field.maxLength!==undefined&&v.length>field.maxLength){
       invalidFieldNames.push(field.name);continue;
   }
   Object.defineProperty(content,field.name,{
     value:v,enumerable:true,writable:true,configurable:true,
   });
 }
 return {content:invalidFieldNames.length===0?content:null,invalidFieldNames};
}
export function sourceTextFormReply(
 request:Pick<SourceTextFormRequest,"hostId"|"conversationId"|"requestId">,
 action:"accept"|"decline"|"cancel",
 content:Record<string,string>|null=null,
):SourceTextFormReply{
 return {hostId:request.hostId,conversationId:request.conversationId,
   requestId:request.requestId,action,content:action==="accept"?content:null};
}
export function sourceTextFormWireResponse(
 reply:SourceTextFormReply,
):{action:"accept"|"decline"|"cancel";content:Record<string,string>|null;_meta:null}{
 return {action:reply.action,content:reply.action==="accept"?reply.content:null,
   _meta:null};
}

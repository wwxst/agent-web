/**
 * Recovered from original Windows request-panel-26c348285c1a.js:
 * ei -> Wr -> ur: native scalar, oneOf radio and array multi-choice Hn.
 *
 * The original boolean is a checkbox (l === true, onChange to !current).
 * integer/number use a native number input, step 1/any, and integer minimum
 * is rounded upward. Submitted values must be JSON booleans/numbers, never
 * the textual raw state from the native input.
 *
 * OneOf choices project only strict source const/title/description options.
 * Only x-openai-suggestions permits a free-text Something else choice.
 * Files, custom OpenAI inputs and unsupported formats stay excluded.
 */
export type SourceFormScalarType="string"|"boolean"|"integer"|"number"|"array";
export type SourceFormDraftValue=string|boolean|string[];
export type SourceFormAnswerValue=string|boolean|number|string[];
export interface SourceFormOption{
 value:string;title:string;description:string;
}
export type SourceFormDraftValues=Readonly<Record<string,SourceFormDraftValue>>;
export type SourceFormAnswerContent=Record<string,SourceFormAnswerValue>;

export interface SourceTextFormField {
 name:string;title:string;description:string;required:boolean;
 type:SourceFormScalarType;
 minLength?:number;maxLength?:number;
 minimum?:number;maximum?:number;
 choices?:readonly SourceFormOption[];
 allowCustomChoice?:boolean;
 minItems?:number;maxItems?:number;
}
export interface SourceTextFormRequest {
 hostId:string;conversationId:string;requestId:string;
 kind:"formElicitation";serverName:string;message:string;
 fields:readonly SourceTextFormField[];
}
export interface SourceTextFormReply {
 hostId:string;conversationId:string;requestId:string;
 action:"accept"|"decline"|"cancel";
 content:SourceFormAnswerContent|null;
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
const lengthBound=(v:unknown)=>v===undefined||
 typeof v==="number"&&Number.isInteger(v)&&v>=0&&v<=16384;
const numericBound=(v:unknown)=>v===undefined||
 typeof v==="number"&&Number.isFinite(v)&&Math.abs(v)<=1e12;
const ALLOWED_TEXT=new Set(["type","title","description","minLength","maxLength","x-openai-suggestions"]);
const ALLOWED_SINGLE_CHOICE=new Set(["type","title","description","oneOf"]);
const ALLOWED_MULTI_CHOICE=new Set([
 "type","title","description","items","minItems","maxItems","uniqueItems",
]);
const ALLOWED_OPTION=new Set(["const","title","description"]);
const ALLOWED_CHOICE_ITEMS=new Set(["type","oneOf"]);
function projectChoices(value:unknown,minimum=2):SourceFormOption[]|null{
 if(!Array.isArray(value)||value.length<minimum||value.length>12)return null;
 const used=new Set<string>(),result:SourceFormOption[]=[];
 for(const raw of value){
   const opt=object(raw);
   if(!opt||Object.keys(opt).some(k=>!ALLOWED_OPTION.has(k))||
      !string(opt.const,256)||!opt.const.trim()||
      !string(opt.title,256)||!opt.title.trim()||
      opt.description!==undefined&&!string(opt.description,4096)||
      used.has(opt.const))return null;
   used.add(opt.const);
   result.push({value:opt.const,title:opt.title,
     description:typeof opt.description==="string"?opt.description:""});
 }
 return result;
}
const ALLOWED_BOOLEAN=new Set(["type","title","description"]);
const ALLOWED_NUMBER=new Set(["type","title","description","minimum","maximum"]);
const ALLOWED_SCHEMA_KEYS=new Set([
 "type","properties","required","additionalProperties","title","description",
]);
/**
 * Reject an entire form when even one field has an unsupported schema.
 * A partial form must never be submitted while silently omitting unknown
 * required or optional fields.
 */
export function projectSourceTextFormElicitation(
 elicitation:unknown,context:{hostId:string;conversationId:string;requestId:string},
):SourceTextFormRequest|null{
 const e=object(elicitation);
 if(e?.kind!=="formElicitation"||
   !id(context.hostId)||!id(context.conversationId)||!id(context.requestId)||
   !string(e.serverName,256)||!e.serverName.trim()||
   !string(e.message,4096)||!e.message.trim()||
   e.confirmation!==undefined||!object(e.schema))return null;
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
   if(!id(name)||["__proto__","constructor","prototype"].includes(name))return null;
   const f=object(value);
   const type=f?.type;
   if(f==null||!["string","boolean","integer","number","array"].includes(String(type))||
     f.title!==undefined&&!string(f.title,256)||
     f.description!==undefined&&!string(f.description,4096))return null;
   const allowed=type==="string"
     ?Object.hasOwn(f,"oneOf")?ALLOWED_SINGLE_CHOICE:ALLOWED_TEXT
     :type==="array"?ALLOWED_MULTI_CHOICE
     :type==="boolean"?ALLOWED_BOOLEAN:ALLOWED_NUMBER;
   if(Object.keys(f).some(k=>!allowed.has(k)))return null;
   const field:SourceTextFormField={
     name,type:type as SourceFormScalarType,
     title:typeof f.title==="string"&&f.title.trim()?f.title:name,
     description:typeof f.description==="string"?f.description:"",
     required:required.has(name),
   };
   if(type==="string"&&Object.hasOwn(f,"oneOf")){
     const choices=projectChoices(f.oneOf);
     if(choices==null)return null;
     field.choices=choices;
   }
   if(type==="array"){
     const items=object(f.items);
     if(!items||items.type!=="string"||
       Object.keys(items).some(k=>!ALLOWED_CHOICE_ITEMS.has(k))||
       f.uniqueItems!==undefined&&f.uniqueItems!==true||
       !lengthBound(f.minItems)||!lengthBound(f.maxItems))return null;
     const choices=projectChoices(items.oneOf);
     if(choices==null)return null;
     const min=f.minItems as number|undefined,max=f.maxItems as number|undefined;
     if(min!==undefined&&min>choices.length||
       max!==undefined&&(max<1||max>choices.length)||
       min!==undefined&&max!==undefined&&min>max)return null;
     field.choices=choices;
     if(min!==undefined)field.minItems=min;
     if(max!==undefined)field.maxItems=max;
   }
   if(type==="string"&&!Object.hasOwn(f,"oneOf")){
     if(Object.hasOwn(f,"x-openai-suggestions")){
       const suggestions=projectChoices(f["x-openai-suggestions"],0);
       if(suggestions==null)return null;
       field.choices=suggestions;
       field.allowCustomChoice=true;
     }
     if(!lengthBound(f.minLength)||!lengthBound(f.maxLength)||
       f.minLength!==undefined&&f.maxLength!==undefined&&
       (f.minLength as number)>(f.maxLength as number))return null;
     if(f.minLength!==undefined)field.minLength=f.minLength as number;
     if(f.maxLength!==undefined)field.maxLength=f.maxLength as number;
   }
   if(type==="number"||type==="integer"){
     if(!numericBound(f.minimum)||!numericBound(f.maximum))return null;
     // Original ur rounds a displayed integer minimum upward; a maximum
     // must be rounded down for validation, not optimistically accepted.
     const min=f.minimum===undefined?undefined:
       type==="integer"?Math.ceil(f.minimum as number):f.minimum as number;
     const max=f.maximum===undefined?undefined:
       type==="integer"?Math.floor(f.maximum as number):f.maximum as number;
     if(min!==undefined&&max!==undefined&&min>max)return null;
     if(min!==undefined)field.minimum=min;
     if(max!==undefined)field.maximum=max;
   }
   fields.push(field);
 }
 return {...context,kind:"formElicitation",serverName:e.serverName,
   message:e.message,fields};
}
export function sourceTextFormKey(
 key:Pick<SourceTextFormRequest,"hostId"|"conversationId"|"requestId">,
):string{
 return JSON.stringify([key.hostId,key.conversationId,key.requestId]);
}
/** Native number inputs emit strings. Only canonical finite values are
 * converted, rejecting empty input, NaN, infinities and non-integral ints. */
export function sourceFormNumber(raw:string):number|null{
 if(raw.length>128||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/u.test(raw))
   return null;
 const n=Number(raw);
 return Number.isFinite(n)&&Math.abs(n)<=1e12?n:null;
}
export function sourceFormFieldAnswer(
 field:SourceTextFormField,value:SourceFormDraftValue|undefined,
):{valid:boolean;answered:boolean;value?:SourceFormAnswerValue}{
 if(field.type==="array"){
   if(value===undefined)return {valid:!field.required,answered:false};
   if(!Array.isArray(value))return {valid:false,answered:true};
   const allowed=new Set(field.choices?.map(c=>c.value)??[]);
   if(value.length>12||value.some(item=>typeof item!=="string"||!allowed.has(item))||
      new Set(value).size!==value.length||
      field.minItems!==undefined&&value.length<field.minItems||
      field.maxItems!==undefined&&value.length>field.maxItems||
      field.required&&value.length===0)return {valid:false,answered:true};
   return value.length>0?{valid:true,answered:true,value:[...value]}:
     {valid:true,answered:false};
 }
 if(value===undefined||value===""){
   return {valid:!field.required,answered:false};
 }
 if(field.type==="boolean"){
   return typeof value==="boolean"
     ?{valid:true,answered:true,value}:{valid:false,answered:true};
 }
 if(typeof value!=="string")return {valid:false,answered:true};
 if(field.choices!=null&&!field.allowCustomChoice){
   const option=field.choices.find(o=>o.value===value);
   return option!=null?{valid:true,answered:true,value}:
     {valid:false,answered:true};
 }
 if(field.type==="string"){
   if(!string(value,16384)||
     field.minLength!==undefined&&value.length<field.minLength||
     field.maxLength!==undefined&&value.length>field.maxLength)
     return {valid:false,answered:true};
   return {valid:true,answered:true,value};
 }
 if(!string(value,128))return {valid:false,answered:true};
 const n=sourceFormNumber(value);
 if(n===null||field.type==="integer"&&!Number.isSafeInteger(n)||
   field.minimum!==undefined&&n<field.minimum||
   field.maximum!==undefined&&n>field.maximum)
   return {valid:false,answered:true};
 return {valid:true,answered:true,value:n};
}
export function sourceTextFormValidate(
 request:SourceTextFormRequest,values:SourceFormDraftValues,
):{content:SourceFormAnswerContent|null;invalidFieldNames:string[]}{
 const content:SourceFormAnswerContent=Object.create(null);
 const invalidFieldNames:string[]=[];
 for(const field of request.fields){
   const result=sourceFormFieldAnswer(field,values[field.name]);
   if(!result.valid){invalidFieldNames.push(field.name);continue;}
   if(result.answered){
     Object.defineProperty(content,field.name,{
       value:result.value,enumerable:true,writable:true,configurable:true,
     });
   }
 }
 return {content:invalidFieldNames.length===0?content:null,invalidFieldNames};
}
export function sourceTextFormReply(
 request:Pick<SourceTextFormRequest,"hostId"|"conversationId"|"requestId">,
 action:"accept"|"decline"|"cancel",
 content:SourceFormAnswerContent|null=null,
):SourceTextFormReply{
 return {hostId:request.hostId,conversationId:request.conversationId,
   requestId:request.requestId,action,content:action==="accept"?content:null};
}
export function sourceTextFormWireResponse(
 reply:SourceTextFormReply,
):{action:"accept"|"decline"|"cancel";content:SourceFormAnswerContent|null;_meta:null}{
 return {action:reply.action,content:reply.action==="accept"?reply.content:null,
   _meta:null};
}

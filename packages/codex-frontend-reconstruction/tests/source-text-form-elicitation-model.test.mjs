import test from "node:test";
import assert from "node:assert/strict";
import {
 projectSourceTextFormElicitation,sourceTextFormValidate,
 sourceTextFormReply,sourceTextFormWireResponse,sourceTextFormKey,
} from "../build/SourceTextFormElicitationModel.js";
const ctx={hostId:"host-a",conversationId:"frontend",requestId:"form-a"};
const elicitation={
 kind:"formElicitation",serverName:"Project Files",message:"Share project details",
 schema:{type:"object",properties:{
  title:{type:"string",title:"Project title",description:"Name the project",
    minLength:3,maxLength:24},
  note:{type:"string",title:"Optional note",maxLength:120},
 },required:["title"],additionalProperties:false},
};
const model=()=>projectSourceTextFormElicitation(elicitation,ctx);
test("ei/Yr/Wr/wn string fields derive schema order, required status and metadata",()=>{
 const req=model();assert.ok(req);
 assert.equal(req.message,"Share project details");
 assert.equal(req.serverName,"Project Files");
 assert.deepEqual(req.fields.map(f=>[f.name,f.title,f.description,f.required]),
 [["title","Project title","Name the project",true],
  ["note","Optional note","",false]]);
 assert.equal(req.fields[0].minLength,3);
 assert.equal(req.fields[0].maxLength,24);
 assert.equal(sourceTextFormKey(req),JSON.stringify(["host-a","frontend","form-a"]));
});
test("vn text-only required/min/max checks return invalid field set and canonical source content",()=>{
 const req=model();
 assert.deepEqual(sourceTextFormValidate(req,{}).invalidFieldNames,["title"]);
 assert.deepEqual(sourceTextFormValidate(req,{title:"ab"}).invalidFieldNames,["title"]);
 assert.deepEqual(sourceTextFormValidate(req,{title:"abc",note:"x".repeat(121)}).invalidFieldNames,["note"]);
 const pass=sourceTextFormValidate(req,{title:"Codex",note:"",notAField:"spoofed"});
 assert.deepEqual(pass.invalidFieldNames,[]);
 assert.deepEqual(Object.entries(pass.content),[["title","Codex"]]);
 const accept=sourceTextFormReply(req,"accept",pass.content);
 assert.deepEqual(sourceTextFormWireResponse(accept),{
  action:"accept",content:pass.content,_meta:null,
 });
 assert.deepEqual(sourceTextFormWireResponse(sourceTextFormReply(req,"cancel")),{
  action:"cancel",content:null,_meta:null,
 });
 assert.deepEqual(sourceTextFormWireResponse(sourceTextFormReply(req,"decline")),{
  action:"decline",content:null,_meta:null,
 });
 assert.equal(sourceTextFormReply(req,"decline",{title:"bad"}).content,null);
});
test("source unsupported field type/format/private extension is not silently converted to a text input",()=>{
 const invalid=[
  {kind:"openaiForm",serverName:"files",message:"Questions",schema:elicitation.schema},
  {kind:"legacyOpenAIForm",serverName:"files",message:"Questions",schema:elicitation.schema},
  {...elicitation,confirmation:{field:"consent"}},
  {...elicitation,schema:{...elicitation.schema,required:["absent"]}},
  {...elicitation,schema:{...elicitation.schema,
   properties:{...elicitation.schema.properties,consent:{type:"array",items:{type:"boolean"},title:"Consent"}}}},
  {...elicitation,schema:{...elicitation.schema,
   properties:{title:{type:"string",enum:["yes","no"]}}}},
  {...elicitation,schema:{...elicitation.schema,
   properties:{title:{type:"string",format:"email"}}}},
  {...elicitation,schema:{...elicitation.schema,
   properties:{title:{type:"string","x-openai-input":{userOptions:[]}}}}},
  {...elicitation,schema:{...elicitation.schema,
   properties:{title:{type:"string",minLength:7,maxLength:2}}}},
  {...elicitation,schema:{...elicitation.schema,
   properties:{title:{type:"string",maxLength:null}}}},
  {...elicitation,schema:{...elicitation.schema,additionalProperties:true}},
  {...elicitation,schema:{type:"object",properties:{}}},
  {...elicitation,message:" "},
 ];
 for(const input of invalid)assert.equal(projectSourceTextFormElicitation(input,ctx),null);
});
test("field special keys and host request identity are bounded, preserving readonly fallback",()=>{
 const polluted=JSON.parse('{"type":"object","properties":{"__proto__":{"type":"string"}}}');
 assert.equal(projectSourceTextFormElicitation({
  ...elicitation,schema:polluted,
 },ctx),null);
 assert.equal(projectSourceTextFormElicitation(elicitation,{...ctx,hostId:" bad "}),null);
 assert.equal(projectSourceTextFormElicitation(elicitation,{...ctx,requestId:"a\nb"}),null);
});


test("source ur boolean/integer/number projection preserves native types and numeric bounds",()=>{
 const schema={type:"object",properties:{
  enabled:{type:"boolean",title:"Enable tool"},
  count:{type:"integer",title:"Retry count",minimum:1.3,maximum:5.9},
  ratio:{type:"number",title:"Ratio",minimum:-1.5,maximum:2.25},
  comment:{type:"string",title:"Comment"},
 },required:["enabled","count","ratio"]};
 const form=projectSourceTextFormElicitation({
  kind:"formElicitation",serverName:"MCP",message:"Settings",schema,
 },ctx);
 assert.ok(form);
 assert.deepEqual(form.fields.map(f=>f.type),["boolean","integer","number","string"]);
 assert.equal(form.fields[1].minimum,2);
 assert.equal(form.fields[1].maximum,5);
 assert.equal(form.fields[2].minimum,-1.5);
 assert.equal(form.fields[2].maximum,2.25);
 assert.deepEqual(sourceTextFormValidate(form,{enabled:false,count:"2",ratio:"1.75"})
  .invalidFieldNames,[]);
 const out=sourceTextFormValidate(form,{
   enabled:false,count:"3",ratio:"1.25",comment:"ready",
 });
 assert.deepEqual(Object.entries(out.content),[
  ["enabled",false],["count",3],["ratio",1.25],["comment","ready"],
 ]);
 assert.deepEqual(sourceTextFormWireResponse(sourceTextFormReply(form,"accept",out.content)),
  {action:"accept",content:out.content,_meta:null});
 assert.deepEqual(sourceTextFormValidate(form,{
  enabled:true,count:"2.5",ratio:"1",
 }).invalidFieldNames,["count"]);
 assert.deepEqual(sourceTextFormValidate(form,{
  enabled:true,count:"0",ratio:"-1.501",
 }).invalidFieldNames,["count","ratio"]);
 assert.deepEqual(sourceTextFormValidate(form,{
  enabled:true,count:"4",ratio:"Infinity",
 }).invalidFieldNames,["ratio"]);
 assert.deepEqual(sourceTextFormValidate(form,{
  enabled:true,count:"4",ratio:"1e999",
 }).invalidFieldNames,["ratio"]);
 assert.deepEqual(sourceTextFormValidate(form,{
  enabled:"true",count:"4",ratio:"1",
 }).invalidFieldNames,["enabled"]);
 assert.deepEqual(sourceTextFormValidate(form,{
  enabled:true,count:4,ratio:"1",
 }).invalidFieldNames,["count"]);
});
test("unknown number rules cannot silently lose constraints when rendering fields",()=>{
 const base={kind:"formElicitation",serverName:"MCP",message:"Read",
   schema:{type:"object",properties:{
    count:{type:"integer",minimum:0,maximum:12},
   }}};
 for(const input of [
  {type:"number",multipleOf:5},
  {type:"integer",minimum:null},
  {type:"integer",minimum:14,maximum:3},
  {type:"number",minimum:Infinity},
  {type:"number",maximum:1e20},
  {type:"boolean",enum:[true]},
  {type:"boolean",default:true},
 ]){
   assert.equal(projectSourceTextFormElicitation({
    ...base,schema:{...base.schema,properties:{count:input}},
   },ctx),null);
 }
});

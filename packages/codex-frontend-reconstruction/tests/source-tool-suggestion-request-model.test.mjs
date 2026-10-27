import test from "node:test";
import assert from "node:assert/strict";
import {
 projectSourceToolSuggestion,sourceToolSuggestionPrimaryLabel,
 sourceToolSuggestionTitle,sourceToolSuggestionReady,sourceToolSuggestionKey,
} from "../build/SourceToolSuggestionRequestModel.js";
const context={hostId:"h-a",conversationId:"thread-b",requestId:"req-c"};
const suggestion=(target="connector",action="install")=>({
 kind:"toolSuggestion",suggestion:{
  tool_id:"tools.files",tool_name:"Files",tool_type:target,suggest_type:action,
 },
});
test("original at.toolSuggestion recognizes exactly explicit install/enable plugin and connector",()=>{
 for(const target of ["connector","plugin"]){
  for(const action of ["install","enable"]){
   const item=projectSourceToolSuggestion(suggestion(target,action),context);
   assert.ok(item,target+"/"+action);
   assert.deepEqual([item.targetType,item.suggestionAction,item.toolId,item.toolName],
    [target,action,"tools.files","Files"]);
   assert.equal(item.hostId,"h-a");assert.equal(item.conversationId,"thread-b");
   assert.equal(item.requestId,"req-c");
   assert.equal(item.description,undefined,"source remote description is not in request");
   assert.equal(sourceToolSuggestionPrimaryLabel(item,false),
    action==="install"?"Install":"Enable");
   assert.equal(sourceToolSuggestionPrimaryLabel(item,true),"Continue");
  }
 }
});
test("original J/st installation instruction appears only after host confirms setup started",()=>{
 const connector=projectSourceToolSuggestion(suggestion("connector","install"),context);
 const plugin=projectSourceToolSuggestion(suggestion("plugin","install"),context);
 const enabled=projectSourceToolSuggestion(suggestion("plugin","enable"),context);
 assert.equal(sourceToolSuggestionTitle(connector,false),"Files");
 assert.equal(sourceToolSuggestionTitle(connector,true),
  "Click Continue when you’re done connecting Files");
 assert.equal(sourceToolSuggestionTitle(plugin,true),
  "Click Continue when you’re done installing the Files plugin");
 assert.equal(sourceToolSuggestionTitle(enabled,true),"Files");
});
test("original ct readiness checks are specific to tool type and suggested action",()=>{
 const installConnector={targetType:"connector",suggestionAction:"install"};
 const enableConnector={targetType:"connector",suggestionAction:"enable"};
 const installPlugin={targetType:"plugin",suggestionAction:"install"};
 const enablePlugin={targetType:"plugin",suggestionAction:"enable"};
 const accessible={connector:{isAccessible:true,isEnabled:false}};
 assert.equal(sourceToolSuggestionReady(installConnector,accessible),true);
 assert.equal(sourceToolSuggestionReady(enableConnector,accessible),false);
 assert.equal(sourceToolSuggestionReady(enableConnector,{
  connector:{isAccessible:true,isEnabled:true},
 }),true);
 assert.equal(sourceToolSuggestionReady(installConnector,{
  connector:{isAccessible:false,isEnabled:true},
 }),false);
 assert.equal(sourceToolSuggestionReady(installPlugin,{
  plugin:{installed:true,enabled:false},
 }),true);
 assert.equal(sourceToolSuggestionReady(enablePlugin,{
  plugin:{installed:true,enabled:false},
 }),false);
 assert.equal(sourceToolSuggestionReady(enablePlugin,{
  plugin:{installed:true,enabled:true},
 }),true);
 assert.equal(sourceToolSuggestionReady(installPlugin,{plugin:null}),false);
 assert.equal(sourceToolSuggestionReady(enablePlugin,{}),false);
});
test("invalid and other kinds cannot impersonate a source tool suggestion",()=>{
 for(const value of [
  null,{}, {kind:"generic",suggestion:suggestion().suggestion},
  {kind:"toolSuggestion"},{kind:"toolSuggestion",suggestion:null},
  {kind:"toolSuggestion",suggestion:{...suggestion().suggestion,tool_type:"shell"}},
  {kind:"toolSuggestion",suggestion:{...suggestion().suggestion,suggest_type:"approve"}},
  {kind:"toolSuggestion",suggestion:{...suggestion().suggestion,tool_name:" "}},
  {kind:"toolSuggestion",suggestion:{...suggestion().suggestion,tool_id:""}},
  {kind:"toolSuggestion",suggestion:{...suggestion().suggestion,tool_id:12}},
  {kind:"toolSuggestion",suggestion:{...suggestion().suggestion,tool_name:"X".repeat(257)}},
 ]){
  assert.equal(projectSourceToolSuggestion(value,context),null);
 }
 assert.notEqual(sourceToolSuggestionKey(context),
  sourceToolSuggestionKey({...context,hostId:"h-other"}));
 assert.notEqual(sourceToolSuggestionKey(context),
  sourceToolSuggestionKey({...context,conversationId:"thread-other"}));
 assert.notEqual(sourceToolSuggestionKey(context),
  sourceToolSuggestionKey({...context,requestId:"req-other"}));
});

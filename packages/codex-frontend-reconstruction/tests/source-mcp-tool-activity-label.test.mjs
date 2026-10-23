import test from "node:test";
import assert from "node:assert/strict";
import {resolveSourceMcpToolActivityLabel,sourceJsToolTitle,sourceMcpLabelInputFromActivity} from "../build/SourceMcpToolActivityLabel.js";
const mk=(extra={})=>({completed:true,toolName:"search",toolArguments:{},
  toolResult:{type:"success"},toolDisplay:{invoked:"已搜索",invoking:"正在搜索",title:"搜索文件"},...extra});
const host={isFailedResult:input=>input.toolResult?.type==="error",
 getToolDefinitionTitle:()=> "工具定义标题",getFallbackLabel:()=> "通用工具名"};
const title=(input,h=host)=>resolveSourceMcpToolActivityLabel(input,h);
test("xa priority Pt/Mt before JS title and connector action",()=>{
 const x=mk({toolName:"js",toolArguments:{title:"My task"}});
 assert.deepEqual(title(x,{...host,getSpecializedActionLabel:()=>"专用动作",
  getConnectorActionLabel:()=>"连接器动作"}),{text:"专用动作",source:"specialized"});
 assert.deepEqual(title(x,{...host,getConnectorActionLabel:()=>"连接器动作"}),{text:"My task",source:"js-title"});
 assert.deepEqual(title(mk(),{...host,getConnectorActionLabel:()=>"连接器动作"}),
   {text:"连接器动作",source:"connector-action"});
});
test("wa validates JS title and preserves exact 80 code-unit truncation",()=>{
 assert.equal(sourceJsToolTitle("js",{title:"  foo\n   bar  "}),"foo bar");
 assert.equal(sourceJsToolTitle("JS",{title:"x".repeat(80)}),"x".repeat(80));
 assert.equal(sourceJsToolTitle("js",{title:"x".repeat(81)}),"x".repeat(79)+"…");
 assert.equal(sourceJsToolTitle("other",{title:"valid"}),null);
 assert.equal(sourceJsToolTitle("js",{title:7}),null);
 assert.equal(sourceJsToolTitle("js",{title:"  "}),null);
});
test("xa chooses invoking/invoked via completion state before display title",()=>{
 assert.deepEqual(title(mk()),{text:"已搜索",source:"invocation"});
 assert.deepEqual(title(mk({completed:false,toolResult:null})),{text:"正在搜索",source:"invocation"});
});
test("xa accepts metadata only for matching phase and ignores blank or invalid fields",()=>{
 const meta={_meta:{"openai/toolInvocation/invoking":"准备工具",
  "openai/toolInvocation/invoked":"已调用工具"}};
 assert.deepEqual(title(mk({toolDisplay:null,toolDefinition:meta})),
   {text:"已调用工具",source:"invocation"});
 assert.deepEqual(title(mk({completed:false,toolResult:null,toolDisplay:null,toolDefinition:meta})),
   {text:"准备工具",source:"invocation"});
 assert.deepEqual(title(mk({toolDisplay:null,toolDefinition:{_meta:{"openai/toolInvocation/invoked":"   "}}})),
   {text:"工具定义标题",source:"definition-title"});
});
test("xa guards failed or unconfirmed completed invocation before title fallback",()=>{
 const failed=mk({toolResult:{type:"error"}});
 assert.deepEqual(title(failed),{text:"搜索文件",source:"display-title"});
 const unknown=mk({toolResult:null});
 assert.deepEqual(title(unknown),{text:"搜索文件",source:"display-title"});
 assert.deepEqual(title(mk({toolResult:null,toolDisplay:{invoked:"完毕"}})),
   {text:"工具定义标题",source:"definition-title"});
});
test("xa nullish-first blank status skips later title and reaches final fallback",()=>{
 assert.deepEqual(title(mk({toolDisplay:{invoked:"  ",title:"安全标题"}})),
   {text:"通用工具名",source:"fallback"});
});
test("xa delegates definition title and unresolved final fallback to actual host",()=>{
 const x=mk({toolDisplay:null,toolDefinition:null});
 assert.deepEqual(title(x),{text:"工具定义标题",source:"definition-title"});
 assert.deepEqual(title(x,{isFailedResult:()=>false}),{text:null,source:"unavailable"});
});
\ntest("host raw MCP fields are type-guarded before xa title projection",()=>{
 const safe=sourceMcpLabelInputFromActivity({completed:true,invocation:{server:"files",tool:"search",arguments:{q:"a"}},
  result:{type:"success"},toolDisplay:{invoked:"已搜索"},toolDefinition:{_meta:{}}});
 assert.equal(safe.toolName,"search");
 assert.deepEqual(title(safe),{text:"已搜索",source:"invocation"});
 const malformed=sourceMcpLabelInputFromActivity({completed:"true",invocation:"not-an-object",result:42,
  toolDisplay:{invoked:42,title:{x:1}},toolDefinition:["not-a-definition"]});
 assert.equal(malformed.completed,false);
 assert.equal(malformed.toolName,"");
 assert.equal(malformed.toolResult,null);
 assert.equal(malformed.toolDisplay?.invoked,undefined);
 assert.equal(malformed.toolDefinition,null);
});

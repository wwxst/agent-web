import test from "node:test";
import assert from "node:assert/strict";
import { projectSourceRepeatedHeader } from "../build/SourceRepeatedActivityHeader.js";
const item={id:"a",type:"mcp-tool-call",invocation:{server:"files",tool:"search"}};
const row={kind:"mcp-tool-call",key:"repeated:a",items:[item,{...item,id:"b"}]};
test("XO selects generic KO tool-title branch when _m has no recognized action",()=>{
 const header=projectSourceRepeatedHeader(row,{getRecognizedAction:()=>null});
 assert.deepEqual(header,{variant:"mcp-tool",item,count:2});
});
test("XO selects recognized Codex action message and standalone count",()=>{
 const action={message:{id:"source.mcp.action",defaultMessage:"已搜索文件"},iconKey:"source-icon"};
 const header=projectSourceRepeatedHeader(row,{getRecognizedAction:()=>action});
 assert.deepEqual(header,{variant:"codex-action",item,count:2,action});
});
test("V_ uses external event sourceLabel and count independently",()=>{
 const event={id:"evt",type:"external-event",sourceLabel:"Slack"};
 const result=projectSourceRepeatedHeader({kind:"external-event",key:"event",items:[event,event]});
 assert.deepEqual(result,{variant:"external-event",item:event,count:2,sourceLabel:"Slack"});
});
test("single and missing repeated rows never claim XO/V_ header",()=>{
 assert.equal(projectSourceRepeatedHeader({kind:"single",key:"x",items:[item]}),null);
 assert.equal(projectSourceRepeatedHeader({kind:"mcp-tool-call",key:"x",items:[item]}),null);
 assert.equal(projectSourceRepeatedHeader({kind:"mcp-tool-call",key:"x",items:[]}),null);
});

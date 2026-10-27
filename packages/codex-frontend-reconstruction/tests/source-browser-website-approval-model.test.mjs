import test from "node:test";
import assert from "node:assert/strict";
import {
  projectSourceBrowserWebsiteApproval,sourceBrowserWebsiteReply,
  sourceBrowserWebsiteRequestKey,sourceBrowserIdentifier,
  sourceBrowserWebsiteSafeHref,
} from "../build/SourceBrowserWebsiteApprovalModel.js";

const context={hostId:"host-a",conversationId:"conversation-a",requestId:"request-a",allowAllSites:true};
const raw={kind:"mcpToolCall",approval:{
  tool_name:"access_browser_origin",connector_id:"connector-browser_use",
  connector_name:"Browser",persist:["always"],
  tool_params:{origin:"https://example.org",reason:"Reason from the tool"},
}};

test("source ft only promotes recognized Browser origin approvals with always scope",()=>{
 const value=projectSourceBrowserWebsiteApproval(raw,context);
 assert.deepEqual(value,{...context,origin:"https://example.org",
  reason:"Reason from the tool",source:{kind:"browser",name:"Browser"}});
 assert.equal(projectSourceBrowserWebsiteApproval({...raw,approval:{...raw.approval,tool_name:"read_page"}},context),null);
 assert.equal(projectSourceBrowserWebsiteApproval({...raw,approval:{...raw.approval,persist:["session"]}},context),null);
 assert.equal(projectSourceBrowserWebsiteApproval({...raw,approval:{...raw.approval,connector_id:"files",connector_name:"Files"}},context),null);
 assert.equal(projectSourceBrowserWebsiteApproval({...raw,approval:{...raw.approval,tool_params:{origin:""}}},context),null);
 assert.equal(projectSourceBrowserWebsiteApproval({kind:"formElicitation",approval:raw.approval},context),null);
});
test("source mt reads validated generic origin and host-source identity, not arbitrary content",()=>{
 const projected=projectSourceBrowserWebsiteApproval({
   kind:"generic",serverName:"Chrome connector",persist:["always"],
   metadata:{origin:"https://example.com",reason:"Host explanation"},
   toolParams:{origin:"https://docs.example.org",reason:"Tool explanation"},
 },{...context,allowAllSites:false});
 assert.equal(projected?.origin,"https://docs.example.org");
 assert.equal(projected?.reason,"Host explanation");
 assert.deepEqual(projected?.source,{kind:"connection",name:"Chrome"});
 assert.equal(projected?.allowAllSites,false);
 assert.equal(projectSourceBrowserWebsiteApproval({kind:"generic",serverName:"Calendar",
   persist:["always"],metadata:{origin:"https://example.com"}},context),null);
 assert.equal(sourceBrowserIdentifier("connector-browser_use"),true);
 assert.equal(sourceBrowserIdentifier("not_browser"),false);
});
test("source Ge sends unscoped once, always per-site and special all-sites scope ONLY after host policy",()=>{
 const request={allowAllSites:true,disabled:false};
 assert.deepEqual(sourceBrowserWebsiteReply(request,"once"),{decision:"accept"});
 assert.deepEqual(sourceBrowserWebsiteReply(request,"site"),{decision:"accept",persist:"always"});
 assert.deepEqual(sourceBrowserWebsiteReply(request,"deny"),{decision:"decline"});
 assert.deepEqual(sourceBrowserWebsiteReply(request,"all-sites"),{
   decision:"accept",persist:"always",browser_use_persistent_approval_scope:"all-sites",
 });
 assert.equal(sourceBrowserWebsiteReply({...request,allowAllSites:false},"all-sites"),null);
 assert.deepEqual(sourceBrowserWebsiteReply({...request,allowAllSites:false},"site"),{decision:"accept",persist:"always"});
 assert.equal(sourceBrowserWebsiteReply({...request,disabled:true},"deny"),null);
});
test("per-request identity is host+conversation+request and origin links reject unsafe protocols",()=>{
 const key=sourceBrowserWebsiteRequestKey(context);
 assert.deepEqual(JSON.parse(key),["host-a","conversation-a","request-a"]);
 assert.notEqual(key,sourceBrowserWebsiteRequestKey({...context,hostId:"different"}));
 assert.notEqual(key,sourceBrowserWebsiteRequestKey({...context,conversationId:"different"}));
 assert.notEqual(key,sourceBrowserWebsiteRequestKey({...context,requestId:"different"}));
 assert.equal(sourceBrowserWebsiteSafeHref("javascript:alert(1)"),null);
 assert.equal(sourceBrowserWebsiteSafeHref("not-a-url"),null);
 assert.equal(sourceBrowserWebsiteSafeHref("https://example.org"),"https://example.org/");
});

import test from "node:test";
import assert from "node:assert/strict";
import {resolve,join} from "node:path";
import {mkdir,mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {_electron as electron} from "playwright";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const executablePath=resolve(root,"node_modules","electron","dist",
 process.platform==="win32"?"electron.exe":
 process.platform==="darwin"?"Electron.app/Contents/MacOS/Electron":"electron");
const scope={hostId:"demo-host",threadId:"frontend"};
const generic={
 ...scope,requestId:"host-mcp-generic-1",
 elicitation:{kind:"generic",serverName:"workspace-files",
  message:"Tool call needs your approval. Reason: List workspace files",
  metadata:{reason:"List workspace files"},persist:["session","always"],
  toolParams:{path:"/work/agent-web",recursive:true,limit:30},riskLevel:"high"},
};
const tool={
 ...scope,requestId:"host-mcp-tool-2",
 elicitation:{kind:"mcpToolCall",
  message:'Allow Project Files to run tool "files.search"?',
  approval:{connector_id:"files",connector_name:"Project Files",
   tool_name:"files.search",tool_params:{query:"codex",count:20},
   persist:["session"]}},
};

test("native host pending generic and MCP tool requests use existing source card and fail-closed reply IPC",{
 timeout:110000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-host-mcp-"));
 const app=await electron.launch({
  executablePath,
  args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",
   AGENT_WEB_USER_DATA_DIR:profile,ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
  timeout:40000,
 });
 const send=event=>app.evaluate(({BrowserWindow},data)=>{
  const win=BrowserWindow.getAllWindows()[0];
  if(win==null)throw Error("no primary native window");
  win.webContents.send("agent-web:host-event",data);
 },event);
 const settle=async value=>send({type:"elicitation-settled",query:{
  hostId:value.hostId,threadId:value.threadId,requestId:value.requestId,
 }});
 const requestCard=id=>page.locator('[data-source-mcp-request-id="'+id+'"]');
 let page;
 try{
  page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});

  await send({type:"pending-elicitation",request:generic});
  const first=requestCard(generic.requestId);
  await first.waitFor({timeout:14000});
  assert.equal(await first.getByText("List workspace files").count(),1);
  assert.equal(await first.locator('[data-source-mcp-param="path"]').count(),1);
  assert.equal(await first.locator('[data-source-mcp-param="recursive"]').count(),1);
  assert.equal(await first.getByText("Elevated Risk").count(),1);
  assert.equal(await first.getByRole("button",{name:"Always allow"}).isEnabled(),true);
  assert.equal(await first.getByRole("button",{name:"Deny"}).isEnabled(),true);
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await first.scrollIntoViewIfNeeded();
  await page.screenshot({path:resolve(root,"desktop/test-results/host-generic-mcp-approval.png"),
   fullPage:false});

  // Authentic Electron IPC reaches main, which has NO authenticated Agent
  // backend; the request remains pending even after a local Deny attempt.
  await first.getByRole("button",{name:"Deny"}).click();
  await first.getByRole("alert").filter({hasText:"backend unavailable"}).waitFor({
   timeout:12000});
  assert.equal(await first.count(),1);
  assert.equal(await first.getAttribute("data-source-mcp-reply-phase"),"error");
  await first.getByRole("button",{name:"Deny"}).waitFor({state:"visible"});
  assert.equal(await first.getByRole("button",{name:"Deny"}).isEnabled(),true);
  await settle(generic);
  await first.waitFor({state:"detached",timeout:10000});

  await send({type:"pending-elicitation",request:tool});
  const second=requestCard(tool.requestId);
  await second.waitFor({timeout:12000});
  assert.equal(await second.locator(".codex-source-mcp-approval__connector").innerText(),"Project Files");
  assert.equal(await second.locator('[data-source-mcp-param="query"]').count(),1);
  assert.equal(await second.getByRole("button",{name:"Always allow"}).count(),0);
  assert.equal(await second.getByRole("button",{name:"Approval options"}).count(),1);
  assert.equal(await second.getByRole("button",{name:"Allow once"}).isEnabled(),true);
  assert.equal(await second.getByText("files.search").count(),1);

  // An out-of-scope settlement must not remove a request with the same ID.
  await send({type:"elicitation-settled",query:{
   hostId:"other-host",threadId:"frontend",requestId:tool.requestId,
  }});
  assert.equal(await second.count(),1);
  // Source be special browserEmailOtp is not this generic approval card;
  // we retain an honest pending placeholder rather than fabricating UI.
  await send({type:"pending-elicitation",request:{
   ...tool,elicitation:{kind:"generic",serverName:"verification",
    message:"Code approval?",browserEmailOtp:{origin:"https://example.org"}},
  }});
  await second.waitFor({state:"detached",timeout:10000});
  const readonlyRow=page.locator('[data-demo-turn-id^="host-elicitation:"]')
   .filter({hasText:"宿主待处理请求"});
  assert.equal(await readonlyRow.count(),1);
  await settle(tool);
  await readonlyRow.waitFor({state:"detached",timeout:10000});
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});

import test from "node:test";
import assert from "node:assert/strict";
import {resolve,join} from "node:path";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {_electron as electron} from "playwright";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const executablePath=resolve(root,"node_modules","electron","dist",
 process.platform==="win32"?"electron.exe":
 process.platform==="darwin"?"Electron.app/Contents/MacOS/Electron":"electron");
const channel="agent-web:host-event";
const request={hostId:"demo-host",threadId:"frontend",requestId:"native-request-1",
 elicitation:{kind:"urlAction",url:"https://example.org/verify",
  message:"Host event: complete device verification"}};
test("native Electron host-event request appears and settles in the SAME virtualized conversation",{
 timeout:90000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-host-elicitation-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",
    AGENT_WEB_USER_DATA_DIR:profile,ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
  timeout:40000,
 });
 const send=event=>app.evaluate(({BrowserWindow},data)=>{
  const win=BrowserWindow.getAllWindows()[0];
  if(!win)throw Error("missing primary window");
  win.webContents.send("agent-web:host-event",data);
 },event);
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  await send({type:"pending-elicitation",request:{
    ...request,threadId:"review",requestId:"wrong-thread",
  }});
  await page.waitForTimeout(100);
  assert.equal(await page.locator('[data-demo-turn-id*="wrong-thread"]').count(),0);
  await send({type:"pending-elicitation",request});
  const row=page.locator('[data-demo-turn-id^="host-elicitation:"]');
  const card=row.locator("[data-source-url-action-request-id]");
  await card.waitFor({timeout:14000});
  assert.equal(await card.getByText("Action required").count(),1);
  assert.equal(await card.getByText(request.elicitation.message).count(),1);
  assert.equal(await card.getByRole("button",{name:"Open link"}).isEnabled(),true);
  assert.equal(await card.getByRole("button",{name:"Continue"}).count(),0);
  assert.equal(await row.count(),1);
  await send({type:"pending-elicitation",request:{
    ...request,elicitation:{...request.elicitation,
      message:"Host event: verification data updated"},
  }});
  await page.getByText("Host event: verification data updated").waitFor({timeout:10000});
  assert.equal(await row.count(),1,"an update is the same canonical turn");
  // Never open the real OS browser or pretend an Agent permission was accepted.
  await send({type:"elicitation-settled",query:{
    ...request,requestId:"unrelated",
  }});
  assert.equal(await row.count(),1);
  await send({type:"elicitation-settled",query:{
    hostId:request.hostId,threadId:request.threadId,requestId:request.requestId,
  }});
  await row.waitFor({state:"detached",timeout:10000});
  assert.equal(await row.count(),0);
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});

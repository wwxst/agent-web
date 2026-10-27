import test from "node:test";
import assert from "node:assert/strict";
import {resolve,join} from "node:path";
import {mkdtemp,rm,mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {_electron as electron} from "playwright";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const executablePath=resolve(root,"node_modules","electron","dist",
 process.platform==="win32"?"electron.exe":
 process.platform==="darwin"?"Electron.app/Contents/MacOS/Electron":"electron");
test("Electron host unsupported form uses real typed Skip/Dismiss IPC with no backend grant",{
 timeout:110000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-unsupported-form-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",
   AGENT_WEB_USER_DATA_DIR:profile,ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
  timeout:40000,
 });
 const send=event=>app.evaluate(({BrowserWindow},data)=>{
  const win=BrowserWindow.getAllWindows()[0];
  if(!win)throw Error("no Electron main window");
  win.webContents.send("agent-web:host-event",data);
 },event);
 const scope={hostId:"demo-host",threadId:"frontend",requestId:"form-unsupported-native"};
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  const invalid=await page.evaluate(async()=>{
    const host=window.agentWebDesktopHost;
    const base={hostId:"demo-host",conversationId:"frontend",requestId:"form-unsupported-native"};
    return {
      method:typeof host.replyToUnsupportedForm,
      node:typeof window.require,
      accepts:await host.replyToUnsupportedForm({...base,action:"accept"})
        .then(()=>true,e=>String(e)),
      extras:await host.replyToUnsupportedForm({...base,action:"decline",arbitrary:"yes"})
        .then(()=>true,e=>String(e)),
    };
  });
  assert.equal(invalid.method,"function");
  assert.equal(invalid.node,"undefined");
  assert.match(invalid.accepts,/UNSUPPORTED_FORM_INVALID_REPLY/);
  assert.match(invalid.extras,/UNSUPPORTED_FORM_INVALID_REPLY/);
  await send({type:"pending-elicitation",request:{...scope,threadId:"review",
   elicitation:{kind:"unsupportedOpenAIForm",serverName:"Other thread"}}});
  assert.equal(await page.locator("[data-source-unsupported-form-request-id]").count(),0);
  await send({type:"pending-elicitation",request:{...scope,
   elicitation:{kind:"unsupportedOpenAIForm",serverName:"Project Forms"}}});
  const card=page.locator("[data-source-unsupported-form-request-id]");
  await card.waitFor({timeout:14000});
  assert.match(await card.textContent(),/Project Forms requested this form/);
  assert.equal(await card.getByRole("button",{name:"Skip"}).isEnabled(),true);
  assert.equal(await card.getByRole("button",{name:"Dismiss"}).isEnabled(),true);
  assert.equal(await card.locator("input,select,textarea").count(),0);
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({path:resolve(root,"desktop/test-results/host-unsupported-form.png"),
   fullPage:false});
  await card.getByRole("button",{name:"Skip"}).click();
  await card.getByRole("alert").filter({hasText:"backend unavailable"})
   .waitFor({timeout:12000});
  assert.equal(await card.count(),1,"failed decline cannot settle the form");
  assert.equal(await card.getAttribute("data-source-unsupported-form-phase"),"error");
  await card.getByRole("button",{name:"Dismiss"}).click();
  await card.getByRole("alert").filter({hasText:"backend unavailable"})
   .waitFor({timeout:12000});
  assert.equal(await card.count(),1);
  await send({type:"pending-elicitation",request:{...scope,
   elicitation:{kind:"unsupportedOpenAIForm",serverName:"Updated server"}}});
  await card.getByText("Updated server requested this form",{exact:false})
   .waitFor({timeout:10000});
  assert.equal(await card.getAttribute("data-source-unsupported-form-phase"),"idle");
  await send({type:"elicitation-settled",query:{...scope,requestId:"other-request"}});
  assert.equal(await card.count(),1);
  await send({type:"elicitation-settled",query:scope});
  await card.waitFor({state:"detached",timeout:10000});
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});

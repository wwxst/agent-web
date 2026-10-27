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

test("original userVerification host card uses isolated native Cancel and cannot fake biometric approval",{
 timeout:110000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-verification-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",
    AGENT_WEB_USER_DATA_DIR:profile,ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
  timeout:40000,
 });
 const send=event=>app.evaluate(({BrowserWindow},data)=>{
  const win=BrowserWindow.getAllWindows()[0];
  if(!win)throw Error("missing primary Electron window");
  win.webContents.send("agent-web:host-event",data);
 },event);
 const key={hostId:"demo-host",threadId:"frontend",requestId:"native-verification-1"};
 const record={...key,elicitation:{kind:"userVerification",title:"Verify file access",
  description:"MCP server wants local identity confirmation",serverName:"Project Files"}};
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  const invalid=await page.evaluate(async()=>{
   const host=window.agentWebDesktopHost;
   return {
    available:typeof host.cancelUserVerification,
    node:typeof window.require,
    malformed:await host.cancelUserVerification({
      hostId:"demo-host",conversationId:"frontend",
      requestId:"native-verification-1",reason:"decline",
    }).then(()=>false,e=>String(e)),
    foreign:await host.cancelUserVerification({
      hostId:"demo-host",conversationId:"frontend",
      requestId:"native-verification-1",reason:"userCancelled",extra:"no",
    }).then(()=>false,e=>String(e)),
   };
  });
  assert.equal(invalid.available,"function");
  assert.equal(invalid.node,"undefined");
  assert.match(invalid.malformed,/USER_VERIFICATION_INVALID_CANCEL/);
  assert.match(invalid.foreign,/USER_VERIFICATION_INVALID_CANCEL/);
  await send({type:"pending-elicitation",request:{...record,threadId:"review"}});
  assert.equal(await page.locator("[data-source-user-verification-request-id]").count(),0);
  await send({type:"pending-elicitation",request:record});
  const card=page.locator("[data-source-user-verification-request-id]");
  await card.waitFor({timeout:14000});
  assert.equal(await card.getByRole("button",{name:"Approve with Touch ID"}).isEnabled(),false);
  assert.equal(await card.getByRole("button",{name:"Cancel"}).isEnabled(),true);
  assert.match(await card.textContent(),/Identity verification requested by Project Files/);
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({path:resolve(root,"desktop/test-results/host-user-verification.png"),
    fullPage:false});
  await card.getByRole("button",{name:"Cancel"}).click();
  await card.getByRole("alert").filter({hasText:"backend unavailable"})
    .waitFor({timeout:11000});
  assert.equal(await card.getAttribute("data-source-user-verification-phase"),"error");
  assert.equal(await card.count(),1,"cancel reply rejection cannot settle host request");
  assert.equal(await card.getByRole("button",{name:"Cancel"}).isEnabled(),true);
  assert.equal(await card.getByRole("button",{name:"Approve with Touch ID"}).isEnabled(),false);
  await send({type:"pending-elicitation",request:{...record,elicitation:{
    ...record.elicitation,title:"Verify new request title",
  }}});
  await card.getByText("Verify new request title").waitFor({timeout:10000});
  assert.equal(await card.getAttribute("data-source-user-verification-phase"),"idle");
  await send({type:"elicitation-settled",query:{...key,requestId:"other"}});
  assert.equal(await card.count(),1);
  await send({type:"elicitation-settled",query:key});
  await card.waitFor({state:"detached",timeout:10000});
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});

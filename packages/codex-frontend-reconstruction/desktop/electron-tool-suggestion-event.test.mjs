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

test("source at.toolSuggestion enters existing Electron transcript but cannot install without trusted host",{
 timeout:105000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-tool-suggestion-"));
 const app=await electron.launch({
  executablePath,
  args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",
   AGENT_WEB_USER_DATA_DIR:profile,ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
  timeout:40000,
 });
 const send=event=>app.evaluate(({BrowserWindow},data)=>{
  const win=BrowserWindow.getAllWindows()[0];
  if(win==null)throw Error("missing Electron primary window");
  win.webContents.send("agent-web:host-event",data);
 },event);
 const key={hostId:"demo-host",threadId:"frontend",requestId:"native-tool-suggest-1"};
 const suggestion={
  kind:"toolSuggestion",suggestion:{
    tool_type:"connector",suggest_type:"install",
    tool_id:"connector-files",tool_name:"Project Files",
  },
 };
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  await send({type:"pending-elicitation",request:{...key,elicitation:suggestion}});
  const card=page.locator('[data-source-tool-suggestion-request-id]');
  await card.waitFor({timeout:14000});
  assert.equal(await card.count(),1);
  assert.equal(await card.getByText("Project Files").count(),1);
  assert.equal(await card.getByRole("button",{name:"Install"}).isEnabled(),false);
  assert.equal(await card.getByRole("button",{name:"Continue"}).count(),0);
  assert.equal(await card.getByRole("button",{name:"Not now"}).isEnabled(),true);
  assert.match(await card.textContent(),/installation and activation are unavailable/);
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({path:resolve(root,"desktop/test-results/host-tool-suggestion-compact.png"),
   fullPage:false});

  await card.getByRole("button",{name:"Not now"}).click();
  await card.getByRole("alert").filter({hasText:"backend unavailable"}).waitFor({timeout:11000});
  assert.equal(await card.count(),1,"backend rejection never settles request");
  assert.equal(await card.getAttribute("data-source-tool-suggestion-phase"),"error");
  await send({type:"pending-elicitation",request:{
    ...key,elicitation:{kind:"toolSuggestion",suggestion:{
      tool_type:"plugin",suggest_type:"enable",
      tool_id:"plugin-new",tool_name:"New Plugin",
    }},
  }});
  await card.getByText("New Plugin").waitFor({timeout:10000});
  assert.equal(await card.count(),1);
  assert.equal(await card.getByRole("button",{name:"Enable"}).isEnabled(),false);
  assert.equal(await card.getByRole("button",{name:"Install"}).count(),0);
  assert.equal(await card.getAttribute("data-source-tool-suggestion-phase"),"idle",
   "updated host request resets local state by request target identity");
  await send({type:"elicitation-settled",query:{...key,requestId:"unrelated"}});
  assert.equal(await card.count(),1);
  await send({type:"elicitation-settled",query:key});
  await card.waitFor({state:"detached",timeout:10000});
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});

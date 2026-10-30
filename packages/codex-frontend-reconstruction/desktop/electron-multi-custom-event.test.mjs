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
test("native host multi-suggestion Enter, pending extra answer and fail-closed q2t reply",{
 timeout:110000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-multi-custom-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",
   AGENT_WEB_USER_DATA_DIR:profile,ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
  timeout:40000,
 });
 const send=event=>app.evaluate(({BrowserWindow},data)=>{
  const win=BrowserWindow.getAllWindows()[0];
  if(!win)throw Error("missing Electron window");
  win.webContents.send("agent-web:host-event",data);
 },event);
 const key={hostId:"demo-host",threadId:"frontend",requestId:"native-multi-custom-1"};
 const field={type:"array",title:"Tasks",items:{type:"string",minLength:3,maxLength:48,
  "x-openai-suggestions":[
   {const:"build",title:"Build"},{const:"test",title:"Test"},
  ]},minItems:1,maxItems:3,uniqueItems:true};
 const elicitation={kind:"formElicitation",serverName:"Task MCP",message:"Choose tasks",
  schema:{type:"object",properties:{tasks:field,note:{type:"string",title:"Notes"}},
   required:["tasks"]}};
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  await send({type:"pending-elicitation",request:{...key,elicitation}});
  const card=page.locator("[data-source-text-form-request-id]");
  await card.waitFor({timeout:14000});
  await card.getByRole("checkbox",{name:"Build"}).check();
  const editor=card.getByRole("textbox",{name:"Something else text"});
  await editor.fill("Security review");
  await editor.press("Enter");
  await card.getByRole("checkbox",{name:"Remove custom option Security review"})
   .waitFor({timeout:12000});
  assert.equal(await editor.inputValue(),"");
  await editor.fill("Write summary");
  await card.getByRole("button",{name:"Next",exact:true}).last().click();
  await card.getByRole("button",{name:"Continue"}).click();
  await card.getByRole("alert").filter({hasText:"backend unavailable"})
   .waitFor({timeout:12000});
  assert.equal(await card.count(),1,"no Agent backend can settle the request");
  await card.getByRole("button",{name:"Previous question"}).click();
  assert.equal(await editor.inputValue(),"Write summary");
  assert.equal(await card.getByRole("checkbox",{name:"Remove custom option Security review"}).isChecked(),true);
  await send({type:"elicitation-settled",query:{...key,requestId:"unrelated"}});
  assert.equal(await card.count(),1);
  await send({type:"elicitation-settled",query:key});
  await card.waitFor({state:"detached",timeout:10000});
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});

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

test("native source suggestion request mounts custom editor, validates, fails closed and settles on host event",{
 timeout:110000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-custom-choice-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",
   AGENT_WEB_USER_DATA_DIR:profile,ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
  timeout:40000,
 });
 const send=event=>app.evaluate(({BrowserWindow},data)=>{
  const win=BrowserWindow.getAllWindows()[0];
  if(!win)throw Error("no primary window");
  win.webContents.send("agent-web:host-event",data);
 },event);
 const scope={hostId:"demo-host",threadId:"frontend",requestId:"native-suggestion-1"};
 const field={type:"string",title:"Task choice",minLength:3,maxLength:80,
  "x-openai-suggestions":[{const:"build",title:"Build"},{const:"review",title:"Review"}]};
 const elicitation={kind:"formElicitation",serverName:"MCP",message:"Choose task",
  schema:{type:"object",properties:{
   task:field,note:{type:"string",title:"Notes"},
  },required:["task"]}};
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  await send({type:"pending-elicitation",request:{...scope,elicitation}});
  const card=page.locator("[data-source-text-form-request-id]");
  await card.waitFor({timeout:14000});
  const editor=card.getByRole("textbox",{name:"Something else text"});
  await editor.fill("ab");
  await card.getByRole("button",{name:"Next",exact:true}).last().click();
  await card.getByRole("alert").filter({hasText:"at least 3 characters"})
   .waitFor({timeout:10000});
  await editor.fill("A custom task");
  await card.getByRole("button",{name:"Next",exact:true}).last().click();
  await card.getByRole("button",{name:"Continue"}).click();
  await card.getByRole("alert").filter({hasText:"backend unavailable"})
   .waitFor({timeout:12000});
  assert.equal(await card.count(),1);
  await card.getByRole("button",{name:"Previous question"}).click();
  assert.equal(await editor.inputValue(),"A custom task");
  assert.equal(await card.getByRole("radio",{name:"Something else"}).isChecked(),true);
  await send({type:"elicitation-settled",query:{...scope,requestId:"other"}});
  assert.equal(await card.count(),1);
  await send({type:"elicitation-settled",query:scope});
  await card.waitFor({state:"detached",timeout:10000});
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});

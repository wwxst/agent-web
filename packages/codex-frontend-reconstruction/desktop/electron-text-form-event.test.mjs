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
const scope={hostId:"demo-host",threadId:"frontend",requestId:"host-form-text-1"};
const schema={type:"object",properties:{
 name:{type:"string",title:"Project name",minLength:3,maxLength:80},
 summary:{type:"string",title:"Summary",description:"Describe the purpose",minLength:5},
},required:["name","summary"],additionalProperties:false};
const value={kind:"formElicitation",serverName:"Project Files",
 message:"Share project details",schema};
test("native source formElicitation fields, q2t reject, host update and real settlement",{
 timeout:110000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-text-form-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",
   AGENT_WEB_USER_DATA_DIR:profile,ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
  timeout:40000,
 });
 const send=event=>app.evaluate(({BrowserWindow},data)=>{
  const win=BrowserWindow.getAllWindows()[0];
  if(!win)throw Error("missing primary native window");
  win.webContents.send("agent-web:host-event",data);
 },event);
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  const policy=await page.evaluate(async()=>{
   const host=window.agentWebDesktopHost;
   const ids={hostId:"demo-host",conversationId:"frontend",requestId:"host-form-text-1"};
   return {
    exposed:typeof host.replyToTextForm,
    node:typeof window.require,
    badAction:await host.replyToTextForm({...ids,action:"grant",content:{}}).then(()=>false,e=>String(e)),
    badContent:await host.replyToTextForm({...ids,action:"accept",content:{name:8}}).then(()=>false,e=>String(e)),
    extra:await host.replyToTextForm({...ids,action:"accept",content:{},extra:1}).then(()=>false,e=>String(e)),
   };
  });
  assert.equal(policy.exposed,"function");assert.equal(policy.node,"undefined");
  for(const prop of ["badAction","badContent","extra"])
   assert.match(policy[prop],/TEXT_FORM_INVALID_REPLY/);
  await send({type:"pending-elicitation",request:{...scope,threadId:"review",elicitation:value}});
  assert.equal(await page.locator("[data-source-text-form-request-id]").count(),0);
  await send({type:"pending-elicitation",request:{...scope,elicitation:value}});
  const card=page.locator("[data-source-text-form-request-id]");
  await card.waitFor({timeout:14000});
  assert.equal(await card.count(),1);
  assert.equal(await card.getByRole("button",{name:"Continue"}).count(),0);
  const name=card.getByRole("textbox",{name:"Project name"});
  await name.fill("abc");
  await card.getByRole("button",{name:"Next",exact:true}).last().click();
  const sum=card.getByRole("textbox",{name:"Summary"});
  await sum.fill("MCP fields are real");
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({path:resolve(root,"desktop/test-results/host-text-form-request.png"),
   fullPage:false});
  await card.getByRole("button",{name:"Continue"}).click();
  await card.getByRole("alert").filter({hasText:"backend unavailable"}).waitFor({timeout:12000});
  assert.equal(await card.count(),1,"local accept cannot settle request");
  assert.equal(await card.getAttribute("data-source-text-form-phase"),"error");
  assert.equal(await card.getByRole("textbox",{name:"Summary"}).inputValue(),"MCP fields are real");
  await card.getByRole("button",{name:"Cancel"}).click();
  await card.getByRole("alert").filter({hasText:"backend unavailable"}).waitFor({timeout:12000});
  assert.equal(await card.count(),1);
  await send({type:"pending-elicitation",request:{...scope,elicitation:{
   ...value,schema:{type:"object",properties:{
    changed:{type:"string",title:"Updated question"},
   },required:["changed"]},
  }}});
  await card.getByRole("textbox",{name:"Updated question"}).waitFor({timeout:10000});
  assert.equal(await card.count(),1);
  assert.equal(await card.getAttribute("data-source-text-form-phase"),"idle");
  await send({type:"elicitation-settled",query:{...scope,requestId:"other"}});
  assert.equal(await card.count(),1);
  await send({type:"elicitation-settled",query:scope});
  await card.waitFor({state:"detached",timeout:10000});
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});

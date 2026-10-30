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
    badContent:await host.replyToTextForm({...ids,action:"accept",content:{name:Infinity}}).then(()=>false,e=>String(e)),
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

  // The SAME native bridge now accepts all three ur primitive source types.
  const mixedScope={...scope,requestId:"host-mixed-form-1"};
  await send({type:"pending-elicitation",request:{...mixedScope,
   elicitation:{kind:"formElicitation",serverName:"Project Settings",
    message:"Configure primitive settings",
    schema:{type:"object",properties:{
     consent:{type:"boolean",title:"Allow processing"},
     attempts:{type:"integer",title:"Retry count",minimum:1,maximum:5},
     scale:{type:"number",title:"Scale ratio",minimum:0.5,maximum:3.5},
    },required:["consent","attempts","scale"]},
   },
  }});
  const mixed=page.locator("[data-source-text-form-request-id]");
  await mixed.waitFor({timeout:10000});
  assert.equal(await mixed.count(),1);
  const check=mixed.getByRole("checkbox",{name:"Allow processing"});
  assert.equal(await check.isChecked(),false);
  await check.check();await check.uncheck();
  await mixed.getByRole("button",{name:"Next",exact:true}).last().click();
  const integer=mixed.getByRole("spinbutton",{name:"Retry count"});
  await integer.fill("2.5");
  await mixed.getByRole("button",{name:"Next",exact:true}).last().click();
  await mixed.getByRole("alert").filter({hasText:"whole number"}).waitFor({timeout:10000});
  await integer.fill("3");
  await mixed.getByRole("button",{name:"Next",exact:true}).last().click();
  const ratio=mixed.getByRole("spinbutton",{name:"Scale ratio"});
  await ratio.fill("1.75");
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({
   path:resolve(root,"desktop/test-results/host-mixed-form.png"),fullPage:false,
  });
  await mixed.getByRole("button",{name:"Continue"}).click();
  await mixed.getByRole("alert").filter({hasText:"backend unavailable"})
   .waitFor({timeout:12000});
  assert.equal(await mixed.count(),1);
  assert.equal(await ratio.inputValue(),"1.75");
  await mixed.getByRole("button",{name:"Previous question"}).click();
  assert.equal(await mixed.getByRole("spinbutton",{name:"Retry count"}).inputValue(),"3");
  await mixed.getByRole("button",{name:"Previous question"}).click();
  assert.equal(await mixed.getByRole("checkbox",{name:"Allow processing"}).isChecked(),false);
  await send({type:"elicitation-settled",query:mixedScope});
  await mixed.waitFor({state:"detached",timeout:10000});

  const choiceScope={...scope,requestId:"host-choice-form-1"};
  const options=[
   {const:"plan",title:"Planning",description:"Outline the steps"},
   {const:"code",title:"Coding",description:"Implement components"},
   {const:"review",title:"Review",description:"Inspect results"},
  ];
  await send({type:"pending-elicitation",request:{...choiceScope,
   elicitation:{kind:"formElicitation",serverName:"Project Choices",
    message:"Select required options",schema:{type:"object",properties:{
     mode:{type:"string",title:"Primary mode",oneOf:options},
     tasks:{type:"array",title:"Selected tasks",
      items:{type:"string",oneOf:options},minItems:1,maxItems:2,
      uniqueItems:true},
    },required:["mode","tasks"]}},
  }});
  const choices=page.locator("[data-source-text-form-request-id]");
  await choices.waitFor({timeout:14000});
  const mode=choices.getByRole("radio",{name:"Coding"});
  await mode.check();
  await choices.getByRole("button",{name:"Next",exact:true}).last().click();
  await choices.getByRole("checkbox",{name:"Planning"}).check();
  await choices.getByRole("checkbox",{name:"Review"}).check();
  assert.equal(await choices.getByRole("checkbox",{name:"Coding"}).isEnabled(),false);
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({path:resolve(root,"desktop/test-results/host-choice-form.png"),
   fullPage:false});
  await choices.getByRole("button",{name:"Continue"}).click();
  await choices.getByRole("alert").filter({hasText:"backend unavailable"})
   .waitFor({timeout:12000});
  assert.equal(await choices.count(),1,"no Agent means no fake submit/settlement");
  const validations=await page.evaluate(async()=>{
   const host=window.agentWebDesktopHost;
   const ids={hostId:"demo-host",conversationId:"frontend",requestId:"host-choice-form-1"};
   return {
    invalid:await host.replyToTextForm({...ids,action:"accept",
      content:{tasks:["plan","plan"]}}).then(()=>false,e=>String(e)),
    valid:await host.replyToTextForm({...ids,action:"accept",
      content:{mode:"code",tasks:["plan","review"]}}).then(()=>false,e=>String(e)),
   };
  });
  assert.match(validations.invalid,/TEXT_FORM_INVALID_REPLY/);
  assert.match(validations.valid,/TEXT_FORM_BACKEND_UNAVAILABLE/);
  await send({type:"elicitation-settled",query:{...choiceScope,requestId:"unrelated"}});
  assert.equal(await choices.count(),1);
  await send({type:"elicitation-settled",query:choiceScope});
  await choices.waitFor({state:"detached",timeout:10000});
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});

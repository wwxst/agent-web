import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {_electron as electron} from "playwright";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const executablePath=resolve(root,"node_modules","electron","dist",
  process.platform==="win32"?"electron.exe":process.platform==="darwin"?"Electron.app/Contents/MacOS/Electron":"electron");
function start(profile){
 return electron.launch({
  executablePath,
  args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,
  env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_USER_DATA_DIR:profile,
   ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
  timeout:40000,
 });
}
async function ready(app){
 const page=await app.firstWindow();
 await page.getByRole("textbox",{name:"演示消息输入"}).waitFor({timeout:20000});
 return page;
}
async function stored(page,field,value){
 // Poll from the *Node test process*, not an async predicate in Chromium's
 // rAF loop. A debounced renderer update is not yet a durable disk write.
 const deadline=Date.now()+15000;
 while(Date.now()<deadline){
  const actual=await page.evaluate(async key=>
   (await window.agentWebDesktopHost?.getComposerDrafts())?.[key],field);
  if(actual===value)return;
  await new Promise(resolve=>setTimeout(resolve,80));
 }
 const latest=await page.evaluate(async key=>
  (await window.agentWebDesktopHost?.getComposerDrafts())?.[key],field);
 assert.equal(latest,value,"Electron failed to persist Composer draft for "+field);
}

test("real Electron process restart hydrates each original mounted ProseMirror draft and reset clears it",{
 timeout:120000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-electron-profile-"));
 let app;
 try{
  app=await start(profile);
  let page=await ready(app);
  const editor=page.getByRole("textbox",{name:"演示消息输入"});
  await editor.fill("原始前端线程：重启恢复草稿");
  await stored(page,"frontend","原始前端线程：重启恢复草稿");
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  await page.waitForFunction(()=>document.querySelector(".demo-header-location strong")
    ?.textContent?.includes("工具调用与审批交互")===true);
  await editor.fill("审阅线程：保持独立草稿");
  await stored(page,"review","审阅线程：保持独立草稿");
  const beforeClose=await page.evaluate(()=>window.agentWebDesktopHost.getComposerDrafts());
  assert.deepEqual(beforeClose,{
    frontend:"原始前端线程：重启恢复草稿",
    review:"审阅线程：保持独立草稿",
  });
  // Only two known demo thread IDs can be written, even by compromised UI.
  assert.equal(await page.evaluate(()=>window.agentWebDesktopHost?.setComposerDraft("../test","no")),false);
  assert.equal(await page.evaluate(()=>window.agentWebDesktopHost?.setComposerDraft("frontend","x".repeat(65537))),false);
  assert.equal(await page.evaluate(()=>typeof window.require),"undefined");
  await app.close();app=undefined;

  app=await start(profile);
  page=await ready(app);
  const mounted=page.getByRole("textbox",{name:"演示消息输入"});
  const afterRestart=await page.evaluate(()=>window.agentWebDesktopHost.getComposerDrafts());
  assert.deepEqual(afterRestart,{
    frontend:"原始前端线程：重启恢复草稿",
    review:"审阅线程：保持独立草稿",
  });
  await page.waitForFunction(()=>document.querySelector('[aria-label="演示消息输入"]')
    ?.textContent?.includes("原始前端线程：重启恢复草稿")===true);
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="演示消息输入"]')
    ?.textContent?.includes("审阅线程：保持独立草稿")===true);
  // Explicit reset deletes only this thread's saved draft.
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByRole("button",{name:"重置"}).click();
  await page.waitForFunction(async()=>!(await window.agentWebDesktopHost?.getComposerDrafts())?.review);
  assert.equal((await page.evaluate(()=>window.agentWebDesktopHost.getComposerDrafts())).frontend,
    "原始前端线程：重启恢复草稿");
  await page.getByRole("button",{name:/恢复 Codex 会话界面/}).click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="演示消息输入"]')
    ?.textContent?.includes("原始前端线程：重启恢复草稿")===true);
  assert.equal(await mounted.getAttribute("contenteditable"),"true");
 }finally{
  if(app!=null)await app.close();
  await rm(profile,{recursive:true,force:true});
 }
});

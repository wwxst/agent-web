import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,mkdir,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {_electron as electron} from "playwright";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const executablePath=resolve(root,"node_modules","electron","dist",
 process.platform==="win32"?"electron.exe":process.platform==="darwin"?"Electron.app/Contents/MacOS/Electron":"electron");

/** Source-backed fixture inside the *mounted* frontend. No alternate
 * screenshot-only renderer or detached React/HTML reconstruction. */
test("real Electron Codex conversation screenshot shows source code panel and actual clipboard action",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-visual-"));
 const app=await electron.launch({
  executablePath,
  args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,
  env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_USER_DATA_DIR:profile,
    ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
  timeout:40000,
 });
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  const viewport=page.getByTestId("transcript-scroll");
  const codeBlock=page.locator('[data-conversation-code-surface="true"]');
  // Source virtualizer: locate the real fixture row by scrolling the actual
  // transcript, not by manufacturing or force-mounting a separate component.
  let mounted=false;
  for(let index=0;index<=16;index++){
   await viewport.evaluate((el,position)=>{
    const max=Math.max(0,el.scrollHeight-el.clientHeight);
    el.scrollTop=Math.round(max*position/16);
    el.dispatchEvent(new Event("scroll",{bubbles:true}));
   },index);
   await page.waitForTimeout(90);
   if(await codeBlock.count()){mounted=true;break;}
  }
  assert.equal(mounted,true,"original fenced assistant code sample must mount in live timeline");
  await codeBlock.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const source=codeBlock.first().locator('[data-code-block-source="true"]');
  const language=codeBlock.first().locator(".demo-markdown-code-language");
  assert.equal(await language.textContent(),"tsx");
  const copiedText=(await source.locator("pre code").innerText()).replace(/\n$/,"");
  assert.match(copiedText,/ConnectedLiveConversationTranscript/);
  const layout=await codeBlock.first().evaluate(el=>{
   const root=el.closest(".demo-markdown");
   const pre=el.querySelector("pre");
   const scroll=el.querySelector(".chatgpt-code-scrollport");
   const action=el.querySelector("[data-code-block-action-bar]");
   return {
    role:root?.classList.contains("demo-markdown--assistant")?"assistant":"other",
    hasPre:pre!=null,hasScrollableSource:scroll!=null,
    hasToolbar:action!=null,
    preBackground:pre==null?null:getComputedStyle(pre).backgroundColor,
    codeFontSize:pre==null?null:getComputedStyle(pre).fontSize,
    viewport:{width:innerWidth,height:innerHeight},
   };
  });
  assert.equal(layout.role,"assistant");
  assert.equal(layout.hasScrollableSource,true);
  assert.equal(layout.hasToolbar,true);
  assert.equal(layout.hasPre,true);
  assert.equal(layout.preBackground,"rgba(0, 0, 0, 0)");
  assert.deepEqual(layout.viewport,{width:1352,height:760});
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({path:resolve(root,"desktop/test-results/conversation-code-surface.png"),
    fullPage:false});
  await codeBlock.first().getByRole("button",{name:"复制代码"}).click();
  await page.getByRole("button",{name:"已复制代码"}).waitFor({timeout:10000});
  const clipboardValue=await app.evaluate(({clipboard})=>clipboard.readText());
  // Windows DOM innerText normalizes to CRLF, while the actual source code
  // and clipboard use LF. Compare the preserved code bytes after newline
  // canonicalization, not OS-specific presentation line separators.
  const normalized=(value)=>value.replace(/\r\n?/g,"\n");
  assert.equal(normalized(clipboardValue),normalized(copiedText));
  await page.screenshot({path:resolve(root,"desktop/test-results/conversation-code-copied.png"),
    fullPage:false});
 }finally{
  await app.close();
  await rm(profile,{recursive:true,force:true});
 }
});


test("real Electron review timeline renders last meaningful PowerShell action and preserves expandable output",{
 timeout:90000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-command-visual-"));
 const app=await electron.launch({
  executablePath,
  args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,
  env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_USER_DATA_DIR:profile,
   ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
  timeout:40000,
 });
 try{
  const page=await app.firstWindow();
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  await page.waitForFunction(()=>document.querySelector(".demo-header-location strong")
    ?.textContent?.includes("工具调用与审批交互")===true);
  const activity=page.locator('[data-demo-turn-id="review-exec"]');
  await activity.waitFor({timeout:12000});
  await activity.locator("[data-recovered-agent-activity] button").first().click();
  const command=activity.locator('[data-codex-source-leaf="exec-command"]');
  await command.waitFor({timeout:12000});
  assert.equal(await command.getAttribute("data-source-execution-action-selected"),"command");
  const toggle=command.locator("[data-codex-source-command-toggle]");
  assert.match(await toggle.innerText(),/Get-ChildItem src -File/);
  assert.doesNotMatch(await toggle.innerText(),/powershell\.exe|pwsh\.exe|cmd\.exe/i);
  await toggle.click();
  await page.locator('[data-codex-source-command-body]').first().waitFor({timeout:10000});
  const body=command.locator("[data-codex-source-command-body]");
  assert.match(await body.locator("pre").first().innerText(),/Get-ChildItem src -File/);
  assert.doesNotMatch(await body.locator("pre").first().innerText(),/powershell\.exe|cmd\.exe/i);
  // Use the EXISTING first review command, not a screenshot-only row.
  const viewport=page.getByTestId("transcript-scroll");
  await viewport.evaluate(element=>{
    element.scrollTop=0;
    element.dispatchEvent(new Event("scroll",{bubbles:true}));
  });
  await page.waitForTimeout(350);
  const visible=await body.evaluate(element=>{
    const viewport=element.closest('[data-thread-scroll-viewport]');
    if(viewport==null)return false;
    const box=element.getBoundingClientRect();
    const bounds=viewport.getBoundingClientRect();
    return box.top>=bounds.top-4&&box.bottom<=bounds.bottom+4;
  });
  if(!visible){
    const layout=await body.evaluate(element=>{
      const viewport=element.closest('[data-thread-scroll-viewport]');
      const r=element.getBoundingClientRect(),v=viewport?.getBoundingClientRect();
      return {body:{top:r.top,bottom:r.bottom,height:r.height},
        viewport:v&&{top:v.top,bottom:v.bottom,height:v.height},
        scrollTop:viewport?.scrollTop,scrollHeight:viewport?.scrollHeight,
        clientHeight:viewport?.clientHeight};
    });
    console.log("COMMAND_VIEWPORT_FAILURE",layout);
  }
  assert.equal(visible,true,"actual expanded command must be in visible conversation");
  // Rendered position must remain stable for a full animation frame; a DOM
  // node from a stale virtual row does not qualify as a screenshot oracle.
  await page.waitForTimeout(180);
  const visibleAgain=await body.evaluate(element=>{
    const viewport=element.closest('[data-thread-scroll-viewport]');
    if(viewport==null)return false;
    const box=element.getBoundingClientRect(),vr=viewport.getBoundingClientRect();
    return box.top>=vr.top-4&&box.bottom<=vr.bottom+4;
  });
  assert.equal(visibleAgain,true);
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({path:resolve(root,"desktop/test-results/conversation-windows-command-action.png"),
   fullPage:false,animations:"disabled"});
  await body.screenshot({path:resolve(root,"desktop/test-results/conversation-command-action-detail.png"),
   animations:"disabled"});
  await toggle.click();
  assert.equal(await body.count(),0);
 }finally{
  await app.close();
  await rm(profile,{recursive:true,force:true});
 }
});

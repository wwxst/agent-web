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

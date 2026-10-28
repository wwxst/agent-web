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
  // Initial thread-scoped viewport restoration must settle before our
  // intentional user scroll; otherwise the source controller legitimately
  // follows its pending bottom hold and the screenshot captures another row.
  await page.waitForTimeout(950);
  const viewport=page.getByTestId("transcript-scroll");
  // The review fixture now contains a source-backed long user message.
  // Start at the real first turn rather than assuming the virtualizer mounts
  // a top-of-history command while the route is holding the last viewport.
  await viewport.evaluate(element=>{
    element.scrollTop=0;
    element.dispatchEvent(new Event("scroll",{bubbles:true}));
  });
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


test("real Electron mounts source Worked for status in its tool disclosure, never under conversation title",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-work-status-"));
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
  assert.equal(await page.locator(".demo-worked-label").count(),0,
   "a fabricated global Worked for subtitle must not be mounted");
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  const viewport=page.getByTestId("transcript-scroll");
  const statusTurn=page.locator('[data-demo-turn-id="review-work-status"]');
  let mounted=false;
  for(let index=16;index>=0;index--){
   await viewport.evaluate((el,position)=>{
    const max=Math.max(0,el.scrollHeight-el.clientHeight);
    el.scrollTop=Math.round(max*position/16);
    el.dispatchEvent(new Event("scroll",{bubbles:true}));
   },index);
   await page.waitForTimeout(100);
   if(await statusTurn.count()){mounted=true;break;}
  }
  assert.equal(mounted,true,"status must be part of the real virtualized transcript");
  const activity=statusTurn.locator('[data-recovered-agent-activity]');
  const toggle=activity.locator(".codex-agent-activity__toggle");
  await toggle.waitFor({timeout:12000});
  assert.equal(await toggle.getAttribute("aria-expanded"),"false");
  assert.match(await toggle.innerText(),/Worked for 2m 11s/);
  assert.equal(await activity.locator('[data-source-work-status-divider]').count(),0);
  await toggle.click();
  const divider=activity.locator('[data-source-work-status-divider="true"]');
  await divider.waitFor({timeout:12000});
  assert.equal(await divider.locator('[data-source-work-status="worked"]').count(),1);
  assert.match(await divider.innerText(),/Worked for 2m 11s/);
  await divider.scrollIntoViewIfNeeded();
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({
   path:resolve(root,"desktop/test-results/conversation-work-status-expanded.png"),
   fullPage:false,animations:"disabled",
  });
  await toggle.click();
  assert.equal(await divider.count(),0,
   "expanded status is not duplicated into the collapsed activity details");
  assert.match(await toggle.innerText(),/Worked for 2m 11s/);
  await page.screenshot({
   path:resolve(root,"desktop/test-results/conversation-work-status-collapsed.png"),
   fullPage:false,animations:"disabled",
  });
 }finally{
  await app.close();
  await rm(profile,{recursive:true,force:true});
 }
});


test("real Electron folds long user Markdown and restores clipped links, print, and expansion",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-user-fold-"));
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
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  // Exercise the actual ProseMirror composer submit path, not a separately
  // inserted fixture that would shift unrelated virtualized review rows.
  const message=[
   "核对长用户消息在会话时间线中的收起与展开行为（模拟）。",
   ...Array.from({length:34},(_,index)=>
     `第 ${index+1} 段：请保持原版 Codex 的消息间距、Markdown 布局与键盘交互。`),
   "最后附上 [Codex 原版交互参考链接](https://example.com/codex-reference) 用于测试折叠内容的焦点安全性。",
  ].join("\n\n");
  const composer=page.getByTestId("composer");
  await composer.waitFor({timeout:12000});
  await composer.fill(message);
  const send=page.getByTestId("send-button");
  await send.waitFor({timeout:12000});
  assert.equal(await send.getAttribute("data-composer-action"),"send");
  await send.click();
  const row=page.locator('[data-demo-turn-id^="user-"]').last();
  await row.waitFor({timeout:12000});
  const content=row.locator('[data-source-user-message-collapsible="true"]');
  await content.waitFor({timeout:12000});
  const clipped=content.locator('[data-source-user-message-viewport]');
  const toggle=content.getByRole("button",{name:"Show more"});
  await toggle.waitFor({timeout:12000});
  assert.equal(await toggle.getAttribute("aria-expanded"),"false");
  const heightCollapsed=await clipped.evaluate(el=>el.getBoundingClientRect().height);
  const lineHeight=await clipped.evaluate(el=>parseFloat(getComputedStyle(el).lineHeight));
  assert.ok(heightCollapsed<=lineHeight*20+3,
   "source user message must clip to at most the default 20 line heights");
  const link=content.locator('a[href*="codex-reference"]');
  await link.waitFor({timeout:12000});
  assert.equal(await link.getAttribute("aria-hidden"),"true");
  assert.equal(await link.evaluate(el=>el.inert),true);
  await row.scrollIntoViewIfNeeded();
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({path:resolve(root,
    "desktop/test-results/conversation-long-user-collapsed.png"),
    fullPage:false,animations:"disabled"});

  await toggle.click();
  const less=content.getByRole("button",{name:"Show less"});
  await less.waitFor({timeout:12000});
  assert.equal(await less.getAttribute("aria-expanded"),"true");
  const heightExpanded=await clipped.evaluate(el=>el.getBoundingClientRect().height);
  assert.ok(heightExpanded>heightCollapsed+50);
  assert.equal(await link.getAttribute("aria-hidden"),null);
  assert.equal(await link.evaluate(el=>el.inert),false);
  await page.screenshot({path:resolve(root,
    "desktop/test-results/conversation-long-user-expanded.png"),
    fullPage:false,animations:"disabled"});

  await page.evaluate(()=>window.dispatchEvent(new Event("beforeprint")));
  assert.equal(await content.locator('.codex-source-user-message-content__toggle').count(),0);
  assert.equal(await clipped.evaluate(el=>el.style.maxHeight),"");
  await page.evaluate(()=>window.dispatchEvent(new Event("afterprint")));
  await less.waitFor({timeout:12000});
  await less.click();
  await toggle.waitFor({timeout:12000});
  assert.equal(await link.getAttribute("aria-hidden"),"true");
 }finally{
  await app.close();
  await rm(profile,{recursive:true,force:true});
 }
});


test("native Find in Thread reveals the exact hidden long-user match in mounted Electron timeline",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-user-find-reveal-"));
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
  const needle="SOURCE_FOLDED_MATCH_8BF26";
  const longText=[
    "真实 Composer 发送的长消息：检测 _u 折叠搜索展开路径（模拟发送）。",
    ...Array.from({length:38},(_,index)=>
      `第 ${String(index+1).padStart(2,"0")} 段：保留 Codex 原版消息与滚动历史语义；这是长用户消息的真实前端交互验证。`),
    `最后一段：${needle} — 此词必须在折叠线数之外才能被搜索到。`,
  ].join("\n\n");
  const editor=page.getByTestId("composer");
  await editor.waitFor({timeout:12000});
  await editor.fill(longText);
  await page.getByTestId("send-button").click();
  const row=page.locator('[data-demo-turn-id^="user-"]').last();
  await row.waitFor({timeout:12000});
  const folded=row.locator('[data-source-user-message-collapsible="true"]');
  await folded.waitFor({timeout:12000});
  // The source user message exposes the same stable unit identity used by
  // the canonical turn search index, not an anonymous joined Markdown row.
  const sourceUnit=row.locator(
    '[data-conversation-message="user"][data-content-search-unit-key]',
  );
  const unitKey=await sourceUnit.getAttribute("data-content-search-unit-key");
  assert.ok(unitKey?.startsWith("user-"));
  assert.equal(unitKey,await row.getAttribute("data-demo-turn-id"));
  assert.equal(await folded.getAttribute("data-source-user-message-expanded"),"false");
  // The unique source match is present in indexed host text but hidden in
  // rendered DOM. The original _u callback must reveal it before CSS marks.
  // The text can exist in DOM yet be geometrically outside a CSS-clipped
  // message. Do not confuse DOM absence with rendered visibility.
  const outsideFold=await folded.locator('[data-source-user-message-viewport]')
    .evaluate((viewport,value)=>{
      const walker=document.createTreeWalker(viewport,NodeFilter.SHOW_TEXT);
      for(let node=walker.nextNode();node;node=walker.nextNode()){
        if(!(node instanceof Text))continue;
        const index=node.data.indexOf(value);
        if(index<0)continue;
        const range=document.createRange();
        range.setStart(node,index);
        range.setEnd(node,index+value.length);
        return range.getBoundingClientRect().top>=
          viewport.getBoundingClientRect().bottom;
      }
      return true; // >512*20 prefix: absent from the collapsed DOM
    },needle);
  assert.equal(outsideFold,true,"source match must be below the 20-line fold");
  await app.evaluate(({Menu})=>
    Menu.getApplicationMenu().getMenuItemById("findInThread").click());
  const input=page.getByRole("searchbox",{name:"Find in chat"});
  await input.waitFor({timeout:10000});
  await input.fill(needle);
  await page.waitForFunction(()=>
    document.querySelector(".demo-find-results")?.textContent==="1 / 1 results");
  await page.waitForFunction(()=>
    Array.from(document.querySelectorAll('[data-demo-turn-id^="user-"]'))
      .some(row=>row.querySelector('[data-source-user-message-expanded="true"]')
        ?.textContent?.includes("SOURCE_FOLDED_MATCH_8BF26")),{timeout:12000});
  await page.waitForFunction((value)=>
    Array.from(CSS.highlights?.get("demo-thread-find-active")??[])
      .some(range=>range.toString()===value &&
        range.startContainer.parentElement?.closest('[data-content-search-unit-key]')
          ?.getAttribute("data-content-search-unit-key")===document.querySelector(
            '[data-demo-turn-id^="user-"] [data-conversation-message="user"]',
          )?.getAttribute("data-content-search-unit-key")),
    needle,{timeout:12000});
  assert.equal(await folded.getAttribute("data-source-user-message-expanded"),"true");
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({
    path:resolve(root,"desktop/test-results/conversation-find-revealed-long-user-message.png"),
    animations:"disabled",fullPage:false,
  });
  // Source _u reveal changes the disclosure itself; closing the search
  // should clear only highlighting and not re-collapse the user message.
  await input.press("Escape");
  await input.waitFor({state:"detached",timeout:10000});
  assert.equal(await folded.getAttribute("data-source-user-message-expanded"),"true");
  await folded.getByRole("button",{name:"Show less"}).click();
  await folded.getByRole("button",{name:"Show more"}).waitFor();
  assert.equal(await folded.getAttribute("data-source-user-message-expanded"),"false");
 }finally{
  await app.close();
  await rm(profile,{recursive:true,force:true});
 }
});


test("native Find maps Markdown link labels but never highlights the hidden identical URL hit",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-markdown-link-find-"));
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
  const token="SOURCE_LINK_7C91E";
  // The first 220 chars exclude the token from the fixture assistant's
  // mock reply. All four hits must remain in one real submitted user unit.
  const message="Source link regression: "+"x".repeat(220)+"\n\n"+
   `${token} [${token}](https://docs.example.org/${token}) ${token}`;
  const composer=page.getByTestId("composer");
  await composer.waitFor({timeout:12000});
  await composer.fill(message);
  await page.getByTestId("send-button").click();
  const row=page.locator('[data-demo-turn-id^="user-"]').last();
  await row.waitFor({timeout:12000});
  const unit=row.locator('[data-conversation-message="user"][data-content-search-unit-key]');
  await unit.waitFor({timeout:12000});
  const visibleLink=unit.locator('a[href*="docs.example.org"]');
  await visibleLink.waitFor({timeout:12000});
  assert.equal(await visibleLink.textContent(),token);
  await app.evaluate(({Menu})=>
    Menu.getApplicationMenu().getMenuItemById("findInThread").click());
  const input=page.getByRole("searchbox",{name:"Find in chat"});
  await input.waitFor({timeout:10000});
  await input.fill(token);
  const currentHighlight=()=>page.evaluate(()=>{
    const ranges=Array.from(CSS.highlights?.get("demo-thread-find-active")??[]);
    return ranges.map(range=>({
      text:range.toString(),
      inLink:range.startContainer.parentElement?.closest("a")!=null,
      unitKey:range.startContainer.parentElement?.closest("[data-content-search-unit-key]")
        ?.getAttribute("data-content-search-unit-key"),
    }));
  });
  const findStatus=page.locator(".demo-find-results");
  await page.waitForFunction(()=>
    document.querySelector(".demo-find-results")?.textContent==="1 / 4 results");
  const unitKey=await unit.getAttribute("data-content-search-unit-key");
  await page.waitForFunction((needle)=>
    Array.from(CSS.highlights?.get("demo-thread-find-active")??[])
      .some(range=>range.toString()===needle),token);
  assert.deepEqual(await currentHighlight(),[{text:token,inLink:false,unitKey}]);

  await page.getByRole("button",{name:"Next result"}).click();
  await page.waitForFunction(()=>
    document.querySelector(".demo-find-results")?.textContent==="2 / 4 results");
  await page.waitForFunction((needle)=>
    Array.from(CSS.highlights?.get("demo-thread-find-active")??[])
      .some(range=>range.toString()===needle&&
        range.startContainer.parentElement?.closest("a")!=null),token);
  assert.deepEqual(await currentHighlight(),[{text:token,inLink:true,unitKey}]);
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({path:resolve(root,
    "desktop/test-results/conversation-find-visible-markdown-link.png"),
    animations:"disabled",fullPage:false});

  // The third source hit belongs to the raw Markdown link destination.
  // Search still reports its raw source ordinal, but it is not falsely
  // highlighted as a second occurrence of the visible link label.
  await page.getByRole("button",{name:"Next result"}).click();
  await page.waitForFunction(()=>
    document.querySelector(".demo-find-results")?.textContent==="3 / 4 results");
  await page.waitForFunction(()=>!CSS.highlights?.has("demo-thread-find-active"));
  assert.deepEqual(await currentHighlight(),[]);

  await page.getByRole("button",{name:"Next result"}).click();
  await page.waitForFunction(()=>
    document.querySelector(".demo-find-results")?.textContent==="4 / 4 results");
  await page.waitForFunction((needle)=>
    Array.from(CSS.highlights?.get("demo-thread-find-active")??[])
      .some(range=>range.toString()===needle),token);
  assert.deepEqual(await currentHighlight(),[{text:token,inLink:false,unitKey}]);
  assert.equal(await findStatus.textContent(),"4 / 4 results");
 }finally{
  await app.close();
  await rm(profile,{recursive:true,force:true});
 }
});


test("real Electron restores original bubble geometry and Markdown heading/list/quote/table presentation",{
 timeout:90000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-markdown-source-layout-"));
 const app=await electron.launch({
  executablePath,
  args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,
  env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_USER_DATA_DIR:profile,
    ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
  timeout:40000,
 });
 try {
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  const message=[
    "Restore the original Markdown layout, not a screen-only demo.",
    "",
    "## Heading from source",
    "",
    "- Alpha",
    "- Beta",
    "",
    "> A real blockquote.",
    "",
    "This is `inline-source-code`.",
    "",
    "| Part | Width |",
    "| --- | --- |",
    "| User bubble | 70% |",
  ].join("\n");
  const composer=page.getByTestId("composer");
  await composer.waitFor({timeout:12000});
  await composer.fill(message);
  await page.getByTestId("send-button").click();
  const row=page.locator('[data-demo-turn-id^="user-"]').last();
  await row.waitFor({timeout:12000});
  const user=row.locator('[data-conversation-message="user"]');
  await user.locator("h2").waitFor({timeout:12000});
  await user.locator("table").waitFor({timeout:12000});
  const actual=await row.evaluate(element=>{
    const bubble=element.querySelector('[data-conversation-message="user"]');
    const md=bubble?.querySelector(".demo-markdown");
    const wrapper=element.querySelector(":scope > div:not(.demo-time-marker)");
    const style=(target,property)=>getComputedStyle(target).getPropertyValue(property).trim();
    const quote=md.querySelector("blockquote");
    const table=md.querySelector("table");
    const inline=[...md.querySelectorAll("code")].find(el=>
      el.textContent==="inline-source-code");
    return {
      maxWidth:style(wrapper,"max-width"),
      radius:style(bubble,"border-top-left-radius"),
      horizontalPadding:style(bubble,"padding-left"),
      headingScale:parseFloat(style(md.querySelector("h2"),"font-size"))/
        parseFloat(style(md,"font-size")),
      listMarker:style(md.querySelector("ul"),"list-style-type"),
      quoteBar:getComputedStyle(quote,"::before").width,
      quoteIndent:style(quote,"padding-inline-start"),
      tableCollapse:style(table,"border-collapse"),
      inlineScale:parseFloat(style(inline,"font-size"))/
        parseFloat(style(md,"font-size")),
    };
  });
  assert.equal(actual.maxWidth,"70%");
  assert.equal(actual.radius,"22px");
  assert.equal(actual.horizontalPadding,"16px");
  assert.ok(Math.abs(actual.headingScale-1.5)<.02);
  assert.equal(actual.listMarker,"disc");
  assert.equal(actual.quoteBar,"4px");
  assert.equal(actual.quoteIndent,"24px");
  assert.equal(actual.tableCollapse,"separate");
  assert.ok(Math.abs(actual.inlineScale-.875)<.02);
  await row.scrollIntoViewIfNeeded();
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({
    path:resolve(root,"desktop/test-results/conversation-original-markdown-layout.png"),
    fullPage:false,animations:"disabled",
  });
 }finally{
  await app.close();
  await rm(profile,{recursive:true,force:true});
 }
});


test("real Electron mounts source Rt compact only for explicit isAeonFormatted user item",{
 timeout:90000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-source-compact-message-"));
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
   const viewport=page.locator('[data-testid="transcript-scroll"]');
   await viewport.evaluate(el=>{el.scrollTop=0;});
   const standard=page.locator(
     '[data-demo-turn-id="intro"] [data-conversation-message="user"]');
   await standard.waitFor({timeout:12000});
   assert.equal(await standard.getAttribute("data-source-user-message-format"),"standard");
   const standardStyle=await standard.evaluate(el=>{
     const st=getComputedStyle(el);
     const row=el.closest(".demo-row--user");
     return {radius:st.borderTopLeftRadius,padding:st.paddingLeft,
       maxWidth:getComputedStyle(row.querySelector(":scope > div:not(.demo-time-marker)")).maxWidth};
   });
   assert.deepEqual(standardStyle,{radius:"22px",padding:"16px",maxWidth:"70%"});
   await page.getByRole("button",{name:/工具调用与审批交互/}).click();
   await viewport.evaluate(el=>{el.scrollTop=0;});
   const compact=page.locator(
     '[data-demo-turn-id="review-intro"] [data-conversation-message="user"]');
   await compact.waitFor({timeout:12000});
   assert.equal(await compact.getAttribute("data-source-user-message-format"),"compact");
   const actual=await compact.evaluate(el=>{
     const st=getComputedStyle(el);
     const markdown=el.querySelector(".demo-markdown");
     const md=getComputedStyle(markdown);
     const row=el.closest(".demo-row--user");
     return {
       radius:st.borderTopLeftRadius,paddingLeft:st.paddingLeft,
       paddingTop:st.paddingTop,maxWidth:st.maxWidth,
       wrapperMaxWidth:getComputedStyle(row.querySelector(
         ":scope > div:not(.demo-time-marker)")).maxWidth,
       width:el.getBoundingClientRect().width,
       lineHeight:md.lineHeight,
       letterSpacing:md.letterSpacing,
     };
   });
   assert.equal(actual.radius,"16px");
   assert.equal(actual.paddingLeft,"12px");
   assert.equal(actual.paddingTop,"8px");
   assert.ok(actual.maxWidth.includes("456px"));
   assert.ok(actual.wrapperMaxWidth.includes("456px"));
   assert.ok(actual.width<=456);
   assert.equal(actual.lineHeight,"17px");
   assert.ok(Math.abs(Number.parseFloat(actual.letterSpacing)+.13)<.02);
   await compact.scrollIntoViewIfNeeded();
   await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
   await page.screenshot({
     path:resolve(root,"desktop/test-results/conversation-source-compact-user-message.png"),
     animations:"disabled",fullPage:false,
   });
 }finally{
   await app.close();
   await rm(profile,{recursive:true,force:true});
 }
});


test("real Electron shares source code-block Wrap lines across two mounted Markdown blocks",{
 timeout:90000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-code-wrap-"));
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
  const token="SOURCE_WRAP_MOUNTED_"+("longcode".repeat(65));
  const markdown=[
   "Code blocks retain source content with a session-scoped wrap setting.",
   "",
   "```tsx",
   `const component = "${token}";`,
   "```",
   "",
   "```bash",
   `echo "${token}"`,
   "```",
  ].join("\n");
  const composer=page.getByTestId("composer");
  await composer.waitFor({timeout:12000});
  await composer.fill(markdown);
  await page.getByTestId("send-button").click();
  const row=page.locator('[data-demo-turn-id^="user-"]').last();
  const blocks=row.locator("[data-code-block][data-conversation-code-surface='true']");
  await blocks.first().waitFor({timeout:12000});
  assert.equal(await blocks.count(),2);
  const sourceState=()=>blocks.evaluateAll(nodes=>nodes.map(node=>{
    const bar=node.querySelector("[data-code-block-action-bar]");
    const scroll=node.querySelector("[data-code-block-source]");
    const pre=scroll.querySelector("pre");
    const st=getComputedStyle(pre);
    return {
      wrap:node.getAttribute("data-source-code-wrap-lines"),
      headerHeight:bar.getBoundingClientRect().height,
      overflowX:getComputedStyle(scroll).overflowX,
      whitespace:st.whiteSpace,
      scrollWidth:scroll.scrollWidth,clientWidth:scroll.clientWidth,
      text:pre.textContent,
    };
  }));
  const before=await sourceState();
  assert.ok(before.every(v=>v.wrap==="false"&&v.headerHeight>=48&&
    v.whitespace==="pre"&&v.overflowX==="auto"&&
    v.scrollWidth>v.clientWidth+20&&v.text.includes(token)));
  await blocks.first().getByRole("button",{name:"Enable word wrap"}).click();
  await page.waitForFunction(()=>
    [...document.querySelectorAll('[data-demo-turn-id^="user-"] [data-code-block]')]
      .filter(node=>node.getAttribute("data-source-code-wrap-lines")==="true").length>=2);
  const wrapped=await sourceState();
  assert.ok(wrapped.every((v,i)=>v.wrap==="true"&&
    v.whitespace==="pre-wrap"&&v.overflowX==="hidden"&&
    v.scrollWidth<=v.clientWidth+2&&v.text===before[i].text));
  await blocks.first().scrollIntoViewIfNeeded();
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({
    path:resolve(root,"desktop/test-results/conversation-source-code-word-wrap.png"),
    animations:"disabled",fullPage:false,
  });
  await blocks.nth(1).getByRole("button",{name:"Disable word wrap"}).click();
  await page.waitForFunction(()=>
    [...document.querySelectorAll('[data-demo-turn-id^="user-"] [data-code-block]')]
      .filter(node=>node.getAttribute("data-source-code-wrap-lines")==="false").length>=2);
  const final=await sourceState();
  assert.ok(final.every(v=>v.scrollWidth>v.clientWidth+20));
 }finally{
  await app.close();
  await rm(profile,{recursive:true,force:true});
 }
});


test("real Electron renders original Lezer token classes in mounted code while preserving code content",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-lezer-highlight-"));
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
   const token='const codeSource = "CODEX_LEZER_LIVE";';
   const plain='host = "unrecognized fallback"';
   const fence=String.fromCharCode(96).repeat(3);
   const msg=[
     "The actual Markdown viewer should highlight syntax by source language.",
     "",
     fence+"ts",token,fence,
     "",
     fence+"python",'def live():','    return "Codex"',fence,
     "",
     fence+"toml",plain,fence,
   ].join("\n");
   const composer=page.getByTestId("composer");
   await composer.waitFor({timeout:12000});
   await composer.fill(msg);
   await page.getByTestId("send-button").click();
   const row=page.locator('[data-demo-turn-id^="user-"]').last();
   const blocks=row.locator('[data-code-block][data-conversation-code-surface="true"]');
   await blocks.first().waitFor({timeout:12000});
   assert.equal(await blocks.count(),3);
   await page.waitForFunction(()=>{
     const nodes=[...document.querySelectorAll(
       '[data-demo-turn-id^="user-"] [data-code-block][data-source-code-highlight]',
     )];
     return nodes.some(el=>el.getAttribute("data-source-code-highlight")==="ready")&&
       nodes.some(el=>el.getAttribute("data-source-code-highlight")==="fallback");
   },null,{timeout:20000});
   const state=await blocks.evaluateAll(elements=>elements.map(element=>{
     const code=element.querySelector('[data-code-block-source] code');
     const keyword=code.querySelector(".text-codex-syntax-keyword");
     return {
       lang:element.querySelector(".demo-markdown-code-language")?.textContent,
       highlight:element.getAttribute("data-source-code-highlight"),
       text:code.textContent?.replace(/\n$/,""),
       tokenCount:code.querySelectorAll('span[class*="text-codex-syntax"]').length,
       hasKeyword:keyword!=null,
       keywordColor:keyword?getComputedStyle(keyword).color:null,
     };
   }));
   assert.equal(state[0].lang,"ts");
   assert.equal(state[0].highlight,"ready");
   assert.equal(state[0].text,token);
   assert.ok(state[0].tokenCount>=2&&state[0].hasKeyword);
   assert.equal(state[0].keywordColor,"rgb(171, 79, 122)");
   assert.equal(state[1].highlight,"ready");
   assert.ok(state[1].tokenCount>=2);
   assert.equal(state[2].highlight,"fallback");
   assert.equal(state[2].tokenCount,0);
   assert.equal(state[2].text,plain);
   await blocks.first().getByRole("button",{name:"Enable word wrap"}).click();
   await page.waitForFunction(()=>
     [...document.querySelectorAll('[data-demo-turn-id^="user-"] [data-code-block]')]
       .filter(el=>el.getAttribute("data-source-code-wrap-lines")==="true").length>=3);
   await blocks.first().scrollIntoViewIfNeeded();
   await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
   await page.screenshot({
     path:resolve(root,"desktop/test-results/conversation-lezer-source-code-highlighting.png"),
     animations:"disabled",fullPage:false,
   });
 }finally{
   await app.close();
   await rm(profile,{recursive:true,force:true});
 }
});


test("real Electron streams one canonical assistant code unit and finalizes Lezer",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-streaming-code-"));
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
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-streaming-code").click();
  const row=page.locator('[data-demo-turn-id^="streaming-code-"]').last();
  const block=row.locator('[data-conversation-code-surface="true"]');
  await block.waitFor({timeout:15000});
  assert.equal(await block.getAttribute("data-source-code-streaming"),"true");
  await page.waitForFunction(()=>
    [...document.querySelectorAll('[data-demo-turn-id^="streaming-code-"] [data-code-block]')]
      .some(node=>node.getAttribute("data-source-code-streaming")==="false"&&
        node.getAttribute("data-source-code-highlight")==="ready"),null,{timeout:15000});
  const data=await row.evaluate(node=>{
    const blocks=node.querySelectorAll('[data-conversation-code-surface="true"]');
    const code=blocks[0]?.querySelector('[data-code-block-source] code');
    return {
      count:blocks.length,
      source:code?.textContent,
      language:blocks[0]?.querySelector('.demo-markdown-code-language')?.textContent,
      keywords:code?.querySelectorAll(".text-codex-syntax-keyword").length,
      pending:blocks[0]?.getAttribute("data-source-code-highlight"),
    };
  });
  assert.equal(data.count,1);
  assert.equal(data.language,"ts");
  assert.equal(data.pending,"ready");
  assert.ok(data.keywords>0);
  assert.equal(data.source,[
    "const sourceStreaming = 1;",
    "const continued = 'source_' + sourceStreaming;",
    "console.log(continued);",
    "",
  ].join("\n"));
  await block.getByRole("button",{name:"Enable word wrap"}).click();
  assert.equal(await block.getAttribute("data-source-code-wrap-lines"),"true");
  await row.scrollIntoViewIfNeeded();
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({
    path:resolve(root,"desktop/test-results/conversation-source-streaming-code.png"),
    animations:"disabled",fullPage:false,
  });
 }finally{
  await app.close();
  await rm(profile,{recursive:true,force:true});
 }
});


test("real Electron repeated MCP activity collapses with inert children and keyboard focus returned",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-tool-focus-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_USER_DATA_DIR:profile,
   ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},timeout:40000,
 });
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  const viewport=page.getByTestId("transcript-scroll");
  await page.waitForTimeout(950);
  const row=page.locator('[data-demo-turn-id="review-repeated-mcp"]');
  for(let i=0;i<24&&await row.count()===0;i++){
   await viewport.evaluate(el=>{el.scrollTop+=230;el.dispatchEvent(new Event("scroll",{bubbles:true}));});
   await page.waitForTimeout(60);
  }
  await row.waitFor({timeout:12000});
  // A prior completed activity slice first uses the original Rk wrapper.
  // Expand the outer historical group before inspecting nk repeated rows.
  const historyToggle=row.locator('[data-recovered-agent-activity] button').first();
  await historyToggle.click();
  const outer=row.locator('[data-codex-activity-group] [aria-expanded]').first();
  await outer.click();
  const repeated=row.locator('[data-codex-source-repeated-group]').first();
  await repeated.waitFor({timeout:12000});
  const toggle=repeated.locator('[data-codex-source-repeated-toggle]');
  await toggle.click();
  const motion=repeated.locator('[data-source-disclosure-motion]');
  await motion.waitFor({timeout:12000});
  await motion.evaluate(el=>{
   const probe=document.createElement("button");
   probe.type="button";probe.textContent="Focus probe";
   probe.dataset.testFocusProbe="";el.append(probe);probe.focus();
  });
  assert.equal(await page.locator('[data-test-focus-probe]').evaluate(el=>document.activeElement===el),true);
  await toggle.evaluate(el=>el.click());
  assert.equal(await toggle.getAttribute("aria-expanded"),"false");
  assert.equal(await motion.getAttribute("inert"),"");
  assert.equal(await motion.getAttribute("aria-hidden"),"true");
  assert.equal(await toggle.evaluate(el=>document.activeElement===el),true);
  await row.scrollIntoViewIfNeeded();
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({path:resolve(root,"desktop/test-results/source-repeated-tool-focus.png"),
   animations:"disabled",fullPage:false});
 }finally{
  await app.close();await rm(profile,{recursive:true,force:true});
 }
});


test("real Electron keeps source file-review C wrap setting across two real conversation routes",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-review-wrap-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_USER_DATA_DIR:profile,
   ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},timeout:40000,
 });
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  const viewport=page.getByTestId("transcript-scroll");
  async function locate(id){
   const row=page.locator(`[data-demo-turn-id="${id}"]`);
   await viewport.evaluate(el=>{el.scrollTop=0;el.dispatchEvent(new Event("scroll",{bubbles:true}));});
   for(let i=0;i<36&&await row.count()===0;i++){
     await viewport.evaluate(el=>{el.scrollTop+=180;el.dispatchEvent(new Event("scroll",{bubbles:true}));});
     await page.waitForTimeout(45);
   }
   await row.waitFor({timeout:12000});
   const review=row.locator("[data-source-inline-review-wrap]");
   if(await review.count()===0)
     await row.locator("[data-recovered-agent-activity] button").first().click();
   await review.waitFor({timeout:12000});
   return review;
  }
  const frontend=await locate("diff");
  assert.equal(await frontend.getAttribute("data-source-inline-review-wrap"),"scroll");
  assert.equal(await frontend.getByRole("button",{name:"Edit"}).isDisabled(),true);
  assert.equal(await frontend.getByRole("button",{name:"Accept"}).isDisabled(),true);
  await frontend.getByRole("button",{name:"Enable word wrap"}).click();
  assert.equal(await frontend.getAttribute("data-source-inline-review-wrap"),"wrap");
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  const second=await locate("review-diff");
  assert.equal(await second.getAttribute("data-source-inline-review-wrap"),"wrap");
  assert.equal(await second.getByRole("button",{name:"Disable word wrap"}).getAttribute("aria-pressed"),"true");
  assert.equal(await second.getByRole("button",{name:"Edit"}).isDisabled(),true);
  assert.equal(await second.getByRole("button",{name:"Accept"}).isDisabled(),true);
  await second.scrollIntoViewIfNeeded();
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({path:resolve(root,"desktop/test-results/source-shared-file-review-wrap.png"),
   animations:"disabled",fullPage:false});
  await second.getByRole("button",{name:"Disable word wrap"}).click();
  await page.getByRole("button",{name:/恢复 Codex 会话界面/}).click();
  const returned=await locate("diff");
  assert.equal(await returned.getAttribute("data-source-inline-review-wrap"),"scroll");
 }finally{
  await app.close();await rm(profile,{recursive:true,force:true});
 }
});


test("native Electron preserves source inProgress approval shimmer and high-risk denial state",{
 timeout:90000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-auto-review-status-"));
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
   await page.getByRole("button",{name:"打开演示工具"}).click();
   await page.getByTestId("demo-automatic-review-transition").click();
   const row=page.locator('[data-demo-turn-id^="automatic-review-"]').last();
   const active=row.locator('[data-source-automatic-approval-status="inProgress"]');
   await active.waitFor({timeout:12000});
   const shimmer=active.locator('[data-source-automatic-approval-shimmer="true"]');
   await shimmer.waitFor({timeout:12000});
   const animation=await shimmer.evaluate(el=>getComputedStyle(el).animationName);
   assert.match(animation,/source-automatic-approval-review-shimmer/);
   const disclosure=active.locator('button[aria-expanded]').first();
   await disclosure.click();
   assert.equal(await disclosure.getAttribute("aria-expanded"),"true");
   await row.scrollIntoViewIfNeeded();
   await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
   await page.screenshot({
     path:resolve(root,"desktop/test-results/automatic-approval-in-progress.png"),
     animations:"disabled",fullPage:false,
   });
   const denied=row.getByText(
     "Requires explicit authorization because this action is considered high risk");
   await denied.waitFor({timeout:15000});
   assert.equal(await row.locator('[data-source-automatic-approval-shimmer]').count(),0);
   assert.equal(await row.locator('button[aria-expanded]').count(),0);
   assert.equal(await page.locator('[data-demo-turn-id^="automatic-review-"]').count(),1);
   await row.scrollIntoViewIfNeeded();
   await page.screenshot({
     path:resolve(root,"desktop/test-results/automatic-approval-high-risk-denied.png"),
     animations:"disabled",fullPage:false,
   });
 }finally{
   await app.close();
   await rm(profile,{recursive:true,force:true});
 }
});


test("native Electron MCP approval request waits for host, fails safely, and allows retry",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-mcp-approval-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_USER_DATA_DIR:profile,
    ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},timeout:40000,
 });
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-mcp-approval-request").click();
  const row=page.locator('[data-demo-turn-id^="mcp-approval-"]').last();
  const card=row.locator("[data-source-mcp-approval-card]");
  await card.waitFor({timeout:15000});
  assert.equal(await card.getAttribute("data-source-mcp-reply-phase"),"idle");
  assert.equal(await card.locator("[data-source-mcp-param]").count(),4);
  await card.getByRole("button",{name:"Show 2 more items"}).click();
  assert.equal(await card.locator("[data-source-mcp-param]").count(),6);
  const options=card.getByRole("button",{name:"Approval options"});
  const deny=card.getByRole("button",{name:"Deny"});
  await options.click();
  const session=page.getByRole("menuitem",{name:"Allow this conversation"});
  await session.click();
  // Real IPC fails immediately when no Agent backend is connected. The
  // already tested browser fixture holds the pending phase for 380ms,
  // while native Electron is allowed to settle before Playwright's click
  // completes. Neither outcome may become a fabricated approval.
  assert.ok(["submitting","error"].includes(
    await card.getAttribute("data-source-mcp-reply-phase")));
  await page.waitForFunction(()=>
    [...document.querySelectorAll("[data-source-mcp-approval-card]")]
      .some(node=>node.getAttribute("data-source-mcp-reply-phase")==="error"),
    null,{timeout:12000});
  assert.equal(await options.isDisabled(),false);
  assert.match(await card.locator(".codex-source-mcp-approval__error").innerText(),
    /MCP backend unavailable/);
  await deny.click();
  assert.ok(["submitting","error"].includes(
    await card.getAttribute("data-source-mcp-reply-phase")));
  await page.waitForFunction(()=>
    [...document.querySelectorAll("[data-source-mcp-approval-card]")]
      .some(node=>node.getAttribute("data-source-mcp-reply-phase")==="error"),
    null,{timeout:12000});
  assert.equal(await row.count(),1);
  assert.equal(await card.getByText(/Response sent to host/).count(),0);
  await row.scrollIntoViewIfNeeded();
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({
    path:resolve(root,"desktop/test-results/source-mcp-approval-failed-retry.png"),
    animations:"disabled",fullPage:false,
  });
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});


test("native Electron renders original high-risk MCP header and truly expands long tool parameters",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-mcp-source-presentation-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_USER_DATA_DIR:profile,
    ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},timeout:40000,
 });
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-mcp-approval-request").click();
  const row=page.locator('[data-demo-turn-id^="mcp-approval-"]').last();
  const card=row.locator("[data-source-mcp-approval-card]");
  await card.waitFor({timeout:15000});
  const header=card.locator("[data-source-mcp-header-variant]");
  assert.equal(await header.getAttribute("data-source-mcp-header-variant"),"elevated-risk");
  assert.match(await header.textContent(),/Elevated Risk/);
  assert.doesNotMatch(await header.textContent(),/Fixture files MCP connector/);
  assert.equal(await card.locator(".codex-source-mcp-approval__tool-name").innerText(),"files.search");
  assert.equal(await card.locator(".codex-source-mcp-approval__title").innerText(),
    "Allow Fixture files MCP connector to run files.search tool?");
  await card.getByRole("button",{name:"Show 2 more items"}).click();
  const description=card.locator('[data-source-mcp-param="description"] pre');
  const preview=await description.evaluate(el=>({
    height:el.getBoundingClientRect().height,
    clamp:getComputedStyle(el).webkitLineClamp,
  }));
  assert.equal(preview.clamp,"4");
  assert.ok(preview.height<100);
  await card.getByRole("button",{name:"Expand description"}).click();
  const after=await description.evaluate(el=>({
    height:el.getBoundingClientRect().height,
    maxHeight:getComputedStyle(el).maxHeight,
    text:el.textContent,
  }));
  assert.ok(after.height>preview.height*2);
  assert.equal(after.maxHeight,"none");
  assert.match(after.text,/Line 18: long tool argument/);
  assert.equal(await card.getAttribute("data-source-mcp-reply-phase"),"idle");
  await row.scrollIntoViewIfNeeded();
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({
    path:resolve(root,"desktop/test-results/source-mcp-expanded-argument.png"),
    animations:"disabled",fullPage:false,
  });
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});


test("native Electron source MCP responsive detail grid retains hidden value expansion",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-mcp-detail-grid-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_USER_DATA_DIR:profile,
   ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},timeout:40000,
 });
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-mcp-approval-request").click();
  const row=page.locator('[data-demo-turn-id^="mcp-approval-"]').last();
  const card=row.locator("[data-source-mcp-approval-card]");
  await card.waitFor({timeout:15000});
  const pathRow=card.locator('[data-source-mcp-param="path"]');
  async function cols(width){
   return pathRow.evaluate((el,w)=>{
    el.style.width=w+"px";
    const dt=el.querySelector("dt"),dd=el.querySelector("dd"),grid=el.querySelector(".codex-source-mcp-approval__param-row");
    return {tag:el.tagName,
      diff:dd.getBoundingClientRect().x-dt.getBoundingClientRect().x,
      cols:getComputedStyle(grid).gridTemplateColumns.split(" ").length};
   },width);
  }
  const narrow=await cols(320),wide=await cols(520);
  assert.equal(narrow.tag,"DL");
  assert.equal(narrow.cols,1);
  assert.ok(Math.abs(narrow.diff)<2);
  assert.equal(wide.cols,2);
  assert.ok(wide.diff>100);
  await pathRow.evaluate(el=>el.style.removeProperty("width"));
  await card.getByRole("button",{name:"Show 2 more items"}).click();
  const detail=card.locator('[data-source-mcp-param="description"]');
  await detail.getByRole("button",{name:"Expand description"}).click();
  assert.equal(await detail.locator("pre").getAttribute("data-source-mcp-param-preview"),"expanded");
  await card.getByRole("button",{name:"Show fewer items"}).click();
  assert.equal(await detail.count(),0);
  await card.getByRole("button",{name:"Show 2 more items"}).click();
  const restored=detail.getByRole("button",{name:"Collapse description"});
  await restored.waitFor({timeout:12000});
  assert.equal(await restored.getAttribute("aria-expanded"),"true");
  assert.match(await detail.locator("pre").textContent(),/Line 18: long tool argument/);
  assert.equal(await card.getAttribute("data-source-mcp-reply-phase"),"idle");
  await row.scrollIntoViewIfNeeded();
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({
   path:resolve(root,"desktop/test-results/source-mcp-responsive-details.png"),
   fullPage:false,animations:"disabled",
  });
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});


test("native Electron mounts original qbd approval shell and scoped split-button layout",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-qbd-approval-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_USER_DATA_DIR:profile,
    ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},timeout:40000,
 });
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-mcp-approval-request").click();
  const card=page.locator('[data-demo-turn-id^="mcp-approval-"]').last()
    .locator("[data-codex-approval-surface]");
  await card.waitFor({timeout:15000});
  assert.equal(await card.locator('[role="alert"][aria-atomic="true"]').count(),1);
  assert.equal(await card.locator('.codex-source-mcp-approval__reason-row dt').innerText(),"Reason");
  assert.match(await card.locator('.codex-source-mcp-approval__reason-row dd').innerText(),
    /sample project files/);
  const footer=card.locator("form.codex-source-mcp-approval__footer");
  assert.equal(await footer.getByRole("button",{name:"Always allow"}).count(),1);
  assert.equal(await footer.getByRole("button",{name:"Allow once"}).count(),1);
  assert.equal(await footer.getByRole("button",{name:"Allow for session"}).count(),0);
  async function layout(width){
   return card.evaluate((el,w)=>{
    el.style.width=w+"px";
    const f=el.querySelector(".codex-source-mcp-approval__footer");
    const lead=f.querySelector(".codex-source-mcp-approval__action--leading");
    const deny=f.querySelector(".codex-source-mcp-approval__trailing button");
    const primary=f.querySelector(".codex-source-mcp-approval__action--primary");
    return {direction:getComputedStyle(f).flexDirection,
      lead:lead.getBoundingClientRect().toJSON(),
      deny:deny.getBoundingClientRect().toJSON(),
      primary:primary.getBoundingClientRect().toJSON()};
   },width);
  }
  const wide=await layout(600),narrow=await layout(410);
  assert.equal(wide.direction,"row");
  assert.ok(wide.lead.x<wide.deny.x&&wide.deny.x<wide.primary.x);
  assert.equal(narrow.direction,"column");
  assert.ok(narrow.lead.y<narrow.deny.y&&narrow.deny.y<narrow.primary.y);
  await card.evaluate(el=>el.style.removeProperty("width"));
  const options=footer.getByRole("button",{name:"Approval options"});
  await options.click();
  const menu=page.getByRole("menu",{name:"Approval options"});
  await menu.waitFor({timeout:12000});
  assert.equal(await menu.getByRole("menuitem").count(),2);
  assert.equal(await menu.getByRole("menuitem",{name:"Allow once"}).evaluate(
    el=>el===document.activeElement),true);
  await page.keyboard.press("Escape");
  assert.equal(await menu.count(),0);
  assert.equal(await options.evaluate(el=>el===document.activeElement),true);
  assert.equal(await card.getAttribute("data-source-mcp-reply-phase"),"idle");
  await card.scrollIntoViewIfNeeded();
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({
   path:resolve(root,"desktop/test-results/source-qbd-approval-footer.png"),
   animations:"disabled",fullPage:false,
  });
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});


test("native Electron scoped approval menu roves focus by arrow keys and never sends a decision",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-approval-menu-keyboard-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_USER_DATA_DIR:profile,
    ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},timeout:40000,
 });
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-mcp-approval-request").click();
  const card=page.locator('[data-demo-turn-id^="mcp-approval-"]').last()
    .locator("[data-codex-approval-surface]");
  await card.waitFor({timeout:15000});
  assert.equal(await card.evaluate(el=>getComputedStyle(el).borderTopLeftRadius),"24px");
  const options=card.getByRole("button",{name:"Approval options"});
  await options.focus();
  await options.press("ArrowUp");
  const menu=page.getByRole("menu",{name:"Approval options"});
  await menu.waitFor({timeout:10000});
  const once=menu.getByRole("menuitem",{name:"Allow once"});
  const session=menu.getByRole("menuitem",{name:"Allow this conversation"});
  const focused=el=>el.evaluate(node=>node===document.activeElement);
  assert.equal(await focused(session),true);
  await page.keyboard.press("ArrowDown");
  assert.equal(await focused(once),true);
  await page.keyboard.press("End");
  assert.equal(await focused(session),true);
  await page.keyboard.press("Home");
  assert.equal(await focused(once),true);
  await page.keyboard.press("Escape");
  assert.equal(await menu.count(),0);
  assert.equal(await focused(options),true);
  assert.equal(await card.getAttribute("data-source-mcp-reply-phase"),"idle");
  assert.equal(await card.locator(".codex-source-mcp-approval__error").count(),0);
  await card.scrollIntoViewIfNeeded();
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({
   path:resolve(root,"desktop/test-results/source-approval-menu-keyboard.png"),
   animations:"disabled",fullPage:false,
  });
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});


test("native Electron KZu clipped approval card keeps portaled Mae menu visible, anchored and focus safe",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-source-approval-portal-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_USER_DATA_DIR:profile,
    ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},timeout:40000,
 });
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-mcp-approval-request").click();
  const card=page.locator('[data-demo-turn-id^="mcp-approval-"]').last()
    .locator("[data-codex-approval-surface]");
  const options=card.getByRole("button",{name:"Approval options"});
  await options.click();
  const menu=page.getByRole("menu",{name:"Approval options"});
  await menu.waitFor({timeout:12000});
  const overlay=await page.evaluate(()=>{
    const card=document.querySelector("[data-codex-approval-surface][data-source-mcp-reply-phase='idle']");
    const trigger=card?.querySelector('[aria-label="Approval options"]');
    const portal=document.querySelector("[data-source-approval-menu-portal]");
    if(!card||!trigger||!portal)return null;
    const a=trigger.getBoundingClientRect(),b=portal.getBoundingClientRect();
    return {clipped:getComputedStyle(card).overflowX,
      outOfCard:!card.contains(portal),
      bodyPortal:portal.parentElement===document.body,
      x:b.x,y:b.y,right:b.right,bottom:b.bottom,
      triggerTop:a.top,triggerBottom:a.bottom,
      side:portal.getAttribute("data-source-approval-menu-placement"),
      windowWidth:innerWidth,windowHeight:innerHeight};
  });
  assert.ok(overlay,"actual mounted approval portal is present");
  assert.equal(overlay.clipped,"hidden");
  assert.equal(overlay.bodyPortal,true);
  assert.equal(overlay.outOfCard,true);
  assert.ok(overlay.x>=7&&overlay.y>=7);
  assert.ok(overlay.right<=overlay.windowWidth-7);
  assert.ok(overlay.bottom<=overlay.windowHeight-7);
  if(overlay.side==="top")assert.ok(overlay.bottom<=overlay.triggerTop-4);
  else assert.ok(overlay.y>=overlay.triggerBottom+4);
  const session=menu.getByRole("menuitem",{name:"Allow this conversation"});
  assert.equal(await session.isVisible(),true);
  await page.keyboard.press("End");
  assert.equal(await session.evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press("Escape");
  assert.equal(await menu.count(),0);
  assert.equal(await options.evaluate(el=>el===document.activeElement),true);
  assert.equal(await card.getAttribute("data-source-mcp-reply-phase"),"idle");
  await options.click();
  await menu.waitFor({timeout:10000});
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({
    path:resolve(root,"desktop/test-results/source-approval-clipped-card-portal.png"),
    animations:"disabled",fullPage:false,
  });
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});


test("native Electron renders source Computer Use first-use card and rejects approval through actual main IPC",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-computer-use-approval-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_USER_DATA_DIR:profile,
    ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},timeout:40000,
 });
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-computer-use-approval-request").click();
  const row=page.locator('[data-demo-turn-id^="computer-use-approval-"]').last();
  const card=row.locator("[data-source-computer-use-approval-card]");
  await card.waitFor({timeout:15000});
  assert.equal(await card.getAttribute("data-source-computer-use-reply-phase"),"idle");
  assert.match(await card.innerText(),/Allow ChatGPT to use Visual Studio Code\?/);
  assert.match(await card.locator('[data-source-computer-use-first-disclosure="true"]').innerText(),
    /It may take screenshots of app contents/);
  assert.equal(await card.getByRole("button",{name:"Always allow"}).count(),1);
  assert.equal(await card.getByRole("button",{name:"Allow once"}).count(),0);
  const approve=card.getByRole("button",{name:"Allow this conversation"});
  await approve.click();
  // Real Electron IPC rejects immediately; never assume browser fixture delay.
  assert.ok(["submitting","error"].includes(
    await card.getAttribute("data-source-computer-use-reply-phase")));
  await card.locator(".codex-source-mcp-approval__error").waitFor({timeout:15000});
  assert.match(await card.locator(".codex-source-mcp-approval__error").innerText(),
    /backend unavailable/);
  assert.equal(await approve.isDisabled(),false);
  assert.match(await card.locator('[data-source-computer-use-first-disclosure="true"]').innerText(),
    /It may take screenshots/);
  await card.getByRole("button",{name:"Deny"}).click();
  await card.locator(".codex-source-mcp-approval__error").waitFor({timeout:15000});
  assert.equal(await card.getAttribute("data-source-computer-use-reply-phase"),"error");
  assert.equal(await card.getByText(/Response sent to host/).count(),0);
  assert.equal(await row.count(),1);
  await row.scrollIntoViewIfNeeded();
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({
    path:resolve(root,"desktop/test-results/source-computer-use-approval-backend-unavailable.png"),
    animations:"disabled",fullPage:false,
  });
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});


test("native Electron Browser website access remains fail-closed across site and global approval scopes",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-browser-site-approval-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_USER_DATA_DIR:profile,
    ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},timeout:40000,
 });
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-browser-website-approval-request").click();
  const browserCard=page.locator('[data-demo-turn-id^="browser-website-approval-"]')
    .last().locator("[data-source-browser-website-approval-card]");
  await browserCard.waitFor({timeout:15000});
  assert.match(await browserCard.innerText(),/Allow ChatGPT to access/);
  assert.equal(await browserCard.getAttribute("data-source-browser-website-reply-phase"),"idle");
  await browserCard.getByRole("button",{name:"Allow for all sites"}).click();
  const dialog=page.getByRole("dialog");
  await dialog.waitFor({timeout:10000});
  assert.match(await dialog.innerText(),/elevated risks for your data/);
  await dialog.getByRole("button",{name:"Cancel"}).click();
  assert.equal(await dialog.count(),0);
  assert.equal(await browserCard.getAttribute("data-source-browser-website-reply-phase"),"idle");
  await browserCard.getByRole("button",{name:"Allow for all sites"}).click();
  await dialog.getByRole("button",{name:"Allow any website"}).click();
  await browserCard.locator(".codex-source-mcp-approval__error").waitFor({timeout:15000});
  assert.equal(await browserCard.getAttribute("data-source-browser-website-reply-phase"),"error");
  assert.match(await browserCard.locator(".codex-source-mcp-approval__error").innerText(),
    /No permission was confirmed/);
  assert.equal(await browserCard.getByText(/Response sent to host/).count(),0);
  // The fixture picker dismisses after Browser selection; reopen it to
  // inject the independent Chrome request into the real virtual transcript.
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-chrome-website-approval-request").click();
  const chromeCard=page.locator('[data-demo-turn-id^="browser-website-policy-denied-"]')
    .last().locator("[data-source-browser-website-approval-card]");
  await chromeCard.waitFor({timeout:15000});
  assert.equal(await chromeCard.getByRole("button",{name:"Allow for all sites"}).count(),0);
  assert.match(await chromeCard.innerText(),/Chrome/);
  await chromeCard.getByRole("button",{name:"Approval options"}).click();
  const menu=page.getByRole("menu",{name:"Approval options"});
  await menu.waitFor({timeout:10000});
  await menu.getByRole("menuitem",{name:"Allow for this site"}).click();
  await chromeCard.locator(".codex-source-mcp-approval__error").waitFor({timeout:15000});
  assert.equal(await chromeCard.getAttribute("data-source-browser-website-reply-phase"),"error");
  assert.match(await chromeCard.locator(".codex-source-mcp-approval__error").innerText(),
    /backend unavailable/);
  assert.equal(await chromeCard.getByText(/Response sent to host/).count(),0);
  await chromeCard.scrollIntoViewIfNeeded();
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({
    path:resolve(root,"desktop/test-results/source-browser-site-approval-fail-closed.png"),
    animations:"disabled",fullPage:false,
  });
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});

test("native Electron renders source hn/yn uploaded and workspace attachments without granting file-open authority",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-user-file-attachments-"));
 const app=await electron.launch({
  executablePath,args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_USER_DATA_DIR:profile,
    ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},timeout:40000,
 });
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  // Reuse this EXISTING native BrowserWindow to assert actual preload/main
  // denial; a separate concurrent Electron launch can starve CI display.
  const workspaceSecurity=await page.evaluate(async path=>{
    const host=window.agentWebDesktopHost;
    const error=async request=>{
      try{await host.readWorkspaceTextFile(request);return "UNEXPECTED_SUCCESS";}
      catch(e){return String(e);}
    };
    return {
      chooser:typeof host.selectWorkspaceDirectory,
      read:typeof host.readWorkspaceTextFile,
      revoke:typeof host.revokeWorkspaceDirectory,
      rawIpc:typeof host.invoke,
      node:typeof window.require,
      absentGrant:await error({path:path}),
      relative:await error({path:"../escape.ts"}),
      invalidLine:await error({path:path,line:-1}),
    };
  },resolve(root,"demo","App.tsx"));
  assert.equal(workspaceSecurity.chooser,"function");
  assert.equal(workspaceSecurity.read,"function");
  assert.equal(workspaceSecurity.revoke,"function");
  assert.equal(workspaceSecurity.rawIpc,"undefined");
  assert.equal(workspaceSecurity.node,"undefined");
  assert.match(workspaceSecurity.absentGrant,/WORKSPACE_NOT_GRANTED|WORKSPACE_INVALID_FILE_REQUEST/);
  assert.match(workspaceSecurity.relative,/WORKSPACE_INVALID_FILE_REQUEST/);
  assert.match(workspaceSecurity.invalidLine,/WORKSPACE_INVALID_FILE_REQUEST/);
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-user-file-attachments").click();
  const row=page.locator('[data-demo-turn-id^="user-file-attachments-"]').last();
  await row.waitFor({timeout:15000});
  const files=row.locator('[data-conversation-message="user"] [data-source-user-file-attachments]');
  await files.waitFor({timeout:15000});
  assert.equal(await files.locator('[data-source-user-attachment-kind]').count(),5);
  assert.equal(await files.locator('[data-source-pasted-text-preview="true"]').count(),2);
  assert.match(await files.innerText(),/Pasted code snippets from a test fixture/);
  assert.match(await files.innerText(),/App\.tsx/);
  assert.match(await files.innerText(),/reference-notes\.pdf/);
  assert.equal(await files.locator('[data-source-user-attachment-lines="14-28"]').count(),1);
  // The new narrow native workspace action is enabled, but does not open
  // any file until explicit folder consent. Other attachment kinds remain
  // disabled and cannot borrow this local read-only capability.
  assert.equal(await files.getByRole("button",{name:/App\.tsx/}).isEnabled(),true);
  assert.equal(await files.getByRole("button",{name:"reference-notes.pdf"}).isDisabled(),true);
  assert.equal(await files.getByRole("button",{name:"Detached attachment"}).isDisabled(),true);
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({
   path:resolve(root,"desktop/test-results/source-user-file-attachments-readonly.png"),
   animations:"disabled",fullPage:false,
  });
  assert.equal(await page.getByRole("region",{name:"对话"}).count(),1);
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});

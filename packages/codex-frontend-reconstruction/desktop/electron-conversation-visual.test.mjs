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

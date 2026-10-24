import test from "node:test";
import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {_electron as electron} from "playwright";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const screenshot=resolve(root,"desktop/test-results/electron-renderer.png");

/** Runs a real BrowserWindow, no browser-only approximation of preload. */
test("independent Electron file renderer starts, isolates preload and routes Fc host event into mounted ga",{
 timeout:90000,
},async()=>{
 const executablePath=resolve(root,"node_modules","electron","dist",
  process.platform==="win32"?"electron.exe":process.platform==="darwin"?"Electron.app/Contents/MacOS/Electron":"electron");
 const app=await electron.launch({
  executablePath,
  args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,
  env:{...process.env,AGENT_WEB_DEV_URL:"",ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
  timeout:40000,
 });
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  const host=await page.evaluate(async()=>{
   const api=window.agentWebDesktopHost;
   return {
     hasHost:api!=null,
     info:api==null?null:await api.getHostInfo(),
     exposedNode:typeof window.require,
     processType:typeof window.process,
   };
  });
  assert.equal(host.hasHost,true);
  assert.equal(host.info.windowType,"electron");
  assert.equal(host.info.backendConnected,false);
  assert.equal(host.exposedNode,"undefined");
  assert.equal(host.processType,"undefined");
  const prefs=await app.evaluate(({BrowserWindow})=>{
    const win=BrowserWindow.getAllWindows()[0];
    return win.webContents.getLastWebPreferences();
  });
  assert.equal(prefs.nodeIntegration,false);
  assert.equal(prefs.contextIsolation,true);
  assert.equal(prefs.sandbox,true);
  // Original Codex source i3e uses native titleBarOverlay for win32/linux,
  // hiddenInset for darwin, and primary minimum size 480x600.
  const nativeWindow=await app.evaluate(({BrowserWindow})=>{
    const win=BrowserWindow.getAllWindows()[0];
    return {minimum:win.getMinimumSize(),bounds:win.getBounds()};
  });
  assert.deepEqual(nativeWindow.minimum,[480,600]);
  assert.ok(nativeWindow.bounds.width>=480&&nativeWindow.bounds.height>=600);
  const windowChrome=await page.evaluate(()=>{
    const root=document.querySelector(".demo-desktop");
    const titlebar=document.querySelector(".demo-window-menu");
    const duplicate=document.querySelector(".demo-window-buttons");
    return {
      electron:root?.getAttribute("data-independent-electron"),
      title:titlebar?.getAttribute("aria-label"),
      drag:titlebar==null?null:getComputedStyle(titlebar).getPropertyValue("-webkit-app-region"),
      titlebarHeight:titlebar?.getBoundingClientRect().height,
      duplicateCaptionDisplay:duplicate==null?null:getComputedStyle(duplicate).display,
    };
  });
  assert.equal(windowChrome.electron,"true");
  assert.equal(windowChrome.title,"Electron 原生标题栏拖拽区域");
  assert.equal(windowChrome.titlebarHeight,36);
  assert.equal(windowChrome.duplicateCaptionDisplay,"none");
  assert.equal(windowChrome.drag,"drag");
  // Source w0e/D0e menus are real Electron MenuItems. They use native
  // edit roles and View accelerators; private Codex commands are excluded.
  const nativeMenus=await app.evaluate(({Menu})=>{
    const menu=Menu.getApplicationMenu();
    return {
      labels:menu.items.filter(entry=>["File","Edit","View","Help"].includes(entry.label))
        .map(entry=>entry.label),
      close:menu.getMenuItemById("closeWindow")?.accelerator,
      in:menu.getMenuItemById("zoomIn")?.accelerator,
      out:menu.getMenuItemById("zoomOut")?.accelerator,
      actual:menu.getMenuItemById("actualSize")?.accelerator,
      fullscreen:menu.getMenuItemById("toggleFullScreen")?.accelerator,
    };
  });
  assert.deepEqual(nativeMenus.labels,["File","Edit","View","Help"]);
  assert.equal(nativeMenus.close,"Ctrl+W");
  assert.equal(nativeMenus.in,"CmdOrCtrl+Plus");
  assert.equal(nativeMenus.out,"CmdOrCtrl+-");
  assert.equal(nativeMenus.actual,"CmdOrCtrl+0");
  assert.equal(nativeMenus.fullscreen,"F11");
  assert.equal(await page.locator('[data-desktop-menu]').count(),4);
  assert.equal(await page.locator('[data-desktop-menu="view"]').evaluate(
    el=>getComputedStyle(el).getPropertyValue("-webkit-app-region")),"no-drag");
  // The renderer cannot call arbitrary host menu actions through preload.
  assert.equal(await page.evaluate(()=>window.agentWebDesktopHost?.openMenu(
    "newTask",{x:12,y:14})),false);
  const location=await page.evaluate(()=>window.location.protocol);
  assert.equal(location,"file:");
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  const fixture=page.locator('[data-demo-turn-id="review-live-turn-state"]');
  await fixture.waitFor({timeout:12000});
  const groups=fixture.locator("[data-codex-activity-group]");
  assert.equal(await groups.count(),0);
  // THIS event crosses real main-process IPC -> isolated preload -> React
  // bridge -> Fc qn/Qr source -> existing ga activity group.
  await app.evaluate(({BrowserWindow})=>{
    BrowserWindow.getAllWindows()[0].webContents.send("agent-web:host-event",{
      type:"up-next-ready",query:{threadId:"review",hostId:"demo-host"},ready:true,
    });
  });
  await groups.waitFor({timeout:10000});
  assert.equal(await groups.count(),1);
  await app.evaluate(({BrowserWindow})=>{
    BrowserWindow.getAllWindows()[0].webContents.send("agent-web:host-event",{
      type:"clear-thread",hostId:"demo-host",threadId:"review",
    });
  });
  await groups.waitFor({state:"detached",timeout:10000});
  // The source-backed D0e menu dispatch now enters the SAME mounted
  // App/sidebar/ConnectedLiveConversationTranscript, not a separate UI model.
  const shell=page.locator(".demo-desktop");
  assert.equal(await shell.getAttribute("data-app-shell-sidebar-open"),"true");
  await app.evaluate(({Menu})=>{
    Menu.getApplicationMenu().getMenuItemById("toggleSidebar").click();
  });
  await page.waitForFunction(()=>document.querySelector(".demo-desktop")
    ?.getAttribute("data-app-shell-sidebar-open")==="false");
  await app.evaluate(({Menu})=>{
    Menu.getApplicationMenu().getMenuItemById("toggleSidebar").click();
  });
  await page.waitForFunction(()=>document.querySelector(".demo-desktop")
    ?.getAttribute("data-app-shell-sidebar-open")==="true");

  // The host owns per-thread snapshots: native previous/next commands
  // must not discard an already-edited ProseMirror draft. This exercises
  // the actual menu -> preload -> mounted App and editor controller.
  const retainedDraft=page.getByRole("textbox",{name:"演示消息输入"});
  await retainedDraft.fill("Electron 会话保留草稿");
  // The demo has two explicit source-projected conversations; we validate
  // native commands calling EXISTING switchConversation with bounded routing.
  await app.evaluate(({Menu})=>{
    Menu.getApplicationMenu().getMenuItemById("previousThread").click();
  });
  await page.locator('[data-demo-turn-id="review-live-turn-state"]')
    .waitFor({state:"detached",timeout:10000});
  await page.waitForFunction(()=>document.querySelector(".demo-header-location strong")
    ?.textContent?.includes("恢复 Codex 会话界面")===true);
  await retainedDraft.fill("前端会话自己的草稿");
  await app.evaluate(({Menu})=>{
    Menu.getApplicationMenu().getMenuItemById("nextThread").click();
  });
  await page.locator('[data-demo-turn-id="review-live-turn-state"]')
    .waitFor({state:"attached",timeout:10000});
  await page.waitForFunction(()=>document.querySelector(".demo-header-location strong")
    ?.textContent?.includes("工具调用与审批交互")===true);
  // First return to review restores the earlier review-only draft.
  await page.waitForFunction(()=>document.querySelector('[aria-label="演示消息输入"]')?.textContent?.includes("Electron 会话保留草稿")===true);
  // Update review and verify two separate thread drafts after another round.
  await retainedDraft.fill("审阅会话自己的草稿");
  await app.evaluate(({Menu})=>Menu.getApplicationMenu().getMenuItemById("previousThread").click());
  await page.waitForFunction(()=>document.querySelector(".demo-header-location strong")
    ?.textContent?.includes("恢复 Codex 会话界面")===true);
  await page.waitForFunction(()=>document.querySelector('[aria-label="演示消息输入"]')?.textContent?.includes("前端会话自己的草稿")===true);
  await app.evaluate(({Menu})=>Menu.getApplicationMenu().getMenuItemById("nextThread").click());
  await page.waitForFunction(()=>document.querySelector(".demo-header-location strong")
    ?.textContent?.includes("工具调用与审批交互")===true);
  await page.waitForFunction(()=>document.querySelector('[aria-label="演示消息输入"]')?.textContent?.includes("审阅会话自己的草稿")===true);
  await retainedDraft.fill("");
  // Y history content is a host-keyed subscription, not the raw demo turn.
  // Find must reflect hydration and clear-thread while using the SAME
  // mounted virtual row (no separate search/transcript renderer).
  const historyRow=page.locator('[data-demo-turn-id="review-history-hydration"]');
  await historyRow.waitFor({state:"attached",timeout:10000});
  await app.evaluate(({Menu})=>{
    Menu.getApplicationMenu().getMenuItemById("findInThread").click();
  });
  const findInput=page.getByRole("searchbox",{name:"Find in chat"});
  await findInput.waitFor({timeout:10000});
  // Source AFt: portal to document.body, outer pointer-transparent fixed
  // top-2/right-16, z-[55], max-w-[70vw]. Actual Electron DOM is checked,
  // not an isolated model or a screenshot of a substitute search view.
  const portal=page.locator("[data-source-thread-find-portal='true']");
  assert.equal(await portal.count(),1);
  const portalGeometry=await portal.evaluate(element=>{
    const rect=element.getBoundingClientRect();
    const style=getComputedStyle(element);
    const find=element.querySelector("[data-content-search-bar='true']");
    return {
      isBodyChild:element.parentElement===document.body,
      top:rect.top,right:window.innerWidth-rect.right,
      position:style.position,zIndex:style.zIndex,pointerEvents:style.pointerEvents,
      maxWidthPercent:Math.round(100*Number.parseFloat(style.maxWidth)/window.innerWidth),
      searchPointerEvents:find==null?null:getComputedStyle(find).pointerEvents,
    };
  });
  assert.deepEqual(portalGeometry,{
    isBodyChild:true,top:8,right:16,position:"fixed",zIndex:"55",
    pointerEvents:"none",maxWidthPercent:70,searchPointerEvents:"auto",
  });
  await findInput.fill("历史正文已通过订阅恢复");
  await page.waitForFunction(()=>document.querySelector(".demo-find-results")?.textContent==="0 results");
  await historyRow.locator("[data-demo-load-history]").click();
  await page.waitForFunction(()=>document.querySelector(".demo-find-results")?.textContent==="1 / 1 results");
  await page.waitForFunction(()=>Array.from(CSS.highlights?.get("demo-thread-find-active")??[])
    .some(range=>range.toString()==="历史正文已通过订阅恢复"&&
      range.startContainer.parentElement?.closest('[data-demo-turn-id="review-history-hydration"]')!=null));
  await historyRow.locator("[data-demo-clear-history]").click();
  await page.waitForFunction(()=>document.querySelector(".demo-find-results")?.textContent==="0 results");
  await page.waitForFunction(()=>!CSS.highlights?.has("demo-thread-find-active"));
  await findInput.press("Escape");
  await findInput.waitFor({state:"detached",timeout:10000});

  // D0e View find-in-thread now crosses the SAME native menu, isolated
  // preload and mounted React transcript. The original private regex worker
  // and diff/page/browser domains remain outside this frontend slice.
  await app.evaluate(({Menu})=>{
    Menu.getApplicationMenu().getMenuItemById("findInThread").click();
  });
  await findInput.waitFor({timeout:10000});
  await findInput.waitFor({timeout:10000});
  await findInput.fill("does-not-occur-in-fixture-12345");
  await page.waitForFunction(()=>document.querySelector(".demo-find-results")?.textContent==="0 results");
  await findInput.fill("工具");
  await page.waitForFunction(()=>{
    const label=document.querySelector(".demo-find-results")?.textContent??"";
    const found=label.match(/^(\d+) \/ (\d+) results/);
    return found!=null && Number(found[2])>=2;
  });
  const findLabel=page.locator(".demo-find-results");
  assert.match(await findLabel.textContent(),/^1 \/ \d+ results/);
  await app.evaluate(({Menu})=>{
    Menu.getApplicationMenu().getMenuItemById("findNextInThread").click();
  });
  await page.waitForFunction(()=>document.querySelector(".demo-find-results")?.textContent?.startsWith("2 / "));
  await app.evaluate(({Menu})=>{
    Menu.getApplicationMenu().getMenuItemById("findPreviousInThread").click();
  });
  await page.waitForFunction(()=>document.querySelector(".demo-find-results")?.textContent?.startsWith("1 / "));
  await findInput.press("Escape");
  await findInput.waitFor({state:"detached",timeout:10000});

  // Inject a repeated phrase, then await the source snapshot's six
  // indexed occurrences. The delayed reply may be unmounted while the
  // virtualizer is scrolled to a different turn; DOM presence is NOT the
  // definition of host-owned conversation data.
  const composer=page.getByRole("textbox",{name:"演示消息输入"});
  await composer.fill("可见定位可见定位可见定位");
  await page.getByRole("button",{name:"发送模拟消息"}).click();
  await app.evaluate(({Menu})=>{
    Menu.getApplicationMenu().getMenuItemById("findInThread").click();
  });
  await findInput.waitFor({timeout:10000});
  await findInput.fill("可见定位");
  await page.waitForFunction(()=>document.querySelector(".demo-find-results")
    ?.textContent?.startsWith("1 / 6"));
  // Chromium's CSS Highlight API marks one precise mounted Markdown Range,
  // without inserting a span/mark inside React-owned DOM or leaking selection.
  const selectedRange=async()=>page.evaluate(()=>{
    const registry=CSS.highlights;
    const highlight=registry?.get("demo-thread-find-active");
    const ranges=highlight==null?[]:Array.from(highlight);
    const range=ranges[0];
    if(ranges.length!==1||range==null)return null;
    const viewport=document.querySelector('[data-testid="transcript-scroll"]');
    const box=range.getBoundingClientRect(),screen=viewport?.getBoundingClientRect();
    return {
      text:range.toString(),offset:range.startOffset,
      turn:range.startContainer.parentElement?.closest("[data-demo-turn-id]")
        ?.getAttribute("data-demo-turn-id"),
      visible:screen!=null&&box.top>=screen.top-2&&box.bottom<=screen.bottom+2,
    };
  });
  await page.waitForFunction(()=>CSS.highlights?.has("demo-thread-find-active")===true);
  const firstMatch=await selectedRange();
  assert.equal(firstMatch?.text,"可见定位");
  assert.equal(firstMatch?.visible,true);
  await app.evaluate(({Menu})=>{
    Menu.getApplicationMenu().getMenuItemById("findNextInThread").click();
  });
  await page.waitForFunction(()=>document.querySelector(".demo-find-results")?.textContent?.startsWith("2 / "));
  await page.waitForFunction(()=>Array.from(CSS.highlights?.get("demo-thread-find-active")??[])
    .some(range=>range.startOffset>0));
  const secondMatch=await selectedRange();
  assert.equal(secondMatch?.text,"可见定位");
  assert.equal(secondMatch?.turn,firstMatch?.turn);
  assert.ok(secondMatch.offset>firstMatch.offset);
  await findInput.press("Escape");
  await page.waitForFunction(()=>!CSS.highlights?.has("demo-thread-find-active"));

  // Original re/z caps *navigable offsets* at 250, not the count label.
  // The running app must show a true total, a "+" marker and still highlight
  // a first result in a turn whose visible text has >250 occurrences.
  await composer.fill("Zcap".repeat(270));
  await page.getByRole("button",{name:"发送模拟消息"}).click();
  await app.evaluate(({Menu})=>{
    Menu.getApplicationMenu().getMenuItemById("findInThread").click();
  });
  await findInput.waitFor({timeout:10000});
  await findInput.fill("Zcap");
  await page.waitForFunction(()=>{
    const label=document.querySelector(".demo-find-results")?.textContent??"";
    return label.startsWith("1 / ") && label.endsWith("+ results") &&
      Number(label.split(" / ")[1]?.split("+")[0]) >= 300;
  });
  await page.waitForFunction(()=>Array.from(CSS.highlights?.get("demo-thread-find-active")??[])
    .some(range=>range.toString()==="Zcap"));
  // The source enables slash-regex only for host-confirmed searchMath, not
  // the ordinary conversation find. This is still a literal query.
  await findInput.fill("/Zcap/");
  await page.waitForFunction(()=>document.querySelector(".demo-find-results")?.textContent==="0 results");
  await findInput.press("Escape");
  await page.waitForFunction(()=>!CSS.highlights?.has("demo-thread-find-active"));

  // Source O/k: the native menu finds the canonical virtual turn, then
  // real React activity disclosure mounts the full Pierre diff. No shadow-DOM
  // test doubles, fake +/- <pre>, filesystem writes or approval side effects.
  await app.evaluate(({Menu})=>{
    Menu.getApplicationMenu().getMenuItemById("findInThread").click();
  });
  await findInput.waitFor({timeout:10000});
  await findInput.fill("审阅变更（只读）");
  await page.waitForFunction(()=>document.querySelector(".demo-find-results")
    ?.textContent?.startsWith("1 / "));
  const fullReviewRow=page.locator('[data-demo-turn-id="review-diff"]');
  await fullReviewRow.waitFor({timeout:10000});
  await findInput.press("Escape");
  const reviewDisclosure=fullReviewRow.locator(".codex-agent-activity__toggle");
  if(await reviewDisclosure.count()===1&&
    await reviewDisclosure.getAttribute("aria-expanded")==="false")
    await reviewDisclosure.click();
  const reviewGroup=fullReviewRow.locator(".codex-activity-group-row__toggle");
  if(await reviewGroup.count()===1&&
    await reviewGroup.getAttribute("aria-expanded")==="false")
    await reviewGroup.click();
  const realDiff=fullReviewRow.locator('[data-source-inline-file-diff-engine="pierre"]');
  await realDiff.waitFor({timeout:15000});
  await page.waitForFunction(()=>{
    const engine=document.querySelector('[data-demo-turn-id="review-diff"] [data-source-inline-file-diff-engine="pierre"]');
    return engine!=null&&Array.from(engine.querySelectorAll("*"))
      .some(node=>node.shadowRoot?.querySelector("[data-diff]")!=null);
  },null,{timeout:15000});
  assert.equal(await fullReviewRow.getByRole("button",{name:"Edit"}).isDisabled(),true);
  assert.equal(await fullReviewRow.getByRole("button",{name:"Accept"}).isDisabled(),true);
  await fullReviewRow.getByRole("button",{name:"Enable word wrap"}).click();
  assert.equal(await fullReviewRow.getByRole("button",{name:"Disable word wrap"}).count(),1);

  // Click actual application menu items in the main process; zoom updates
  // this *real* WebContents, not a fake React numeric model.
  const zooms=await app.evaluate(({Menu,BrowserWindow})=>{
    const win=BrowserWindow.getAllWindows()[0],menu=Menu.getApplicationMenu();
    const before=win.webContents.getZoomLevel();
    menu.getMenuItemById("zoomIn").click();
    const zoomed=win.webContents.getZoomLevel();
    menu.getMenuItemById("actualSize").click();
    return {before,zoomed,reset:win.webContents.getZoomLevel()};
  });
  assert.ok(zooms.zoomed>zooms.before);
  assert.equal(zooms.reset,0);
  // Original Wt controller holds a viewport distance while the virtualizer
  // changes content. Exercise the SAME native menu → isolated preload →
  // React switchConversation and existing BrowserScrollController after
  // inserting 45 real mounted source entries, not a scroll model fixture.
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByRole("button",{name:"添加 45 条历史"}).click();
  const viewport=page.getByTestId("transcript-scroll");
  await page.waitForFunction(()=>{
    const el=document.querySelector('[data-testid="transcript-scroll"]');
    return el!=null&&el.scrollHeight-el.clientHeight>1200;
  });
  const restoredDistance=await viewport.evaluate(el=>{
    const max=el.scrollHeight-el.clientHeight;
    el.scrollTop=Math.round(max*0.42);
    el.dispatchEvent(new Event("scroll",{bubbles:true}));
    return Math.max(0,max-el.scrollTop);
  });
  assert.ok(restoredDistance>300);
  await app.evaluate(({Menu})=>Menu.getApplicationMenu().getMenuItemById("previousThread").click());
  await page.waitForFunction(()=>document.querySelector(".demo-header-location strong")
    ?.textContent?.includes("恢复 Codex 会话界面")===true);
  await app.evaluate(({Menu})=>Menu.getApplicationMenu().getMenuItemById("nextThread").click());
  await page.waitForFunction(()=>document.querySelector(".demo-header-location strong")
    ?.textContent?.includes("工具调用与审批交互")===true);
  await page.waitForFunction(expected=>{
    const el=document.querySelector('[data-testid="transcript-scroll"]');
    if(el==null)return false;
    const actual=Math.max(0,el.scrollHeight-el.clientHeight-el.scrollTop);
    return Math.abs(actual-expected)<170;
  },restoredDistance,{timeout:12000});
  // Zoom testing happens after the real source activity DOM interaction.
  // Linux/Xvfb's offscreen compositor can keep an in-progress zoom
  // relayout unstable for Playwright pointer actionability checks.
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({path:screenshot,fullPage:false});
 }finally{await app.close();}
});

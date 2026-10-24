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
  await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
  await page.screenshot({path:screenshot,fullPage:false});
 }finally{await app.close();}
});

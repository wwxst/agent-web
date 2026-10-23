"use strict";

/**
 * Isolated, front-end-only host. This is NOT the original Codex main process
 * or preload, and has NO Agent backend, filesystem IPC or permission bridge.
 */
const { app, BrowserWindow, protocol, net } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const {
  APP_SCHEME, APP_ORIGIN, resolveRendererTarget, resolveBundledResource,
} = require("./renderer-target.cjs");

protocol.registerSchemesAsPrivileged([{
  scheme:APP_SCHEME,
  privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true},
}]);

const root = path.resolve(__dirname,"..");
const target = resolveRendererTarget({
  packageRoot:root,
  devServerUrl:process.env.AGENT_WEB_DEV_SERVER_URL,
});
const smoke = process.argv.includes("--smoke-test");
const exitWithFailure = (error) => {
  process.stderr.write(`Desktop front-end startup failed: ${String(error)}\n`);
  app.exit(1);
};

function preventExternalNavigation(win) {
  win.webContents.setWindowOpenHandler(() => ({ action:"deny" }));
  win.webContents.on("will-navigate", (event,url) => {
    try {
      const actual = new URL(url);
      if (actual.origin === target.allowedOrigin) return;
    } catch {}
    event.preventDefault();
  });
  // Opening arbitrary browser/app windows belongs to a future verified host.
}

async function verifySmoke(win) {
  for (let attempt=0; attempt<60; attempt++) {
    if (win.isDestroyed()) throw new Error("Window closed before renderer was ready");
    const ready=await win.webContents.executeJavaScript(`(() => {
      const shell=document.querySelector('[data-codex-shell-preview="light"]');
      const composer=document.querySelector('[data-thread-scroll-footer="true"]');
      const viewport=document.querySelector('[data-thread-scroll-viewport]');
      const fakeMenu=document.querySelector('.demo-window-menu');
      return Boolean(shell && composer && viewport && fakeMenu &&
        getComputedStyle(fakeMenu).display === 'none');
    })()`,true);
    if (ready) {
      const output=process.env.AGENT_WEB_SMOKE_SCREENSHOT;
      if (output) {
        fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});
        fs.writeFileSync(path.resolve(output),await win.webContents.capturePage().then(image=>image.toPNG()));
      }
      process.stdout.write("ELECTRON_FRONTEND_SMOKE_OK\n");
      app.exit(0);
      return;
    }
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw new Error("React transcript/Composer did not mount in the desktop window");
}

async function bootstrap() {
  if (target.kind==="bundled") {
    if (!fs.existsSync(path.join(target.distRoot,"index.html"))) {
      throw new Error("Missing demo-dist/index.html; run npm run demo:build first");
    }
    protocol.handle(APP_SCHEME,(request) => {
      let file;
      try { file=resolveBundledResource(target.distRoot,request.url); }
      catch { return new Response("Invalid renderer path",{status:403}); }
      if (!fs.existsSync(file) || !fs.statSync(file).isFile())
        return new Response("Not found",{status:404});
      return net.fetch(pathToFileURL(file).href);
    });
  }

  const win=new BrowserWindow({
    width:1352,height:760,minWidth:850,minHeight:520,
    show:!smoke,
    backgroundColor:"#ffffff",
    title:"Agent Web · Codex front-end reconstruction",
    autoHideMenuBar:true,
    webPreferences:{
      contextIsolation:true,
      sandbox:true,
      nodeIntegration:false,
      webSecurity:true,
      devTools:target.kind==="development",
    },
  });
  preventExternalNavigation(win);
  win.webContents.on("will-attach-webview",(event)=>event.preventDefault());
  win.webContents.session.on("will-download",event=>event.preventDefault());
  win.webContents.on("did-fail-load",(_event,code,description)=>{
    if (code!==-3 && smoke) exitWithFailure(`Renderer load ${code}: ${description}`);
  });
  await win.loadURL(target.url);
  if (smoke) await verifySmoke(win);
}

app.whenReady().then(bootstrap).catch(exitWithFailure);
app.on("window-all-closed",()=>app.quit());

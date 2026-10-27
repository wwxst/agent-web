import test from "node:test";
import assert from "node:assert/strict";
import {resolve,join} from "node:path";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {_electron as electron} from "playwright";
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const executablePath=resolve(root,"node_modules","electron","dist",
 process.platform==="win32"?"electron.exe":
 process.platform==="darwin"?"Electron.app/Contents/MacOS/Electron":"electron");

test("real isolated preload has a bounded HTTPS opener, cannot open unsafe schemes",{
 timeout:90000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-url-action-ipc-"));
 const app=await electron.launch({
  executablePath,
  args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,env:{...process.env,AGENT_WEB_DEV_URL:"",
    AGENT_WEB_USER_DATA_DIR:profile,ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
  timeout:40000,
 });
 try{
  const page=await app.firstWindow();
  await page.locator('[aria-label="演示会话导航"]').waitFor({timeout:20000});
  const outcome=await page.evaluate(async()=>{
   const host=window.agentWebDesktopHost;
   const attempt=async value=>{
     try{await host.openExternalUrl(value);return "UNEXPECTED_SUCCESS";}
     catch(error){return String(error);}
   };
   return {
     bridge:typeof host.openExternalUrl,
     noNode:typeof window.require,
     file:await attempt("file:///c:/users/private"),
     js:await attempt("javascript:alert(1)"),
     http:await attempt("http://example.org"),
     credentials:await attempt("https://user:pass@example.org"),
     control:await attempt("https://example.org/\nunsafe"),
   };
  });
  assert.equal(outcome.bridge,"function");
  assert.equal(outcome.noNode,"undefined");
  for(const name of ["file","js","http","credentials","control"])
    assert.match(outcome[name],/EXTERNAL_URL_INVALID/,name);
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-url-action-request").click();
  const card=page.locator('[data-demo-turn-id^="url-action-"]').last()
    .locator("[data-source-url-action-request-id]");
  await card.waitFor({timeout:12000});
  assert.equal(await card.getByRole("button",{name:"Open link"}).isEnabled(),true);
  assert.equal(await card.getByRole("button",{name:"Continue"}).count(),0);
  assert.equal(await card.getAttribute("data-source-url-action-phase"),"idle");
  // Never invoke a REAL external browser in a headless CI test.
  assert.equal(await card.getByText(/Response sent to host/).count(),0);
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});

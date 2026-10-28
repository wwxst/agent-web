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

test("isolated Electron only exposes user-granted read-only workspace preview, not generic filesystem operations",{
 timeout:100000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-workspace-native-"));
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
  const requestPath=resolve(root,"demo","App.tsx");
  const bridge=await page.evaluate(async path=>{
   const host=window.agentWebDesktopHost;
   const attempt=async request=>{
    try{await host.readWorkspaceTextFile(request);return "UNEXPECTED_SUCCESS";}
    catch(error){return String(error);}
   };
   return {
    choose:typeof host.selectWorkspaceDirectory,
    read:typeof host.readWorkspaceTextFile,
    revoke:typeof host.revokeWorkspaceDirectory,
    noNode:typeof window.require,
    noRawIpc:typeof host.invoke,
    withoutGrant:await attempt({path}),
    invalid:await attempt({path:"../escape.ts"}),
    badLine:await attempt({path,line:-1}),
    arbitrary:await attempt({path,unknown:true}),
   };
  },requestPath);
  assert.equal(bridge.choose,"function");
  assert.equal(bridge.read,"function");
  assert.equal(bridge.revoke,"function");
  assert.equal(bridge.noNode,"undefined");
  assert.equal(bridge.noRawIpc,"undefined");
  assert.match(bridge.withoutGrant,/WORKSPACE_NOT_GRANTED/);
  for(const kind of ["invalid","badLine","arbitrary"])
   assert.match(bridge[kind],/WORKSPACE_INVALID_FILE_REQUEST/);

  // Native positive grant is tested in the real-files security host suite.
  // Do not automate a system folder dialog in headless CI: replacing Electron
  // dialog methods across the main-process execution context can deadlock.
  // Real native IPC here must remain fail-closed before user consent.
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-user-file-attachments").click();
  const files=page.locator('[data-demo-turn-id^="user-file-attachments-"]').last()
    .locator('[data-source-user-file-attachments]');
  await files.waitFor({timeout:12000});
  assert.equal(await files.getByRole("button",{name:/App\.tsx/}).isEnabled(),true);
  assert.equal(await files.getByRole("button",{name:"reference-notes.pdf"}).isDisabled(),true);
  assert.equal(await files.getByRole("button",{name:"Detached attachment"}).isDisabled(),true);
  assert.equal(await page.getByRole("complementary",{name:"Local file preview"}).count(),0);
  // A CI test may NEVER automate approval of a native folder chooser.
 }finally{await app.close();await rm(profile,{recursive:true,force:true});}
});

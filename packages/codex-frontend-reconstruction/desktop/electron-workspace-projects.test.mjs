import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,mkdir,writeFile,rm,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve,basename} from "node:path";
import {fileURLToPath} from "node:url";
import {_electron as electron} from "playwright";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const executablePath=resolve(root,"node_modules","electron","dist",
  process.platform==="win32"?"electron.exe":
    process.platform==="darwin"?"Electron.app/Contents/MacOS/Electron":"electron");

test("native workspace projects persist across Electron restarts without persisting an active filesystem grant",{
 timeout:90000,
},async()=>{
 const profile=await mkdtemp(join(tmpdir(),"agent-web-project-profile-"));
 const workspace=await mkdtemp(join(tmpdir(),"agent-web-project-root-"));
 const workspaceName=basename(workspace);
 const sourceFile=join(workspace,"README.md");
 await mkdir(join(workspace,"src"));
 await writeFile(sourceFile,"a real local project root");
 const launch=()=>electron.launch({
  executablePath,
  args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
  cwd:root,
  env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_DESKTOP_FIXTURE:"",
    AGENT_WEB_USER_DATA_DIR:profile,ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
  timeout:40000,
 });
 try{
  const first=await launch();
  try{
   const page=await first.firstWindow();
   await page.locator('[data-app-shell-frame="true"]').waitFor({timeout:20000});
   await page.locator(".demo-sidebar").waitFor({timeout:15000});
   await first.evaluate(({dialog},directory)=>{
    dialog.showOpenDialog=async()=>({canceled:false,filePaths:[directory]});
   },workspace);
   await page.getByRole("button",{name:"Add new project"}).click();
   const row=page.locator('[data-app-action-sidebar-project-row]');
   await row.waitFor({state:"visible",timeout:15000});
   assert.equal(await row.getAttribute("data-app-action-sidebar-project-label"),workspaceName);
   assert.equal(await row.locator("[data-app-action-sidebar-select-project]")
     .getAttribute("aria-current"),"page");
   const summaries=await page.evaluate(()=>window.agentWebDesktopHost.listWorkspaceProjects());
   assert.equal(summaries.length,1);
   assert.equal(summaries[0].name,workspaceName);
   assert.equal(Object.hasOwn(summaries[0],"path"),false);
   assert.equal(JSON.stringify(summaries).includes(workspace),false);
   assert.equal((await stat(sourceFile)).isFile(),true);
  }finally{await first.close();}

  const second=await launch();
  try{
   const page=await second.firstWindow();
   await page.locator('[data-app-shell-frame="true"]').waitFor({timeout:20000});
   const row=page.locator('[data-app-action-sidebar-project-row]');
   await row.waitFor({state:"visible",timeout:15000});
   assert.equal(await row.getAttribute("data-app-action-sidebar-project-label"),workspaceName);
   // A persisted project is visible after restart, but its old read grant is
   // not restored until the user explicitly selects that project again.
   assert.equal(await row.locator("[data-app-action-sidebar-select-project]")
     .getAttribute("aria-current"),null);
   await row.getByRole("button",{name:workspaceName}).click();
   await row.locator('[data-app-action-sidebar-select-project][aria-current="page"]')
     .waitFor({state:"visible",timeout:10000});
   const active=await page.evaluate(()=>window.agentWebDesktopHost.listWorkspaceProjects());
   assert.equal(active.length,1);
   assert.equal(active[0].name,workspaceName);
   await row.getByRole("button",{name:`Remove ${workspaceName} from projects`}).click();
   await page.getByText("No projects",{exact:true}).waitFor({state:"visible",timeout:10000});
   assert.deepEqual(await page.evaluate(()=>window.agentWebDesktopHost.listWorkspaceProjects()),[]);
   // Removing a project from the sidebar never deletes user files.
   assert.equal((await stat(sourceFile)).isFile(),true);
  }finally{await second.close();}
 }finally{
  await rm(profile,{recursive:true,force:true});
  await rm(workspace,{recursive:true,force:true});
 }
});

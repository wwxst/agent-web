import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {_electron as electron} from "playwright";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const executablePath=resolve(root,"node_modules","electron","dist",
  process.platform==="win32"?"electron.exe":
    process.platform==="darwin"?"Electron.app/Contents/MacOS/Electron":"electron");

test("native Home Composer sends a real child-process turn through bounded Electron IPC",{
  timeout:90000,
},async()=>{
  const profile=await mkdtemp(join(tmpdir(),"agent-web-agent-cil-profile-"));
  const workspace=await mkdtemp(join(tmpdir(),"agent-web-agent-cil-workspace-"));
  const entry=join(profile,"agent-cil-test-entry.cjs");
  // This is a real child process for transport verification, NOT a model
  // reply fixture in a production UI or a credentialed provider test.
  await writeFile(entry,[
    "let input='';",
    "process.stdin.setEncoding('utf8');",
    "process.stdin.on('data',chunk=>input+=chunk);",
    "process.stdin.on('end',()=>{",
    "  if(input==='!hold'){setInterval(()=>{},1000);return;}",
    "  process.stdout.write('PIPE_REPLY:'+input);",
    "});",
  ].join("\n"));
  let app;
  try{
    app=await electron.launch({
      executablePath,
      args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
      cwd:root,
      env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_DESKTOP_FIXTURE:"",
        AGENT_WEB_USER_DATA_DIR:profile,AGENT_CIL_ENTRY:entry,
        ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
      timeout:40000,
    });
    const page=await app.firstWindow();
    await page.locator('[data-app-shell-frame="true"]').waitFor({timeout:20000});
    await page.getByRole("textbox",{name:"Do anything"}).waitFor({timeout:15000});
    const host=await page.evaluate(()=>window.agentWebDesktopHost.getHostInfo());
    assert.equal(host.backendConnected,false);
    assert.equal(host.agentCilAvailable,true);
    const unselected=await page.evaluate(()=>window.agentWebDesktopHost.startAgentCilTurn({
      requestId:crypto.randomUUID(),prompt:"must be rejected without a native project",
    }));
    assert.deepEqual(unselected,{
      accepted:false,reason:"WORKSPACE_NOT_SELECTED",
    });

    await app.evaluate(({dialog},directory)=>{
      dialog.showOpenDialog=async()=>({canceled:false,filePaths:[directory]});
    },workspace);
    await page.locator('[data-app-action-sidebar-section-key="projects"] .demo-sidebar-section__header').hover();
    await page.getByRole("button",{name:"Add new project"}).click();
    const project=page.locator('[data-app-action-sidebar-project-row]');
    await project.waitFor({state:"visible",timeout:15000});
    await project.locator('[data-app-action-sidebar-select-project][aria-current="page"]')
      .waitFor({state:"visible",timeout:10000});

    await page.getByRole("textbox",{name:"Do anything"}).fill("ping-model");
    const send=page.getByTestId("send-button");
    await page.waitForFunction(()=>!document.querySelector('[data-testid="send-button"]')
      ?.hasAttribute("disabled"),null,{timeout:10000});
    await send.click();
    await page.getByTestId("agent-cil-run-status").waitFor({state:"visible",timeout:15000});
    await page.getByText("PIPE_REPLY:ping-model",{exact:false})
      .waitFor({state:"visible",timeout:15000});
    await page.getByText(/单轮请求已完成/).waitFor({state:"visible",timeout:15000});
    assert.equal(await page.getByText(/模拟回复/).count(),0);
    assert.equal(await page.getByRole("button",{name:"单轮任务已结束"}).isDisabled(),true);

    // The Home/New chat route creates a fresh one-shot turn, without
    // carrying invented agent-cil multi-turn context into the next run.
    await page.getByTestId("sidebar-new-chat").click();
    await page.getByRole("textbox",{name:"Do anything"}).fill("!hold");
    await page.getByTestId("send-button").click();
    const stop=page.getByRole("button",{name:"停止 Agent CIL"});
    await stop.waitFor({state:"visible",timeout:15000});
    await stop.click();
    await page.getByText("CLI 执行已中断",{exact:false})
      .waitFor({state:"visible",timeout:15000});
  }finally{
    if(app)await app.close();
    await rm(profile,{recursive:true,force:true});
    await rm(workspace,{recursive:true,force:true});
  }
});

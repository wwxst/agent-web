import test from "node:test";
import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {_electron as electron} from "playwright";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const executablePath=resolve(root,"node_modules","electron","dist",
  process.platform==="win32"?"electron.exe":
    process.platform==="darwin"?"Electron.app/Contents/MacOS/Electron":"electron");

test("normal packaged Electron launch opens the empty Codex home, never a synthetic thread",{
  timeout:90000,
},async()=>{
  // Override the smoke-suite fixture opt-in for this real production-startup
  // assertion. All other native smoke tests keep their original fixture route.
  const app=await electron.launch({
    executablePath,
    args:[".",...(process.platform==="linux"&&process.env.CI?["--no-sandbox"]:[])],
    cwd:root,
    env:{...process.env,AGENT_WEB_DEV_URL:"",AGENT_WEB_DESKTOP_FIXTURE:"",
      ELECTRON_DISABLE_SECURITY_WARNINGS:"true"},
    timeout:40000,
  });
  try{
    const page=await app.firstWindow();
    await page.locator('[data-app-shell-frame="true"]').waitFor({timeout:20000});
    await page.locator('.demo-composer[data-composer-placement="home"]')
      .waitFor({timeout:15000});
    assert.equal(await page.locator(".demo-header-location strong").textContent(),"New chat");
    assert.equal(await page.getByRole("heading",{name:"What should we build?"}).count(),1);
    assert.equal(await page.getByText("No projects",{exact:true}).count(),1);
    assert.equal(await page.getByText("No chats",{exact:true}).count(),1);
    assert.equal(await page.locator(".demo-row").count(),0);
    assert.equal(await page.locator(".demo-chat-link").count(),0);
    assert.equal(await page.getByText("恢复 Codex 会话界面").count(),0);
    assert.equal(await page.getByTestId("composer-model-control").isDisabled(),true);
    assert.equal(await page.getByTestId("composer-permission-control").isDisabled(),true);
    const host=await page.evaluate(async()=>window.agentWebDesktopHost?.getHostInfo());
    assert.equal(host?.backendConnected,false);
    await mkdir(resolve(root,"desktop/test-results"),{recursive:true});
    await page.screenshot({
      path:resolve(root,"desktop/test-results/electron-default-new-chat.png"),
      animations:"disabled",fullPage:false,
    });

    // A normal Home action must not expose fixtures either.
    await page.getByRole("button",{name:"Home"}).click();
    assert.equal(await page.locator(".demo-header-location strong").textContent(),"New chat");
    assert.equal(await page.locator(".demo-row").count(),0);
    // The actual native View menu shortcut cannot jump to a hidden
    // synthetic review fixture in the normal application.
    await app.evaluate(({Menu})=>{
      Menu.getApplicationMenu().getMenuItemById("previousThread").click();
    });
    assert.equal(await page.locator(".demo-header-location strong").textContent(),"New chat");
    assert.equal(await page.locator(".demo-row").count(),0);
    const editor=page.getByRole("textbox",{name:"Do anything"});
    await editor.fill("draft stays here until a real Agent host exists");
    assert.equal(await page.getByTestId("send-button").isDisabled(),true);
    await editor.press("Enter");
    assert.match(await editor.textContent(),/draft stays here/);
    assert.equal(await page.locator(".demo-row").count(),0);
  }finally{
    await app.close();
  }
});

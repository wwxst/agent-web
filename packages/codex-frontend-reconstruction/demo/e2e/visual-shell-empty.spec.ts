import {test,expect} from "@playwright/test";

test("shell-empty visual route mounts the real desktop shell and idle Composer without demo rows",async({page},testInfo)=>{
  await page.addInitScript(()=>{
    // A visual capture must not hydrate from or overwrite the user's saved pins.
    localStorage.setItem("pinned-content-tabs-v1","visual-baseline-preserve-me");
  });
  await page.goto("/?visualScenario=shell-empty");
  await page.waitForFunction(()=>document.fonts.status==="loaded");
  await page.evaluate(()=>new Promise<void>(resolve=>
    requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())),
  ));

  await expect(page.locator('[data-codex-shell-preview="light"]')).toBeVisible();
  await expect(page.locator(".demo-header-location strong")).toHaveText("New chat");
  await expect(page.locator(".demo-row")).toHaveCount(0);
  await expect(page.locator(".demo-composer")).toBeVisible();
  await expect(page.getByRole("heading",{name:"What should we build?"})).toBeVisible();
  await expect(page.locator(".demo-home-hero__icon")).toHaveAttribute("width","56");
  await expect(page.locator(".demo-composer")).toHaveAttribute("data-composer-placement","home");
  await expect(page.locator('.demo-composer [contenteditable="true"]')).toBeVisible();
  await expect(page.getByRole("textbox",{name:"Do anything"})).toBeVisible();
  await expect(page.locator(".demo-header-folder")).toHaveCount(0);
  await expect(page.locator(".demo-project-heading")).toHaveCount(0);
  await expect(page.locator(".demo-chat-link")).toHaveCount(0);
  await expect(page.getByText("No projects",{exact:true})).toBeVisible();
  await expect(page.getByText("No chats",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"New chat"})).toHaveAttribute("aria-current","page");
  const modelControl=page.getByTestId("composer-model-control");
  const permissionControl=page.getByTestId("composer-permission-control");
  await expect(modelControl).toBeDisabled();
  await expect(modelControl).toContainText("模型未连接");
  await expect(permissionControl).toBeDisabled();
  await expect(permissionControl).toContainText("权限未连接");
  await expect(page.getByText("Demo Agent")).toHaveCount(0);
  await expect(page.getByText(/Full access.*mock/)).toHaveCount(0);
  await expect(page.getByTestId("demo-tools")).toHaveCount(0);

  const capture=await page.evaluate(()=>({
    viewport:{width:innerWidth,height:innerHeight,devicePixelRatio},
    rail:document.querySelector("[data-app-navigation-rail]")?.getBoundingClientRect().width??null,
    sidebar:document.querySelector(".demo-sidebar")?.getBoundingClientRect().width??null,
    header:document.querySelector(".demo-header")?.getBoundingClientRect().height??null,
    composer:document.querySelector(".demo-composer")?.getBoundingClientRect().toJSON()??null,
    hero:document.querySelector(".demo-home-hero")?.getBoundingClientRect().toJSON()??null,
    heroHeading:document.querySelector(".demo-home-hero__heading")?.getBoundingClientRect().toJSON()??null,
    composerPlacement:document.querySelector(".demo-composer")?.getAttribute("data-composer-placement"),
    rowCount:document.querySelectorAll(".demo-row").length,
    savedPin:localStorage.getItem("pinned-content-tabs-v1"),
  }));
  expect(capture.viewport).toEqual({width:1352,height:760,devicePixelRatio:1});
  expect(capture.rail).toBeGreaterThan(0);
  expect(capture.sidebar).toBeGreaterThan(200);
  expect(capture.header).toBeGreaterThan(0);
  expect(capture.composerPlacement).toBe("home");
  expect(capture.composer).not.toBeNull();
  expect(capture.hero).not.toBeNull();
  expect(capture.heroHeading).not.toBeNull();
  expect((capture.composer?.top??0)-(capture.heroHeading?.bottom??0)).toBeGreaterThan(15);
  expect((capture.composer?.top??0)-(capture.heroHeading?.bottom??0)).toBeLessThan(30);
  expect(Math.abs((capture.composer?.top??0)-(36+760*0.42))).toBeLessThan(4);
  expect(capture.rowCount).toBe(0);
  expect(capture.savedPin).toBe("visual-baseline-preserve-me");
  await page.screenshot({path:testInfo.outputPath("shell-empty-visual-baseline.png"),fullPage:false});
});


test("New chat opens the empty Codex home while the Home rail retains its existing route",async({page})=>{
  await page.goto("/");
  await expect(page.locator(".demo-header-location strong")).toHaveText("恢复 Codex 会话界面");
  await expect(page.locator(".demo-row").first()).toBeVisible();
  await expect(page.locator(".demo-home-hero")).toHaveCount(0);
  await page.getByRole("button",{name:"New chat"}).click();
  await expect(page.locator(".demo-header-location strong")).toHaveText("New chat");
  await expect(page.locator(".demo-row")).toHaveCount(0);
  await expect(page.locator(".demo-composer")).toHaveAttribute("data-composer-placement","home");
  await expect(page.getByRole("heading",{name:"What should we build?"})).toBeVisible();
  await expect(page.getByRole("textbox",{name:"Do anything"})).toBeVisible();
  await page.getByRole("button",{name:"Home"}).click();
  await expect(page.locator(".demo-header-location strong")).toHaveText("恢复 Codex 会话界面");
  await expect(page.locator(".demo-row").first()).toBeVisible();
  await expect(page.locator(".demo-composer")).toHaveAttribute("data-composer-placement","thread");
});


test("empty Codex home preserves drafts and never silently sends to the demo responder",async({page})=>{
  await page.goto("/?visualScenario=shell-empty");
  const editor=page.getByRole("textbox",{name:"Do anything"});
  await editor.fill("实际任务不能变成模拟回复");
  await expect(page.getByTestId("send-button")).toBeDisabled();
  await expect(page.getByTestId("send-button")).toHaveAttribute("title","Agent 未连接，暂不可发送");
  await editor.press("Enter");
  await expect(editor).toContainText("实际任务不能变成模拟回复");
  await expect(page.locator(".demo-row")).toHaveCount(0);
  await expect(page.getByText("已收到你的消息",{exact:false})).toHaveCount(0);
  await expect(page.getByRole("heading",{name:"What should we build?"})).toBeVisible();
});


test("real read-only workspace grant updates original home project Hero without inventing an Agent thread",async({page})=>{
  await page.addInitScript(()=>{
    const state={selects:0,revokes:0,delayed:false,resolve:null as null|((v:{selected:boolean;name?:string})=>void)};
    Object.defineProperty(window,"__homeWorkspaceTest",{configurable:true,value:state});
    Object.defineProperty(window,"agentWebDesktopHost",{configurable:true,value:{
      getHostInfo:async()=>({windowType:"electron",platform:"test",theme:"light",backendConnected:false}),
      getComposerDrafts:async()=>({}),setComposerDraft:async()=>true,
      subscribeHostEvents:()=>()=>{},subscribeUiCommands:()=>()=>{},
      selectWorkspaceDirectory:()=>{
        state.selects++;
        if(state.delayed)return new Promise(resolve=>{state.resolve=resolve;});
        return Promise.resolve({selected:true,name:"codex-frontend-reconstruction"});
      },
      revokeWorkspaceDirectory:async()=>{state.revokes++;return true;},
    }});
  });
  await page.goto("/?visualScenario=shell-empty");
  const choose=page.getByRole("button",{name:"Open local folder"});
  await expect(choose).toBeEnabled();
  await expect(page.getByText("No projects",{exact:true})).toBeVisible();
  await choose.click();
  await expect(page.getByRole("heading",{name:/What should we work on in codex-frontend-reconstruction/}))
    .toBeVisible();
  await expect(page.locator("[data-local-workspace-project]")).toContainText("Read-only");
  await expect(page.getByText("No projects",{exact:true})).toHaveCount(0);
  await expect(page.locator(".demo-row")).toHaveCount(0);
  await expect(page.getByTestId("send-button")).toBeDisabled();
  await page.getByRole("button",{name:"Clear local folder"}).click();
  await expect(page.getByRole("heading",{name:"What should we build?"})).toBeVisible();
  await expect(page.getByText("No projects",{exact:true})).toBeVisible();
  const result=await page.evaluate(()=>
    (window as Window&{__homeWorkspaceTest?:{selects:number;revokes:number}}).__homeWorkspaceTest);
  expect(result?.selects).toBe(1);
  expect(result?.revokes).toBeGreaterThanOrEqual(1);
});

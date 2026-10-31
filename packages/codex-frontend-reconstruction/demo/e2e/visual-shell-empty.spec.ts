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
  await expect(page.locator(".demo-header-location")).toHaveCount(0);
  await expect(page.getByTestId("home-new-tab-unavailable")).toBeDisabled();
  await expect(page.locator(".demo-header")).toHaveCSS("border-bottom-width","0px");
  await expect(page.getByTestId("home-composer-context")).toBeVisible();
  await expect(page.getByRole("button",{name:"选择项目"})).toBeVisible();
  await expect(page.getByTestId("home-computer-context")).toHaveText("此计算机");
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
    windowMenu:document.querySelector(".demo-window-menu")?.getBoundingClientRect().height??null,
    rail:document.querySelector("[data-app-navigation-rail]")?.getBoundingClientRect().width??null,
    sidebar:document.querySelector(".demo-sidebar")?.getBoundingClientRect().width??null,
    mainLeft:document.querySelector(".demo-main")?.getBoundingClientRect().left??null,
    sidebarScroll:document.querySelector("[data-sidebar-navigation-scroll]")?.getBoundingClientRect().height??null,
    header:document.querySelector(".demo-header")?.getBoundingClientRect().height??null,
    headerBorderBottom:getComputedStyle(document.querySelector(".demo-header")!).borderBottomWidth,
    composer:document.querySelector(".demo-composer")?.getBoundingClientRect().toJSON()??null,
    composerContext:document.querySelector(".demo-home-composer-context")?.getBoundingClientRect().toJSON()??null,
    hero:document.querySelector(".demo-home-hero")?.getBoundingClientRect().toJSON()??null,
    heroIcon:document.querySelector(".demo-home-hero__icon")?.getBoundingClientRect().toJSON()??null,
    heroHeading:document.querySelector(".demo-home-hero__heading")?.getBoundingClientRect().toJSON()??null,
    composerPlacement:document.querySelector(".demo-composer")?.getAttribute("data-composer-placement"),
    rowCount:document.querySelectorAll(".demo-row").length,
    savedPin:localStorage.getItem("pinned-content-tabs-v1"),
  }));
  expect(capture.viewport).toEqual({width:1352,height:760,devicePixelRatio:1});
  // Match the captured Codex A-shell-empty state: 240px saved sidebar,
  // 46px top action row, bottom Composer + context strip, and Hero placement.
  expect(capture.windowMenu).toBe(36);
  expect(capture.rail).toBe(52);
  expect(capture.sidebar).toBe(240);
  expect(capture.mainLeft).toBe(292);
  expect(capture.header).toBe(46);
  expect(capture.headerBorderBottom).toBe("0px");
  expect(capture.sidebarScroll).toBeGreaterThan(100);
  expect(capture.composer?.width).toBe(738);
  expect(capture.composer).not.toBeNull();
  expect(capture.composerContext?.height).toBe(38);
  expect(capture.composerContext?.bottom).toBe(capture.composer?.top);
  expect(760-(capture.composer?.bottom??0)).toBe(19);
  expect(capture.hero).not.toBeNull();
  expect(capture.heroIcon).not.toBeNull();
  expect(capture.heroHeading).not.toBeNull();
  expect((capture.heroIcon?.top??0)+(capture.heroIcon?.height??0)/2).toBeCloseTo(327,0);
  expect(capture.heroHeading?.top).toBeCloseTo(379,0);
  expect(capture.composerPlacement).toBe("home");
  expect(capture.rowCount).toBe(0);
  expect(capture.savedPin).toBe("visual-baseline-preserve-me");
  await page.screenshot({path:testInfo.outputPath("shell-empty-visual-baseline.png"),fullPage:false});
});


test("Codex sidebar sections use source disclosure rows and hover-only project actions",async({page})=>{
  await page.goto("/?visualScenario=shell-empty");
  const sidebar=page.getByRole("complementary",{name:"Conversation sidebar"});
  await expect(sidebar).toBeVisible();
  await expect(sidebar.locator("[data-app-action-sidebar-scroll]")).toBeVisible();
  const search=page.getByTestId("sidebar-search-unavailable");
  await expect(search).toBeDisabled();
  await expect(search).toHaveAttribute("aria-label","Search");

  const projects=page.locator('[data-app-action-sidebar-section-heading="Projects"]');
  const projectsToggle=page.getByTestId("sidebar-section-projects-toggle");
  await expect(projects).toHaveAttribute("data-app-action-sidebar-section-collapsed","false");
  await expect(projectsToggle).toHaveAttribute("aria-expanded","true");
  const projectActions=projects.locator(".demo-sidebar-section__actions");
  await expect(projectActions).toHaveCSS("opacity","0");
  await projects.hover();
  await expect(projectActions).toHaveCSS("opacity","1");
  await page.mouse.move(0,0);
  await expect(projectActions).toHaveCSS("opacity","0");

  const noProjects=page.getByText("No projects",{exact:true});
  await expect(noProjects).toHaveCSS("font-size","14px");
  await expect(noProjects).toHaveCSS("opacity","0.5");
  await expect(noProjects).toHaveCSS("padding-top","8px");
  await projectsToggle.click();
  await expect(projects).toHaveAttribute("data-app-action-sidebar-section-collapsed","true");
  await expect(projectsToggle).toHaveAttribute("aria-expanded","false");
  await expect(noProjects).toBeHidden();
  await projectsToggle.click();
  await expect(noProjects).toBeVisible();

  const recents=page.locator('[data-app-action-sidebar-section-heading="Recents"]');
  const recentsToggle=page.getByTestId("sidebar-section-recents-toggle");
  const noChats=page.getByText("No chats",{exact:true});
  await expect(recents).toHaveAttribute("data-app-action-sidebar-section-collapsed","false");
  await recentsToggle.click();
  await expect(recentsToggle).toHaveAttribute("aria-expanded","false");
  await expect(noChats).toBeHidden();
  await recentsToggle.click();
  await expect(noChats).toBeVisible();
});


test("New chat opens the empty Codex home while the Home rail retains its existing route",async({page})=>{
  await page.goto("/");
  await expect(page.locator(".demo-header-location strong")).toHaveText("恢复 Codex 会话界面");
  await expect(page.locator(".demo-row").first()).toBeVisible();
  await expect(page.locator(".demo-home-hero")).toHaveCount(0);
  await page.getByRole("button",{name:"New chat"}).click();
  await expect(page.locator(".demo-header-location")).toHaveCount(0);
  await expect(page.getByTestId("home-new-tab-unavailable")).toBeDisabled();
  await expect(page.getByTestId("home-composer-context")).toBeVisible();
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

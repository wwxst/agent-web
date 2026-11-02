import {test,expect} from "@playwright/test";

test("shell-empty visual route mounts the real desktop shell, idle Composer and source-reference sidebar fixture",async({page},testInfo)=>{
  await page.addInitScript(()=>{
    // A visual capture must not hydrate from or overwrite the user's saved pins.
    localStorage.setItem("pinned-content-tabs-v1","visual-baseline-preserve-me");
    localStorage.setItem("sidebar-width","420");
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
  await expect(page.getByRole("heading",{name:"我们要构建什么？"})).toBeVisible();
  await expect(page.locator(".demo-home-hero__icon")).toHaveAttribute("width","56");
  await expect(page.locator(".demo-composer")).toHaveAttribute("data-composer-placement","home");
  await expect(page.locator('.demo-composer [contenteditable="true"]')).toBeVisible();
  await expect(page.getByRole("textbox",{name:"随心输入"})).toBeVisible();
  await expect(page.locator(".demo-header-folder")).toHaveCount(0);
  const referenceSidebar=page.locator('[data-sidebar-reference-fixture="true"]');
  await expect(referenceSidebar).toBeVisible();
  await expect(referenceSidebar.locator('[data-visual-reference-only="pinned"]')).toHaveCount(1);
  await expect(referenceSidebar.locator('[data-visual-reference-only="project"]')).toHaveCount(7);
  await expect(referenceSidebar.locator('[data-visual-reference-only="project-thread"]')).toHaveCount(5);
  await expect(referenceSidebar.locator('[data-visual-reference-only="recent"]')).toHaveCount(2);
  for(const project of ["agent","promotion-demo","agent-desktop","atlas","kasi-project","deepseek-harness","ai"])
    await expect(referenceSidebar.getByText(project,{exact:true})).toBeVisible();
  await expect(page.getByTestId("sidebar-notifications-unavailable")).toBeDisabled();
  await expect(page.getByTestId("sidebar-new-chat")).not.toHaveAttribute("aria-current");
  await expect(page.getByText("置顶",{exact:true})).toBeVisible();
  await expect(page.getByText("项目",{exact:true})).toBeVisible();
  await expect(page.getByText("最近",{exact:true})).toBeVisible();
  await expect(page.getByText("No projects",{exact:true})).toHaveCount(0);
  await expect(page.getByText("No chats",{exact:true})).toHaveCount(0);
  const modelControl=page.getByTestId("composer-model-control");
  const permissionControl=page.getByTestId("composer-permission-control");
  await expect(modelControl).toBeDisabled();
  await expect(modelControl).toContainText("模型未连接");
  await expect(permissionControl).toBeDisabled();
  await expect(permissionControl).toContainText("权限未连接");
  await expect(page.getByText("Demo Agent")).toHaveCount(0);
  await expect(page.getByText(/Full access.*mock/)).toHaveCount(0);
  await expect(page.getByTestId("demo-tools")).toHaveCount(0);

  await expect(page.locator(".demo-window-control")).toHaveCount(3);
  await expect(page.locator(".demo-window-buttons")).toHaveAttribute("aria-hidden","true");
  const capture=await page.evaluate(()=>({
    viewport:{width:innerWidth,height:innerHeight,devicePixelRatio},
    captionButtons:Array.from(document.querySelectorAll(".demo-window-control")).map(element=>{
      const rect=element.getBoundingClientRect();
      return {left:rect.left,right:rect.right,top:rect.top,width:rect.width,height:rect.height,
        background:getComputedStyle(element).backgroundColor};
    }),
    windowMenu:document.querySelector(".demo-window-menu")?.getBoundingClientRect().height??null,
    rail:document.querySelector("[data-app-navigation-rail]")?.getBoundingClientRect().width??null,
    sidebar:document.querySelector(".demo-sidebar")?.getBoundingClientRect().width??null,
    mainLeft:document.querySelector(".demo-main")?.getBoundingClientRect().left??null,
    mainSurface:(()=>{
      const node=document.querySelector(".demo-main");
      if(node==null)return null;
      const r=node.getBoundingClientRect(),style=getComputedStyle(node);
      return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,
        radius:style.borderTopLeftRadius,overflow:style.overflow,
        background:style.backgroundColor};
    })(),
    pageSurface:(()=>{
      const node=document.querySelector(".demo-page-surface");
      if(node==null)return null;
      const r=node.getBoundingClientRect(),style=getComputedStyle(node);
      return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,
        radius:style.borderTopLeftRadius,shadow:style.boxShadow,
        pointerEvents:style.pointerEvents};
    })(),
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
    savedSidebarWidth:localStorage.getItem("sidebar-width"),
  }));
  expect(capture.viewport).toEqual({width:1352,height:760,devicePixelRatio:1});
  // Match the captured Codex A-shell-empty state: 240px saved sidebar,
  // 46px top action row, bottom Composer + context strip, and Hero placement.
  // Original TitleBar is 44px; the native Windows caption overlay remains 36px.
  expect(capture.windowMenu).toBe(44);
  expect(capture.captionButtons).toHaveLength(3);
  expect(capture.captionButtons.map(item=>item.width)).toEqual([46,46,46]);
  expect(capture.captionButtons.map(item=>item.height)).toEqual([36,36,36]);
  expect(capture.captionButtons.map(item=>item.top)).toEqual([0,0,0]);
  expect(capture.captionButtons[0]?.left).toBe(1214);
  expect(capture.captionButtons[2]?.right).toBe(1352);
  expect(capture.captionButtons[0]?.background).toBe("rgb(225, 225, 225)");
  expect(capture.rail).toBe(52);
  expect(capture.sidebar).toBe(240);
  expect(capture.mainLeft).toBe(292);
  expect(capture.mainSurface).toEqual({
    left:292,top:44,right:1348,bottom:756,width:1056,
    radius:"12px",overflow:"hidden",background:"rgb(255, 255, 255)",
  });
  expect(capture.pageSurface).not.toBeNull();
  expect(capture.pageSurface).toMatchObject({
    left:52,top:44,right:1348,bottom:756,radius:"12px",
    pointerEvents:"none",
  });
  expect(capture.pageSurface?.shadow).not.toBe("none");
  expect(capture.header).toBe(46);
  expect(capture.headerBorderBottom).toBe("0px");
  expect(capture.sidebarScroll).toBeGreaterThan(100);
  expect(capture.composer?.width).toBe(738);
  expect(capture.composer?.left).toBe(451);
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
  expect(capture.savedSidebarWidth).toBe("420");
  await page.screenshot({path:testInfo.outputPath("shell-empty-visual-baseline.png"),fullPage:false});
});


test("Windows screenshot rail keeps native 44px cadence and anonymous footer",async({page})=>{
  await page.goto("/?visualScenario=shell-empty");
  const rail=page.getByRole("navigation",{name:"App navigation"});
  const footer=rail.locator('[data-visual-reference-only="account-avatar"]');
  await expect(footer).toBeVisible();
  await expect(page.getByTestId("navigation-rail-settings")).toHaveCount(0);
  const geometry=await rail.evaluate(element=>{
    const rect=(selector:string)=>element.querySelector(selector)!.getBoundingClientRect();
    return {
      railTop:element.getBoundingClientRect().top,
      homeTop:rect('[data-sidebar-destination="builtin:home"]').top,
      exploreTop:rect('[data-testid="navigation-rail-explore"]').top,
      dividerTop:rect(".codex-navigation-rail__section-divider").top,
      firstPinnedTop:rect('[data-sidebar-destination="builtin:activity"]').top,
      avatarTop:rect('[data-visual-reference-only="account-avatar"]').top,
      avatarLeft:rect('[data-visual-reference-only="account-avatar"]').left,
      gap:getComputedStyle(element.querySelector(".codex-navigation-rail__destinations")!).rowGap,
    };
  });
  expect(geometry.railTop).toBe(36);
  expect(geometry.homeTop).toBeCloseTo(52,0);
  expect(geometry.exploreTop).toBeCloseTo(272,0);
  expect(geometry.dividerTop).toBeCloseTo(316,0);
  expect(geometry.firstPinnedTop).toBeCloseTo(325,0);
  expect(geometry.avatarTop).toBeCloseTo(722,0);
  expect(geometry.avatarLeft).toBeCloseTo(14,0);
  expect(geometry.gap).toBe("8px");
});

test("Codex sidebar sections use source disclosure rows and hover-only project actions",async({page})=>{
  await page.goto("/?visualScenario=shell-empty");
  const sidebar=page.getByRole("complementary",{name:"演示会话导航"});
  await expect(sidebar).toBeVisible();
  await expect(sidebar).toHaveAttribute("data-sidebar-reference-fixture","true");
  await expect(sidebar.locator("[data-app-action-sidebar-scroll]")).toBeVisible();
  const search=page.getByTestId("sidebar-search-unavailable");
  await expect(search).toBeDisabled();
  await expect(search).toHaveAttribute("aria-label","搜索");

  const projects=page.locator('[data-app-action-sidebar-section-key="projects"]');
  const projectsToggle=page.getByTestId("sidebar-section-projects-toggle");
  await expect(projects).toHaveAttribute("data-app-action-sidebar-section-collapsed","false");
  await expect(projectsToggle).toHaveAttribute("aria-expanded","true");
  const projectActions=projects.locator(".demo-sidebar-section__actions");
  const projectsHeader=projects.locator(".demo-sidebar-section__header");
  const projectsDisclosure=projects.locator(".demo-sidebar-section__chevron");
  await expect(projectActions).toHaveCSS("opacity","0");
  await expect(projectsDisclosure).toHaveCSS("opacity","0");
  await projectsHeader.hover();
  await expect(projectActions).toHaveCSS("opacity","1");
  await expect(projectsDisclosure).toHaveCSS("opacity","1");
  await page.mouse.move(0,0);
  await expect(projectActions).toHaveCSS("opacity","0");
  await expect(projectsDisclosure).toHaveCSS("opacity","0");

  const projectRows=projects.locator('[data-visual-reference-only="project"]');
  await expect(projectRows).toHaveCount(7);
  await projectsToggle.click();
  await expect(projects).toHaveAttribute("data-app-action-sidebar-section-collapsed","true");
  await expect(projectsToggle).toHaveAttribute("aria-expanded","false");
  await expect(projects.locator(".demo-sidebar-section__content")).toBeHidden();
  await projectsToggle.click();
  await expect(projectRows).toHaveCount(7);

  const recents=page.locator('[data-app-action-sidebar-section-key="recents"]');
  const recentsToggle=page.getByTestId("sidebar-section-recents-toggle");
  const recentRows=recents.locator('[data-visual-reference-only="recent"]');
  await expect(recents).toHaveAttribute("data-app-action-sidebar-section-collapsed","false");
  await expect(recentRows).toHaveCount(2);
  await recentsToggle.click();
  await expect(recentsToggle).toHaveAttribute("aria-expanded","false");
  await expect(recents.locator(".demo-sidebar-section__content")).toBeHidden();
  await recentsToggle.click();
  await expect(recentRows).toHaveCount(2);
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
  const editor=page.getByRole("textbox",{name:"随心输入"});
  await editor.fill("实际任务不能变成模拟回复");
  await expect(page.getByTestId("send-button")).toBeDisabled();
  await expect(page.getByTestId("send-button")).toHaveAttribute("title","Agent 未连接，暂不可发送");
  await editor.press("Enter");
  await expect(editor).toContainText("实际任务不能变成模拟回复");
  await expect(page.locator(".demo-row")).toHaveCount(0);
  await expect(page.getByText("已收到你的消息",{exact:false})).toHaveCount(0);
  await expect(page.getByRole("heading",{name:"我们要构建什么？"})).toBeVisible();
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
  const choose=page.getByRole("button",{name:"Add new project"});
  await expect(choose).toBeEnabled();
  await expect(page.getByText("No projects",{exact:true})).toBeVisible();
  // The original Projects action is revealed by hovering/focusing its title row.
  await page.locator('[data-app-action-sidebar-section-key="projects"] .demo-sidebar-section__header').hover();
  await expect(choose).toBeVisible();
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


test("titlebar uses the 44px source row and 28px disabled history buttons",async({page})=>{
  await page.goto("/?visualScenario=shell-empty");
  await page.waitForFunction(()=>document.fonts.status==="loaded");
  const buttons=page.locator(".demo-window-menu .demo-menubar-history-button");
  await expect(buttons).toHaveCount(2);
  await expect(buttons.nth(0)).toHaveAttribute("data-desktop-history-navigation","back");
  await expect(buttons.nth(1)).toHaveAttribute("data-desktop-history-navigation","forward");
  await expect(buttons.nth(0)).toHaveAttribute("aria-label",/^(返回|Back)$/);
  await expect(buttons.nth(1)).toHaveAttribute("aria-label",/^(前进|Forward)$/);
  await expect(buttons.nth(0)).toBeDisabled();
  await expect(buttons.nth(1)).toBeDisabled();
  const icons=buttons.locator("svg");
  await expect(icons).toHaveCount(2);
  for(const icon of await icons.all()){
    await expect(icon).toHaveAttribute("viewBox","0 0 16 16");
    await expect(icon).toHaveAttribute("stroke-width","1.1");
    await expect(icon).toHaveAttribute("aria-hidden","true");
    await expect(icon.locator("path")).toHaveAttribute(
      "d","M7.05 3.35 2.65 8l4.4 4.65M2.8 8h10.55");
  }
  const geometry=await page.locator(".demo-window-menu").evaluate(menu=>{
    const center=(r:DOMRect)=>({x:r.x+r.width/2,y:r.y+r.height/2});
    const menuRect=menu.getBoundingClientRect();
    const buttons=Array.from(menu.querySelectorAll(".demo-menubar-history-button"));
    return {menuHeight:menuRect.height,menuCenterY:center(menuRect).y,
      buttons:buttons.map(button=>{
        const icon=button.querySelector("svg")!.getBoundingClientRect();
        const slot=button.getBoundingClientRect();
        return {w:slot.width,h:slot.height,iconW:icon.width,iconH:icon.height,
          iconCenterY:center(icon).y,slotCenterY:center(slot).y,
          transform:getComputedStyle(button.querySelector("svg")!).transform,
          tag:button.tagName.toLowerCase(),disabled:(button as HTMLButtonElement).disabled,
          ariaHidden:button.getAttribute("aria-hidden"),text:button.textContent};
      })};
  });
  expect(geometry.menuHeight).toBe(44);
  expect(geometry.menuCenterY).toBe(22);
  expect(geometry.buttons).toHaveLength(2);
  for(const button of geometry.buttons){
    expect(button.w).toBe(28);
    expect(button.h).toBe(28);
    expect(button.iconW).toBe(16);
    expect(button.iconH).toBe(16);
    expect(Math.abs(button.iconCenterY-button.slotCenterY)).toBeLessThanOrEqual(.5);
    expect(Math.abs(button.iconCenterY-geometry.menuCenterY)).toBeLessThanOrEqual(.5);
    expect(button.tag).toBe("button");
    expect(button.disabled).toBe(true);
    expect(button.ariaHidden).toBeNull();
    expect(button.text).toBe("");
  }
  expect(geometry.buttons[0]?.transform).toBe("none");
  expect(geometry.buttons[1]?.transform).toBe("matrix(-1, 0, 0, 1, 0, 0)");
});

test("titlebar panel button toggles the actual conversation sidebar",async({page})=>{
  await page.goto("/?visualScenario=shell-empty");
  const shell=page.locator(".demo-desktop");
  const toggle=page.getByTestId("titlebar-sidebar-toggle");
  await expect(shell).toHaveAttribute("data-app-shell-sidebar-open","true");
  await expect(toggle).toHaveAttribute("aria-expanded","true");
  await toggle.click();
  await expect(shell).toHaveAttribute("data-app-shell-sidebar-open","false");
  await expect(toggle).toHaveAttribute("aria-expanded","false");
  await toggle.click();
  await expect(shell).toHaveAttribute("data-app-shell-sidebar-open","true");
  await expect(toggle).toHaveAttribute("aria-expanded","true");
});


test("sidebar width uses the source 340px default and persists user resizing",async({page})=>{
  await page.goto("/");
  const sidebar=page.locator(".demo-sidebar");
  const resize=page.getByRole("separator",{name:"调整会话侧边栏宽度"});
  await expect(sidebar).toHaveCSS("width","340px");
  await resize.press("Home");
  await expect(sidebar).toHaveCSS("width","240px");
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem("sidebar-width"))).toBe("240");
  await page.reload();
  await expect(sidebar).toHaveCSS("width","240px");
  await resize.dblclick();
  await expect(sidebar).toHaveCSS("width","340px");
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem("sidebar-width"))).toBe("340");
});


test("Electron-backed Projects section lists, selects, adds and removes real local workspace roots",async({page})=>{
  const first={id:"10000000-0000-4000-8000-000000000001",name:"agent-web",
    createdAt:"2026-11-01T10:00:00.000Z",lastOpenedAt:"2026-11-01T10:00:00.000Z"};
  const second={id:"10000000-0000-4000-8000-000000000002",name:"agent-cil",
    createdAt:"2026-11-01T10:01:00.000Z",lastOpenedAt:"2026-11-01T10:01:00.000Z"};
  const added={id:"10000000-0000-4000-8000-000000000003",name:"new-project",
    createdAt:"2026-11-01T10:02:00.000Z",lastOpenedAt:"2026-11-01T10:02:00.000Z"};
  await page.addInitScript(({first,second,added})=>{
    const state={projects:[first,second],selected:[] as string[],removed:[] as string[],adds:0,revokes:0};
    Object.assign(window,{__workspaceProjectTestState:state});
    Object.defineProperty(window,"agentWebDesktopHost",{configurable:true,value:{
      getHostInfo:async()=>({windowType:"electron",platform:"test",theme:"light",backendConnected:false}),
      getComposerDrafts:async()=>({}),setComposerDraft:async()=>true,
      subscribeHostEvents:()=>()=>{},subscribeUiCommands:()=>()=>{},
      openMenu:async()=>false,
      listWorkspaceProjects:async()=>state.projects.map(project=>({...project})),
      addWorkspaceProject:async()=>{
        state.adds++;
        state.projects=[...state.projects,added];
        return {selected:true,created:true,project:added};
      },
      selectWorkspaceProject:async(id:string)=>{
        state.selected.push(id);
        const project=state.projects.find(item=>item.id===id);
        return project==null?{selected:false}:{selected:true,project};
      },
      removeWorkspaceProject:async(id:string)=>{
        state.removed.push(id);
        state.projects=state.projects.filter(item=>item.id!==id);
        return true;
      },
      revokeWorkspaceDirectory:async()=>{state.revokes++;return true;},
    }});
  },{first,second,added});
  await page.goto("/?visualScenario=shell-empty");
  const projects=page.locator('[data-app-action-sidebar-section-key="projects"]');
  await expect(projects.locator("[data-app-action-sidebar-project-row]")).toHaveCount(2);
  await expect(projects.getByRole("button",{name:"agent-web",exact:true})).toBeVisible();
  await expect(projects.getByRole("button",{name:"agent-cil",exact:true})).toBeVisible();
  await expect(page.getByText("No chats",{exact:true})).toBeVisible();

  await projects.getByRole("button",{name:"agent-cil",exact:true}).click();
  await expect(projects.locator('[data-app-action-sidebar-project-id="10000000-0000-4000-8000-000000000002"] button[data-app-action-sidebar-select-project]'))
    .toHaveAttribute("aria-current","page");
  await expect(page.getByRole("button",{name:"更改项目"})).toContainText("agent-cil");

  await projects.locator(".demo-sidebar-section__header").hover();
  await projects.getByRole("button",{name:"Add new project"}).click();
  await expect(projects.locator("[data-app-action-sidebar-project-row]")).toHaveCount(3);
  await expect(projects.getByRole("button",{name:"new-project",exact:true})).toBeVisible();
  await expect(projects.locator('[data-app-action-sidebar-project-id="10000000-0000-4000-8000-000000000003"] button[data-app-action-sidebar-select-project]'))
    .toHaveAttribute("aria-current","page");

  await projects.getByRole("button",{name:"Remove new-project from projects"}).click();
  await expect(projects.locator("[data-app-action-sidebar-project-row]")).toHaveCount(2);
  await expect(projects.getByRole("button",{name:"new-project"})).toHaveCount(0);
  const result=await page.evaluate(()=>
    (window as unknown as Window&{__workspaceProjectTestState:{
      selected:string[];removed:string[];adds:number;revokes:number;
    }}).__workspaceProjectTestState);
  expect(result.selected).toEqual([second.id]);
  expect(result.removed).toEqual([added.id]);
  expect(result.adds).toBe(1);
  expect(result.revokes).toBe(1);
});

import { test, expect } from "@playwright/test";

test("source-derived rail stays mounted when content sidebar is collapsed", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const rail = page.getByRole("navigation", { name: "App navigation" });
  const panel = page.getByRole("complementary", { name: "演示会话导航" });
  await expect(rail).toBeVisible();
  await expect(panel).toBeVisible();
  const toolbar=page.getByRole("toolbar",{name:"聊天工具栏"});
  await expect(toolbar).toHaveAttribute("data-app-shell-focus-area","main");
  await expect(toolbar.locator("[data-app-shell-titlebar-content]")).toHaveCount(1);
  await expect(toolbar.getByRole("button",{name:"收起侧边栏"})).toBeVisible();
  // The original Ps HeaderToolbar keeps the title and actions in one row.
  // Avoid a regression where the container loses display:flex while all
  // accessible controls continue to pass functional-only smoke tests.
  const headerGeometry=await toolbar.evaluate(element=>{
    const title=element.querySelector("[data-app-shell-titlebar-content]")!;
    const actions=element.querySelector(".demo-header-actions")!;
    const a=title.getBoundingClientRect(),b=actions.getBoundingClientRect();
    return {display:getComputedStyle(element).display,
      centerDelta:Math.abs((a.top+a.bottom)/2-(b.top+b.bottom)/2),
      actionsRight:b.right,toolbarRight:element.getBoundingClientRect().right,
      titleRight:a.right,actionsLeft:b.left};
  });
  expect(headerGeometry.display).toBe("flex");
  expect(headerGeometry.centerDelta).toBeLessThan(3);
  expect(headerGeometry.actionsRight).toBeLessThanOrEqual(headerGeometry.toolbarRight+1);
  expect(headerGeometry.titleRight).toBeLessThanOrEqual(headerGeometry.actionsLeft);

  await expect(page.locator("[data-app-shell-frame]")).toHaveAttribute("data-app-shell-sidebar-open", "true");
  await expect(page.locator("[data-app-shell-frame]")).toHaveCSS("--app-shell-navigation-rail-width", "52px");
  await page.getByRole("button", { name: "收起侧边栏" }).last().click();
  await expect(panel).toBeHidden();
  await expect(rail).toBeVisible();
  await expect(page.locator("[data-app-shell-frame]")).toHaveAttribute("data-app-shell-sidebar-open", "false");
  const geometry = await page.evaluate(() => {
    const railRect = document.querySelector("[data-app-navigation-rail]")!.getBoundingClientRect();
    const mainRect = document.querySelector(".demo-main")!.getBoundingClientRect();
    return { railWidth: railRect.width, mainX: mainRect.x, documentWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth };
  });
  expect(geometry.railWidth).toBe(52);
  expect(geometry.mainX).toBe(52);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  await page.getByRole("button", { name: "展开侧边栏" }).last().click();
  await expect(panel).toBeVisible();
  await expect(errors).toEqual([]);
});

test("rail Explore stays in the scroll stack while Settings remains in the footer",async({page})=>{
  await page.goto("/");
  const rail=page.getByRole("navigation",{name:"App navigation"});
  const stack=rail.locator("[data-navigation-rail-scroll]");
  const explore=page.getByTestId("navigation-rail-explore");
  const settings=page.getByTestId("navigation-rail-settings");
  await expect(explore).toBeVisible();
  await expect(explore).toBeDisabled();
  await expect(settings).toBeVisible();
  await expect(settings).toBeDisabled();
  const layout=await page.evaluate(()=>{
    const rail=document.querySelector("[data-app-navigation-rail]")!;
    const stack=rail.querySelector("[data-navigation-rail-scroll]")!;
    const home=rail.querySelector('[data-sidebar-destination="builtin:home"]')!;
    const explore=rail.querySelector('[data-testid="navigation-rail-explore"]')!;
    const plugins=rail.querySelector('[data-testid="navigation-rail-plugins"]')!;
    const divider=rail.querySelector('[data-navigation-rail-section-divider]')!;
    const settings=rail.querySelector('[data-testid="navigation-rail-settings"]')!;
    const rr=rail.getBoundingClientRect(),sr=stack.getBoundingClientRect();
    const hr=home.getBoundingClientRect(),er=explore.getBoundingClientRect(),fr=settings.getBoundingClientRect();
    const buttonOrder=Array.from(stack.querySelectorAll("button")).map(button=>({
      id:button.getAttribute("data-sidebar-destination")??button.getAttribute("data-testid"),
      kind:button.getAttribute("data-navigation-rail-kind"),
    }));
    return {
      stackOffset:sr.top-rr.top,
      stackGap:getComputedStyle(stack).rowGap,
      homeWidth:hr.width,
      homeLeft:hr.left-rr.left,
      exploreInsideStack:stack.contains(explore),
      settingsOutsideStack:!stack.contains(settings),
      pluginsBeforeExplore:plugins.compareDocumentPosition(explore)===Node.DOCUMENT_POSITION_FOLLOWING,
      dividerBetweenExploreAndDirect:explore.compareDocumentPosition(divider)===Node.DOCUMENT_POSITION_FOLLOWING&&
        divider.compareDocumentPosition(rail.querySelector('[data-sidebar-destination="builtin:activity"]'))===Node.DOCUMENT_POSITION_FOLLOWING,
      buttonOrder,
      exploreBottom:er.bottom,
      settingsTop:fr.top,
      settingsBottomInset:rr.bottom-fr.bottom,
    };
  });
  expect(layout.stackOffset).toBe(8);
  expect(layout.stackGap).toBe("1px");
  expect(layout.homeWidth).toBe(36);
  expect(layout.homeLeft).toBe(8);
  expect(layout.exploreInsideStack).toBe(true);
  expect(layout.settingsOutsideStack).toBe(true);
  expect(layout.pluginsBeforeExplore).toBe(true);
  expect(layout.dividerBetweenExploreAndDirect).toBe(true);
  expect(layout.buttonOrder).toEqual([
    {id:"builtin:home",kind:"home"},
    {id:"builtin:images",kind:"primary"},
    {id:"builtin:automations",kind:"primary"},
    {id:"builtin:library",kind:"primary"},
    {id:"navigation-rail-plugins",kind:"customize"},
    {id:"navigation-rail-explore",kind:"explore"},
    {id:"builtin:activity",kind:"direct"},
    {id:"builtin:skills",kind:"direct"},
  ]);
  expect(layout.exploreBottom).toBeLessThan(layout.settingsTop);
  expect(layout.settingsBottomInset).toBe(8);
  await expect(stack.locator("button")).toHaveCount(8);
});

test("rail only navigates where mock host provides a handler", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", {name: /工具调用与审批交互/}).click();
  await expect(page.locator(".demo-header-location strong")).toHaveText("工具调用与审批交互");
  await page.getByRole("button", {name: "Home"}).click();
  await expect(page.locator(".demo-header-location strong")).toHaveText("恢复 Codex 会话界面");
  await expect(page.locator(".demo-composer")).toHaveAttribute("data-composer-placement","thread");
  await expect(page.getByRole("button", {name: "Library"})).toBeDisabled();
});

test("project and recent conversation rows occupy their source Codex sections",async({page})=>{
  await page.goto("/");
  const projects=page.locator('[data-app-action-sidebar-section-key="projects"]');
  const recents=page.locator('[data-app-action-sidebar-section-key="recents"]');
  await expect(projects.locator(".demo-project-heading")).toHaveText(/agent web/);
  await expect(projects.locator(".demo-recent-chat-link")).toHaveCount(0);
  const recentRows=recents.locator(".demo-recent-chat-link");
  expect(await recentRows.count()).toBeGreaterThan(0);
  await expect(recentRows.first()).toHaveCSS("padding-left","0px");
  await expect(recents.locator('.demo-recent-chat-link[aria-current="page"]')).toHaveCount(1);
});

test("original sbi separator supports keyboard, reset and pointer drag without moving the rail",async ({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");
  const rail=page.getByRole("navigation",{name:"App navigation"});
  const sidebar=page.getByRole("complementary",{name:"演示会话导航"});
  const handle=page.getByRole("separator",{name:"调整会话侧边栏宽度"});
  await expect(handle).toHaveAttribute("aria-valuenow","275");
  await handle.focus();
  await page.keyboard.press("ArrowRight");
  await expect(handle).toHaveAttribute("aria-valuenow","285");
  await expect(sidebar).toHaveCSS("width","285px");
  await page.keyboard.press("Home");
  await expect(handle).toHaveAttribute("aria-valuenow","240");
  await page.keyboard.press("End");
  await expect(handle).toHaveAttribute("aria-valuenow","520");
  await handle.dblclick();
  await expect(handle).toHaveAttribute("aria-valuenow","340");
  // A source width update and its painted separator must be the SAME
  // geometry before the pointer interaction. PR #2's inherited .2s width
  // animation previously left an invisible moving target over the transcript.
  await expect(sidebar).toHaveCSS("width","340px");
  await expect(sidebar).toHaveCSS("transition-property","background-color");
  const rect=await handle.boundingBox();
  expect(rect).not.toBeNull();
  const dragX=rect!.x+rect!.width/2;
  const dragY=rect!.y+Math.min(70,rect!.height/2);
  const hit=await page.evaluate(({x,y})=>{
    const element=document.elementFromPoint(x,y);
    return {role:element?.getAttribute("role"),className:element?.className};
  },{x:dragX,y:dragY});
  expect(hit,JSON.stringify(hit)).toHaveProperty("role","separator");
  await page.mouse.move(dragX,dragY);
  await page.mouse.down();
  await expect(page.locator("[data-source-sidebar-resizer]"))
    .toHaveAttribute("data-resizing","true");
  await page.mouse.move(rect!.x+rect!.width/2+60,rect!.y+Math.min(70,rect!.height/2),{steps:5});
  await page.mouse.up();
  await expect(handle).toHaveAttribute("aria-valuenow","400");
  await expect(sidebar).toHaveCSS("width","400px");
  await expect(rail).toHaveCSS("width","52px");
  await page.getByRole("button",{name:"收起侧边栏"}).last().click();
  await expect(handle).toHaveCount(0);
  await expect(page.locator(".demo-main")).toBeVisible();
  await page.getByRole("button",{name:"展开侧边栏"}).last().click();
  await expect(page.getByRole("separator",{name:"调整会话侧边栏宽度"}))
    .toHaveAttribute("aria-valuenow","400");
  await expect(errors).toEqual([]);
});

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

test("rail only navigates where mock host provides a handler", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", {name: /工具调用与审批交互/}).click();
  await expect(page.locator(".demo-header-location strong")).toHaveText("工具调用与审批交互");
  await page.getByRole("button", {name: "Home"}).click();
  await expect(page.locator(".demo-header-location strong")).toHaveText("恢复 Codex 会话界面");
  await expect(page.getByRole("button", {name: "Library"})).toBeDisabled();
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

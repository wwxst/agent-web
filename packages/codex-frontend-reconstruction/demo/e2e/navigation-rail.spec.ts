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

import { test, expect } from "@playwright/test";

test("uses source-confirmed shell dimensions and composer component slots", async ({ page }) => {
  await page.goto("/");
  const root = page.locator("[data-app-shell-frame]");
  await expect(root).toHaveAttribute("data-app-shell-sidebar-open", "true");
  await expect(root).toHaveAttribute("data-app-shell-application-menu-bar", "true");
  await expect(page.locator("[data-app-shell-main-titlebar]")).toBeVisible();
  const measurements = await page.evaluate(() => {
    const width = (selector: string) => document.querySelector(selector)?.getBoundingClientRect().width;
    const height = (selector: string) => document.querySelector(selector)?.getBoundingClientRect().height;
    return { sidebar: width(".demo-sidebar"), menu: height(".demo-window-menu"), titlebar: height(".demo-header") };
  });
  // Original compiled CSS: --spacing-token-sidebar preferred 275px, toolbar 46/36px.
  expect(measurements).toEqual({ sidebar: 275, menu: 36, titlebar: 46 });

  const composer = page.locator(".codex-composer-layout");
  await expect(composer).toHaveAttribute("data-composer-layout", "multiline");
  await expect(composer).toHaveAttribute("data-composer-density", "comfortable");
  await expect(composer).toHaveAttribute("data-composer-radius-variant", "default");
  await expect(composer).toHaveAttribute("data-composer-surface-variant", "default");
  await expect(composer.locator(".codex-composer-layout__input[data-composer-input]")).toBeVisible();
  await expect(composer.locator(".codex-composer-layout__footer[data-composer-rows='stacked']")).toBeVisible();

  // Retain existing demo interactions through the recovered layout slots.
  await page.getByRole("textbox", { name: "演示消息输入" }).fill("源码布局接线检查");
  await page.getByRole("button", { name: "发送模拟消息" }).click();
  await expect(page.getByText("已收到你的消息", { exact: false })).toBeVisible();
  await page.locator(".demo-collapse-toggle").click();
  await expect(root).toHaveAttribute("data-app-shell-sidebar-open", "false");
});

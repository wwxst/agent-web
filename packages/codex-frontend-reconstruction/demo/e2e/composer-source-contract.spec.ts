import { test, expect } from "@playwright/test";

test("uses source-confirmed shell dimensions and composer component slots", async ({ page }) => {
  const uncaught: string[] = [];
  page.on("pageerror", (e) => uncaught.push(e.message));
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
  const editorHost = page.locator(".codex-source-rich-text-input");
  await expect(editorHost).toHaveAttribute("data-rich-text-layout", "multiline");
  const editorDom = page.getByRole("textbox", { name: "演示消息输入" });
  await expect(editorDom).toHaveAttribute("data-virtualkeyboard", "true");
  await expect(editorDom).toHaveAttribute("placeholder", "Work with Codex");

  // Retain existing demo interactions through the recovered layout slots.
  await page.getByRole("textbox", { name: "演示消息输入" }).fill("源码布局接线检查");
  await page.getByRole("button", { name: "发送模拟消息" }).click();
  await expect(page.getByText("已收到你的消息", { exact: false })).toBeVisible();
  await page.locator(".demo-collapse-toggle").click();
  await expect(root).toHaveAttribute("data-app-shell-sidebar-open", "false");
  expect(uncaught).toEqual([]);
});

test("prevents Enter from submitting while the demo input is composing", async ({ page }) => {
  await page.goto("/");
  const composer = page.getByRole("textbox", { name: "演示消息输入" });
  await composer.fill("拼音输入");
  await composer.evaluate((el) => el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true })));
  await expect(composer).toHaveAttribute("data-composing", "true");
  await composer.press("Enter");
  await expect(composer).toHaveValue("拼音输入");
  await expect(page.getByText("已收到你的消息", { exact: false })).toHaveCount(0);

  await composer.evaluate((el) => el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true })));
  await expect(composer).toHaveAttribute("data-composing", "false");
  await composer.press("Enter");
  await expect(page.getByText("已收到你的消息", { exact: false })).toBeVisible();
});

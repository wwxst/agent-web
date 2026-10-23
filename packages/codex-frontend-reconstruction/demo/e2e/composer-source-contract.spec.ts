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
  await expect(editorDom).toHaveAttribute("data-placeholder", "Work with Codex");
  await expect(editorDom).toHaveAttribute("data-source-editor", "prosemirror-plain");
  await expect(editorDom).toHaveAttribute("contenteditable", "true");

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
  await expect(composer).toHaveText("拼音输入");
  await expect(page.getByText("已收到你的消息", { exact: false })).toHaveCount(0);

  await composer.evaluate((el) => el.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true })));
  await expect(composer).toHaveAttribute("data-composing", "false");
  await composer.press("Enter");
  await expect(page.getByText("已收到你的消息", { exact: false })).toBeVisible();
});

test("source YMt primary action switches send to stop for a synthetic stream", async ({ page }) => {
  await page.goto("/");
  const button = page.getByTestId("send-button");
  await expect(button).toHaveAttribute("data-composer-action", "send");
  await expect(button).toHaveAttribute("type", "submit");
  await expect(button).toBeDisabled();
  await page.getByRole("textbox", {name: "演示消息输入"}).fill("检查停止与发送状态");
  await expect(button).toBeEnabled();
  await button.click();
  await expect(button).toHaveAttribute("data-composer-action", "stop");
  await expect(button).toHaveAttribute("type", "button");
  await expect(button).toHaveAttribute("aria-busy", "false");
  await button.click();
  await expect(button).toHaveAttribute("data-composer-action", "send");
  await expect(button).toBeDisabled();
  await expect(page.getByText("模拟执行已停止", {exact: false})).toBeVisible();
});

test("outer YMt host form submits once and captures normal transfers without blocking", async ({ page }) => {
  await page.goto("/");
  const form = page.locator("[data-codex-source-composer-form]");
  await expect(form).toHaveCount(1);
  const textbox = page.getByRole("textbox", {name: "演示消息输入"});
  const unblocked = await textbox.evaluate((el) => {
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    const drop = new Event("drop", { bubbles: true, cancelable: true });
    el.dispatchEvent(paste);
    el.dispatchEvent(drop);
    return { paste: paste.defaultPrevented, drop: drop.defaultPrevented };
  });
  expect(unblocked).toEqual({ paste: false, drop: false });
  await textbox.fill("验证来源表单只提交一次");
  await page.getByRole("button", {name: "发送模拟消息"}).click();
  await expect(page.getByText("验证来源表单只提交一次", {exact: true})).toHaveCount(1);
  await expect(page.getByTestId("send-button")).toHaveAttribute("data-composer-action", "stop");
});


test("mounted ProseMirror plain editor supports multiline transactions and history", async ({page}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const editor = page.getByRole("textbox", {name:"演示消息输入"});
  await expect(editor).toHaveClass(/ProseMirror/);
  await editor.fill("第一行");
  await editor.press("Shift+Enter");
  await editor.type("第二行");
  await expect(editor.locator("p")).toHaveCount(2);
  await expect(editor).toContainText("第二行");
  await editor.press("Control+z");
  await expect.poll(() => editor.locator("p").count()).toBeGreaterThanOrEqual(1);
  await expect(page.getByTestId("send-button")).toBeEnabled();
  expect(errors).toEqual([]);
});

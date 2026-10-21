import { test, expect } from "@playwright/test";

test("mounts recovered transcript components and handles mock-only interactions", async ({ page }, testInfo) => {
  const uncaughtErrors: string[] = [];
  page.on("pageerror", (error) => uncaughtErrors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".demo-header-location strong")).toHaveText("恢复 Codex 会话界面");
  await expect(page.locator("[data-demo-role='assistant']").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "打开演示工具" })).toBeVisible();
  await expect(page.getByTestId("demo-tools")).toHaveCount(0);
  const layout = await page.evaluate(() => {
    const bounds = (selector: string) => {
      const r = document.querySelector(selector)?.getBoundingClientRect();
      return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
    };
    return { sidebar: bounds(".demo-sidebar"), menubar: bounds(".demo-window-menu"),
      header: bounds(".demo-header"), composer: bounds(".demo-composer"),
      rootWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth,
      theme: getComputedStyle(document.querySelector(".demo-main")!).backgroundColor };
  });
  expect(layout.sidebar?.width).toBe(275); // app-shared token preferred width, not screenshot guess
  expect(layout.menubar?.height).toBe(36);
  expect(layout.header?.height).toBe(46); // app-shared --height-toolbar
  expect(layout.composer?.width).toBeGreaterThan(650);
  const composerRoot = page.locator('.codex-composer-layout');
  await expect(composerRoot).toHaveAttribute('data-composer-layout', 'multiline');
  await expect(composerRoot).toHaveAttribute('data-composer-density', 'comfortable');
  await expect(composerRoot).toHaveAttribute('data-composer-radius-variant', 'default');
  await expect(page.locator('.codex-composer-layout__footer')).toHaveAttribute('data-composer-rows', 'stacked');
  await expect(page.locator('[data-app-shell-frame]')).toHaveAttribute('data-app-shell-sidebar-open', 'true');
  expect(layout.rootWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.theme).toBe("rgb(255, 255, 255)");
  await page.screenshot({ path: testInfo.outputPath("codex-light-shell.png"), animations: "disabled" });

  const composer = page.getByRole("textbox", { name: "演示消息输入" });
  await composer.fill("测试模拟会话投影");
  await page.getByRole("button", { name: "发送模拟消息" }).click();
  await expect(page.getByText("已收到你的消息", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "打开演示工具" }).click();
  await page.getByRole("button", { name: /添加 45 条历史/ }).click();
  await expect(page.getByRole("button", { name: /添加 45 条历史/ })).toBeDisabled();
  await page.getByRole("button", { name: /跳到开头/ }).click();
  await expect(page.locator('[data-turn-key="history-content:turn:intro"]')).toBeAttached();
  await page.getByRole("button", { name: /跳到最新/ }).click();
  const lastRow = page.locator('[data-turn-key="history-content:turn:history-45"]');
  await expect(lastRow).toBeInViewport({ ratio: 0.1 });
  const geometry = await page.evaluate(() => {
    const scroll = document.querySelector('[data-testid="transcript-scroll"]');
    const rows = [...document.querySelectorAll('[data-turn-key]')];
    return { scrollTop: scroll?.scrollTop, scrollHeight: scroll?.scrollHeight,
      viewportHeight: scroll?.clientHeight, mountedRowKeys: rows.map(el => el.getAttribute('data-turn-key')) };
  });
  console.log('VIRTUALIZER_VIEWPORT', JSON.stringify(geometry));

  await page.screenshot({ path: testInfo.outputPath("browser-preview.png"), animations: "disabled" });
  expect(uncaughtErrors).toEqual([]);
});

test("switches the mock conversation and shows its real recovered row dispatch", async ({ page }) => {
  const uncaughtErrors: string[] = [];
  page.on("pageerror", (error) => uncaughtErrors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: /工具调用与审批交互/ }).click();
  await expect(page.locator(".demo-header-location strong")).toHaveText("工具调用与审批交互");
  await expect(page.locator("[data-demo-role='assistant']").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "打开演示工具" })).toBeVisible();
  expect(uncaughtErrors).toEqual([]);
});

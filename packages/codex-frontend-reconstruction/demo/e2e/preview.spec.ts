import { test, expect } from "@playwright/test";

test("mounts recovered transcript components and handles mock-only interactions", async ({ page }, testInfo) => {
  const uncaughtErrors: string[] = [];
  page.on("pageerror", (error) => uncaughtErrors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "恢复 Codex 会话界面" })).toBeVisible();
  await expect(page.locator("[data-demo-role='assistant']").first()).toBeVisible();

  const composer = page.getByRole("textbox", { name: "演示消息输入" });
  await composer.fill("测试模拟会话投影");
  await page.getByRole("button", { name: "发送模拟消息" }).click();
  await expect(page.getByText("已收到你的消息", { exact: false })).toBeVisible();

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
  await expect(page.getByRole("heading", { name: "工具调用与审批交互" })).toBeVisible();
  await expect(page.locator("[data-demo-role='assistant']").first()).toBeVisible();
  expect(uncaughtErrors).toEqual([]);
});

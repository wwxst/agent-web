import { test, expect } from "@playwright/test";

test("source Yja three-backtick rule creates a real ProseMirror code block", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "演示消息输入" });
  await editor.fill("");
  await editor.pressSequentially("```");
  const block = editor.locator('pre[data-composer-code-block] code');
  await expect(block).toHaveCount(1);
  await editor.pressSequentially("echo hello");
  await expect(block).toContainText("echo hello");
  // The remaining paragraph is from the source's insert-after-paragraph rule.
  await expect(editor.locator("p")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("source selected-text link paste retains its text and adds a KCa-shaped mark", async ({ page }) => {
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "演示消息输入" });
  await editor.fill("Useful link label");
  await editor.press("ControlOrMeta+a");
  const paste = await editor.evaluate(el => {
    const transfer = new DataTransfer();
    transfer.setData("text/plain", "https://example.com/reference");
    const event = new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: transfer });
    el.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(paste).toBe(true);
  const link = editor.locator('a[href="https://example.com/reference"]');
  await expect(link).toHaveText("Useful link label");
  await expect(editor).not.toContainText("https://example.com/reference");
  await expect(page.getByTestId("send-button")).toBeEnabled();
});

test("unsafe pasted URL is never converted to a clickable link", async ({ page }) => {
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "演示消息输入" });
  await editor.fill("Protected label");
  await editor.press("ControlOrMeta+a");
  await editor.evaluate(el => {
    const transfer = new DataTransfer();
    transfer.setData("text/plain", "javascript:alert(1)");
    el.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: transfer }));
  });
  await expect(editor.locator("a[href]")).toHaveCount(0);
});

test("plain text enter/IME behavior still submits through existing host", async ({ page }) => {
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "演示消息输入" });
  await editor.fill("原有提交门控回归");
  await editor.press("Enter");
  await expect(page.getByText("已收到你的消息", { exact: false })).toBeVisible();
});

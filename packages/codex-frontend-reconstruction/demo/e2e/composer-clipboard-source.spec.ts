import { test, expect } from "@playwright/test";

// Original app-initial rUu clipboardTextSerializer branch: an open single
// code_block is copied as literal code text (without Markdown fences).
// The private uG Markdown serializer for other rich slices is not restored.
test("mounted ProseMirror copies a selected code-block line as literal text", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "演示消息输入" });
  await editor.fill("");
  await editor.pressSequentially("```");
  const code = editor.locator("pre[data-composer-code-block] code");
  await expect(code).toHaveCount(1);
  await editor.pressSequentially("echo source clipboard");
  await expect(code).toHaveText("echo source clipboard");
  await page.keyboard.press("Shift+Home");
  await page.keyboard.press("ControlOrMeta+c");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("echo source clipboard");
  await expect(editor.locator("p")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("ordinary composer paragraph copying retains plain-text content", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "演示消息输入" });
  await editor.fill("普通文本保持复制");
  await editor.press("ControlOrMeta+a");
  await editor.press("ControlOrMeta+c");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("普通文本保持复制");
});

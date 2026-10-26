import {test,expect} from "@playwright/test";

test("source Bt streams into one mounted assistant code block with final Lezer spans",async({page},testInfo)=>{
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-streaming-code").click();
  const row=page.locator('[data-demo-turn-id^="streaming-code-"]').last();
  const block=row.locator('[data-conversation-code-surface="true"]');
  await expect(block).toHaveCount(1);
  await expect(block).toHaveAttribute("data-source-code-streaming","true");
  await expect(block).toHaveAttribute("data-source-code-highlight","ready");
  const code=block.locator('[data-code-block-source] code');
  await expect(code).toContainText("const sourceStreaming = 1;");
  await expect(code).toContainText("console.log(continued);",{timeout:12000});
  await expect(block).toHaveAttribute("data-source-code-streaming","false",{timeout:12000});
  await expect(block).toHaveAttribute("data-source-code-highlight","ready",{timeout:12000});
  await expect(code).toContainText("const continued = 'source_' + sourceStreaming;");
  expect(await code.locator(".text-codex-syntax-keyword").count()).toBeGreaterThan(0);
  const before=await code.textContent();
  expect(before).toBe([
    "const sourceStreaming = 1;",
    "const continued = 'source_' + sourceStreaming;",
    "console.log(continued);",
    "",
  ].join("\n"));
  await expect(page.locator('[data-demo-turn-id^="streaming-code-"]')).toHaveCount(1);
  // Copy and shared word wrap continue using the original mounted code block.
  await block.getByRole("button",{name:"Enable word wrap"}).click();
  await expect(block).toHaveAttribute("data-source-code-wrap-lines","true");
  expect(await code.textContent()).toBe(before);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({
    path:testInfo.outputPath("source-streaming-assistant-code.png"),
    animations:"disabled",
  });
});

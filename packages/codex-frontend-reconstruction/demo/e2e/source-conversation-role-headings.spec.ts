import {test,expect} from "@playwright/test";

test("original Ft message role headings remain accessible but visually hidden until printing",async({page})=>{
  await page.goto("/");
  const composer=page.getByRole("textbox",{name:"演示消息输入"});
  await composer.fill("Ft accessibility regression");
  await page.getByRole("button",{name:"发送模拟消息"}).click();
  await expect(page.getByText("已收到你的消息",{exact:false})).toBeVisible();

  const user=page.locator('[data-conversation-message="user"] [data-source-message-role-heading="user"]').last();
  const assistant=page.locator('[data-conversation-message="assistant"] [data-source-message-role-heading="assistant"]').last();
  await expect(user).toHaveText("You said:");
  await expect(assistant).toHaveText("ChatGPT said:");
  await expect(user).toHaveCSS("position","absolute");
  await expect(assistant).toHaveCSS("position","absolute");
  await expect(assistant).toHaveAttribute("data-conversation-role","assistant");
  await expect(assistant).toHaveAttribute("tabindex","-1");
  await expect(user).not.toHaveAttribute("data-conversation-role","assistant");
  // Original print:not-sr-only recovers the headings for exported transcripts.
  await page.emulateMedia({media:"print"});
  await expect(user).toHaveCSS("position","static");
  await expect(assistant).toHaveCSS("font-weight","700");
});

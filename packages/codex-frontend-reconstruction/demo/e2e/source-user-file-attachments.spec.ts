import {test,expect} from "@playwright/test";

test("source hn mounts typed file pills inside the actual user virtual turn and never fabricates open actions",async({page})=>{
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-user-file-attachments").click();
  await expect(page.getByTestId("demo-tools")).toHaveCount(0);
  const row=page.locator('[data-demo-turn-id^="user-file-attachments-"]').last();
  const user=row.locator('[data-conversation-message="user"]');
  await expect(user).toBeVisible();
  const files=user.locator('[data-source-user-file-attachments]');
  await expect(files).toHaveCount(1);
  await expect(files.locator('[data-source-user-attachment-kind]')).toHaveCount(3);
  await expect(files.locator('[data-source-user-attachment-kind="workspace"]')).toContainText("App.tsx");
  await expect(files.locator('[data-source-user-attachment-lines="14-28"]')).toBeVisible();
  await expect(files.locator('[data-source-user-attachment-kind="upload"]')).toContainText("reference-notes.pdf");
  await expect(files.locator('[data-source-user-attachment-kind="none"]')).toContainText("Detached attachment");
  await expect(files.getByRole("button",{name:/App.tsx/})).toBeDisabled();
  await expect(files.getByRole("button",{name:"reference-notes.pdf"})).toBeDisabled();
  await expect(files.getByRole("button",{name:"Detached attachment"})).toBeDisabled();
  await expect(page.getByRole("region",{name:"对话"})).toBeVisible();
});

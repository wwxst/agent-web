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
  await expect(files.locator('[data-source-user-attachment-kind]')).toHaveCount(5);
  await expect(files.locator('[data-source-user-attachment-kind="workspace"]')).toContainText("App.tsx");
  await expect(files.locator('[data-source-user-attachment-lines="14-28"]')).toBeVisible();
  await expect(files.locator('[data-source-user-attachment-kind="workspace"] .codex-user-file-attachments__name')).toHaveText("App.tsx");
  const uploads=files.locator('[data-source-user-attachment-kind="upload"]');
  await expect(uploads).toHaveCount(3);
  await expect(uploads.first()).toContainText("reference-notes.pdf");
  await expect(files.locator('[data-source-user-attachment-kind="none"]')).toContainText("Detached attachment");
  const pasted=files.locator('[data-source-pasted-text-preview="true"]');
  await expect(pasted).toHaveCount(2);
  await expect(pasted.first()).toHaveText("Pasted code snippets from a test fixture");
  await expect(pasted.last()).toHaveText("Pasted text");
  await expect(pasted.first().locator("..").locator(".codex-user-file-attachments__subtitle"))
    .toHaveText("Pasted text");
  await expect(pasted.first().locator("..").locator("..")).toHaveCSS("border-radius","8px");
  const resourcePill=files.getByRole("button",{name:/App.tsx/});
  await expect(resourcePill).toBeDisabled();
  await expect(resourcePill).toHaveCSS("border-radius","9999px");
  await expect(resourcePill).toHaveCSS("max-width","320px");
  await expect(resourcePill).toHaveCSS("font-size","14px");
  await expect(resourcePill).toHaveAttribute("data-composer-attachment-pill","true");
  await expect(files.getByRole("button",{name:"reference-notes.pdf"})).toBeDisabled();
  await expect(files.getByRole("button",{name:"Detached attachment"})).toBeDisabled();
  await expect(page.getByRole("region",{name:"对话"})).toBeVisible();
});

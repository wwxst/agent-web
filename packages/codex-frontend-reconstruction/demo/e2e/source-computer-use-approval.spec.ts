import {test,expect} from "@playwright/test";

test("original Computer Use E mounts distinct first-use and high-risk app approvals as readonly activity",async({page},testInfo)=>{
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-computer-use-approval-request").click();
  const rows=page.locator('[data-demo-turn-id^="computer-use-approval-"]');
  await expect(rows).toHaveCount(2);
  const cards=page.locator("[data-source-computer-use-approval-card]");
  await expect(cards).toHaveCount(2);
  const firstUse=rows.last().locator("[data-source-computer-use-approval-card]");
  const risky=rows.first().locator("[data-source-computer-use-approval-card]");
  await expect(firstUse).toHaveAttribute("data-source-computer-use-reply-phase","idle");
  await expect(firstUse).toHaveAttribute("aria-label","Computer Use app approval request");
  await expect(firstUse).toContainText("Allow ChatGPT to use Visual Studio Code?");
  await expect(firstUse.locator('[data-source-computer-use-header="app"]'))
    .toContainText("Computer Use (synthetic fixture)");
  await expect(firstUse.locator('[data-source-computer-use-first-disclosure="true"]'))
    .toContainText("It may take screenshots of app contents");
  await expect(firstUse).toContainText("Synthetic request · no Computer Use backend is connected");
  const always=firstUse.getByRole("button",{name:"Always allow"});
  const primary=firstUse.getByRole("button",{name:"Allow this conversation"});
  const deny=firstUse.getByRole("button",{name:"Deny"});
  await expect(always).toBeDisabled();
  await expect(primary).toBeDisabled();
  await expect(deny).toBeDisabled();
  await expect(firstUse).toContainText("No Computer Use reply transport is connected");
  await expect(firstUse.getByRole("button",{name:"Allow once"})).toHaveCount(0);
  await expect(firstUse.getByRole("button",{name:"Approval options"})).toHaveCount(0);
  await expect(firstUse.locator("[data-source-mcp-approval-card]")).toHaveCount(0);

  await expect(risky).toContainText("Allow ChatGPT to use Terminal?");
  await expect(risky.locator('[data-source-computer-use-header="high"]'))
    .toContainText("Elevated Risk");
  await expect(risky.locator('[data-source-computer-use-first-disclosure]')).toHaveCount(0);
  await expect(risky.getByRole("button",{name:"Always allow"})).toHaveCount(0);
  await expect(risky.getByRole("button",{name:"Allow this conversation"})).toBeDisabled();
  await expect(risky.getByRole("button",{name:"Deny"})).toBeDisabled();

  // No host Computer Use capability is installed; even though generic MCP
  // reply transport exists, neither app request may submit to it.
  await expect(firstUse).toHaveAttribute("data-source-computer-use-reply-phase","idle");
  await expect(risky).toHaveAttribute("data-source-computer-use-reply-phase","idle");
  await expect(page.locator('[data-source-mcp-reply-phase="submitted"]')).toHaveCount(0);
  await firstUse.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath("source-computer-use-first-use-readonly.png"),animations:"disabled"});
  await risky.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath("source-computer-use-high-risk-readonly.png"),animations:"disabled"});
});

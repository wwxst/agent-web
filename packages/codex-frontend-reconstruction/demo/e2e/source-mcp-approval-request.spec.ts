import {test,expect} from "@playwright/test";

test("source MCP approval in real transcript enforces scopes, pending lock, and failure retry",async({page},testInfo)=>{
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-mcp-approval-request").click();
  const row=page.locator('[data-demo-turn-id^="mcp-approval-"]').last();
  const card=row.locator('[data-source-mcp-approval-card]');
  await expect(card).toHaveCount(1);
  await expect(card).toHaveAttribute("data-source-mcp-reply-phase","idle");
  await expect(card.getByText("Elevated Risk")).toBeVisible();
  await expect(card.locator('[data-source-mcp-param]')).toHaveCount(4);
  await card.getByRole("button",{name:"Show 2 more items"}).click();
  await expect(card.locator('[data-source-mcp-param]')).toHaveCount(6);
  await card.getByRole("button",{name:"Expand description"}).click();
  await expect(card.locator('[data-source-mcp-param="description"] pre'))
    .toHaveAttribute("data-source-mcp-param-preview","expanded");
  const options=card.getByRole("button",{name:"Approval options"});
  const always=card.getByRole("button",{name:"Always allow"});
  const deny=card.getByRole("button",{name:"Deny"});
  await expect(options).toBeEnabled();
  await expect(always).toBeEnabled();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await options.click();
  const session=page.getByRole("menuitem",{name:"Allow this conversation"});
  await expect(session).toBeVisible();
  await session.click();
  await expect(card).toHaveAttribute("data-source-mcp-reply-phase","submitting");
  await expect(options).toBeDisabled();
  await expect(always).toBeDisabled();
  await expect(deny).toBeDisabled();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(card).toHaveAttribute("data-source-mcp-reply-phase","error",{timeout:9000});
  await expect(card.locator(".codex-source-mcp-approval__error")).toContainText("Unable to send response");
  await expect(options).toBeEnabled();
  await deny.click();
  await expect(card).toHaveAttribute("data-source-mcp-reply-phase","submitting");
  await expect(card).toHaveAttribute("data-source-mcp-reply-phase","error",{timeout:9000});
  await expect(card.getByRole("button",{name:"Allow once"})).toBeEnabled();
  // No reply succeeded: the request must never be removed or relabeled approved.
  await expect(row).toHaveCount(1);
  await expect(card.getByText(/Response sent to host/)).toHaveCount(0);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath("source-mcp-approval-retry.png"),
    animations:"disabled"});
});

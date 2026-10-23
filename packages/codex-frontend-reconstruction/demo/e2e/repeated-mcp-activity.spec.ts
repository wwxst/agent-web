import {test,expect} from "@playwright/test";

test("source Je/bg uses A_ phase disclosure with XO icon and keeps ineligible MCP calls separate",async ({page})=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  const turn=page.locator('[data-demo-turn-id="review-repeated-mcp"]');
  await expect(turn).toBeVisible();
  const outer=turn.locator("[data-recovered-agent-activity]");
  await outer.locator(".codex-agent-activity__toggle").click();
  const group=turn.locator("[data-codex-activity-group]");
  await expect(group).toBeVisible();
  await group.locator(".codex-activity-group-row__toggle").click();
  const repeated=group.locator('[data-codex-source-repeated-group="mcp-tool-call"]');
  const toggle=repeated.locator("[data-codex-source-repeated-toggle]");
  await expect(repeated).toHaveCount(1);
  await expect(toggle).toContainText("search · 2 次调用");
  await expect(repeated.locator("[data-demo-repeated-icon]")).toBeVisible();
  await expect(repeated).toHaveAttribute("data-source-disclosure-phase","collapsed");
  await expect(toggle).toHaveAttribute("aria-expanded","false");
  await expect(repeated.locator("[data-codex-source-repeated-body]")).toHaveCount(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded","true");
  await expect(repeated).toHaveAttribute("data-source-disclosure-phase","expanded");
  await expect(repeated.locator("[data-codex-source-repeated-body]")).toBeVisible();
  await expect(repeated.locator(".codex-activity-group-row__subrow")).toHaveCount(2);
  await expect(group.locator(".codex-activity-group-row__subrow")).toHaveCount(4);
  await expect(group.locator('[data-codex-source-repeated-group="external-event"]')).toHaveCount(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded","false");
  // A_ deliberately preserves children through closing; it unmounts after motion.
  await expect(repeated).toHaveAttribute("data-source-disclosure-phase","collapsed");
  await expect(repeated.locator("[data-codex-source-repeated-body]")).toHaveCount(0);
  // Reopen from the same virtual turn; the existing children and tool leaves work.
  await toggle.click();
  await expect(repeated).toHaveAttribute("data-source-disclosure-phase","expanded");
  await expect(repeated.locator(".codex-activity-group-row__subrow")).toHaveCount(2);
  expect(errors).toEqual([]);
});

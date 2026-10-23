import {test,expect} from "@playwright/test";

test("source Je/bg opens only the eligible consecutive MCP calls and keeps the barrier separate",async ({page})=>{
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
  await expect(repeated).toHaveCount(1);
  await expect(repeated.locator("summary")).toContainText("search · 2 次调用");
  await expect(repeated.locator("[data-codex-source-repeated-body]")).toBeHidden();
  await repeated.locator("summary").click();
  await expect(repeated.locator("[data-codex-source-repeated-body]")).toBeVisible();
  await expect(repeated.locator(".codex-activity-group-row__subrow")).toHaveCount(2);
  await expect(group.locator(".codex-activity-group-row__subrow")).toHaveCount(4);
  await expect(group.locator('[data-codex-source-repeated-group="external-event"]')).toHaveCount(0);
  await repeated.locator("summary").click();
  await expect(repeated.locator("[data-codex-source-repeated-body]")).toBeHidden();
  expect(errors).toEqual([]);
});

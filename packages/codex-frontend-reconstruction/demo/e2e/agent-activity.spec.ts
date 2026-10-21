import { expect, test } from "@playwright/test";

test("source-derived AgentActivity section mounts and toggles without backend effects", async ({page}) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  const activity = page.locator("[data-recovered-agent-activity]").first();
  await expect(activity).toBeVisible();
  await expect(activity).toHaveAttribute("data-agent-activity-collapsed", "true");
  const toggle = activity.getByRole("button", { name: /项工具活动/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(activity.locator("[data-agent-activity-content]")).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(activity.locator("[data-agent-activity-content]")).toBeVisible();
  await expect(activity.locator("[data-agent-activity-unit]")).toHaveCount(1);
  // The leaf renderer is still explicitly demo-only, preserving no-IO boundaries.
  await expect(activity.getByRole("button", {name:/读取模块与状态/})).toBeVisible();
  await toggle.click();
  await expect(activity.locator("[data-agent-activity-content]")).toBeHidden();
  expect(errors).toEqual([]);
});

test("activity collapse state is isolated between demo conversations",async ({page})=>{
  await page.goto("/");
  const first = page.locator("[data-recovered-agent-activity]").first();
  await first.getByRole("button",{name:/项工具活动/}).click();
  await expect(first).toHaveAttribute("data-agent-activity-collapsed","false");
  await page.getByRole("button", {name:/工具调用与审批交互/}).click();
  const review = page.locator("[data-recovered-agent-activity]").first();
  await expect(review).toHaveAttribute("data-agent-activity-collapsed","true");
  await review.getByRole("button",{name:/项工具活动/}).click();
  await expect(review).toHaveAttribute("data-agent-activity-collapsed","false");
});

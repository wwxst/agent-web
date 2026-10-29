import {test,expect} from "@playwright/test";

test("original F/I subagent side tab groups active and done with source limits and navigates into real child virtual transcript",async({page})=>{
  await page.goto("/");
  await expect(page.getByRole("complementary",{name:"Subagents"})).toHaveCount(0);
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-subagents-panel").click();
  await expect(page.getByTestId("demo-tools")).toHaveCount(0);
  const panel=page.getByRole("complementary",{name:"Subagents"});
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-source-subagents-section="active"] h2'))
    .toContainText("Active · 5");
  await expect(panel.locator('[data-source-subagents-section="done"] h2'))
    .toContainText("Done · 11");
  await expect(panel.locator('[data-source-subagents-section="active"] h2'))
    .toContainText("1 waiting");
  await expect(panel.locator('[data-source-subagents-section="active"] [data-source-subagent-id]'))
    .toHaveCount(4);
  await expect(panel.locator('[data-source-subagents-section="done"] [data-source-subagent-id]'))
    .toHaveCount(10);
  await panel.getByRole("button",{name:"Show all active subagents"}).click();
  await expect(panel.locator('[data-source-subagents-section="active"] [data-source-subagent-id]'))
    .toHaveCount(5);
  await panel.getByRole("button",{name:"Show all done subagents"}).click();
  await expect(panel.locator('[data-source-subagents-section="done"] [data-source-subagent-id]'))
    .toHaveCount(11);
  await panel.locator('[data-source-subagent-id="demo-subagent-review"]').click();
  await expect(panel.locator('[data-source-subagent-detail]')).toContainText("Frontend review (synthetic)");
  await expect(panel.locator('[data-source-subagent-detail]')).toContainText("Demo Agent · medium");
  const child=panel.locator('[data-demo-subagent-transcript="demo-subagent-review"]');
  await expect(child).toBeVisible();
  await expect(child.locator('[data-conversation-message="assistant"]')).toContainText(
    "Synthetic subagent transcript");
  await panel.getByRole("button",{name:"Back to subagents"}).click();
  await expect(panel.locator('[data-source-subagents-overview]')).toBeVisible();
  await panel.getByRole("button",{name:"Close Subagents"}).click();
  await expect(panel).toHaveCount(0);
  // Independent main thread remains mounted rather than being replaced.
  await expect(page.getByRole("region",{name:"对话"})).toBeVisible();
});
test("empty host-supplied subagent list is not replaced by invented active tasks",async({page})=>{
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-source-subagents-empty").click();
  const panel=page.getByRole("complementary",{name:"Subagents"});
  await expect(panel.locator('[data-source-subagents-section="active"]')).toContainText(
    "No active subagents");
  await expect(panel.locator('[data-source-subagents-section="done"]')).toHaveCount(0);
  await expect(panel.locator('[data-source-subagent-id]')).toHaveCount(0);
});

import {test,expect} from "@playwright/test";

test("demo-only fixture picker closes after selecting an activity, keeping the actual transcript interactive",async({page})=>{
  await page.goto("/");
  const trigger=page.getByRole("button",{name:"打开演示工具"});
  await trigger.click();
  await expect(page.getByTestId("demo-tools")).toBeVisible();

  // The fixture is not a separate preview; it appends to the canonical
  // virtualized transcript. The popup must not intercept its controls.
  await page.getByTestId("demo-mcp-approval-request").click();
  await expect(page.getByTestId("demo-tools")).toHaveCount(0);
  await expect(page.getByRole("button",{name:"打开演示工具"}))
    .toHaveAttribute("aria-expanded","false");

  const card=page.locator('[data-demo-turn-id^="mcp-approval-"]')
    .last().locator("[data-source-mcp-approval-card]");
  await expect(card).toHaveCount(1);
  const options=card.getByRole("button",{name:"Approval options"});
  await expect(options).toBeEnabled();
  await options.click();
  await expect(page.getByRole("menuitem",{name:"Allow this conversation"}))
    .toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);

  // Dismissing the tools popup must not disable reopening it.
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await expect(page.getByTestId("demo-tools")).toBeVisible();
});

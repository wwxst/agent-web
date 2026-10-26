import {test,expect} from "@playwright/test";

test("original automatic-review status transitions in one mounted activity without granting approval",async({page},testInfo)=>{
  await page.goto("/");
  await page.getByRole("button",{name:"打开演示工具"}).click();
  await page.getByTestId("demo-automatic-review-transition").click();
  const row=page.locator('[data-demo-turn-id^="automatic-review-"]').last();
  await expect(row).toHaveCount(1);
  const summary=row.locator('[data-source-automatic-approval-shimmer="true"]');
  await expect(summary).toHaveCount(1);
  const review=row.locator('[data-source-automatic-approval-status="inProgress"]');
  await expect(review).toHaveCount(1);
  const disclosure=review.locator("button[aria-expanded]");
  await expect(disclosure).toHaveAttribute("aria-expanded","false");
  const active=await summary.evaluate(node=>({
    animation:getComputedStyle(node).animationName,
    text:node.textContent,
  }));
  expect(active.animation).toContain("source-automatic-approval-review-shimmer");
  expect(active.text).toContain("模拟");
  await disclosure.click();
  await expect(disclosure).toHaveAttribute("aria-expanded","true");
  await expect(review.getByText("演示无任何文件写入能力。",{exact:false})).toBeVisible();
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({
    path:testInfo.outputPath("source-automatic-review-in-progress.png"),
    animations:"disabled",
  });
  // The same immutable host record receives a denied status. D's declined
  // branch removes the disclosure rows and emits the precise risk message.
  await expect(row.getByText(
    "Requires explicit authorization because this action is considered high risk",
  )).toBeVisible({timeout:8000});
  await expect(row.locator('[data-source-automatic-approval-shimmer]')).toHaveCount(0);
  await expect(row.locator('button[aria-expanded]')).toHaveCount(0);
  await expect(page.locator('[data-demo-turn-id^="automatic-review-"]')).toHaveCount(1);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({
    path:testInfo.outputPath("source-automatic-review-high-risk-denied.png"),
    animations:"disabled",
  });
});

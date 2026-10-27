import {test,expect} from "@playwright/test";
test("source Re biometric verification card is mounted but cannot claim native Touch ID in browser",async({page},testInfo)=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-user-verification-request").click();
 const row=page.locator('[data-demo-turn-id^="user-verification-"]').last();
 const card=row.locator("[data-source-user-verification-request-id]");
 await expect(card).toHaveCount(1);
 await expect(card).toContainText("Identity verification requested by Sample Files MCP (synthetic)");
 await expect(card).toContainText("Confirm access to workspace files (synthetic)");
 await expect(card).toContainText("Review this request before approving it with Touch ID");
 await expect(card.getByRole("button",{name:"Approve with Touch ID"})).toBeDisabled();
 await expect(card.getByRole("button",{name:"Cancel"})).toBeDisabled();
 await expect(card).toContainText("Device verification is unavailable in this host.");
 await expect(card).toContainText("Cancellation transport is unavailable in this host.");
 await expect(card).toHaveAttribute("data-source-user-verification-phase","idle");
 await card.scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath("source-user-verification-no-device-provider.png"),
   animations:"disabled"});
});

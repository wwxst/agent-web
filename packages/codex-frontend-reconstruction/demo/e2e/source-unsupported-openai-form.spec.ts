import {test,expect} from "@playwright/test";
test("source unsupported form fallback mounts with exact Skip/Dismiss labels and no fake fields",async({page},testInfo)=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-unsupported-openai-form-request").click();
 const row=page.locator('[data-demo-turn-id^="unsupported-openai-form-"]').last();
 const card=row.locator("[data-source-unsupported-form-request-id]");
 await expect(card).toHaveCount(1);
 await expect(card).toContainText("This form isn’t supported in this version");
 await expect(card).toContainText("Sample MCP form server (synthetic) requested this form.");
 await expect(card.getByRole("button",{name:"Skip"})).toBeDisabled();
 await expect(card.getByRole("button",{name:"Dismiss"})).toBeDisabled();
 await expect(card).toContainText("No form response transport is connected.");
 await expect(card).toHaveAttribute("data-source-unsupported-form-phase","idle");
 await expect(card.locator("input,textarea,select")).toHaveCount(0);
 await card.scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath("unsupported-openai-form-browser-readonly.png"),
   animations:"disabled"});
});

import {test,expect} from "@playwright/test";

test("original toolSuggestion ct mounts as distinct compact request in canonical virtual transcript",async({page},testInfo)=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-tool-suggestion-request").click();
 const row=page.locator('[data-demo-turn-id^="tool-suggestion-"]').last();
 const card=row.locator("[data-source-tool-suggestion-request-id]");
 await expect(card).toHaveCount(1);
 await expect(card.getByText("Sample Files (synthetic)")).toBeVisible();
 await expect(card.getByRole("button",{name:"Install"})).toBeDisabled();
 await expect(card.locator(".codex-source-compact-request__description")).toHaveCount(0);
 await expect(card.getByRole("button",{name:"Continue"})).toHaveCount(0);
 await expect(card).toContainText("Tool installation and activation are unavailable in this host.");
 await expect(card).toHaveAttribute("data-source-tool-suggestion-phase","idle");
 await expect(card.locator("[data-source-url-action-request-id]")).toHaveCount(0);
 await card.scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath("tool-suggestion-compact-no-host-service.png"),
  animations:"disabled"});
 await card.getByRole("button",{name:"Not now"}).click();
 await expect(card).toHaveAttribute("data-source-tool-suggestion-phase","error",{timeout:9000});
 await expect(card.getByRole("alert")).toContainText("Unable to send tool suggestion response");
 await expect(card.getByRole("button",{name:"Not now"})).toBeEnabled();
 await expect(card.getByRole("button",{name:"Install"})).toBeDisabled();
 await expect(card).not.toContainText("Response sent to host; awaiting request settlement.");
});

import {test,expect} from "@playwright/test";

test("original dt URL action mounts a distinct compact request card in canonical timeline",async({page},testInfo)=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-url-action-request").click();
 const card=page.locator('[data-demo-turn-id^="url-action-"]')
   .last().locator("[data-source-url-action-request-id]");
 await expect(card).toHaveCount(1);
 await expect(card.getByText("Action required")).toBeVisible();
 await expect(card.getByText("Complete the browser step")).toBeVisible();
 await expect(card.getByText("https://example.org/account/verify")).toBeVisible();
 await expect(card.getByRole("button",{name:"Open link"})).toBeDisabled();
 await expect(card.getByRole("button",{name:"Continue"})).toHaveCount(0);
 await expect(card).toContainText("External link opening is unavailable in this host.");
 await expect(card).toHaveAttribute("data-source-url-action-phase","idle");
 await card.scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath("url-action-compact-browser-readonly.png"),
   animations:"disabled"});
 // Deny is an actual host-scoped reply attempt, never a simulated grant.
 await card.getByRole("button",{name:"Not now"}).click();
 await expect(card).toHaveAttribute("data-source-url-action-phase","submitting");
 await expect(card.getByRole("button",{name:"Not now"})).toBeDisabled();
 await expect(card).toHaveAttribute("data-source-url-action-phase","error",{timeout:9000});
 await expect(card.getByRole("alert")).toContainText("Unable to send URL action response");
 await expect(card.getByRole("button",{name:"Continue"})).toHaveCount(0);
 await expect(card.getByRole("button",{name:"Not now"})).toBeEnabled();
 await expect(card.getByText("Response sent to host",{exact:false})).toHaveCount(0);
});

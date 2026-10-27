import {test,expect} from "@playwright/test";

test("original Ge request is mounted through canonical timeline with host-gated all-sites risk dialog",async({page},testInfo)=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-browser-website-approval-request").click();
 const rows=page.locator('[data-demo-turn-id^="browser-website-approval-"]');
 await expect(rows).toHaveCount(2);
 const card=rows.last().locator("[data-source-browser-website-approval-card]");
 await expect(card).toHaveCount(1);
 await expect(card.getByText("Allow ChatGPT to access",{exact:false})).toBeVisible();
 await expect(card.locator('[data-source-browser-website-source="browser"]')).toContainText("Browser");
 await expect(card.locator('a[href="https://example.org/"]')).toHaveAttribute("rel","noopener noreferrer");
 await expect(card.getByRole("button",{name:"Allow for all sites"})).toBeEnabled();
 await expect(card).toHaveAttribute("data-source-browser-website-reply-phase","idle");
 await card.scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath("browser-site-source-card.png"),animations:"disabled"});
 await card.getByRole("button",{name:"Allow for all sites"}).click();
 const dialog=page.getByRole("dialog");
 await expect(dialog).toContainText("interact with any website without asking?");
 await expect(dialog).toContainText("elevated risks for your data");
 await dialog.getByRole("button",{name:"Cancel"}).click();
 await expect(dialog).toHaveCount(0);
 await expect(card).toHaveAttribute("data-source-browser-website-reply-phase","idle");
 await card.getByRole("button",{name:"Allow for all sites"}).click();
 await page.screenshot({path:testInfo.outputPath("browser-site-global-risk-dialog.png"),animations:"disabled"});
 await page.getByRole("dialog").getByRole("button",{name:"Allow any website"}).click();
 await expect(card).toHaveAttribute("data-source-browser-website-reply-phase","submitting");
 await expect(card.getByRole("button",{name:"Allow once"})).toBeDisabled();
 await expect(card).toHaveAttribute("data-source-browser-website-reply-phase","error",{timeout:9000});
 await expect(card.getByRole("alert").last()).toContainText("No permission");
 await expect(page.getByRole("dialog")).toHaveCount(0);
 await expect(card.getByText("Response sent to host",{exact:false})).toHaveCount(0);
});
test("source Browser Chrome connection cannot enable global policy, but has site scope and keyboard menu",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-chrome-website-approval-request").click();
 // This single synthetic request is the latest virtualized turn, so a test
 // cannot accidentally assert against an unmounted historical item.
 const card=page.locator('[data-demo-turn-id^="browser-website-policy-denied-"]')
   .locator("[data-source-browser-website-approval-card]");
 await expect(card).toHaveCount(1);
 await expect(card.locator('[data-source-browser-website-source="connection"]')).toContainText("Chrome");
 await expect(card.getByRole("button",{name:"Allow for all sites"})).toHaveCount(0);
 await expect(card.getByRole("button",{name:"Allow once"})).toBeEnabled();
 const trigger=card.getByRole("button",{name:"Approval options"});
 await trigger.focus();
 await trigger.press("ArrowDown");
 const menu=page.getByRole("menu",{name:"Approval options"});
 await expect(menu).toBeVisible();
 await expect(menu.getByRole("menuitem")).toHaveCount(2);
 await expect(menu.getByRole("menuitem",{name:"Allow once"})).toBeFocused();
 await page.keyboard.press("End");
 await expect(menu.getByRole("menuitem",{name:"Allow for this site"})).toBeFocused();
 await page.keyboard.press("Escape");
 await expect(trigger).toBeFocused();
 await trigger.click();
 await menu.getByRole("menuitem",{name:"Allow for this site"}).click();
 await expect(card).toHaveAttribute("data-source-browser-website-reply-phase","error",{timeout:9000});
 await expect(page.getByRole("dialog")).toHaveCount(0);
});

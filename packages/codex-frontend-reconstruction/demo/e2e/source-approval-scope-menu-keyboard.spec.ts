import {test,expect} from "@playwright/test";

test("original approval dropdown supports source menu-style keyboard focus without granting permissions",async({page},testInfo)=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-mcp-approval-request").click();
 const row=page.locator('[data-demo-turn-id^="mcp-approval-"]').last();
 const card=row.locator("[data-codex-approval-surface]");
 await expect(card).toHaveCount(1);
 const surface=await card.evaluate(el=>({
   radius:getComputedStyle(el).borderTopLeftRadius,
   background:getComputedStyle(el).backgroundColor,
 }));
 expect(surface.radius).toBe("24px");
 expect(surface.background).not.toBe("rgba(0, 0, 0, 0)");
 const options=card.getByRole("button",{name:"Approval options"});
 await options.focus();
 await options.press("ArrowUp");
 const menu=card.getByRole("menu",{name:"Approval options"});
 await expect(menu).toBeVisible();
 const once=menu.getByRole("menuitem",{name:"Allow once"});
 const conversation=menu.getByRole("menuitem",{name:"Allow this conversation"});
 await expect(conversation).toBeFocused();
 await page.keyboard.press("ArrowDown");
 await expect(once).toBeFocused();
 await page.keyboard.press("ArrowDown");
 await expect(conversation).toBeFocused();
 await page.keyboard.press("Home");
 await expect(once).toBeFocused();
 await page.keyboard.press("End");
 await expect(conversation).toBeFocused();
 await page.keyboard.press("ArrowUp");
 await expect(once).toBeFocused();
 await page.keyboard.press("Escape");
 await expect(menu).toHaveCount(0);
 await expect(options).toBeFocused();
 await expect(options).toHaveAttribute("aria-expanded","false");
 // Keyboard menu navigation is not the approval itself.
 await expect(card).toHaveAttribute("data-source-mcp-reply-phase","idle");
 await expect(card.locator(".codex-source-mcp-approval__error")).toHaveCount(0);
 await options.press("ArrowDown");
 await expect(once).toBeFocused();
 await page.keyboard.press("Escape");
 await expect(options).toBeFocused();
 await card.scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath("source-approval-menu-keyboard.png"),
   animations:"disabled"});
});

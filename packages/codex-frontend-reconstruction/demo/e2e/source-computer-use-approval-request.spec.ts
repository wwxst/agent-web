import {test,expect} from "@playwright/test";

test("original E mounts first-use Computer Use card but is readonly without app approval host",async({page},testInfo)=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-computer-use-approval-request").click();
 await expect(page.getByTestId("demo-tools")).toHaveCount(0);
 const row=page.locator('[data-demo-turn-id^="computer-use-approval-"]').last();
 const card=row.locator("[data-source-computer-use-approval-card]");
 await expect(card).toHaveCount(1);
 await expect(card).toHaveAttribute("data-source-computer-use-reply-phase","idle");
 await expect(card.getByText("Allow ChatGPT to use Visual Studio Code?")).toBeVisible();
 const disclosure=card.locator('[data-source-computer-use-first-disclosure="true"]');
 await expect(disclosure).toContainText("It may take screenshots of app contents");
 await expect(disclosure).toContainText("Synthetic request · no Computer Use backend is connected");
 await expect(card.locator('[data-source-computer-use-header="app"]')).toBeVisible();
 await expect(card.getByRole("button",{name:"Always allow"})).toBeDisabled();
 await expect(card.getByRole("button",{name:"Allow this conversation"})).toBeDisabled();
 await expect(card.getByRole("button",{name:"Deny"})).toBeDisabled();
 await expect(card.getByRole("button",{name:"Allow once"})).toHaveCount(0);
 await expect(card.getByRole("button",{name:"Approval options"})).toHaveCount(0);
 await expect(card).toContainText("No Computer Use reply transport is connected");
 // A generic MCP reply interface existing on this host does not grant
 // Computer Use app authorization implicitly.
 await expect(card.locator("[data-source-mcp-approval-card]")).toHaveCount(0);
 await expect(card.locator(".codex-source-mcp-approval__error")).toHaveCount(0);
 await card.scrollIntoViewIfNeeded();
 await page.screenshot({
   path:testInfo.outputPath("computer-use-first-use-readonly.png"),animations:"disabled",
 });
});
test("original E elevated risk replaces app branding, omits unsupported always scope",async({page},testInfo)=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-computer-use-approval-request").click();
 const row=page.locator('[data-demo-turn-id*="-high-risk"]');
 const viewport=page.getByTestId("transcript-scroll");
 // The older row can be unmounted by the real virtualized conversation.
 for(let step=0;step<18&&await row.count()===0;step++){
   await viewport.evaluate(el=>{
     el.scrollTop-=180;
     el.dispatchEvent(new Event("scroll",{bubbles:true}));
   });
   await page.waitForTimeout(75);
 }
 await expect(row).toHaveCount(1);
 await row.scrollIntoViewIfNeeded();
 // Original Rk historical activity wrapper can keep children collapsed.
 const historical=row.locator('[data-recovered-agent-activity] button').first();
 if(await historical.count())await historical.click();
 const activityGroup=row.locator('[data-codex-activity-group] [aria-expanded]').first();
 if(await activityGroup.count()&&
    await activityGroup.getAttribute("aria-expanded")==="false")
   await activityGroup.click();
 const card=row.locator("[data-source-computer-use-approval-card]");
 await expect(card).toHaveCount(1);
 await expect(card.getByText("Allow ChatGPT to use Terminal?")).toBeVisible();
 await expect(card.locator('[data-source-computer-use-header="high"]')).toContainText("Elevated Risk");
 await expect(card.locator('[data-source-computer-use-header="app"]')).toHaveCount(0);
 await expect(card.locator("[data-source-computer-use-first-disclosure='true']")).toHaveCount(0);
 await expect(card.getByRole("button",{name:"Always allow"})).toHaveCount(0);
 await expect(card.getByRole("button",{name:"Allow this conversation"})).toBeDisabled();
 await expect(card.getByRole("button",{name:"Deny"})).toBeDisabled();
 await expect(card).toHaveAttribute("data-source-computer-use-reply-phase","idle");
 await card.scrollIntoViewIfNeeded();
 await page.screenshot({path:testInfo.outputPath("computer-use-high-risk-readonly.png"),animations:"disabled"});
});

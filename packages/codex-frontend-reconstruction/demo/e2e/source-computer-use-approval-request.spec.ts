import {test,expect} from "@playwright/test";

test("source Computer Use E mounts first-use permission card in existing timeline and never fabricates a grant",async({page},testInfo)=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-computer-use-approval-request").click();
 const rows=page.locator('[data-demo-turn-id^="computer-use-approval-"]');
 await expect(rows).toHaveCount(2);
 const card=rows.last().locator("[data-source-computer-use-approval-card]");
 await expect(card).toHaveCount(1);
 await expect(card).toHaveAttribute("data-source-computer-use-reply-phase","idle");
 await expect(card.getByText("Allow ChatGPT to use Visual Studio Code?")).toBeVisible();
 const disclosure=card.locator('[data-source-computer-use-first-disclosure="true"]');
 await expect(disclosure).toContainText("It may take screenshots of app contents");
 await expect(disclosure).toContainText("Synthetic request · no Computer Use backend is connected");
 await expect(card.locator('[data-source-computer-use-header="app"]')).toBeVisible();
 await expect(card.getByRole("button",{name:"Always allow"})).toBeEnabled();
 await expect(card.getByRole("button",{name:"Allow this conversation"})).toBeEnabled();
 await expect(card.getByRole("button",{name:"Deny"})).toBeEnabled();
 await expect(card.getByRole("button",{name:"Allow once"})).toHaveCount(0);
 await card.scrollIntoViewIfNeeded();
 await page.screenshot({
   path:testInfo.outputPath("computer-use-first-use-request.png"),animations:"disabled",
 });
 const approve=card.getByRole("button",{name:"Allow this conversation"});
 await approve.click();
 await expect(card).toHaveAttribute("data-source-computer-use-reply-phase","submitting");
 await expect(approve).toBeDisabled();
 await expect(card.getByRole("button",{name:"Always allow"})).toBeDisabled();
 await expect(card.getByRole("button",{name:"Deny"})).toBeDisabled();
 await expect(card).toHaveAttribute("data-source-computer-use-reply-phase","error",{timeout:9000});
 await expect(card.locator(".codex-source-mcp-approval__error")).toContainText(
   "Unable to send Computer Use response");
 // Failed reply cannot change the first-use preference or mark approved.
 await expect(disclosure).toContainText("It may take screenshots");
 await expect(card.getByRole("button",{name:"Always allow"})).toBeEnabled();
 await card.getByRole("button",{name:"Deny"}).click();
 await expect(card).toHaveAttribute("data-source-computer-use-reply-phase","error",{timeout:9000});
 await expect(card.getByText("Response sent to host",{exact:false})).toHaveCount(0);
 await expect(rows).toHaveCount(2);
 await card.scrollIntoViewIfNeeded();
 await page.screenshot({
   path:testInfo.outputPath("computer-use-reply-unavailable.png"),animations:"disabled",
 });
});
test("source Computer Use elevated risk header replaces connector, no unsupported always permission",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:"打开演示工具"}).click();
 await page.getByTestId("demo-computer-use-approval-request").click();
 const row=page.locator('[data-demo-turn-id*="-high-risk"]');
 const viewport=page.getByTestId("transcript-scroll");
 // The earlier (high-risk) request can be outside the virtualized
 // conversation window after the later tall first-use disclosure appends.
 // Find it by scrolling the *real* transcript, never mounting a fake card.
 for(let step=0;step<18&&await row.count()===0;step++){
   await viewport.evaluate(el=>{
     el.scrollTop-=180;
     el.dispatchEvent(new Event("scroll",{bubbles:true}));
   });
   await page.waitForTimeout(75);
 }
 await expect(row).toHaveCount(1);
 await row.scrollIntoViewIfNeeded();
 // Earlier completed activity is wrapped by the original Rk historical
 // group and may have its body intentionally unmounted while collapsed.
 // Expand the genuine existing wrapper before querying the approval card.
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
 await expect(card.getByRole("button",{name:"Allow this conversation"})).toBeEnabled();
 await expect(card).toHaveAttribute("data-source-computer-use-reply-phase","idle");
});

import {test,expect} from "@playwright/test";

test("one frontend host event ingress invalidates history and qn/Qr in the same mounted conversation",async({page})=>{
 const errors:string[]=[];
 page.on("pageerror",error=>errors.push(error.message));
 await page.goto("/");
 await page.getByRole("button",{name:/工具调用与审批交互/}).click();
 const history=page.locator('[data-demo-turn-id="review-history-hydration"]');
 const runtime=page.locator('[data-demo-turn-id="review-live-turn-state"]');
 await expect(history).toHaveCount(1);
 await expect(runtime).toHaveCount(1);
 const groups=runtime.locator("[data-codex-activity-group]");
 await expect(groups).toHaveCount(0);
 await runtime.locator("[data-demo-resolve-up-next]").click();
 await expect(groups).toHaveCount(1);
 await history.locator("[data-demo-load-history]").click();
 await expect(history.getByText("历史正文已通过订阅恢复",{exact:false})).toBeVisible();
 // Same bridge delivers clear-thread to historical Y AND qn/Qr. This was
 // impossible to validate with three unrelated preview-owned publishers.
 await history.locator("[data-demo-clear-history]").click();
 await expect(history.getByText("历史正文已通过订阅恢复",{exact:false})).toHaveCount(0);
 await expect(groups).toHaveCount(0);
 // Recovery is event driven. Neither VirtualizedTurnList nor React Row is
 // replaced by a separate mock timeline.
 await runtime.locator("[data-demo-resolve-up-next]").click();
 await expect(groups).toHaveCount(1);
 await history.locator("[data-demo-load-history]").click();
 await expect(history.getByText("历史正文已通过订阅恢复",{exact:false})).toBeVisible();
 expect(errors).toEqual([]);
});

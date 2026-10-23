import {test,expect} from "@playwright/test";

test("source Y history summary loads through keyed store into the same virtual React turn",async({page})=>{
 const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
 await page.goto("/");
 await page.getByRole("button",{name:/工具调用与审批交互/}).click();
 const row=page.locator('[data-demo-turn-id="review-history-hydration"]');
 await expect(row).toHaveCount(1);
 // Original Y intentionally removes inline turn, then host fetches its entity.
 await expect(row.getByText("历史正文已通过订阅恢复",{exact:false})).toHaveCount(0);
 await row.locator("[data-demo-load-history]").click();
 await expect(row.getByText("历史正文已通过订阅恢复",{exact:false})).toBeVisible();
 await expect(row.getByText("这是历史记录的用户消息",{exact:false})).toBeVisible();
 // Original historical rendering uses Rk collapse before nested nk groups.
 const outer=row.locator("[data-recovered-agent-activity]");
 await expect(outer).toHaveCount(1);
 await outer.locator(".codex-agent-activity__toggle").click();
 await expect(row.locator("[data-codex-activity-group]")).toHaveCount(1);
 // Read/write event does not change the identity of the virtualized row.
 await expect(row).toHaveCount(1);
 await row.locator("[data-demo-clear-history]").click();
 await expect(row.getByText("历史正文已通过订阅恢复",{exact:false})).toHaveCount(0);
 await row.locator("[data-demo-load-history]").click();
 await expect(row.getByText("历史正文已通过订阅恢复",{exact:false})).toBeVisible();
 expect(errors).toEqual([]);
});

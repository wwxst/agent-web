import {test,expect} from "@playwright/test";

test("live qn/Qr source updates the mounted latest ga group without replacing its turn",async({page})=>{
 const errors:string[]=[];
 page.on("pageerror",error=>errors.push(error.message));
 await page.goto("/");
 await page.getByRole("button",{name:/工具调用与审批交互/}).click();
 const fixture=page.locator('[data-demo-turn-id="review-live-turn-state"]');
 await expect(fixture).toHaveCount(1);
 const current=fixture.locator("[data-codex-current-turn-activity]");
 await expect(current).toHaveCount(1);
 const groups=current.locator("[data-codex-activity-group]");
 // Original Wi = Bi && !Ui hides a finished latest group while Qr is missing.
 await expect(groups).toHaveCount(0);
 // Synthetic host publishes a qn/Qr event into the already mounted source.
 await fixture.locator("[data-demo-resolve-up-next]").click();
 await expect(groups).toHaveCount(1);
 await expect(groups).toContainText("运行了命令");
 // qn's concrete completed status overrides raw in_progress (Ge -> K).
 await fixture.locator("[data-demo-complete-turn]").click();
 await expect(groups).toHaveCount(0);
 // Historical status can become active again, without rebuilding the turn list.
 await fixture.locator("[data-demo-resume-turn]").click();
 await expect(groups).toHaveCount(1);
 // Existing tool detail remains interactive when re-mounted after qn update.
 await groups.locator(".codex-activity-group-row__toggle").click();
 await expect(groups.locator(".codex-activity-group-row__subrow")).toHaveCount(2);
 await expect(groups.locator('[data-codex-source-leaf="exec-command"]')).toHaveCount(2);
 expect(errors).toEqual([]);
});

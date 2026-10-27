import {test,expect,type Locator,type Page} from "@playwright/test";

/** Locate an existing virtualized review item by scrolling the *same*
 * production transcript viewport, not by mounting a detached fixture. */
async function scrollToReview(page:Page,turnId:string){
  const viewport=page.getByTestId("transcript-scroll");
  const row=page.locator(`[data-demo-turn-id="${turnId}"]`);
  await viewport.evaluate(el=>{
    el.scrollTop=0;
    el.dispatchEvent(new Event("scroll",{bubbles:true}));
  });
  for(let i=0;i<36&&await row.count()===0;i++){
    await viewport.evaluate(el=>{
      el.scrollTop+=180;
      el.dispatchEvent(new Event("scroll",{bubbles:true}));
    });
    await page.waitForTimeout(45);
  }
  await expect(row).toHaveCount(1);
  return row;
}
async function revealReview(row:Locator){
  const review=row.locator('[data-source-inline-review-wrap]');
  if(await review.count()===0){
    const toggle=row.locator('[data-recovered-agent-activity] button').first();
    await toggle.click();
  }
  await expect(review).toHaveCount(1);
  return review;
}

test("original file-diff wrap setting C survives actual review and frontend thread navigation",async({page},testInfo)=>{
  await page.goto("/");
  const frontend=await revealReview(await scrollToReview(page,"diff"));
  await expect(frontend).toHaveAttribute("data-source-inline-review-wrap","scroll");
  await expect(frontend.getByRole("button",{name:"Enable word wrap"}))
    .toHaveAttribute("aria-pressed","false");
  await expect(frontend.getByRole("button",{name:"Edit"})).toBeDisabled();
  await expect(frontend.getByRole("button",{name:"Accept"})).toBeDisabled();
  await expect(frontend.getByRole("button",{name:"Reject"})).toBeEnabled();

  await frontend.getByRole("button",{name:"Enable word wrap"}).click();
  await expect(frontend).toHaveAttribute("data-source-inline-review-wrap","wrap");
  await expect(frontend.getByRole("button",{name:"Disable word wrap"}))
    .toHaveAttribute("aria-pressed","true");

  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  const review=await revealReview(await scrollToReview(page,"review-diff"));
  // Original shared C preference belongs to the host, not a single
  // card's lifecycle; this is a different real review entry.
  await expect(review).toHaveAttribute("data-source-inline-review-wrap","wrap");
  await expect(review.getByRole("button",{name:"Disable word wrap"}))
    .toHaveAttribute("aria-pressed","true");
  await expect(review.getByRole("button",{name:"Edit"})).toBeDisabled();
  await expect(review.getByRole("button",{name:"Accept"})).toBeDisabled();
  await review.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath("shared-inline-review-wrap.png"),
    animations:"disabled"});

  await review.getByRole("button",{name:"Disable word wrap"}).click();
  await expect(review).toHaveAttribute("data-source-inline-review-wrap","scroll");
  await page.getByRole("button",{name:/恢复 Codex 会话界面/}).click();
  const again=await revealReview(await scrollToReview(page,"diff"));
  await expect(again).toHaveAttribute("data-source-inline-review-wrap","scroll");
  await expect(again.getByRole("button",{name:"Enable word wrap"}))
    .toHaveAttribute("aria-pressed","false");
});

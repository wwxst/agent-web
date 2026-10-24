import {test,expect} from "@playwright/test";

test("source O/k full inline review uses real Pierre unified file diff inside existing virtual React turn",async({page},testInfo)=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  const viewport=page.locator('[data-testid="transcript-scroll"]');
  const row=page.locator('[data-demo-turn-id="review-diff"]');
  // Scroll the real virtual list until the historical source row is mounted.
  // No second fixture renderer or shadow-DOM mock is used.
  for(let step=0;step<40&&await row.count()===0;step++){
    await viewport.evaluate((node,offset)=>{node.scrollTop=offset;},step*220);
    await page.waitForTimeout(35);
  }
  await expect(row).toHaveCount(1);
  const outer=row.locator(".codex-agent-activity__toggle");
  if(await outer.count()===1&&await outer.getAttribute("aria-expanded")==="false")
    await outer.click();
  const group=row.locator(".codex-activity-group-row__toggle");
  if(await group.count()===1&&await group.getAttribute("aria-expanded")==="false")
    await group.click();
  const review=row.locator("[data-inline-file-diff-review-viewport]");
  await expect(review).toBeVisible();
  const engine=review.locator('[data-source-inline-file-diff-engine="pierre"]');
  await expect(engine).toHaveCount(1);
  await expect(review.locator(".demo-full-diff")).toHaveCount(0);
  // Real @pierre/diffs renders its unified changed rows in shadow DOM,
  // rather than demo-coded preformatted +/- strings.
  await expect.poll(()=>engine.evaluate(element=>
    Array.from(element.querySelectorAll<HTMLElement>("*"))
      .filter(child=>child.shadowRoot?.querySelector("[data-diff]")!=null).length
  )).toBeGreaterThan(0);
  const hasChangedText=await engine.evaluate(element=>
    Array.from(element.querySelectorAll<HTMLElement>("*")).some(child=>
      child.shadowRoot?.textContent?.includes("freezeSnapshot")===true));
  expect(hasChangedText).toBe(true);
  await expect(row.getByRole("button",{name:"Edit"})).toBeDisabled();
  await expect(row.getByRole("button",{name:"Accept"})).toBeDisabled();
  const wrap=row.getByRole("button",{name:"Enable word wrap"});
  await expect(wrap).toBeVisible();
  await wrap.click();
  await expect(row.getByRole("button",{name:"Disable word wrap"})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath("original-inline-review-pierre-full-diff.png"),animations:"disabled"});
  expect(errors).toEqual([]);
});

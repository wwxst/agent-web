import {test,expect} from "@playwright/test";

test("source N groups command and multi-file patch inside the existing transcript",async ({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  const entry=page.locator('[data-demo-turn-id="review-workflow"]');
  await expect(entry).toHaveCount(1);
  // Latest n=latest uses direct ga; no historical Rk outer disclosure.
  await expect(entry.locator("[data-recovered-agent-activity]")).toHaveCount(0);
  const directActivity=entry.locator("[data-codex-current-turn-activity]");
  await expect(directActivity).toBeVisible();
  const group=directActivity.locator("[data-codex-activity-group]");
  await expect(group).toHaveCount(1);
  await expect(group).toBeVisible();
  // N produced two real groups at the explicit patch boundary; ek/ok joins
  // them only for the host-declared combined trace.
  await expect(group).toContainText("编辑了文件");
  await expect(group).toContainText("运行了命令");
  await expect(entry.locator('[data-conversation-message="assistant"]')).toHaveCount(1);
  // The compiled latest branch prunes stale commentary once a final answer exists.
  await expect(entry.getByText("下面仅用于验证连续工具活动的组件接线", {exact:false})).toHaveCount(0);
  await expect(entry.getByText("模拟活动已结束。命令和文件差异", {exact:false})).toBeVisible();
  await expect(group.getByRole("button",{name:/编辑了文件.*运行了命令/})).toHaveCount(1);
  await group.locator(".codex-activity-group-row__toggle").click();
  const scroller=group.locator("[data-source-group-scroll]");
  await expect(scroller).toBeVisible();
  await expect(scroller).toHaveCSS("max-height","224px");
  await expect(scroller).toHaveCSS("overflow-y","auto");
  // Original app-shared adds a scroll-driven edge mask; a permanent bottom
  // shadow would be a different behavior and obscures rows without overflow.
  const sourceFade=await scroller.evaluate(element => {
    const css=getComputedStyle(element);
    return {
      supported:CSS.supports("animation-timeline","scroll(self y)"),
      mask:css.maskImage,
      animation:css.animationName,
      timeline:css.getPropertyValue("animation-timeline"),
    };
  });
  if(sourceFade.supported) {
    expect(sourceFade.mask).toContain("linear-gradient");
    expect(sourceFade.animation).toContain("codex-source-vertical-edge-fade");
    expect(sourceFade.timeline).toContain("scroll(self y)");
  }
  await expect(group.locator(".codex-activity-group-row__subrow")).toHaveCount(4);
  await expect(group.locator('[data-codex-source-leaf="exec-command"]')).toHaveCount(3);
  const patch=group.locator("[data-codex-source-patch]");
  await expect(patch).toHaveAttribute("data-patch-status","applied");
  await expect(patch.locator("[data-codex-source-patch-file]")).toHaveCount(2);
  await patch.locator("[data-codex-source-patch-toggle]").first().click();
  const diff=patch.locator("[data-codex-source-diff-engine='pierre']").first();
  await expect(diff).toBeVisible();
  await expect(diff.locator(".codex-source-tool-patch-file__diff-viewport")).toHaveCSS("max-height","240px");
  await expect.poll(()=>scroller.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
  await scroller.evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await expect.poll(()=>scroller.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  if(sourceFade.supported)
    await expect(scroller).not.toHaveCSS("mask-image","none");
  // The FileDiff viewport has its own scroll region, unaffected by the mask.
  await expect(diff.locator(".codex-source-tool-patch-file__diff-viewport"))
    .toHaveCSS("overflow-y","auto");
  await expect(group.getByRole("button",{name:/编辑了文件.*运行了命令/})).toHaveAttribute("aria-expanded","true");
  await page.screenshot({path:testInfo.outputPath("codex-contiguous-command-patch.png"),animations:"disabled"});
  expect(errors).toEqual([]);
});

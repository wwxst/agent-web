import {test,expect} from "@playwright/test";

test("shell-empty visual route mounts the real desktop shell and idle Composer without demo rows",async({page},testInfo)=>{
  await page.addInitScript(()=>{
    // A visual capture must not hydrate from or overwrite the user's saved pins.
    localStorage.setItem("pinned-content-tabs-v1","visual-baseline-preserve-me");
  });
  await page.goto("/?visualScenario=shell-empty");
  await page.waitForFunction(()=>document.fonts.status==="loaded");
  await page.evaluate(()=>new Promise<void>(resolve=>
    requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())),
  ));

  await expect(page.locator('[data-codex-shell-preview="light"]')).toBeVisible();
  await expect(page.locator(".demo-header-location strong")).toHaveText("New chat");
  await expect(page.locator(".demo-row")).toHaveCount(0);
  await expect(page.locator(".demo-composer")).toBeVisible();
  await expect(page.locator('.demo-composer [contenteditable="true"]')).toBeVisible();
  await expect(page.getByTestId("demo-tools")).toHaveCount(0);

  const capture=await page.evaluate(()=>({
    viewport:{width:innerWidth,height:innerHeight,devicePixelRatio},
    rail:document.querySelector("[data-app-navigation-rail]")?.getBoundingClientRect().width??null,
    sidebar:document.querySelector(".demo-sidebar")?.getBoundingClientRect().width??null,
    header:document.querySelector(".demo-header")?.getBoundingClientRect().height??null,
    composer:document.querySelector(".demo-composer")?.getBoundingClientRect().toJSON()??null,
    rowCount:document.querySelectorAll(".demo-row").length,
    savedPin:localStorage.getItem("pinned-content-tabs-v1"),
  }));
  expect(capture.viewport).toEqual({width:1352,height:760,devicePixelRatio:1});
  expect(capture.rail).toBeGreaterThan(0);
  expect(capture.sidebar).toBeGreaterThan(200);
  expect(capture.header).toBeGreaterThan(0);
  expect(capture.rowCount).toBe(0);
  expect(capture.savedPin).toBe("visual-baseline-preserve-me");
  await page.screenshot({path:testInfo.outputPath("shell-empty-visual-baseline.png"),fullPage:false});
});

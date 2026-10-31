import {test,expect} from "@playwright/test";

test("unavailable model and permissions have source-sized, vertically aligned chevrons",async({page},testInfo)=>{
  await page.goto("/?visualScenario=shell-empty");
  await page.waitForFunction(()=>document.fonts.status==="loaded");

  for(const [testId,label] of [
    ["composer-permission-control","权限未连接"],
    ["composer-model-control","模型未连接"],
  ] as const){
    const control=page.getByTestId(testId);
    await expect(control).toBeDisabled();
    await expect(control.locator(".demo-composer-control-trigger__label")).toHaveText(label);
    const chevron=control.locator("svg.demo-composer-control-trigger__chevron");
    await expect(chevron).toHaveCount(1);
    await expect(chevron).toHaveAttribute("aria-hidden","true");
    await expect(chevron).toHaveAttribute("viewBox","0 0 24 24")
    await expect(chevron.locator("path")).toHaveAttribute("d","m6 9 6 6 6-6")
    await expect(chevron).toHaveAttribute("stroke-width","2");
    // Compare box centers instead of font glyph baselines; this catches
    // accidental reintroduction of a text chevron, size drift or line-height drift.
    const geometry=await control.evaluate(button=>{
      const labelBox=button.querySelector(".demo-composer-control-trigger__label")!.getBoundingClientRect();
      const chevronBox=button.querySelector("svg.demo-composer-control-trigger__chevron")!.getBoundingClientRect();
      return {
        labelHeight:labelBox.height,
        chevronHeight:chevronBox.height,
        chevronWidth:chevronBox.width,
        centerDelta:(labelBox.top+labelBox.height/2)-(chevronBox.top+chevronBox.height/2),
        gap:chevronBox.left-labelBox.right,
      };
    });
    expect(geometry.labelHeight).toBe(16);
    expect(geometry.chevronWidth).toBe(16);
    expect(geometry.chevronHeight).toBe(16);
    expect(Math.abs(geometry.centerDelta)).toBeLessThanOrEqual(0.5);
    expect(geometry.gap).toBe(5);
  }
  await page.screenshot({path:testInfo.outputPath("composer-chevron-alignment.png"),fullPage:false});
});

import {test,expect} from "@playwright/test";

test("Composer model and permission chevrons match source SVG geometry and placement spacing",async({page},testInfo)=>{
  const assertControlsAligned=async(expectedGap:number,labels:readonly [string,string],expectedEffortGap:number|null)=>{
    for(const [testId,label] of [
      ["composer-permission-control",labels[0]],
      ["composer-model-control",labels[1]],
    ] as const){
      const control=page.getByTestId(testId);
      await expect(control).toBeDisabled();
      await expect(control.locator(".demo-composer-control-trigger__label")).toHaveText(label);
      const chevron=control.locator("svg.demo-composer-control-trigger__chevron");
      await expect(chevron).toHaveCount(1);
      await expect(chevron).toHaveAttribute("aria-hidden","true");
      await expect(chevron).toHaveAttribute("viewBox","0 0 24 24");
      await expect(chevron.locator("path")).toHaveAttribute("d","m6 9 6 6 6-6");
      await expect(chevron).toHaveAttribute("stroke-width","2");
      // Compare layout-box centers, not font glyph baselines. This catches
      // accidental text-chevron regressions and icon/line-height drift.
      const geometry=await control.evaluate(button=>{
        const labelBox=button.querySelector(".demo-composer-control-trigger__label")!.getBoundingClientRect();
        const chevron=button.querySelector("svg.demo-composer-control-trigger__chevron")!;
        const chevronBox=chevron.getBoundingClientRect();
        const precedingBox=(chevron.previousElementSibling as HTMLElement).getBoundingClientRect();
        const effortBox=button.querySelector(".demo-composer-control-trigger__effort")?.getBoundingClientRect()??null;
        return {
          labelHeight:labelBox.height,
          chevronHeight:chevronBox.height,
          chevronWidth:chevronBox.width,
          centerDelta:(precedingBox.top+precedingBox.height/2)-(chevronBox.top+chevronBox.height/2),
          gap:chevronBox.left-precedingBox.right,
          labelEffortGap:effortBox==null?null:effortBox.left-labelBox.right,
        };
      });
      expect(geometry.labelHeight).toBe(16);
      expect(geometry.chevronWidth).toBe(16);
      expect(geometry.chevronHeight).toBe(16);
      expect(Math.abs(geometry.centerDelta)).toBeLessThanOrEqual(0.5);
      expect(geometry.gap).toBe(expectedGap);
      if(testId==="composer-model-control")expect(geometry.labelEffortGap).toBe(expectedEffortGap);
    }
  };

  await page.goto("/?visualScenario=shell-empty");
  await page.waitForFunction(()=>document.fonts.status==="loaded");
  await expect(page.locator(".demo-composer")).toHaveAttribute("data-composer-placement","home");
  // Original ComposerFooterDropdown overrides the default 4px gap to 6px on home.
  await assertControlsAligned(6,["完全访问","GPT-6.1 Sol"],6);
  await page.screenshot({path:testInfo.outputPath("composer-chevron-alignment.png"),fullPage:false});

  await page.goto("/");
  await page.waitForFunction(()=>document.fonts.status==="loaded");
  await expect(page.locator(".demo-composer")).toHaveAttribute("data-composer-placement","thread");
  // Thread placement uses the original --spacing token (4px).
  await assertControlsAligned(4,["权限未连接","模型未连接"],null);
  // The bright colors are exclusive to a visual reference fixture. A normal
  // disconnected thread still communicates disabled/unavailable capabilities.
  for(const testId of ["composer-model-control","composer-permission-control"]){
    const control=page.getByTestId(testId);
    await expect(control).toBeDisabled();
    expect(await control.evaluate(node=>getComputedStyle(node).opacity)).toBe("0.62");
  }
});

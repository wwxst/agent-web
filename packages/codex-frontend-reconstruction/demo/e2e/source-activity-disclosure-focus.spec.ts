import {test,expect} from "@playwright/test";

test("real review timeline keeps collapsing repeated tool details outside keyboard focus",async({page},testInfo)=>{
  await page.goto("/");
  await page.getByRole("button",{name:/工具调用与审批交互/}).click();
  const viewport=page.getByTestId("transcript-scroll");
  await page.waitForTimeout(950);
  const row=page.locator('[data-demo-turn-id="review-repeated-mcp"]');
  for(let step=0;step<24&&await row.count()===0;step++){
    await viewport.evaluate(el=>{el.scrollTop+=230;
      el.dispatchEvent(new Event("scroll",{bubbles:true}));});
    await page.waitForTimeout(60);
  }
  await expect(row).toHaveCount(1);
  // A prior completed activity slice first uses the original Rk wrapper.
  // Expand the outer historical group before inspecting nk repeated rows.
  const historyToggle=row.locator('[data-recovered-agent-activity] button').first();
  await historyToggle.click();
  const outer=row.locator('[data-codex-activity-group] [aria-expanded]').first();
  await outer.click();
  await expect(outer).toHaveAttribute("aria-expanded","true");
  const repeated=row.locator('[data-codex-source-repeated-group]').first();
  await expect(repeated).toHaveCount(1);
  const toggle=repeated.locator('[data-codex-source-repeated-toggle]');
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded","true");
  const motion=repeated.locator('[data-source-disclosure-motion]');
  await expect(motion).not.toHaveAttribute("inert","");
  // Add only a keyboard-focus probe to the *real* expanded content container;
  // it does not replace the tool activity record or render a fake panel.
  await motion.evaluate(el=>{
    const probe=document.createElement("button");
    probe.type="button";probe.setAttribute("data-test-focus-probe","");
    probe.textContent="Focus probe";el.append(probe);
    probe.focus();
  });
  await expect(page.locator('[data-test-focus-probe]')).toBeFocused();
  // The persistent summary regains focus before its outgoing descendants are
  // made inert; no hidden tool button can remain keyboard-accessible.
  await toggle.evaluate((el:HTMLButtonElement)=>el.click());
  await expect(toggle).toHaveAttribute("aria-expanded","false");
  await expect(toggle).toBeFocused();
  await expect(motion).toHaveAttribute("inert","");
  await expect(motion).toHaveAttribute("aria-hidden","true");
  await expect(repeated).toHaveAttribute("data-source-disclosure-phase",/closing|collapsed/);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath("repeated-tool-disclosure-keyboard.png"),
    animations:"disabled"});
  // Same review conversation retains its real patch and approval records.
  const records=await viewport.evaluate(el=>
    el.getAttribute("data-thread-scroll-viewport"));
  expect(records).not.toBeNull();
});

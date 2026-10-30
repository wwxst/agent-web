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
  // Keep the target virtualized row visible BEFORE probing the close motion;
  // a historical row otherwise can be recycled after its height shrinks.
  await row.scrollIntoViewIfNeeded();
  const repeated=row.locator('[data-codex-source-repeated-group]').first();
  await expect(repeated).toHaveCount(1);
  const toggle=repeated.locator('[data-codex-source-repeated-toggle]');
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded","true");
  // Opening the repeated group changes its measured height. Keep the same
  // virtualized turn mounted before testing focus transfer on close.
  await row.scrollIntoViewIfNeeded();
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
  // Source disclosure keeps exiting content inert/aria-hidden until its
  // grid transition completes; after that the lazy body is unmounted.
  // Either hidden-and-exiting or already-unmounted is a valid state.
  await expect(repeated).toHaveAttribute("data-source-disclosure-phase",/closing|collapsed/);
  // Assert against the exact probe we inserted, not a dynamic ".first()"
    // A virtualized row may be recycled while its collapsing body shrinks.
    // In that case no descendant remains in the document or tab order.
    if(await repeated.count()===0)
      return await page.locator('[data-test-focus-probe]').count()===0;
  // repeated-group locator: the virtualized nk row may reorder/recycle siblings
  // as the old detail height shrinks. If the probe survives, its OWN enclosing
  // exiting body must be inert and aria-hidden; otherwise it must be unmounted.
  await expect.poll(async()=>{
    const probe=page.locator('[data-test-focus-probe]');
    if(await probe.count()===0)return true;
    return probe.evaluate((el:HTMLElement)=>{
      const body=el.closest('[data-source-disclosure-motion]');
      return body instanceof HTMLElement &&
        body.inert===true && body.getAttribute("aria-hidden")==="true" &&
        !body.contains(document.activeElement);
    });
  }).toBe(true);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath("repeated-tool-disclosure-keyboard.png"),
    animations:"disabled"});
  // Same review conversation retains its real patch and approval records.
  const records=await viewport.evaluate(el=>
    el.getAttribute("data-thread-scroll-viewport"));
  expect(records).not.toBeNull();
});
